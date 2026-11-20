import { useServerSync } from "@/context/server-sync"
import { decode64 } from "@/utils/base64"
import { useParams } from "@solidjs/router"
import { Iterable, pipe } from "effect"
import { createEffect, createMemo, type Accessor } from "solid-js"
import {
  isFreeModel,
  isFreeModelProvider,
  popularProviders,
  selectProviderCatalog,
} from "./provider-catalog"

export { isFreeModel, isFreeModelProvider, popularProviders }
const popularProviderSet = new Set(popularProviders)

export function useProviders(directory: Accessor<string | undefined>) {
  const serverSync = useServerSync()
  const params = useParams()
  const dir = () => (directory ? directory() : decode64(params.dir))
  const raw = () => {
    const value = dir()
    const projectStore = value ? serverSync().child(value)[0] : undefined
    if (value) {
      const scoped = selectProviderCatalog({
        explicit: true,
        directory: value,
        catalog: projectStore && { ready: projectStore.provider_ready, providers: projectStore.provider },
      })
      if (scoped.all.size > 0) return scoped
      const global = serverSync().data.provider
      if (global.all.size > 0) return global
      return scoped
    }
    return selectProviderCatalog({
      explicit: false,
      directory: value,
      catalog: projectStore && { ready: projectStore.provider_ready, providers: projectStore.provider },
      global: serverSync().data.provider,
    })
  }
  const providers = () => raw()


  return {
    all: () => providers().all,
    default: () => providers().default,
    defaultModel: () => providers().defaultModel,
    popular: () =>
      pipe(
        providers().all,
        Iterable.map(([, p]) => p),
        Iterable.filter((p) => popularProviderSet.has(p.id)),
        (v) => Array.from(v),
      ),
    connected: () => {
      const connected = new Set(providers().connected)
      return pipe(
        providers().all,
        Iterable.map(([, p]) => p),
        Iterable.filter((p) => connected.has(p.id)),
        (v) => Array.from(v),
      )
    },
    paid: () => {
      const connected = new Set(providers().connected)
      const paid = [
        ...Iterable.filter(
          providers().all,
          ([id]) =>
            connected.has(id) &&
            (!isFreeModelProvider(id) || Object.values(providers().all.get(id)?.models ?? {}).some((m) => m.cost?.input)),
        ),
      ]
      return paid
    },
  }
}
