import { For, Show, createMemo, type Component } from "solid-js"
import { createStore } from "solid-js/store"
import { Icon } from "@sutradhar/ui/icon"
import { useLanguage } from "@/context/language"
import { useSkills } from "@/context/skills"
import { matchesSkill, type SkillCatalogItem, type SkillCategory } from "./skills/catalog"

const badgeClass =
  "settings-skills-badge inline-flex items-center gap-1.5 rounded-full border border-[#7dd3fc] bg-[#e0f2fe] px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-[0.14em] text-[#0369a1] dark:border-[#0ea5e9]/40 dark:bg-[#0c4a6e]/50 dark:text-[#7dd3fc]"

const slashClass =
  "settings-skills-slash inline-flex items-center rounded-full border border-[#bae6fd] bg-white/70 px-2 py-0.5 font-mono text-[10.5px] font-semibold text-[#0284c7] dark:border-[#0ea5e9]/30 dark:bg-[#0f172a]/60 dark:text-[#7dd3fc]"

const primaryButtonClass =
  "settings-skills-button settings-skills-button-primary inline-flex items-center justify-center gap-1.5 rounded-xl bg-gradient-to-r from-[#0284c7] to-[#2563eb] px-3 py-1.5 text-[12px] font-semibold text-white shadow-[0_4px_14px_-2px_rgba(2,132,199,0.35)] transition hover:brightness-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#38bdf8]/70 disabled:cursor-default disabled:opacity-60"

const ghostButtonClass =
  "settings-skills-button settings-skills-button-ghost inline-flex items-center justify-center gap-1.5 rounded-xl border border-[#bae6fd] bg-white/70 px-3 py-1.5 text-[12px] font-semibold text-[#0369a1] transition hover:border-[#38bdf8] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#38bdf8]/70 dark:border-[#0ea5e9]/30 dark:bg-[#0f172a]/60 dark:text-[#7dd3fc]"

const categoryClasses: Record<SkillCategory, string> = {
  documents: "settings-skills-category-documents",
  engineering: "settings-skills-category-engineering",
  design: "settings-skills-category-design",
  platform: "settings-skills-category-platform",
  productivity: "settings-skills-category-productivity",
  research: "settings-skills-category-research",
}

const categoryIcons = {
  documents: "file-tree",
  engineering: "code",
  design: "photo",
  platform: "server",
  productivity: "task",
  research: "glasses",
} as const

const categoryClass = (category: SkillCategory) => categoryClasses[category]

const SkillCard: Component<{
  skill: SkillCatalogItem
  installed: boolean
  builtin: boolean
  onOpen: () => void
  onInstall: () => void
  onUninstall: () => void
}> = (props) => {
  const language = useLanguage()

  return (
    <article
      class={`settings-skills-card settings-skills-card-enter ${categoryClass(props.skill.category)}`}
      data-category={props.skill.category}
      data-state={props.installed ? "installed" : "available"}
    >
      <div class="settings-skills-card-accent" aria-hidden="true" />
      <div class="settings-skills-card-content flex min-w-0 flex-1 flex-col gap-3 p-4">
        <div class="flex items-start justify-between gap-3">
          <div class="flex min-w-0 gap-3">
            <div class="settings-skills-card-icon mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-xl" aria-hidden="true">
              <Icon name={categoryIcons[props.skill.category]} class="size-4" />
            </div>
            <div class="min-w-0">
              <div class="flex flex-wrap items-center gap-2">
                <span class="truncate text-[13.5px] font-semibold text-text-strong">{props.skill.name}</span>
                <span class={slashClass}>/{props.skill.slash}</span>
                <Show when={props.builtin}>
                  <span class="settings-skills-builtin rounded-full bg-[#f0fdf4] px-2 py-0.5 text-[10px] font-semibold text-[#15803d] dark:bg-[#052e16]/70 dark:text-[#86efac]">
                    {language.t("settings.skills.builtin")}
                  </span>
                </Show>
              </div>
              <p class="mt-1 text-[12px] leading-relaxed text-text-weak">{props.skill.tagline}</p>
            </div>
          </div>
          <Show
            when={!props.builtin}
            fallback={
              <span class="settings-skills-status settings-skills-status-installed shrink-0 rounded-full border border-[#bbf7d0] px-2.5 py-1 text-[10.5px] font-semibold text-[#15803d] dark:border-[#166534] dark:text-[#86efac]">
                {language.t("settings.skills.installed")}
              </span>
            }
          >
            <Show
              when={props.installed}
              fallback={
                <button type="button" class={primaryButtonClass} onClick={props.onInstall}>
                  {language.t("settings.skills.install")}
                </button>
              }
            >
              <button type="button" class={ghostButtonClass} onClick={props.onUninstall}>
                {language.t("settings.skills.uninstall")}
              </button>
            </Show>
          </Show>
        </div>

        <div class="settings-skills-boosts flex flex-wrap gap-1.5">
          <For each={props.skill.boosts.slice(0, 3)}>
            {(boost) => (
              <span class="settings-skills-boost rounded-full bg-[#f0f9ff] px-2 py-0.5 text-[10.5px] font-medium text-[#0369a1] dark:bg-[#082f49]/70 dark:text-[#7dd3fc]">
                {boost}
              </span>
            )}
          </For>
        </div>

        <div class="settings-skills-card-footer mt-auto flex items-center justify-between gap-3 border-t border-[#e2e8f0]/70 pt-2.5 text-[11px] text-text-subtle dark:border-[#1e293b]">
          <span class="truncate">{props.skill.source}</span>
          <button
            type="button"
            class="settings-skills-details inline-flex shrink-0 items-center gap-1 font-semibold text-[#0284c7] transition hover:text-[#0369a1] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#38bdf8]/70 dark:text-[#7dd3fc]"
            onClick={props.onOpen}
          >
            {language.t("settings.skills.details")}
            <Icon name="chevron-right" class="size-3" />
          </button>
        </div>
      </div>
    </article>
  )
}

const SkillDetail: Component<{ skill: SkillCatalogItem; onBack: () => void }> = (props) => {
  const language = useLanguage()
  const skills = useSkills()
  const installed = createMemo(() => skills.isInstalled(props.skill.id))
  const builtin = createMemo(() => skills.isBuiltin(props.skill.id))

  return (
    <div class={`settings-skills-detail settings-skills-detail-enter ${categoryClass(props.skill.category)}`}>
      <div class="settings-skills-detail-toolbar flex flex-wrap items-center justify-between gap-3">
        <button
          type="button"
          class={ghostButtonClass}
          onClick={props.onBack}
          aria-label={language.t("common.goBack")}
        >
          <Icon name="arrow-left" class="size-3.5" />
        </button>
        <div class="flex items-center gap-2">
          <Show
            when={!builtin()}
            fallback={
              <span class="settings-skills-status settings-skills-status-installed rounded-full border border-[#bbf7d0] px-2.5 py-1 text-[10.5px] font-semibold text-[#15803d] dark:border-[#166534] dark:text-[#86efac]">
                {language.t("settings.skills.builtin")}
              </span>
            }
          >
            <Show
              when={installed()}
              fallback={
                <button type="button" class={primaryButtonClass} onClick={() => skills.install(props.skill.id)}>
                  {language.t("settings.skills.install")}
                </button>
              }
            >
              <button type="button" class={ghostButtonClass} onClick={() => skills.uninstall(props.skill.id)}>
                {language.t("settings.skills.uninstall")}
              </button>
            </Show>
          </Show>
        </div>
      </div>

      <div class="settings-skills-detail-hero relative overflow-hidden rounded-[22px] border border-[#bae6fd] p-6 dark:border-[#0ea5e9]/25">
        <div class="settings-skills-detail-hero-glow" aria-hidden="true" />
        <div class="relative">
          <div class="flex flex-wrap items-center gap-3">
            <div class="settings-skills-detail-icon flex size-10 shrink-0 items-center justify-center rounded-2xl" aria-hidden="true">
              <Icon name={categoryIcons[props.skill.category]} class="size-5" />
            </div>
            <div class="flex flex-wrap items-center gap-2">
              <h3 class="text-[20px] font-semibold tracking-[-0.02em] text-text-strong">{props.skill.name}</h3>
              <span class={slashClass}>/{props.skill.slash}</span>
            </div>
          </div>
          <p class="mt-3 max-w-[680px] text-[13px] leading-relaxed text-text-weak">{props.skill.description}</p>
          <div class="mt-4 flex flex-wrap items-center gap-2 text-[11px] text-text-subtle">
            <span class={badgeClass}>{language.t("settings.skills.source")}</span>
            <a
              href={props.skill.sourceUrl}
              target="_blank"
              rel="noreferrer"
              class="settings-skills-source font-semibold text-[#0284c7] hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#38bdf8]/70 dark:text-[#7dd3fc]"
            >
              {props.skill.source}
            </a>
            <span aria-hidden="true">·</span>
            <span>{props.skill.license}</span>
          </div>
        </div>
      </div>

      <div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <section class="settings-skills-detail-panel rounded-[18px] border border-[#e2e8f0] bg-white/70 p-4 dark:border-[#1e293b] dark:bg-[#0f172a]/60">
          <div class="settings-skills-detail-label text-[10.5px] font-bold uppercase tracking-[0.12em] text-[#0369a1] dark:text-[#7dd3fc]">
            {language.t("settings.skills.useWhen")}
          </div>
          <ul class="mt-2 space-y-1.5 text-[12px] text-text-weak">
            <For each={props.skill.triggers}>
              {(trigger) => (
                <li class="flex gap-2">
                  <Icon name="arrow-right" class="mt-0.5 size-3 shrink-0 text-[#0284c7]" />
                  <span>{trigger}</span>
                </li>
              )}
            </For>
          </ul>
        </section>
        <section class="settings-skills-detail-panel rounded-[18px] border border-[#e2e8f0] bg-white/70 p-4 dark:border-[#1e293b] dark:bg-[#0f172a]/60">
          <div class="settings-skills-detail-label text-[10.5px] font-bold uppercase tracking-[0.12em] text-[#0369a1] dark:text-[#7dd3fc]">
            {language.t("settings.skills.improves")}
          </div>
          <ul class="mt-2 space-y-1.5 text-[12px] text-text-weak">
            <For each={props.skill.boosts}>
              {(boost) => (
                <li class="flex gap-2">
                  <Icon name="check-small" class="mt-0.5 size-3 shrink-0 text-[#0284c7]" />
                  <span>{boost}</span>
                </li>
              )}
            </For>
          </ul>
        </section>
      </div>

      <div class="settings-skills-instructions overflow-hidden rounded-[18px] border border-[#e2e8f0] bg-[#0f172a] dark:border-[#1e293b]">
        <div class="settings-skills-instructions-header flex items-center justify-between border-b border-white/10 px-4 py-2 text-[11px] font-semibold text-[#7dd3fc]">
          <span>SKILL.md</span>
          <span class="font-mono text-[10px] text-white/40">{props.skill.name}</span>
        </div>
        <pre class="max-h-[320px] overflow-auto whitespace-pre-wrap break-words p-4 font-mono text-[11.5px] leading-relaxed text-[#e2e8f0]">
          {props.skill.instructions}
        </pre>
      </div>
    </div>
  )
}

export const SettingsSkills: Component = () => {
  const language = useLanguage()
  const skills = useSkills()
  const [ui, setUI] = createStore<{ query: string; selected?: SkillCatalogItem }>({ query: "" })

  const installed = createMemo(() => skills.installed().filter((skill) => matchesSkill(skill, ui.query)))
  const available = createMemo(() => skills.available().filter((skill) => matchesSkill(skill, ui.query)))
  const installedTotal = createMemo(() => skills.installed().length)
  const availableTotal = createMemo(() => skills.available().length)

  const clearSearch = () => setUI("query", "")

  return (
    <div class="settings-skills-view settings-skills-view-enter flex h-full flex-col overflow-y-auto px-4 pb-12 no-scrollbar sm:px-10">
      <Show
        when={ui.selected}
        fallback={
          <div class="settings-skills-list-view mx-auto flex w-full max-w-[960px] flex-col gap-6 pt-6">
            <header class="settings-skills-header flex flex-col gap-5">
              <div class="flex flex-wrap items-start justify-between gap-5">
                <div class="min-w-0">
                  <div class={badgeClass}>
                    <Icon name="models" class="size-3" />
                    {language.t("settings.tab.skills")}
                  </div>
                  <h2 class="mt-3 text-[24px] font-semibold tracking-[-0.03em] text-text-strong">
                    {language.t("settings.skills.title")}
                  </h2>
                  <p class="mt-1.5 max-w-[620px] text-[13px] leading-relaxed text-text-weak">{language.t("settings.skills.intro")}</p>
                </div>

                <div class="settings-skills-stats grid w-full grid-cols-2 gap-2 sm:w-auto sm:min-w-[250px]">
                  <div class="settings-skills-stat rounded-2xl border border-[#e2e8f0] bg-white/70 px-3.5 py-3 shadow-[0_6px_20px_-16px_rgba(2,132,199,0.45)] dark:border-[#1e293b] dark:bg-[#0f172a]/60">
                    <div class="text-[20px] font-semibold tracking-[-0.03em] text-text-strong">{installedTotal()}</div>
                    <div class="mt-0.5 text-[10px] font-bold uppercase tracking-[0.12em] text-text-subtle">
                      {language.t("settings.skills.installed")}
                    </div>
                  </div>
                  <div class="settings-skills-stat rounded-2xl border border-[#e2e8f0] bg-white/70 px-3.5 py-3 shadow-[0_6px_20px_-16px_rgba(2,132,199,0.45)] dark:border-[#1e293b] dark:bg-[#0f172a]/60">
                    <div class="text-[20px] font-semibold tracking-[-0.03em] text-text-strong">{availableTotal()}</div>
                    <div class="mt-0.5 text-[10px] font-bold uppercase tracking-[0.12em] text-text-subtle">
                      {language.t("settings.skills.marketplace")}
                    </div>
                  </div>
                </div>
              </div>

              <div class="settings-skills-toolbar flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div class="settings-skills-search relative w-full sm:max-w-[360px]">
                  <Icon
                    name="magnifying-glass"
                    class="pointer-events-none absolute left-3.5 top-1/2 size-3.5 -translate-y-1/2 text-text-subtle"
                  />
                  <input
                    id="settings-skills-search"
                    type="search"
                    value={ui.query}
                    onInput={(event) => setUI("query", event.currentTarget.value)}
                    placeholder={language.t("common.search.placeholder")}
                    aria-label={language.t("common.search.placeholder")}
                    aria-controls="settings-skills-results"
                    spellcheck={false}
                    autocomplete="off"
                    class="settings-skills-search-input w-full rounded-2xl border border-[#e2e8f0] bg-white/80 py-2.5 pl-10 pr-10 text-[12.5px] text-text-strong outline-none transition focus:border-[#38bdf8] focus:ring-2 focus:ring-[#38bdf8]/20 dark:border-[#1e293b] dark:bg-[#0f172a]/70"
                  />
                  <Show when={ui.query}>
                    <button
                      type="button"
                      class="settings-skills-search-clear absolute right-2 top-1/2 flex size-7 -translate-y-1/2 items-center justify-center rounded-full text-text-subtle transition hover:bg-black/[0.05] hover:text-text-strong focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#38bdf8]/70 dark:hover:bg-white/[0.08]"
                      onClick={clearSearch}
                      aria-label={language.t("common.clear")}
                    >
                      <Icon name="close-small" class="size-3.5" />
                    </button>
                  </Show>
                </div>
              </div>
            </header>

            <div id="settings-skills-results" class="settings-skills-results" aria-live="polite">
              <Show
                when={installed().length > 0 || available().length > 0}
                fallback={<p class="settings-skills-empty rounded-2xl border border-dashed border-[#bae6fd] bg-white/50 px-6 py-10 text-center text-[12.5px] text-text-weak dark:border-[#0ea5e9]/30 dark:bg-[#0f172a]/50">{language.t("settings.skills.empty")}</p>}
              >
                <div class="flex flex-col gap-7">
                  <Show when={installed().length > 0}>
                    <section class="settings-skills-section flex flex-col gap-3" aria-labelledby="settings-skills-installed-heading">
                      <div class="flex items-center justify-between gap-3">
                        <h3 id="settings-skills-installed-heading" class="settings-skills-section-title text-[11px] font-bold uppercase tracking-[0.14em] text-text-subtle">
                          {language.t("settings.skills.installed")}
                        </h3>
                        <span class="settings-skills-section-count rounded-full bg-black/[0.04] px-2 py-0.5 text-[10px] font-semibold text-text-subtle dark:bg-white/[0.08]">
                          {installed().length}
                        </span>
                      </div>
                      <div class="grid grid-cols-1 gap-3 lg:grid-cols-2">
                        <For each={installed()}>
                          {(skill) => (
                            <SkillCard
                              skill={skill}
                              installed
                              builtin={skills.isBuiltin(skill.id)}
                              onOpen={() => setUI("selected", skill)}
                              onInstall={() => skills.install(skill.id)}
                              onUninstall={() => skills.uninstall(skill.id)}
                            />
                          )}
                        </For>
                      </div>
                    </section>
                  </Show>

                  <Show when={available().length > 0}>
                    <section class="settings-skills-section flex flex-col gap-3" aria-labelledby="settings-skills-marketplace-heading">
                      <div class="flex items-center justify-between gap-3">
                        <h3 id="settings-skills-marketplace-heading" class="settings-skills-section-title text-[11px] font-bold uppercase tracking-[0.14em] text-text-subtle">
                          {language.t("settings.skills.marketplace")}
                        </h3>
                        <span class="settings-skills-section-count rounded-full bg-black/[0.04] px-2 py-0.5 text-[10px] font-semibold text-text-subtle dark:bg-white/[0.08]">
                          {available().length}
                        </span>
                      </div>
                      <div class="grid grid-cols-1 gap-3 lg:grid-cols-2">
                        <For each={available()}>
                          {(skill) => (
                            <SkillCard
                              skill={skill}
                              installed={false}
                              builtin={false}
                              onOpen={() => setUI("selected", skill)}
                              onInstall={() => skills.install(skill.id)}
                              onUninstall={() => skills.uninstall(skill.id)}
                            />
                          )}
                        </For>
                      </div>
                    </section>
                  </Show>
                </div>
              </Show>
            </div>
          </div>
        }
      >
        {(skill) => (
          <div class="settings-skills-detail-view mx-auto flex w-full max-w-[960px] flex-col gap-5 pt-6">
            <SkillDetail skill={skill()} onBack={() => setUI("selected", undefined)} />
          </div>
        )}
      </Show>
    </div>
  )
}
