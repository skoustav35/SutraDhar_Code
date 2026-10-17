import { exec } from "child_process"
import { promisify } from "util"
import { firestoreConfig } from "./firebase"
import type { AppSettingsDoc, CuratedModelDoc, UpstreamModel } from "./types"

const execAsync = promisify(exec)

const UPSTREAM_INFERENCE_MODELS_URL = "https://opencode.ai/inference/v1/models"
const UPSTREAM_CATALOG_URL = "https://models.opencode.ai/api.json"
const SERVER_VERIFIED_TOKEN = "sutradhar_srv_v1"
const PROJECT_ID = firestoreConfig.projectId
const FIRESTORE_BASE = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents`

export const WINDOWS_DISCOVERY_CMD = `(irm https://opencode.ai/inference/v1/models).data | ? id -like "*free*" | select name, id`
export const LINUX_DISCOVERY_CMD = `curl -s https://opencode.ai/inference/v1/models | jq '.data[] | select(.id | ascii_downcase | contains("free")) | {name: .name, id: .id}'`

const PRESET_DISGUISES: Record<
  string,
  {
    name: string
    description: string
    category: CuratedModelDoc["category"]
    badge: string
    enabled: boolean
    sortOrder: number
  }
> = {
  "deepseek-v4.1-flash-free": {
    name: "Sutradhar DeepCoder 4.1",
    description: "High-precision code synthesis, refactoring, and debugging engine",
    category: "coding",
    badge: "Coding Pro",
    enabled: true,
    sortOrder: 1,
  },
  "glm-5.3-flash-free": {
    name: "Sutradhar Velocity 5.3",
    description: "Instant-response multimodal model optimized for rapid iterations and edits",
    category: "fast",
    badge: "Ultra Fast",
    enabled: true,
    sortOrder: 2,
  },
  "nemotron-3.5-super-vl-free": {
    name: "Sutradhar Vision 3.5 VL",
    description: "1M-context multimodal visual and UI inspection model with deep reasoning",
    category: "vision",
    badge: "Vision",
    enabled: true,
    sortOrder: 3,
  },
  "nemotron-3.5-lightning-free": {
    name: "Sutradhar Lightning 3.5",
    description: "High-throughput low-latency reasoning and agentic execution engine",
    category: "fast",
    badge: "Ultra Fast",
    enabled: true,
    sortOrder: 4,
  },
  "mimo-v2.6-flash-free": {
    name: "Sutradhar Omni 2.6",
    description: "Full-spectrum omni model supporting text, image, audio, and video reasoning",
    category: "flagship",
    badge: "Omni",
    enabled: true,
    sortOrder: 5,
  },
  "longcat-2.5-preview-free": {
    name: "Sutradhar Horizon 1M",
    description: "1,000,000-token long-context repository comprehension and architecture specialist",
    category: "reasoning",
    badge: "Long Context",
    enabled: true,
    sortOrder: 6,
  },
  "beam-free": {
    name: "Sutradhar Ultra Beam",
    description: "1M-context flagship reasoning and multi-step software engineering model",
    category: "flagship",
    badge: "Recommended",
    enabled: true,
    sortOrder: 7,
  },
  "space-bunny-free": {
    name: "Sutradhar Nova Multimodal",
    description: "1M-context frontier multimodal reasoning engine with massive 512K output capacity",
    category: "vision",
    badge: "Flagship",
    enabled: true,
    sortOrder: 8,
  },
  "jev-1.13-free": {
    name: "Sutradhar Architect 1.13",
    description: "Specialized autonomous coding and terminal workflow intelligence",
    category: "coding",
    badge: "Code Specialist",
    enabled: true,
    sortOrder: 9,
  },
}

function formatModelIdToTitle(id: string): string {
  return id
    .split("-")
    .map((part) => {
      if (part.toLowerCase() === "vl") return "VL"
      if (/^v\d/i.test(part)) return part.toUpperCase()
      return part.charAt(0).toUpperCase() + part.slice(1)
    })
    .join(" ")
}

function toFirestoreFields(obj: Record<string, any>) {
  const fields: Record<string, any> = {}
  for (const [k, v] of Object.entries(obj)) {
    if (v === undefined || v === null) continue
    if (typeof v === "boolean") fields[k] = { booleanValue: v }
    else if (typeof v === "number") fields[k] = { integerValue: String(Math.trunc(v)) }
    else if (typeof v === "string") fields[k] = { stringValue: v }
  }
  return fields
}

function fromFirestoreFields<T = Record<string, any>>(fields: Record<string, any> | undefined): T {
  const out: Record<string, any> = {}
  if (!fields) return out as T
  for (const [k, val] of Object.entries<any>(fields)) {
    if ("stringValue" in val) out[k] = val.stringValue
    else if ("booleanValue" in val) out[k] = Boolean(val.booleanValue)
    else if ("integerValue" in val) out[k] = Number(val.integerValue)
    else if ("doubleValue" in val) out[k] = Number(val.doubleValue)
  }
  return out as T
}

function generateDefaultDisguise(model: UpstreamModel, index: number): Omit<CuratedModelDoc, "updatedAt"> {
  const preset = PRESET_DISGUISES[model.id]
  const cleanOriginal = model.name.replace(/\s*(?:\(free\)|free)$/i, "").trim()
  const autoDisguisedName = preset?.name ?? `Sutradhar ${cleanOriginal}`
  const autoDescription =
    preset?.description ??
    model.description ??
    `Sutradhar curated ${model.family || "AI"} model for coding and reasoning workflows.`

  return {
    id: model.id,
    enabled: preset ? preset.enabled : true,
    disguisedName: autoDisguisedName,
    disguisedDescription: autoDescription,
    category: preset?.category ?? (model.reasoning ? "reasoning" : "general"),
    badge: preset?.badge ?? (model.reasoning ? "Reasoning" : "Recommended"),
    sortOrder: preset?.sortOrder ?? index + 1,
    upstreamName: model.name,
    upstreamFamily: model.family || model.id.split("-")[0] || "general",
    upstreamContext: model.limit?.context || 200000,
    upstreamOutput: model.limit?.output || 32000,
    reasoning: Boolean(model.reasoning ?? true),
    toolCall: Boolean(model.tool_call ?? true),
    attachment: Boolean(model.attachment ?? true),
  }
}

export interface LiveDiscoveredFreeModel {
  id: string
  name: string | null
}

/**
 * Snatches the live free models directly from https://opencode.ai/inference/v1/models
 * using the platform-appropriate CLI pipeline (PowerShell on Windows, curl+jq on Linux)
 * with native HTTP fallback for serverless containers without jq installed.
 */
export async function fetchLiveInferenceFreeModels(): Promise<{
  models: LiveDiscoveredFreeModel[]
  commandUsed: string
  platform: string
}> {
  const platform = process.platform
  const commandUsed = platform === "win32" ? WINDOWS_DISCOVERY_CMD : LINUX_DISCOVERY_CMD

  try {
    if (platform === "win32") {
      const psCmd = `powershell -NoProfile -Command "(irm https://opencode.ai/inference/v1/models).data | ? id -like '*free*' | select name, id | ConvertTo-Json -Compress"`
      const { stdout } = await execAsync(psCmd, { timeout: 8000 })
      const parsed = JSON.parse(stdout.trim())
      const arr = Array.isArray(parsed) ? parsed : [parsed]
      if (arr.length > 0 && arr[0]?.id) {
        return {
          models: arr.map((x: any) => ({ id: String(x.id), name: x.name ? String(x.name) : null })),
          commandUsed,
          platform,
        }
      }
    } else {
      const shCmd = `curl -s https://opencode.ai/inference/v1/models | jq -c '[.data[] | select(.id | ascii_downcase | contains("free")) | {name: .name, id: .id}]'`
      const { stdout } = await execAsync(shCmd, { timeout: 8000 })
      const parsed = JSON.parse(stdout.trim())
      if (Array.isArray(parsed) && parsed.length > 0) {
        return {
          models: parsed.map((x: any) => ({ id: String(x.id), name: x.name ? String(x.name) : null })),
          commandUsed,
          platform,
        }
      }
    }
  } catch {
    // Fallback to direct HTTP fetch equivalent when shell tools (e.g. jq on Vercel Lambda) are unavailable
  }

  const res = await fetch(UPSTREAM_INFERENCE_MODELS_URL, {
    headers: {
      "User-Agent": "sutradhar-intermediary/1.0",
      Accept: "application/json",
    },
    cache: "no-store",
  })
  if (!res.ok) {
    throw new Error(`Failed to fetch live inference models (${UPSTREAM_INFERENCE_MODELS_URL}): ${res.status}`)
  }
  const data = await res.json()
  const rawList: any[] = Array.isArray(data?.data) ? data.data : []
  const filtered = rawList
    .filter((item) => String(item?.id || "").toLowerCase().includes("free"))
    .map((item) => ({
      id: String(item.id),
      name: item.name ? String(item.name) : null,
    }))

  return {
    models: filtered,
    commandUsed,
    platform,
  }
}

export async function fetchUpstreamCatalog(): Promise<Record<string, any>> {
  const res = await fetch(UPSTREAM_CATALOG_URL, {
    headers: {
      "User-Agent": "sutradhar-intermediary/1.0",
      Accept: "application/json",
    },
    cache: "no-store",
  })
  if (!res.ok) {
    throw new Error(`Failed to fetch upstream catalog: ${res.status}`)
  }
  return await res.json()
}

export function buildSynthesizedCatalogModel(id: string, name?: string | null): UpstreamModel {
  const displayName = name?.trim() || formatModelIdToTitle(id)
  const family = id.split("-")[0] || "opencode"
  return {
    id,
    name: displayName,
    family,
    release_date: "2026-04-01",
    attachment: true,
    reasoning: true,
    temperature: true,
    tool_call: true,
    cost: {
      input: 0,
      output: 0,
      cache_read: 0,
      cache_write: 0,
    },
    limit: {
      context: 200000,
      output: 32000,
    },
    modalities: {
      input: ["text", "image"],
      output: ["text"],
    },
  }
}

/**
 * Combines the live model list from https://opencode.ai/inference/v1/models
 * with capability metadata from https://models.opencode.ai/api.json
 */
export async function fetchActiveFreeOpencodeModels(): Promise<{
  models: UpstreamModel[]
  commandUsed: string
  platform: string
  catalog: Record<string, any>
}> {
  const [liveDiscovery, catalog] = await Promise.all([
    fetchLiveInferenceFreeModels(),
    fetchUpstreamCatalog().catch(() => ({ opencode: { models: {} } })),
  ])

  const catalogModels: Record<string, any> = catalog?.opencode?.models || {}
  const activeModels: UpstreamModel[] = liveDiscovery.models.map((item) => {
    const fromCatalog = catalogModels[item.id]
    if (fromCatalog) {
      return {
        ...fromCatalog,
        id: item.id,
        name: item.name || fromCatalog.name || formatModelIdToTitle(item.id),
        cost: {
          input: 0,
          output: 0,
          cache_read: 0,
          cache_write: 0,
        },
      } as UpstreamModel
    }
    return buildSynthesizedCatalogModel(item.id, item.name)
  })

  return {
    models: activeModels,
    commandUsed: liveDiscovery.commandUsed,
    platform: liveDiscovery.platform,
    catalog,
  }
}

export async function getCuratedModelsFromFirestore(): Promise<CuratedModelDoc[]> {
  const res = await fetch(`${FIRESTORE_BASE}/models?pageSize=200`, {
    cache: "no-store",
  })
  if (!res.ok) return []
  const data = await res.json()
  const docs = data.documents || []
  const list: CuratedModelDoc[] = []
  for (const d of docs) {
    const parsed = fromFirestoreFields<CuratedModelDoc>(d.fields)
    if (parsed && parsed.id) {
      list.push(parsed)
    }
  }
  return list.sort(
    (a, b) => (a.sortOrder ?? 999) - (b.sortOrder ?? 999) || (a.disguisedName || "").localeCompare(b.disguisedName || ""),
  )
}

export async function getAppSettingsFromFirestore(): Promise<AppSettingsDoc> {
  const res = await fetch(`${FIRESTORE_BASE}/settings/config`, {
    cache: "no-store",
  })
  if (res.ok) {
    const data = await res.json()
    if (data.fields) {
      return fromFirestoreFields<AppSettingsDoc>(data.fields)
    }
  }
  return {
    providerName: "Sutradhar",
    lastSync: 0,
    syncCount: 0,
    autoEnableNewModels: true,
  }
}

export async function syncUpstreamToFirestore(): Promise<{
  models: CuratedModelDoc[]
  settings: AppSettingsDoc
  added: number
  removed: number
  total: number
  commandUsed: string
  platform: string
}> {
  const [activeDiscovery, existingDocs, existingSettings] = await Promise.all([
    fetchActiveFreeOpencodeModels(),
    getCuratedModelsFromFirestore(),
    getAppSettingsFromFirestore(),
  ])

  const freeModels = activeDiscovery.models
  const liveIds = new Set(freeModels.map((m) => m.id))
  const existingMap = new Map<string, CuratedModelDoc>()
  for (const item of existingDocs) {
    existingMap.set(item.id, item)
  }

  const now = Date.now()
  const writes: any[] = []
  const mergedList: CuratedModelDoc[] = []
  let added = 0
  let removed = 0

  // Remove any stale models in Firestore that are no longer live in https://opencode.ai/inference/v1/models
  for (const oldDoc of existingDocs) {
    if (!liveIds.has(oldDoc.id)) {
      removed++
      writes.push({
        delete: `projects/${PROJECT_ID}/databases/(default)/documents/models/${oldDoc.id}`,
      })
    }
  }

  freeModels.forEach((upstream, idx) => {
    const prev = existingMap.get(upstream.id)
    const preset = PRESET_DISGUISES[upstream.id]
    let record: CuratedModelDoc & { _verifiedByServer: string }
    if (prev) {
      record = {
        ...prev,
        disguisedName: prev.disguisedName || preset?.name || `Sutradhar ${upstream.name}`,
        disguisedDescription:
          prev.disguisedDescription ||
          preset?.description ||
          `Sutradhar curated ${upstream.family || "AI"} model`,
        category: prev.category || preset?.category || "flagship",
        badge: prev.badge || preset?.badge || "Recommended",
        sortOrder: prev.sortOrder ?? preset?.sortOrder ?? idx + 1,
        upstreamName: upstream.name,
        upstreamFamily: upstream.family || prev.upstreamFamily || "general",
        upstreamContext: upstream.limit?.context || prev.upstreamContext || 200000,
        upstreamOutput: upstream.limit?.output || prev.upstreamOutput || 32000,
        reasoning: Boolean(upstream.reasoning),
        toolCall: Boolean(upstream.tool_call),
        attachment: Boolean(upstream.attachment),
        updatedAt: now,
        _verifiedByServer: SERVER_VERIFIED_TOKEN,
      }
    } else {
      added++
      record = {
        ...generateDefaultDisguise(upstream, idx),
        updatedAt: now,
        _verifiedByServer: SERVER_VERIFIED_TOKEN,
      }
    }

    mergedList.push(record)
    writes.push({
      update: {
        name: `projects/${PROJECT_ID}/databases/(default)/documents/models/${upstream.id}`,
        fields: toFirestoreFields(record),
      },
    })
  })

  const newSettings: AppSettingsDoc & { _verifiedByServer: string } = {
    providerName: existingSettings.providerName || "Sutradhar",
    lastSync: now,
    syncCount: freeModels.length,
    autoEnableNewModels: existingSettings.autoEnableNewModels ?? true,
    _verifiedByServer: SERVER_VERIFIED_TOKEN,
  }

  writes.push({
    update: {
      name: `projects/${PROJECT_ID}/databases/(default)/documents/settings/config`,
      fields: toFirestoreFields(newSettings),
    },
  })

  const commitRes = await fetch(`${FIRESTORE_BASE}:commit`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ writes }),
  })

  if (!commitRes.ok) {
    const errText = await commitRes.text().catch(() => "")
    throw new Error(`Firestore batch commit failed: ${commitRes.status} ${errText}`)
  }

  mergedList.sort(
    (a, b) => (a.sortOrder ?? 999) - (b.sortOrder ?? 999) || (a.disguisedName || "").localeCompare(b.disguisedName || ""),
  )

  return {
    models: mergedList,
    settings: newSettings,
    added,
    removed,
    total: freeModels.length,
    commandUsed: activeDiscovery.commandUsed,
    platform: activeDiscovery.platform,
  }
}

export async function saveCuratedModelsToFirestore(
  models: Partial<CuratedModelDoc>[],
  settings?: Partial<AppSettingsDoc>,
): Promise<{ savedCount: number }> {
  const existingModels = await getCuratedModelsFromFirestore()
  const existingMap = new Map<string, CuratedModelDoc>()
  for (const m of existingModels) {
    existingMap.set(m.id, m)
  }

  const now = Date.now()
  const writes: any[] = []
  let savedCount = 0

  for (const item of models) {
    if (!item.id) continue
    savedCount++
    const prev = existingMap.get(item.id) || ({} as CuratedModelDoc)
    const merged = {
      ...prev,
      ...item,
      updatedAt: now,
      _verifiedByServer: SERVER_VERIFIED_TOKEN,
    }
    writes.push({
      update: {
        name: `projects/${PROJECT_ID}/databases/(default)/documents/models/${item.id}`,
        fields: toFirestoreFields(merged),
      },
    })
  }

  if (settings) {
    const prevSettings = await getAppSettingsFromFirestore()
    const mergedSettings = {
      ...prevSettings,
      ...settings,
      _verifiedByServer: SERVER_VERIFIED_TOKEN,
    }
    writes.push({
      update: {
        name: `projects/${PROJECT_ID}/databases/(default)/documents/settings/config`,
        fields: toFirestoreFields(mergedSettings),
      },
    })
  }

  if (writes.length > 0) {
    const commitRes = await fetch(`${FIRESTORE_BASE}:commit`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ writes }),
    })
    if (!commitRes.ok) {
      throw new Error(`Firestore save failed: ${commitRes.status}`)
    }
  }

  return { savedCount }
}

export async function buildPublicCatalog(): Promise<Record<string, any>> {
  const [activeDiscovery, firestoreModels, settings] = await Promise.all([
    fetchActiveFreeOpencodeModels(),
    getCuratedModelsFromFirestore(),
    getAppSettingsFromFirestore(),
  ])

  const upstreamCatalog = activeDiscovery.catalog
  const liveFreeMap = new Map<string, UpstreamModel>()
  for (const m of activeDiscovery.models) {
    liveFreeMap.set(m.id, m)
  }

  // If Firestore has stale models not matching live /inference/v1/models, auto-sync
  const hasStaleOrMissing =
    firestoreModels.length === 0 ||
    firestoreModels.some((m) => !liveFreeMap.has(m.id)) ||
    activeDiscovery.models.some((m) => !firestoreModels.some((f) => f.id === m.id))

  let activeConfigs = firestoreModels
  if (hasStaleOrMissing) {
    const synced = await syncUpstreamToFirestore()
    activeConfigs = synced.models
  }

  const configMap = new Map<string, CuratedModelDoc>()
  for (const item of activeConfigs) {
    configMap.set(item.id, item)
  }

  const opencodeProvider = upstreamCatalog.opencode || {
    id: "opencode",
    name: settings.providerName || "Sutradhar",
    api: "https://opencode.ai/inference/openai/v1",
    npm: "@ai-sdk/openai-compatible",
    env: ["OPENCODE_API_KEY"],
    models: {},
  }

  const filteredModels: Record<string, any> = {}

  // Keep non-free paid models in catalog for users with paid OpenCode keys
  for (const [modelId, rawModel] of Object.entries<any>(opencodeProvider.models || {})) {
    const isFree = !rawModel.cost || rawModel.cost.input === 0
    if (!isFree) {
      filteredModels[modelId] = rawModel
    }
  }

  // Add enabled live free models from https://opencode.ai/inference/v1/models in admin sortOrder
  const sortedCurated = [...activeConfigs]
    .filter((c) => c.enabled && liveFreeMap.has(c.id))
    .sort((a, b) => (a.sortOrder ?? 999) - (b.sortOrder ?? 999))

  for (const curated of sortedCurated) {
    const baseModel =
      opencodeProvider.models?.[curated.id] ||
      liveFreeMap.get(curated.id) ||
      buildSynthesizedCatalogModel(curated.id, curated.upstreamName)

    filteredModels[curated.id] = {
      ...baseModel,
      id: curated.id,
      name: curated.disguisedName?.trim() || baseModel.name,
      description: curated.disguisedDescription?.trim() || baseModel.description,
      cost: {
        input: 0,
        output: 0,
        cache_read: 0,
        cache_write: 0,
      },
    }
  }

  upstreamCatalog.opencode = {
    ...opencodeProvider,
    name: settings.providerName || "Sutradhar",
    models: filteredModels,
  }

  return upstreamCatalog
}
