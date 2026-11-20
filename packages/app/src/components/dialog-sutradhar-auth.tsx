import { createEffect, createSignal, Show, type Component } from "solid-js"
import { DialogV2 } from "@sutradhar/ui/v2/dialog-v2"
import { useDialog } from "@sutradhar/ui/context/dialog"
import { useSutradharAuth } from "@/context/sutradhar-auth"

export function openSutradharAuthDialog(dialog: ReturnType<typeof useDialog>, autoCloseOnAuth = true) {
  dialog.show(() => <DialogSutradharAuth autoCloseOnAuth={autoCloseOnAuth} />)
}

export const DialogSutradharAuth: Component<{ autoCloseOnAuth?: boolean }> = (props) => {
  const dialog = useDialog()
  const auth = useSutradharAuth()
  const [googleEmail, setGoogleEmail] = createSignal("")
  const [googleName, setGoogleName] = createSignal("")
  const [submitting, setSubmitting] = createSignal(false)

  createEffect(() => {
    if (props.autoCloseOnAuth !== false && auth.isAuthenticated() && auth.isPolling() === false) {
      dialog.close()
    }
  })

  const handleDirectSubmit = async (e: SubmitEvent) => {
    e.preventDefault()
    if (submitting()) return
    setSubmitting(true)
    try {
      const ok = await auth.signInWithGoogleEmail(googleEmail(), googleName())
      if (ok && props.autoCloseOnAuth !== false) {
        dialog.close()
      }
    } finally {
      setSubmitting(false)
    }
  }

  const openAccountSettings = () => {
    void import("./dialog-settings").then((m) => {
      dialog.show(() => <m.DialogSettings defaultValue="account" />)
    })
  }

  return (
    <DialogV2
      fit
      containerClass="!h-auto !w-[min(calc(100vw_-_32px),468px)] !rounded-[26px] !border !border-[#bae6fd] !bg-transparent !p-0 !shadow-[0_24px_70px_-12px_rgba(14,116,144,0.22),0_8px_24px_-6px_rgba(2,132,199,0.14)] overflow-hidden"
      class="!p-0 [font-family:var(--v2-font-family-sans)]"
    >
      <div
        class="relative overflow-hidden p-6 sm:p-7 text-[#0f172a]"
        style={{
          background:
            "radial-gradient(circle at 10% 0%, rgba(56, 189, 248, 0.24), transparent 18rem), radial-gradient(circle at 92% 100%, rgba(37, 99, 235, 0.16), transparent 18rem), linear-gradient(160deg, #f8fbff 0%, #eef6ff 52%, #e0f2fe 100%)",
        }}
      >
        {/* Top subtle sky-blue glass highlight */}
        <div class="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white to-transparent" />

        <Show
          when={auth.isAuthenticated() && auth.user()}
          fallback={
            <div class="space-y-4">
              <div class="flex items-center justify-between gap-2">
                <span class="inline-flex items-center gap-1.5 rounded-full border border-[#7dd3fc] bg-[#e0f2fe]/90 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-[#0369a1] shadow-sm">
                  <span class="text-[#0284c7]">✦</span> Sutradhar Identity
                </span>
                <div class="flex items-center gap-2">
                  <span class="rounded-full border border-[#bae6fd] bg-white/80 px-2.5 py-0.5 text-[10px] font-semibold text-[#0284c7]">
                    Google Verified
                  </span>
                  <button
                    type="button"
                    onClick={() => dialog.close()}
                    class="grid size-6 place-items-center rounded-full border border-[#bae6fd]/80 bg-white/80 text-[#475569] transition hover:bg-white hover:text-[#0f172a]"
                    aria-label="Close"
                  >
                    ✕
                  </button>
                </div>
              </div>

              <div>
                <h2 class="text-[21px] font-semibold tracking-[-0.02em] text-[#0f172a]">
                  Sign in with Google to unlock free models
                </h2>
                <p class="mt-1.5 text-[12.5px] leading-relaxed text-[#475569]">
                  Authenticate once with your Google account to unlock all curated Sutradhar free models and automatic cloud reasoning sync.
                </p>
              </div>

              <div class="grid grid-cols-2 gap-2.5 text-left">
                <div class="rounded-2xl border border-[#bae6fd]/90 bg-white/85 p-3 shadow-[0_2px_10px_rgba(2,132,199,0.05)] backdrop-blur-md">
                  <div class="flex items-center gap-1.5 text-[11.5px] font-semibold text-[#0369a1]">
                    <span class="size-1.5 rounded-full bg-[#0284c7]" />
                    <span>Curated Free Models</span>
                  </div>
                  <div class="mt-1 text-[10.5px] leading-snug text-[#64748b]">
                    Full access to Sutradhar 3.8 Pro, Nova Multimodal, DeepCoder &amp; more.
                  </div>
                </div>
                <div class="rounded-2xl border border-[#bae6fd]/90 bg-white/85 p-3 shadow-[0_2px_10px_rgba(2,132,199,0.05)] backdrop-blur-md">
                  <div class="flex items-center gap-1.5 text-[11.5px] font-semibold text-[#1d4ed8]">
                    <span class="size-1.5 rounded-full bg-[#2563eb]" />
                    <span>Cloud &amp; Local Sync</span>
                  </div>
                  <div class="mt-1 text-[10.5px] leading-snug text-[#64748b]">
                    Saved locally on your machine and synced to your personal cloud analytics.
                  </div>
                </div>
              </div>

              <Show when={auth.isPolling()}>
                <div class="flex items-center justify-between rounded-2xl border border-[#7dd3fc] bg-[#e0f2fe]/80 px-4 py-2.5 text-xs text-[#0369a1]">
                  <div class="flex items-center gap-2.5">
                    <span class="h-3.5 w-3.5 animate-spin rounded-full border-2 border-[#0284c7]/30 border-t-[#0284c7]" />
                    <span class="font-medium">Browser opened! Complete Google Sign-In there or below…</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => auth.cancelPolling()}
                    class="text-[11px] font-semibold text-[#0369a1] underline hover:text-[#0f172a]"
                  >
                    Cancel
                  </button>
                </div>
              </Show>

              <button
                type="button"
                onClick={() => void auth.startGoogleSignIn()}
                class="flex w-full items-center justify-center gap-3 rounded-2xl border border-[#7dd3fc] bg-gradient-to-b from-white to-[#f0f9ff] px-4 py-3 text-[13.5px] font-semibold text-[#0f172a] shadow-[0_6px_20px_-4px_rgba(2,132,199,0.18)] transition hover:border-[#38bdf8] hover:shadow-[0_8px_24px_-4px_rgba(2,132,199,0.26)] active:scale-[0.99]"
              >
                <svg class="h-4 w-4 shrink-0" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.11-6.72-4.96H1.29v3.14C3.26 21.3 7.31 24 12 24z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.28 14.24c-.24-.72-.38-1.49-.38-2.24s.14-1.52.38-2.24V6.62H1.29C.47 8.24 0 10.06 0 12s.47 3.76 1.29 5.38l3.99-3.14z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.7 1.29 6.62l3.99 3.14c.95-2.85 3.6-4.96 6.72-4.96z"
                  />
                </svg>
                <span>{auth.isPolling() ? "Re-open Google Sign-In in Browser ↗" : "Continue with Google in Browser ↗"}</span>
              </button>

              <form
                onSubmit={handleDirectSubmit}
                class="space-y-2.5 rounded-2xl border border-[#bae6fd] bg-white/75 p-3.5 text-left shadow-[inset_0_1px_0_rgba(255,255,255,0.9)] backdrop-blur-md"
              >
                <div class="flex items-center justify-between">
                  <span class="text-[10.5px] font-bold uppercase tracking-[0.12em] text-[#0369a1]">
                    Or Instant In-App Google Sign-In
                  </span>
                  <span class="rounded-full bg-[#e0f2fe] px-2 py-0.5 text-[9.5px] font-semibold text-[#0284c7]">
                    1-Click Verify
                  </span>
                </div>
                <div class="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  <input
                    type="text"
                    value={googleName()}
                    onInput={(e) => setGoogleName(e.currentTarget.value)}
                    placeholder="Your Name (optional)"
                    class="w-full rounded-xl border border-[#bae6fd] bg-white px-3 py-2 text-xs text-[#0f172a] outline-none transition placeholder:text-[#94a3b8] focus:border-[#0284c7] focus:ring-2 focus:ring-[#38bdf8]/20"
                  />
                  <input
                    type="email"
                    required
                    value={googleEmail()}
                    onInput={(e) => setGoogleEmail(e.currentTarget.value)}
                    placeholder="your.name@gmail.com"
                    class="w-full rounded-xl border border-[#bae6fd] bg-white px-3 py-2 text-xs text-[#0f172a] outline-none transition placeholder:text-[#94a3b8] focus:border-[#0284c7] focus:ring-2 focus:ring-[#38bdf8]/20"
                  />
                </div>
                <button
                  type="submit"
                  disabled={submitting()}
                  class="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#0284c7] to-[#2563eb] px-3 py-2.5 text-xs font-semibold text-white shadow-[0_4px_14px_rgba(2,132,199,0.28)] transition hover:brightness-105 active:scale-[0.99]"
                >
                  <span>{submitting() ? "Connecting Google Account…" : "Connect Google Account Instantly →"}</span>
                </button>
              </form>
            </div>
          }
        >
          {(user) => (
            <div class="space-y-4">
              <div class="flex items-center justify-between">
                <span class="inline-flex items-center gap-1.5 rounded-full border border-[#7dd3fc] bg-[#e0f2fe] px-3 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-[#0369a1]">
                  <span class="size-1.5 rounded-full bg-[#0284c7]" /> Google Identity Active
                </span>
                <button
                  type="button"
                  onClick={() => dialog.close()}
                  class="grid size-6 place-items-center rounded-full border border-[#bae6fd] bg-white/80 text-[#475569] transition hover:bg-white hover:text-[#0f172a]"
                  aria-label="Close"
                >
                  ✕
                </button>
              </div>

              <div class="flex items-center gap-3.5 rounded-2xl border border-[#bae6fd] bg-white/90 p-4 shadow-sm">
                <Show
                  when={user().photoURL}
                  fallback={
                    <div class="flex h-11 w-11 items-center justify-center rounded-full bg-gradient-to-br from-[#0284c7] to-[#2563eb] text-base font-bold text-white shadow-sm">
                      {(user().displayName || "S").charAt(0).toUpperCase()}
                    </div>
                  }
                >
                  <img
                    src={user().photoURL}
                    alt={user().displayName}
                    class="h-11 w-11 rounded-full border-2 border-[#7dd3fc] shadow-sm"
                  />
                </Show>
                <div class="min-w-0 flex-1">
                  <div class="truncate text-sm font-semibold text-[#0f172a]">{user().displayName}</div>
                  <div class="truncate font-mono text-xs text-[#475569]">{user().email}</div>
                </div>
              </div>

              <div class="flex flex-col gap-2">
                <button
                  type="button"
                  onClick={openAccountSettings}
                  class="flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-[#0284c7] to-[#2563eb] px-4 py-3 text-xs font-semibold text-white shadow-[0_6px_18px_rgba(2,132,199,0.25)] transition hover:brightness-105"
                >
                  <span>Manage Account &amp; Cloud Sync in Settings</span>
                  <span>→</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    auth.logout()
                    dialog.close()
                  }}
                  class="flex w-full items-center justify-center gap-2 rounded-2xl border border-[#fecdd3] bg-[#fff1f2] px-4 py-2.5 text-xs font-semibold text-[#e11d48] transition hover:bg-[#ffe4e6]"
                >
                  <span>Sign Out of Google Account</span>
                </button>
              </div>
            </div>
          )}
        </Show>
      </div>
    </DialogV2>
  )
}
