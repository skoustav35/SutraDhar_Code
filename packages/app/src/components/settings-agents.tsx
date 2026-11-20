import { For, Show, createMemo, type Component, type JSX } from "solid-js"
import { createStore } from "solid-js/store"
import { Icon } from "@sutradhar/ui/icon"
import { Select } from "@sutradhar/ui/select"
import { Switch } from "@sutradhar/ui/switch"
import { useLanguage } from "@/context/language"
import { useModels } from "@/context/models"
import { useServerSync } from "@/context/server-sync"
import { showToast } from "@/utils/toast"

type AgentMode = "primary" | "subagent" | "all"

type AgentConfigLike = {
  description?: string
  mode?: AgentMode
  model?: string
  prompt?: string
  steps?: number
  disable?: boolean
}

type AgentDraft = {
  name: string
  description: string
  /** Empty means inherit the built-in default for an existing agent. */
  mode: AgentMode | ""
  model: string
  prompt: string
  steps: string
  disabled: boolean
}

const RESERVED_AGENTS = new Set(["build", "plan", "general", "explore", "title", "summary", "compaction"])
const NAME_PATTERN = /^[a-z0-9][a-z0-9-_]*$/

const blankDraft = (): AgentDraft => ({
  name: "",
  description: "",
  mode: "subagent",
  model: "",
  prompt: "",
  steps: "",
  disabled: false,
})

const primaryButtonClass =
  "settings-agents-primary-button inline-flex items-center justify-center gap-1.5 rounded-xl bg-gradient-to-r from-[#0284c7] to-[#2563eb] px-3 py-1.5 text-[12px] font-semibold text-white shadow-[0_4px_14px_-2px_rgba(2,132,199,0.35)] transition hover:brightness-105 disabled:cursor-default disabled:opacity-60"

const ghostButtonClass =
  "settings-agents-ghost-button inline-flex items-center justify-center gap-1.5 rounded-xl border border-[#bae6fd] bg-white/70 px-3 py-1.5 text-[12px] font-semibold text-[#0369a1] transition hover:border-[#38bdf8] dark:border-[#0ea5e9]/30 dark:bg-[#0f172a]/60 dark:text-[#7dd3fc]"

const fieldClass =
  "settings-agents-field w-full rounded-xl border border-[#e2e8f0] bg-white/80 px-3 py-2 text-[12.5px] text-text-strong outline-none transition focus:border-[#38bdf8] dark:border-[#1e293b] dark:bg-[#0f172a]/70"

const labelClass =
  "settings-agents-field-label text-[10.5px] font-bold uppercase tracking-[0.12em] text-[#0369a1] dark:text-[#7dd3fc]"

const Field: Component<{ label: string; hint?: string; children: JSX.Element }> = (props) => {
  return (
    <label class="flex flex-col gap-1.5">
      <span class={labelClass}>{props.label}</span>
      {props.children}
      <Show when={props.hint}>
        <span class="text-[11px] text-text-subtle">{props.hint}</span>
      </Show>
    </label>
  )
}

export const SettingsAgents: Component = () => {
  const language = useLanguage()
  const models = useModels()
  const serverSync = useServerSync()

  const [ui, setUI] = createStore<{
    view: "list" | "form"
    query: string
    original?: string
    draft: AgentDraft
    error?: string
    saving: boolean
    removing?: string
  }>({
    view: "list",
    query: "",
    draft: blankDraft(),
    saving: false,
  })

  const configured = createMemo(() =>
    Object.entries(serverSync().data.config.agent ?? {})
      .filter((entry): entry is [string, AgentConfigLike] => !!entry[1])
      .sort((a, b) => a[0].localeCompare(b[0])),
  )

  const filteredConfigured = createMemo(() => {
    const query = ui.query.trim().toLocaleLowerCase()
    if (!query) return configured()

    return configured().filter(([name, config]) =>
      [name, config.description, config.model, config.mode, config.prompt]
        .filter((value): value is string => !!value)
        .some((value) => value.toLocaleLowerCase().includes(query)),
    )
  })

  const modeOptions = createMemo<Array<{ id: AgentMode | ""; label: string }>>(() => [
    { id: "subagent", label: language.t("settings.agents.mode.subagent") },
    { id: "primary", label: language.t("settings.agents.mode.primary") },
    { id: "all", label: language.t("settings.agents.mode.all") },
    { id: "", label: language.t("common.default") },
  ])

  const modelOptions = createMemo(() => [
    { id: "", name: language.t("common.default") },
    ...models
      .list()
      .map((model) => ({ id: `${model.provider.id}/${model.id}`, name: `${model.provider.name} · ${model.name}` }))
      .sort((a, b) => a.name.localeCompare(b.name)),
  ])

  const openCreate = () => {
    setUI({
      view: "form",
      original: undefined,
      draft: blankDraft(),
      error: undefined,
      saving: false,
    })
  }

  const openEdit = (name: string, config: AgentConfigLike) => {
    setUI({
      view: "form",
      original: name,
      draft: {
        name,
        description: config.description ?? "",
        mode: config.mode ?? "",
        model: config.model ?? "",
        prompt: config.prompt ?? "",
        steps: config.steps === undefined ? "" : String(config.steps),
        disabled: config.disable === true,
      },
      error: undefined,
      saving: false,
    })
  }

  const closeForm = () => {
    setUI({ view: "list", original: undefined, draft: blankDraft(), error: undefined, saving: false })
  }

  const save = async () => {
    if (ui.saving) return
    const draft = ui.draft
    const name = draft.name.trim()
    if (!NAME_PATTERN.test(name)) {
      setUI("error", language.t("settings.agents.invalid"))
      return
    }
    if (!ui.original && RESERVED_AGENTS.has(name)) {
      setUI("error", language.t("settings.agents.reserved"))
      return
    }

    const steps = draft.steps.trim()
    const parsedSteps = steps ? Number(steps) : undefined
    if (parsedSteps !== undefined && (!Number.isFinite(parsedSteps) || parsedSteps < 1)) {
      setUI("error", language.t("settings.agents.invalid"))
      return
    }

    setUI("saving", true)
    setUI("error", undefined)
    try {
      await serverSync().updateConfig({
        agent: {
          [name]: {
            description: draft.description.trim(),
            mode: draft.mode || undefined,
            model: draft.model.trim(),
            prompt: draft.prompt.trim(),
            steps: parsedSteps,
            disable: draft.disabled,
          },
        },
      })
      closeForm()
    } catch (error) {
      showToast({
        variant: "error",
        title: language.t("common.requestFailed"),
        description: error instanceof Error ? error.message : String(error),
      })
    } finally {
      setUI("saving", false)
    }
  }

  const remove = async (name: string, config: AgentConfigLike) => {
    if (ui.removing) return
    setUI("removing", name)
    try {
      await serverSync().updateConfig({
        agent: {
          [name]: { ...config, disable: true },
        },
      })
    } catch (error) {
      showToast({
        variant: "error",
        title: language.t("common.requestFailed"),
        description: error instanceof Error ? error.message : String(error),
      })
    } finally {
      setUI("removing", undefined)
    }
  }

  return (
    <div class="settings-agents-page flex flex-col h-full overflow-y-auto no-scrollbar px-4 pb-12 sm:px-10">
      <Show
        when={ui.view === "form"}
        fallback={
          <div class="settings-agents-view settings-agents-view-list mx-auto flex w-full max-w-[920px] flex-col gap-6 pt-6">
            <div class="settings-agents-header flex flex-wrap items-end justify-between gap-5">
              <div class="settings-agents-heading min-w-0">
                <div class="settings-agents-eyebrow inline-flex items-center gap-1.5 rounded-full border border-[#7dd3fc] bg-[#e0f2fe] px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-[0.14em] text-[#0369a1] dark:border-[#0ea5e9]/40 dark:bg-[#0c4a6e]/50 dark:text-[#7dd3fc]">
                  ✦ {language.t("settings.agents.title")}
                </div>
                <h2 class="settings-agents-title mt-2 text-[24px] font-semibold tracking-[-0.03em] text-text-strong">
                  {language.t("settings.agents.title")}
                </h2>
                <p class="settings-agents-intro mt-1 max-w-[560px] text-[13px] leading-relaxed text-text-weak">
                  {language.t("settings.agents.intro")}
                </p>
              </div>
              <div class="settings-agents-toolbar flex w-full flex-col gap-2.5 sm:w-auto sm:min-w-[340px] sm:flex-row sm:items-center">
                <div class="settings-agents-search-wrap relative min-w-0 flex-1">
                  <Icon
                    name="magnifying-glass"
                    class="pointer-events-none absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-text-subtle"
                  />
                  <input
                    type="search"
                    value={ui.query}
                    onInput={(event) => setUI("query", event.currentTarget.value)}
                    placeholder={language.t("common.search.placeholder")}
                    aria-label={language.t("common.search.placeholder")}
                    class="settings-agents-search w-full rounded-xl border border-[#e2e8f0] bg-white/80 py-2 pl-9 pr-9 text-[12.5px] text-text-strong outline-none transition focus:border-[#38bdf8] dark:border-[#1e293b] dark:bg-[#0f172a]/70"
                  />
                  <Show when={ui.query}>
                    <button
                      type="button"
                      class="settings-agents-search-clear absolute right-2 top-1/2 inline-flex size-6 -translate-y-1/2 items-center justify-center rounded-lg text-text-subtle transition hover:bg-[#e0f2fe] hover:text-[#0369a1] dark:hover:bg-[#082f49] dark:hover:text-[#7dd3fc]"
                      aria-label={language.t("common.clear")}
                      title={language.t("common.clear")}
                      onClick={() => setUI("query", "")}
                    >
                      <Icon name="close-small" class="size-3.5" />
                    </button>
                  </Show>
                </div>
                <button type="button" class={`${primaryButtonClass} settings-agents-add-button`} onClick={openCreate}>
                  <Icon name="plus-small" class="size-3.5" />
                  {language.t("settings.agents.add")}
                </button>
              </div>
            </div>

            <Show
              when={filteredConfigured().length > 0}
              fallback={
                <div class="settings-agents-empty flex flex-col items-center justify-center rounded-[22px] border border-dashed border-[#bae6fd] bg-white/60 px-6 py-14 text-center dark:border-[#0ea5e9]/30 dark:bg-[#0f172a]/50">
                  <div class="settings-agents-empty-icon flex size-11 items-center justify-center rounded-2xl bg-[#e0f2fe] text-[#0284c7] dark:bg-[#082f49] dark:text-[#7dd3fc]">
                    <Icon name="subagent" class="size-5" />
                  </div>
                  <p class="settings-agents-empty-copy mt-4 max-w-[320px] text-[12.5px] leading-relaxed text-text-weak">
                    {language.t("settings.agents.empty")}
                  </p>
                  <Show
                    when={ui.query}
                    fallback={
                      <button type="button" class={`${primaryButtonClass} settings-agents-empty-action mt-5`} onClick={openCreate}>
                        <Icon name="plus-small" class="size-3.5" />
                        {language.t("settings.agents.add")}
                      </button>
                    }
                  >
                    <button
                      type="button"
                      class={`${ghostButtonClass} settings-agents-empty-action mt-5`}
                      onClick={() => setUI("query", "")}
                    >
                      {language.t("common.clear")}
                    </button>
                  </Show>
                </div>
              }
            >
              <div class="settings-agents-list flex flex-col gap-3">
                <For each={filteredConfigured()}>
                  {([name, config], index) => (
                    <article
                      class="settings-agents-card settings-agents-card-enter flex flex-col gap-4 rounded-[20px] border border-[#e2e8f0] bg-white/75 p-4 shadow-[0_8px_24px_-16px_rgba(2,132,199,0.45)] backdrop-blur-sm transition hover:-translate-y-0.5 hover:border-[#7dd3fc] dark:border-[#1e293b] dark:bg-[#0f172a]/60 dark:hover:border-[#0ea5e9]/50 sm:p-5"
                      data-settings-entry-index={index()}
                    >
                      <div class="settings-agents-card-main flex min-w-0 flex-1 items-start gap-3">
                        <div
                          classList={{
                            "settings-agents-status-dot mt-1.5 size-2 shrink-0 rounded-full bg-[#22c55e] shadow-[0_0_0_4px_rgba(34,197,94,0.12)]": config.disable !== true,
                            "settings-agents-status-dot mt-1.5 size-2 shrink-0 rounded-full bg-[#f59e0b] shadow-[0_0_0_4px_rgba(245,158,11,0.12)]": config.disable === true,
                          }}
                          aria-hidden="true"
                        />
                        <div class="min-w-0 flex-1">
                          <div class="flex flex-wrap items-center gap-2">
                            <span class="settings-agents-card-name truncate font-mono text-[13.5px] font-semibold text-text-strong">{name}</span>
                            <span class="settings-agents-card-mode rounded-full bg-[#f0f9ff] px-2 py-0.5 text-[10.5px] font-medium text-[#0369a1] dark:bg-[#082f49]/70 dark:text-[#7dd3fc]">
                              {modeOptions().find((option) => option.id === (config.mode ?? ""))?.label ?? language.t("common.default")}
                            </span>
                            <Show when={config.disable}>
                              <span class="settings-agents-card-status rounded-full border border-[#fecaca] px-2 py-0.5 text-[10.5px] font-semibold text-[#b91c1c] dark:border-[#7f1d1d] dark:text-[#fca5a5]">
                                {language.t("settings.agents.disabled")}
                              </span>
                            </Show>
                          </div>
                          <Show when={config.description || config.model}>
                            <p class="settings-agents-card-description mt-1.5 truncate text-[12px] text-text-weak">
                              {config.description || config.model}
                            </p>
                          </Show>
                        </div>
                      </div>

                      <div class="settings-agents-card-meta flex flex-wrap items-center gap-1.5 border-t border-[#e2e8f0]/80 pt-3 text-[10.5px] text-text-subtle dark:border-[#1e293b]">
                        <Show when={config.model}>
                          <span class="settings-agents-meta-chip inline-flex max-w-full items-center gap-1 rounded-lg bg-[#f8fafc] px-2 py-1 font-mono dark:bg-[#111827]">
                            <Icon name="models" class="size-3" />
                            <span class="truncate">{config.model}</span>
                          </span>
                        </Show>
                        <Show when={config.steps !== undefined}>
                          <span class="settings-agents-meta-chip inline-flex items-center gap-1 rounded-lg bg-[#f8fafc] px-2 py-1 dark:bg-[#111827]">
                            <Icon name="checklist" class="size-3" />
                            <span>{config.steps}</span>
                          </span>
                        </Show>
                        <Show when={config.prompt}>
                          <span class="settings-agents-meta-chip inline-flex items-center gap-1 rounded-lg bg-[#f8fafc] px-2 py-1 dark:bg-[#111827]">
                            <Icon name="prompt" class="size-3" />
                            <span>{language.t("settings.agents.prompt")}</span>
                          </span>
                        </Show>
                      </div>

                      <div class="settings-agents-card-actions flex shrink-0 items-center justify-end gap-2">
                        <button
                          type="button"
                          class={`${ghostButtonClass} settings-agents-edit-button`}
                          onClick={() => openEdit(name, config)}
                        >
                          <Icon name="edit" class="size-3.5" />
                          {language.t("common.edit")}
                        </button>
                        <button
                          type="button"
                          class="settings-agents-remove-button inline-flex items-center justify-center gap-1.5 rounded-xl border border-[#fecaca] bg-white/70 px-3 py-1.5 text-[12px] font-semibold text-[#b91c1c] transition hover:border-[#f87171] disabled:opacity-60 dark:border-[#7f1d1d] dark:bg-[#0f172a]/60 dark:text-[#fca5a5]"
                          disabled={config.disable === true || ui.removing === name}
                          onClick={() => void remove(name, config)}
                        >
                          <Icon name="trash" class="size-3.5" />
                          {language.t("settings.agents.remove")}
                        </button>
                      </div>
                    </article>
                  )}
                </For>
              </div>
            </Show>
          </div>
        }
      >
        <div class="settings-agents-view settings-agents-view-form mx-auto flex w-full max-w-[920px] flex-col gap-5 pt-6">
          <div class="settings-agents-form-header flex flex-wrap items-center justify-between gap-3">
            <button
              type="button"
              class={ghostButtonClass}
              onClick={closeForm}
              aria-label={language.t("common.goBack")}
            >
              <Icon name="arrow-left" class="size-3.5" />
            </button>
            <div class="flex items-center gap-2">
              <button type="button" class={ghostButtonClass} onClick={closeForm}>
                {language.t("common.cancel")}
              </button>
              <button type="button" class={primaryButtonClass} disabled={ui.saving} onClick={() => void save()}>
                {language.t("common.save")}
              </button>
            </div>
          </div>

          <div
            class="settings-agents-form-card rounded-[24px] border border-[#bae6fd] p-5 dark:border-[#0ea5e9]/25 sm:p-6"
            style={{
              background:
                "radial-gradient(circle at 8% 0%, rgba(56, 189, 248, 0.18), transparent 16rem), radial-gradient(circle at 92% 100%, rgba(37, 99, 235, 0.1), transparent 16rem), linear-gradient(155deg, rgba(248, 251, 255, 0.96) 0%, rgba(238, 246, 255, 0.92) 55%, rgba(224, 242, 254, 0.9) 100%)",
            }}
          >
            <div class="settings-agents-form-intro mb-6 border-b border-[#bae6fd]/70 pb-5 dark:border-[#0ea5e9]/20">
              <div class="settings-agents-eyebrow inline-flex items-center gap-1.5 rounded-full border border-[#7dd3fc] bg-[#e0f2fe] px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-[0.14em] text-[#0369a1] dark:border-[#0ea5e9]/40 dark:bg-[#0c4a6e]/50 dark:text-[#7dd3fc]">
                {ui.original ? language.t("common.edit") : language.t("settings.agents.add")}
              </div>
              <h2 class="settings-agents-form-title mt-2 text-[21px] font-semibold tracking-[-0.025em] text-text-strong">
                {ui.draft.name || language.t("settings.agents.title")}
              </h2>
              <p class="settings-agents-form-description mt-1 text-[12.5px] leading-relaxed text-text-weak">
                {language.t("settings.agents.intro")}
              </p>
            </div>

            <section class="settings-agents-form-section settings-agents-form-section-enter">
              <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Field label={language.t("settings.agents.name")} hint={language.t("settings.agents.nameHint")}>
                  <input
                    type="text"
                    value={ui.draft.name}
                    disabled={ui.original !== undefined}
                    placeholder={language.t("settings.agents.namePlaceholder")}
                    onInput={(event) => setUI("draft", "name", event.currentTarget.value.toLowerCase())}
                    class={`${fieldClass} font-mono disabled:opacity-60`}
                  />
                </Field>

                <Field label={language.t("settings.agents.field.description")}>
                  <input
                    type="text"
                    value={ui.draft.description}
                    placeholder={language.t("settings.agents.descriptionPlaceholder")}
                    onInput={(event) => setUI("draft", "description", event.currentTarget.value)}
                    class={fieldClass}
                  />
                </Field>
              </div>
            </section>

            <section class="settings-agents-form-section settings-agents-form-section-enter mt-6 border-t border-[#e2e8f0] pt-5 dark:border-[#1e293b]">
              <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Field label={language.t("settings.agents.mode")}>
                  <Select
                    options={modeOptions()}
                    current={modeOptions().find((option) => option.id === ui.draft.mode)}
                    value={(option) => option.id}
                    label={(option) => option.label}
                    onSelect={(option) => option && setUI("draft", "mode", option.id)}
                    variant="secondary"
                    size="small"
                    triggerVariant="settings"
                    triggerStyle={{ width: "100%" }}
                  />
                </Field>

                <Field label={language.t("settings.agents.model")}>
                  <Select
                    options={modelOptions()}
                    current={modelOptions().find((option) => option.id === ui.draft.model) ?? modelOptions()[0]}
                    value={(option) => option.id}
                    label={(option) => option.name}
                    onSelect={(option) => setUI("draft", "model", option?.id ?? "")}
                    variant="secondary"
                    size="small"
                    triggerVariant="settings"
                    triggerStyle={{ width: "100%" }}
                  />
                </Field>

                <Field label={language.t("settings.agents.steps")}>
                  <input
                    type="number"
                    min={1}
                    step={1}
                    value={ui.draft.steps}
                    onInput={(event) => setUI("draft", "steps", event.currentTarget.value)}
                    class={fieldClass}
                  />
                </Field>

                <div class="settings-agents-disable-field flex items-end justify-between gap-3 rounded-xl border border-[#e2e8f0] bg-white/60 px-3 py-2 dark:border-[#1e293b] dark:bg-[#0f172a]/50">
                  <span class="text-[12.5px] font-medium text-text-strong">{language.t("settings.agents.disable")}</span>
                  <Switch
                    checked={ui.draft.disabled}
                    aria-label={language.t("settings.agents.disable")}
                    onChange={(checked) => setUI("draft", "disabled", checked)}
                  />
                </div>
              </div>
            </section>

            <section class="settings-agents-form-section settings-agents-form-section-enter mt-6 border-t border-[#e2e8f0] pt-5 dark:border-[#1e293b]">
              <Field label={language.t("settings.agents.prompt")}>
                <textarea
                  rows={6}
                  value={ui.draft.prompt}
                  placeholder={language.t("settings.agents.promptPlaceholder")}
                  onInput={(event) => setUI("draft", "prompt", event.currentTarget.value)}
                  class={`${fieldClass} resize-y font-mono`}
                />
              </Field>
            </section>

            <Show when={ui.error}>
              <p class="settings-agents-form-error mt-5 rounded-xl border border-[#fecaca] bg-[#fff1f2] px-3 py-2 text-[12px] font-medium text-[#b91c1c] dark:border-[#7f1d1d] dark:bg-[#450a0a]/30 dark:text-[#fca5a5]" role="alert">
                {ui.error}
              </p>
            </Show>
          </div>
        </div>
      </Show>
    </div>
  )
}
