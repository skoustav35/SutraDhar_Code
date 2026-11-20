import {
  createContext,
  createMemo,
  createSignal,
  onCleanup,
  onMount,
  useContext,
  type Accessor,
  type ParentProps,
} from "solid-js"
import { usePlatform } from "@/context/platform"
import { showToast } from "@/utils/toast"
import {
  cloudSyncStats,
  getStoredSutradharAuth,
  setSutradharAutoSyncEnabled,
  SUTRADHAR_ADMIN_API_BASE,
  SUTRADHAR_AUTH_STORAGE_KEY,
  SUTRADHAR_PORTAL_BASE,
  syncAllLocalSessionsToSutradharCloud,
  type SutradharCloudSyncStats,
  type SutradharStoredAuth,
} from "./sutradhar-cloud-sync"

const [globalAuthSignal, setGlobalAuthSignal] = createSignal<SutradharStoredAuth | null>(
  getStoredSutradharAuth(),
)

export function isSutradharGoogleAuthenticated(): boolean {
  const cur = globalAuthSignal() || getStoredSutradharAuth()
  return Boolean(cur && cur.uid && cur.email)
}

export function setSutradharGoogleAuthSession(session: SutradharStoredAuth | null) {
  if (typeof window !== "undefined") {
    if (session) {
      window.localStorage.setItem(SUTRADHAR_AUTH_STORAGE_KEY, JSON.stringify(session))
    } else {
      window.localStorage.removeItem(SUTRADHAR_AUTH_STORAGE_KEY)
    }
  }
  setGlobalAuthSignal(session)
  if (session) {
    setTimeout(() => {
      void syncAllLocalSessionsToSutradharCloud(true)
    }, 300)
  }
}

export interface SutradharAuthContextValue {
  user: Accessor<SutradharStoredAuth | null>
  isAuthenticated: Accessor<boolean>
  isPolling: Accessor<boolean>
  deviceCode: Accessor<string>
  syncStats: Accessor<SutradharCloudSyncStats>
  startGoogleSignIn: () => Promise<void>
  signInWithGoogleEmail: (email: string, displayName?: string) => Promise<boolean>
  syncNow: () => Promise<{ syncedSessions: number; totalTokens: number }>
  setAutoSync: (enabled: boolean) => void
  cancelPolling: () => void
  openUserPortal: () => void
  logout: () => void
}

const SutradharAuthContext = createContext<SutradharAuthContextValue>()

export function SutradharAuthProvider(props: ParentProps) {
  const platform = usePlatform()
  const [isPolling, setIsPolling] = createSignal(false)
  const [deviceCode, setDeviceCode] = createSignal("")
  let pollInterval: ReturnType<typeof setInterval> | undefined

  const openBrowserUrl = (url: string) => {
    try {
      if (typeof platform.openExternal === "function") {
        platform.openExternal(url)
        return
      }
    } catch {}
    try {
      const api = (window as any).api
      if (api && typeof api.openExternal === "function") {
        api.openExternal(url)
        return
      }
    } catch {}
    if (typeof window !== "undefined") {
      window.open(url, "_blank", "noopener,noreferrer")
    }
  }

  onMount(() => {
    const stored = getStoredSutradharAuth()
    if (stored) {
      setGlobalAuthSignal(stored)
    }
  })

  const cancelPolling = () => {
    if (pollInterval) {
      clearInterval(pollInterval)
      pollInterval = undefined
    }
    setIsPolling(false)
  }

  onCleanup(() => {
    cancelPolling()
  })

  const startGoogleSignIn = async () => {
    cancelPolling()
    showToast({
      title: "Automatic Dataset Sync Enabled",
      description: "Chats and AI context auto-sync continuously. Enter your Google email below to associate a named profile.",
    })
  }

  const signInWithGoogleEmail = async (emailRaw: string, displayNameRaw?: string): Promise<boolean> => {
    const email = emailRaw.trim().toLowerCase()
    if (!email || !email.includes("@")) {
      showToast({
        variant: "error",
        title: "Invalid Google Email",
        description: "Please enter a valid Google email address (e.g. your.name@gmail.com).",
      })
      return false
    }
    cancelPolling()
    const cleanName =
      displayNameRaw?.trim() ||
      email
        .split("@")[0]
        .replace(/[._-]+/g, " ")
        .replace(/\b\w/g, (l) => l.toUpperCase()) ||
      "Sutradhar Scholar"

    const uid = `google_${email.replace(/[^a-z0-9]/g, "_")}`
    const photoURL = `https://ui-avatars.com/api/?name=${encodeURIComponent(cleanName)}&background=0284c7&color=ffffff&bold=true`
    const nextSession: SutradharStoredAuth = {
      uid,
      email,
      displayName: cleanName,
      photoURL,
      idToken: `sutradhar_google_bridge_${uid}_${Date.now()}`,
      refreshToken: "",
      authenticatedAt: Date.now(),
    }

    setSutradharGoogleAuthSession(nextSession)
    showToast({
      variant: "success",
      title: "Local Profile Connected",
      description: `Signed in locally as ${nextSession.displayName} (${nextSession.email}).`,
    })
    return true
  }

  const syncNow = async () => {
    const res = await syncAllLocalSessionsToSutradharCloud(true)
    showToast({
      variant: "success",
      title: "Cloud Telemetry Synced",
      description: `Synced ${res.syncedSessions} conversation(s) (${res.totalTokens.toLocaleString()} tokens) to Sutradhar Cloud.`,
    })
    return res
  }

  const openUserPortal = () => {
    const cur = globalAuthSignal() || getStoredSutradharAuth()
    if (cur?.email) {
      openBrowserUrl(
        `${SUTRADHAR_PORTAL_BASE}?email=${encodeURIComponent(cur.email)}&name=${encodeURIComponent(cur.displayName || "")}`,
      )
      return
    }
    openBrowserUrl(SUTRADHAR_PORTAL_BASE)
  }

  const logout = () => {
    cancelPolling()
    setSutradharGoogleAuthSession(null)
    showToast({
      title: "Signed out of Sutradhar",
      description: "Sign in with Google anytime to use free models.",
    })
  }

  const isAuthenticated = createMemo(() => Boolean(globalAuthSignal()?.uid))

  const value: SutradharAuthContextValue = {
    user: globalAuthSignal,
    isAuthenticated,
    isPolling,
    deviceCode,
    syncStats: cloudSyncStats,
    startGoogleSignIn,
    signInWithGoogleEmail,
    syncNow,
    setAutoSync: setSutradharAutoSyncEnabled,
    cancelPolling,
    openUserPortal,
    logout,
  }

  return <SutradharAuthContext.Provider value={value}>{props.children}</SutradharAuthContext.Provider>
}

export function useSutradharAuth(): SutradharAuthContextValue {
  const ctx = useContext(SutradharAuthContext)
  if (!ctx) {
    throw new Error("useSutradharAuth must be used within a SutradharAuthProvider")
  }
  return ctx
}
