import { readFile, writeFile, mkdir } from "fs/promises"
import path from "path"
import { Duration, Effect, Schedule, Semaphore } from "effect"
import type { Scope } from "effect"
import { define } from "@sutradhar/plugin/v2/effect/plugin"
import { Global } from "../../global"
import { Integration } from "../../integration"
import { ModelV2 } from "../../model"
import { ProviderV2 } from "../../provider"

const DEFAULT_ADMIN_URL = "https://sutradhar-admin.vercel.app"
const LOCAL_ADMIN_URL = "http://127.0.0.1:3099"
const SUTRADHAR_INTEGRATION_ID = Integration.ID.make("sutradhar")

export interface AdminCuratedModel {
  readonly id: string
  readonly bgModelId?: string
  readonly enabled?: boolean
  readonly disguisedName?: string
  readonly disguisedDescription?: string
  readonly systemPrompt?: string
  readonly instructions?: string
  readonly upstreamName?: string
  readonly upstreamFamily?: string
  readonly upstreamContext?: number
  readonly upstreamOutput?: number
  readonly reasoning?: boolean
  readonly toolCall?: boolean
  readonly attachment?: boolean
  readonly updatedAt?: number
}

export interface AdminModelsPayload {
  readonly version: number
  readonly providerName: string
  readonly proxyUrl: string
  readonly models: readonly AdminCuratedModel[]
}

let cachedAdminBase: { url: string; checkedAt: number } | undefined
let cachedCatalog: { expiresAt: number; payload: AdminModelsPayload } | undefined
let inflightFetch: Promise<AdminModelsPayload | undefined> | undefined

async function resolveAdminBase(): Promise<string> {
  const configured = process.env.SUTRADHAR_ADMIN_URL?.trim().replace(/\/+$/, "")
  if (configured) return configured

  const now = Date.now()
  if (cachedAdminBase && now - cachedAdminBase.checkedAt < 30_000) {
    return cachedAdminBase.url
  }

  const reachable = await fetch(`${LOCAL_ADMIN_URL}/api/models`, {
    method: "OPTIONS",
    signal: AbortSignal.timeout(350),
  })
    .then((res) => res.ok || res.status < 500)
    .catch(() => false)

  const resolved = reachable ? LOCAL_ADMIN_URL : DEFAULT_ADMIN_URL
  cachedAdminBase = { url: resolved, checkedAt: now }
  return resolved
}

function cacheFilePath() {
  return path.join(Global.Path.cache, "sutradhar-admin-models.json")
}

async function readOfflineCache(): Promise<AdminModelsPayload | undefined> {
  const raw = await readFile(cacheFilePath(), "utf8").catch(() => undefined)
  if (!raw) return undefined
  try {
    const parsed = JSON.parse(raw) as AdminModelsPayload
    if (!parsed || !Array.isArray(parsed.models)) return undefined
    return parsed
  } catch {
    return undefined
  }
}

async function writeOfflineCache(payload: AdminModelsPayload): Promise<void> {
  await mkdir(Global.Path.cache, { recursive: true }).catch(() => undefined)
  await writeFile(cacheFilePath(), JSON.stringify(payload), "utf8").catch(() => undefined)
}

export async function fetchAdminCatalogState(force = false): Promise<AdminModelsPayload | undefined> {
  if ((process.env.SUTRADHAR_TEST_HOME || process.env.NODE_ENV === "test") && !process.env.SUTRADHAR_ADMIN_URL) {
    return undefined
  }

  const now = Date.now()
  if (!force && cachedCatalog && now < cachedCatalog.expiresAt) {
    return cachedCatalog.payload
  }
  if (inflightFetch) return inflightFetch

  inflightFetch = (async () => {
    const adminBase = await resolveAdminBase()
    const res = await fetch(`${adminBase}/api/models?t=${Date.now()}`, {
      headers: { Accept: "application/json" },
      cache: "no-store",
      signal: AbortSignal.timeout(8_000),
    }).catch(() => undefined)

    if (res?.ok) {
      const data = (await res.json().catch(() => undefined)) as
        | {
            version?: number
            models?: AdminCuratedModel[]
            settings?: { providerName?: string }
            gateway?: { providerName?: string; proxyUrl?: string }
            discovery?: { proxyUrl?: string }
          }
        | undefined
      if (data && Array.isArray(data.models)) {
        const enabled = data.models.filter((m) => Boolean(m?.id) && m.enabled !== false)
        const rawName = data.gateway?.providerName || data.settings?.providerName || "Sutradhar"
        const providerName = rawName.toLowerCase() === "deepseek" || rawName.toLowerCase() === "coarena" ? "Sutradhar" : rawName
        const proxyUrl = (data.gateway?.proxyUrl || data.discovery?.proxyUrl || `${adminBase}/api/deepseek/v1`).replace(/\/+$/, "")
        const payload: AdminModelsPayload = {
          version: Number(data.version || Date.now()),
          providerName,
          proxyUrl,
          models: enabled,
        }
        cachedCatalog = { expiresAt: Date.now() + 10_000, payload }
        await writeOfflineCache(payload)
        return payload
      }
    }

    const offline = await readOfflineCache()
    if (offline) {
      cachedCatalog = { expiresAt: Date.now() + 10_000, payload: offline }
    }
    return offline
  })().finally(() => {
    inflightFetch = undefined
  })

  return inflightFetch
}

export const SutradharPlugin = define<Scope.Scope>({
  id: "sutradhar-admin-catalog",
  effect: Effect.fn(function* (ctx) {
    const loading = Semaphore.makeUnsafe(1)
    let state: AdminModelsPayload | undefined

    const load = Effect.fn("SutradharPlugin.load")(function* () {
      const next = yield* Effect.promise(() => fetchAdminCatalogState())
      if (!next) return false
      const prevKey = state ? `${state.version}:${state.providerName}:${state.models.map((m) => `${m.id}:${m.disguisedName}`).join(",")}` : ""
      const nextKey = `${next.version}:${next.providerName}:${next.models.map((m) => `${m.id}:${m.disguisedName}`).join(",")}`
      state = next
      return prevKey !== nextKey
    })

    yield* ctx.integration.transform((draft) => {
      draft.update(SUTRADHAR_INTEGRATION_ID, (integration) => {
        integration.name = "Sutradhar"
      })
    })

    yield* ctx.catalog.transform((catalog) => {
      for (const hidden of ["deepseek", "coarena"]) {
        const id = ProviderV2.ID.make(hidden)
        if (catalog.provider.get(id)) {
          catalog.provider.update(id, (provider) => {
            provider.disabled = true
          })
        }
      }

      if (!state) return
      const active = state

      catalog.provider.update(ProviderV2.ID.sutradhar, (provider) => {
        provider.integrationID = SUTRADHAR_INTEGRATION_ID
        provider.name = active.providerName || "Sutradhar"
        provider.api = { type: "aisdk", package: "@ai-sdk/openai-compatible", url: active.proxyUrl }
        provider.request.body.apiKey = "sutradhar-managed"
        provider.disabled = false
      })

      for (const item of active.models) {
        const modelID = ModelV2.ID.make(item.id)
        const prompt = (item.systemPrompt || item.instructions || "").trim()
        catalog.model.update(ProviderV2.ID.sutradhar, modelID, (model) => {
          model.name = item.disguisedName?.trim() || item.upstreamName?.trim() || item.id
          model.family = item.upstreamFamily || "sutradhar"
          model.api = {
            type: "aisdk",
            package: "@ai-sdk/openai-compatible",
            id: item.id,
            url: active.proxyUrl,
          }
          model.capabilities = {
            tools: item.toolCall ?? true,
            input: item.attachment ? ["text", "image"] : ["text"],
            output: ["text"],
          }
          model.limit = {
            context: item.upstreamContext || 128_000,
            output: item.upstreamOutput || 16_384,
          }
          model.cost = [{ input: 0, output: 0, cache: { read: 0, write: 0 } }]
          model.status = "active"
          model.enabled = true
          model.request.body.apiKey = "sutradhar-managed"
          if (prompt) {
            model.request.body.instructions = prompt
          }
        })
      }

      if (!catalog.model.default.get() && active.models.length > 0) {
        catalog.model.default.set(ProviderV2.ID.sutradhar, ModelV2.ID.make(active.models[0].id))
      }
    })

    const refresh = () =>
      loading.withPermit(
        load().pipe(
          Effect.flatMap((changed) => (changed ? ctx.catalog.reload() : Effect.void)),
        ),
      )

    yield* refresh().pipe(Effect.forkScoped)

    const pollEnabled =
      Boolean(process.env.SUTRADHAR_ADMIN_URL) ||
      (!process.env.SUTRADHAR_TEST_HOME && process.env.NODE_ENV !== "test")
    if (pollEnabled) {
      yield* refresh().pipe(Effect.repeat(Schedule.spaced(Duration.seconds(20))), Effect.ignore, Effect.forkScoped)
    }
  }),
})
