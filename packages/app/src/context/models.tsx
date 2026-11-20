import { type Accessor, createMemo, createResource } from "solid-js"
import { createStore } from "solid-js/store"
import { uniqueBy } from "remeda"
import { createSimpleContext } from "@sutradhar/ui/context"
import { useProviders } from "@/hooks/use-providers"
import { Persist, persisted } from "@/utils/persist"

export type ModelKey = { providerID: string; modelID: string }

type Visibility = "show" | "hide"
type Store = {
  user: User[]
  recent: ModelKey[]
  variant?: Record<string, string | undefined>
}
type User = ModelKey & { visibility: Visibility; favorite?: boolean }

const RECENT_LIMIT = 5

function modelKey(model: ModelKey) {
  return `${model.providerID}:${model.modelID}`
}

export const { use: useModels, provider: ModelsProvider } = createSimpleContext({
  name: "Models",
  gate: false,
  init: (props: { directory?: Accessor<string | undefined> } = {}) => {
    const providers = useProviders(() => props.directory?.())

    const [store, setStore, _, ready] = persisted(
      Persist.global("model", ["model.v1"]),
      createStore<Store>({
        user: [],
        recent: [],
        variant: {},
      }),
    )

    const available = createMemo(() => {
      const hidden = new Set(["deepseek", "coarena"])
      const connectedList = providers.connected().filter((p) => !hidden.has(p.id))
      const providerList =
        connectedList.length > 0
          ? connectedList
          : Array.from(providers.all().values()).filter((p) => p.id === "sutradhar")

      return providerList.flatMap((p) =>
        Object.values(p.models ?? {}).map((m) => ({
          ...m,
          provider: p,
        })),
      )
    })

    const visibility = createMemo(() => {
      const map = new Map<string, Visibility>()
      for (const item of store.user ?? []) map.set(`${item.providerID}:${item.modelID}`, item.visibility)
      return map
    })

    const list = createMemo(() =>
      (available() ?? []).map((m) => ({
        ...m,
        name: m.name.replace("(latest)", "").trim(),
        latest: m.name.includes("(latest)"),
      })),
    )

    const find = (key: ModelKey) => list().find((m) => m.id === key.modelID && m.provider.id === key.providerID)

    function update(model: ModelKey, state: Visibility) {
      const user = store.user ?? []
      const index = user.findIndex((x) => x.modelID === model.modelID && x.providerID === model.providerID)
      if (index >= 0) {
        setStore("user", index, (current) => ({ ...current, visibility: state }))
        return
      }
      setStore("user", user.length, { ...model, visibility: state })
    }

    const visible = (model: ModelKey) => {
      const state = visibility().get(modelKey(model))
      if (state === "hide") return false
      return true
    }

    const setVisibility = (model: ModelKey, state: boolean) => {
      update(model, state ? "show" : "hide")
    }

    const push = (model: ModelKey) => {
      const uniq = uniqueBy([model, ...(store.recent ?? [])], (x) => `${x.providerID}:${x.modelID}`)
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
        const recent = store.recent ?? []
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
      recent: {
        list: () => recentModels() ?? [],
        push,
      },
      variant: {
        get: getVariant,
        set: setVariant,
      },
    }
  },
})
