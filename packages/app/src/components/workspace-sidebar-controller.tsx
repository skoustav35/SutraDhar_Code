import type { Project, Session } from "@opencode-ai/sdk/v2/client"
import { useLocation, useNavigate } from "@solidjs/router"
import { useQuery, useQueryClient } from "@tanstack/solid-query"
import { batch, createEffect, createMemo, createResource, on, onCleanup } from "solid-js"
import { createStore, produce } from "solid-js/store"
import { useCommand } from "@/context/command"
import { useGlobal, type ServerCtx } from "@/context/global"
import { loadProjectsQuery } from "@/context/global-sync/bootstrap"
import {
  homeSessionEventsKey,
  homeSessionIndexKey,
  loadHomeSessionIndex,
  type HomeSessionEvents,
  type HomeSessionIndex,
} from "@/context/global-sync/home-session-index"
import { dropSessionCaches } from "@/context/global-sync/session-cache"
import { useLanguage } from "@/context/language"
import { useLayout } from "@/context/layout"
import { ServerConnection, serverName, useServer } from "@/context/server"
import { useTabs } from "@/context/tabs"
import { errorMessage, homeProjectDirectories } from "@/pages/layout/helpers"
import { pathKey } from "@/utils/path-key"
import { Persist, persisted } from "@/utils/persist"
import { listAllSessions, normalizeSessionInfo } from "@/utils/session"
import { showToast } from "@/utils/toast"
import { Worktree as WorktreeState } from "@/utils/worktree"
import { useDirectoryPicker } from "./directory-picker"
import { useSettingsCommand } from "./settings-dialog"
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
import type { WorkspaceSidebarController } from "./workspace-sidebar-types"

export function createWorkspaceSidebarController(): WorkspaceSidebarController {
  const global = useGlobal()
  const layout = useLayout()
  const tabs = useTabs()
  const server = useServer()
  const language = useLanguage()
  const command = useCommand()
  const settings = useSettingsCommand()
  const pickDirectory = useDirectoryPicker()
  const location = useLocation()
  const navigate = useNavigate()
  // ServerSync and Home both use this provider's QueryClient, not ServerCtx.queryClient.
  const queryClient = useQueryClient()
  const [stored, setStored, , ready] = persisted(
    Persist.global("workspace-sidebar.v2"),
    createStore({ open: true, collapsed: {} as Record<string, boolean> }),
  )
  const [persistedState] = createResource(
    () => ready.promise ?? Promise.resolve(),
    (promise) => promise.then(() => stored),
    { initialValue: stored },
  )
  const [state, setState] = createStore({
    selected: undefined as ServerConnection.Key | undefined,
    pending: {} as Record<string, boolean>,
    worktrees: {} as Record<string, boolean>,
    localTitles: {} as Record<string, string>,
    localDeleted: {} as Record<string, boolean>,
    localArchived: {} as Record<string, boolean>,
  })
  const route = createMemo(() =>
    workspaceSidebarRoute(
      location.pathname,
      typeof location.query.draftId === "string" ? location.query.draftId : undefined,
      tabs.store,
      server.key,
    ),
  )
  const currentServer = createMemo(() => {
    const key = route().server
    return key ? ServerConnection.Key.make(key) : undefined
  })
  const focused = createMemo(() => {
    const key = state.selected ?? currentServer() ?? layout.home.selection().server ?? server.key
    return global.servers.list().find((conn) => ServerConnection.key(conn) === key) ?? global.servers.list()[0]
  })
  const selectedServer = () => {
    const conn = focused()
    return conn ? ServerConnection.key(conn) : undefined
  }
  const context = createMemo(() => {
    const conn = focused()
    return conn ? global.ensureServerCtx(conn) : undefined
  })

  // Only route changes override explicit sidebar browsing; selecting a server never navigates.
  createEffect(
    on(
      () => [location.pathname, location.search, currentServer()] as const,
      () => {
        const key = currentServer()
        if (key) setState("selected", key)
      },
    ),
  )
  createEffect(() => {
    const list = global.servers.list()
    if (!state.selected || list.some((conn) => ServerConnection.key(conn) === state.selected)) return
    setState("selected", undefined)
  })
  // Watch every existing server so a worktree can finish after the sidebar switches servers.
  createEffect(() => {
    for (const conn of global.servers.list()) {
      const ctx = global.ensureServerCtx(conn)
      const key = ServerConnection.key(conn)
      const unsubscribe = ctx.sdk.event.listen((event) => {
        if (event.details.type !== "worktree.ready" && event.details.type !== "worktree.failed") return
        const directory = event.name
        if (event.details.type === "worktree.ready") WorktreeState.ready(ctx.sdk.scope, directory)
        else {
          WorktreeState.failed(
            ctx.sdk.scope,
            directory,
            event.details.properties.message ?? language.t("common.requestFailed"),
          )
        }
        setState("worktrees", workspaceSidebarMutationKey(key, pathKey(directory)), false)
      })
      onCleanup(unsubscribe)
    }
  })

  const events = useQuery(() => ({
    queryKey: context()?.sync.homeSessions.eventsKey ?? homeSessionEventsKey(""),
    queryFn: async (): Promise<HomeSessionEvents> => ({ sequence: 0, entries: [] }),
    initialData: { sequence: 0, entries: [] } satisfies HomeSessionEvents,
    enabled: false,
  }))
  const index = useQuery(() => {
    const ctx = context()
    return {
      queryKey: ctx?.sync.homeSessions.indexKey ?? homeSessionIndexKey(""),
      enabled: !!ctx,
      queryFn: async ({ signal }: { signal: AbortSignal }): Promise<HomeSessionIndex> => {
        if (!ctx) return { sessions: [], eventSequence: 0 }
        const cache = ctx.sync.homeSessions
        const sequence = cache.eventSequence()
        const result = await loadHomeSessionIndex(
          (input, options) => ctx.sdk.client.v2.session.list(input, options),
          sequence,
          signal,
        )
        cache.complete(sequence)
        return result
      },
      retry: false,
      staleTime: 30_000,
      refetchOnMount: true,
      refetchOnReconnect: true,
    }
  })
  const baseSessions = createMemo(() => context()?.sync.homeSessions.sessions(index.data, events.data) ?? [])
  const sessions = createMemo(() => {
    return baseSessions()
      .filter((s) => !state.localDeleted[s.id] && !state.localArchived[s.id])
      .map((s) => {
        const title = state.localTitles[s.id]
        if (title !== undefined && title !== s.title) {
          return { ...s, title }
        }
        return s
      })
  })
  const projects = createMemo(() => buildWorkspaceSidebarProjects(context()?.projects.list() ?? [], sessions()))
  const currentDirectory = createMemo(() => {
    const current = route()
    if (current.directory) return current.directory
    if (!current.server || !current.sessionID) return undefined
    const conn = global.servers.list().find((conn) => ServerConnection.key(conn) === current.server)
    const ctx = conn ? global.ensureServerCtx(conn) : undefined
    return (
      ctx?.sync.session.get(current.sessionID)?.directory ??
      (current.server === selectedServer()
        ? sessions().find((session) => session.id === current.sessionID)?.directory
        : undefined) ??
      tabs.info[`${current.server}\n${location.pathname}`]?.directory
    )
  })
  const fail = (cause: unknown) =>
    showToast({
      variant: "error",
      title: language.t("common.requestFailed"),
      description: errorMessage(cause, language.t("common.requestFailed")),
    })
  const run = createWorkspaceSidebarMutationRunner({
    pending: (key, value) => setState("pending", key, value),
    error: fail,
  })
  const collapseKey = (directory: string) => workspaceSidebarMutationKey(selectedServer() ?? "", pathKey(directory))
  const write = (fn: () => void) => {
    if (ready()) fn()
    else void ready.promise?.then(fn)
  }
  const toggle = () => write(() => setStored("open", (value) => !value))

  command.register("workspace-sidebar", () => [
    {
      id: "sidebar.toggle",
      title: language.t("command.sidebar.toggle"),
      category: language.t("command.category.view"),
      keybind: "mod+\\",
      onSelect: toggle,
    },
  ])

  createEffect(
    on(
      () => [selectedServer(), currentServer(), currentDirectory(), route().sessionID] as const,
      ([selected, current, directory]) => {
        if (!selected || selected !== current || !directory) return
        const key = workspaceSidebarMutationKey(selected, pathKey(directory))
        write(() => setStored("collapsed", key, false))
      },
    ),
  )

  function remember(ctx: ServerCtx, key: ServerConnection.Key, session: Session, created = false) {
    const [, setChild] = ctx.sync.child(session.directory, { bootstrap: false })
    batch(() => {
      ctx.sync.session.remember(session)
      setChild(
        produce((draft) => {
          const at = draft.session.findIndex((item) => item.id === session.id)
          if (at !== -1) draft.session[at] = session
          else {
            draft.session.push(session)
            draft.session.sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0))
            if (created && !session.parentID) draft.sessionTotal += 1
          }
        }),
      )
      ctx.sync.homeSessions.apply({
        type: created ? "session.created" : "session.updated",
        properties: { sessionID: session.id, info: session },
      })
      queryClient.setQueryData<HomeSessionIndex>(ctx.sync.homeSessions.indexKey, (current) => {
        if (!current) return current
        const at = current.sessions.findIndex((item) => item.id === session.id)
        if (at !== -1) {
          return { ...current, sessions: current.sessions.with(at, session) }
        }
        if (created) {
          return { ...current, sessions: [session, ...current.sessions] }
        }
        return current
      })
      tabs.rememberSessionInfo({ type: "session", server: key, sessionId: session.id }, session)
    })
  }

  function open(ctx: ServerCtx, key: ServerConnection.Key, session: Session) {
    const project = buildWorkspaceSidebarProjects(ctx.projects.list(), [session]).find((project) =>
      project.workspaces.some((workspace) => pathKey(workspace.directory) === pathKey(session.directory)),
    )
    const directory = project?.root ?? session.directory
    ctx.projects.open(directory)
    ctx.projects.touch(directory)
    write(() => setStored("collapsed", workspaceSidebarMutationKey(key, pathKey(session.directory)), false))
    ctx.sync.session.remember(session)
    const tab = tabs.addSessionTab({ server: key, sessionId: session.id })
    tabs.rememberSessionInfo({ type: "session", server: key, sessionId: session.id }, session)
    tabs.select(tab)
  }

  async function remove(ctx: ServerCtx, session: Session) {
    // The home index deliberately excludes children. Read their summaries (never
    // timelines) before the server cascades deletion, including closed/persisted tabs.
    const protocol = await ctx.sdk.protocol
    const known = await deleteWorkspaceSidebarSession({
      session,
      children: (parent) =>
        listAllSessions(ctx.sdk.api.session, {
          parentID: parent.id,
          ...(protocol === "v1" ? { directory: parent.directory } : {}),
        }),
      remove: () => ctx.sdk.api.session.remove({ sessionID: session.id, directory: session.directory }),
    })
    // Include descendants learned via events while the request was in flight.
    const summaries = [...known, ...Object.values(ctx.sync.session.data.info).filter((info): info is Session => !!info)]
    const ids = workspaceSidebarDescendants(session.id, summaries)
    return [...new Map(summaries.filter((item) => ids.has(item.id)).map((item) => [item.id, item])).values()]
  }

  function forget(ctx: ServerCtx, key: ServerConnection.Key, removed: Session[]) {
    const ids = new Set(removed.map((session) => session.id))
    batch(() => {
      const directories = new Set(removed.map((session) => pathKey(session.directory)))
      for (const directory of directories) {
        const [, setChild] = ctx.sync.child(directory, { bootstrap: false })
        setChild(
          produce((draft) => {
            const count = draft.session.filter(
              (session) => ids.has(session.id) && !session.parentID && typeof session.time.archived !== "number",
            ).length
            draft.session = draft.session.filter((session) => !ids.has(session.id))
            draft.sessionTotal = Math.max(0, draft.sessionTotal - count)
            dropSessionCaches(draft, ids)
          }),
        )
      }
      for (const session of removed) {
        ctx.sync.homeSessions.remove(session.id)
        ctx.sync.homeSessions.apply({
          type: "session.deleted",
          properties: { sessionID: session.id, info: session },
        })
        ctx.sync.session.apply({ type: "session.deleted", properties: { sessionID: session.id, info: session } })
      }
      queryClient.setQueryData<HomeSessionIndex>(ctx.sync.homeSessions.indexKey, (current) => {
        if (!current) return current
        return { ...current, sessions: current.sessions.filter((s) => !ids.has(s.id)) }
      })
      tabs.removeSessions({ server: key, directory: removed[0].directory, sessionIDs: [...ids] })
    })
    // removeSessions still recognizes the legacy :dir route. Handle /server routes
    // explicitly, using the live route so an unrelated navigation is never replaced.
    if (currentServer() === key && ids.has(route().sessionID ?? "")) navigate("/")
  }

  function archiveLocal(ctx: ServerCtx, key: ServerConnection.Key, session: Session) {
    setState("localArchived", session.id, true)
    batch(() => {
      ctx.sync.homeSessions.remove(session.id)
      ctx.sync.homeSessions.apply({
        type: "session.updated",
        properties: { sessionID: session.id, info: { ...session, time: { ...session.time, archived: Date.now() } } },
      })
      const [, setChild] = ctx.sync.child(session.directory, { bootstrap: false })
      setChild(
        produce((draft) => {
          const at = draft.session.findIndex((item) => item.id === session.id)
          if (at !== -1) {
            draft.session.splice(at, 1)
            draft.sessionTotal = Math.max(0, draft.sessionTotal - 1)
          }
        }),
      )
      queryClient.setQueryData<HomeSessionIndex>(ctx.sync.homeSessions.indexKey, (current) => {
        if (!current) return current
        const at = current.sessions.findIndex((item) => item.id === session.id)
        if (at === -1) return current
        return { ...current, sessions: current.sessions.toSpliced(at, 1) }
      })
      tabs.removeSessions({ server: key, directory: session.directory, sessionIDs: [session.id] })
    })
    if (currentServer() === key && route().sessionID === session.id) navigate("/")
  }

  function actions() {
    const ctx = context()
    const key = selectedServer()
    if (!ctx || !key) return undefined
    return createWorkspaceSidebarActions({
      server: key,
      run,
      create: async (directory) => {
        const status = WorktreeState.get(ctx.sdk.scope, directory)
        const worktree = status?.status === "pending" ? await WorktreeState.wait(ctx.sdk.scope, directory) : status
        if (worktree?.status === "failed") throw new Error(worktree.message)
        return normalizeSessionInfo(await ctx.sdk.api.session.create({ location: { directory } }))
      },
      rename: (session, title) =>
        ctx.sdk.api.session.rename({ sessionID: session.id, title, directory: session.directory }),
      remove: (session) => remove(ctx, session),
      archive: (session) =>
        ctx.sdk.client.session.update({
          sessionID: session.id,
          directory: session.directory,
          time: { archived: Date.now() },
        }),
      workspace: async (root, name) => {
        const projectID = ctx.projects.list().find((project) => pathKey(project.worktree) === pathKey(root))?.id
        const matches = (project: Project) => pathKey(project.worktree) === pathKey(root) || project.id === projectID
        const project =
          ctx.sync.data.project.find(matches) ??
          (await queryClient.fetchQuery(loadProjectsQuery(ctx.sdk.scope, ctx.sdk.api.project))).find(matches)
        if (!project) throw new Error(language.t("workspace.create.failed.title"))
        const response = await ctx.sdk.client.worktree.create({ directory: root, worktreeCreateInput: { name } })
        if (response.error || !response.data?.directory)
          throw response.error ?? new Error(language.t("workspace.create.failed.title"))
        return { project, worktree: response.data }
      },
      created: (session) => {
        remember(ctx, key, session, true)
        open(ctx, key, session)
      },
      renamed: (session, title) => {
        const current = ctx.sync.session.get(session.id) ?? session
        remember(ctx, key, { ...current, title, time: { ...current.time, updated: Date.now() } })
      },
      removed: (sessions) => forget(ctx, key, sessions),
      archived: (session) => archiveLocal(ctx, key, session),
      worktreeCreated: ({ project, worktree }) => {
        const directory = worktree.directory
        batch(() => {
          WorktreeState.pending(ctx.sdk.scope, directory)
          setState(
            "worktrees",
            workspaceSidebarMutationKey(key, pathKey(directory)),
            WorktreeState.get(ctx.sdk.scope, directory)?.status === "pending",
          )
          ctx.sync.set("project", (projects) => workspaceSidebarWorktree(projects, project, directory))
          queryClient.setQueryData<Project[]>([ctx.sdk.scope, "project"], (projects) =>
            workspaceSidebarWorktree(projects ?? [], project, directory),
          )
          ctx.sync.child(directory, { bootstrap: false })[1]("project", project.id)
          write(() => setStored("collapsed", workspaceSidebarMutationKey(key, pathKey(directory)), false))
        })
      },
    })
  }

  return {
    language,
    open: () => persistedState().open,
    toggle,
    servers: createMemo(() =>
      global.servers.list().map((conn) => ({ key: ServerConnection.key(conn), name: serverName(conn) })),
    ),
    selectedServer,
    selectServer: (key) => {
      if (!global.servers.list().some((conn) => ServerConnection.key(conn) === key)) return
      setState("selected", key)
      layout.home.setSelection({ server: key })
    },
    projects,
    loading: () => !!context() && (index.isLoading || (!context()!.sync.ready && !context()!.sync.error)),
    failed: () => index.isError || !!context()?.sync.error,
    refresh: () => {
      const ctx = context()
      if (!ctx) return
      void Promise.all([
        index.refetch(),
        queryClient.refetchQueries({ queryKey: [ctx.sdk.scope, "bootstrap"], exact: true }),
      ]).catch(fail)
    },
    currentSession: () => route().sessionID,
    currentDirectory,
    currentServer,
    collapsed: (directory) => persistedState().collapsed[collapseKey(directory)] ?? false,
    toggleCollapsed: (directory) => {
      const key = collapseKey(directory)
      write(() => setStored("collapsed", key, (value) => !value))
    },
    pending: (resource) => {
      const key = selectedServer()
      if (!key) return false
      return (
        !!state.pending[workspaceSidebarMutationKey(key, resource)] ||
        !!state.pending[workspaceSidebarMutationKey(key, pathKey(resource))] ||
        !!state.worktrees[workspaceSidebarMutationKey(key, pathKey(resource))]
      )
    },
    openProject: () => {
      const conn = focused()
      const ctx = context()
      if (!conn || !ctx) return
      pickDirectory({
        server: conn,
        title: language.t("command.project.open"),
        multiple: true,
        onSelect: (result) => {
          const directories = [
            ...new Map(homeProjectDirectories(result).map((directory) => [pathKey(directory), directory])).values(),
          ]
          if (!directories[0]) return
          for (const directory of directories) {
            if (ctx.projects.list().some((project) => pathKey(project.worktree) === pathKey(directory))) continue
            const location = { directory }
            void ctx.sdk.api.file
              .list({ path: ".", location })
              .then(async (files) => {
                if (files.data.length > 0) return ctx.sdk.api.project.current({ location })
                return (
                  (await ctx.sdk.client.project.initGit({ directory })).data ??
                  ctx.sdk.api.project.current({ location })
                )
              })
              .then((project) => ctx.sync.child(directory, { bootstrap: false })[1]("project", project.id))
              .catch(fail)
            ctx.projects.open(directory)
          }
          ctx.projects.touch(directories[0])
          layout.home.setSelection({ server: ServerConnection.key(conn), directory: directories[0] })
        },
      })
    },
    createWorkspace: (root, name) => actions()?.createWorkspace(root, name) ?? Promise.resolve(false),
    newChat: (directory) => actions()?.newChat(directory) ?? Promise.resolve(false),
    openChat: (session) => {
      const ctx = context()
      const key = selectedServer()
      if (ctx && key) open(ctx, key, session)
    },
    renameChat: (session, title) => {
      const prev = state.localTitles[session.id]
      setState("localTitles", session.id, title)
      return (
        actions()
          ?.renameChat(session, title)
          .then((ok) => {
            if (!ok) setState("localTitles", session.id, prev as any)
            return ok
          })
          .catch((err) => {
            setState("localTitles", session.id, prev as any)
            throw err
          }) ?? Promise.resolve(false)
      )
    },
    deleteChat: (session) => {
      setState("localDeleted", session.id, true)
      return (
        actions()
          ?.deleteChat(session)
          .then((ok) => {
            if (!ok) setState("localDeleted", session.id, false)
            return ok
          })
          .catch((err) => {
            setState("localDeleted", session.id, false)
            throw err
          }) ?? Promise.resolve(false)
      )
    },
    archiveChat: (session) => {
      setState("localArchived", session.id, true)
      return (
        actions()
          ?.archiveChat(session)
          .then((ok) => {
            if (!ok) setState("localArchived", session.id, false)
            return ok
          })
          .catch((err) => {
            setState("localArchived", session.id, false)
            throw err
          }) ?? Promise.resolve(false)
      )
    },
    settings: () => {
      const key = selectedServer()
      if (key) global.settings.server.set(key)
      settings()
    },
    search: () => command.show(),
  }
}
