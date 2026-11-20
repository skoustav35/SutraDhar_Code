import type { Project, Session } from "@sutradhar/sdk/v2/client"
import { base64Encode } from "@sutradhar/core/util/encode"
import { decode64 } from "@/utils/base64"
import { pathKey } from "@/utils/path-key"
import { sessionTitle } from "@/utils/session-title"
import { compareSessionTime, displayName } from "@/pages/layout/helpers"
import type { SidebarProject, SidebarWorkspace } from "../workspace-sidebar-types"

export type WorkspaceSidebarProjectInput = {
  id?: string
  name?: string
  worktree: string
  sandboxes?: string[]
  vcs?: string
}

export function displaySidepaneSessionTitle(
  session: Pick<Session, "title" | "slug" | "id" | "parentID">,
  fallback = "New session",
): string {
  const resolved = sessionTitle(session.title)
  if (resolved) return resolved
  const slug = session.slug?.trim()
  if (slug && slug !== session.id && !/^ses_/.test(slug)) return slug
  return session.parentID ? "Child session" : fallback
}

export function mergeSidepaneSessions(input: {
  readonly sources: readonly (readonly Session[])[]
  readonly localTitles?: Readonly<Record<string, string>>
  readonly localDeleted?: Readonly<Record<string, boolean>>
  readonly localArchived?: Readonly<Record<string, boolean>>
}): Session[] {
  const byID = new Map<string, Session>()

  for (const list of input.sources) {
    for (const item of list) {
      if (!item?.id) continue
      const existing = byID.get(item.id)
      if (!existing) {
        byID.set(item.id, item)
        continue
      }
      const nextUpdated = item.time?.updated ?? item.time?.created ?? 0
      const prevUpdated = existing.time?.updated ?? existing.time?.created ?? 0
      const winner = nextUpdated >= prevUpdated ? item : existing
      const loser = winner === item ? existing : item
      const winnerTitle = winner.title?.trim()
      const loserTitle = loser.title?.trim()
      const title = winnerTitle ? winner.title : loserTitle ? loser.title : winner.title
      const archived =
        typeof winner.time?.archived === "number"
          ? winner.time.archived
          : typeof loser.time?.archived === "number"
            ? loser.time.archived
            : undefined
      byID.set(item.id, {
        ...loser,
        ...winner,
        title,
        time: archived !== undefined ? { ...winner.time, archived } : winner.time,
      })
    }
  }

  const out: Session[] = []
  for (const session of byID.values()) {
    if (session.parentID || typeof session.time?.archived === "number") continue
    if (input.localDeleted?.[session.id] || input.localArchived?.[session.id]) continue
    const override = input.localTitles?.[session.id]
    if (override !== undefined && override !== session.title) {
      out.push({ ...session, title: override })
      continue
    }
    out.push(session)
  }

  return out.sort(compareSessionTime)
}

export function filterSidepaneProjects(
  projects: readonly SidebarProject[],
  rawQuery: string,
): SidebarProject[] {
  const query = rawQuery.trim().toLowerCase()
  if (!query) return projects.slice()

  const filtered: SidebarProject[] = []
  for (const project of projects) {
    const projectMatches =
      project.name.toLowerCase().includes(query) || project.root.toLowerCase().includes(query)
    if (projectMatches) {
      filtered.push(project)
      continue
    }
    const matchingWorkspaces: SidebarWorkspace[] = []
    for (const ws of project.workspaces) {
      const wsMatches = ws.name.toLowerCase().includes(query) || ws.directory.toLowerCase().includes(query)
      if (wsMatches) {
        matchingWorkspaces.push(ws)
        continue
      }
      const matchingSessions = ws.sessions.filter((session) =>
        displaySidepaneSessionTitle(session).toLowerCase().includes(query),
      )
      if (matchingSessions.length > 0) {
        matchingWorkspaces.push({ ...ws, sessions: matchingSessions })
      }
    }
    if (matchingWorkspaces.length > 0) {
      filtered.push({ ...project, workspaces: matchingWorkspaces })
    }
  }

  return filtered
}

export function buildWorkspaceSidebarProjects(
  projects: readonly WorkspaceSidebarProjectInput[],
  sessions: readonly Session[],
) {
  const roots = new Map<string, WorkspaceSidebarProjectInput>()
  for (const project of projects) {
    const key = pathKey(project.worktree)
    if (!key) continue
    const previous = roots.get(key)
    roots.set(
      key,
      previous
        ? { ...project, ...previous, sandboxes: [...(previous.sandboxes ?? []), ...(project.sandboxes ?? [])] }
        : project,
    )
  }
  // An explicitly opened sandbox belongs to its root, rather than appearing twice.
  const owners = new Map<string, string>()
  for (const [root, project] of roots) {
    for (const directory of project.sandboxes ?? []) {
      const key = pathKey(directory)
      if (key !== root && !owners.has(key)) owners.set(key, root)
    }
  }
  for (const [key, root] of owners) {
    if (!roots.has(root) || owners.has(root)) continue
    roots.delete(key)
  }

  const result: SidebarProject[] = []
  const workspaces = new Map<string, SidebarWorkspace>()
  const byID = new Map<string, SidebarProject>()
  const add = (project: SidebarProject, directory: string, main: boolean) => {
    const key = pathKey(directory)
    if (!key || workspaces.has(key)) return
    const workspace: SidebarWorkspace = { directory, name: displayName({ worktree: key }), main, sessions: [] }
    project.workspaces.push(workspace)
    workspaces.set(key, workspace)
  }
  for (const [root, project] of roots) {
    const group: SidebarProject = {
      id: project.id ?? root,
      name: displayName(project),
      root: project.worktree,
      git: project.vcs === "git",
      workspaces: [],
    }
    result.push(group)
    if (project.id && !byID.has(project.id)) byID.set(project.id, group)
    add(group, project.worktree, true)
  }
  for (const group of result) {
    for (const directory of roots.get(pathKey(group.root))?.sandboxes ?? []) add(group, directory, false)
  }
  const unique = new Map<string, Session>()
  for (const session of sessions) {
    const previous = unique.get(session.id)
    if (!previous || compareSessionTime(session, previous) <= 0) unique.set(session.id, session)
  }
  for (const session of [...unique.values()].sort(compareSessionTime)) {
    if (session.parentID || typeof session.time.archived === "number") continue
    const key = pathKey(session.directory)
    // Exact directory ownership wins over projectID; never use path prefixes.
    if (!workspaces.has(key)) {
      const project = byID.get(session.projectID)
      if (project) add(project, session.directory, false)
    }
    workspaces.get(key)?.sessions.push(session)
  }
  return result
}

type SidebarRouteTab = {
  type: "session" | "draft"
  server: string
  sessionId?: string
  draftID?: string
  directory?: string
  worktree?: string
}

export function workspaceSidebarRoute(
  pathname: string,
  draftID: string | undefined,
  tabs: readonly SidebarRouteTab[],
  fallback: string,
) {
  const match = /^\/server\/([^/]+)\/session\/([^/]+)\/?$/.exec(pathname)
  if (match) {
    const server = decode64(match[1])
    if (server && base64Encode(server) === match[1]) return { server, sessionID: match[2] }
    return {}
  }
  if (pathname === "/new-session") {
    const tab = tabs.find((tab) => tab.type === "draft" && tab.draftID === draftID)
    return tab
      ? { server: tab.server, directory: tab.worktree && tab.worktree !== "new" ? tab.worktree : tab.directory }
      : {}
  }
  const legacy = /^\/([^/]+)\/session\/([^/]+)\/?$/.exec(pathname)
  if (!legacy) return {}
  const directory = decode64(legacy[1])
  if (!directory) return {}
  const matches = tabs.filter((tab) => tab.type === "session" && tab.sessionId === legacy[2])
  const server =
    matches.find((tab) => tab.server === fallback)?.server ?? (matches.length === 1 ? matches[0].server : fallback)
  return { server, sessionID: legacy[2], directory }
}

export function workspaceSidebarDescendants(root: string, sessions: readonly Session[]) {
  const children = new Map<string, string[]>()
  for (const session of sessions) {
    if (!session.parentID) continue
    const list = children.get(session.parentID) ?? []
    list.push(session.id)
    children.set(session.parentID, list)
  }
  const ids = new Set([root])
  for (const id of ids) {
    for (const child of children.get(id) ?? []) ids.add(child)
  }
  return ids
}

export async function deleteWorkspaceSidebarSession(input: {
  session: Session
  children: (parent: Session) => Promise<Session[]>
  remove: () => Promise<unknown>
}) {
  const known = new Map<string, Session>([[input.session.id, input.session]])
  for (const parent of known.values()) {
    for (const child of await input.children(parent)) {
      // V1 compatibility can return unfiltered directory summaries.
      if (child.parentID === parent.id && !known.has(child.id)) known.set(child.id, child)
    }
  }
  await input.remove()
  return [...known.values()]
}

export function workspaceSidebarWorktree(projects: readonly Project[], project: Project, directory: string): Project[] {
  const current = projects.find((item) => item.id === project.id) ?? project
  const sandboxes = [
    ...new Map([...(current.sandboxes ?? []), directory].map((item) => [pathKey(item), item])).values(),
  ]
  const next = { ...current, sandboxes }
  return [...projects.filter((item) => item.id !== next.id), next].sort((a, b) => a.id.localeCompare(b.id))
}

export const workspaceSidebarMutationKey = (server: string, key: string) => JSON.stringify([server, key])

export type WorkspaceSidebarMutation = <T>(input: {
  key: string
  request: () => Promise<T>
  commit: (result: T) => void | Promise<void>
}) => Promise<boolean>

export function createWorkspaceSidebarMutationRunner(input: {
  pending: (key: string, value: boolean) => void
  error: (cause: unknown) => void
}) {
  const pending = new Set<string>()
  const run: WorkspaceSidebarMutation = async (mutation) => {
    if (pending.has(mutation.key)) return false
    pending.add(mutation.key)
    input.pending(mutation.key, true)
    try {
      const result = await mutation.request()
      await mutation.commit(result)
      return true
    } catch (cause) {
      input.error(cause)
      return false
    } finally {
      pending.delete(mutation.key)
      input.pending(mutation.key, false)
    }
  }
  return run
}

export function createWorkspaceSidebarActions<Worktree>(input: {
  server: string
  run: WorkspaceSidebarMutation
  create: (directory: string) => Promise<Session>
  rename: (session: Session, title: string) => Promise<unknown>
  remove: (session: Session) => Promise<Session[]>
  archive?: (session: Session) => Promise<unknown>
  workspace: (root: string, name: string) => Promise<Worktree>
  created: (session: Session) => void
  renamed: (session: Session, title: string) => void
  removed: (sessions: Session[]) => void
  archived?: (session: Session) => void
  worktreeCreated: (worktree: Worktree) => void
}) {
  const key = (resource: string) => workspaceSidebarMutationKey(input.server, resource)
  return {
    newChat: (directory: string) => {
      if (!directory.trim()) return Promise.resolve(false)
      return input.run({ key: key(pathKey(directory)), request: () => input.create(directory), commit: input.created })
    },
    renameChat: (session: Session, value: string) => {
      const title = value.trim()
      if (!title) return Promise.resolve(false)
      return input.run({
        key: key(session.id),
        request: () => input.rename(session, title),
        commit: () => input.renamed(session, title),
      })
    },
    deleteChat: (session: Session) =>
      input.run({ key: key(session.id), request: () => input.remove(session), commit: input.removed }),
    archiveChat: (session: Session) => {
      if (!input.archive) return Promise.resolve(false)
      return input.run({
        key: key(session.id),
        request: () => input.archive!(session),
        commit: () => input.archived?.(session),
      })
    },
    createWorkspace: (root: string, value: string) => {
      const name = value.trim()
      if (!name || !root.trim()) return Promise.resolve(false)
      return input.run({
        key: key(pathKey(root)),
        request: () => input.workspace(root, name),
        commit: input.worktreeCreated,
      })
    },
  }
}
