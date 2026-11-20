import { describe, expect, test } from "bun:test"
import type { Session } from "@sutradhar/sdk/v2/client"
import {
  buildWorkspaceSidebarProjects,
  displaySidepaneSessionTitle,
  filterSidepaneProjects,
  mergeSidepaneSessions,
} from "./sidepane-data"

function session(partial: Partial<Session> & { id: string; directory: string }): Session {
  return {
    id: partial.id,
    slug: partial.slug ?? partial.id,
    projectID: partial.projectID ?? "global",
    directory: partial.directory,
    title: partial.title ?? "Untitled check",
    version: "1.0.0",
    cost: 0,
    tokens: { input: 0, output: 0, reasoning: 0, cache: { read: 0, write: 0 } },
    time: partial.time ?? { created: 1000, updated: 2000 },
    parentID: partial.parentID,
  }
}

describe("sidepaneData", () => {
  test("never produces blank session titles", () => {
    expect(displaySidepaneSessionTitle({ id: "ses_1", slug: "ses_1", title: "   " })).toBe("New session")
    expect(
      displaySidepaneSessionTitle({ id: "ses_2", slug: "brave-owl", title: "" }),
    ).toBe("brave-owl")
    expect(
      displaySidepaneSessionTitle({
        id: "ses_3",
        slug: "ses_3",
        title: "New session - 2026-11-14T08:01:11.193Z",
      }),
    ).toBe("New session")
    expect(
      displaySidepaneSessionTitle({ id: "ses_4", slug: "ses_4", title: "Refactoring model pane" }),
    ).toBe("Refactoring model pane")
  })

  test("merges V1, V2, and per-directory session stores while honoring tombstones and renames", () => {
    const merged = mergeSidepaneSessions({
      sources: [
        [session({ id: "ses_a", directory: "C:/Users/skous/Videos/kimi_k3", title: "  ", time: { created: 1, updated: 10 } })],
        [
          session({
            id: "ses_a",
            directory: "C:\\Users\\skous\\Videos\\kimi_k3",
            title: "Kimi Architecture Plan",
            time: { created: 1, updated: 10 },
          }),
          session({ id: "ses_del", directory: "C:\\Users\\skous\\Videos\\kimi_k3", title: "Remove me" }),
          session({
            id: "ses_child",
            directory: "C:\\Users\\skous\\Videos\\kimi_k3",
            title: "Child task",
            parentID: "ses_a",
          }),
        ],
      ],
      localTitles: { ses_a: "Kimi Updated" },
      localDeleted: { ses_del: true },
    })

    expect(merged.map((s) => `${s.id}:${s.title}`)).toEqual(["ses_a:Kimi Updated"])
  })

  test("attaches Windows slash/backslash sessions to exact projects and filters cleanly", () => {
    const projects = buildWorkspaceSidebarProjects(
      [
        { worktree: "C:\\Users\\skous\\Videos\\kimi_k3" },
        { worktree: "C:\\Users\\skous\\Downloads\\Vivo_Camera" },
      ],
      [
        session({ id: "ses_k", directory: "C:/Users/skous/Videos/kimi_k3", title: "next implementation" }),
        session({ id: "ses_v", directory: "C:/Users/skous/Downloads/Vivo_Camera", title: "building the base" }),
      ],
    )

    expect(projects[0]!.workspaces[0]!.sessions.map((s) => s.title)).toEqual(["next implementation"])
    expect(projects[1]!.workspaces[0]!.sessions.map((s) => s.title)).toEqual(["building the base"])

    const filtered = filterSidepaneProjects(projects, "building the base")
    expect(filtered).toHaveLength(1)
    expect(filtered[0]!.name).toBe("Vivo_Camera")
    expect(filtered[0]!.workspaces[0]!.sessions).toHaveLength(1)
  })
})
