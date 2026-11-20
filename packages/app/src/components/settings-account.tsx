import { createMemo, createSignal, For, Show, type Component } from "solid-js"
import { useSutradharAuth } from "@/context/sutradhar-auth"
import { useModels } from "@/context/models"

export const SettingsAccount: Component = () => {
  const auth = useSutradharAuth()
  const models = useModels()
  const [googleEmail, setGoogleEmail] = createSignal("")
  const [googleName, setGoogleName] = createSignal("")
  const [submitting, setSubmitting] = createSignal(false)

  const freeModels = createMemo(() =>
    models
      .list()
      .filter((m) => m.provider.id === "sutradhar" && (!m.cost || m.cost.input === 0)),
  )

  const handleDirectLogin = async (e: SubmitEvent) => {
    e.preventDefault()
    if (submitting()) return
    setSubmitting(true)
    try {
      const ok = await auth.signInWithGoogleEmail(googleEmail(), googleName())
      if (ok) {
        setGoogleEmail("")
        setGoogleName("")
      }
    } finally {
      setSubmitting(false)
    }
  }

  const formatTime = (ts: number) => {
    if (!ts) return "Ready to sync"
    return new Intl.DateTimeFormat(undefined, {
      hour: "numeric",
      minute: "2-digit",
      second: "2-digit",
    }).format(new Date(ts))
  }

  return (
    <div class="flex flex-col h-full overflow-y-auto no-scrollbar px-4 pb-12 sm:px-10 sm:pb-12">
      <div class="flex flex-col gap-6 pt-6 max-w-[740px]">
        {/* Header */}
        <div class="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div class="inline-flex items-center gap-1.5 rounded-full border border-[#7dd3fc] bg-[#e0f2fe] px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-[0.14em] text-[#0369a1]">
              <span>✦</span> Sutradhar Account &amp; Cloud Sync
            </div>
            <h2 class="mt-2 text-[20px] font-semibold tracking-[-0.02em] text-text-strong">
              Google Identity &amp; Personal Telemetry
            </h2>
            <p class="mt-1 text-[13px] text-text-weak">
              Manage your Google authentication for free models, sync local coding sessions to the cloud, and launch your personal web analytics sanctuary.
            </p>
          </div>
        </div>

        {/* Section 1: Google Identity Profile Card */}
        <div
          class="relative overflow-hidden rounded-[22px] border border-[#bae6fd] p-6 shadow-[0_12px_32px_-12px_rgba(2,132,199,0.14)]"
          style={{
            background:
              "radial-gradient(circle at 8% 0%, rgba(56, 189, 248, 0.2), transparent 16rem), radial-gradient(circle at 92% 100%, rgba(37, 99, 235, 0.12), transparent 16rem), linear-gradient(155deg, #f8fbff 0%, #eef6ff 55%, #e0f2fe 100%)",
          }}
        >
          <Show
            when={auth.isAuthenticated() && auth.user()}
            fallback={
              <div class="space-y-4 text-[#0f172a]">
                <div class="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <h3 class="text-base font-semibold text-[#0f172a]">Sign in with Google</h3>
                    <p class="mt-0.5 text-xs text-[#475569]">
                      Required once to unlock all curated Sutradhar free models and cloud activity tracking.
                    </p>
                  </div>
                  <span class="rounded-full border border-[#7dd3fc] bg-white/80 px-2.5 py-1 text-[10.5px] font-semibold text-[#0284c7]">
                    Not Signed In
                  </span>
                </div>

                <button
                  type="button"
                  onClick={() => void auth.startGoogleSignIn()}
                  class="flex w-full items-center justify-center gap-3 rounded-2xl border border-[#7dd3fc] bg-gradient-to-b from-white to-[#f0f9ff] px-4 py-3 text-[13px] font-semibold text-[#0f172a] shadow-[0_6px_18px_-4px_rgba(2,132,199,0.18)] transition hover:border-[#38bdf8]"
                >
                  <svg class="h-4 w-4 shrink-0" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17z" />
                    <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.11-6.72-4.96H1.29v3.14C3.26 21.3 7.31 24 12 24z" />
                    <path fill="#FBBC05" d="M5.28 14.24c-.24-.72-.38-1.49-.38-2.24s.14-1.52.38-2.24V6.62H1.29C.47 8.24 0 10.06 0 12s.47 3.76 1.29 5.38l3.99-3.14z" />
                    <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.7 1.29 6.62l3.99 3.14c.95-2.85 3.6-4.96 6.72-4.96z" />
                  </svg>
                  <span>{auth.isPolling() ? "Waiting for Browser Google Sign-In…" : "Continue with Google in Browser ↗"}</span>
                </button>

                <form
                  onSubmit={handleDirectLogin}
                  class="space-y-2.5 rounded-2xl border border-[#bae6fd] bg-white/80 p-4 backdrop-blur-md"
                >
                  <div class="text-[10.5px] font-bold uppercase tracking-[0.12em] text-[#0369a1]">
                    Or Instant In-App Google Account Verification
                  </div>
                  <div class="grid grid-cols-1 gap-2 sm:grid-cols-2">
                    <input
                      type="text"
                      value={googleName()}
                      onInput={(e) => setGoogleName(e.currentTarget.value)}
                      placeholder="Your Name (optional)"
                      class="w-full rounded-xl border border-[#bae6fd] bg-white px-3 py-2 text-xs text-[#0f172a] outline-none focus:border-[#0284c7]"
                    />
                    <input
                      type="email"
                      required
                      value={googleEmail()}
                      onInput={(e) => setGoogleEmail(e.currentTarget.value)}
                      placeholder="your.name@gmail.com"
                      class="w-full rounded-xl border border-[#bae6fd] bg-white px-3 py-2 text-xs text-[#0f172a] outline-none focus:border-[#0284c7]"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={submitting()}
                    class="w-full rounded-xl bg-gradient-to-r from-[#0284c7] to-[#2563eb] px-3 py-2.5 text-xs font-semibold text-white shadow-sm transition hover:brightness-105"
                  >
                    {submitting() ? "Connecting Account…" : "Connect Google Account Instantly →"}
                  </button>
                </form>
              </div>
            }
          >
            {(u) => (
              <div class="space-y-5 text-[#0f172a]">
                <div class="flex flex-wrap items-center justify-between gap-4">
                  <div class="flex items-center gap-4">
                    <div class="relative shrink-0">
                      <Show
                        when={u().photoURL}
                        fallback={
                          <div class="flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-tr from-[#0284c7] via-[#0ea5e9] to-[#38bdf8] text-xl font-bold text-white shadow-[0_8px_20px_-4px_rgba(2,132,199,0.35)] ring-2 ring-white/90 ring-offset-2 ring-offset-[#e0f2fe]">
                            {(u().displayName || "S").charAt(0).toUpperCase()}
                          </div>
                        }
                      >
                        <img
                          src={u().photoURL}
                          alt={u().displayName}
                          class="h-16 w-16 rounded-full border-2 border-white object-cover shadow-[0_8px_20px_-4px_rgba(2,132,199,0.35)] ring-2 ring-[#7dd3fc]/60 ring-offset-2 ring-offset-white/80"
                        />
                      </Show>
                      <span class="absolute -bottom-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full border-2 border-white bg-[#0284c7] text-[8px] font-bold text-white shadow-sm" title="Google Verified">
                        ✓
                      </span>
                    </div>
                    <div>
                      <div class="flex items-center gap-2">
                        <h3 class="text-lg font-semibold text-[#0f172a]">{u().displayName}</h3>
                        <span class="inline-flex items-center gap-1 rounded-full border border-[#7dd3fc] bg-[#e0f2fe] px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[#0369a1]">
                          <span class="size-1.5 rounded-full bg-[#0284c7]" /> Verified
                        </span>
                      </div>
                      <p class="mt-0.5 font-mono text-xs text-[#475569]">{u().email}</p>
                      <p class="mt-1 text-[11px] text-[#64748b]">
                        Free Models Unlocked · Cloud Telemetry Active
                      </p>
                    </div>
                  </div>

                  <div class="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => void auth.startGoogleSignIn()}
                      class="rounded-xl border border-[#7dd3fc] bg-white/90 px-3.5 py-2 text-xs font-semibold text-[#0369a1] shadow-sm transition hover:bg-white"
                    >
                      Switch Account
                    </button>
                    <button
                      type="button"
                      onClick={() => auth.logout()}
                      class="rounded-xl border border-[#fecdd3] bg-[#fff1f2] px-3.5 py-2 text-xs font-semibold text-[#e11d48] transition hover:bg-[#ffe4e6]"
                    >
                      Sign Out
                    </button>
                  </div>
                </div>
              </div>
            )}
          </Show>
        </div>

        {/* Section 2: Personal Web Activity & Analytics Portal Launcher */}
        <div class="rounded-[22px] border border-[#bae6fd] bg-gradient-to-r from-[#f0f9ff] via-[#e0f2fe]/65 to-[#dbeafe]/65 p-5 sm:p-6 shadow-sm">
          <div class="flex flex-wrap items-center justify-between gap-4">
            <div class="max-w-md">
              <div class="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.12em] text-[#0284c7]">
                <span>●</span> Personal Web Dashboard
              </div>
              <h3 class="mt-1 text-[15px] font-semibold text-[#0f172a]">
                Sutradhar User Activity &amp; Reasoning Portal
              </h3>
              <p class="mt-1 text-xs leading-relaxed text-[#475569]">
                Inspect your personal token burn ledger, model-wise usage breakdown, 14-day coding streaks, and full internal chain-of-thought (`&lt;think&gt;`) traces in the web app.
              </p>
            </div>
            <button
              type="button"
              onClick={() => auth.openUserPortal()}
              class="inline-flex shrink-0 items-center gap-2 rounded-2xl bg-gradient-to-r from-[#0284c7] to-[#2563eb] px-4 py-3 text-xs font-semibold text-white shadow-[0_6px_18px_rgba(2,132,199,0.24)] transition hover:brightness-105 active:scale-[0.99]"
            >
              <span>Open User Portal Web App</span>
              <span>↗</span>
            </button>
          </div>
        </div>

        {/* Section 3: Real-Time Cloud Sync & Telemetry Engine */}
        <div class="rounded-[22px] border border-[#bae6fd] bg-white/85 p-5 sm:p-6 shadow-sm space-y-5">
          <div class="flex flex-wrap items-center justify-between gap-4 border-b border-[#e0f2fe] pb-4">
            <div>
              <h3 class="text-[15px] font-semibold text-[#0f172a]">
                Real-Time Conversation &amp; Reasoning Cloud Sync
              </h3>
              <p class="mt-0.5 text-xs text-[#64748b]">
                All conversations are saved locally on your computer and automatically mirrored to your cloud account.
              </p>
            </div>
            <div class="flex flex-wrap items-center gap-3">
              <div class="inline-flex items-center gap-2 rounded-full border border-[#7dd3fc] bg-[#e0f2fe]/90 px-3.5 py-1.5 text-xs font-semibold text-[#0369a1] shadow-sm">
                <span class="relative flex h-2 w-2">
                  <span class="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#0284c7] opacity-75"></span>
                  <span class="relative inline-flex h-2 w-2 rounded-full bg-[#0284c7]"></span>
                </span>
                <span>Mandatory Real-Time Cloud Telemetry</span>
              </div>
              <button
                type="button"
                disabled={auth.syncStats().isSyncing}
                onClick={() => void auth.syncNow()}
                class="inline-flex items-center gap-2 rounded-xl border border-[#7dd3fc] bg-white px-3.5 py-1.5 text-xs font-semibold text-[#0369a1] shadow-sm transition hover:bg-[#f0f9ff] active:scale-95 disabled:opacity-50"
              >
                <Show when={auth.syncStats().isSyncing}>
                  <span class="h-3 w-3 animate-spin rounded-full border-2 border-[#0284c7]/30 border-t-[#0284c7]" />
                </Show>
                <span>{auth.syncStats().isSyncing ? "Syncing…" : "Force Cloud Sync Now ↺"}</span>
              </button>
            </div>
          </div>

          <div class="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div class="rounded-2xl border border-[#e0f2fe] bg-[#f8fbff] p-3.5">
              <div class="text-[10.5px] font-semibold uppercase tracking-[0.08em] text-[#64748b]">Synced Sessions</div>
              <div class="mt-1.5 text-2xl font-bold text-[#0f172a]">{auth.syncStats().syncedSessionsCount}</div>
              <div class="mt-0.5 text-[10px] text-[#0284c7]">Local + Cloud</div>
            </div>
            <div class="rounded-2xl border border-[#e0f2fe] bg-[#f8fbff] p-3.5">
              <div class="text-[10.5px] font-semibold uppercase tracking-[0.08em] text-[#64748b]">Synced Turns</div>
              <div class="mt-1.5 text-2xl font-bold text-[#0f172a]">{auth.syncStats().syncedMessagesCount}</div>
              <div class="mt-0.5 text-[10px] text-[#0284c7]">Prompts &amp; Replies</div>
            </div>
            <div class="rounded-2xl border border-[#e0f2fe] bg-[#f8fbff] p-3.5">
              <div class="text-[10.5px] font-semibold uppercase tracking-[0.08em] text-[#64748b]">Tokens Mirrored</div>
              <div class="mt-1.5 text-2xl font-bold text-[#0284c7]">
                {auth.syncStats().syncedTokensTotal.toLocaleString()}
              </div>
              <div class="mt-0.5 text-[10px] text-[#64748b]">Input + Output + CoT</div>
            </div>
            <div class="rounded-2xl border border-[#e0f2fe] bg-[#f8fbff] p-3.5">
              <div class="text-[10.5px] font-semibold uppercase tracking-[0.08em] text-[#64748b]">Reasoning Traces</div>
              <div class="mt-1.5 text-2xl font-bold text-[#2563eb]">{auth.syncStats().syncedReasoningTurns}</div>
              <div class="mt-0.5 text-[10px] text-[#64748b]">Last: {formatTime(auth.syncStats().lastSyncAt)}</div>
            </div>
          </div>
        </div>

        {/* Section 4: Curated Free Models Access Status */}
        <div class="rounded-[22px] border border-[#bae6fd] bg-white/85 p-5 sm:p-6 shadow-sm space-y-3.5">
          <div class="flex items-center justify-between">
            <div>
              <h3 class="text-[15px] font-semibold text-[#0f172a]">Curated Sutradhar Free Models</h3>
              <p class="mt-0.5 text-xs text-[#64748b]">
                Live models discovered and disguised for your desktop workspace.
              </p>
            </div>
            <span class="rounded-full border border-[#7dd3fc] bg-[#f0f9ff] px-3 py-1 text-xs font-semibold text-[#0369a1]">
              {freeModels().length} Active Models
            </span>
          </div>

          <div class="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <For each={freeModels()}>
              {(m) => (
                <div class="flex items-center justify-between rounded-xl border border-[#e0f2fe] bg-[#f8fbff] px-3.5 py-2.5">
                  <span class="truncate text-xs font-semibold text-[#0f172a]">{m.name}</span>
                  <span
                    class={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                      auth.isAuthenticated()
                        ? "bg-[#e0f2fe] text-[#0369a1]"
                        : "bg-slate-100 text-slate-500"
                    }`}
                  >
                    {auth.isAuthenticated() ? "Unlocked" : "Sign in required"}
                  </span>
                </div>
              )}
            </For>
          </div>
        </div>
      </div>
    </div>
  )
}
