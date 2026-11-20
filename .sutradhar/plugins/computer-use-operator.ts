import { tool, type ToolContext } from "@sutradhar/plugin"
import {
  assertObservationId,
  assertPoint,
  bridgeRequest,
  bridgeToolResult,
  rejectSensitiveEntry,
  requireSafeUrl,
} from "./computer-use-bridge"

const observation = (surface: "browser" | "desktop", input: Record<string, unknown>, sessionID: string) => ({
  surface,
  sessionID,
  ...input,
})

const action = (
  surface: "browser" | "desktop",
  name: string,
  input: Record<string, unknown>,
  sessionID: string,
  observationId?: string,
) => ({
  surface,
  action: name,
  sessionID,
  ...(observationId ? { observationId } : {}),
  ...input,
})

const ask = async (context: ToolContext, permission: string, pattern: string) => {
  await context.ask({ permission, patterns: [pattern], always: [], metadata: { approvalFirst: true } })
}

export default async function computerUseOperator() {
  return {
    id: "computer-use-operator",
    tool: {
      computer_capabilities: tool({
        description:
          "Discover the connected browser and desktop automation capabilities. Use this before attempting computer control.",
        args: {},
        async execute(_args, context) {
          await ask(context, "computer_observe", "capabilities")
          return bridgeToolResult(
            "Computer-use capabilities",
            await bridgeRequest("capabilities", { sessionID: context.sessionID }, context.abort),
          )
        },
      }),

      browser_observe: tool({
        description:
          "Observe the current browser page and return a fresh observation ID, semantic controls, visible text, and an optional screenshot.",
        args: {
          includeScreenshot: tool.schema.boolean().default(true),
          includeAccessibility: tool.schema.boolean().default(true),
        },
        async execute(args, context) {
          await ask(context, "browser_observe", "browser")
          return bridgeToolResult(
            "Browser observation",
            await bridgeRequest(
              "observe",
              observation(
                "browser",
                { includeScreenshot: args.includeScreenshot, includeAccessibility: args.includeAccessibility },
                context.sessionID,
              ),
              context.abort,
            ),
          )
        },
      }),

      browser_tabs: tool({
        description: "List the managed browser sessions and tabs currently owned by this agent session.",
        args: {},
        async execute(_args, context) {
          await ask(context, "browser_observe", "browser-tabs")
          return bridgeToolResult(
            "Browser tabs",
            await bridgeRequest("action", action("browser", "tabs", {}, context.sessionID), context.abort),
          )
        },
      }),

      browser_navigate: tool({
        description: "Navigate the connected browser to a safe http(s) URL, then return a fresh observation.",
        args: {
          url: tool.schema.string().describe("Complete http(s) URL"),
          waitUntil: tool.schema.enum(["domcontentloaded", "load", "networkidle"]).default("domcontentloaded"),
        },
        async execute(args, context) {
          const url = requireSafeUrl(args.url)
          await ask(context, "browser_navigate", url)
          return bridgeToolResult(
            "Browser navigation",
            await bridgeRequest(
              "action",
              action("browser", "navigate", { url, waitUntil: args.waitUntil }, context.sessionID),
              context.abort,
            ),
          )
        },
      }),

      browser_click: tool({
        description:
          "Click one semantic browser target from the latest observation. Use an accessible ref, role/name, or stable selector, never a guessed coordinate.",
        args: {
          observationId: tool.schema.string(),
          target: tool.schema.string().describe("Semantic ref, accessible role/name, or stable selector"),
          button: tool.schema.enum(["left", "middle", "right"]).default("left"),
          clickCount: tool.schema.number().int().min(1).max(2).default(1),
          risk: tool.schema.enum(["normal", "destructive", "financial", "authentication"]).default("normal"),
        },
        async execute(args, context) {
          const observationId = assertObservationId(args.observationId)
          await ask(context, "browser_click", `${args.risk}:${args.target}`)
          return bridgeToolResult(
            "Browser click",
            await bridgeRequest(
              "action",
              action(
                "browser",
                "click",
                { target: args.target, button: args.button, clickCount: args.clickCount, risk: args.risk },
                context.sessionID,
                observationId,
              ),
              context.abort,
            ),
          )
        },
      }),

      browser_fill: tool({
        description:
          "Fill a non-sensitive browser field identified from the latest observation. Passwords, tokens, OTPs, payment data, and secrets are blocked.",
        args: {
          observationId: tool.schema.string(),
          target: tool.schema.string().describe("Semantic ref, accessible label, or stable selector"),
          text: tool.schema.string(),
          sensitive: tool.schema.boolean().default(false),
        },
        async execute(args, context) {
          const observationId = assertObservationId(args.observationId)
          rejectSensitiveEntry(args.target, args.sensitive, args.text)
          await ask(context, "browser_fill", args.target)
          return bridgeToolResult(
            "Browser field fill",
            await bridgeRequest(
              "action",
              action("browser", "fill", { target: args.target, text: args.text }, context.sessionID, observationId),
              context.abort,
            ),
          )
        },
      }),

      browser_select: tool({
        description: "Select one option in a non-sensitive browser control from the latest observation.",
        args: {
          observationId: tool.schema.string(),
          target: tool.schema.string(),
          option: tool.schema.string(),
        },
        async execute(args, context) {
          const observationId = assertObservationId(args.observationId)
          await ask(context, "browser_select", args.target)
          return bridgeToolResult(
            "Browser select",
            await bridgeRequest(
              "action",
              action(
                "browser",
                "select",
                { target: args.target, option: args.option },
                context.sessionID,
                observationId,
              ),
              context.abort,
            ),
          )
        },
      }),

      browser_key: tool({
        description: "Send one keyboard key or shortcut to the browser after verifying the latest observation.",
        args: {
          observationId: tool.schema.string(),
          key: tool.schema.string(),
          modifiers: tool.schema.array(tool.schema.enum(["Control", "Alt", "Shift", "Meta"])).default([]),
        },
        async execute(args, context) {
          const observationId = assertObservationId(args.observationId)
          await ask(context, "browser_key", args.key)
          return bridgeToolResult(
            "Browser keyboard action",
            await bridgeRequest(
              "action",
              action("browser", "key", { key: args.key, modifiers: args.modifiers }, context.sessionID, observationId),
              context.abort,
            ),
          )
        },
      }),

      browser_scroll: tool({
        description: "Scroll the browser by a bounded amount and return the updated observation.",
        args: {
          observationId: tool.schema.string(),
          direction: tool.schema.enum(["up", "down", "left", "right"]),
          amount: tool.schema.number().int().min(1).max(2000).default(600),
        },
        async execute(args, context) {
          const observationId = assertObservationId(args.observationId)
          await ask(context, "browser_scroll", args.direction)
          return bridgeToolResult(
            "Browser scroll",
            await bridgeRequest(
              "action",
              action(
                "browser",
                "scroll",
                { direction: args.direction, amount: args.amount },
                context.sessionID,
                observationId,
              ),
              context.abort,
            ),
          )
        },
      }),

      browser_wait: tool({
        description: "Wait for a bounded browser settle period, then return a fresh observation.",
        args: {
          observationId: tool.schema.string().optional(),
          milliseconds: tool.schema.number().int().min(50).max(5000).default(300),
        },
        async execute(args, context) {
          await ask(context, "browser_wait", "browser")
          return bridgeToolResult(
            "Browser wait",
            await bridgeRequest(
              "action",
              action(
                "browser",
                "wait",
                { milliseconds: args.milliseconds },
                context.sessionID,
                args.observationId ? assertObservationId(args.observationId) : undefined,
              ),
              context.abort,
            ),
          )
        },
      }),

      browser_close: tool({
        description: "Close the managed browser session after confirming it is no longer needed.",
        args: {},
        async execute(_args, context) {
          await ask(context, "browser_close", "browser")
          return bridgeToolResult(
            "Browser close",
            await bridgeRequest("action", action("browser", "close", {}, context.sessionID), context.abort),
          )
        },
      }),

      browser_handoff: tool({
        description:
          "Pause automation and ask the user to take over for sign-in, CAPTCHA, consent, payment, or sensitive entry.",
        args: {
          reason: tool.schema.string(),
          returnObservation: tool.schema.boolean().default(true),
        },
        async execute(args, context) {
          await ask(context, "browser_handoff", args.reason)
          return bridgeToolResult(
            "Browser handoff",
            await bridgeRequest(
              "handoff",
              {
                surface: "browser",
                sessionID: context.sessionID,
                reason: args.reason,
                returnObservation: args.returnObservation,
              },
              context.abort,
            ),
          )
        },
      }),

      desktop_observe: tool({
        description:
          "Observe the focused desktop application or an explicitly selected window and return a fresh observation ID, screenshot, and UI metadata.",
        args: {
          window: tool.schema.string().optional().describe("Optional application or window identifier"),
          includeScreenshot: tool.schema.boolean().default(true),
          includeAccessibility: tool.schema.boolean().default(true),
        },
        async execute(args, context) {
          await ask(context, "desktop_observe", args.window ?? "focused-window")
          return bridgeToolResult(
            "Desktop observation",
            await bridgeRequest(
              "observe",
              observation(
                "desktop",
                {
                  window: args.window,
                  includeScreenshot: args.includeScreenshot,
                  includeAccessibility: args.includeAccessibility,
                },
                context.sessionID,
              ),
              context.abort,
            ),
          )
        },
      }),

      desktop_windows: tool({
        description: "List visible desktop windows with stable IDs, process IDs, titles, bounds, and focus state.",
        args: {},
        async execute(_args, context) {
          await ask(context, "desktop_observe", "windows")
          return bridgeToolResult(
            "Desktop windows",
            await bridgeRequest("action", action("desktop", "windows", {}, context.sessionID), context.abort),
          )
        },
      }),

      desktop_focus_window: tool({
        description: "Focus an explicitly selected desktop window by stable window ID or title match, then observe it.",
        args: {
          window: tool.schema.string(),
        },
        async execute(args, context) {
          await ask(context, "desktop_focus_window", args.window)
          return bridgeToolResult(
            "Desktop focus",
            await bridgeRequest(
              "action",
              action("desktop", "focus", { window: args.window }, context.sessionID),
              context.abort,
            ),
          )
        },
      }),

      desktop_click: tool({
        description:
          "Click one semantic desktop target or one point in the latest desktop observation. Coordinates are accepted only with a fresh observation ID.",
        args: {
          observationId: tool.schema.string(),
          target: tool.schema.string().optional().describe("Semantic ref from the latest observation"),
          x: tool.schema.number().optional(),
          y: tool.schema.number().optional(),
          button: tool.schema.enum(["left", "middle", "right"]).default("left"),
          clickCount: tool.schema.number().int().min(1).max(2).default(1),
        },
        async execute(args, context) {
          const observationId = assertObservationId(args.observationId)
          if (args.target === undefined && (args.x === undefined || args.y === undefined)) {
            throw new Error("Desktop click requires a semantic target or both x and y coordinates")
          }
          if (args.x !== undefined && args.y !== undefined) assertPoint({ x: args.x, y: args.y })
          await ask(context, "desktop_click", args.target ?? `${args.x},${args.y}`)
          return bridgeToolResult(
            "Desktop click",
            await bridgeRequest(
              "action",
              action(
                "desktop",
                "click",
                { target: args.target, x: args.x, y: args.y, button: args.button, clickCount: args.clickCount },
                context.sessionID,
                observationId,
              ),
              context.abort,
            ),
          )
        },
      }),

      desktop_type: tool({
        description: "Type non-sensitive text into the focused desktop control from the latest observation.",
        args: {
          observationId: tool.schema.string(),
          text: tool.schema.string(),
          sensitive: tool.schema.boolean().default(false),
        },
        async execute(args, context) {
          const observationId = assertObservationId(args.observationId)
          rejectSensitiveEntry("focused desktop control", args.sensitive, args.text)
          await ask(context, "desktop_type", "focused-control")
          return bridgeToolResult(
            "Desktop typing",
            await bridgeRequest(
              "action",
              action("desktop", "type", { text: args.text }, context.sessionID, observationId),
              context.abort,
            ),
          )
        },
      }),

      desktop_key: tool({
        description:
          "Send one key or shortcut to the focused desktop application after verifying the latest observation.",
        args: {
          observationId: tool.schema.string(),
          key: tool.schema.string(),
          modifiers: tool.schema.array(tool.schema.enum(["Control", "Alt", "Shift", "Meta"])).default([]),
        },
        async execute(args, context) {
          const observationId = assertObservationId(args.observationId)
          await ask(context, "desktop_key", args.key)
          return bridgeToolResult(
            "Desktop keyboard action",
            await bridgeRequest(
              "action",
              action("desktop", "key", { key: args.key, modifiers: args.modifiers }, context.sessionID, observationId),
              context.abort,
            ),
          )
        },
      }),

      desktop_scroll: tool({
        description: "Scroll the focused desktop application by a bounded delta from the latest observation.",
        args: {
          observationId: tool.schema.string(),
          deltaX: tool.schema.number().int().min(-2000).max(2000).default(0),
          deltaY: tool.schema.number().int().min(-2000).max(2000).default(600),
        },
        async execute(args, context) {
          const observationId = assertObservationId(args.observationId)
          await ask(context, "desktop_scroll", "focused-window")
          return bridgeToolResult(
            "Desktop scroll",
            await bridgeRequest(
              "action",
              action(
                "desktop",
                "scroll",
                { deltaX: args.deltaX, deltaY: args.deltaY },
                context.sessionID,
                observationId,
              ),
              context.abort,
            ),
          )
        },
      }),

      desktop_drag: tool({
        description: "Drag through a bounded path in the latest desktop observation.",
        args: {
          observationId: tool.schema.string(),
          path: tool.schema
            .array(tool.schema.object({ x: tool.schema.number(), y: tool.schema.number() }))
            .min(2)
            .max(64),
        },
        async execute(args, context) {
          const observationId = assertObservationId(args.observationId)
          args.path.forEach(assertPoint)
          await ask(context, "desktop_drag", "focused-window")
          return bridgeToolResult(
            "Desktop drag",
            await bridgeRequest(
              "action",
              action("desktop", "drag", { path: args.path }, context.sessionID, observationId),
              context.abort,
            ),
          )
        },
      }),

      desktop_wait: tool({
        description: "Wait for a bounded desktop settle period, then return a fresh observation.",
        args: {
          observationId: tool.schema.string().optional(),
          milliseconds: tool.schema.number().int().min(50).max(5000).default(300),
        },
        async execute(args, context) {
          await ask(context, "desktop_wait", "focused-window")
          return bridgeToolResult(
            "Desktop wait",
            await bridgeRequest(
              "action",
              action(
                "desktop",
                "wait",
                { milliseconds: args.milliseconds },
                context.sessionID,
                args.observationId ? assertObservationId(args.observationId) : undefined,
              ),
              context.abort,
            ),
          )
        },
      }),

      desktop_handoff: tool({
        description:
          "Pause desktop automation and ask the user to take over for credentials, consent, payments, or ambiguity.",
        args: {
          reason: tool.schema.string(),
          returnObservation: tool.schema.boolean().default(true),
        },
        async execute(args, context) {
          await ask(context, "desktop_handoff", args.reason)
          return bridgeToolResult(
            "Desktop handoff",
            await bridgeRequest(
              "handoff",
              {
                surface: "desktop",
                sessionID: context.sessionID,
                reason: args.reason,
                returnObservation: args.returnObservation,
              },
              context.abort,
            ),
          )
        },
      }),

      computer_verify: tool({
        description:
          "Ask the bridge to verify assertions against a fresh browser or desktop observation before continuing.",
        args: {
          surface: tool.schema.enum(["browser", "desktop"]),
          observationId: tool.schema.string(),
          assertions: tool.schema.array(tool.schema.string()).min(1).max(12),
        },
        async execute(args, context) {
          const observationId = assertObservationId(args.observationId)
          await ask(context, "computer_verify", args.surface)
          return bridgeToolResult(
            "Computer-use verification",
            await bridgeRequest(
              "verify",
              { surface: args.surface, observationId, assertions: args.assertions, sessionID: context.sessionID },
              context.abort,
            ),
          )
        },
      }),
    },
  }
}
