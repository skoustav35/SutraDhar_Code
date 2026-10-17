import { NextResponse } from "next/server"
import { syncUpstreamToFirestore } from "@/lib/firestore-store"
import { verifyFirebaseIdToken } from "@/lib/firebase"

export const dynamic = "force-dynamic"

export async function POST(request: Request) {
  try {
    const authHeader = request.headers.get("Authorization")
    const verified = await verifyFirebaseIdToken(authHeader)
    if (!verified.valid) {
      return NextResponse.json({ error: "Unauthorized: Invalid Firebase Auth token" }, { status: 401 })
    }

    const result = await syncUpstreamToFirestore()
    return NextResponse.json({
      ok: true,
      ...result,
    })
  } catch (error: any) {
    console.error("POST /api/sync error:", error)
    return NextResponse.json({ error: error?.message || "Sync failed" }, { status: 500 })
  }
}
