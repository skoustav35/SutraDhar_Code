import { getDirectory, getFilename } from "@sutradhar/core/util/path"
import { FileIcon } from "@sutradhar/ui/file-icon"
import { ScrollView } from "@sutradhar/ui/scroll-view"
import { Dialog, DialogBody, DialogTitle } from "@sutradhar/ui/v2/dialog-v2"
import { Icon } from "@sutradhar/ui/v2/icon"
import { KeybindV2 } from "@sutradhar/ui/v2/keybind-v2"
import { TextInputV2 } from "@sutradhar/ui/v2/text-input-v2"
import { useDialog } from "@sutradhar/ui/context/dialog"
import { createEffect, createMemo, createUniqueId, For, Match, onCleanup, Show, Switch } from "solid-js"
import { commandPaletteOptions, formatKeybindParts, useCommand } from "@/context/command"
import { useGlobal } from "@/context/global"
import { useLanguage } from "@/context/language"
import { ServerConnection } from "@/context/server"
import { useTabs } from "@/context/tabs"
import { SessionTabAvatar } from "@/pages/layout/session-tab-avatar"
import { getRelativeTime } from "@/utils/time"
import {
  createCommandPaletteCommandEntry,
  createCommandPaletteFileEntry,
  createCommandPaletteModel,
  createServerSessionEntries,
  type CommandPaletteEntry,
} from "./command-palette"
import { createPaletteSearch, paletteMatchSegments, type PaletteScope } from "./command-palette-search"
import "./dialog-command-palette-v2.css"

function matchesEntry(entry: CommandPaletteEntry, query: string) {
  const value = query.toLowerCase()
  return [entry.title, entry.description, entry.category].some((text) => text?.toLowerCase().includes(value))
}

export function DialogCommandPaletteV2(props: { onOpenFile?: (path: string) => void }) {
  const palette = createCommandPaletteModel(props)
  const loadItems = async (text: string) => {
    const q = text.trim()
    if (!q) return [...palette.preferredCommandEntries(), ...palette.recentFileEntries()]

    const [files, nextSessions] = await Promise.all([palette.file.searchFiles(q), Promise.resolve(palette.sessions(q))])
    const category = palette.language.t("palette.group.files")
    return [
      ...palette.commandEntries().filter((entry) => matchesEntry(entry, q)),
      ...nextSessions,
      ...files.map((path) => createCommandPaletteFileEntry(path, category)),
    ]
  }

  return (
    <CommandPaletteView
      placeholder={palette.language.t("palette.search.placeholder")}
      loadItems={loadItems}
      highlight={palette.highlight}
      select={palette.select}
      close={palette.close}
    />
  )
}

export function DialogHomeCommandPaletteV2(props: {
  server: ServerConnection.Any
  onSelectSession: (entry: CommandPaletteEntry) => void
}) {
  const command = useCommand()
  const dialog = useDialog()
  const global = useGlobal()
  const language = useLanguage()
  const serverCtx = global.ensureServerCtx(props.server)
  const state = { cleanup: undefined as (() => void) | void, committed: false }
  const commandEntries = createMemo(() => {
    const category = language.t("palette.group.commands")
    return commandPaletteOptions(command.options).map((option) => createCommandPaletteCommandEntry(option, category))
  })
  const sessions = createServerSessionEntries({
    server: ServerConnection.key(props.server),
    opened: serverCtx.projects.list,
    stored: () => serverCtx.sync.data.project,
    load: (search, signal) => serverCtx.sdk.api.session.list({ parentID: null, search, limit: 50 }, { signal }),
    untitled: () => language.t("command.session.new"),
    category: () => language.t("command.category.session"),
  })

  const highlight = (item: CommandPaletteEntry | undefined) => {
    state.cleanup?.()
    state.cleanup = undefined
    if (item?.type !== "command") return
    state.cleanup = item.option?.onHighlight?.()
  }
  const select = (item: CommandPaletteEntry | undefined) => {
    if (!item) return
    state.committed = true
    state.cleanup = undefined
    dialog.close()
    if (item.type === "command") {
      item.option?.onSelect?.("palette")
      return
    }
    if (item.type === "session") props.onSelectSession(item)
  }
  const loadItems = async (text: string) => {
    const query = text.trim()
    if (!query) return commandEntries().slice(0, 5)
    return [...commandEntries().filter((entry) => matchesEntry(entry, query)), ...(await sessions(query))]
  }

  onCleanup(() => {
    if (state.committed) return
    state.cleanup?.()
  })

  return (
    <CommandPaletteView
      placeholder={language.t("palette.search.placeholder.home")}
      files={false}
      loadItems={loadItems}
      highlight={highlight}
      select={select}
      close={() => dialog.close()}
    />
  )
}

export function CommandPaletteView(props: {
  placeholder: string
  files?: boolean
  loadItems: (text: string) => CommandPaletteEntry[] | Promise<CommandPaletteEntry[]>
  highlight: (item: CommandPaletteEntry | undefined) => void
  select: (item: CommandPaletteEntry | undefined) => void
  close: () => void
}) {
  const language = useLanguage()
  const tabs = useTabs()
  const returnFocus =
    typeof document !== "undefined" && document.activeElement instanceof HTMLElement
      ? document.activeElement
      : undefined
  const search = createPaletteSearch(props.loadItems)
  const id = createUniqueId()
  const listId = `${id}-results`
  const optionId = (entry: CommandPaletteEntry) => `${id}-${encodeURIComponent(entry.id)}`
  const scopes = createMemo<{ id: PaletteScope; label: string }[]>(() => [
    { id: "all", label: language.t("palette.scope.all") },
    { id: "command", label: language.t("palette.group.commands") },
    ...(props.files === false ? [] : [{ id: "file" as const, label: language.t("palette.group.files") }]),
    { id: "session", label: language.t("palette.scope.sessions") },
  ])
  const openSessions = createMemo(
    () => new Set(tabs.store.flatMap((tab) => (tab.type === "session" ? [`${tab.server}\0${tab.sessionId}`] : []))),
  )

  createEffect(() => {
    props.highlight(search.selection())
  })

  onCleanup(() => {
    requestAnimationFrame(() => {
      // An action can open another dialog. Never steal focus from that new surface.
      if (!returnFocus?.isConnected || document.activeElement !== document.body) return
      returnFocus.focus({ preventScroll: true })
    })
  })

  let resultsRef: HTMLDivElement | undefined
  let inputRef: HTMLInputElement | undefined

  createEffect(() => {
    search.entries()
    resultsRef?.scrollTo({ top: 0 })
  })

  const move = (delta: -1 | 1) => {
    search.move(delta)
    requestAnimationFrame(() => {
      resultsRef?.querySelector("[data-active]")?.scrollIntoView({ block: "nearest", inline: "nearest" })
    })
  }

  const handleKeyDown = (event: KeyboardEvent) => {
    if (event.isComposing || event.keyCode === 229) return
    if (event.key === "ArrowDown") {
      event.preventDefault()
      move(1)
      return
    }
    if (event.key === "ArrowUp") {
      event.preventDefault()
      move(-1)
      return
    }
    if (event.key === "Enter") {
      event.preventDefault()
      props.select(search.selection())
      return
    }
    if (event.key === "Escape") {
      event.preventDefault()
      event.stopPropagation()
      props.close()
    }
  }

  return (
    <Dialog class="command-palette-v2" size="large">
      <DialogBody class="command-palette-v2-body">
        <div class="command-palette-v2-sr-only">
          <DialogTitle>{language.t("command.palette")}</DialogTitle>
        </div>
        <div class="command-palette-v2-search">
          <TextInputV2
            ref={(el) => {
              inputRef = el
              requestAnimationFrame(() => el.focus({ preventScroll: true }))
            }}
            value={search.state.query}
            autocomplete="off"
            spellcheck={false}
            appearance="large"
            placeholder={props.placeholder}
            aria-label={props.placeholder}
            role="combobox"
            aria-autocomplete="list"
            aria-expanded="true"
            aria-controls={listId}
            aria-activedescendant={search.selection() ? optionId(search.selection()!) : undefined}
            leadingIcon={<Icon name="magnifying-glass" aria-hidden="true" />}
            showClearButton={search.state.query.length > 0}
            clearLabel={language.t("common.clear")}
            onClearClick={() => {
              search.search("")
              inputRef?.focus()
            }}
            onInput={(event) => search.search(event.currentTarget.value)}
            onKeyDown={handleKeyDown}
          />
          <button
            type="button"
            class="command-palette-v2-close"
            aria-label={language.t("common.close")}
            onClick={props.close}
          >
            <KeybindV2 keys={[language.t("common.key.esc")]} variant="ghost" aria-hidden="true" />
          </button>
        </div>
        <div class="command-palette-v2-scopes" role="group" aria-label={language.t("common.search.placeholder")}>
          <For each={scopes()}>
            {(scope) => (
              <button
                type="button"
                class="command-palette-v2-scope"
                aria-pressed={search.state.scope === scope.id}
                onClick={() => {
                  search.scope(scope.id)
                  inputRef?.focus()
                }}
              >
                {scope.label}
              </button>
            )}
          </For>
        </div>
        <div class="command-palette-v2-progress" data-loading={search.loading() ? "" : undefined} aria-hidden="true" />
        <ScrollView class="command-palette-v2-scroll" viewportRef={(el) => (resultsRef = el)}>
          <div class="command-palette-v2-results">
            <div id={listId} role="listbox" aria-label={props.placeholder} aria-busy={search.loading()}>
              <For each={search.groups()}>
                {(group, index) => (
                  <div
                    class="command-palette-v2-group"
                    role="group"
                    aria-labelledby={group.category ? `${id}-group-${index()}` : undefined}
                  >
                    <Show when={group.category}>
                      <div class="command-palette-v2-group-title" id={`${id}-group-${index()}`}>
                        {group.category}
                      </div>
                    </Show>
                    <For each={group.entries}>
                      {(item) => (
                        <PaletteRow
                          id={optionId(item)}
                          item={item}
                          query={search.state.query}
                          active={search.active()?.id === item.id}
                          pending={search.loading()}
                          language={language}
                          sessionOpen={
                            item.server && item.sessionID
                              ? openSessions().has(`${item.server}\0${item.sessionID}`)
                              : false
                          }
                          onActive={() => search.activate(item.id)}
                          onSelect={() => !search.loading() && props.select(item)}
                        />
                      )}
                    </For>
                  </div>
                )}
              </For>
            </div>
            <Show when={search.entries().length === 0}>
              <div class="command-palette-v2-state" role="presentation">
                <span class="command-palette-v2-state-icon" aria-hidden="true">
                  <Icon name={search.failed() ? "help" : "magnifying-glass"} />
                </span>
                <span class="command-palette-v2-state-title">
                  {search.loading()
                    ? language.t("common.loading")
                    : search.failed()
                      ? language.t("palette.error")
                      : language.t("palette.empty")}
                </span>
                <Show when={!search.loading()}>
                  <Show when={search.failed()} fallback={<span>{language.t("palette.empty.description")}</span>}>
                    <button
                      type="button"
                      class="command-palette-v2-retry"
                      onClick={() => {
                        search.retry()
                        inputRef?.focus()
                      }}
                    >
                      {language.t("palette.retry")}
                    </button>
                  </Show>
                </Show>
              </div>
            </Show>
          </div>
        </ScrollView>
        <div class="command-palette-v2-footer">
          <span class="command-palette-v2-hint">
            <KeybindV2 keys={["↑", "↓"]} variant="ghost" aria-hidden="true" />
            {language.t("palette.hint.navigate")}
          </span>
          <span class="command-palette-v2-hint">
            <KeybindV2 keys={["↵"]} variant="ghost" aria-hidden="true" />
            {language.t("palette.hint.open")}
          </span>
          <span class="command-palette-v2-footer-status" role="status" aria-live="polite">
            {search.loading()
              ? language.t("common.loading")
              : search.failed()
                ? language.t("palette.error")
                : search.entries().length === 0
                  ? language.t("palette.empty")
                  : ""}
          </span>
        </div>
      </DialogBody>
    </Dialog>
  )
}

function PaletteRow(props: {
  id: string
  item: CommandPaletteEntry
  query: string
  active: boolean
  pending: boolean
  language: ReturnType<typeof useLanguage>
  sessionOpen: boolean
  onActive: () => void
  onSelect: () => void
}) {
  const session = () =>
    props.item.server && props.item.directory && props.item.sessionID
      ? { server: props.item.server, directory: props.item.directory, sessionID: props.item.sessionID }
      : undefined

  return (
    <button
      id={props.id}
      type="button"
      class="command-palette-v2-row group"
      role="option"
      tabIndex={-1}
      aria-selected={props.active}
      aria-disabled={props.pending}
      data-active={props.active ? "" : undefined}
      data-pending={props.pending ? "" : undefined}
      onMouseMove={(event) => {
        // Ignore hover from a static cursor when keyboard scrolling moves rows underneath it.
        if (event.movementX === 0 && event.movementY === 0) return
        props.onActive()
      }}
      onMouseDown={(event) => event.preventDefault()}
      onClick={props.onSelect}
    >
      <Switch
        fallback={
          <div class="command-palette-v2-row-main">
            <span class="command-palette-v2-icon-tile" aria-hidden="true">
              <FileIcon
                node={{ path: props.item.path ?? "", type: "file" }}
                class="command-palette-v2-row-icon size-4"
              />
            </span>
            <div class="command-palette-v2-row-text" dir="ltr">
              <span class="command-palette-v2-title">
                <PaletteMatch text={getFilename(props.item.path ?? "")} query={props.query} />
              </span>
              <Show when={getDirectory(props.item.path ?? "")}>
                <span class="command-palette-v2-description">
                  <PaletteMatch text={getDirectory(props.item.path ?? "")} query={props.query} />
                </span>
              </Show>
            </div>
          </div>
        }
      >
        <Match when={props.item.type === "command"}>
          <div class="command-palette-v2-row-main">
            <span class="command-palette-v2-icon-tile" aria-hidden="true">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="m3 4 4 4-4 4m6 0h4" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" />
              </svg>
            </span>
            <div class="command-palette-v2-row-text">
              <bdi class="command-palette-v2-title" dir="auto">
                <PaletteMatch text={props.item.title} query={props.query} />
              </bdi>
              <Show when={props.item.description}>
                <bdi class="command-palette-v2-description" dir="auto">
                  <PaletteMatch text={props.item.description!} query={props.query} />
                </bdi>
              </Show>
            </div>
          </div>
          <Show when={props.item.keybind}>
            <KeybindV2
              keys={formatKeybindParts(props.item.keybind ?? "", props.language.t)}
              variant="neutral"
              dir="ltr"
            />
          </Show>
        </Match>
        <Match when={props.item.type === "session"}>
          <div class="command-palette-v2-row-main">
            <div class="command-palette-v2-avatar">
              <Show when={props.sessionOpen}>
                <span aria-hidden="true" class="command-palette-v2-session-open" />
              </Show>
              <Show when={session()}>
                {(session) => (
                  <SessionTabAvatar
                    project={props.item.project}
                    directory={session().directory}
                    sessionId={session().sessionID}
                    server={session().server}
                  />
                )}
              </Show>
            </div>
            <div class="command-palette-v2-row-text">
              <bdi class="command-palette-v2-title" dir="auto" classList={{ "opacity-70": !!props.item.archived }}>
                <PaletteMatch text={props.item.title} query={props.query} />
              </bdi>
              <Show when={props.item.description}>
                <bdi
                  class="command-palette-v2-description"
                  dir="auto"
                  classList={{ "opacity-70": !!props.item.archived }}
                >
                  <PaletteMatch text={props.item.description!} query={props.query} />
                </bdi>
              </Show>
            </div>
          </div>
          <Show when={props.item.updated}>
            <span class="command-palette-v2-meta">
              {getRelativeTime(new Date(props.item.updated!).toISOString(), props.language.t)}
            </span>
          </Show>
        </Match>
      </Switch>
      <span class="command-palette-v2-row-enter" aria-hidden="true">
        ↵
      </span>
    </button>
  )
}

function PaletteMatch(props: { text: string; query: string }) {
  return (
    <For each={paletteMatchSegments(props.text, props.query)}>
      {(part) => (
        <Show when={part.match} fallback={part.text}>
          <mark>{part.text}</mark>
        </Show>
      )}
    </For>
  )
}
