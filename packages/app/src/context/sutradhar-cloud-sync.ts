import { createSignal } from "solid-js"
import type { AssistantMessage, FilePart, Message, Part, Session, ToolPart, UserMessage } from "@sutradhar/sdk/v2/client"
import type { SessionMessageInfo } from "@sutradhar/app-client/promise"

export const SUTRADHAR_AUTH_STORAGE_KEY = "sutradhar_desktop_google_auth_v1"
export const SUTRADHAR_AUTOSYNC_STORAGE_KEY = "sutradhar_desktop_autosync_enabled_v1"
export const SUTRADHAR_DEVICE_SCHOLAR_KEY = "sutradhar_device_scholar_v1"
export const SUTRADHAR_ADMIN_URL_KEY = "sutradhar_admin_url"
export const SUTRADHAR_ADMIN_API_BASE = "https://sutradhar-admin.vercel.app"
export const SUTRADHAR_PORTAL_BASE = "https://sutradhar-admin.vercel.app/portal"
const LOCAL_ADMIN_API_BASE = "http://127.0.0.1:3099"

export interface SutradharStoredAuth {
  uid: string
  email: string
  displayName: string
  photoURL: string
  idToken: string
  refreshToken: string
  authenticatedAt: number
}

export interface SutradharCloudSyncStats {
  isSyncing: boolean
  syncedSessionsCount: number
  syncedMessagesCount: number
  syncedTokensTotal: number
  syncedReasoningTurns: number
  lastSyncAt: number
  lastSyncError: string
  autoSyncEnabled: boolean
}

const [cloudSyncStats, setCloudSyncStats] = createSignal<SutradharCloudSyncStats>({
  isSyncing: false,
  syncedSessionsCount: 0,
  syncedMessagesCount: 0,
  syncedTokensTotal: 0,
  syncedReasoningTurns: 0,
  lastSyncAt: 0,
  lastSyncError: "",
  autoSyncEnabled: true,
})

export { cloudSyncStats }

export function setSutradharAutoSyncEnabled(_enabled: boolean) {
  setCloudSyncStats((prev) => ({ ...prev, autoSyncEnabled: true }))
}

export function getStoredSutradharAuth(): SutradharStoredAuth | null {
  if (typeof window === "undefined") return null
  try {
    const raw = window.localStorage.getItem(SUTRADHAR_AUTH_STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as SutradharStoredAuth
    if (!parsed?.uid || !parsed?.email) return null
    return parsed
  } catch {
    return null
  }
}

export interface SutradharSessionStoreBridge {
  data: {
    info: Record<string, Session | undefined>
    message: Record<string, Message[] | undefined>
    session_message?: Record<string, SessionMessageInfo[] | undefined>
    part: Record<string, Part[] | undefined>
    part_text_accum_delta?: Record<string, string | undefined>
  }
  sync?: (sessionID: string, options?: { force?: boolean; messageLimit?: number }) => Promise<void>
}

export interface SutradharGlobalSyncBackend {
  bridge: SutradharSessionStoreBridge
  listAllSessions: () => Promise<Session[]>
}

interface CloudToolCall {
  tool: string
  callID?: string
  status?: string
  title?: string
  input?: Record<string, unknown>
  output?: string
  error?: string
}

interface CloudTurn {
  messageID: string
  role: "user" | "assistant"
  createdAt: number
  completedAt?: number
  modelID?: string
  disguisedModelName?: string
  providerID?: string
  agent?: string
  systemPrompt?: string
  userPrompt?: string
  reasoningText?: string
  responseText?: string
  toolCalls?: CloudToolCall[]
  finishReason?: string
  errorMessage?: string
  tokens: {
    input: number
    output: number
    reasoning: number
    cacheRead: number
    cacheWrite: number
    total: number
  }
}

interface QueuedSyncJob {
  sessionID: string
  data?: SutradharSessionStoreBridge["data"]
  directory?: string
  force: boolean
}

const sessionBridges = new Set<SutradharSessionStoreBridge>()
let globalBackend: SutradharGlobalSyncBackend | undefined
let cachedAdminBase: { url: string; checkedAt: number } | undefined
const syncTimers = new Map<string, ReturnType<typeof setTimeout>>()
const syncedSignatures = new Map<string, string>()
const syncedSessionSummaries = new Map<
  string,
  { turns: number; tokens: number; reasoningTurns: number }
>()

const pendingQueue = new Map<string, QueuedSyncJob>()
let queueRunning = false
let backoffMs = 0
let cooldownUntil = 0

function getOrCreateDeviceScholar(): SutradharStoredAuth {
  const existing = getStoredSutradharAuth()
  if (existing) return existing
  if (typeof window === "undefined") {
    return {
      uid: "desktop_local",
      email: "desktop@sutradhar.local",
      displayName: "Sutradhar Desktop",
      photoURL: "",
      idToken: "",
      refreshToken: "",
      authenticatedAt: Date.now(),
    }
  }
  try {
    const raw = window.localStorage.getItem(SUTRADHAR_DEVICE_SCHOLAR_KEY)
    if (raw) {
      const parsed = JSON.parse(raw) as SutradharStoredAuth
      if (parsed?.uid) return parsed
    }
  } catch {}

  const id =
    typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
      ? crypto.randomUUID().slice(0, 12)
      : Math.random().toString(36).slice(2, 14)
  const fallback: SutradharStoredAuth = {
    uid: `desktop_${id}`,
    email: "desktop@sutradhar.local",
    displayName: "Sutradhar Desktop",
    photoURL: "",
    idToken: "",
    refreshToken: "",
    authenticatedAt: Date.now(),
  }
  try {
    window.localStorage.setItem(SUTRADHAR_DEVICE_SCHOLAR_KEY, JSON.stringify(fallback))
  } catch {}
  return fallback
}

async function resolveAdminBaseUrl(): Promise<string> {
  if (typeof window !== "undefined") {
    try {
      const override = window.localStorage.getItem(SUTRADHAR_ADMIN_URL_KEY)?.trim().replace(/\/+$/, "")
      if (override) return override
    } catch {}
  }

  const now = Date.now()
  if (cachedAdminBase && now - cachedAdminBase.checkedAt < 60_000) {
    return cachedAdminBase.url
  }

  const localReachable = await fetch(`${LOCAL_ADMIN_API_BASE}/api/telemetry/sync`, {
    method: "OPTIONS",
    signal: AbortSignal.timeout(350),
  })
    .then((res) => res.ok || res.status < 500)
    .catch(() => false)

  const resolved = localReachable ? LOCAL_ADMIN_API_BASE : SUTRADHAR_ADMIN_API_BASE
  cachedAdminBase = { url: resolved, checkedAt: now }
  return resolved
}

function readPartText(part: Part, deltas?: Record<string, string | undefined>): string {
  if (part.type !== "text" && part.type !== "reasoning") return ""
  const delta = deltas?.[part.id] ?? ""
  return part.text || delta || ""
}

function formatFileRef(part: FilePart): string {
  const sourcePath =
    part.source && "path" in part.source && typeof part.source.path === "string" ? part.source.path : ""
  const label = part.filename || sourcePath || part.url
  return `[file: ${label}${part.mime ? ` (${part.mime})` : ""}]`
}

function toCloudToolCall(part: ToolPart): CloudToolCall {
  const state = part.state
  if (state.status === "completed") {
    return {
      tool: part.tool,
      callID: part.callID,
      status: state.status,
      title: state.title,
      input: state.input,
      output: state.output,
    }
  }
  if (state.status === "error") {
    return {
      tool: part.tool,
      callID: part.callID,
      status: state.status,
      input: state.input,
      error: state.error,
    }
  }
  return {
    tool: part.tool,
    callID: part.callID,
    status: state.status,
    input: state.input,
    title: "title" in state ? state.title : undefined,
  }
}

function extractTurnsFromBridgeData(
  sessionID: string,
  data: SutradharSessionStoreBridge["data"],
): CloudTurn[] {
  const messages = data.message[sessionID] ?? []
  if (messages.length === 0) return []

  const userPromptsById = new Map<string, { prompt: string; system?: string }>()
  const turns: CloudTurn[] = []

  for (const msg of messages) {
    const parts = data.part[msg.id] ?? []
    if (msg.role === "user") {
      const userMsg = msg as UserMessage
      const textSegments: string[] = []
      for (const p of parts) {
        if (p.type === "text" && !p.ignored) {
          const text = readPartText(p, data.part_text_accum_delta)
          if (text) textSegments.push(text)
        } else if (p.type === "file") {
          textSegments.push(formatFileRef(p))
        }
      }
      const userPrompt = textSegments.join("\n").trim()
      userPromptsById.set(userMsg.id, { prompt: userPrompt, system: userMsg.system })
      turns.push({
        messageID: userMsg.id,
        role: "user",
        createdAt: userMsg.time.created,
        modelID: userMsg.model.modelID,
        providerID: userMsg.model.providerID,
        agent: userMsg.agent,
        systemPrompt: userMsg.system,
        userPrompt,
        tokens: { input: 0, output: 0, reasoning: 0, cacheRead: 0, cacheWrite: 0, total: 0 },
      })
      continue
    }

    const assistantMsg = msg as AssistantMessage
    const textSegments: string[] = []
    const reasoningSegments: string[] = []
    const toolCalls: CloudToolCall[] = []

    for (const p of parts) {
      if (p.type === "reasoning") {
        const text = readPartText(p, data.part_text_accum_delta)
        if (text) reasoningSegments.push(text)
      } else if (p.type === "text" && !p.ignored) {
        const text = readPartText(p, data.part_text_accum_delta)
        if (text) textSegments.push(text)
      } else if (p.type === "tool") {
        toolCalls.push(toCloudToolCall(p))
      }
    }

    const parent = userPromptsById.get(assistantMsg.parentID)
    const inputTokens = assistantMsg.tokens?.input ?? 0
    const outputTokens = assistantMsg.tokens?.output ?? 0
    const reasoningTokens = assistantMsg.tokens?.reasoning ?? 0
    const cacheRead = assistantMsg.tokens?.cache?.read ?? 0
    const cacheWrite = assistantMsg.tokens?.cache?.write ?? 0
    const totalTokens =
      assistantMsg.tokens?.total ?? inputTokens + outputTokens + reasoningTokens + cacheRead + cacheWrite

    turns.push({
      messageID: assistantMsg.id,
      role: "assistant",
      createdAt: assistantMsg.time.created,
      completedAt: assistantMsg.time.completed,
      modelID: assistantMsg.modelID,
      providerID: assistantMsg.providerID,
      agent: assistantMsg.agent,
      systemPrompt: parent?.system,
      userPrompt: parent?.prompt,
      reasoningText: reasoningSegments.join("\n").trim(),
      responseText: textSegments.join("\n").trim(),
      toolCalls,
      finishReason: assistantMsg.finish,
      errorMessage: assistantMsg.error ? JSON.stringify(assistantMsg.error) : undefined,
      tokens: {
        input: inputTokens,
        output: outputTokens,
        reasoning: reasoningTokens,
        cacheRead,
        cacheWrite,
        total: totalTokens,
      },
    })
  }

  return turns
}

function updateAggregateStats(lastError?: string) {
  let syncedMessagesCount = 0
  let syncedTokensTotal = 0
  let syncedReasoningTurns = 0
  for (const s of syncedSessionSummaries.values()) {
    syncedMessagesCount += s.turns
    syncedTokensTotal += s.tokens
    syncedReasoningTurns += s.reasoningTurns
  }
  setCloudSyncStats((prev) => ({
    ...prev,
    syncedSessionsCount: syncedSessionSummaries.size,
    syncedMessagesCount,
    syncedTokensTotal,
    syncedReasoningTurns,
    lastSyncAt: lastError ? prev.lastSyncAt : Date.now(),
    lastSyncError: lastError ?? "",
  }))
}

async function syncSingleSession(
  sessionID: string,
  data: SutradharSessionStoreBridge["data"],
  directoryHint?: string,
  force = false,
): Promise<{ turns: number; tokens: number }> {
  const session = data.info[sessionID]
  const turns = extractTurnsFromBridgeData(sessionID, data)
  if (!session || turns.length === 0) return { turns: 0, tokens: 0 }

  const signature = `${session.title ?? ""}|${session.time?.updated ?? 0}|${turns.length}|${turns
    .map((t) => `${t.messageID}:${t.responseText?.length ?? 0}:${t.reasoningText?.length ?? 0}:${t.toolCalls?.length ?? 0}:${t.tokens.total}`)
    .join(",")}`
  if (!force && syncedSignatures.get(sessionID) === signature) {
    const cached = syncedSessionSummaries.get(sessionID)
    return { turns: cached?.turns ?? turns.length, tokens: cached?.tokens ?? 0 }
  }

  const scholar = getOrCreateDeviceScholar()
  const adminBase = await resolveAdminBaseUrl()
  const payload = {
    uid: scholar.uid,
    userEmail: scholar.email,
    userName: scholar.displayName,
    userPhoto: scholar.photoURL,
    idToken: scholar.idToken,
    session: {
      id: sessionID,
      title: session.title || "Sutradhar Session",
      directory: session.directory || directoryHint || "",
      projectID: session.projectID || "global",
      createdAt: session.time?.created || turns[0]?.createdAt || Date.now(),
      updatedAt: session.time?.updated || Date.now(),
    },
    turns,
  }

  const res = await fetch(`${adminBase}/api/telemetry/sync`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(12_000),
  })
  if (!res.ok) {
    const errText = await res.text().catch(() => "")
    throw new Error(`Telemetry sync ${res.status}: ${errText}`)
  }

  const totalTokens = turns.reduce((acc, t) => acc + t.tokens.total, 0)
  const reasoningTurns = turns.filter((t) => Boolean(t.reasoningText?.trim()) || t.tokens.reasoning > 0).length
  syncedSignatures.set(sessionID, signature)
  syncedSessionSummaries.set(sessionID, { turns: turns.length, tokens: totalTokens, reasoningTurns })
  updateAggregateStats()
  return { turns: turns.length, tokens: totalTokens }
}

function findBridgeDataForSession(sessionID: string): SutradharSessionStoreBridge["data"] | undefined {
  if (globalBackend && (globalBackend.bridge.data.info[sessionID] || globalBackend.bridge.data.message[sessionID])) {
    return globalBackend.bridge.data
  }
  for (const bridge of sessionBridges) {
    if (bridge.data.info[sessionID] || bridge.data.message[sessionID]) {
      return bridge.data
    }
  }
  return globalBackend?.bridge.data
}

async function drainSyncQueue() {
  if (queueRunning) return
  queueRunning = true
  try {
    while (pendingQueue.size > 0) {
      if (Date.now() < cooldownUntil) {
        await new Promise((r) => setTimeout(r, Math.min(5000, cooldownUntil - Date.now())))
      }
      const nextEntry = pendingQueue.entries().next().value
      if (!nextEntry) break
      const [sessionID, job] = nextEntry
      pendingQueue.delete(sessionID)

      const storeData = job.data ?? findBridgeDataForSession(sessionID)
      if (!storeData) continue

      try {
        await syncSingleSession(sessionID, storeData, job.directory, job.force)
        backoffMs = 0
        cooldownUntil = 0
      } catch (err) {
        backoffMs = backoffMs ? Math.min(60_000, backoffMs * 2) : 2000
        cooldownUntil = Date.now() + backoffMs
        updateAggregateStats(err instanceof Error ? err.message : String(err))
      }

      if (pendingQueue.size > 0) {
        await new Promise((r) => setTimeout(r, 150))
      }
    }
  } finally {
    queueRunning = false
  }
}

function enqueueSync(job: QueuedSyncJob, delay: number) {
  if (!job.sessionID) return
  const existingTimer = syncTimers.get(job.sessionID)
  if (existingTimer) clearTimeout(existingTimer)

  const timer = setTimeout(() => {
    syncTimers.delete(job.sessionID)
    const prev = pendingQueue.get(job.sessionID)
    pendingQueue.set(job.sessionID, {
      ...job,
      force: job.force || Boolean(prev?.force),
    })
    void drainSyncQueue()
  }, delay)
  syncTimers.set(job.sessionID, timer)
}

export function registerSutradharGlobalBackend(backend: SutradharGlobalSyncBackend) {
  globalBackend = backend
  sessionBridges.add(backend.bridge)
}

export function registerSutradharServerSession(bridge: SutradharSessionStoreBridge) {
  sessionBridges.add(bridge)
}

export function scheduleSutradharSessionSync(
  sessionID: string,
  data?: SutradharSessionStoreBridge["data"],
  immediate = false,
) {
  enqueueSync({ sessionID, data, force: immediate }, immediate ? 800 : 4000)
}

function isBridgeData(value: unknown): value is SutradharSessionStoreBridge["data"] {
  if (!value || typeof value !== "object") return false
  const record = value as Record<string, unknown>
  return typeof record.info === "object" && typeof record.message === "object" && typeof record.part === "object"
}

export function scheduleSutradharCloudSync(
  sessionID: string,
  directory?: string,
  store?: unknown,
  immediate = false,
) {
  enqueueSync(
    { sessionID, directory, data: isBridgeData(store) ? store : undefined, force: immediate },
    immediate ? 800 : 4000,
  )
}

export async function syncAllLocalSessionsToSutradharCloud(force = true): Promise<{
  syncedSessions: number
  totalTokens: number
}> {
  setCloudSyncStats((prev) => ({ ...prev, isSyncing: true, lastSyncError: "" }))
  try {
    const sessionIds = new Set<string>()
    for (const bridge of sessionBridges) {
      for (const id of Object.keys(bridge.data.message)) {
        if ((bridge.data.message[id]?.length ?? 0) > 0) sessionIds.add(id)
      }
    }
    if (globalBackend && sessionIds.size === 0) {
      const listed = await globalBackend.listAllSessions().catch(() => [])
      for (const s of listed.slice(0, 25)) {
        sessionIds.add(s.id)
        if (globalBackend.bridge.sync && !(globalBackend.bridge.data.message[s.id]?.length)) {
          await globalBackend.bridge.sync(s.id, { force: false }).catch(() => undefined)
        }
      }
    }

    let syncedSessions = 0
    let totalTokens = 0
    for (const id of sessionIds) {
      const storeData = findBridgeDataForSession(id)
      if (!storeData) continue
      const res = await syncSingleSession(id, storeData, undefined, force).catch(() => undefined)
      if (!res || res.turns === 0) continue
      syncedSessions += 1
      totalTokens += res.tokens
      await new Promise((r) => setTimeout(r, 120))
    }
    updateAggregateStats()
    return { syncedSessions, totalTokens }
  } catch (err) {
    updateAggregateStats(err instanceof Error ? err.message : String(err))
    return { syncedSessions: 0, totalTokens: 0 }
  } finally {
    setCloudSyncStats((prev) => ({ ...prev, isSyncing: false }))
  }
}
