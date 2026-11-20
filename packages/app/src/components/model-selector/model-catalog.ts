import { matchesModelSearch } from "../dialog-select-model-search"

export interface ModelCatalogItem {
  readonly id: string
  readonly name: string
  readonly family?: string
  readonly description?: string
  readonly latest?: boolean
  readonly release_date?: string
  readonly provider: {
    readonly id: string
    readonly name: string
  }
  readonly limit?: {
    readonly context: number
  }
  readonly cost?: {
    readonly input: number
  }
  readonly capabilities?: {
    readonly reasoning?: boolean
    readonly input?: {
      readonly text: boolean
      readonly image: boolean
      readonly audio: boolean
      readonly video: boolean
      readonly pdf: boolean
    }
  }
  readonly modalities?: {
    readonly input: Array<string>
  }
  readonly reasoning?: boolean
}

export interface ModelCatalogGroup<T extends ModelCatalogItem = ModelCatalogItem> {
  readonly id: string
  readonly label: string
  readonly isDeepSeek: boolean
  readonly items: T[]
}

export interface ModelCatalogResult<T extends ModelCatalogItem = ModelCatalogItem> {
  readonly groups: ModelCatalogGroup<T>[]
  readonly recent: T[]
  readonly flat: Array<{ section: "recent" | "group"; groupId: string; item: T }>
  readonly totalCount: number
}

const PROVIDER_ORDER = ["sutradhar", "anthropic", "openai", "google", "openrouter", "vercel"]
const HIDDEN_PROVIDERS = new Set(["deepseek", "coarena"])

export function modelCatalogKey(item: { providerID: string; modelID: string } | ModelCatalogItem) {
  if ("provider" in item) return `${item.provider.id}:${item.id}`
  return `${item.providerID}:${item.modelID}`
}

export function formatContextWindow(tokens?: number): string {
  if (!tokens || tokens <= 0) return ""
  if (tokens >= 1_000_000) {
    const millions = Math.round((tokens / 1_048_576) * 10) / 10
    const clean = Number.isInteger(millions) ? String(millions) : String(Math.round(tokens / 1_000_000))
    return `${clean}M`
  }
  if (tokens >= 1024) return `${Math.round(tokens / 1024)}K`
  return String(tokens)
}

export function isReasoningModel(item: ModelCatalogItem): boolean {
  if (item.capabilities?.reasoning) return true
  if (item.reasoning) return true
  return /reason|thinking|\br1\b|v4-pro|flash/i.test(`${item.id} ${item.family ?? ""}`)
}

function providerRank(id: string): number {
  const idx = PROVIDER_ORDER.indexOf(id)
  if (idx !== -1) return idx
  return PROVIDER_ORDER.length + 100
}

function compareProviderGroups(a: { id: string; label: string }, b: { id: string; label: string }): number {
  const rankDiff = providerRank(a.id) - providerRank(b.id)
  if (rankDiff !== 0) return rankDiff
  return a.label.localeCompare(b.label)
}

function compareModelsWithinGroup(_providerID: string, a: ModelCatalogItem, b: ModelCatalogItem): number {
  return a.name.localeCompare(b.name)
}

export function buildModelCatalog<T extends ModelCatalogItem>(input: {
  readonly items: readonly T[]
  readonly recent?: readonly T[]
  readonly visible?: (key: { providerID: string; modelID: string }) => boolean
  readonly providerFilter?: string
  readonly query?: string
  readonly includeHiddenOnSearch?: boolean
}): ModelCatalogResult<T> {
  const query = (input.query ?? "").trim()
  const searching = query.length > 0
  const allowHidden = searching && input.includeHiddenOnSearch !== false
  const deduped = new Map<string, T>()

  for (const item of input.items) {
    if (HIDDEN_PROVIDERS.has(item.provider.id)) continue
    if (input.providerFilter && item.provider.id !== input.providerFilter) continue
    const key = modelCatalogKey(item)
    if (deduped.has(key)) continue
    if (!allowHidden && input.visible && !input.visible({ providerID: item.provider.id, modelID: item.id })) {
      continue
    }
    if (
      searching &&
      !matchesModelSearch(query, [item.name, item.id, item.provider.name, item.provider.id, item.family ?? ""])
    ) {
      continue
    }
    deduped.set(key, item)
  }

  const byProvider = new Map<string, { label: string; items: T[] }>()
  for (const item of deduped.values()) {
    const group = byProvider.get(item.provider.id)
    if (group) {
      group.items.push(item)
      continue
    }
    byProvider.set(item.provider.id, {
      label: item.provider.name || item.provider.id,
      items: [item],
    })
  }

  const groups: ModelCatalogGroup<T>[] = Array.from(byProvider.entries())
    .map(([id, entry]) => ({
      id,
      label: entry.label,
      isDeepSeek: false,
      items: entry.items.slice().sort((a, b) => compareModelsWithinGroup(id, a, b)),
    }))
    .sort(compareProviderGroups)

  const recentList: T[] = []
  if (!searching && !input.providerFilter && input.recent?.length) {
    const seenRecent = new Set<string>()
    for (const candidate of input.recent) {
      const key = modelCatalogKey(candidate)
      if (seenRecent.has(key)) continue
      const live = deduped.get(key)
      if (!live) continue
      seenRecent.add(key)
      recentList.push(live)
      if (recentList.length >= 3) break
    }
  }

  const flat: Array<{ section: "recent" | "group"; groupId: string; item: T }> = []
  for (const item of recentList) {
    flat.push({ section: "recent", groupId: "__recent__", item })
  }
  for (const group of groups) {
    for (const item of group.items) {
      flat.push({ section: "group", groupId: group.id, item })
    }
  }

  return {
    groups,
    recent: recentList,
    flat,
    totalCount: deduped.size,
  }
}
