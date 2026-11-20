import { Show, createResource, createSignal, type Component } from "solid-js"
import { Button } from "@sutradhar/ui/button"
import { Icon } from "@sutradhar/ui/icon"
import { useLanguage } from "@/context/language"
import { usePlatform, type ComputerUseStatus } from "@/context/platform"

export const SettingsComputerUse: Component = () => {
  const language = useLanguage()
  const platform = usePlatform()
  const [busy, setBusy] = createSignal(false)
  const [status, { refetch }] = createResource<ComputerUseStatus>(
    () => platform.computerUse?.status() ?? Promise.resolve({ ready: false }),
  )

  const run = async (action: "start" | "stop") => {
    const computerUse = platform.computerUse
    if (!computerUse || busy()) return
    setBusy(true)
    try {
      if (action === "start") await computerUse.start()
      else await computerUse.stop()
      await refetch()
    } finally {
      setBusy(false)
    }
  }

  return (
    <div class="flex h-full flex-col overflow-y-auto px-4 pb-12 no-scrollbar sm:px-10">
      <div class="mx-auto flex w-full max-w-[960px] flex-col gap-6 pt-6">
        <header class="flex flex-col gap-2">
          <div class="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.14em] text-[#0369a1] dark:text-[#7dd3fc]">
            <Icon name="window-cursor" class="size-3.5" />
            {language.t("settings.section.desktop")}
          </div>
          <h2 class="text-[22px] font-semibold tracking-[-0.02em] text-text-strong">
            {language.t("settings.computerUse.title")}
          </h2>
          <p class="max-w-[700px] text-[13px] leading-relaxed text-text-weak">
            {language.t("settings.computerUse.intro")}
          </p>
        </header>

        <section class="overflow-hidden rounded-[22px] border border-[#bae6fd] bg-gradient-to-br from-[#f0f9ff] via-white to-[#eff6ff] shadow-[0_18px_50px_-36px_rgba(2,132,199,0.7)] dark:border-[#0ea5e9]/25 dark:from-[#082f49]/50 dark:via-[#0f172a]/70 dark:to-[#172554]/60">
          <div class="flex flex-wrap items-center justify-between gap-4 border-b border-[#bae6fd]/70 px-5 py-4 dark:border-[#0ea5e9]/20">
            <div class="flex items-center gap-3">
              <span
                class="flex size-10 items-center justify-center rounded-2xl bg-[#0284c7] text-white shadow-[0_7px_18px_-7px_rgba(2,132,199,0.8)]"
                aria-hidden="true"
              >
                <Icon name="window-cursor" class="size-5" />
              </span>
              <div>
                <div class="text-[14px] font-semibold text-text-strong">
                  {language.t("settings.computerUse.runtime")}
                </div>
                <div class="text-[11.5px] text-text-weak">{language.t("settings.computerUse.runtimeHint")}</div>
              </div>
            </div>
            <div class="flex items-center gap-2">
              <span
                class="inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10.5px] font-semibold"
                classList={{
                  "border-[#bbf7d0] bg-[#f0fdf4] text-[#15803d] dark:border-[#166534] dark:bg-[#052e16]/70 dark:text-[#86efac]":
                    status()?.ready === true,
                  "border-[#fde68a] bg-[#fffbeb] text-[#a16207] dark:border-[#854d0e] dark:bg-[#451a03]/60 dark:text-[#fde68a]":
                    status()?.ready !== true,
                }}
              >
                <span class="size-1.5 rounded-full bg-current" />
                {status()?.ready === true
                  ? language.t("settings.computerUse.ready")
                  : language.t("settings.computerUse.unavailable")}
              </span>
              <Button
                variant="secondary"
                size="small"
                disabled={busy() || !platform.computerUse}
                onClick={() => void run("start")}
              >
                {language.t("settings.computerUse.start")}
              </Button>
              <Button
                variant="ghost"
                size="small"
                disabled={busy() || !platform.computerUse}
                onClick={() => void run("stop")}
              >
                {language.t("settings.computerUse.stop")}
              </Button>
            </div>
          </div>

          <div class="grid gap-px bg-[#bae6fd]/70 dark:bg-[#0ea5e9]/20 sm:grid-cols-2">
            <div class="bg-white/65 px-5 py-4 dark:bg-[#0f172a]/55">
              <div class="mb-1 text-[10.5px] font-bold uppercase tracking-[0.12em] text-text-subtle">
                {language.t("settings.computerUse.browser")}
              </div>
              <div class="flex items-center gap-2 text-[13px] font-medium text-text-strong">
                <span class="size-2 rounded-full bg-[#22c55e]" />
                {status()?.browser?.backend ?? language.t("settings.computerUse.notConnected")}
              </div>
            </div>
            <div class="bg-white/65 px-5 py-4 dark:bg-[#0f172a]/55">
              <div class="mb-1 text-[10.5px] font-bold uppercase tracking-[0.12em] text-text-subtle">
                {language.t("settings.computerUse.desktop")}
              </div>
              <div class="flex items-center gap-2 text-[13px] font-medium text-text-strong">
                <span class={`size-2 rounded-full ${status()?.desktop?.ready ? "bg-[#22c55e]" : "bg-[#f59e0b]"}`} />
                {status()?.desktop?.backend ?? language.t("settings.computerUse.platformUnavailable")}
              </div>
            </div>
          </div>

          <div class="flex flex-col gap-2 px-5 py-4 text-[12px] leading-relaxed text-text-weak">
            <div class="flex items-start gap-2">
              <Icon name="check" class="mt-0.5 size-3.5 shrink-0 text-[#0284c7]" />
              {language.t("settings.computerUse.semantic")}
            </div>
            <div class="flex items-start gap-2">
              <Icon name="check" class="mt-0.5 size-3.5 shrink-0 text-[#0284c7]" />
              {language.t("settings.computerUse.verification")}
            </div>
            <div class="flex items-start gap-2">
              <Icon name="shield" class="mt-0.5 size-3.5 shrink-0 text-[#0284c7]" />
              {language.t("settings.computerUse.sensitive")}
            </div>
          </div>
        </section>

        <Show when={status()?.endpoint}>
          <div class="rounded-2xl border border-[#e2e8f0] bg-white/70 px-4 py-3 text-[11px] text-text-subtle dark:border-[#1e293b] dark:bg-[#0f172a]/60">
            {language.t("settings.computerUse.endpoint")}:{" "}
            <code class="font-mono text-text-weak">{status()?.endpoint}</code>
          </div>
        </Show>
      </div>
    </div>
  )
}
