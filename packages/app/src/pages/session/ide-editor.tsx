import { createEffect, createMemo, createSignal, For, onCleanup, Show } from "solid-js"
import { Icon } from "@sutradhar/ui/icon"
import { useFile } from "@/context/file"
import { showToast } from "@/utils/toast"
import { FileTabContent } from "@/pages/session/file-tabs"

type IdeFileEditorProps = {
  tab: string
  mode: "edit" | "annotate"
  onDirtyChange?: (filepath: string, dirty: boolean) => void
}

function cursorPosition(text: string, offset: number) {
  const before = text.slice(0, Math.max(0, offset))
  const lines = before.split("\n")
  return {
    line: lines.length,
    column: (lines[lines.length - 1]?.length ?? 0) + 1,
  }
}

export function IdeFileEditor(props: IdeFileEditorProps) {
  const file = useFile()

  const filepath = createMemo(() => file.pathFromTab(props.tab) ?? props.tab)
  const fileState = createMemo(() => file.get(filepath()))
  const isBinary = createMemo(() => fileState()?.content?.type === "binary")

  const [savedText, setSavedText] = createSignal("")
  const [draft, setDraft] = createSignal("")
  const [loading, setLoading] = createSignal(false)
  const [loadError, setLoadError] = createSignal<string | undefined>()
  const [saving, setSaving] = createSignal(false)
  const [justSaved, setJustSaved] = createSignal(false)
  const [cursor, setCursor] = createSignal({ line: 1, column: 1 })

  let textareaRef: HTMLTextAreaElement | undefined
  let gutterRef: HTMLDivElement | undefined
  let savedResetTimer: ReturnType<typeof setTimeout> | undefined

  const dirty = createMemo(() => draft() !== savedText())
  const lineCount = createMemo(() => Math.max(1, draft().split("\n").length))
  const lineNumbers = createMemo(() => Array.from({ length: lineCount() }, (_, index) => index + 1))

  createEffect(() => {
    props.onDirtyChange?.(filepath(), dirty())
  })

  onCleanup(() => {
    if (savedResetTimer) clearTimeout(savedResetTimer)
    props.onDirtyChange?.(filepath(), false)
  })

  createEffect(() => {
    const target = filepath()
    if (!target) return
    void file.load(target)

    let cancelled = false
    setLoading(true)
    setLoadError(undefined)
    void file
      .readRaw(target)
      .then((content) => {
        if (cancelled) return
        setSavedText(content)
        setDraft(content)
        setCursor({ line: 1, column: 1 })
      })
      .catch((error: unknown) => {
        if (cancelled) return
        const cached = file.get(target)?.content
        if (cached && cached.type === "text") {
          setSavedText(cached.content)
          setDraft(cached.content)
          return
        }
        setLoadError(error instanceof Error ? error.message : "Failed to load file")
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  })

  // Keep clean drafts synced if disk content changes (e.g. from AI edits or terminal commands)
  createEffect(() => {
    const disk = fileState()?.content
    if (!disk || disk.type !== "text") return
    if (dirty() || loading()) return
    if (disk.content !== savedText() && savedText().trim() !== disk.content.trim()) {
      void file
        .readRaw(filepath())
        .then((fresh) => {
          if (dirty()) return
          setSavedText(fresh)
          setDraft(fresh)
        })
        .catch(() => undefined)
    }
  })

  const saveFile = async () => {
    const target = filepath()
    if (!target || saving() || !dirty()) return
    setSaving(true)
    try {
      await file.save(target, draft())
      setSavedText(draft())
      setJustSaved(true)
      if (savedResetTimer) clearTimeout(savedResetTimer)
      savedResetTimer = setTimeout(() => setJustSaved(false), 1800)
    } catch (error) {
      showToast({
        variant: "error",
        title: "Failed to save file",
        description: error instanceof Error ? error.message : String(error),
      })
    } finally {
      setSaving(false)
    }
  }

  const revertFile = () => {
    setDraft(savedText())
    if (textareaRef) textareaRef.value = savedText()
  }

  const updateCursor = () => {
    if (!textareaRef) return
    setCursor(cursorPosition(textareaRef.value, textareaRef.selectionStart ?? 0))
  }

  const syncScroll = () => {
    if (!textareaRef || !gutterRef) return
    gutterRef.scrollTop = textareaRef.scrollTop
  }

  const handleKeyDown = (event: KeyboardEvent) => {
    if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "s") {
      event.preventDefault()
      event.stopPropagation()
      void saveFile()
      return
    }

    if (event.key !== "Tab" || !textareaRef) return
    event.preventDefault()
    const el = textareaRef
    const start = el.selectionStart
    const end = el.selectionEnd
    const value = el.value
    const indent = "  "

    if (event.shiftKey) {
      const lineStart = value.lastIndexOf("\n", Math.max(0, start - 1)) + 1
      const before = value.slice(0, lineStart)
      const selectedBlock = value.slice(lineStart, end)
      const lines = selectedBlock.split("\n")
      let removedFirst = 0
      let removedTotal = 0
      const updatedLines = lines.map((line, idx) => {
        if (line.startsWith(indent)) {
          if (idx === 0) removedFirst = indent.length
          removedTotal += indent.length
          return line.slice(indent.length)
        }
        if (line.startsWith("\t") || line.startsWith(" ")) {
          if (idx === 0) removedFirst = 1
          removedTotal += 1
          return line.slice(1)
        }
        return line
      })
      const next = before + updatedLines.join("\n") + value.slice(end)
      setDraft(next)
      el.value = next
      el.selectionStart = Math.max(lineStart, start - removedFirst)
      el.selectionEnd = Math.max(el.selectionStart, end - removedTotal)
      updateCursor()
      return
    }

    if (start === end) {
      const next = value.slice(0, start) + indent + value.slice(end)
      setDraft(next)
      el.value = next
      el.selectionStart = start + indent.length
      el.selectionEnd = start + indent.length
      updateCursor()
      return
    }

    const lineStart = value.lastIndexOf("\n", Math.max(0, start - 1)) + 1
    const selectedBlock = value.slice(lineStart, end)
    const lines = selectedBlock.split("\n")
    const indented = lines.map((line) => indent + line).join("\n")
    const next = value.slice(0, lineStart) + indented + value.slice(end)
    setDraft(next)
    el.value = next
    el.selectionStart = start + indent.length
    el.selectionEnd = end + lines.length * indent.length
    updateCursor()
  }

  return (
    <Show when={props.mode === "edit" && !isBinary()} fallback={<FileTabContent tab={props.tab} />}>
      <div class="flex h-full min-h-0 flex-col bg-v2-background-bg-base">
        <Show when={!loading()} fallback={<div class="px-5 py-4 text-12-regular text-text-weak">Loading {filepath()}…</div>}>
          <Show
            when={!loadError()}
            fallback={<div class="px-5 py-4 text-12-regular text-text-weak">{loadError()}</div>}
          >
            <div class="relative flex flex-1 min-h-0 overflow-hidden">
              <div
                ref={(el) => {
                  gutterRef = el
                }}
                aria-hidden="true"
                class="w-12 shrink-0 select-none overflow-hidden border-r border-border-weak-base/45 bg-v2-background-bg-layer-01/45 py-3 pr-2.5 text-right font-mono text-[12px] leading-[21px] text-text-weaker"
              >
                <For each={lineNumbers()}>
                  {(num) => (
                    <div
                      class="h-[21px]"
                      classList={{
                        "text-text-strong font-medium": cursor().line === num,
                      }}
                    >
                      {num}
                    </div>
                  )}
                </For>
              </div>

              <textarea
                ref={(el) => {
                  textareaRef = el
                }}
                value={draft()}
                wrap="off"
                spellcheck={false}
                autocapitalize="off"
                autocomplete="off"
                onInput={(e) => {
                  setDraft(e.currentTarget.value)
                  setJustSaved(false)
                  updateCursor()
                }}
                onScroll={syncScroll}
                onKeyDown={handleKeyDown}
                onKeyUp={updateCursor}
                onClick={updateCursor}
                class="flex-1 min-w-0 resize-none border-0 bg-transparent px-4 py-3 font-mono text-[12.5px] leading-[21px] text-text-strong caret-text-interactive-base selection:bg-[#315cc6]/20 focus:outline-none overflow-auto"
                style={{
                  "font-family": '"JetBrainsMono Nerd Font Mono", ui-monospace, SFMono-Regular, Menlo, Consolas, monospace',
                  "tab-size": "2",
                  "font-variant-ligatures": "none",
                }}
                aria-label={`Edit ${filepath()}`}
              />
            </div>

            <div class="flex items-center justify-between gap-3 border-t border-border-weak-base/50 bg-v2-background-bg-layer-01/50 px-3.5 h-8 shrink-0 text-[11px] text-text-weak">
              <div class="flex items-center gap-3 min-w-0">
                <span class="truncate font-mono text-text-weaker">{filepath()}</span>
                <span class="shrink-0 tabular-nums">
                  Ln {cursor().line}, Col {cursor().column}
                </span>
                <span class="hidden sm:inline shrink-0">{lineCount()} lines</span>
              </div>

              <div class="flex items-center gap-1.5 shrink-0">
                <Show when={justSaved() && !dirty()}>
                  <span class="inline-flex items-center gap-1 rounded-full bg-v2-state-bg-info px-2 py-0.5 text-[10px] font-medium text-v2-state-fg-info">
                    <Icon name="circle-check" size="small" />
                    <span>Saved</span>
                  </span>
                </Show>

                <Show when={dirty()}>
                  <button
                    type="button"
                    onClick={revertFile}
                    disabled={saving()}
                    class="rounded-lg px-2 py-0.5 text-[11px] font-medium text-text-weak transition hover:bg-v2-background-bg-base hover:text-text-strong cursor-pointer"
                  >
                    Revert
                  </button>
                  <button
                    type="button"
                    onClick={() => void saveFile()}
                    disabled={saving()}
                    class="inline-flex items-center gap-1 rounded-lg bg-[#2563eb] px-2.5 py-0.5 text-[11px] font-medium text-white shadow-2xs transition hover:bg-[#1d4ed8] disabled:opacity-60 cursor-pointer"
                  >
                    <span>{saving() ? "Saving…" : "Save"}</span>
                    <span class="opacity-75 text-[10px]">Ctrl+S</span>
                  </button>
                </Show>
              </div>
            </div>
          </Show>
        </Show>
      </div>
    </Show>
  )
}
