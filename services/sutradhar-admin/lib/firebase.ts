// Firebase configuration & Identity Toolkit authentication client (Client + Server)

export const firestoreConfig = {
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "sutradhar-models-dev",
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || "1:235677623646:web:13ed5afb856a3993c89bcf",
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || "sutradhar-models-dev.firebasestorage.app",
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "AIzaSyC0lj0i_ucsE7i49qFEeH2oZJO0WcwFFus",
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "sutradhar-models-dev.firebaseapp.com",
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "235677623646",
}

export const authFirebaseConfig = {
  projectId: process.env.NEXT_PUBLIC_FIREBASE_AUTH_PROJECT_ID || "snehra-web",
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_AUTH_API_KEY || "AIzaSyAiKTzOCBorssZGmmkOhZ7KCfX6jHHkwog",
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN_PROVIDER || "snehra-web.firebaseapp.com",
}

export interface FirebaseAuthSession {
  uid: string
  email: string
  idToken: string
  refreshToken: string
  expiresAt: number
}

const STORAGE_KEY = "sutradhar_firebase_auth_session_v1"

export async function signInWithFirebaseEmail(email: string, password: string): Promise<FirebaseAuthSession> {
  const res = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${authFirebaseConfig.apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password, returnSecureToken: true }),
    },
  )
  const data = await res.json()
  if (!res.ok) {
    const msg = data?.error?.message || "Authentication failed"
    throw new Error(msg)
  }
  const session: FirebaseAuthSession = {
    uid: data.localId,
    email: data.email,
    idToken: data.idToken,
    refreshToken: data.refreshToken,
    expiresAt: Date.now() + (Number(data.expiresIn) || 3600) * 1000 - 60000,
  }
  if (typeof window !== "undefined") {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(session))
  }
  return session
}

export async function registerWithFirebaseEmail(email: string, password: string): Promise<FirebaseAuthSession> {
  const res = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${authFirebaseConfig.apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password, returnSecureToken: true }),
    },
  )
  const data = await res.json()
  if (!res.ok) {
    const msg = data?.error?.message || "Registration failed"
    throw new Error(msg)
  }
  const session: FirebaseAuthSession = {
    uid: data.localId,
    email: data.email,
    idToken: data.idToken,
    refreshToken: data.refreshToken,
    expiresAt: Date.now() + (Number(data.expiresIn) || 3600) * 1000 - 60000,
  }
  if (typeof window !== "undefined") {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(session))
  }
  return session
}

export async function getActiveFirebaseSession(): Promise<FirebaseAuthSession | null> {
  if (typeof window === "undefined") return null
  const raw = localStorage.getItem(STORAGE_KEY)
  if (!raw) return null
  try {
    const session = JSON.parse(raw) as FirebaseAuthSession
    if (!session?.idToken || !session?.refreshToken) return null
    if (Date.now() < session.expiresAt) {
      return session
    }
    // Refresh token via Firebase SecureToken API
    const res = await fetch(`https://securetoken.googleapis.com/v1/token?key=${authFirebaseConfig.apiKey}`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: `grant_type=refresh_token&refresh_token=${encodeURIComponent(session.refreshToken)}`,
    })
    if (!res.ok) {
      localStorage.removeItem(STORAGE_KEY)
      return null
    }
    const refreshed = await res.json()
    const nextSession: FirebaseAuthSession = {
      ...session,
      idToken: refreshed.id_token,
      refreshToken: refreshed.refresh_token,
      expiresAt: Date.now() + (Number(refreshed.expires_in) || 3600) * 1000 - 60000,
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(nextSession))
    return nextSession
  } catch {
    return null
  }
}

export function signOutFirebaseSession() {
  if (typeof window !== "undefined") {
    localStorage.removeItem(STORAGE_KEY)
  }
}

export async function verifyFirebaseIdToken(
  idToken?: string | null,
): Promise<{ valid: boolean; email?: string; uid?: string }> {
  if (!idToken) return { valid: false }
  const cleanToken = idToken.replace(/^Bearer\s+/i, "").trim()
  if (!cleanToken) return { valid: false }

  for (const key of [authFirebaseConfig.apiKey, firestoreConfig.apiKey]) {
    try {
      const res = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${key}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idToken: cleanToken }),
      })
      if (res.ok) {
        const data = await res.json()
        const user = data?.users?.[0]
        if (user?.localId) {
          return { valid: true, email: user.email, uid: user.localId }
        }
      }
    } catch {
      // try next key
    }
  }
  return { valid: false }
}
