"use client"

import React, { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import {
  getActiveFirebaseSession,
  registerWithFirebaseEmail,
  signInWithFirebaseEmail,
} from "@/lib/firebase"
import { Shield, Sparkles, Lock, Mail, ArrowRight, KeyRound, CheckCircle2, AlertCircle } from "lucide-react"

export default function LoginPage() {
  const router = useRouter()
  const [mode, setMode] = useState<"login" | "register">("login")
  const [email, setEmail] = useState("admin@sutradhar.ai")
  const [password, setPassword] = useState("Sutradhar2026!")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  useEffect(() => {
    getActiveFirebaseSession().then((session) => {
      if (session) {
        router.replace("/admin")
      }
    })
  }, [router])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setLoading(true)
    try {
      if (mode === "login") {
        await signInWithFirebaseEmail(email.trim(), password)
      } else {
        await registerWithFirebaseEmail(email.trim(), password)
      }
      router.replace("/admin")
    } catch (err: any) {
      const code = err?.message || ""
      if (code.includes("INVALID_LOGIN_CREDENTIALS") || code.includes("INVALID_PASSWORD") || code.includes("EMAIL_NOT_FOUND")) {
        setError("Invalid email or password. Try the default admin credentials below or register a new admin account.")
      } else if (code.includes("EMAIL_EXISTS")) {
        setError("This email is already registered. Switching to Sign In...")
        setMode("login")
      } else {
        setError(code || "Authentication failed")
      }
    } finally {
      setLoading(false)
    }
  }

  const fillDefaultAdmin = () => {
    setEmail("admin@sutradhar.ai")
    setPassword("Sutradhar2026!")
    setMode("login")
    setError("")
  }

  return (
    <div className="min-h-screen flex flex-col justify-center items-center px-4 bg-[#0b0d11] relative overflow-hidden">
      <div className="pointer-events-none fixed inset-0 flex items-center justify-center">
        <div className="w-[560px] h-[560px] bg-indigo-600/10 rounded-full blur-[130px]" />
        <div className="w-[420px] h-[420px] bg-amber-500/8 rounded-full blur-[120px] -ml-40 mt-32" />
      </div>

      <div className="w-full max-w-md z-10">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-500/20 via-indigo-500/10 to-amber-500/20 border border-white/15 shadow-xl mb-4">
            <Sparkles className="w-7 h-7 text-indigo-400" />
          </div>
          <h1 className="text-2xl font-semibold tracking-tight text-white">
            Sutradhar <span className="text-indigo-400 font-normal">Control Plane</span>
          </h1>
          <p className="text-sm text-gray-400 mt-1.5">
            Model Intermediary, Selection &amp; Disguise Admin Portal
          </p>
        </div>

        <div className="bg-[#12151c]/95 backdrop-blur-xl border border-white/10 rounded-2xl p-7 shadow-2xl">
          <div className="flex items-center justify-between border-b border-white/8 pb-4 mb-6">
            <div className="flex items-center gap-2.5">
              <Shield className="w-4 h-4 text-indigo-400" />
              <span className="text-sm font-medium text-gray-200">
                {mode === "login" ? "Admin Sign In" : "Register Admin Account"}
              </span>
            </div>
            <span className="text-[11px] font-mono uppercase tracking-wider px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-300 border border-indigo-500/20">
              Firebase Auth
            </span>
          </div>

          {error && (
            <div className="mb-5 p-3.5 rounded-xl bg-red-500/10 border border-red-500/25 flex items-start gap-2.5 text-xs text-red-200">
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1.5">Admin Email</label>
              <div className="relative">
                <Mail className="w-4 h-4 text-gray-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@sutradhar.ai"
                  className="w-full pl-10 pr-4 py-2.5 bg-[#0b0d11] border border-white/10 rounded-xl text-sm text-white placeholder-gray-600 focus:outline-none focus:border-indigo-500/60 transition"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1.5">Password</label>
              <div className="relative">
                <Lock className="w-4 h-4 text-gray-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="password"
                  required
                  minLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full pl-10 pr-4 py-2.5 bg-[#0b0d11] border border-white/10 rounded-xl text-sm text-white placeholder-gray-600 focus:outline-none focus:border-indigo-500/60 transition"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-medium text-sm flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/20 transition cursor-pointer"
            >
              {loading ? (
                <span>Authenticating with Firebase...</span>
              ) : (
                <>
                  <span>{mode === "login" ? "Sign In to Admin Panel" : "Create Admin Account"}</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          <div className="mt-5 pt-4 border-t border-white/8 flex flex-col gap-2.5">
            <button
              type="button"
              onClick={fillDefaultAdmin}
              className="w-full py-2 px-3 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] border border-white/8 text-xs text-gray-300 flex items-center justify-center gap-2 transition cursor-pointer"
            >
              <KeyRound className="w-3.5 h-3.5 text-amber-400" />
              <span>Use Provisioned Admin (admin@sutradhar.ai)</span>
            </button>

            <div className="flex items-center justify-between text-xs text-gray-500 pt-1">
              <span>{mode === "login" ? "Need another admin account?" : "Already have an account?"}</span>
              <button
                type="button"
                onClick={() => {
                  setMode(mode === "login" ? "register" : "login")
                  setError("")
                }}
                className="text-indigo-400 hover:text-indigo-300 font-medium cursor-pointer"
              >
                {mode === "login" ? "Register new admin" : "Back to Sign In"}
              </button>
            </div>
          </div>
        </div>

        <div className="mt-6 flex items-center justify-center gap-4 text-xs text-gray-500">
          <span className="flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            Firestore: <code className="text-gray-400">sutradhar-models-dev</code>
          </span>
          <span>•</span>
          <a href="/api.json" target="_blank" className="text-indigo-400 hover:underline">
            View Public /api.json
          </a>
        </div>
      </div>
    </div>
  )
}
