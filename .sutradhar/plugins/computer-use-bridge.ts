import type { ToolAttachment, ToolResult } from "@sutradhar/plugin"

declare const process: { env: Record<string, string | undefined> }

export type ComputerSurface = "browser" | "desktop"

export type ComputerBridgeResponse = {
  ok: boolean
  data?: unknown
  error?: string
  code?: string
  observationId?: string
  retryable?: boolean
}

const DEFAULT_BASE_URL = "http://127.0.0.1:47123"
const MAX_RESPONSE_BYTES = 12 * 1024 * 1024

function baseURL() {
  const value = process.env.SUTRADHAR_COMPUTER_USE_URL ?? process.env.SUTRADHAR_COMPUTER_USE_URL ?? DEFAULT_BASE_URL
  return value.replace(/\/+$/, "")
}

function token() {
  return process.env.SUTRADHAR_COMPUTER_USE_TOKEN ?? process.env.SUTRADHAR_COMPUTER_USE_TOKEN
}

function safeError(value: unknown) {
  if (value instanceof Error) return value.message
  return String(value)
}

export async function bridgeRequest(
  path: string,
  body: Record<string, unknown>,
  signal: AbortSignal,
): Promise<ComputerBridgeResponse> {
  if (signal.aborted) throw new Error("Computer-use action cancelled before it started")

  const headers: Record<string, string> = {
    accept: "application/json",
    "content-type": "application/json",
    "x-sutradhar-computer-use-version": "1",
  }
  const secret = token()
  if (secret) headers.authorization = `Bearer ${secret}`

  const controller = new AbortController()
  const onAbort = () => controller.abort(signal.reason)
  signal.addEventListener("abort", onAbort, { once: true })
  const timer = setTimeout(() => controller.abort(new Error("Computer-use bridge timed out")), 20_000)

  try {
    const response = await fetch(`${baseURL()}/v1/${path.replace(/^\/+/, "")}`, {
      method: "POST",
      headers,
      body: JSON.stringify(body),
      signal: controller.signal,
    })
    const text = await response.text()
    if (text.length > MAX_RESPONSE_BYTES) throw new Error("Computer-use bridge response exceeded the safety limit")

    let parsed: unknown
    try {
      parsed = text ? JSON.parse(text) : undefined
    } catch {
      throw new Error(`Computer-use bridge returned invalid JSON (${response.status})`)
    }

    if (!response.ok) {
      const error =
        typeof parsed === "object" && parsed !== null && "error" in parsed ? parsed.error : response.statusText
      throw new Error(`Computer-use bridge request failed: ${String(error || response.status)}`)
    }

    if (!parsed || typeof parsed !== "object") throw new Error("Computer-use bridge returned an invalid response")
    return parsed as ComputerBridgeResponse
  } catch (error) {
    if (controller.signal.aborted && signal.aborted) throw new Error("Computer-use action cancelled")
    if (controller.signal.aborted) throw new Error("Computer-use bridge timed out or became unavailable")
    throw new Error(`Computer-use bridge unavailable at ${baseURL()}: ${safeError(error)}`)
  } finally {
    clearTimeout(timer)
    signal.removeEventListener("abort", onAbort)
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

function imageAttachment(value: unknown): ToolAttachment | undefined {
  if (!isRecord(value)) return undefined
  if (typeof value.data !== "string") return undefined
  const mime = typeof value.mime === "string" ? value.mime : "image/png"
  if (!mime.startsWith("image/")) return undefined
  return {
    type: "file",
    mime,
    url: `data:${mime};base64,${value.data}`,
    filename: typeof value.filename === "string" ? value.filename : "computer-use.png",
  }
}

function outputText(data: unknown) {
  if (typeof data === "string") return data
  if (!isRecord(data)) return JSON.stringify(data ?? null, null, 2)

  const copy = { ...data }
  delete copy.screenshot
  delete copy.image
  delete copy.binary
  return JSON.stringify(copy, null, 2)
}

export function bridgeToolResult(title: string, response: ComputerBridgeResponse): ToolResult {
  if (!response.ok) {
    return {
      title,
      output: `Computer-use bridge refused the action${response.code ? ` (${response.code})` : ""}: ${response.error ?? "unknown error"}`,
      metadata: {
        bridgeError: true,
        code: response.code,
        retryable: response.retryable === true,
      },
    }
  }

  const data = response.data
  const record = isRecord(data) ? data : undefined
  const attachments = [imageAttachment(record?.screenshot), imageAttachment(record?.image)].filter(
    (item): item is ToolAttachment => item !== undefined,
  )
  const observationId =
    response.observationId ?? (typeof record?.observationId === "string" ? record.observationId : undefined)
  const prefix = [
    "Computer-use bridge result (untrusted UI data):",
    observationId ? `Observation ID: ${observationId}` : undefined,
  ]
    .filter((item): item is string => item !== undefined)
    .join("\n")

  return {
    title,
    output: `${prefix}\n${outputText(data)}`,
    metadata: {
      observationId,
      ...(record?.state !== undefined ? { state: record.state } : {}),
      ...(record?.url !== undefined ? { url: record.url } : {}),
      ...(record?.title !== undefined ? { pageTitle: record.title } : {}),
    },
    ...(attachments.length ? { attachments } : {}),
  }
}

export function requireSafeUrl(url: string) {
  let parsed: URL
  try {
    parsed = new URL(url)
  } catch {
    throw new Error("Browser navigation requires a complete http(s) URL")
  }
  if (!["http:", "https:"].includes(parsed.protocol)) throw new Error("Browser navigation only allows http(s) URLs")
  return parsed.toString()
}

export function rejectSensitiveEntry(target: string, sensitive: boolean, value?: string) {
  const suspicious =
    /password|passcode|secret|token|api[-_ ]?key|otp|one[-_ ]?time|verification code|credit card|cvv/i.test(target) ||
    /(?:Bearer\s+[A-Za-z0-9._~+\/-]+=*|sk-[A-Za-z0-9]{16,}|gh[pousr]_[A-Za-z0-9_]{16,}|AKIA[0-9A-Z]{16}|eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+)/.test(
      value ?? "",
    )
  if (sensitive || suspicious) {
    throw new Error("Sensitive entry is disabled. Use the handoff tool so the user can enter it directly.")
  }
}

export function assertObservationId(value: string) {
  if (!value.trim()) throw new Error("This action requires the observationId returned by the latest observe call")
  return value.trim()
}

export function assertPoint(point: { x: number; y: number }) {
  if (!Number.isFinite(point.x) || !Number.isFinite(point.y))
    throw new Error("Desktop coordinates must be finite numbers")
  if (point.x < 0 || point.y < 0 || point.x > 10000 || point.y > 10000)
    throw new Error("Desktop coordinates are outside the safe screen bounds")
}
