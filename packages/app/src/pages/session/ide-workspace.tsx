import { createEffect, createMemo, createSignal, For, Match, onMount, Show, Switch, type JSX } from "solid-js"
import type { FileDiffInfo } from "@sutradhar/app-client/promise"
import type { SnapshotFileDiff, VcsFileDiff } from "@sutradhar/sdk/v2"
import { getFilename } from "@sutradhar/core/util/path"
import { Icon } from "@sutradhar/ui/icon"
import { IconButton } from "@sutradhar/ui/icon-button"
import { FileIcon } from "@sutradhar/ui/file-icon"
import { ResizeHandle } from "@sutradhar/ui/resize-handle"
import { Tabs } from "@sutradhar/ui/tabs"
import FileTree from "@/components/file-tree"
import { useCommand } from "@/context/command"
import { useFile } from "@/context/file"
import { useLayout } from "@/context/layout"
import { useSDK } from "@/context/sdk"
import { useTerminal } from "@/context/terminal"
import { useSessionLayout } from "@/pages/session/session-layout"
import { IdeFileEditor } from "@/pages/session/ide-editor"
import { createSessionTabs } from "@/pages/session/helpers"
import { TerminalPanel } from "@/pages/session/terminal-panel"
import { TerminalPanelV2 } from "@/pages/session/terminal-panel-v2"

type IdeDiff = FileDiffInfo | SnapshotFileDiff | VcsFileDiff

const bubbleShellClass =
  "relative flex flex-col min-h-0 rounded-[20px] bg-v2-background-bg-base shadow-[var(--v2-elevation-raised)] border border-border-weak-base/60 overflow-hidden transition-[box-shadow,border-color] duration-200 ease-[cubic-bezier(0.22,1,0.36,1)]"

export function IdeWorkspace(props: {
  newLayout: boolean
  reviewCount: () => number
  diffs: () => IdeDiff[]
  renderDiffs: () => JSX.Element
  agentPane: JSX.Element
}) {
  const layout = useLayout()
  const file = useFile()
  const sdk = useSDK()
  const command = useCommand()
  const terminal = useTerminal()
  const { tabs, view } = useSessionLayout()

  const [fileFilter, setFileFilter] = createSignal("")
  const [searchResults, setSearchResults] = createSignal<string[]>([])
  const [editorMode, setEditorMode] = createSignal<"edit" | "annotate">("edit")
  const [dirtyPaths, setDirtyPaths] = createSignal<Record<string, boolean>>({})

  onMount(() => {
    if (layout.sidebar.opened()) {
      layout.sidebar.close()
    }
  })

  const setPathDirty = (filepath: string, isDirty: boolean) => {
    setDirtyPaths((prev) => {
      if (Boolean(prev[filepath]) === isDirty) return prev
      return { ...prev, [filepath]: isDirty }
    })
  }

  const tabHelper = createSessionTabs({
    tabs,
    pathFromTab: file.pathFromTab,
    normalizeTab: (tab) => (tab.startsWith("file://") ? file.tab(tab) : tab),
  })

  const openedFileTabs = createMemo(() => tabs().all().filter((t) => Boolean(file.pathFromTab(t))))
  const activeFileTab = createMemo(() => {
    const active = tabHelper.activeFileTab()
    if (active && openedFileTabs().includes(active)) return active
    return openedFileTabs()[0]
  })

  // Keep terminal view state synced when IDE bottom room is open on Terminal tab
  createEffect(() => {
    const needsTerminal = layout.ide.bottomOpened() && layout.ide.bottomTab() === "terminal"
    if (needsTerminal && !view().terminal.opened()) {
      view().terminal.open()
    }
  })

  createEffect(() => {
    const q = fileFilter().trim()
    if (!q) {
      setSearchResults([])
      return
    }
    let cancelled = false
    void file
      .searchFiles(q)
      .then((paths) => {
        if (!cancelled) setSearchResults(paths.slice(0, 60))
      })
      .catch(() => {
        if (!cancelled) setSearchResults([])
      })
    return () => {
      cancelled = true
    }
  })

  const openFileByPath = (filepath: string, focusDiff = false) => {
    const normalized = filepath.replace(/\\/g, "/")
    const nextTab = file.tab(normalized)
    void file.load(normalized)
    void tabs().open(nextTab)
    tabs().setActive(nextTab)
    if (focusDiff) {
      layout.ide.setBottomTab("diffs")
    }
  }

  return (
    <div
      data-component="ide-workspace"
      class="sutradhar-mode-enter flex flex-1 min-h-0 min-w-0 w-full overflow-hidden bg-v2-background-bg-deep p-2.5 sm:p-3 gap-2.5 sm:gap-3"
    >
      {/* LEFT BUBBLE: File Explorer & Changes */}
      <aside
        class={`shrink-0 hover:shadow-[var(--v2-elevation-floating)] ${bubbleShellClass}`}
        style={{ width: `clamp(190px, ${layout.ide.explorerWidth()}px, 26vw)` }}
      >
        <div class="flex items-center justify-between gap-2 border-b border-border-weak-base/50 px-3 h-11 shrink-0">
          <div class="flex items-center gap-0.5 rounded-xl bg-v2-background-bg-layer-01 p-0.5">
            <button
              type="button"
              onClick={() => layout.ide.setExplorerTab("files")}
              class="rounded-[9px] px-2.5 py-1 text-[11px] font-medium transition-all duration-150 cursor-pointer"
              classList={{
                "bg-v2-background-bg-base text-text-strong shadow-[var(--v2-elevation-elements)]":
                  layout.ide.explorerTab() === "files",
                "text-text-weak hover:text-text-base": layout.ide.explorerTab() !== "files",
              }}
            >
              Files
            </button>
            <button
              type="button"
              onClick={() => layout.ide.setExplorerTab("changes")}
              class="inline-flex items-center gap-1.5 rounded-[9px] px-2.5 py-1 text-[11px] font-medium transition-all duration-150 cursor-pointer"
              classList={{
                "bg-v2-background-bg-base text-text-strong shadow-[var(--v2-elevation-elements)]":
                  layout.ide.explorerTab() === "changes",
                "text-text-weak hover:text-text-base": layout.ide.explorerTab() !== "changes",
              }}
            >
              <span>Changes</span>
              <Show when={props.reviewCount() > 0}>
                <span class="rounded-full bg-v2-background-bg-layer-02 px-1.5 py-0.5 text-[10px] text-text-strong">
                  {props.reviewCount()}
                </span>
              </Show>
            </button>
          </div>
          <IconButton
            icon="magnifying-glass"
            variant="ghost"
            size="small"
            class="size-7 rounded-xl text-text-weak hover:text-text-strong hover:bg-v2-background-bg-layer-01"
            onClick={() => command.trigger("file.open")}
            aria-label="Quick open file"
          />
        </div>

        <Show when={layout.ide.explorerTab() === "files"}>
          <div class="px-2.5 pt-2.5 pb-1.5 shrink-0">
            <input
              type="search"
              value={fileFilter()}
              onInput={(e) => setFileFilter(e.currentTarget.value)}
              placeholder="Filter files…"
              class="w-full rounded-xl border border-transparent bg-v2-background-bg-layer-01/80 px-3 py-1.5 text-12-regular text-text-strong placeholder:text-text-weaker transition focus:border-border-base focus:bg-v2-background-bg-base focus:outline-none"
            />
          </div>
          <div class="flex-1 min-h-0 overflow-y-auto px-2 pb-2 pt-0.5">
            <Show
              when={fileFilter().trim().length === 0}
              fallback={
                <div class="flex flex-col gap-0.5">
                  <For
                    each={searchResults()}
                    fallback={<div class="px-2.5 py-4 text-center text-12-regular text-text-weaker">No matching files</div>}
                  >
                    {(path) => (
                      <button
                        type="button"
                        onClick={() => openFileByPath(path)}
                        class="flex items-center gap-2 rounded-xl px-2.5 py-1.5 text-left text-12-regular text-text-base transition hover:bg-v2-background-bg-layer-01/80 cursor-pointer"
                      >
                        <FileIcon node={{ path, type: "file" }} class="size-4 shrink-0" />
                        <span class="truncate">{path}</span>
                      </button>
                    )}
                  </For>
                </div>
              }
            >
              <FileTree
                path=""
                active={activeFileTab() ? file.pathFromTab(activeFileTab()!) : undefined}
                onFileClick={(node) => {
                  if (node.type === "file") openFileByPath(node.path)
                }}
              />
            </Show>
          </div>
        </Show>

        <Show when={layout.ide.explorerTab() === "changes"}>
          <div class="flex-1 min-h-0 overflow-y-auto px-2.5 py-2.5">
            <For
              each={props.diffs().filter((diff): diff is IdeDiff & { file: string } => typeof diff.file === "string" && diff.file.length > 0)}
              fallback={
                <div class="flex h-full flex-col items-center justify-center gap-1.5 px-4 py-8 text-center">
                  <div class="flex size-9 items-center justify-center rounded-2xl bg-v2-background-bg-layer-01 text-text-weak">
                    <Icon name="code-lines" size="small" />
                  </div>
                  <div class="text-12-medium text-text-strong">Clean working tree</div>
                  <div class="text-[11px] text-text-weak">Modified files will collect in this bubble.</div>
                </div>
              }
            >
              {(diff) => (
                <button
                  type="button"
                  onClick={() => openFileByPath(diff.file, true)}
                  class="flex w-full items-center justify-between gap-2 rounded-xl px-2.5 py-2 text-left text-12-regular text-text-base transition hover:bg-v2-background-bg-layer-01/80 cursor-pointer"
                >
                  <div class="flex min-w-0 items-center gap-2">
                    <FileIcon node={{ path: diff.file, type: "file" }} class="size-4 shrink-0" />
                    <span class="truncate">{getFilename(diff.file)}</span>
                  </div>
                  <span class="shrink-0 rounded-full bg-v2-background-bg-layer-01 px-2 py-0.5 font-mono text-[10px] text-text-weak">
                    +{diff.additions ?? 0}/-{diff.deletions ?? 0}
                  </span>
                </button>
              )}
            </For>
          </div>
        </Show>

        <ResizeHandle
          direction="horizontal"
          edge="end"
          size={layout.ide.explorerWidth()}
          min={210}
          max={440}
          onResize={(width) => layout.ide.resizeExplorer(width)}
        />
      </aside>

      {/* MIDDLE COLUMN: Isolated Editor Canvas Bubble + Isolated Bottom Dock Bubble */}
      <section class="flex-1 min-w-0 min-h-0 flex flex-col gap-2.5 sm:gap-3">
        {/* CENTER TOP BUBBLE: Open File Tabs + Editor Content */}
        <div class={`flex-1 ${bubbleShellClass}`}>
          <div class="flex items-center justify-between gap-2 border-b border-border-weak-base/50 px-3 h-11 shrink-0 overflow-x-auto no-scrollbar">
            <div class="flex items-center gap-1.5 min-w-0">
              <Show
                when={openedFileTabs().length > 0}
                fallback={
                  <div class="inline-flex items-center gap-2 rounded-full bg-v2-background-bg-layer-01/85 px-2.5 py-1 text-[11px] font-medium text-text-weak">
                    <Icon name="code" size="small" />
                    <span>{getFilename(sdk().directory) || "Editor"}</span>
                  </div>
                }
              >
                <For each={openedFileTabs()}>
                  {(tab) => {
                    const filepath = () => file.pathFromTab(tab) || tab
                    const isActive = () => activeFileTab() === tab
                    const isDirty = () => Boolean(dirtyPaths()[filepath()])
                    return (
                      <div
                        class="group inline-flex h-7.5 items-center gap-1.5 rounded-xl px-2.5 text-12-regular transition-all duration-150"
                        classList={{
                          "bg-v2-background-bg-layer-01 text-text-strong shadow-[var(--v2-elevation-elements)]": isActive(),
                          "text-text-weak hover:text-text-base hover:bg-v2-background-bg-layer-01/60": !isActive(),
                        }}
                      >
                        <button
                          type="button"
                          onClick={() => tabs().setActive(tab)}
                          class="inline-flex items-center gap-1.5 max-w-[180px] truncate cursor-pointer"
                          title={filepath()}
                        >
                          <FileIcon node={{ path: filepath(), type: "file" }} class="size-3.5 shrink-0" />
                          <span class="truncate">{getFilename(filepath())}</span>
                          <Show when={isDirty()}>
                            <span
                              class="size-1.5 shrink-0 rounded-full bg-[#2563eb]"
                              title="Unsaved changes"
                            />
                          </Show>
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation()
                            tabs().close(tab)
                          }}
                          class="rounded-full p-0.5 text-text-weaker transition hover:text-text-strong hover:bg-v2-background-bg-base cursor-pointer"
                          aria-label={`Close ${getFilename(filepath())}`}
                        >
                          <Icon name="close-small" size="small" />
                        </button>
                      </div>
                    )
                  }}
                </For>
              </Show>
            </div>
            <div class="flex items-center gap-1.5 shrink-0">
              <Show when={activeFileTab()}>
                <div
                  role="group"
                  aria-label="Editor view"
                  class="flex items-center gap-0.5 rounded-xl bg-v2-background-bg-layer-01 p-0.5"
                >
                  <button
                    type="button"
                    onClick={() => setEditorMode("edit")}
                    class="rounded-[9px] px-2.5 py-1 text-[11px] font-medium transition-all duration-150 cursor-pointer"
                    classList={{
                      "bg-v2-background-bg-base text-text-strong shadow-[var(--v2-elevation-elements)]":
                        editorMode() === "edit",
                      "text-text-weak hover:text-text-base": editorMode() !== "edit",
                    }}
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditorMode("annotate")}
                    class="rounded-[9px] px-2.5 py-1 text-[11px] font-medium transition-all duration-150 cursor-pointer"
                    classList={{
                      "bg-v2-background-bg-base text-text-strong shadow-[var(--v2-elevation-elements)]":
                        editorMode() === "annotate",
                      "text-text-weak hover:text-text-base": editorMode() !== "annotate",
                    }}
                  >
                    AI Comments
                  </button>
                </div>
              </Show>
              <button
                type="button"
                onClick={() => layout.ide.toggleBottom()}
                class="inline-flex h-7.5 items-center gap-1.5 rounded-xl bg-v2-background-bg-layer-01/85 px-2.5 text-[11px] font-medium text-text-base transition hover:bg-v2-background-bg-layer-02 hover:text-text-strong cursor-pointer"
                title="Toggle Terminal & Diffs bubble"
              >
                <Icon name="console" size="small" />
                <span>{layout.ide.bottomOpened() ? "Hide Dock" : "Terminal & Diffs"}</span>
              </button>
            </div>
          </div>

          <div class="flex-1 min-h-0 overflow-hidden flex flex-col">
            <Show
              when={activeFileTab()}
              fallback={
                <div class="flex h-full w-full flex-col items-center justify-center px-6 text-center">
                  <div class="max-w-sm space-y-4">
                    <div class="mx-auto flex size-12 items-center justify-center rounded-2xl bg-v2-background-bg-layer-01 shadow-[var(--v2-elevation-elements)] text-text-strong">
                      <Icon name="code" size="medium" />
                    </div>
                    <div class="space-y-1.5">
                      <div class="text-15-medium tracking-[-0.01em] text-text-strong">
                        {getFilename(sdk().directory) || "Sutradhar IDE"}
                      </div>
                      <p class="text-12-regular text-text-weak leading-relaxed">
                        Pick a file from Explorer on the left to inspect or edit code, run commands below, and pair with Agents on the right.
                      </p>
                    </div>
                    <div class="flex flex-wrap items-center justify-center gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => command.trigger("file.open")}
                        class="rounded-xl bg-v2-background-bg-layer-01 px-3.5 py-1.5 text-12-medium text-text-strong shadow-[var(--v2-elevation-elements)] transition hover:bg-v2-background-bg-layer-02 cursor-pointer"
                      >
                        Quick Open File
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          layout.ide.setBottomTab("diffs")
                        }}
                        class="rounded-xl border border-border-weak-base/80 bg-v2-background-bg-base px-3.5 py-1.5 text-12-regular text-text-weak transition hover:text-text-strong hover:bg-v2-background-bg-layer-01/60 cursor-pointer"
                      >
                        View Diffs ({props.reviewCount()})
                      </button>
                    </div>
                  </div>
                </div>
              }
            >
              {(currentTab) => (
                <Tabs value={currentTab()} class="h-full flex flex-col min-h-0">
                  <IdeFileEditor tab={currentTab()} mode={editorMode()} onDirtyChange={setPathDirty} />
                </Tabs>
              )}
            </Show>
          </div>
        </div>

        {/* BOTTOM BUBBLE: Terminal & Diffs Rooms */}
        <Show when={layout.ide.bottomOpened()}>
          <div
            class={`shrink-0 hover:shadow-[var(--v2-elevation-floating)] ${bubbleShellClass}`}
            style={{ height: `${layout.ide.bottomHeight()}px` }}
          >
            <ResizeHandle
              direction="vertical"
              edge="start"
              size={layout.ide.bottomHeight()}
              min={150}
              max={typeof window === "undefined" ? 560 : Math.floor(window.innerHeight * 0.6)}
              onResize={(height) => layout.ide.resizeBottom(height)}
            />

            <div class="flex items-center justify-between gap-2 border-b border-border-weak-base/50 px-3 h-10 shrink-0">
              <div class="flex items-center gap-0.5 rounded-xl bg-v2-background-bg-layer-01 p-0.5">
                <button
                  type="button"
                  onClick={() => layout.ide.setBottomTab("terminal")}
                  class="inline-flex items-center gap-1.5 rounded-[9px] px-2.5 py-1 text-[11px] font-medium transition-all duration-150 cursor-pointer"
                  classList={{
                    "bg-v2-background-bg-base text-text-strong shadow-[var(--v2-elevation-elements)]":
                      layout.ide.bottomTab() === "terminal",
                    "text-text-weak hover:text-text-base": layout.ide.bottomTab() !== "terminal",
                  }}
                >
                  <Icon name="console" size="small" />
                  <span>Terminal</span>
                </button>
                <button
                  type="button"
                  onClick={() => layout.ide.setBottomTab("diffs")}
                  class="inline-flex items-center gap-1.5 rounded-[9px] px-2.5 py-1 text-[11px] font-medium transition-all duration-150 cursor-pointer"
                  classList={{
                    "bg-v2-background-bg-base text-text-strong shadow-[var(--v2-elevation-elements)]":
                      layout.ide.bottomTab() === "diffs",
                    "text-text-weak hover:text-text-base": layout.ide.bottomTab() !== "diffs",
                  }}
                >
                  <Icon name="code-lines" size="small" />
                  <span>Diffs</span>
                  <Show when={props.reviewCount() > 0}>
                    <span class="rounded-full bg-v2-background-bg-layer-02 px-1.5 text-[10px] text-text-strong">
                      {props.reviewCount()}
                    </span>
                  </Show>
                </button>
              </div>
              <div class="flex items-center gap-1">
                <Show when={layout.ide.bottomTab() === "terminal"}>
                  <IconButton
                    icon="plus-small"
                    variant="ghost"
                    size="small"
                    class="size-7 rounded-xl text-text-weak hover:text-text-strong hover:bg-v2-background-bg-layer-01"
                    onClick={() => terminal.new({ focus: true })}
                    aria-label="New terminal"
                  />
                </Show>
                <IconButton
                  icon="close-small"
                  variant="ghost"
                  size="small"
                  class="size-7 rounded-xl text-text-weak hover:text-text-strong hover:bg-v2-background-bg-layer-01"
                  onClick={() => layout.ide.closeBottom()}
                  aria-label="Minimize dock"
                />
              </div>
            </div>

            <div class="flex flex-col flex-1 min-h-0 w-full overflow-hidden">
              <Switch>
                <Match when={layout.ide.bottomTab() === "terminal"}>
                  <Show when={props.newLayout} fallback={<TerminalPanel />}>
                    <TerminalPanelV2 stacked={false} embedded={true} />
                  </Show>
                </Match>
                <Match when={layout.ide.bottomTab() === "diffs"}>
                  <div class="flex-1 min-h-0 overflow-y-auto px-1">{props.renderDiffs()}</div>
                </Match>
              </Switch>
            </div>
          </div>
        </Show>
      </section>

      {/* RIGHT BUBBLE: Agents & AI Chat Pane */}
      <aside
        class={`shrink-0 hover:shadow-[var(--v2-elevation-floating)] ${bubbleShellClass}`}
        style={{ width: `clamp(290px, ${layout.ide.agentWidth()}px, 38vw)` }}
      >
        <ResizeHandle
          direction="horizontal"
          edge="start"
          size={layout.ide.agentWidth()}
          min={320}
          max={700}
          onResize={(width) => layout.ide.resizeAgent(width)}
        />
        <div class="flex items-center justify-between gap-2 border-b border-border-weak-base/50 px-3.5 h-11 shrink-0">
          <div class="flex items-center gap-2">
            <span class="size-2 rounded-full bg-[#2563eb] shadow-[0_0_8px_rgba(37,99,235,0.45)]" />
            <span class="text-12-medium text-text-strong">Agents</span>
          </div>
          <span class="max-w-[160px] truncate rounded-full bg-v2-background-bg-layer-01 px-2.5 py-0.5 text-[11px] font-medium text-text-weak">
            {getFilename(sdk().directory)}
          </span>
        </div>
        <div class="flex-1 min-h-0 flex flex-col overflow-hidden">{props.agentPane}</div>
      </aside>
    </div>
  )
}
