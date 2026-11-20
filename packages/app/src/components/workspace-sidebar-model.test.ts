import { describe, expect, test } from "bun:test"
import type { Project, Session } from "@sutradhar/sdk/v2/client"
import { base64Encode } from "@sutradhar/core/util/encode"
import { QueryClient } from "@tanstack/solid-query"
import {
  createHomeSessionIndexCache,
  type HomeSessionEvents,
  type HomeSessionIndex,
} from "@/context/global-sync/home-session-index"
import {
  buildWorkspaceSidebarProjects,
  createWorkspaceSidebarActions,
  createWorkspaceSidebarMutationRunner,
  deleteWorkspaceSidebarSession,
  workspaceSidebarDescendants,
  workspaceSidebarMutationKey,
  workspaceSidebarRoute,
  workspaceSidebarWorktree,
} from "./workspace-sidebar-model"

const session = (id: string, patch: Partial<Session> = {}): Session => ({
  id,
  slug: id,
  projectID: "project",
  directory: "/repo",
  title: id,
  version: "",
  time: { created: 1, updated: 1 },
  ...patch,
})
const project = (patch: Partial<Project> = {}): Project => ({
  id: "project",
  worktree: "/repo",
  sandboxes: ["/worktrees/feature"],
  vcs: "git",
  time: { created: 1, updated: 1 },
  ...patch,
})
function deferred<T>() {
  let resolve!: (value: T) => void
  let reject!: (cause: unknown) => void
  const promise = new Promise<T>((yes, no) => {
    resolve = yes
    reject = no
  })
  return { promise, resolve, reject }
}

describe("workspace sidebar grouping", () => {
  test("scopes chats to exact worktrees and discovers missing directories by projectID", () => {
    const result = buildWorkspaceSidebarProjects(
      [project(), project({ id: "other", worktree: "/other", sandboxes: [] })],
      [
        session("main"),
        session("feature", { directory: "/worktrees/feature/" }),
        session("nested", { directory: "/repo/nested" }),
        session("prefix", { directory: "/repo-other", projectID: "unknown" }),
        session("foreign", { directory: "/unopened", projectID: "unknown" }),
        session("exact-wins", { directory: "/other", projectID: "project" }),
      ],
    )
    expect(result.map((group) => group.root)).toEqual(["/repo", "/other"])
    expect(
      result[0].workspaces.map((workspace) => [
        workspace.directory,
        workspace.main,
        workspace.sessions.map((session) => session.id),
      ]),
    ).toEqual([
      ["/repo", true, ["main"]],
      ["/worktrees/feature", false, ["feature"]],
      ["/repo/nested", false, ["nested"]],
    ])
    expect(result[1].workspaces[0].sessions.map((session) => session.id)).toEqual(["exact-wins"])
  })

  test("filters archived (including timestamp zero) and child sessions before discovering workspaces", () => {
    const result = buildWorkspaceSidebarProjects(
      [project({ sandboxes: [] })],
      [
        session("child", { parentID: "root", directory: "/child-only" }),
        session("archived", { time: { created: 1, updated: 2, archived: 0 }, directory: "/archived-only" }),
        session("old", { time: { created: 1, updated: 2 } }),
        session("new", { time: { created: 1, updated: 3 } }),
      ],
    )
    expect(result[0].workspaces).toHaveLength(1)
    expect(result[0].workspaces[0].sessions.map((session) => session.id)).toEqual(["new", "old"])
  })

  test("deduplicates normalized roots, sandbox aliases, explicitly opened sandboxes, and sessions", () => {
    const result = buildWorkspaceSidebarProjects(
      [
        project({ worktree: "C:\\repo\\", sandboxes: ["C:\\trees\\feature\\", "C:/trees/feature"] }),
        project({ worktree: "C:/repo", sandboxes: ["C:/trees/second"] }),
        project({ worktree: "C:/trees/feature", sandboxes: [] }),
      ],
      [
        session("same", { directory: "C:\\trees\\feature", title: "old" }),
        session("same", { directory: "C:/trees/feature/", title: "new", time: { created: 1, updated: 5 } }),
      ],
    )
    expect(result).toHaveLength(1)
    expect(result[0].workspaces.map((workspace) => workspace.directory)).toEqual([
      "C:\\repo\\",
      "C:\\trees\\feature\\",
      "C:/trees/second",
    ])
    expect(result[0].workspaces[1].sessions.map((session) => session.title)).toEqual(["new"])
  })

  test("a newer archived duplicate hides the stale visible copy", () => {
    const result = buildWorkspaceSidebarProjects(
      [project()],
      [session("same"), session("same", { time: { created: 1, updated: 3, archived: 3 } })],
    )
    expect(result[0].workspaces.flatMap((workspace) => workspace.sessions)).toEqual([])
  })

  test("worktree cache updates preserve current metadata and do not mutate previous data", () => {
    const original = project({ name: "Latest", sandboxes: ["/old/"] })
    const result = workspaceSidebarWorktree([original], project({ name: "Stale" }), "/old")
    expect(result[0].name).toBe("Latest")
    expect(result[0].sandboxes).toEqual(["/old"])
    expect(original.sandboxes).toEqual(["/old/"])
    const next = workspaceSidebarWorktree(result, original, "/new")
    expect(next[0].sandboxes).toEqual(["/old", "/new"])
    expect(result[0].sandboxes).toEqual(["/old"])
  })

  test("descendant cleanup includes arbitrary depth and terminates for duplicate/cyclic summaries", () => {
    const ids = workspaceSidebarDescendants("root", [
      session("grandchild", { parentID: "child" }),
      session("child", { parentID: "root" }),
      session("child", { parentID: "root" }),
      session("root", { parentID: "grandchild" }),
      session("other"),
    ])
    expect([...ids]).toEqual(["root", "child", "grandchild"])
  })

  test("deletion collects descendants before the cascade, filtering unrelated V1 summaries", async () => {
    const calls: string[] = []
    const summaries = [
      session("root"),
      session("child", { parentID: "root" }),
      session("grandchild", { parentID: "child", directory: "/elsewhere" }),
      session("unrelated"),
    ]
    const result = await deleteWorkspaceSidebarSession({
      session: summaries[0],
      children: async (parent) => {
        calls.push(`list:${parent.id}`)
        return summaries
      },
      remove: async () => {
        calls.push("remove")
      },
    })
    expect(calls).toEqual(["list:root", "list:child", "list:grandchild", "remove"])
    expect(result.map((session) => session.id)).toEqual(["root", "child", "grandchild"])
  })

  test("failed descendant discovery leaves the server session undeleted", async () => {
    let removed = false
    await expect(
      deleteWorkspaceSidebarSession({
        session: session("root"),
        children: async () => {
          throw new Error("offline")
        },
        remove: async () => {
          removed = true
        },
      }),
    ).rejects.toThrow("offline")
    expect(removed).toBe(false)
  })
})

describe("workspace sidebar active route", () => {
  test("session route server wins over tabs with colliding session IDs and the active server", () => {
    const result = workspaceSidebarRoute(
      `/server/${base64Encode("remote")}/session/same`,
      undefined,
      [{ type: "session", sessionId: "same", server: "local" }],
      "local",
    )
    expect(result).toEqual({ server: "remote", sessionID: "same" })
  })

  test("draft routes resolve the exact draft's server/worktree and do not select a chat", () => {
    const tabs = [
      { type: "draft" as const, draftID: "one", server: "local", directory: "/local" },
      { type: "draft" as const, draftID: "two", server: "remote", directory: "/repo", worktree: "/tree" },
    ]
    expect(workspaceSidebarRoute("/new-session", "two", tabs, "local")).toEqual({
      server: "remote",
      directory: "/tree",
    })
    expect(workspaceSidebarRoute("/", undefined, tabs, "local")).toEqual({})
    expect(workspaceSidebarRoute("/new-session", "missing", tabs, "local")).toEqual({})
    expect(workspaceSidebarRoute("/new-session", "two", [{ ...tabs[1], worktree: "new" }], "local")).toEqual({
      server: "remote",
      directory: "/repo",
    })
  })

  test("legacy routes resolve by tab server and retain their directory", () => {
    expect(
      workspaceSidebarRoute(
        `/${base64Encode("/repo")}/session/id`,
        undefined,
        [{ type: "session", sessionId: "id", server: "remote" }],
        "local",
      ),
    ).toEqual({ server: "remote", sessionID: "id", directory: "/repo" })
  })
})

function harness(server = "server", run?: ReturnType<typeof createWorkspaceSidebarMutationRunner>) {
  const calls: string[] = []
  const errors: unknown[] = []
  const pending = new Set<string>()
  const dependencies = {
    server,
    run:
      run ??
      createWorkspaceSidebarMutationRunner({
        pending: (key, value) => {
          if (value) pending.add(key)
          else pending.delete(key)
        },
        error: (cause) => {
          errors.push(cause)
        },
      }),
    create: async (directory: string) => {
      calls.push(`create:${directory}`)
      return session("created", { directory })
    },
    rename: async (_: Session, title: string) => {
      calls.push(`rename:${title}`)
    },
    remove: async (item: Session) => {
      calls.push("remove")
      return [item]
    },
    archive: async (_: Session) => {
      calls.push("archive")
    },
    workspace: async (root: string, name: string) => {
      calls.push(`workspace:${root}:${name}`)
      return "/new-tree"
    },
    created: (item: Session) => {
      calls.push(`open:${item.id}`)
    },
    renamed: (_: Session, title: string) => {
      calls.push(`renamed:${title}`)
    },
    removed: (_: Session[]) => {
      calls.push("removed")
    },
    archived: (item: Session) => {
      calls.push(`archived:${item.id}`)
    },
    worktreeCreated: (_: string) => {
      calls.push("worktree-created")
    },
  }
  return { dependencies, calls, errors, pending, actions: () => createWorkspaceSidebarActions(dependencies) }
}

describe("workspace sidebar actions", () => {
  test("blank names never issue requests or enter pending state; valid names are trimmed", async () => {
    const h = harness()
    const actions = h.actions()
    expect(await actions.renameChat(session("id"), " \n\t")).toBe(false)
    expect(await actions.createWorkspace("/repo", " \n")).toBe(false)
    expect(await actions.newChat(" ")).toBe(false)
    expect(h.calls).toEqual([])
    expect(h.pending.size).toBe(0)
    expect(await actions.renameChat(session("id"), "  renamed  ")).toBe(true)
    expect(await actions.createWorkspace("/repo", "  feature  ")).toBe(true)
    expect(h.calls).toEqual(["rename:renamed", "renamed:renamed", "workspace:/repo:feature", "worktree-created"])
  })

  test("new chat opens only after a persisted session is returned", async () => {
    const h = harness()
    const request = deferred<Session>()
    h.dependencies.create = async () => {
      h.calls.push("request")
      return request.promise
    }
    const result = h.actions().newChat("/repo")
    expect(h.calls).toEqual(["request"])
    expect(h.pending.has(workspaceSidebarMutationKey("server", "/repo"))).toBe(true)
    request.resolve(session("persisted"))
    expect(await result).toBe(true)
    expect(h.calls).toEqual(["request", "open:persisted"])
    expect(h.pending.size).toBe(0)
  })

  test("pending dedupe spans rename/delete for one session and normalized directory actions", async () => {
    const h = harness()
    const rename = deferred<void>()
    h.dependencies.rename = () => rename.promise
    const actions = h.actions()
    const first = actions.renameChat(session("id"), "new")
    expect(await actions.deleteChat(session("id"))).toBe(false)
    expect(await actions.renameChat(session("id"), "again")).toBe(false)
    const create = deferred<Session>()
    h.dependencies.create = () => create.promise
    const chat = h.actions().newChat("C:\\repo\\")
    expect(await h.actions().createWorkspace("C:/repo", "feature")).toBe(false)
    expect(h.calls).toEqual([])
    rename.resolve()
    create.resolve(session("persisted"))
    expect(await first).toBe(true)
    expect(await chat).toBe(true)
    expect(h.calls).toEqual(["renamed:new", "open:persisted"])
  })

  test("failure never commits, reports the cause, releases pending, and allows retry", async () => {
    const h = harness()
    const cause = new Error("offline")
    h.dependencies.remove = async () => {
      h.calls.push("request")
      throw cause
    }
    expect(await h.actions().deleteChat(session("id"))).toBe(false)
    expect(h.calls).toEqual(["request"])
    expect(h.errors).toEqual([cause])
    expect(h.pending.size).toBe(0)
    h.dependencies.remove = async (item) => [item]
    expect(await h.actions().deleteChat(session("id"))).toBe(true)
    expect(h.calls).toEqual(["request", "removed"])
  })

  test("failed creates/renames/worktrees do not publish successful state", async () => {
    const h = harness()
    const cause = new Error("rejected")
    h.dependencies.create = async () => {
      throw cause
    }
    h.dependencies.rename = async () => {
      throw cause
    }
    h.dependencies.workspace = async () => {
      throw cause
    }
    const actions = h.actions()
    expect(await actions.newChat("/repo")).toBe(false)
    expect(await actions.renameChat(session("id"), "title")).toBe(false)
    expect(await actions.createWorkspace("/repo", "feature")).toBe(false)
    expect(h.calls).toEqual([])
    expect(h.errors).toEqual([cause, cause, cause])
    expect(h.pending.size).toBe(0)
  })

  test("a server switch cannot redirect an in-flight mutation's commit or pending guard", async () => {
    const original = harness("original")
    const other = harness("other", original.dependencies.run)
    const request = deferred<Session>()
    original.dependencies.create = () => request.promise
    const result = original.actions().newChat("/repo")
    expect(await other.actions().newChat("/repo")).toBe(true)
    expect(other.calls).toEqual(["create:/repo", "open:created"])
    expect(original.calls).toEqual([])
    request.resolve(session("original-result"))
    expect(await result).toBe(true)
    expect(original.calls).toEqual(["open:original-result"])
  })

  test("commit completes before pending is released", async () => {
    const order: string[] = []
    const commit = deferred<void>()
    const entered = deferred<void>()
    const run = createWorkspaceSidebarMutationRunner({
      pending: (_, value) => {
        order.push(`pending:${value}`)
      },
      error: () => {
        order.push("error")
      },
    })
    const result = run({
      key: "id",
      request: async () => {
        order.push("request")
        return "result"
      },
      commit: async () => {
        order.push("commit")
        entered.resolve()
        await commit.promise
        order.push("committed")
      },
    })
    await entered.promise
    expect(order).toEqual(["pending:true", "request", "commit"])
    expect(await run({ key: "id", request: async () => "duplicate", commit: () => {} })).toBe(false)
    commit.resolve()
    expect(await result).toBe(true)
    expect(order).toEqual(["pending:true", "request", "commit", "committed", "pending:false"])
  })

  test("successful actions publish to the existing home index; failures leave it intact", async () => {
    const client = new QueryClient()
    const cache = createHomeSessionIndexCache(client, "server")
    client.setQueryData<HomeSessionIndex>(cache.indexKey, { sessions: [session("id")], eventSequence: 0 })
    const read = () =>
      cache.sessions(
        client.getQueryData<HomeSessionIndex>(cache.indexKey),
        client.getQueryData<HomeSessionEvents>(cache.eventsKey),
      )
    const h = harness()
    h.dependencies.created = (info) =>
      cache.apply({ type: "session.created", properties: { sessionID: info.id, info } })
    h.dependencies.renamed = (info, title) =>
      cache.apply({ type: "session.updated", properties: { sessionID: info.id, info: { ...info, title } } })
    h.dependencies.removed = (items) => {
      for (const info of items) cache.remove(info.id)
    }
    const request = deferred<void>()
    h.dependencies.rename = () => request.promise
    const rename = h.actions().renameChat(session("id"), "renamed")
    expect(read().map((item) => item.title)).toEqual(["id"])
    request.resolve()
    expect(await rename).toBe(true)
    expect(read().map((item) => item.title)).toEqual(["renamed"])
    h.dependencies.remove = async () => {
      throw new Error("offline")
    }
    expect(await h.actions().deleteChat(session("id"))).toBe(false)
    expect(read().map((item) => item.title)).toEqual(["renamed"])
    expect(await h.actions().newChat("/repo")).toBe(true)
    expect(read().map((item) => item.id)).toEqual(["id", "created"])
    h.dependencies.remove = async (item) => [item]
    expect(await h.actions().deleteChat(session("id"))).toBe(true)
    expect(read().map((item) => item.id)).toEqual(["created"])
    client.clear()
  })

  test("a successful mutation survives an older in-flight home index response", async () => {
    const client = new QueryClient()
    const cache = createHomeSessionIndexCache(client, "server")
    const response = deferred<HomeSessionIndex>()
    const load = client.fetchQuery({ queryKey: cache.indexKey, queryFn: () => response.promise })
    const h = harness()
    h.dependencies.created = (info) =>
      cache.apply({ type: "session.created", properties: { sessionID: info.id, info } })
    expect(await h.actions().newChat("/repo")).toBe(true)
    cache.complete(0)
    response.resolve({ sessions: [], eventSequence: 0 })
    await load
    expect(
      cache
        .sessions(
          client.getQueryData<HomeSessionIndex>(cache.indexKey),
          client.getQueryData<HomeSessionEvents>(cache.eventsKey),
        )
        .map((item) => item.id),
    ).toEqual(["created"])
    client.clear()
  })

  test("archiveChat archives session and removes it from the home index", async () => {
    const client = new QueryClient()
    const cache = createHomeSessionIndexCache(client, "server")
    client.setQueryData<HomeSessionIndex>(cache.indexKey, { sessions: [session("id")], eventSequence: 0 })
    const read = () =>
      cache.sessions(
        client.getQueryData<HomeSessionIndex>(cache.indexKey),
        client.getQueryData<HomeSessionEvents>(cache.eventsKey),
      )
    const h = harness()
    h.dependencies.archived = (info) => {
      h.calls.push(`archived:${info.id}`)
      cache.remove(info.id)
      cache.apply({
        type: "session.updated",
        properties: { sessionID: info.id, info: { ...info, time: { ...info.time, archived: Date.now() } } },
      })
    }
    expect(read().map((item) => item.id)).toEqual(["id"])
    expect(await h.actions().archiveChat(session("id"))).toBe(true)
    expect(h.calls).toEqual(["archive", "archived:id"])
    expect(read().map((item) => item.id)).toEqual([])
    client.clear()
  })
})
