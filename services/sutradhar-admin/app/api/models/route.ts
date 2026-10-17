import { NextResponse } from "next/server"
import {
  fetchLiveInferenceFreeModels,
  getAppSettingsFromFirestore,
  getCuratedModelsFromFirestore,
  LINUX_DISCOVERY_CMD,
  saveCuratedModelsToFirestore,
  syncUpstreamToFirestore,
  WINDOWS_DISCOVERY_CMD,
} from "@/lib/firestore-store"
import { verifyFirebaseIdToken } from "@/lib/firebase"

export const dynamic = "force-dynamic"

export async function GET() {
  try {
    const [liveDiscovery, existingModels, existingSettings] = await Promise.all([
      fetchLiveInferenceFreeModels(),
      getCuratedModelsFromFirestore(),
      getAppSettingsFromFirestore(),
    ])

    const liveIds = new Set(liveDiscovery.models.map((m) => m.id))
    const hasMismatch =
      existingModels.length === 0 ||
      existingModels.length !== liveDiscovery.models.length ||
      existingModels.some((m) => !liveIds.has(m.id)) ||
      liveDiscovery.models.some((m) => !existingModels.some((f) => f.id === m.id))

    let models = existingModels
    let settings = existingSettings

    if (hasMismatch) {
      const synced = await syncUpstreamToFirestore()
      models = synced.models
      settings = synced.settings
    }

    return NextResponse.json({
      models,
      settings,
      discovery: {
        sourceUrl: "https://opencode.ai/inference/v1/models",
        commandUsed: liveDiscovery.commandUsed,
        platform: liveDiscovery.platform,
        windowsCmd: WINDOWS_DISCOVERY_CMD,
        linuxCmd: LINUX_DISCOVERY_CMD,
        liveFreeModels: liveDiscovery.models,
      },
    })
  } catch (error: any) {
    console.error("GET /api/models error:", error)
    return NextResponse.json({ error: error?.message || "Failed to load models" }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const authHeader = request.headers.get("Authorization")
    const verified = await verifyFirebaseIdToken(authHeader)
    if (!verified.valid) {
      return NextResponse.json({ error: "Unauthorized: Invalid Firebase Auth token" }, { status: 401 })
    }

    const body = await request.json()
    const { models, settings } = body
    if (!Array.isArray(models)) {
      return NextResponse.json({ error: "Invalid payload: models array required" }, { status: 400 })
    }

    const result = await saveCuratedModelsToFirestore(models, settings)
    return NextResponse.json({
      ok: true,
      savedCount: result.savedCount,
      updatedBy: verified.email,
    })
  } catch (error: any) {
    console.error("POST /api/models error:", error)
    return NextResponse.json({ error: error?.message || "Failed to save models" }, { status: 500 })
  }
}
