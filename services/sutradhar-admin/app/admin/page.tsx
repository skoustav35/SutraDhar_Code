"use client"

import React, { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import {
  getActiveFirebaseSession,
  signOutFirebaseSession,
  type FirebaseAuthSession,
} from "@/lib/firebase"
import type { AppSettingsDoc, CuratedModelDoc } from "@/lib/types"
import {
  Sparkles,
  RefreshCw,
  Save,
  Search,
  Check,
  ExternalLink,
  LogOut,
  Eye,
  Wand2,
  Database,
  Brain,
  Wrench,
  Layers,
  Copy,
  CheckCircle2,
} from "lucide-react"

const BADGE_OPTIONS = [
  "Recommended",
  "Flagship",
  "Coding Pro",
  "Deep Reasoning",
  "Ultra Fast",
  "Long Context",
  "Code Specialist",
  "Vision",
  "Omni",
  "Pro",
  "Standard",
]

const CATEGORY_OPTIONS: { value: CuratedModelDoc["category"]; label: string }[] = [
  { value: "flagship", label: "Flagship" },
  { value: "coding", label: "Coding" },
  { value: "reasoning", label: "Reasoning" },
  { value: "fast", label: "Fast" },
  { value: "vision", label: "Vision" },
  { value: "general", label: "General" },
]

export default function AdminDashboardPage() {
  const router = useRouter()
  const [session, setSession] = useState<FirebaseAuthSession | null>(null)
  const [authChecked, setAuthChecked] = useState(false)

  const [models, setModels] = useState<CuratedModelDoc[]>([])
  const [settings, setSettings] = useState<AppSettingsDoc>({
    providerName: "Sutradhar",
    lastSync: 0,
    syncCount: 0,
    autoEnableNewModels: false,
  })
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [dirtyIds, setDirtyIds] = useState<Set<string>>(new Set())
  const [settingsDirty, setSettingsDirty] = useState(false)
  const [toast, setToast] = useState<{ type: "success" | "error"; message: string } | null>(null)

  const [search, setSearch] = useState("")
  const [filterTab, setFilterTab] = useState<"all" | "enabled" | "disabled" | "reasoning" | "coding">("all")
  const [copiedUrl, setCopiedUrl] = useState(false)
  const [showPreviewModal, setShowPreviewModal] = useState(false)

  useEffect(() => {
    getActiveFirebaseSession().then((active) => {
      setSession(active)
      setAuthChecked(true)
      if (!active) {
        router.replace("/login")
      }
    })
  }, [router])

  const showToast = (type: "success" | "error", message: string) => {
    setToast({ type, message })
    setTimeout(() => {
      setToast((prev) => (prev?.message === message ? null : prev))
    }, 4000)
  }

  const fetchDashboardData = async () => {
    setLoading(true)
    try {
      const res = await fetch("/api/models")
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Failed to fetch models")
      setModels(data.models || [])
      if (data.settings) setSettings(data.settings)
      setDirtyIds(new Set())
      setSettingsDirty(false)
    } catch (err: any) {
      showToast("error", err?.message || "Failed to load models from Firestore")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (session) {
      void fetchDashboardData()
    }
  }, [session])

  const handleSyncUpstream = async () => {
    const freshSession = await getActiveFirebaseSession()
    if (!freshSession) {
      router.replace("/login")
      return
    }
    setSyncing(true)
    try {
      const res = await fetch("/api/sync", {
        method: "POST",
        headers: { Authorization: `Bearer ${freshSession.idToken}` },
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Sync failed")
      setModels(data.models || [])
      if (data.settings) setSettings(data.settings)
      showToast(
        "success",
        `Synced ${data.total} live free models from opencode.ai/inference/v1/models (${data.added} new, ${data.removed || 0} stale removed).`,
      )
    } catch (err: any) {
      showToast("error", err?.message || "Upstream sync failed")
    } finally {
      setSyncing(false)
    }
  }

  const handleSaveChanges = async () => {
    const freshSession = await getActiveFirebaseSession()
    if (!freshSession) {
      router.replace("/login")
      return
    }
    setSaving(true)
    try {
      const toSave = dirtyIds.size > 0 ? models.filter((m) => dirtyIds.has(m.id)) : models
      const res = await fetch("/api/models", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${freshSession.idToken}`,
        },
        body: JSON.stringify({
          models: toSave,
          settings,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Save failed")
      setDirtyIds(new Set())
      setSettingsDirty(false)
      showToast(
        "success",
        `Published ${enabledModels.length} active disguised models to Sutradhar (/api.json)!`,
      )
    } catch (err: any) {
      showToast("error", err?.message || "Failed to save changes")
    } finally {
      setSaving(false)
    }
  }

  const updateModel = (id: string, patch: Partial<CuratedModelDoc>) => {
    setModels((prev) => prev.map((m) => (m.id === id ? { ...m, ...patch } : m)))
    setDirtyIds((prev) => {
      const next = new Set(prev)
      next.add(id)
      return next
    })
  }

  const handleBulkAutoDisguise = () => {
    const allIds = new Set(dirtyIds)
    setModels((prev) =>
      prev.map((m) => {
        const cleanOrig = m.upstreamName.replace(/\s*(?:\(free\)|free)$/i, "").trim()
        const nextName = m.disguisedName.startsWith("Sutradhar")
          ? m.disguisedName
          : `Sutradhar ${cleanOrig}`
        allIds.add(m.id)
        return { ...m, disguisedName: nextName }
      }),
    )
    setDirtyIds(allIds)
    showToast("success", "Applied Sutradhar branding prefix to all model names. Click Save & Publish to commit.")
  }

  const handleBulkToggle = (enable: boolean) => {
    const visibleSet = new Set(filteredModels.map((m) => m.id))
    const allIds = new Set(dirtyIds)
    setModels((prev) =>
      prev.map((m) => {
        if (!visibleSet.has(m.id)) return m
        allIds.add(m.id)
        return { ...m, enabled: enable }
      }),
    )
    setDirtyIds(allIds)
  }

  const enabledModels = useMemo(() => models.filter((m) => m.enabled), [models])

  const filteredModels = useMemo(() => {
    const q = search.trim().toLowerCase()
    return models.filter((m) => {
      if (filterTab === "enabled" && !m.enabled) return false
      if (filterTab === "disabled" && m.enabled) return false
      if (filterTab === "reasoning" && !m.reasoning) return false
      if (filterTab === "coding" && m.category !== "coding") return false
      if (!q) return true
      return (
        m.id.toLowerCase().includes(q) ||
        m.disguisedName.toLowerCase().includes(q) ||
        m.upstreamName.toLowerCase().includes(q) ||
        m.upstreamFamily.toLowerCase().includes(q) ||
        m.badge.toLowerCase().includes(q)
      )
    })
  }, [models, search, filterTab])

  const copyCatalogUrl = () => {
    const url = `${window.location.origin}/api.json`
    navigator.clipboard.writeText(url)
    setCopiedUrl(true)
    setTimeout(() => setCopiedUrl(false), 2000)
  }

  if (!authChecked || !session) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0b0d11] text-gray-400 text-sm">
        <div className="flex items-center gap-3">
          <RefreshCw className="w-4 h-4 animate-spin text-indigo-400" />
          <span>Verifying Firebase Admin Session...</span>
        </div>
      </div>
    )
  }

  const hasUnsavedChanges = dirtyIds.size > 0 || settingsDirty

  return (
    <div className="min-h-screen bg-[#0b0d11] text-gray-100 pb-20">
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 max-w-md">
          <div
            className={`px-4 py-3 rounded-xl border shadow-2xl flex items-center gap-3 text-sm font-medium ${
              toast.type === "success"
                ? "bg-emerald-950/95 border-emerald-500/40 text-emerald-200"
                : "bg-red-950/95 border-red-500/40 text-red-200"
            }`}
          >
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
            <span>{toast.message}</span>
          </div>
        </div>
      )}

      <header className="sticky top-0 z-30 bg-[#0b0d11]/90 backdrop-blur-xl border-b border-white/10">
        <div className="max-w-7xl mx-auto px-6 h-18 flex items-center justify-between gap-4 py-3">
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500/25 to-amber-500/20 border border-white/15 flex items-center justify-center shadow-lg">
              <Sparkles className="w-5 h-5 text-indigo-400" />
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h1 className="text-base font-semibold tracking-tight text-white">
                  Sutradhar Model Intermediary
                </h1>
                <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-300 border border-emerald-500/25">
                  Live Proxy Catalog
                </span>
              </div>
              <p className="text-xs text-gray-400">
                Snatches upstream OpenCode free models • Curates &amp; disguises identities for Sutradhar Desktop
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              onClick={() => setShowPreviewModal(true)}
              className="px-3.5 py-2 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 text-xs font-medium text-gray-200 flex items-center gap-2 transition cursor-pointer"
            >
              <Eye className="w-3.5 h-3.5 text-indigo-400" />
              <span>App Preview ({enabledModels.length})</span>
            </button>

            <button
              onClick={handleSyncUpstream}
              disabled={syncing}
              className="px-3.5 py-2 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 text-xs font-medium text-gray-200 flex items-center gap-2 transition cursor-pointer disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-amber-400 ${syncing ? "animate-spin" : ""}`} />
              <span>{syncing ? "Syncing OpenCode..." : "Sync Upstream"}</span>
            </button>

            <button
              onClick={handleSaveChanges}
              disabled={saving}
              className={`px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition cursor-pointer shadow-lg ${
                hasUnsavedChanges
                  ? "bg-indigo-600 hover:bg-indigo-500 text-white shadow-indigo-600/25 ring-2 ring-indigo-400/40"
                  : "bg-indigo-600/80 hover:bg-indigo-600 text-white"
              }`}
            >
              <Save className="w-3.5 h-3.5" />
              <span>
                {saving
                  ? "Publishing..."
                  : hasUnsavedChanges
                    ? `Save & Publish (${dirtyIds.size || 1})`
                    : "Save & Publish"}
              </span>
            </button>

            <div className="h-5 w-px bg-white/10 mx-1" />

            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-400 hidden md:inline">{session.email}</span>
              <button
                onClick={() => {
                  signOutFirebaseSession()
                  router.replace("/login")
                }}
                title="Sign out"
                className="p-2 rounded-xl bg-white/[0.03] hover:bg-red-500/15 border border-white/8 hover:border-red-500/30 text-gray-400 hover:text-red-300 transition cursor-pointer"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 pt-7 space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          <div className="lg:col-span-7 bg-[#12151c] border border-white/10 rounded-2xl p-5 flex flex-col justify-between">
            <div className="flex items-start justify-between gap-4">
              <div>
                <span className="text-[11px] font-mono uppercase tracking-wider text-indigo-400 flex items-center gap-1.5">
                  <Database className="w-3.5 h-3.5" />
                  Desktop App Catalog Endpoint
                </span>
                <h2 className="text-sm font-medium text-white mt-1">
                  Connected to <code className="text-indigo-300 font-mono">sutradhar-models-dev</code> Firestore
                </h2>
                <p className="text-xs text-gray-400 mt-1">
                  Your Sutradhar desktop app fetches <code className="text-gray-300">/api.json</code> from this service. Only enabled models are returned, with their disguised names applied automatically.
                </p>
              </div>
              <a
                href="/api.json"
                target="_blank"
                className="shrink-0 px-3 py-1.5 rounded-lg bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/25 text-xs text-indigo-300 flex items-center gap-1.5 transition"
              >
                <span>Inspect /api.json</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>

            <div className="mt-4 pt-3.5 border-t border-white/8 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2 bg-[#0b0d11] px-3 py-1.5 rounded-lg border border-white/10 text-xs font-mono text-gray-300">
                <span className="text-emerald-400">GET</span>
                <span>{typeof window !== "undefined" ? `${window.location.origin}/api.json` : "/api.json"}</span>
                <button
                  onClick={copyCatalogUrl}
                  className="ml-2 text-gray-400 hover:text-white transition cursor-pointer"
                  title="Copy URL"
                >
                  {copiedUrl ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              </div>

              <div className="flex items-center gap-3 text-xs text-gray-400">
                <span>Provider Display Label:</span>
                <input
                  type="text"
                  value={settings.providerName}
                  onChange={(e) => {
                    setSettings((s) => ({ ...s, providerName: e.target.value }))
                    setSettingsDirty(true)
                  }}
                  className="px-2.5 py-1 rounded-lg bg-[#0b0d11] border border-white/15 text-white text-xs w-36 focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>

            <div className="mt-3 pt-3 border-t border-white/8 space-y-1.5 text-[11px] font-mono">
              <div className="flex items-center justify-between gap-2 bg-[#0b0d11]/90 px-2.5 py-1.5 rounded-lg border border-white/8 text-gray-300">
                <span className="truncate">
                  <span className="text-sky-400 font-semibold mr-2">[Windows PS]</span>
                  {`(irm https://opencode.ai/inference/v1/models).data | ? id -like "*free*" | select name, id`}
                </span>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(
                      `(irm https://opencode.ai/inference/v1/models).data | ? id -like "*free*" | select name, id`,
                    )
                    showToast("success", "Copied Windows PowerShell discovery command!")
                  }}
                  className="text-gray-400 hover:text-white shrink-0 cursor-pointer"
                  title="Copy Windows command"
                >
                  <Copy className="w-3 h-3" />
                </button>
              </div>
              <div className="flex items-center justify-between gap-2 bg-[#0b0d11]/90 px-2.5 py-1.5 rounded-lg border border-white/8 text-gray-300">
                <span className="truncate">
                  <span className="text-emerald-400 font-semibold mr-2">[Linux bash]</span>
                  {`curl -s https://opencode.ai/inference/v1/models | jq '.data[] | select(.id | ascii_downcase | contains("free")) | {name: .name, id: .id}'`}
                </span>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(
                      `curl -s https://opencode.ai/inference/v1/models | jq '.data[] | select(.id | ascii_downcase | contains("free")) | {name: .name, id: .id}'`,
                    )
                    showToast("success", "Copied Linux curl+jq discovery command!")
                  }}
                  className="text-gray-400 hover:text-white shrink-0 cursor-pointer"
                  title="Copy Linux command"
                >
                  <Copy className="w-3 h-3" />
                </button>
              </div>
            </div>
          </div>

          <div className="lg:col-span-5 grid grid-cols-3 gap-3">
            <div className="bg-[#12151c] border border-white/10 rounded-2xl p-4 flex flex-col justify-between">
              <span className="text-xs text-gray-400">Live Free Models</span>
              <div className="text-2xl font-semibold text-white mt-2">{models.length}</div>
              <span className="text-[11px] text-gray-500 mt-1">opencode.ai/inference/v1/models</span>
            </div>

            <div className="bg-[#12151c] border border-indigo-500/30 rounded-2xl p-4 flex flex-col justify-between">
              <span className="text-xs text-indigo-300">Active in Desktop App</span>
              <div className="text-2xl font-semibold text-indigo-400 mt-2">{enabledModels.length}</div>
              <span className="text-[11px] text-indigo-300/70 mt-1">Served in /api.json</span>
            </div>

            <div className="bg-[#12151c] border border-white/10 rounded-2xl p-4 flex flex-col justify-between">
              <span className="text-xs text-gray-400">Disguised Identities</span>
              <div className="text-2xl font-semibold text-amber-400 mt-2">
                {models.filter((m) => m.disguisedName !== m.upstreamName).length}
              </div>
              <span className="text-[11px] text-gray-500 mt-1">Custom display names</span>
            </div>
          </div>
        </div>

        <div className="bg-[#12151c] border border-white/10 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-2">
            {(
              [
                { id: "all", label: `All (${models.length})` },
                { id: "enabled", label: `Enabled in App (${enabledModels.length})` },
                { id: "disabled", label: `Hidden (${models.length - enabledModels.length})` },
                { id: "reasoning", label: "Reasoning" },
                { id: "coding", label: "Coding" },
              ] as const
            ).map((tab) => (
              <button
                key={tab.id}
                onClick={() => setFilterTab(tab.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-medium transition cursor-pointer ${
                  filterTab === tab.id
                    ? "bg-indigo-600 text-white shadow-sm"
                    : "bg-white/[0.03] hover:bg-white/[0.07] text-gray-400 hover:text-gray-200"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-2.5 flex-1 max-w-xl justify-end">
            <div className="relative flex-1 min-w-[220px]">
              <Search className="w-3.5 h-3.5 text-gray-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by upstream ID, disguised name, family..."
                className="w-full pl-9 pr-3 py-1.5 rounded-xl bg-[#0b0d11] border border-white/10 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500"
              />
            </div>

            <button
              onClick={handleBulkAutoDisguise}
              className="px-3 py-1.5 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/25 text-xs text-amber-300 flex items-center gap-1.5 transition cursor-pointer"
              title="Prefix all undisguised models with Sutradhar"
            >
              <Wand2 className="w-3.5 h-3.5" />
              <span>Auto-Disguise All</span>
            </button>

            <button
              onClick={() => handleBulkToggle(true)}
              className="px-2.5 py-1.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 text-xs text-gray-300 transition cursor-pointer"
            >
              Enable Shown
            </button>

            <button
              onClick={() => handleBulkToggle(false)}
              className="px-2.5 py-1.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 text-xs text-gray-400 transition cursor-pointer"
            >
              Disable Shown
            </button>
          </div>
        </div>

        {loading ? (
          <div className="bg-[#12151c] border border-white/10 rounded-2xl p-14 text-center">
            <RefreshCw className="w-6 h-6 text-indigo-400 animate-spin mx-auto mb-3" />
            <p className="text-sm text-gray-300 font-medium">Loading models from Firestore (sutradhar-models-dev)...</p>
            <p className="text-xs text-gray-500 mt-1">Synchronizing with upstream OpenCode free model pool</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredModels.map((model) => {
              const isDirty = dirtyIds.has(model.id)
              return (
                <div
                  key={model.id}
                  className={`rounded-2xl border transition p-5 ${
                    model.enabled
                      ? "bg-[#141822] border-indigo-500/35 shadow-lg shadow-indigo-950/10"
                      : "bg-[#10131a]/75 border-white/8 opacity-75 hover:opacity-100"
                  }`}
                >
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-center">
                    <div className="lg:col-span-4 flex items-start gap-4">
                      <button
                        type="button"
                        onClick={() => updateModel(model.id, { enabled: !model.enabled })}
                        className={`mt-1 w-11 h-6 rounded-full transition-colors relative shrink-0 cursor-pointer ${
                          model.enabled ? "bg-indigo-600" : "bg-gray-700"
                        }`}
                        title={model.enabled ? "Enabled in Desktop App" : "Hidden from Desktop App"}
                      >
                        <span
                          className={`block w-4 h-4 rounded-full bg-white transition-transform transform ${
                            model.enabled ? "translate-x-6" : "translate-x-1"
                          }`}
                        />
                      </button>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-mono text-xs font-semibold text-indigo-300 bg-indigo-500/10 px-2 py-0.5 rounded border border-indigo-500/20 truncate">
                            {model.id}
                          </span>
                          {isDirty && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 font-medium">
                              Modified
                            </span>
                          )}
                        </div>

                        <div className="text-xs text-gray-400 mt-1.5 flex items-center gap-2 flex-wrap">
                          <span>Original: <strong className="text-gray-300">{model.upstreamName}</strong></span>
                          <span>•</span>
                          <span className="uppercase font-mono text-[10px] text-gray-400">{model.upstreamFamily}</span>
                        </div>

                        <div className="flex items-center gap-2 mt-2 flex-wrap">
                          <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded bg-white/[0.04] text-gray-400 border border-white/8">
                            <Layers className="w-3 h-3 text-gray-500" />
                            {Math.round((model.upstreamContext || 128000) / 1000)}K ctx
                          </span>
                          {model.reasoning && (
                            <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded bg-purple-500/10 text-purple-300 border border-purple-500/20">
                              <Brain className="w-3 h-3" />
                              Reasoning
                            </span>
                          )}
                          {model.toolCall && (
                            <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded bg-sky-500/10 text-sky-300 border border-sky-500/20">
                              <Wrench className="w-3 h-3" />
                              Tools
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="lg:col-span-8 grid grid-cols-1 sm:grid-cols-12 gap-3 items-center">
                      <div className="sm:col-span-5">
                        <label className="block text-[11px] font-medium text-gray-400 mb-1">
                          Disguised Name (Shown in Sutradhar App)
                        </label>
                        <input
                          type="text"
                          value={model.disguisedName}
                          onChange={(e) => updateModel(model.id, { disguisedName: e.target.value })}
                          placeholder="e.g. Sutradhar Ultra 3.6"
                          className="w-full px-3 py-2 rounded-xl bg-[#0b0d11] border border-white/15 text-xs font-medium text-white focus:outline-none focus:border-indigo-500"
                        />
                      </div>

                      <div className="sm:col-span-3">
                        <label className="block text-[11px] font-medium text-gray-400 mb-1">
                          App Badge / Tag
                        </label>
                        <select
                          value={model.badge}
                          onChange={(e) => updateModel(model.id, { badge: e.target.value })}
                          className="w-full px-2.5 py-2 rounded-xl bg-[#0b0d11] border border-white/15 text-xs text-gray-200 focus:outline-none focus:border-indigo-500"
                        >
                          {BADGE_OPTIONS.map((b) => (
                            <option key={b} value={b} className="bg-[#12151c]">
                              {b}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="sm:col-span-2">
                        <label className="block text-[11px] font-medium text-gray-400 mb-1">
                          Category
                        </label>
                        <select
                          value={model.category}
                          onChange={(e) =>
                            updateModel(model.id, {
                              category: e.target.value as CuratedModelDoc["category"],
                            })
                          }
                          className="w-full px-2.5 py-2 rounded-xl bg-[#0b0d11] border border-white/15 text-xs text-gray-200 focus:outline-none focus:border-indigo-500"
                        >
                          {CATEGORY_OPTIONS.map((c) => (
                            <option key={c.value} value={c.value} className="bg-[#12151c]">
                              {c.label}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="sm:col-span-2">
                        <label className="block text-[11px] font-medium text-gray-400 mb-1">
                          Order #
                        </label>
                        <input
                          type="number"
                          value={model.sortOrder}
                          onChange={(e) =>
                            updateModel(model.id, { sortOrder: Number(e.target.value) || 99 })
                          }
                          className="w-full px-2.5 py-2 rounded-xl bg-[#0b0d11] border border-white/15 text-xs text-gray-200 focus:outline-none focus:border-indigo-500"
                        />
                      </div>

                      <div className="sm:col-span-12">
                        <input
                          type="text"
                          value={model.disguisedDescription}
                          onChange={(e) =>
                            updateModel(model.id, { disguisedDescription: e.target.value })
                          }
                          placeholder="Custom model description shown in tooltip..."
                          className="w-full px-3 py-1.5 rounded-lg bg-[#0b0d11]/70 border border-white/8 text-xs text-gray-300 placeholder-gray-600 focus:outline-none focus:border-indigo-500/60"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </main>

      {showPreviewModal && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#13161f] border border-white/15 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden">
            <div className="px-5 py-4 border-b border-white/10 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-indigo-400" />
                <span className="text-sm font-semibold text-white">
                  Sutradhar Desktop App — Model Selector Preview
                </span>
              </div>
              <button
                onClick={() => setShowPreviewModal(false)}
                className="text-xs text-gray-400 hover:text-white px-2.5 py-1 rounded-lg bg-white/5 cursor-pointer"
              >
                Close
              </button>
            </div>

            <div className="p-4 max-h-[65vh] overflow-y-auto space-y-1.5">
              <div className="text-[11px] font-mono uppercase tracking-wider text-gray-400 px-2 pb-1">
                {settings.providerName || "Sutradhar"} Free Models ({enabledModels.length})
              </div>
              {enabledModels.map((m) => (
                <div
                  key={m.id}
                  className="px-3.5 py-2.5 rounded-xl bg-white/[0.03] hover:bg-white/[0.07] border border-white/6 flex items-center justify-between gap-3"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-white truncate">
                        {m.disguisedName}
                      </span>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/25">
                        Free
                      </span>
                      {m.badge && (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-500/15 text-indigo-300 border border-indigo-500/25">
                          {m.badge}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-gray-400 truncate mt-0.5">
                      {m.disguisedDescription}
                    </p>
                  </div>
                  <span className="text-[10px] font-mono text-gray-500 shrink-0">
                    {Math.round((m.upstreamContext || 128000) / 1000)}K
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
