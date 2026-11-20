import type { Session } from "@sutradhar/sdk/v2/client"
import { Icon } from "@sutradhar/ui/v2/icon"
import { MenuV2 } from "@sutradhar/ui/v2/menu-v2"
import { createMemo, createUniqueId, For, Show, type Accessor } from "solid-js"
import { createStore } from "solid-js/store"
import { pathKey } from "@/utils/path-key"
import { createSidepaneController, type SidepaneController } from "./sidepane-controller"
import { displaySidepaneSessionTitle } from "./sidepane-data"
import type { SidebarProject, SidebarWorkspace, WorkspaceSidebarController } from "../workspace-sidebar-types"
import "./sidepane.css"

function createKeyedItems<T>(items: Accessor<readonly T[]>, key: (item: T) => string) {
  const entries = createMemo(() => new Map(items().map((item) => [key(item), item])))
  return {
    keys: createMemo(() => [...entries().keys()]),
    get: (itemKey: string) => entries().get(itemKey),
  }
}

function createAction() {
  const [state, setState] = createStore({ busy: false, failed: false })
  return {
    state,
    clear: () => setState("failed", false),
    async run(action: () => Promise<boolean>) {
      if (state.busy) return false
      setState({ busy: true, failed: false })
      try {
        const success = await action()
        setState("failed", !success)
        return success
      } catch {
        setState("failed", true)
        return false
      } finally {
        setState("busy", false)
      }
    },
  }
}

function focusInput(input: HTMLInputElement) {
  queueMicrotask(() => {
    if (!input.isConnected || input.closest("[inert]")) return
    input.focus({ preventScroll: true })
    input.select()
  })
}

function focusControl(button: HTMLButtonElement | undefined) {
  queueMicrotask(() => {
    if (button?.isConnected && !button.closest("[inert]")) button.focus({ preventScroll: true })
  })
}

function SidepaneSessionRow(props: {
  controller: WorkspaceSidebarController
  session: Session
  directory: string
  expanded: boolean
}) {
  const language = props.controller.language
  const [state, setState] = createStore({ mode: "view" as "view" | "rename" | "delete", title: "" })
  const action = createAction()
  const id = createUniqueId()
  let trigger: HTMLButtonElement | undefined

  const pending = () =>
    action.state.busy || props.controller.pending(props.session.id) || props.controller.pending(props.directory)

  const active = () =>
    props.controller.currentSession() === props.session.id &&
    pathKey(props.controller.currentDirectory() ?? "") === pathKey(props.directory) &&
    props.controller.currentServer() === props.controller.selectedServer()

  const close = () => {
    if (pending()) return
    setState("mode", "view")
    action.clear()
    focusControl(trigger)
  }

  const rename = async () => {
    const title = state.title.trim()
    if (pending() || !title) return
    if (await action.run(() => props.controller.renameChat(props.session, title))) close()
  }

  const remove = async () => {
    if (pending()) return
    if (await action.run(() => props.controller.deleteChat(props.session))) close()
  }

  const archive = async () => {
    if (pending()) return
    if (await action.run(() => props.controller.archiveChat(props.session))) close()
  }

  const title = () => displaySidepaneSessionTitle(props.session, language.t("command.session.new"))

  return (
    <li
      class="workspace-sidebar__session"
      data-session-id={props.session.id}
      data-active={active() ? "true" : undefined}
      aria-busy={pending()}
    >
      <Show when={state.mode === "view"}>
        <div class="workspace-sidebar__session-row">
          <button
            type="button"
            class="workspace-sidebar__session-link"
            aria-current={active() ? "page" : undefined}
            disabled={pending()}
            title={title()}
            onClick={() => props.controller.openChat(props.session)}
          >
            <span class="workspace-sidebar__active-dot" aria-hidden="true" />
            <span class="workspace-sidebar__session-title" dir="auto">
              {title()}
            </span>
          </button>
          <Show when={props.controller.open() && props.expanded}>
            <MenuV2 gutter={4} placement="bottom-end">
              <MenuV2.Trigger
                ref={trigger}
                class="workspace-sidebar__icon-button workspace-sidebar__session-menu"
                aria-label={language.t("common.moreOptions")}
                title={language.t("common.moreOptions")}
                disabled={pending()}
              >
                <Icon name="outline-dots" />
              </MenuV2.Trigger>
              <MenuV2.Portal>
                <MenuV2.Content
                  class="workspace-sidebar__menu"
                  dir={language.direction()}
                  onCloseAutoFocus={(event) => {
                    if (state.mode !== "view") event.preventDefault()
                  }}
                >
                  <MenuV2.Item
                    onSelect={() => {
                      action.clear()
                      setState({ mode: "rename", title: title() })
                    }}
                  >
                    {language.t("common.rename")}
                  </MenuV2.Item>
                  <MenuV2.Item
                    onSelect={() => {
                      action.clear()
                      void archive()
                    }}
                  >
                    {language.t("common.archive")}
                  </MenuV2.Item>
                  <MenuV2.Item
                    onSelect={() => {
                      action.clear()
                      setState("mode", "delete")
                    }}
                  >
                    {language.t("common.delete")}
                  </MenuV2.Item>
                </MenuV2.Content>
              </MenuV2.Portal>
            </MenuV2>
          </Show>
        </div>
      </Show>

      <Show when={state.mode === "rename"}>
        <form
          class="workspace-sidebar__inline-form"
          aria-label={language.t("common.rename")}
          onSubmit={(event) => {
            event.preventDefault()
            void rename()
          }}
          onKeyDown={(event) => {
            if (event.isComposing || event.key !== "Escape") return
            event.preventDefault()
            event.stopPropagation()
            close()
          }}
        >
          <input
            ref={focusInput}
            class="workspace-sidebar__input"
            aria-label={language.t("common.rename")}
            aria-invalid={action.state.failed || undefined}
            dir="auto"
            value={state.title}
            disabled={pending()}
            onInput={(event) => setState("title", event.currentTarget.value)}
            onKeyDown={(event) => {
              if (event.key !== "Enter") return
              event.preventDefault()
              if (!event.isComposing) void rename()
            }}
          />
          <div class="workspace-sidebar__form-actions">
            <button
              class="workspace-sidebar__button workspace-sidebar__button--solid"
              type="submit"
              disabled={pending() || !state.title.trim()}
            >
              {language.t(action.state.busy ? "common.loading" : "common.save")}
            </button>
            <button class="workspace-sidebar__button" type="button" disabled={pending()} onClick={close}>
              {language.t("common.cancel")}
            </button>
          </div>
        </form>
      </Show>

      <Show when={state.mode === "delete"}>
        <div
          class="workspace-sidebar__inline-form"
          role="group"
          aria-labelledby={`${id}-confirm`}
          onKeyDown={(event) => {
            if (event.key !== "Escape" || event.isComposing) return
            event.preventDefault()
            event.stopPropagation()
            close()
          }}
        >
          <p id={`${id}-confirm`} dir="auto">
            {language.t("session.delete.confirm", { name: title() })}
          </p>
          <div class="workspace-sidebar__form-actions">
            <button
              class="workspace-sidebar__button workspace-sidebar__button--danger"
              type="button"
              disabled={pending()}
              onClick={() => void remove()}
            >
              {language.t(action.state.busy ? "common.loading" : "session.delete.button")}
            </button>
            <button
              ref={focusControl}
              class="workspace-sidebar__button"
              type="button"
              disabled={pending()}
              onClick={close}
            >
              {language.t("common.cancel")}
            </button>
          </div>
        </div>
      </Show>

      <Show when={action.state.failed}>
        <p class="workspace-sidebar__error" role="alert">
          {language.t("common.requestFailed")}
        </p>
      </Show>
    </li>
  )
}

function SidepaneWorkspaceGroup(props: {
  controller: WorkspaceSidebarController
  workspace: SidebarWorkspace
  flat?: boolean
  collapseId?: string
  forceExpanded?: boolean
}) {
  const language = props.controller.language
  const localId = createUniqueId()
  const id = () => props.collapseId ?? localId
  const action = createAction()
  const [list, setList] = createStore({ limit: 20 })
  const sessions = createKeyedItems(
    () => props.workspace.sessions,
    (session) => session.id,
  )

  const expanded = () => props.forceExpanded || !props.controller.collapsed(props.workspace.directory)
  const pending = () => action.state.busy || props.controller.pending(props.workspace.directory)
  const current = () =>
    pathKey(props.controller.currentDirectory() ?? "") === pathKey(props.workspace.directory) &&
    props.controller.currentServer() === props.controller.selectedServer()
  const name = () => (props.workspace.main ? language.t("sidebar.workspaces.main") : props.workspace.name)
  const visibleSessions = createMemo(() =>
    sessions.keys().filter((key, index) => index < list.limit || key === props.controller.currentSession()),
  )

  return (
    <section
      class="workspace-sidebar__workspace"
      data-flat={props.flat || undefined}
      data-current={current() || undefined}
      aria-label={name()}
      aria-busy={pending()}
    >
      <Show when={!props.flat}>
        <div class="workspace-sidebar__workspace-header">
          <button
            type="button"
            class="workspace-sidebar__disclosure"
            aria-expanded={expanded()}
            aria-controls={id()}
            title={props.workspace.directory}
            onClick={() => props.controller.toggleCollapsed(props.workspace.directory)}
          >
            <Icon name="chevron-down" class="workspace-sidebar__chevron" data-expanded={expanded()} />
            <Icon name={props.workspace.main ? "folder" : "branch"} />
            <span class="workspace-sidebar__truncate" dir="auto">
              {name()}
            </span>
          </button>
          <div class="workspace-sidebar__row-actions">
            <button
              class="workspace-sidebar__icon-button"
              type="button"
              disabled={pending()}
              aria-label={language.t("command.session.new")}
              title={language.t("command.session.new")}
              onClick={() => void action.run(() => props.controller.newChat(props.workspace.directory))}
            >
              <Icon name="plus" />
            </button>
          </div>
        </div>
      </Show>

      <div
        id={id()}
        class="workspace-sidebar__collapse"
        data-expanded={expanded()}
        inert={!expanded()}
        aria-hidden={!expanded()}
      >
        <div class="workspace-sidebar__collapse-inner">
          <div class="workspace-sidebar__chats">
            <Show
              when={props.workspace.sessions.length > 0}
              fallback={<p class="workspace-sidebar__no-chats">{language.t("sidebar.workspaces.noChats")}</p>}
            >
              <ul class="workspace-sidebar__sessions" aria-label={language.t("sidebar.project.recentSessions")}>
                <For each={visibleSessions()}>
                  {(key) => (
                    <Show when={sessions.get(key)}>
                      {(session) => (
                        <SidepaneSessionRow
                          controller={props.controller}
                          session={session()}
                          directory={props.workspace.directory}
                          expanded={expanded()}
                        />
                      )}
                    </Show>
                  )}
                </For>
              </ul>
              <Show when={sessions.keys().length > list.limit}>
                <button
                  type="button"
                  class="workspace-sidebar__load-more"
                  onClick={() => setList("limit", (value) => value + 20)}
                >
                  {language.t("common.loadMore")}
                </button>
              </Show>
            </Show>
          </div>
        </div>
      </div>

      <Show when={pending()}>
        <p class="workspace-sidebar__preparing" role="status">
          {language.t("common.loading")}
        </p>
      </Show>
      <Show when={action.state.failed}>
        <p class="workspace-sidebar__error" role="alert">
          {language.t("common.requestFailed")}
        </p>
      </Show>
    </section>
  )
}

function SidepaneProjectCard(props: {
  controller: WorkspaceSidebarController
  project: SidebarProject
  forceExpanded?: boolean
}) {
  const language = props.controller.language
  const [state, setState] = createStore({ creating: false, name: "" })
  const action = createAction()
  const chatAction = createAction()
  const workspaces = createKeyedItems(
    () => props.project.workspaces,
    (workspace) => workspace.directory,
  )

  const singleWorkspace = createMemo(() =>
    props.project.workspaces.length === 1 && props.project.workspaces[0]?.main
      ? props.project.workspaces[0]
      : undefined,
  )

  const singleExpanded = () => {
    if (props.forceExpanded) return true
    const ws = singleWorkspace()
    return ws ? !props.controller.collapsed(ws.directory) : true
  }

  const totalSessions = createMemo(() =>
    props.project.workspaces.reduce((sum, ws) => sum + ws.sessions.length, 0),
  )

  const currentProject = () =>
    props.project.workspaces.some(
      (ws) =>
        pathKey(props.controller.currentDirectory() ?? "") === pathKey(ws.directory) &&
        props.controller.currentServer() === props.controller.selectedServer(),
    )

  const id = createUniqueId()
  const collapseId = createUniqueId()
  let trigger: HTMLButtonElement | undefined
  const pending = () =>
    action.state.busy || chatAction.state.busy || props.controller.pending(props.project.root)

  const close = () => {
    if (pending()) return
    setState({ creating: false, name: "" })
    action.clear()
    focusControl(trigger)
  }

  const save = async () => {
    const name = state.name.trim()
    if (pending() || !props.project.git || !name) return
    if (await action.run(() => props.controller.createWorkspace(props.project.root, name))) close()
  }

  return (
    <section
      class="workspace-sidebar__project"
      data-project-root={props.project.root}
      data-current={currentProject() || undefined}
      aria-labelledby={`${id}-title`}
    >
      <div class="workspace-sidebar__project-header" data-current={currentProject() || undefined}>
        <Show
          when={singleWorkspace()}
          fallback={
            <div class="workspace-sidebar__project-main">
              <span class="workspace-sidebar__project-mark" aria-hidden="true">
                <Icon name="folder" />
              </span>
              <h3 id={`${id}-title`} class="workspace-sidebar__truncate" title={props.project.root}>
                <span dir="auto">{props.project.name}</span>
              </h3>
              <Show when={totalSessions() > 0}>
                <span class="workspace-sidebar__project-count">{totalSessions()}</span>
              </Show>
            </div>
          }
        >
          {(ws) => (
            <button
              type="button"
              class="workspace-sidebar__project-main"
              aria-expanded={singleExpanded()}
              aria-controls={collapseId}
              title={props.project.root}
              onClick={() => props.controller.toggleCollapsed(ws().directory)}
            >
              <Icon name="chevron-down" class="workspace-sidebar__chevron" data-expanded={singleExpanded()} />
              <span class="workspace-sidebar__project-mark" aria-hidden="true">
                <Icon name="folder" />
              </span>
              <h3 id={`${id}-title`} class="workspace-sidebar__truncate">
                <span dir="auto">{props.project.name}</span>
              </h3>
              <Show when={totalSessions() > 0}>
                <span class="workspace-sidebar__project-count">{totalSessions()}</span>
              </Show>
            </button>
          )}
        </Show>

        <div class="workspace-sidebar__row-actions">
          <Show when={singleWorkspace()}>
            {(ws) => (
              <button
                class="workspace-sidebar__icon-button"
                type="button"
                disabled={pending()}
                aria-label={language.t("command.session.new")}
                title={language.t("command.session.new")}
                onClick={() => void chatAction.run(() => props.controller.newChat(ws().directory))}
              >
                <Icon name="plus" />
              </button>
            )}
          </Show>
          <Show when={props.project.git}>
            <button
              ref={trigger}
              class="workspace-sidebar__icon-button"
              type="button"
              aria-label={language.t("workspace.new")}
              title={language.t("workspace.new")}
              aria-expanded={state.creating}
              aria-controls={`${id}-create`}
              disabled={pending()}
              onClick={() => {
                if (state.creating) return close()
                action.clear()
                setState("creating", true)
              }}
            >
              <Icon name="workspace-new" />
            </button>
          </Show>
        </div>
      </div>

      <Show when={state.creating}>
        <form
          id={`${id}-create`}
          class="workspace-sidebar__inline-form"
          aria-label={language.t("sidebar.workspaces.create")}
          aria-busy={pending()}
          onSubmit={(event) => {
            event.preventDefault()
            void save()
          }}
          onKeyDown={(event) => {
            if (event.key !== "Escape" || event.isComposing) return
            event.preventDefault()
            event.stopPropagation()
            close()
          }}
        >
          <label for={`${id}-name`}>{language.t("sidebar.workspaces.name")}</label>
          <input
            ref={focusInput}
            id={`${id}-name`}
            class="workspace-sidebar__input"
            value={state.name}
            placeholder={language.t("sidebar.workspaces.name.placeholder")}
            autocomplete="off"
            autocapitalize="none"
            spellcheck={false}
            dir="auto"
            disabled={pending()}
            onInput={(event) => setState("name", event.currentTarget.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && event.isComposing) event.preventDefault()
            }}
          />
          <p class="workspace-sidebar__hint">{language.t("sidebar.workspaces.name.hint")}</p>
          <Show when={action.state.failed}>
            <p class="workspace-sidebar__error" role="alert">
              {language.t("common.requestFailed")}
            </p>
          </Show>
          <div class="workspace-sidebar__form-actions">
            <button
              class="workspace-sidebar__button workspace-sidebar__button--solid"
              type="submit"
              disabled={pending() || !state.name.trim() || !props.project.git}
            >
              {language.t(action.state.busy ? "common.loading" : "common.save")}
            </button>
            <button class="workspace-sidebar__button" type="button" disabled={pending()} onClick={close}>
              {language.t("common.cancel")}
            </button>
          </div>
        </form>
      </Show>

      <div class="workspace-sidebar__workspaces">
        <For each={workspaces.keys()}>
          {(key) => (
            <Show when={workspaces.get(key)}>
              {(workspace) => (
                <SidepaneWorkspaceGroup
                  controller={props.controller}
                  workspace={workspace()}
                  flat={!!singleWorkspace()}
                  collapseId={singleWorkspace() ? collapseId : undefined}
                  forceExpanded={props.forceExpanded}
                />
              )}
            </Show>
          )}
        </For>
      </div>
    </section>
  )
}

export function SidepaneView(props: { controller: WorkspaceSidebarController | SidepaneController }) {
  const language = props.controller.language
  const id = createUniqueId()
  const action = createAction()
  const projects = createKeyedItems(
    () => props.controller.projects(),
    (project) => JSON.stringify([props.controller.selectedServer(), project.root]),
  )

  const sidepaneCtrl = () =>
    "filter" in props.controller ? props.controller : undefined

  const isChatMode = () => Boolean(sidepaneCtrl()?.isChat?.())

  const directory = createMemo(() => {
    if (isChatMode()) {
      return sidepaneCtrl()?.defaultChatDirectory()
    }
    const current =
      props.controller.currentServer() === props.controller.selectedServer()
        ? props.controller.currentDirectory()
        : undefined
    return current ?? props.controller.projects()[0]?.workspaces[0]?.directory
  })

  const pending = () => {
    const value = directory()
    return action.state.busy || (!!value && props.controller.pending(value))
  }

  const selectedServer = createMemo(() =>
    props.controller.servers().find((server) => server.key === props.controller.selectedServer()),
  )

  return (
    <aside
      class="workspace-sidebar"
      data-component="sidepane"
      data-open={props.controller.open()}
      dir={language.direction()}
      aria-label={language.t("sidebar.workspaces.title")}
    >
      <nav class="workspace-sidebar__rail" aria-label={language.t("sidebar.workspaces.title")}>
        <button
          class="workspace-sidebar__icon-button"
          type="button"
          aria-label={language.t("command.sidebar.toggle")}
          title={language.t("command.sidebar.toggle")}
          aria-expanded={props.controller.open()}
          aria-controls={id}
          onClick={props.controller.toggle}
        >
          <Icon name="sidebar-right" />
        </button>
        <button
          class="workspace-sidebar__icon-button"
          type="button"
          aria-label={language.t("common.search.placeholder")}
          title={language.t("common.search.placeholder")}
          onClick={props.controller.search}
        >
          <Icon name="magnifying-glass" />
        </button>
        <button
          class="workspace-sidebar__icon-button"
          type="button"
          aria-label={language.t("command.session.new")}
          title={language.t("command.session.new")}
          disabled={!directory() || pending()}
          onClick={() => {
            const value = directory()
            if (value && !pending()) void action.run(() => props.controller.newChat(value))
          }}
        >
          <Icon name="edit" />
        </button>
        <Show when={!isChatMode()}>
          <button
            class="workspace-sidebar__icon-button"
            type="button"
            aria-label={language.t("command.project.open")}
            title={language.t("command.project.open")}
            onClick={props.controller.openProject}
          >
            <Icon name="folder-add-left" />
          </button>
        </Show>
        <Show when={action.state.failed}>
          <button
            class="workspace-sidebar__icon-button workspace-sidebar__rail-error"
            type="button"
            aria-label={language.t("palette.retry")}
            title={language.t("common.requestFailed")}
            onClick={() => {
              const value = directory()
              if (value && !pending()) void action.run(() => props.controller.newChat(value))
            }}
            disabled={!directory() || pending()}
          >
            <Icon name="reset" />
          </button>
        </Show>
        <div class="workspace-sidebar__rail-spacer" />
        <button
          class="workspace-sidebar__icon-button"
          type="button"
          aria-label={language.t("command.settings.open")}
          title={language.t("command.settings.open")}
          onClick={props.controller.settings}
        >
          <Icon name="settings-gear" />
        </button>
      </nav>

      <div
        id={id}
        class="workspace-sidebar__panel"
        inert={!props.controller.open()}
        aria-hidden={!props.controller.open()}
      >
        <header class="workspace-sidebar__header">
          <div class="workspace-sidebar__header-row">
            <h2>{isChatMode() ? "Chats" : language.t("sidebar.workspaces.title")}</h2>
            <Show when={isChatMode() ? sidepaneCtrl()?.chats().length : sidepaneCtrl()?.sessionCount()}>
              {(count) => <span class="workspace-sidebar__project-count">{count()}</span>}
            </Show>
          </div>

          <Show
            when={isChatMode()}
            fallback={
              <button
                class="workspace-sidebar__button workspace-sidebar__open-project"
                type="button"
                onClick={props.controller.openProject}
              >
                <Icon name="folder-add-left" />
                {language.t("command.project.open")}
              </button>
            }
          >
            <button
              class="workspace-sidebar__button workspace-sidebar__open-project"
              type="button"
              disabled={!directory() || pending()}
              onClick={() => {
                const value = directory()
                if (value && !pending()) void action.run(() => props.controller.newChat(value))
              }}
            >
              <Icon name="edit" />
              {language.t("command.session.new")}
            </button>
          </Show>

          <Show when={sidepaneCtrl()}>
            {(ctrl) => (
              <div class="workspace-sidebar__search">
                <Icon name="magnifying-glass" size="small" />
                <input
                  type="text"
                  value={ctrl().filter()}
                  placeholder={language.t("common.search.placeholder")}
                  spellcheck={false}
                  autocomplete="off"
                  onInput={(e) => ctrl().setFilter(e.currentTarget.value)}
                />
                <Show when={ctrl().filter().length > 0}>
                  <button
                    type="button"
                    class="workspace-sidebar__icon-button"
                    aria-label={language.t("common.clear")}
                    onClick={() => ctrl().clearFilter()}
                  >
                    <Icon name="circle-x" size="small" />
                  </button>
                </Show>
              </div>
            )}
          </Show>

          <Show when={props.controller.servers().length > 1}>
            <MenuV2 gutter={5} placement="bottom-start">
              <MenuV2.Trigger class="workspace-sidebar__server">
                <Icon name="monitor" />
                <span class="workspace-sidebar__truncate" dir="auto">
                  {selectedServer()?.name ?? language.t("workspace.type.local")}
                </span>
                <Icon name="chevron-down" />
              </MenuV2.Trigger>
              <MenuV2.Portal>
                <MenuV2.Content class="workspace-sidebar__menu" dir={language.direction()}>
                  <MenuV2.RadioGroup
                    value={props.controller.selectedServer()}
                    onChange={(value) => {
                      const server = props.controller.servers().find((s) => s.key === value)
                      if (server) props.controller.selectServer(server.key)
                    }}
                  >
                    <For each={props.controller.servers()}>
                      {(server) => (
                        <MenuV2.RadioItem value={server.key}>
                          <span dir="auto">{server.name}</span>
                        </MenuV2.RadioItem>
                      )}
                    </For>
                  </MenuV2.RadioGroup>
                </MenuV2.Content>
              </MenuV2.Portal>
            </MenuV2>
          </Show>
        </header>

        <div class="workspace-sidebar__scroll" aria-busy={props.controller.loading()}>
          <Show when={props.controller.loading()}>
            <p class="workspace-sidebar__status" role="status">
              {language.t("common.loading")}
            </p>
          </Show>

          <Show when={props.controller.failed()}>
            <div class="workspace-sidebar__failure">
              <p class="workspace-sidebar__error" role="alert">
                {language.t("common.requestFailed")}
              </p>
              <button
                class="workspace-sidebar__button"
                type="button"
                disabled={props.controller.loading()}
                onClick={props.controller.refresh}
              >
                <Icon name="reset" size="small" />
                {language.t("palette.retry")}
              </button>
            </div>
          </Show>

          <Show
            when={isChatMode()}
            fallback={
              <>
                <Show when={projects.keys().length > 0}>
                  <div class="workspace-sidebar__section-label">{language.t("home.projects")}</div>
                </Show>

                <For each={projects.keys()}>
                  {(key) => (
                    <Show when={projects.get(key)}>
                      {(project) => (
                        <SidepaneProjectCard
                          controller={props.controller}
                          project={project()}
                          forceExpanded={Boolean(sidepaneCtrl()?.filter().trim())}
                        />
                      )}
                    </Show>
                  )}
                </For>

                <Show when={!props.controller.loading() && !props.controller.failed() && !props.controller.projects().length}>
                  <div class="workspace-sidebar__empty">
                    <Icon name="folder" size="large" />
                    <p>
                      {sidepaneCtrl()?.filter().trim()
                        ? language.t("common.search.placeholder")
                        : language.t("sidebar.workspaces.empty")}
                    </p>
                  </div>
                </Show>
              </>
            }
          >
            <Show
              when={(sidepaneCtrl()?.chats().length ?? 0) > 0}
              fallback={
                <Show when={!props.controller.loading() && !props.controller.failed()}>
                  <div class="workspace-sidebar__empty">
                    <Icon name="bubble-5" size="large" />
                    <p>
                      {sidepaneCtrl()?.filter().trim() ? language.t("common.search.placeholder") : "No chats yet"}
                    </p>
                  </div>
                </Show>
              }
            >
              <div class="workspace-sidebar__chats px-1">
                <ul class="workspace-sidebar__sessions">
                  <For each={sidepaneCtrl()?.chats() ?? []}>
                    {(session) => (
                      <SidepaneSessionRow
                        controller={props.controller}
                        session={session}
                        directory={session.directory}
                        expanded={props.controller.open()}
                      />
                    )}
                  </For>
                </ul>
              </div>
            </Show>
          </Show>
        </div>
      </div>
    </aside>
  )
}

export function Sidepane() {
  const controller = createSidepaneController()
  return <SidepaneView controller={controller} />
}
