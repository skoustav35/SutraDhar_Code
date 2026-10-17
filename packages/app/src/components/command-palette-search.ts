import { createEffect, createMemo, createResource } from "solid-js"
import { createStore } from "solid-js/store"
import type { CommandPaletteEntry } from "./command-palette"

export type PaletteScope = "all" | CommandPaletteEntry["type"]

// Group once, then use that same order for both rendering and keyboard navigation.
export function groupPaletteEntries(entries: CommandPaletteEntry[], scope: PaletteScope) {
  const seen = new Set<string>()
  const groups = new Map<string, CommandPaletteEntry[]>()
  for (const entry of entries) {
    if (seen.has(entry.id) || (scope !== "all" && entry.type !== scope)) continue
    seen.add(entry.id)
    const group = groups.get(entry.category)
    if (group) group.push(entry)
    else groups.set(entry.category, [entry])
  }
  return Array.from(groups, ([category, entries]) => ({ category, entries }))
}

export function paletteMatchSegments(text: string, query: string) {
  const value = query.trim()
  if (!value) return [{ text, match: false }]
  const pattern = new RegExp(value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "gi")
  const segments: { text: string; match: boolean }[] = []
  let offset = 0
  for (const match of text.matchAll(pattern)) {
    const index = match.index!
    if (index > offset) segments.push({ text: text.slice(offset, index), match: false })
    segments.push({ text: match[0], match: true })
    offset = index + match[0].length
  }
  if (offset < text.length) segments.push({ text: text.slice(offset), match: false })
  return segments
}

export function createPaletteSearch(load: (query: string) => CommandPaletteEntry[] | Promise<CommandPaletteEntry[]>) {
  const [state, setState] = createStore({ query: "", scope: "all" as PaletteScope, active: 0 })
  const [result, { refetch }] = createResource(
    () => state.query,
    async (query) => {
      try {
        return { entries: await load(query), failed: false }
      } catch {
        // Do not send provider errors or private paths to the UI/error boundary.
        return { entries: [] as CommandPaletteEntry[], failed: true }
      }
    },
    { initialValue: { entries: [] as CommandPaletteEntry[], failed: false } },
  )
  const groups = createMemo(() => groupPaletteEntries(result.latest.entries, state.scope))
  const entries = createMemo(() => groups().flatMap((group) => group.entries))
  const active = createMemo(() => entries()[state.active])

  createEffect(() => {
    entries()
    setState("active", 0)
  })

  return {
    state,
    groups,
    entries,
    active,
    loading: () => result.loading,
    failed: () => !result.loading && result.latest.failed,
    retry: () => void refetch(),
    search: (query: string) => setState({ query, active: 0 }),
    scope: (scope: PaletteScope) => setState({ scope, active: 0 }),
    activate: (id: string) =>
      setState(
        "active",
        entries().findIndex((entry) => entry.id === id),
      ),
    move: (delta: -1 | 1) => {
      const count = entries().length
      if (!count || result.loading) return
      setState("active", (index) => (index + delta + count) % count)
    },
    // Stale results remain visible while typing, but must never be opened by accident.
    selection: () => (result.loading ? undefined : active()),
  }
}
