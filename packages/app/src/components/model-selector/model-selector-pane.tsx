import { Popover } from "@kobalte/core/popover"
import { Button } from "@sutradhar/ui/button"
import { useDialog } from "@sutradhar/ui/context/dialog"
import { Dialog } from "@sutradhar/ui/dialog"
import { Icon } from "@sutradhar/ui/icon"
import { ProviderIcon } from "@sutradhar/ui/provider-icon"
import { Tooltip } from "@sutradhar/ui/tooltip"
import { createEffect, createMemo, createSignal, For, on, onMount, Show, type Component, type ComponentProps, type JSX } from "solid-js"
import { useLanguage } from "@/context/language"
import { useLocal, type ModelKey } from "@/context/local"
import { decode64 } from "@/utils/base64"
import { ModelTooltip } from "../model-tooltip"
import { buildModelCatalog, formatContextWindow, isReasoningModel, modelCatalogKey, type ModelCatalogItem } from "./model-catalog"
import "./model-selector-pane.css"

export type ModelSelectionState = {
  readonly list: () => readonly ModelCatalogItem[]
  readonly current: () => ModelCatalogItem | undefined
  readonly recent?: () => readonly (ModelCatalogItem | undefined)[]
  readonly set: (value: ModelKey | undefined, options?: { recent?: boolean }) => void
  readonly visible?: (value: ModelKey) => boolean
}

type ModelSelectorTriggerProps = Omit<ComponentProps<typeof Popover.Trigger>, "as" | "ref">
type ModelSelectorTrigger = (props: ModelSelectorTriggerProps) => JSX.Element
type DismissCause = "escape" | "outside" | "select" | "manage" | "provider"

function resolveModelState(explicit?: ModelSelectionState): ModelSelectionState {
  if (explicit) return explicit
  return useLocal().model
}

function useSafeDirectory(hasExplicitModel: boolean) {
  if (hasExplicitModel) return () => ""
  const local = useLocal()
  return () => decode64(local.slug())
}

function providerIconID(id: string): ComponentProps<typeof ProviderIcon>["id"] {
  if (id === "sutradhar") return "sutradhar"
  if (id === "anthropic") return "anthropic"
  if (id === "openai") return "openai"
  if (id === "google") return "google"
  if (id === "openrouter") return "openrouter"
  if (id === "vercel") return "vercel"
  return "anthropic"
}

export function ModelSelectorPane(props: {
  provider?: string
  model?: ModelSelectionState
  onSelect?: (item: ModelCatalogItem) => void
  onManage?: () => void
  onConnectProvider?: () => void
  onSync?: () => Promise<void> | void
  maxScrollHeight?: string
  showFooter?: boolean
  autofocusSearch?: boolean
}) {
  const language = useLanguage()
  const model = resolveModelState(props.model)
  const [query, setQuery] = createSignal("")
  const [activeIndex, setActiveIndex] = createSignal(0)
  const [syncing, setSyncing] = createSignal(false)
  let searchRef: HTMLInputElement | undefined
  const buttonRefs = new Map<number, HTMLButtonElement>()

  const catalog = createMemo(() =>
    buildModelCatalog({
      items: model.list(),
      recent: (model.recent?.() ?? []).filter((item): item is ModelCatalogItem => !!item),
      visible: model.visible,
      providerFilter: props.provider,
      query: query(),
    }),
  )

  const currentKey = createMemo(() => {
    const active = model.current()
    return active ? modelCatalogKey(active) : ""
  })

  createEffect(
    on(
      () => catalog().flat.length,
      (len) => {
        if (len === 0) {
          setActiveIndex(0)
          return
        }
        const selectedIdx = catalog().flat.findIndex((entry) => modelCatalogKey(entry.item) === currentKey())
        if (selectedIdx >= 0 && !query().trim()) {
          setActiveIndex(selectedIdx)
          return
        }
        if (activeIndex() >= len) setActiveIndex(0)
      },
    ),
  )

  onMount(() => {
    if (props.autofocusSearch === false) return
    requestAnimationFrame(() => {
      searchRef?.focus({ preventScroll: true })
    })
  })

  const selectItem = (item: ModelCatalogItem) => {
    model.set({ providerID: item.provider.id, modelID: item.id }, { recent: true })
    props.onSelect?.(item)
  }

  const moveHighlight = (delta: number) => {
    const list = catalog().flat
    if (list.length === 0) return
    const next = (activeIndex() + delta + list.length) % list.length
    setActiveIndex(next)
    buttonRefs.get(next)?.scrollIntoView({ block: "nearest" })
  }

  const handleKeyDown = (event: KeyboardEvent) => {
    const list = catalog().flat
    if (event.key === "ArrowDown") {
      event.preventDefault()
      moveHighlight(1)
      return
    }
    if (event.key === "ArrowUp") {
      event.preventDefault()
      moveHighlight(-1)
      return
    }
    if (event.key === "Home" && list.length > 0) {
      event.preventDefault()
      setActiveIndex(0)
      buttonRefs.get(0)?.scrollIntoView({ block: "nearest" })
      return
    }
    if (event.key === "End" && list.length > 0) {
      event.preventDefault()
      const last = list.length - 1
      setActiveIndex(last)
      buttonRefs.get(last)?.scrollIntoView({ block: "nearest" })
      return
    }
    if (event.key === "Enter") {
      const target = list[activeIndex()]
      if (!target) return
      event.preventDefault()
      selectItem(target.item)
    }
  }

  const indexFor = (section: "recent" | "group", groupId: string, item: ModelCatalogItem) =>
    catalog().flat.findIndex(
      (entry) =>
        entry.section === section &&
        entry.groupId === groupId &&
        modelCatalogKey(entry.item) === modelCatalogKey(item),
    )

  const renderRow = (item: ModelCatalogItem, section: "recent" | "group", groupId: string) => {
    const index = () => indexFor(section, groupId, item)
    const isSelected = () => modelCatalogKey(item) === currentKey()
    const isActive = () => index() === activeIndex()
    const contextText = () => formatContextWindow(item.limit?.context)
    const reasoning = () => isReasoningModel(item)
    const free = () => item.cost?.input === 0 && item.provider.id !== "sutradhar"

    const row = (
      <button
        type="button"
        ref={(el) => {
          const i = index()
          if (i >= 0) buttonRefs.set(i, el)
        }}
        class="sutradhar-model-pane-item"
        data-active={isActive() ? "true" : undefined}
        data-selected={isSelected() ? "true" : undefined}
        data-model-id={item.id}
        data-provider-id={item.provider.id}
        onMouseEnter={() => {
          const i = index()
          if (i >= 0) setActiveIndex(i)
        }}
        onClick={() => selectItem(item)}
      >
        <ProviderIcon id={providerIconID(item.provider.id)} class="size-4 shrink-0" />
        <span class="sutradhar-model-pane-item-main">
          <span class="sutradhar-model-pane-item-name">{item.name}</span>
          <Show when={reasoning()}>
            <span class="sutradhar-model-pane-badge">Thinking</span>
          </Show>
          <Show when={free()}>
            <span class="sutradhar-model-pane-badge">{language.t("model.tag.free")}</span>
          </Show>
        </span>
        <span class="sutradhar-model-pane-meta">
          <Show when={contextText()}>
            <span>{contextText()}</span>
          </Show>
          <span class="sutradhar-model-pane-check">
            <Show when={isSelected()}>
              <Icon name="check" size="small" />
            </Show>
          </span>
        </span>
      </button>
    )

    if (!item.limit?.context) return row
    return (
      <Tooltip
        class="w-full"
        placement="right-start"
        gutter={10}
        value={
          <ModelTooltip
            v2
            model={{
              id: item.id,
              name: item.name,
              description: item.description,
              provider: { name: item.provider.name },
              capabilities: {
                reasoning: reasoning(),
                input: item.capabilities?.input ?? { text: true, image: false, audio: false, video: false, pdf: false },
              },
              limit: { context: item.limit.context },
            }}
            latest={item.latest}
            free={free()}
          />
        }
      >
        {row}
      </Tooltip>
    )
  }

  return (
    <div class="sutradhar-model-pane" data-component="model-selector-pane" onKeyDown={handleKeyDown}>
      <div class="sutradhar-model-pane-search">
        <Icon name="magnifying-glass" size="small" class="sutradhar-model-pane-search-icon" />
        <input
          ref={searchRef}
          type="text"
          class="sutradhar-model-pane-input"
          value={query()}
          placeholder={language.t("dialog.model.search.placeholder")}
          spellcheck={false}
          autocomplete="off"
          autocapitalize="off"
          onInput={(e) => {
            setQuery(e.currentTarget.value)
            setActiveIndex(0)
          }}
        />
        <Show when={query().length > 0}>
          <button
            type="button"
            class="sutradhar-model-pane-action"
            aria-label={language.t("common.clear")}
            onClick={() => {
              setQuery("")
              setActiveIndex(0)
              searchRef?.focus({ preventScroll: true })
            }}
          >
            <Icon name="circle-x" size="small" />
          </button>
        </Show>
      </div>

      <div
        class="sutradhar-model-pane-scroll"
        style={props.maxScrollHeight ? { "max-height": props.maxScrollHeight } : undefined}
      >
        <Show
          when={catalog().totalCount > 0}
          fallback={
            <div class="sutradhar-model-pane-empty">
              <div>{query().trim() ? language.t("dialog.model.empty") : "No connected models ready"}</div>
              <Show when={query().trim()}>
                <div class="mt-2">
                  <Button
                    size="small"
                    variant="secondary"
                    onClick={() => {
                      setQuery("")
                      searchRef?.focus({ preventScroll: true })
                    }}
                  >
                    Clear search
                  </Button>
                </div>
              </Show>
            </div>
          }
        >
          <Show when={catalog().recent.length > 0}>
            <div class="sutradhar-model-pane-section">
              <div class="sutradhar-model-pane-section-header">
                <span>Recent</span>
              </div>
              <For each={catalog().recent}>{(item) => renderRow(item, "recent", "__recent__")}</For>
            </div>
          </Show>

          <For each={catalog().groups}>
            {(group) => (
              <div class="sutradhar-model-pane-section" data-provider-group={group.id}>
                <div class="sutradhar-model-pane-section-header">
                  <span>{group.label}</span>
                  <span>{group.items.length}</span>
                </div>
                <For each={group.items}>{(item) => renderRow(item, "group", group.id)}</For>
              </div>
            )}
          </For>
        </Show>
      </div>

      <Show when={props.showFooter !== false && (props.onConnectProvider || props.onManage || props.onSync)}>
        <div class="sutradhar-model-pane-footer" data-slot="model-pane-footer">
          <Show when={props.onConnectProvider || props.onManage}>
            <div class="sutradhar-model-pane-footer-row">
              <Show when={props.onConnectProvider}>
                <button
                  type="button"
                  class="sutradhar-model-pane-footer-btn"
                  onClick={() => props.onConnectProvider?.()}
                >
                  <Icon name="plus-small" size="small" />
                  <span>{language.t("command.provider.connect")}</span>
                </button>
              </Show>
              <Show when={props.onManage}>
                <button
                  type="button"
                  class="sutradhar-model-pane-footer-btn"
                  onClick={() => props.onManage?.()}
                >
                  <Icon name="sliders" size="small" />
                  <span>{language.t("dialog.model.manage")}</span>
                </button>
              </Show>
            </div>
          </Show>
          <Show when={props.onSync}>
            <button
              type="button"
              class="sutradhar-model-pane-footer-btn sutradhar-model-pane-footer-btn--accent"
              disabled={syncing()}
              onClick={() => {
                if (syncing() || !props.onSync) return
                setSyncing(true)
                void Promise.resolve(props.onSync()).finally(() => setSyncing(false))
              }}
            >
              <Icon name="reset" size="small" classList={{ "animate-spin": syncing() }} />
              <span>{syncing() ? "Syncing live models…" : "Sync Live Models"}</span>
            </button>
          </Show>
        </div>
      </Show>
    </div>
  )
}

function UnifiedModelPopover(props: {
  provider?: string
  model?: ModelSelectionState
  trigger: ModelSelectorTrigger
  onClose?: (cause?: "escape" | "select") => void
  onSync?: () => Promise<void> | void
}) {
  const [open, setOpen] = createSignal(false)
  const [dismiss, setDismiss] = createSignal<DismissCause | null>(null)
  const dialog = useDialog()
  const language = useLanguage()
  const directory = useSafeDirectory(Boolean(props.model))

  const close = (cause: DismissCause) => {
    setDismiss(cause)
    setOpen(false)
  }

  const handleManage = () => {
    close("manage")
    void import("../dialog-manage-models").then((mod) => {
      void dialog.show(() => <mod.DialogManageModels />)
    })
  }

  const handleConnectProvider = () => {
    close("provider")
    void import("../dialog-connect-provider").then((mod) => {
      void dialog.show(() => <mod.DialogConnectProvider directory={directory} />)
    })
  }

  return (
    <Popover
      open={open()}
      onOpenChange={(next) => {
        if (next) setDismiss(null)
        setOpen(next)
      }}
      modal={false}
      placement="top-start"
      gutter={6}
    >
      <Popover.Trigger as={props.trigger} />
      <Popover.Portal>
        <Popover.Content
          class="sutradhar-model-popover"
          onEscapeKeyDown={(event) => {
            close("escape")
            event.preventDefault()
            event.stopPropagation()
          }}
          onPointerDownOutside={() => close("outside")}
          onFocusOutside={() => close("outside")}
          onCloseAutoFocus={(event) => {
            const cause = dismiss()
            if (cause === "outside") event.preventDefault()
            if (cause === "escape" || cause === "select") {
              event.preventDefault()
              props.onClose?.(cause)
            }
            setDismiss(null)
          }}
        >
          <Popover.Title class="sr-only">{language.t("dialog.model.select.title")}</Popover.Title>
          <Show when={open()}>
            <ModelSelectorPane
              provider={props.provider}
              model={props.model}
              onSelect={() => close("select")}
              onManage={handleManage}
              onConnectProvider={handleConnectProvider}
              onSync={props.onSync}
            />
          </Show>
        </Popover.Content>
      </Popover.Portal>
    </Popover>
  )
}

export function ModelSelectorPopover(props: {
  provider?: string
  model?: ModelSelectionState
  trigger: ModelSelectorTrigger
  onClose?: (cause?: "escape" | "select") => void
  onSync?: () => Promise<void> | void
}) {
  return (
    <UnifiedModelPopover
      provider={props.provider}
      model={props.model}
      trigger={props.trigger}
      onClose={(cause) => props.onClose?.(cause ?? "escape")}
      onSync={props.onSync}
    />
  )
}

export function ModelSelectorPopoverV2(props: {
  provider?: string
  model?: ModelSelectionState
  trigger: ModelSelectorTrigger
  onClose?: () => void
  onSync?: () => Promise<void> | void
}) {
  return (
    <UnifiedModelPopover
      provider={props.provider}
      model={props.model}
      trigger={props.trigger}
      onClose={() => props.onClose?.()}
      onSync={props.onSync}
    />
  )
}

export const DialogSelectModel: Component<{
  provider?: string
  model?: ModelSelectionState
  onSync?: () => Promise<void> | void
}> = (props) => {
  const dialog = useDialog()
  const language = useLanguage()
  const directory = useSafeDirectory(Boolean(props.model))

  const handleManage = () => {
    void import("../dialog-manage-models").then((mod) => {
      void dialog.show(() => <mod.DialogManageModels />)
    })
  }

  const handleConnectProvider = () => {
    void import("../dialog-connect-provider").then((mod) => {
      void dialog.show(() => <mod.DialogConnectProvider directory={directory} />)
    })
  }

  return (
    <Dialog
      title={language.t("dialog.model.select.title")}
      action={
        <Button class="h-7 -my-1 text-14-medium" icon="plus-small" tabIndex={-1} onClick={handleConnectProvider}>
          {language.t("command.provider.connect")}
        </Button>
      }
    >
      <ModelSelectorPane
        provider={props.provider}
        model={props.model}
        onSelect={() => dialog.close()}
        onManage={handleManage}
        onConnectProvider={handleConnectProvider}
        onSync={props.onSync}
        maxScrollHeight="360px"
      />
    </Dialog>
  )
}

export const DialogSelectModelUnpaid: Component<{
  model?: ModelSelectionState
  onSync?: () => Promise<void> | void
}> = (props) => <DialogSelectModel model={props.model} onSync={props.onSync} />

export const DialogSelectModelUnpaidV2: Component<{
  model?: ModelSelectionState
  onSync?: () => Promise<void> | void
}> = (props) => <DialogSelectModel model={props.model} onSync={props.onSync} />
