import { NextResponse } from "next/server"
import { buildPublicCatalog } from "@/lib/firestore-store"

export const dynamic = "force-dynamic"

export async function GET() {
  try {
    const catalog = await buildPublicCatalog()
    return NextResponse.json(catalog, {
      status: 200,
      headers: {
        "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
        "Access-Control-Allow-Origin": "*",
      },
    })
  } catch (error: any) {
    console.error("Error serving /api.json:", error)
    return NextResponse.json(
      { error: "Failed to build model catalog", message: error?.message || String(error) },
      { status: 500 },
    )
  }
}
