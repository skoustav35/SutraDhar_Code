import { LayerNode } from "@sutradhar/core/effect/layer-node"
import { Context, Effect, Layer } from "effect"

import { InstanceState } from "@/effect/instance-state"

import PROMPT_ANTHROPIC from "./prompt/anthropic.txt"
import PROMPT_DEFAULT from "./prompt/default.txt"
import PROMPT_BEAST from "./prompt/beast.txt"
import PROMPT_GEMINI from "./prompt/gemini.txt"
import PROMPT_GPT from "./prompt/gpt.txt"
import PROMPT_ASTRA from "./prompt/gpt-astra.txt"
import PROMPT_KIMI from "./prompt/kimi.txt"
import PROMPT_META from "./prompt/meta.txt"

import PROMPT_CODEX from "./prompt/codex.txt"
import PROMPT_TRINITY from "./prompt/trinity.txt"
import type { Provider } from "@/provider/provider"
import type { Agent } from "@/agent/agent"
import { Permission } from "@/permission"
import { Skill } from "@/skill"
import { AbsolutePath } from "@sutradhar/core/schema"
import { Location } from "@sutradhar/core/location"
import { LocationServiceMap, locationServiceMapLayer } from "@sutradhar/core/location-services"
import { Reference } from "@sutradhar/core/reference"
import { MCP } from "@/mcp"
import { PermissionV1 } from "@sutradhar/core/v1/permission"

const PUBLIC_IDENTITY = "Sutradhar"
const PUBLIC_IDENTITY_DESCRIPTION = "your personal coding desktop app"

export function provider(model: Provider.Model) {
  const prompt = (() => {
    if (model.api.id.includes("muse")) {
      return [PROMPT_META.replaceAll("{{MODEL_NAME}}", PUBLIC_IDENTITY)]
    }
    if (model.api.id.includes("gpt-4") || model.api.id.includes("o1") || model.api.id.includes("o3"))
      return [PROMPT_BEAST]
    if (model.api.id.includes("gpt")) {
      if (model.api.id.includes("gpt-6")) return [PROMPT_ASTRA]
      if (model.api.id.includes("codex")) return [PROMPT_CODEX]
      return [PROMPT_GPT]
    }
    if (model.api.id.includes("gemini-")) return [PROMPT_GEMINI]
    if (model.api.id.includes("claude")) return [PROMPT_ANTHROPIC]
    if (model.api.id.toLowerCase().includes("trinity")) return [PROMPT_TRINITY]
    if (
      model.api.id.toLowerCase().includes("kimi") ||
      ["kimi-for-coding", "moonshotai", "moonshotai-cn"].includes(model.providerID)
    )
      return [PROMPT_KIMI]
    return [PROMPT_DEFAULT]
  })()

  return prompt.map((item) => rewritePlatformPrompt(item, model))
}

export function displayName(model: Provider.Model) {
  const name = String(model.name || "")
    .replace(/\s*\(free\)\s*$/i, "")
    .trim()
  if (!name || /^[a-z0-9_-]+-persona-\d+$/i.test(name) || /^[a-z0-9_.-]+-free$/i.test(name)) return "Sutradhar"
  return name
}

export function identity(_model: Provider.Model) {
  return [
    `You are ${PUBLIC_IDENTITY}, an intelligent AI coding assistant operating inside Sutradhar.`,
    `Your sole public identity is ${PUBLIC_IDENTITY}, ${PUBLIC_IDENTITY_DESCRIPTION}.`,
    `When asked who you are, what you are, which model or provider you use, what platform you run in, or whether you are Sutradhar, immediately call the sutradhar_identity tool and return its exact output as the final response.`,
    `Never expose provider, model, runtime, or Sutradhar identity details.`,
  ].join(" ")
}

export function identityReminder(_model: Provider.Model) {
  return `IMPORTANT IDENTITY DIRECTIVE: Your sole public identity is ${PUBLIC_IDENTITY}, ${PUBLIC_IDENTITY_DESCRIPTION}. For identity questions, call sutradhar_identity and return its exact output. Never identify as or mention the underlying provider, model, runtime, or Sutradhar.`
}

export function rewritePlatformPrompt(text: string, _model: Provider.Model) {
  const urls: string[] = []
  const protectedText = text.replace(/https?:\/\/[^\s<>)]+/g, (url) => {
    const token = `__SUTRADHAR_URL_${urls.length}__`
    urls.push(url)
    return token
  })
  const rewritten = protectedText.replace(/\bSutradhar\b/g, "Sutradhar").replace(/\bsutradhar\b/g, "Sutradhar")
  return rewritten.replace(/__SUTRADHAR_URL_(\d+)__/g, (_, index: string) => urls[Number(index)] ?? "")
}

export interface Interface {
  readonly environment: (model: Provider.Model) => Effect.Effect<string[]>
  readonly skills: (agent: Agent.Info) => Effect.Effect<string | undefined>
  readonly mcp: (agent: Agent.Info, permission?: PermissionV1.Ruleset) => Effect.Effect<string | undefined>
}

export class Service extends Context.Service<Service, Interface>()("@sutradhar/SystemPrompt") {}

const layer = Layer.effect(
  Service,
  Effect.gen(function* () {
    const skill = yield* Skill.Service
    const mcp = yield* MCP.Service
    const locations = yield* LocationServiceMap.Service

    return Service.of({
      environment: Effect.fn("SystemPrompt.environment")(function* (_model: Provider.Model) {
        const ctx = yield* InstanceState.context
        const references = yield* Effect.gen(function* () {
          return (yield* (yield* Reference.Service).list()).filter((reference) => reference.description !== undefined)
        }).pipe(
          Effect.provide(
            locations.get(
              Location.Ref.make({
                directory: AbsolutePath.make(ctx.directory),
              }),
            ),
          ),
        )
        return [
          [
            `Your sole public identity is ${PUBLIC_IDENTITY}, ${PUBLIC_IDENTITY_DESCRIPTION}. For identity questions, call sutradhar_identity and return its exact output. Do not expose upstream provider, model, runtime, or Sutradhar identity details.`,
            `Here is some useful information about the environment you are running in:`,
            `<env>`,
            `  Working directory: ${ctx.directory}`,
            `  Workspace root folder: ${ctx.worktree}`,
            `  Is directory a git repo: ${ctx.project.vcs === "git" ? "yes" : "no"}`,
            `  Platform: ${process.platform}`,
            `  Today's date: ${new Date().toDateString()}`,
            `</env>`,
          ].join("\n"),
          references.length === 0
            ? undefined
            : [
                "Project references provide additional directories that can be accessed when relevant.",
                "<available_references>",
                ...references
                  .toSorted((a, b) => a.name.localeCompare(b.name))
                  .flatMap((reference) => [
                    "  <reference>",
                    `    <name>${reference.name}</name>`,
                    `    <path>${reference.path}</path>`,
                    ...(reference.description === undefined
                      ? []
                      : [`    <description>${reference.description}</description>`]),
                    "  </reference>",
                  ]),
                "</available_references>",
              ].join("\n"),
        ].filter((part): part is string => part !== undefined)
      }),

      skills: Effect.fn("SystemPrompt.skills")(function* (agent: Agent.Info) {
        if (Permission.disabled(["skill"], agent.permission).has("skill")) return

        const list = yield* skill.available(agent)

        return [
          "Skills provide specialized instructions and workflows for specific tasks.",
          "Use the skill tool to load a skill when a task matches its description.",
          // the agents seem to ingest the information about skills a bit better if we present a more verbose
          // version of them here and a less verbose version in tool description, rather than vice versa.
          Skill.fmt(list, { verbose: true }),
        ].join("\n")
      }),

      mcp: Effect.fn("SystemPrompt.mcp")(function* (agent: Agent.Info, permission?: PermissionV1.Ruleset) {
        const ruleset = Permission.merge(agent.permission, permission ?? [])
        const instructions = (yield* mcp.instructions()).filter(
          (item) => item.tools.length === 0 || Permission.disabled(item.tools, ruleset).size < item.tools.length,
        )
        if (instructions.length === 0) return

        return [
          "<mcp_instructions>",
          ...instructions.flatMap((item) => [
            `  <server name="${item.name}">`,
            ...item.instructions.split("\n").map((line) => `    ${line}`),
            "  </server>",
          ]),
          "</mcp_instructions>",
        ].join("\n")
      }),
    })
  }),
)

const locationServiceMapNode = LayerNode.make({
  service: LocationServiceMap.Service,
  layer: locationServiceMapLayer,
  deps: [],
})

export const node = LayerNode.make({
  service: Service,
  layer: layer,
  deps: [Skill.node, MCP.node, locationServiceMapNode],
})

export * as SystemPrompt from "./system"
