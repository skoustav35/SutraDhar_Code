import { describe, expect, test } from "bun:test"
import { createRoot } from "solid-js"
import type { CommandPaletteEntry } from "@/components/command-palette"
import { createPaletteSearch, groupPaletteEntries, paletteMatchSegments } from "@/components/command-palette-search"

const command: CommandPaletteEntry = { id: "command:new", type: "command", title: "New session", category: "Commands" }
const file: CommandPaletteEntry = { id: "file:app.tsx", type: "file", title: "app.tsx", category: "Files" }
const session: CommandPaletteEntry = { id: "session:1", type: "session", title: "Search polish", category: "Sessions" }
const nextCommand = { ...command, id: "command:terminal", title: "Toggle terminal" }

function deferred<T>() {
  let resolve!: (value: T) => void
  const promise = new Promise<T>((yes) => {
    resolve = yes
  })
  return { promise, resolve }
}

const settle = () => new Promise<void>((resolve) => setTimeout(resolve, 0))

describe("search island results", () => {
  test("deduplicates and navigates in visual group order", () => {
    const groups = groupPaletteEntries([command, file, nextCommand, command, session], "all")
    expect(groups.map((group) => group.category)).toEqual(["Commands", "Files", "Sessions"])
    expect(groups.flatMap((group) => group.entries).map((entry) => entry.id)).toEqual([
      command.id,
      nextCommand.id,
      file.id,
      session.id,
    ])
    expect(groupPaletteEntries([command, file, session], "file")).toEqual([{ category: "Files", entries: [file] }])
  })

  test("highlights literal matches without interpreting regex or markup", () => {
    expect(paletteMatchSegments("src/[app].tsx", "[app]")).toEqual([
      { text: "src/", match: false },
      { text: "[app]", match: true },
      { text: ".tsx", match: false },
    ])
    expect(paletteMatchSegments("Search search", " search ")).toEqual([
      { text: "Search", match: true },
      { text: " ", match: false },
      { text: "search", match: true },
    ])
    expect(paletteMatchSegments("<script>", "<script>")).toEqual([{ text: "<script>", match: true }])
    expect(
      paletteMatchSegments("مرحبا app.tsx", "app")
        .map((part) => part.text)
        .join(""),
    ).toBe("مرحبا app.tsx")
    expect(paletteMatchSegments("app.tsx", " ")).toEqual([{ text: "app.tsx", match: false }])
  })

  test("wraps keyboard navigation and resets selection when scope changes", async () => {
    let dispose!: () => void
    const search = createRoot((cleanup) => {
      dispose = cleanup
      return createPaletteSearch(() => [command, file, nextCommand])
    })
    try {
      await settle()
      expect(search.selection()?.id).toBe(command.id)
      search.move(-1)
      expect(search.selection()?.id).toBe(file.id)
      search.move(1)
      expect(search.selection()?.id).toBe(command.id)
      search.move(1)
      expect(search.selection()?.id).toBe(nextCommand.id)
      search.scope("file")
      expect(search.selection()?.id).toBe(file.id)
      search.scope("session")
      expect(search.entries()).toEqual([])
      search.move(1)
      expect(search.selection()).toBeUndefined()
    } finally {
      dispose()
    }
  })
  test("keeps stale results visible but prevents opening them while a newer query loads", async () => {
    const first = deferred<CommandPaletteEntry[]>()
    const second = deferred<CommandPaletteEntry[]>()
    let dispose!: () => void
    const search = createRoot((cleanup) => {
      dispose = cleanup
      return createPaletteSearch((query) =>
        query === "first" ? first.promise : query === "second" ? second.promise : [command],
      )
    })
    try {
      await settle()
      search.search("first")
      expect(search.loading()).toBe(true)
      expect(search.entries()).toEqual([command])
      expect(search.selection()).toBeUndefined()
      search.search("second")
      second.resolve([file])
      await settle()
      expect(search.selection()?.id).toBe(file.id)
      first.resolve([session])
      await settle()
      expect(search.entries()).toEqual([file])
    } finally {
      dispose()
    }
  })

  test("shows a recoverable failure without leaking the rejected error", async () => {
    let fail = true
    let dispose!: () => void
    const search = createRoot((cleanup) => {
      dispose = cleanup
      return createPaletteSearch(() => {
        if (fail) throw new Error("private-provider-payload")
        return [session]
      })
    })
    try {
      await settle()
      expect(search.failed()).toBe(true)
      expect(search.entries()).toEqual([])
      expect(search.selection()).toBeUndefined()
      fail = false
      search.retry()
      await settle()
      expect(search.failed()).toBe(false)
      expect(search.selection()?.id).toBe(session.id)
    } finally {
      dispose()
    }
  })

  test("clearing the search restores suggestions and supersedes pending work", async () => {
    const pending = deferred<CommandPaletteEntry[]>()
    let dispose!: () => void
    const search = createRoot((cleanup) => {
      dispose = cleanup
      return createPaletteSearch((query) => (query ? pending.promise : [command]))
    })
    try {
      await settle()
      search.search("pending")
      search.search("")
      await settle()
      pending.resolve([file])
      await settle()
      expect(search.state.query).toBe("")
      expect(search.entries()).toEqual([command])
    } finally {
      dispose()
    }
  })
})
