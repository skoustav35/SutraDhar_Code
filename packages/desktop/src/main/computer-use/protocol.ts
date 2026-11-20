import { randomUUID } from "node:crypto"

export type ComputerSurface = "browser" | "desktop"

export type ComputerRect = {
  x: number
  y: number
  width: number
  height: number
}

export type ComputerControl = {
  ref: string
  path?: number[]
  role?: string
  name?: string
  value?: string
  description?: string
  enabled?: boolean
  bounds?: ComputerRect
  actions?: string[]
  backendNodeId?: number
}

export type ComputerObservation = {
  observationId: string
  surface: ComputerSurface
  sessionID: string
  title?: string
  url?: string
  text?: string
  state?: Record<string, unknown>
  controls?: ComputerControl[]
  windows?: Array<{
    id: string
    title: string
    className?: string
    processId?: number
    bounds?: ComputerRect
    focused?: boolean
  }>
  screenshot?: {
    data: string
    mime: string
    filename?: string
  }
}

export type ComputerResponse = {
  ok: boolean
  data?: unknown
  error?: string
  code?: string
  observationId?: string
  retryable?: boolean
}

export type ComputerCapabilities = {
  version: 2
  surfaces: Array<{
    surface: ComputerSurface
    available: boolean
    backend?: string
    actions: string[]
    limitations?: string[]
  }>
  features: string[]
}

export type ComputerSession = {
  id: string
  ownerSessionID: string
  surface?: ComputerSurface
  browserWindowId?: number
  desktopWindowId?: string
  createdAt: number
  lastUsedAt: number
}

export function sessionId() {
  return `computer_${randomUUID()}`
}

export function observationId() {
  return `obs_${randomUUID()}`
}

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

export function asString(value: unknown) {
  return typeof value === "string" ? value : undefined
}

export function asNumber(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined
}
