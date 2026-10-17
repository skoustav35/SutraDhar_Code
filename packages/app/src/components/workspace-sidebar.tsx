import type { Session } from "@opencode-ai/sdk/v2/client"
import { Icon } from "@opencode-ai/ui/v2/icon"
import { MenuV2 } from "@opencode-ai/ui/v2/menu-v2"
import { createMemo, createUniqueId, For, Show, type Accessor } from "solid-js"
import { createStore } from "solid-js/store"
import { pathKey } from "@/utils/path-key"
import { createWorkspaceSidebarController } from "./workspace-sidebar-controller"
import type { SidebarProject, SidebarWorkspace, WorkspaceSidebarController } from "./workspace-sidebar-types"
import "./workspace-sidebar.css"

// Query/event updates replace summary objects. Key rows by identity so an update
// does not discard an inline draft, its pending lock, or keyboard focus.
function createKeyedItems<T>(items: Accessor<readonly T[]>, key: (item: T) => string) {
  const entries = createMemo(() => new Map(items().map((item) => [key(item), item])))
  return {
    keys: createMemo(() => [...entries().keys()]),
    get: (key: string) => entries().get(key)!,
  }
}

// Keep a local lock as well as the controller's pending state: even two submits
// in the same frame must only issue one request. Failed actions keep their editor.
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
    input.focus()
    input.select()
  })
}

function focusControl(button: HTMLButtonElement | undefined) {
  queueMicrotask(() => {
    if (button?.isConnected && !button.closest("[inert]")) button.focus()
  })
}

function SessionRow(props: {
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

  return (
    <li class="workspace-sidebar__session" data-active={active() || undefined} aria-busy={pending()}>
      <Show when={state.mode === "view"}>
        <div class="workspace-sidebar__session-row">
          <button
            type="button"
            class="workspace-sidebar__session-link"
            aria-current={active() ? "page" : undefined}
            disabled={pending()}
            title={props.session.title}
            onClick={() => props.controller.openChat(props.session)}
          >
            <span class="workspace-sidebar__active-dot" aria-hidden="true" />
            <bdi class="workspace-sidebar__truncate">{props.session.title}</bdi>
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
                      setState({ mode: "rename", title: props.session.title })
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
            if (event.isComposing) return
            if (event.key === "Escape") {
              event.preventDefault()
              event.stopPropagation()
              close()
            }
          }}
        >
          <input
            ref={focusInput}
            class="workspace-sidebar__input"
            aria-label={language.t("common.rename")}
            aria-describedby={action.state.failed ? `${id}-error` : undefined}
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
          class="workspace-sidebar__inline-form workspace-sidebar__delete-confirm"
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
            {language.t("session.delete.confirm", { name: props.session.title })}
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
        <p id={`${id}-error`} class="workspace-sidebar__error" role="alert">
          {language.t("common.requestFailed")}
        </p>
      </Show>
    </li>
  )
}

function WorkspaceGroup(props: {
  controller: WorkspaceSidebarController
  workspace: SidebarWorkspace
  flat?: boolean
  collapseId?: string
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
  const expanded = () => !props.controller.collapsed(props.workspace.directory)
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
            <bdi class="workspace-sidebar__truncate">{name()}</bdi>
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
              when={props.workspace.sessions.length}
              fallback={<p class="workspace-sidebar__no-chats">{language.t("sidebar.workspaces.noChats")}</p>}
            >
              <ul class="workspace-sidebar__sessions" aria-label={language.t("sidebar.project.recentSessions")}>
                <For each={visibleSessions()}>
                  {(key) => (
                    <SessionRow
                      controller={props.controller}
                      session={sessions.get(key)}
                      directory={props.workspace.directory}
                      expanded={expanded()}
                    />
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

function ProjectCard(props: { controller: WorkspaceSidebarController; project: SidebarProject }) {
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
    const ws = singleWorkspace()
    return ws ? !props.controller.collapsed(ws.directory) : true
  }
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
                <bdi>{props.project.name}</bdi>
              </h3>
            </div>
          }
        >
          {(ws) => (
            <button
              type="button"
              class="workspace-sidebar__project-main workspace-sidebar__project-toggle"
              aria-expanded={singleExpanded()}
              aria-controls={collapseId}
              title={props.project.root}
              onClick={() => props.controller.toggleCollapsed(ws().directory)}
            >
              <span class="workspace-sidebar__project-mark" aria-hidden="true">
                <Icon name="folder" />
              </span>
              <h3 id={`${id}-title`} class="workspace-sidebar__truncate">
                <bdi>{props.project.name}</bdi>
              </h3>
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
          class="workspace-sidebar__inline-form workspace-sidebar__create-form"
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
            aria-describedby={`${id}-hint${action.state.failed ? ` ${id}-error` : ""}`}
            aria-invalid={action.state.failed || undefined}
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
          <p id={`${id}-hint`} class="workspace-sidebar__hint">
            {language.t("sidebar.workspaces.name.hint")}
          </p>
          <Show when={action.state.failed}>
            <p id={`${id}-error`} class="workspace-sidebar__error" role="alert">
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
            <WorkspaceGroup
              controller={props.controller}
              workspace={workspaces.get(key)}
              flat={!!singleWorkspace()}
              collapseId={singleWorkspace() ? collapseId : undefined}
            />
          )}
        </For>
      </div>
    </section>
  )
}

export function WorkspaceSidebarView(props: { controller: WorkspaceSidebarController }) {
  const language = props.controller.language
  const id = createUniqueId()
  const action = createAction()
  const projects = createKeyedItems(
    () => props.controller.projects(),
    (project) => JSON.stringify([props.controller.selectedServer(), project.root]),
  )
  const directory = createMemo(() => {
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
      data-open={props.controller.open()}
      dir={language.direction()}
      aria-label={language.t("sidebar.workspaces.title")}
    >
      <nav class="workspace-sidebar__rail" aria-label={language.t("sidebar.workspaces.title")}>
        <button
          class="workspace-sidebar__icon-button workspace-sidebar__toggle"
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
        <button
          class="workspace-sidebar__icon-button"
          type="button"
          aria-label={language.t("command.project.open")}
          title={language.t("command.project.open")}
          onClick={props.controller.openProject}
        >
          <Icon name="folder-add-left" />
        </button>
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
          <h2>{language.t("sidebar.workspaces.title")}</h2>
          <button
            class="workspace-sidebar__button workspace-sidebar__open-project"
            type="button"
            onClick={props.controller.openProject}
          >
            <Icon name="folder-add-left" />
            {language.t("command.project.open")}
          </button>
          <Show when={props.controller.servers().length > 1}>
            <MenuV2 gutter={5} placement="bottom-start">
              <MenuV2.Trigger class="workspace-sidebar__server">
                <Icon name="monitor" />
                <bdi class="workspace-sidebar__truncate">
                  {selectedServer()?.name ?? language.t("workspace.type.local")}
                </bdi>
                <Icon name="chevron-down" />
              </MenuV2.Trigger>
              <MenuV2.Portal>
                <MenuV2.Content class="workspace-sidebar__menu" dir={language.direction()}>
                  <MenuV2.RadioGroup
                    value={props.controller.selectedServer()}
                    onChange={(value) => {
                      const server = props.controller.servers().find((server) => server.key === value)
                      if (server) props.controller.selectServer(server.key)
                    }}
                  >
                    <For each={props.controller.servers()}>
                      {(server) => (
                        <MenuV2.RadioItem value={server.key}>
                          <bdi>{server.name}</bdi>
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
          <Show when={projects.keys().length > 0}>
            <div class="workspace-sidebar__section-label">{language.t("home.projects")}</div>
          </Show>
          <For each={projects.keys()}>
            {(key) => <ProjectCard controller={props.controller} project={projects.get(key)} />}
          </For>
          <Show when={!props.controller.loading() && !props.controller.failed() && !props.controller.projects().length}>
            <div class="workspace-sidebar__empty">
              <Icon name="folder" size="large" />
              <p>{language.t("sidebar.workspaces.empty")}</p>
            </div>
          </Show>
        </div>
      </div>
    </aside>
  )
}

export function WorkspaceSidebar() {
  const controller = createWorkspaceSidebarController()
  return <WorkspaceSidebarView controller={controller} />
}
