import { For } from "solid-js"
import { useNavigate } from "@solidjs/router"
import { base64Encode } from "@sutradhar/core/util/encode"
import { Icon, type IconProps } from "@sutradhar/ui/icon"
import { useLayout } from "@/context/layout"
import { useServer } from "@/context/server"
import { useServerSync } from "@/context/server-sync"
import { useSettings } from "@/context/settings"
import { useTabs } from "@/context/tabs"

export type BrainstormStarter = {
  title: string
  tag: string
  icon: IconProps["name"]
  description: string
  prompt: string
}

export const BRAINSTORM_STARTERS: ReadonlyArray<BrainstormStarter> = [
  {
    title: "Ideal System Blueprint",
    tag: "Architecture",
    icon: "brain",
    description: "Co-design an end-to-end architecture from first principles, invariants, and clean data flows.",
    prompt:
      "Let's design an ideal system from first principles. Ask me 4 clarifying questions about the domain, constraints, scale targets, and failure tolerance, then help me craft the cleanest architecture.",
  },
  {
    title: "Trade-Off & Bottleneck Matrix",
    tag: "Deep Analysis",
    icon: "sliders",
    description: "Evaluate competing designs across latency, complexity, consistency, and long-term evolution.",
    prompt:
      "I want to evaluate competing system designs and trade-offs. Help me build a decision matrix covering complexity, latency, consistency, operability, and long-term evolution.",
  },
  {
    title: "Zero-to-One Product Loop",
    tag: "Product UX",
    icon: "bubble-5",
    description: "Shape the core user workflow, remove friction, and define high-leverage scope cleanly.",
    prompt:
      "Let's brainstorm an ideal product experience from scratch. Help me define the core user loop, remove unnecessary complexity, and identify what makes the workflow feel effortless.",
  },
  {
    title: "Scale & Failure Simulator",
    tag: "Resilience",
    icon: "circle-ban-sign",
    description: "Stress-test key assumptions at 10x–100x load to catch brittle edges before coding.",
    prompt:
      "Act as a principal systems thinker and devil's advocate. Let's brainstorm stress scenarios, failure modes, and clean recovery invariants for a system I'm designing.",
  },
]

export function ChatBrainstormEmpty(props: { onPick: (promptText: string) => void }) {
  const layout = useLayout()

  return (
    <div class="sutradhar-mode-enter mx-auto flex w-full max-w-[840px] flex-col justify-center gap-4 px-4 sm:px-6 min-h-0">
      <div
        data-slot="chat-hero-card"
        class="relative overflow-hidden rounded-[24px] border border-v2-border-border-base bg-white/90 px-6 py-5 shadow-[0_2px_6px_rgba(15,42,74,0.05),0_16px_38px_-12px_rgba(15,42,74,0.13),inset_0_1px_0_rgba(255,255,255,0.98)]"
      >
        <div
          aria-hidden="true"
          class="pointer-events-none absolute -top-12 right-8 h-36 w-64 rounded-full opacity-60 blur-3xl"
          style={{
            background: "radial-gradient(circle, rgba(37, 99, 235, 0.16), transparent 72%)",
          }}
        />
        <div class="relative flex flex-wrap items-center justify-between gap-4">
          <div class="min-w-0 flex-1 space-y-1.5">
            <div class="inline-flex items-center gap-2 rounded-full border border-v2-border-border-base bg-v2-background-bg-layer-01/90 px-3 py-0.5 text-[11px] font-medium text-text-strong">
              <span class="size-1.5 rounded-full bg-[#2563eb] shadow-[0_0_8px_rgba(37,99,235,0.55)]" />
              <span>Pure Chat · Zero Local Tool Access</span>
            </div>
            <h2 class="text-[22px] sm:text-[24px] font-semibold tracking-[-0.025em] text-text-strong leading-tight">
              Think &amp; Design Ideal Systems
            </h2>
            <p class="max-w-xl text-[13px] text-text-weak leading-relaxed">
              Calm conversational workspace with no terminals or file edits. Explore architecture and clarity first.
            </p>
          </div>
          <button
            type="button"
            onClick={() => layout.appMode.set("ide")}
            class="inline-flex h-8.5 shrink-0 items-center gap-1.5 rounded-full border border-v2-border-border-base bg-white px-4 text-[12px] font-medium text-text-strong shadow-[0_1px_2px_rgba(15,42,74,0.06)] transition-all duration-150 hover:bg-v2-background-bg-layer-01 hover:-translate-y-px cursor-pointer"
          >
            <Icon name="code" size="small" />
            <span>Open IDE</span>
          </button>
        </div>
      </div>

      <div class="grid w-full grid-cols-1 gap-3.5 sm:grid-cols-2">
        <For each={BRAINSTORM_STARTERS}>
          {(item) => (
            <button
              type="button"
              onClick={() => props.onPick(item.prompt)}
              data-slot="chat-starter-card"
              class="group flex min-h-[112px] flex-col justify-between gap-2.5 rounded-[20px] border border-v2-border-border-base bg-white/88 p-5 text-left shadow-[0_2px_5px_rgba(15,42,74,0.04),0_10px_26px_-10px_rgba(15,42,74,0.11),inset_0_1px_0_rgba(255,255,255,0.96)] transition-all duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] hover:-translate-y-0.5 hover:bg-white hover:border-v2-border-border-strong hover:shadow-[0_4px_10px_rgba(15,42,74,0.06),0_18px_36px_-12px_rgba(15,42,74,0.16)] cursor-pointer"
            >
              <div class="flex w-full items-center justify-between gap-2.5">
                <div class="flex min-w-0 items-center gap-2.5">
                  <span class="flex size-7 shrink-0 items-center justify-center rounded-xl bg-v2-background-bg-layer-01 text-v2-icon-icon-accent">
                    <Icon name={item.icon} size="small" />
                  </span>
                  <span class="text-[14px] font-semibold tracking-[-0.015em] text-text-strong truncate">
                    {item.title}
                  </span>
                </div>
                <span class="shrink-0 rounded-full border border-v2-border-border-muted bg-v2-background-bg-layer-01 px-2.5 py-0.5 text-[10.5px] font-medium text-text-weak">
                  {item.tag}
                </span>
              </div>
              <p class="text-[12.5px] text-text-weak leading-[1.5] line-clamp-2">{item.description}</p>
            </button>
          )}
        </For>
      </div>
    </div>
  )
}

export function ChatBrainstormHome() {
  const navigate = useNavigate()
  const layout = useLayout()
  const server = useServer()
  const serverSync = useServerSync()
  const settings = useSettings()
  const tabs = useTabs()

  const startChat = (initialPrompt?: string) => {
    const syncData = serverSync().data
    const targetDir =
      layout.home.selection()?.directory ??
      server.projects.list()[0]?.worktree ??
      syncData.project[0]?.worktree ??
      syncData.path.directory ??
      syncData.path.home
    if (!targetDir) return
    layout.appMode.set("chat")
    if (settings.general.newLayoutDesigns()) {
      tabs.newDraft({ server: server.key, directory: targetDir }, initialPrompt ?? "")
      return
    }
    navigate(
      `/${base64Encode(targetDir)}/session`,
      initialPrompt ? { state: { brainstormPrompt: initialPrompt } } : undefined,
    )
  }

  return (
    <div class="m-3 md:my-4 md:me-5 md:ms-3.5 min-h-0 flex-1 self-stretch overflow-hidden">
      <div
        data-slot="session-panel-frame"
        data-app-mode="chat"
        class="sutradhar-mode-enter flex h-full min-h-0 flex-col items-center justify-center overflow-hidden rounded-[24px] border border-v2-border-border-base bg-v2-background-bg-base px-6 py-5 shadow-[var(--v2-elevation-raised)]"
      >
        <div class="flex w-full max-w-[840px] flex-col gap-5 min-h-0">
          <div class="relative overflow-hidden rounded-[24px] border border-v2-border-border-base bg-white/92 px-6 py-5 shadow-[0_2px_6px_rgba(15,42,74,0.05),0_16px_38px_-12px_rgba(15,42,74,0.13),inset_0_1px_0_rgba(255,255,255,0.98)]">
            <div class="flex flex-wrap items-center justify-between gap-4">
              <div class="min-w-0 flex-1 space-y-1.5">
                <div class="inline-flex items-center gap-2 rounded-full border border-v2-border-border-base bg-v2-background-bg-layer-01/90 px-3 py-0.5 text-[11px] font-medium text-text-strong">
                  <span class="size-1.5 rounded-full bg-[#2563eb] shadow-[0_0_8px_rgba(37,99,235,0.55)]" />
                  <span>Sutradhar Pure Chat</span>
                </div>
                <h1 class="text-[24px] sm:text-[26px] font-semibold text-text-strong tracking-[-0.03em] leading-tight">
                  Think deeply. Design ideal systems.
                </h1>
                <p class="max-w-xl text-[13px] text-text-weak leading-relaxed">
                  Calm conversational dashboard without file trees, terminals, or local tools.
                </p>
              </div>
              <div class="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => startChat()}
                  class="inline-flex h-9 items-center gap-2 rounded-full bg-[#2563eb] px-4.5 text-[12.5px] font-medium text-white shadow-[0_6px_16px_-4px_rgba(37,99,235,0.45)] transition-all duration-150 hover:bg-[#1d4ed8] hover:-translate-y-px cursor-pointer"
                >
                  <Icon name="bubble-5" size="small" />
                  <span>New Chat</span>
                </button>
                <button
                  type="button"
                  onClick={() => layout.appMode.set("agent")}
                  class="inline-flex h-9 items-center rounded-full border border-v2-border-border-base bg-white px-3.5 text-[12px] font-medium text-text-weak shadow-2xs transition hover:text-text-strong cursor-pointer"
                >
                  Agent
                </button>
              </div>
            </div>
          </div>

          <div class="grid w-full grid-cols-1 gap-3.5 sm:grid-cols-2">
            <For each={BRAINSTORM_STARTERS}>
              {(item) => (
                <button
                  type="button"
                  onClick={() => startChat(item.prompt)}
                  class="group flex min-h-[118px] flex-col justify-between gap-2.5 rounded-[20px] border border-v2-border-border-base bg-white/88 p-5 text-left shadow-[0_2px_5px_rgba(15,42,74,0.04),0_10px_26px_-10px_rgba(15,42,74,0.11),inset_0_1px_0_rgba(255,255,255,0.96)] transition-all duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] hover:-translate-y-0.5 hover:bg-white hover:border-v2-border-border-strong hover:shadow-[0_4px_10px_rgba(15,42,74,0.06),0_18px_36px_-12px_rgba(15,42,74,0.16)] cursor-pointer"
                >
                  <div class="flex w-full items-center justify-between gap-2.5">
                    <div class="flex min-w-0 items-center gap-2.5">
                      <span class="flex size-7 shrink-0 items-center justify-center rounded-xl bg-v2-background-bg-layer-01 text-v2-icon-icon-accent">
                        <Icon name={item.icon} size="small" />
                      </span>
                      <span class="text-[14px] font-semibold tracking-[-0.015em] text-text-strong truncate">
                        {item.title}
                      </span>
                    </div>
                    <span class="shrink-0 rounded-full border border-v2-border-border-muted bg-v2-background-bg-layer-01 px-2.5 py-0.5 text-[10.5px] font-medium text-text-weak">
                      {item.tag}
                    </span>
                  </div>
                  <p class="text-[12.5px] text-text-weak leading-[1.5] line-clamp-2">{item.description}</p>
                </button>
              )}
            </For>
          </div>
        </div>
      </div>
    </div>
  )
}
