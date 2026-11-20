import { randomBytes, randomUUID } from "node:crypto"
import { createServer, type IncomingMessage, type Server, type ServerResponse } from "node:http"
import { ManagedBrowserController } from "./browser"
import { WindowsComputerHelper } from "./windows-helper"
import {
  asNumber,
  asString,
  isRecord,
  observationId,
  type ComputerCapabilities,
  type ComputerControl,
  type ComputerObservation,
  type ComputerRect,
  type ComputerResponse,
} from "./protocol"

const MAX_REQUEST_BYTES = 2 * 1024 * 1024

type DesktopNode = {
  path: number[]
  name?: string
  role?: string
  value?: string
  description?: string
  enabled?: boolean
  bounds?: ComputerRect
  actions?: string[]
}

type DesktopSnapshot = {
  observationId: string
  windowId: string
  bounds?: ComputerRect
  nodes: Map<string, DesktopNode>
  text: string
}

type Logger = {
  log(message: string, metadata?: Record<string, unknown>): void
  warn(message: string, metadata?: Record<string, unknown>): void
  error(message: string, metadata?: Record<string, unknown>): void
}

export class ComputerUseService {
  readonly browser = new ManagedBrowserController()
  readonly windows = new WindowsComputerHelper()
  #server: Server | undefined
  #startPromise: Promise<Record<string, string>> | undefined
  #token = ""
  #url = ""
  #desktopSnapshots = new Map<string, DesktopSnapshot>()
  #handoffs = new Map<string, string>()
  #logger: Logger

  constructor(logger: Logger = { log: () => {}, warn: () => {}, error: () => {} }) {
    this.#logger = logger
  }

  async start() {
    if (this.#server) return this.env()
    if (this.#startPromise) return this.#startPromise

    this.#startPromise = (async () => {
      this.#token = randomBytes(32).toString("hex")
      if (process.platform === "win32") {
        await this.windows.start().catch((error) => {
          this.#logger.warn("windows computer helper unavailable", { error: String(error) })
        })
      }

      this.#server = createServer((request, response) => {
        void this.#handle(request, response)
      })
      try {
        await new Promise<void>((resolve, reject) => {
          const server = this.#server
          if (!server) return reject(new Error("Computer-use service was not initialized"))
          const onError = (error: Error) => {
            server.off("listening", onListening)
            reject(error)
          }
          const onListening = () => {
            server.off("error", onError)
            resolve()
          }
          server.once("error", onError)
          server.once("listening", onListening)
          server.listen(0, "127.0.0.1")
        })
        const address = this.#server.address()
        if (!address || typeof address === "string")
          throw new Error("Computer-use service did not receive a loopback address")
        this.#url = `http://127.0.0.1:${address.port}`
        this.#logger.log("computer-use service ready", { url: this.#url, platform: process.platform })
        return this.env()
      } catch (error) {
        const server = this.#server
        this.#server = undefined
        this.#url = ""
        await new Promise<void>((resolve) => {
          if (!server) return resolve()
          server.close(() => resolve())
        })
        throw error
      }
    })().finally(() => {
      this.#startPromise = undefined
    })

    return this.#startPromise
  }

  env() {
    return {
      SUTRADHAR_COMPUTER_USE_URL: this.#url,
      SUTRADHAR_COMPUTER_USE_TOKEN: this.#token,
    }
  }

  async status() {
    const desktop =
      process.platform === "win32" && Boolean(await this.windows.request("health", {}).catch(() => undefined))
    return {
      ready: Boolean(this.#server),
      endpoint: this.#url,
      browser: { ready: Boolean(this.#server), backend: "electron-cdp" },
      desktop: { ready: desktop, backend: desktop ? "windows-uia" : null, platform: process.platform },
    }
  }

  async stop() {
    await this.browser.stop()
    await this.windows.stop()
    const server = this.#server
    this.#server = undefined
    this.#desktopSnapshots.clear()
    this.#handoffs.clear()
    if (!server) return
    await new Promise<void>((resolve) => server.close(() => resolve()))
  }

  async #handle(request: IncomingMessage, response: ServerResponse) {
    response.setHeader("content-type", "application/json; charset=utf-8")
    response.setHeader("cache-control", "no-store")
    if (request.method !== "POST") {
      this.#send(response, 405, {
        ok: false,
        error: "Computer-use service only accepts POST requests",
        code: "method_not_allowed",
      })
      return
    }
    if (request.socket.remoteAddress !== "127.0.0.1" && request.socket.remoteAddress !== "::1") {
      this.#send(response, 403, {
        ok: false,
        error: "Computer-use service only accepts loopback requests",
        code: "forbidden",
      })
      return
    }
    if (request.headers["x-sutradhar-computer-use-version"] !== "1") {
      this.#send(response, 400, {
        ok: false,
        error: "Unsupported computer-use protocol version",
        code: "unsupported_version",
      })
      return
    }
    const authorization = request.headers.authorization
    if (authorization !== `Bearer ${this.#token}`) {
      this.#send(response, 401, {
        ok: false,
        error: "Computer-use service authentication failed",
        code: "unauthorized",
      })
      return
    }

    try {
      const body = await readBody(request)
      const payload = body ? JSON.parse(body) : {}
      const pathname = new URL(request.url ?? "/", this.#url || "http://127.0.0.1").pathname
      const result = await this.#dispatch(pathname.replace(/^\/v1\/?/, ""), isRecord(payload) ? payload : {})
      this.#send(response, 200, result)
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      this.#logger.warn("computer-use request failed", { path: request.url, error: message })
      this.#send(response, 400, { ok: false, error: message, code: "request_failed", retryable: false })
    }
  }

  async #dispatch(path: string, payload: Record<string, unknown>): Promise<ComputerResponse> {
    if (path === "capabilities") return { ok: true, data: await this.#capabilities() }
    if (path === "observe") return this.#observe(payload)
    if (path === "action") return this.#action(payload)
    if (path === "handoff") {
      const sessionID = required(payload, "sessionID")
      const reason = asString(payload.reason) ?? "User takeover requested"
      this.#handoffs.set(sessionID, reason)
      return { ok: true, data: { handedOff: true, paused: true, reason } }
    }
    if (path === "verify") return this.#verify(payload)
    throw new Error(`Unknown computer-use endpoint: ${path}`)
  }

  async #capabilities(): Promise<ComputerCapabilities> {
    const desktopAvailable =
      process.platform === "win32" && Boolean(await this.windows.request("health", {}).catch(() => undefined))
    return {
      version: 2,
      surfaces: [
        {
          surface: "browser",
          available: true,
          backend: "electron-cdp",
          actions: [
            "observe",
            "tabs",
            "navigate",
            "click",
            "fill",
            "select",
            "key",
            "scroll",
            "wait",
            "close",
            "verify",
          ],
        },
        {
          surface: "desktop",
          available: desktopAvailable,
          backend: desktopAvailable ? "windows-uia" : undefined,
          actions: desktopAvailable
            ? ["windows", "observe", "focus", "click", "type", "key", "scroll", "drag", "wait", "verify"]
            : [],
          limitations: desktopAvailable
            ? []
            : ["Windows computer helper is unavailable on this platform or failed its health check"],
        },
      ],
      features: [
        "semantic-targets",
        "fresh-observation-ids",
        "postcondition-verification",
        "user-handoff",
        "redacted-audit",
      ],
    }
  }

  async #observe(payload: Record<string, unknown>): Promise<ComputerResponse> {
    const surface = asString(payload.surface)
    const sessionID = asString(payload.sessionID) ?? `anonymous_${randomUUID()}`
    this.#handoffs.delete(sessionID)
    if (surface === "browser") {
      const observation = await this.browser.observe(sessionID, {
        includeScreenshot: payload.includeScreenshot !== false,
        includeAccessibility: payload.includeAccessibility !== false,
      })
      return { ok: true, observationId: observation.observationId, data: observation }
    }
    if (surface === "desktop") return this.#desktopObserve(sessionID, payload)
    throw new Error("Computer-use observation requires surface browser or desktop")
  }

  async #action(payload: Record<string, unknown>): Promise<ComputerResponse> {
    const surface = asString(payload.surface)
    const name = asString(payload.action)
    const sessionID = asString(payload.sessionID) ?? `anonymous_${randomUUID()}`
    if (!surface || !name) throw new Error("Computer-use action requires surface and action")
    const handoffReason = this.#handoffs.get(sessionID)
    if (handoffReason)
      throw new Error(
        `Computer-use session is paused for user takeover: ${handoffReason}; observe again after takeover`,
      )
    this.#logger.log("computer-use action", { surface, action: name, sessionID })
    if (surface === "browser") return this.#browserAction(sessionID, name, payload)
    if (surface === "desktop") return this.#desktopAction(sessionID, name, payload)
    throw new Error("Computer-use action requires surface browser or desktop")
  }

  async #browserAction(sessionID: string, name: string, payload: Record<string, unknown>): Promise<ComputerResponse> {
    let data: unknown
    if (name === "navigate") data = await this.browser.navigate(sessionID, asString(payload.url) ?? "")
    else if (name === "click")
      data = await this.browser.click(sessionID, {
        observationId: required(payload, "observationId"),
        target: required(payload, "target"),
        clickCount: asNumber(payload.clickCount),
        button: asString(payload.button),
      })
    else if (name === "fill") {
      const target = required(payload, "target")
      const text = required(payload, "text")
      assertSafeEntry(target, text)
      data = await this.browser.fill(sessionID, { observationId: required(payload, "observationId"), target, text })
    } else if (name === "select")
      data = await this.browser.select(sessionID, {
        observationId: required(payload, "observationId"),
        target: required(payload, "target"),
        option: required(payload, "option"),
      })
    else if (name === "key")
      data = await this.browser.key(sessionID, {
        observationId: required(payload, "observationId"),
        key: required(payload, "key"),
        modifiers: arrayOfStrings(payload.modifiers),
      })
    else if (name === "scroll")
      data = await this.browser.scroll(sessionID, {
        observationId: required(payload, "observationId"),
        direction: required(payload, "direction"),
        amount: asNumber(payload.amount) ?? 600,
      })
    else if (name === "wait") data = await this.browser.wait(sessionID, asNumber(payload.milliseconds) ?? 300)
    else if (name === "tabs") data = { tabs: this.browser.list(sessionID) }
    else if (name === "close") {
      await this.browser.close(sessionID)
      data = { closed: true }
    } else throw new Error(`Unsupported browser action: ${name}`)
    const observationIdValue = isRecord(data) && typeof data.observationId === "string" ? data.observationId : undefined
    return { ok: true, observationId: observationIdValue, data }
  }

  async #desktopObserve(sessionID: string, payload: Record<string, unknown>): Promise<ComputerResponse> {
    if (process.platform !== "win32") throw new Error("Native desktop control is currently available on Windows only")
    const response = await this.windows.request("observe", {
      window: payload.window,
      includeScreenshot: payload.includeScreenshot !== false,
    })
    if (!response.ok) throw new Error(response.error ?? "Windows observation failed")
    const raw = isRecord(response.data) ? response.data : {}
    const observation = desktopObservation(sessionID, raw)
    const nodes = Array.isArray(raw.nodes) ? raw.nodes : []
    const mapped = new Map<string, DesktopNode>()
    for (let index = 0; index < nodes.length; index++) {
      const node = nodes[index]
      if (!isRecord(node) || !Array.isArray(node.path)) continue
      const ref = `desktop_${observation.observationId}_${index + 1}`
      mapped.set(ref, {
        path: node.path.filter((value): value is number => typeof value === "number"),
        name: asString(node.name),
        role: asString(node.role),
        value: asString(node.value),
        description: asString(node.automationId),
        enabled: node.enabled !== false,
        bounds: rect(node.bounds),
        actions: arrayOfStrings(node.actions),
      })
    }
    observation.controls = [...mapped.entries()].map(([ref, node]) => ({ ref, ...node }))
    observation.text = desktopText(observation.controls)
    const window = isRecord(raw.window) ? raw.window : {}
    const windowId = asString(window.id) ?? "focused-window"
    const windowBounds = rect(window.bounds)
    this.#desktopSnapshots.set(sessionID, {
      observationId: observation.observationId,
      windowId,
      bounds: windowBounds,
      nodes: mapped,
      text: desktopText(observation.controls),
    })
    return { ok: true, observationId: observation.observationId, data: observation }
  }

  async #desktopAction(sessionID: string, name: string, payload: Record<string, unknown>): Promise<ComputerResponse> {
    if (process.platform !== "win32") throw new Error("Native desktop control is currently available on Windows only")
    if (name === "windows") {
      const response = await this.windows.request("windows", {})
      if (!response.ok) throw new Error(response.error ?? "Windows enumeration failed")
      return { ok: true, data: response.data }
    }
    if (name === "focus") {
      const response = await this.windows.request("focus", { window: asString(payload.window) ?? "focused-window" })
      if (!response.ok) throw new Error(response.error ?? "Desktop focus failed")
      return this.#desktopObserve(sessionID, {
        window: response.data && isRecord(response.data) ? response.data.focused : payload.window,
        includeScreenshot: true,
      })
    }

    const snapshot = this.#desktopSnapshots.get(sessionID)
    const observation = required(payload, "observationId")
    if (!snapshot || snapshot.observationId !== observation)
      throw new Error("Desktop observation is stale; observe again")
    const target = asString(payload.target)
    const node = target ? snapshot.nodes.get(target) : undefined
    const request: Record<string, unknown> = { window: snapshot.windowId }
    if (node) request.path = node.path
    if (name === "click") {
      request.x = asNumber(payload.x) ?? (node?.bounds ? node.bounds.x + node.bounds.width / 2 : undefined)
      request.y = asNumber(payload.y) ?? (node?.bounds ? node.bounds.y + node.bounds.height / 2 : undefined)
      if (request.x === undefined || request.y === undefined)
        throw new Error("Desktop target has no usable click point")
      if (!node && snapshot.bounds && !pointInRect(request.x as number, request.y as number, snapshot.bounds))
        throw new Error("Desktop click is outside the latest observed window bounds")
      request.button = asString(payload.button) ?? "left"
      request.clickCount = asNumber(payload.clickCount) ?? 1
    } else if (name === "type") {
      const text = required(payload, "text")
      assertSafeEntry(asString(payload.target) ?? "focused desktop control", text)
      request.text = text
    } else if (name === "key") {
      request.key = required(payload, "key")
      request.modifiers = arrayOfStrings(payload.modifiers)
    } else if (name === "scroll") {
      request.deltaX = asNumber(payload.deltaX) ?? 0
      request.deltaY = asNumber(payload.deltaY) ?? 600
    } else if (name === "drag") {
      request.path = payload.path
      if (snapshot.bounds) {
        for (const point of arrayOfRecords(payload.path)) {
          const x = asNumber(point.x)
          const y = asNumber(point.y)
          if (x === undefined || y === undefined || !pointInRect(x, y, snapshot.bounds))
            throw new Error("Desktop drag leaves the latest observed window bounds")
        }
      }
    } else if (name === "wait") {
      await new Promise((resolve) =>
        setTimeout(resolve, Math.max(50, Math.min(5000, asNumber(payload.milliseconds) ?? 300))),
      )
      return this.#desktopObserve(sessionID, { window: snapshot.windowId, includeScreenshot: true })
    } else throw new Error(`Unsupported desktop action: ${name}`)

    const response = await this.windows.request(name === "type" ? "type" : name, request)
    if (!response.ok) throw new Error(response.error ?? `Desktop ${name} failed`)
    return this.#desktopObserve(sessionID, { window: snapshot.windowId, includeScreenshot: true })
  }

  async #verify(payload: Record<string, unknown>): Promise<ComputerResponse> {
    const surface = asString(payload.surface)
    const sessionID = required(payload, "sessionID")
    const assertions = arrayOfStrings(payload.assertions)
    if (!assertions.length) throw new Error("Verification requires at least one assertion")
    if (surface === "browser") return { ok: true, data: await this.browser.verify(sessionID, assertions) }
    if (surface !== "desktop") throw new Error("Verification requires surface browser or desktop")
    const snapshot = this.#desktopSnapshots.get(sessionID)
    if (!snapshot || snapshot.observationId !== required(payload, "observationId"))
      throw new Error("Desktop observation is stale; observe again")
    const results = assertions.map((assertion) => ({
      assertion,
      passed: snapshot.text.toLowerCase().includes(assertion.toLowerCase()),
    }))
    return {
      ok: true,
      data: { passed: results.every((item) => item.passed), results, observationId: snapshot.observationId },
    }
  }

  #send(response: ServerResponse, status: number, body: ComputerResponse) {
    response.statusCode = status
    response.end(JSON.stringify(body))
  }
}

function required(payload: Record<string, unknown>, key: string) {
  const value = asString(payload[key])
  if (!value) throw new Error(`Missing required field: ${key}`)
  return value
}

function arrayOfStrings(value: unknown) {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : []
}

function arrayOfRecords(value: unknown) {
  return Array.isArray(value) ? value.filter(isRecord) : []
}

function pointInRect(x: number, y: number, bounds: ComputerRect) {
  return x >= bounds.x && y >= bounds.y && x <= bounds.x + bounds.width && y <= bounds.y + bounds.height
}

function assertSafeEntry(target: string, value: string) {
  const suspiciousTarget =
    /password|passcode|secret|token|api[-_ ]?key|otp|one[-_ ]?time|verification code|credit card|cvv/i.test(target)
  const suspiciousValue =
    /(?:Bearer\s+[A-Za-z0-9._~+\/-]+=*|sk-[A-Za-z0-9]{16,}|gh[pousr]_[A-Za-z0-9_]{16,}|AKIA[0-9A-Z]{16}|eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+)/.test(
      value,
    )
  if (suspiciousTarget || suspiciousValue)
    throw new Error("Sensitive entry is disabled. Use the handoff tool so the user can enter it directly.")
}

function rect(value: unknown): ComputerRect | undefined {
  if (!isRecord(value)) return undefined
  const x = asNumber(value.x)
  const y = asNumber(value.y)
  const width = asNumber(value.width)
  const height = asNumber(value.height)
  if ([x, y, width, height].some((item) => item === undefined)) return undefined
  return { x: x as number, y: y as number, width: width as number, height: height as number }
}

function desktopObservation(sessionID: string, raw: Record<string, unknown>): ComputerObservation {
  const window = isRecord(raw.window) ? raw.window : {}
  return {
    observationId: observationId(),
    surface: "desktop",
    sessionID,
    title: asString(window.title),
    text: "",
    state: { windowId: asString(window.id), focused: window.focused === true },
    windows: [
      {
        id: asString(window.id) ?? "focused-window",
        title: asString(window.title) ?? "",
        className: asString(window.className),
        processId: asNumber(window.processId),
        bounds: rect(window.bounds),
        focused: window.focused === true,
      },
    ],
    screenshot:
      isRecord(raw.screenshot) && typeof raw.screenshot.data === "string"
        ? {
            data: raw.screenshot.data,
            mime: asString(raw.screenshot.mime) ?? "image/png",
            filename: asString(raw.screenshot.filename) ?? "desktop.png",
          }
        : undefined,
  }
}

function desktopText(controls: ComputerControl[]) {
  return controls
    .flatMap((control) => [control.role, control.name, control.value, control.description])
    .filter((value): value is string => Boolean(value))
    .join("\n")
}

async function readBody(request: IncomingMessage) {
  const chunks: Buffer[] = []
  let size = 0
  for await (const chunk of request) {
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)
    size += buffer.length
    if (size > MAX_REQUEST_BYTES) throw new Error("Computer-use request exceeded the size limit")
    chunks.push(buffer)
  }
  return Buffer.concat(chunks).toString("utf8")
}
