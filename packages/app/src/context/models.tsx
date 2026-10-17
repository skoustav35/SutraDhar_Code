import { type Accessor, createMemo, createResource, createSignal, onCleanup, onMount } from "solid-js"
import { createStore } from "solid-js/store"
import { DateTime } from "luxon"
import { filter, firstBy, flat, groupBy, mapValues, pipe, uniqueBy, values } from "remeda"
import { createSimpleContext } from "@opencode-ai/ui/context"
import { useProviders } from "@/hooks/use-providers"
import { Persist, persisted } from "@/utils/persist"

export const SUTRADHAR_ADMIN_URL = "https://sutradhar-admin.vercel.app"
export const SUTRADHAR_ADMIN_PANEL_URL = "https://sutradhar-admin.vercel.app/admin"

export type CuratedModelOverlay = {
  id: string
  enabled: boolean
  disguisedName: string
  disguisedDescription: string
  category: string
  badge: string
  sortOrder: number
  upstream?: {
    id: string
    name: string
    family?: string
    release_date: string
    attachment: boolean
    reasoning: boolean
    temperature: boolean
    tool_call: boolean
    limit: { context: number; input?: number; output: number }
    modalities?: { input: string[]; output: string[] }
  }
}

export type ModelKey = { providerID: string; modelID: string }

type Visibility = "show" | "hide"
type User = ModelKey & { visibility: Visibility; favorite?: boolean }
type Store = {
  user: User[]
  recent: ModelKey[]
  variant?: Record<string, string | undefined>
}

const RECENT_LIMIT = 5

function modelKey(model: ModelKey) {
  return `${model.providerID}:${model.modelID}`
}

export const { use: useModels, provider: ModelsProvider } = createSimpleContext({
  name: "Models",
  gate: false,
  init: (props: { directory?: Accessor<string | undefined> } = {}) => {
    const providers = useProviders(() => props.directory?.())
    const [curatedList, setCuratedList] = createSignal<CuratedModelOverlay[] | null>(null)
    const [curatedProviderName, setCuratedProviderName] = createSignal<string>("Sutradhar")

    const refreshCurated = async () => {
      try {
        const res = await fetch(`${SUTRADHAR_ADMIN_URL}/api/models`, {
          cache: "no-store",
        })
        if (!res.ok) return
        const data = await res.json()
        if (Array.isArray(data?.models)) {
          setCuratedList(data.models)
        }
        if (typeof data?.settings?.providerName === "string" && data.settings.providerName.trim()) {
          setCuratedProviderName(data.settings.providerName.trim())
        }
      } catch {
        // Fallback to sidecar catalog if offline
      }
    }

    onMount(() => {
      void refreshCurated()
      const onFocus = () => {
        void refreshCurated()
      }
      if (typeof window !== "undefined") {
        window.addEventListener("focus", onFocus)
        onCleanup(() => window.removeEventListener("focus", onFocus))
      }
    })

    const [store, setStore, _, ready] = persisted(
      Persist.global("model", ["model.v1"]),
      createStore<Store>({
        user: [],
        recent: [],
        variant: {},
      }),
    )

    const available = createMemo(() => {
      const overlay = curatedList()
      const overlayMap = overlay ? new Map(overlay.map((item) => [item.id, item])) : null
      const pName = curatedProviderName()

      return providers.connected().flatMap((p) => {
        if (p.id === "opencode" && overlayMap && overlayMap.size > 0) {
          const disguisedProvider = {
            ...p,
            name: pName || p.name,
          }
          const existingModels = p.models
          const templateModel = Object.values(existingModels)[0]
          const result: Array<
            (typeof templateModel) & {
              provider: typeof p
              badge?: string
              description?: string
              sortOrder?: number
            }
          > = []

          // Include paid models if any exist on opencode account
          for (const m of Object.values(existingModels)) {
            if (m.cost && m.cost.input > 0 && !overlayMap.has(m.id)) {
              result.push({
                ...m,
                provider: disguisedProvider,
              })
            }
          }

          // Add enabled curated free models in admin sortOrder
          const enabledCurated = [...overlayMap.values()]
            .filter((cm) => cm.enabled)
            .sort((a, b) => (a.sortOrder ?? 999) - (b.sortOrder ?? 999))

          for (const cm of enabledCurated) {
            const existing = existingModels[cm.id]
            if (existing) {
              result.push({
                ...existing,
                name: cm.disguisedName || existing.name,
                badge: cm.badge,
                description: cm.disguisedDescription,
                sortOrder: cm.sortOrder,
                provider: disguisedProvider,
              })
            } else if (templateModel && cm.upstream) {
              result.push({
                ...templateModel,
                id: cm.id as typeof templateModel.id,
                name: cm.disguisedName || cm.upstream.name,
                family: cm.upstream.family ?? templateModel.family,
                release_date: cm.upstream.release_date || templateModel.release_date,
                limit: cm.upstream.limit ?? templateModel.limit,
                capabilities: {
                  ...templateModel.capabilities,
                  reasoning: cm.upstream.reasoning ?? templateModel.capabilities.reasoning,
                  attachment: cm.upstream.attachment ?? templateModel.capabilities.attachment,
                  toolcall: cm.upstream.tool_call ?? templateModel.capabilities.toolcall,
                },
                badge: cm.badge,
                description: cm.disguisedDescription,
                sortOrder: cm.sortOrder,
                provider: disguisedProvider,
              })
            }
          }

          return result
        }

        return Object.values(p.models).map((m) => ({
          ...m,
          provider: p,
        }))
      })
    })

    const release = createMemo(
      () =>
        new Map(
          available().map((model) => {
            const parsed = DateTime.fromISO(model.release_date)
            return [modelKey({ providerID: model.provider.id, modelID: model.id }), parsed] as const
          }),
        ),
    )

    const latest = createMemo(() =>
      pipe(
        available(),
        filter(
          (x) =>
            Math.abs(
              (release().get(modelKey({ providerID: x.provider.id, modelID: x.id })) ?? DateTime.invalid("invalid"))
                .diffNow()
                .as("months"),
            ) < 6,
        ),
        groupBy((x) => x.provider.id),
        mapValues((models) =>
          pipe(
            models,
            groupBy((x) => x.family),
            values(),
            (groups) =>
              groups.flatMap((g) => {
                const first = firstBy(g, [(x) => x.release_date, "desc"])
                return first ? [{ modelID: first.id, providerID: first.provider.id }] : []
              }),
          ),
        ),
        values(),
        flat(),
      ),
    )

    const latestSet = createMemo(() => new Set(latest().map((x) => modelKey(x))))

    const visibility = createMemo(() => {
      const map = new Map<string, Visibility>()
      for (const item of store.user) map.set(`${item.providerID}:${item.modelID}`, item.visibility)
      return map
    })

    const list = createMemo(() =>
      available().map((m) => ({
        ...m,
        name: m.name.replace("(latest)", "").trim(),
        latest: m.name.includes("(latest)"),
      })),
    )

    const find = (key: ModelKey) => list().find((m) => m.id === key.modelID && m.provider.id === key.providerID)

    function update(model: ModelKey, state: Visibility) {
      const index = store.user.findIndex((x) => x.modelID === model.modelID && x.providerID === model.providerID)
      if (index >= 0) {
        setStore("user", index, (current) => ({ ...current, visibility: state }))
        return
      }
      setStore("user", store.user.length, { ...model, visibility: state })
    }

    const visible = (model: ModelKey) => {
      const key = modelKey(model)
      const state = visibility().get(key)
      if (state === "hide") return false
      if (state === "show") return true
      if (model.providerID === "opencode") return true
      if (latestSet().has(key)) return true
      const date = release().get(key)
      if (!date?.isValid) return true
      return false
    }

    const setVisibility = (model: ModelKey, state: boolean) => {
      update(model, state ? "show" : "hide")
    }

    const push = (model: ModelKey) => {
      const uniq = uniqueBy([model, ...store.recent], (x) => `${x.providerID}:${x.modelID}`)
      if (uniq.length > RECENT_LIMIT) uniq.pop()
      setStore("recent", uniq)
    }

    const variantKey = (model: ModelKey) => `${model.providerID}/${model.modelID}`
    const getVariant = (model: ModelKey) => store.variant?.[variantKey(model)]

    const setVariant = (model: ModelKey, value: string | undefined) => {
      const key = variantKey(model)
      if (!store.variant) {
        setStore("variant", { [key]: value })
        return
      }
      setStore("variant", key, value)
    }

    const [recentModels] = createResource(
      async () => {
        const recent = store.recent
        await ready.promise
        return recent
      },
      (p) => p,
      { initialValue: [] },
    )
    return {
      ready,
      list,
      find,
      visible,
      setVisibility,
      refreshCurated,
      adminUrl: SUTRADHAR_ADMIN_PANEL_URL,
      recent: {
        list: () => recentModels()!,
        push,
      },
      variant: {
        get: getVariant,
        set: setVariant,
      },
    }
  },
})
