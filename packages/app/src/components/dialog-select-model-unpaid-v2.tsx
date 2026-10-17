import { DialogBody, DialogHeader, DialogTitle, DialogV2 } from "@opencode-ai/ui/v2/dialog-v2"
import { Icon } from "@opencode-ai/ui/v2/icon"
import { ProviderIcon } from "@opencode-ai/ui/provider-icon"
import { Tag } from "@opencode-ai/ui/v2/badge-v2"
import { TooltipV2 } from "@opencode-ai/ui/v2/tooltip-v2"
import { useDialog } from "@opencode-ai/ui/context/dialog"
import { createEffect, createMemo, createSignal, onCleanup, onMount, type Component, For, Show } from "solid-js"
import { useLocal } from "@/context/local"
import { SUTRADHAR_ADMIN_PANEL_URL, useModels } from "@/context/models"
import { useProviders } from "@/hooks/use-providers"
import { decode64 } from "@/utils/base64"
import { useLanguage } from "@/context/language"
import { handleDocumentSearchKeydown } from "@/utils/search-keydown"
import { matchesModelSearch } from "./dialog-select-model-search"
import { ModelTooltip } from "./model-tooltip"

type ModelState = ReturnType<typeof useLocal>["model"]
type ModelItem = ReturnType<ModelState["list"]>[number]
const featuredProviders = ["opencode", "opencode-go", "openai", "anthropic", "google", "github-copilot"]
const displayModelName = (name: string) => name.replace(/\s+(?:\(free\)|free)$/i, "")

export const DialogSelectModelUnpaidV2: Component<{ model?: ModelState }> = (props) => {
  const local = useLocal()
  const modelsCtx = useModels()
  const model = props.model ?? local.model
  const dialog = useDialog()
  const directory = () => decode64(local.slug())
  const providers = useProviders(directory)
  const language = useLanguage()
  const [search, setSearch] = createSignal("")
  const [activeKey, setActiveKey] = createSignal("")

  const modelKey = (item: ModelItem) => `${item.provider.id}:${item.id}`
  const currentKey = createMemo(() => {
    const c = model.current()
    return c ? `${c.provider.id}:${c.id}` : undefined
  })
  const isFree = (item: ModelItem) => item.provider.id === "opencode" && (!item.cost || item.cost.input === 0)
  const freeModels = createMemo(() => model.list().filter(isFree))
  const filteredModels = createMemo(() => {
    const query = search().trim()
    const list = freeModels()
    if (!query) return list
    return list.filter((item) =>
      matchesModelSearch(query, [displayModelName(item.name), item.name, item.id, item.provider.name]),
    )
  })
  const popularProvidersList = createMemo(() =>
    [...providers.popular()]
      .filter((provider) => featuredProviders.includes(provider.id))
      .sort((a, b) => featuredProviders.indexOf(a.id) - featuredProviders.indexOf(b.id)),
  )

  let searchRef: HTMLInputElement | undefined
  let listEl: HTMLDivElement | undefined

  const scrollActiveIntoView = (key: string) => {
    queueMicrotask(() => {
      if (!key || !listEl) return
      const el = listEl.querySelector<HTMLElement>(`[data-option-key="${CSS.escape(key)}"]`)
      el?.scrollIntoView({ block: "nearest", inline: "nearest" })
    })
  }

  createEffect(() => {
    const items = filteredModels()
    const current = currentKey()
    const active = activeKey()
    if (active && items.some((item) => modelKey(item) === active)) return
    if (current && items.some((item) => modelKey(item) === current)) {
      setActiveKey(current)
      return
    }
    setActiveKey(items[0] ? modelKey(items[0]) : "")
  })

  const moveActive = (delta: number) => {
    const items = filteredModels()
    if (items.length === 0) return
    const keys = items.map(modelKey)
    const index = keys.indexOf(activeKey())
    const start = index === -1 ? 0 : index
    const next = keys[(start + delta + keys.length) % keys.length]
    setActiveKey(next)
    scrollActiveIntoView(next)
  }

  const openProviders = (provider?: string) => {
    void import("./dialog-connect-provider").then((x) => {
      const controller = x.useProviderConnectController()
      controller.select(provider)
      void dialog.show(() => <x.DialogConnectProvider controller={controller} directory={directory} />)
    })
  }

  const selectModel = (item: ModelItem) => {
    model.set({ modelID: item.id, providerID: item.provider.id }, { recent: true })
    dialog.close()
  }

  onMount(() => {
    void modelsCtx.refreshCurated()
    requestAnimationFrame(() => {
      searchRef?.focus({ preventScroll: true })
      const current = currentKey()
      if (current) scrollActiveIntoView(current)
    })

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.isComposing || e.keyCode === 229) return
      if (e.key === "ArrowDown") {
        e.preventDefault()
        moveActive(1)
        return
      }
      if (e.key === "ArrowUp") {
        e.preventDefault()
        moveActive(-1)
        return
      }
      if (e.key === "Enter" && document.activeElement === searchRef) {
        const active = filteredModels().find((item) => modelKey(item) === activeKey())
        if (active) {
          e.preventDefault()
          selectModel(active)
        }
        return
      }
      handleDocumentSearchKeydown(searchRef, e, search(), setSearch)
    }
    document.addEventListener("keydown", handleKeyDown)
    onCleanup(() => document.removeEventListener("keydown", handleKeyDown))
  })

  return (
    <DialogV2
      fit
      containerClass="!h-auto max-h-[min(520px,calc(100dvh_-_80px))] !w-[min(calc(100vw_-_32px),460px)] !rounded-[14px] border border-v2-border-border-base bg-v2-background-bg-layer-01"
      class="[font-family:var(--v2-font-family-sans)] [&_[data-slot=dialog-header]]:!px-4 [&_[data-slot=dialog-header]]:!pt-3.5 [&_[data-slot=dialog-header]]:!pb-2.5 [&_[data-slot=dialog-header-title]]:!text-[14px] [&_[data-slot=dialog-header-title]]:!font-[560] [&_[data-slot=dialog-header-title]]:!tracking-[-0.08px]"
    >
      <DialogHeader closeLabel={language.t("common.close")}>
        <DialogTitle>{language.t("dialog.model.select.title")}</DialogTitle>
      </DialogHeader>
      <DialogBody class="min-h-0 flex-1 gap-0 overflow-hidden p-0">
        <div class="px-3 pb-2.5">
          <div class="flex h-8 items-center gap-2 rounded-lg border border-v2-border-border-base bg-v2-background-bg-base px-2.5 text-v2-icon-icon-muted transition-colors focus-within:border-v2-border-border-focus">
            <Icon name="magnifying-glass" size="small" class="shrink-0" />
            <input
              ref={(el) => (searchRef = el)}
              value={search()}
              autofocus
              placeholder={language.t("dialog.model.search.placeholder")}
              aria-label={language.t("dialog.model.search.placeholder")}
              class="h-full min-w-0 flex-1 border-0 bg-transparent text-[13px] font-[440] leading-5 tracking-[-0.04px] text-v2-text-text-base outline-none placeholder:text-v2-text-text-faint"
              spellcheck={false}
              autocorrect="off"
              autocomplete="off"
              autocapitalize="off"
              onInput={(e) => setSearch(e.currentTarget.value)}
            />
            <Show when={search().trim()}>
              <button
                type="button"
                class="grid size-5 place-items-center rounded text-v2-icon-icon-muted hover:bg-v2-overlay-simple-overlay-hover hover:text-v2-icon-icon-base"
                onPointerDown={(e) => e.preventDefault()}
                onClick={() => {
                  setSearch("")
                  searchRef?.focus({ preventScroll: true })
                }}
                aria-label={language.t("common.clear")}
              >
                <Icon name="close" size="small" />
              </button>
            </Show>
          </div>
        </div>

        <div data-section="free-models" class="flex min-h-0 flex-1 flex-col">
          <div class="flex h-6 w-full flex-none select-none items-center justify-between px-4 pb-1">
            <div class="flex items-center gap-2">
              <span class="text-[11px] font-[530] uppercase tracking-[0.03em] text-v2-text-text-muted">
                {language.t("dialog.model.unpaid.freeModels.title")}
              </span>
              <span class="text-[11px] font-[480] tabular-nums text-v2-text-text-faint">{filteredModels().length}</span>
            </div>
            <button
              type="button"
              class="inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[11px] font-[520] text-v2-text-text-accent transition-colors hover:bg-v2-overlay-simple-overlay-hover focus:outline-none"
              onClick={() => window.open(SUTRADHAR_ADMIN_PANEL_URL, "_blank", "noopener,noreferrer")}
              title="Curate and disguise free models in the Sutradhar Admin Panel"
            >
              <Icon name="outline-sliders" size="small" class="size-3" />
              <span>Admin Panel</span>
            </button>
          </div>

          <div ref={listEl} class="max-h-[210px] min-h-0 flex-1 overflow-y-auto px-2 pb-2">
            <Show
              when={filteredModels().length > 0}
              fallback={
                <div class="flex h-16 items-center justify-center px-3 text-[13px] font-[440] text-v2-text-text-faint">
                  {language.t("dialog.model.empty")}
                </div>
              }
            >
              <div class="flex flex-col gap-0.5">
                <For each={filteredModels()}>
                  {(item) => {
                    const key = modelKey(item)
                    const selected = () => currentKey() === key
                    const active = () => activeKey() === key
                    return (
                      <TooltipV2
                        class="w-full"
                        placement="right-start"
                        gutter={6}
                        openDelay={150}
                        contentStyle={{ "font-family": "var(--v2-font-family-sans)" }}
                        value={
                          <ModelTooltip
                            model={{ ...item, name: displayModelName(item.name) }}
                            latest={item.latest}
                            free={isFree(item)}
                            v2
                          />
                        }
                      >
                        <button
                          type="button"
                          data-option-key={key}
                          data-selected-model={selected() ? true : undefined}
                          data-active={active() ? "" : undefined}
                          class="flex h-8 w-full scroll-my-2 flex-row items-center gap-2 rounded-lg px-2.5 text-left text-[13px] leading-5 tracking-[-0.04px] text-v2-text-text-base transition-colors [font-family:var(--v2-font-family-sans)] [font-variation-settings:'slnt'_0] hover:bg-v2-overlay-simple-overlay-hover focus:outline-none"
                          classList={{
                            "bg-v2-overlay-simple-overlay-hover": active(),
                            "font-[560] text-v2-text-text-accent": selected(),
                            "font-[470]": !selected(),
                          }}
                          onMouseMove={(e) => {
                            if (e.movementX === 0 && e.movementY === 0) return
                            if (activeKey() !== key) setActiveKey(key)
                          }}
                          onClick={() => selectModel(item)}
                        >
                          <ProviderIcon id={item.provider.id} class="size-3.5 shrink-0 text-v2-icon-icon-muted" />
                          <span class="min-w-0 flex-1 truncate">{displayModelName(item.name)}</span>
                          <Show when={(item as { badge?: string }).badge}>
                            <Tag class="shrink-0">{(item as { badge?: string }).badge}</Tag>
                          </Show>
                          <Tag class="shrink-0">{language.t("model.tag.free")}</Tag>
                          <Show when={item.latest}>
                            <Tag class="shrink-0">{language.t("model.tag.latest")}</Tag>
                          </Show>
                          <span class="flex size-4 shrink-0 items-center justify-center">
                            <Show when={selected()}>
                              <Icon name="check" class="size-3.5 text-v2-icon-icon-accent" />
                            </Show>
                          </span>
                        </button>
                      </TooltipV2>
                    )
                  }}
                </For>
              </div>
            </Show>
          </div>
        </div>

        <div class="border-t border-v2-border-border-muted bg-v2-background-bg-layer-02/75 px-3 py-2.5">
          <div class="mb-2 flex items-center justify-between gap-2 px-0.5">
            <span class="truncate text-[11px] font-[530] uppercase tracking-[0.03em] text-v2-text-text-muted">
              {language.t("dialog.model.unpaid.addMore.title")}
            </span>
            <button
              type="button"
              class="shrink-0 rounded px-1.5 py-0.5 text-[12px] font-[500] text-v2-text-text-accent transition-colors hover:bg-v2-overlay-simple-overlay-hover focus:outline-none"
              onClick={() => openProviders()}
            >
              {language.t("dialog.model.unpaid.viewMoreProviders")}
            </button>
          </div>
          <div class="grid w-full grid-cols-2 gap-1.5">
            <For each={popularProvidersList()}>
              {(provider) => (
                <button
                  type="button"
                  data-provider-id={provider.id}
                  class="flex min-h-9 w-full flex-row items-center gap-2 rounded-lg border border-v2-border-border-muted bg-v2-background-bg-base px-2.5 py-1.5 text-left text-[12.5px] font-[520] leading-4 tracking-[-0.03px] text-v2-text-text-base shadow-[var(--v2-elevation-raised)] transition-colors hover:border-v2-border-border-base hover:bg-v2-background-bg-layer-01 focus:bg-v2-background-bg-layer-01 focus:outline-none"
                  onClick={() => openProviders(provider.id)}
                >
                  <ProviderIcon id={provider.id} class="size-3.5 shrink-0 text-v2-icon-icon-base" />
                  <span class="flex min-w-0 flex-1 flex-col">
                    <span class="truncate">{provider.name}</span>
                    <Show when={provider.id === "opencode" || provider.id === "opencode-go"}>
                      <span class="truncate text-[11px] font-[440] leading-3.5 text-v2-text-text-muted">
                        {language.t(
                          provider.id === "opencode"
                            ? "dialog.provider.opencode.tagline"
                            : "dialog.provider.opencodeGo.tagline",
                        )}
                      </span>
                    </Show>
                  </span>
                </button>
              )}
            </For>
          </div>
        </div>
      </DialogBody>
    </DialogV2>
  )
}

