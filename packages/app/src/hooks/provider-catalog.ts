import type { NormalizedProviderListResponse } from "@sutradhar/session-ui/context"

export const popularProviders = [
  "sutradhar",
  "anthropic",
  "github-copilot",
  "openai",
  "google",
  "openrouter",
  "vercel",
]

export const isFreeModelProvider = (_providerID: string) => false

export const isFreeModel = (providerID: string, cost: { input: number } | undefined) =>
  isFreeModelProvider(providerID) && (!cost || cost.input === 0)

const emptyProviderCatalog: NormalizedProviderListResponse = { all: new Map(), connected: [], default: {} }

type DirectoryCatalog = {
  ready: boolean
  providers: NormalizedProviderListResponse
}

type ProviderCatalogInput =
  | {
      explicit: true
      directory?: string
      catalog?: DirectoryCatalog
    }
  | {
      explicit: false
      directory?: string
      catalog?: DirectoryCatalog
      global: NormalizedProviderListResponse
    }

export function selectProviderCatalog(input: ProviderCatalogInput) {
  if (input.directory && input.catalog?.ready) return input.catalog.providers
  if (input.explicit) return emptyProviderCatalog
  return input.global
}

export function resolveDefaultModel(
  current: NormalizedProviderListResponse["defaultModel"],
  legacy: string | undefined,
) {
  if (current !== undefined) return current ?? undefined
  if (!legacy) return undefined
  const [providerID, modelID] = legacy.split("/")
  return { providerID, modelID }
}
