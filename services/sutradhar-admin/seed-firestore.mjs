import { execSync } from "child_process"

const PROJECT_ID = "sutradhar-models-dev"
const SERVER_VERIFIED_TOKEN = "sutradhar_srv_v1"
const FIRESTORE_BASE = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents`

const PRESET_DISGUISES = {
  "deepseek-v4.1-flash-free": {
    name: "Sutradhar DeepCoder 4.1",
    description: "High-precision code synthesis, refactoring, and debugging engine",
    category: "coding",
    badge: "Coding Pro",
    enabled: true,
    sortOrder: 1,
  },
  "glm-5.3-flash-free": {
    name: "Sutradhar Velocity 5.3",
    description: "Instant-response multimodal model optimized for rapid iterations and edits",
    category: "fast",
    badge: "Ultra Fast",
    enabled: true,
    sortOrder: 2,
  },
  "nemotron-3.5-super-vl-free": {
    name: "Sutradhar Vision 3.5 VL",
    description: "1M-context multimodal visual and UI inspection model with deep reasoning",
    category: "vision",
    badge: "Vision",
    enabled: true,
    sortOrder: 3,
  },
  "nemotron-3.5-lightning-free": {
    name: "Sutradhar Lightning 3.5",
    description: "High-throughput low-latency reasoning and agentic execution engine",
    category: "fast",
    badge: "Ultra Fast",
    enabled: true,
    sortOrder: 4,
  },
  "mimo-v2.6-flash-free": {
    name: "Sutradhar Omni 2.6",
    description: "Full-spectrum omni model supporting text, image, audio, and video reasoning",
    category: "flagship",
    badge: "Omni",
    enabled: true,
    sortOrder: 5,
  },
  "longcat-2.5-preview-free": {
    name: "Sutradhar Horizon 1M",
    description: "1,000,000-token long-context repository comprehension and architecture specialist",
    category: "reasoning",
    badge: "Long Context",
    enabled: true,
    sortOrder: 6,
  },
  "beam-free": {
    name: "Sutradhar Ultra Beam",
    description: "1M-context flagship reasoning and multi-step software engineering model",
    category: "flagship",
    badge: "Recommended",
    enabled: true,
    sortOrder: 7,
  },
  "space-bunny-free": {
    name: "Sutradhar Nova Multimodal",
    description: "1M-context frontier multimodal reasoning engine with massive 512K output capacity",
    category: "vision",
    badge: "Flagship",
    enabled: true,
    sortOrder: 8,
  },
  "jev-1.13-free": {
    name: "Sutradhar Architect 1.13",
    description: "Specialized autonomous coding and terminal workflow intelligence",
    category: "coding",
    badge: "Code Specialist",
    enabled: true,
    sortOrder: 9,
  },
}

function formatModelIdToTitle(id) {
  return id
    .split("-")
    .map((part) => {
      if (part.toLowerCase() === "vl") return "VL"
      if (/^v\d/i.test(part)) return part.toUpperCase()
      return part.charAt(0).toUpperCase() + part.slice(1)
    })
    .join(" ")
}

function toFirestoreFields(obj) {
  const fields = {}
  for (const [k, v] of Object.entries(obj)) {
    if (v === undefined || v === null) continue
    if (typeof v === "boolean") fields[k] = { booleanValue: v }
    else if (typeof v === "number") fields[k] = { integerValue: String(Math.trunc(v)) }
    else if (typeof v === "string") fields[k] = { stringValue: v }
  }
  return fields
}

async function main() {
  console.log("Running live discovery against https://opencode.ai/inference/v1/models...")
  let liveFree = []
  if (process.platform === "win32") {
    const out = execSync(
      `powershell -NoProfile -Command "(irm https://opencode.ai/inference/v1/models).data | ? id -like '*free*' | select name, id | ConvertTo-Json -Compress"`,
      { encoding: "utf8" },
    )
    const parsed = JSON.parse(out.trim())
    liveFree = Array.isArray(parsed) ? parsed : [parsed]
  } else {
    const infRes = await fetch("https://opencode.ai/inference/v1/models")
    const infData = await infRes.json()
    liveFree = (infData.data || [])
      .filter((m) => String(m.id || "").toLowerCase().includes("free"))
      .map((m) => ({ name: m.name || null, id: m.id }))
  }

  console.log(`Discovered ${liveFree.length} live free models:`, liveFree.map((m) => m.id))

  const [catRes, existingRes] = await Promise.all([
    fetch("https://models.opencode.ai/api.json").then((r) => r.json()),
    fetch(`${FIRESTORE_BASE}/models?pageSize=200`).then((r) => r.json()),
  ])

  const catModels = catRes?.opencode?.models || {}
  const existingDocs = existingRes?.documents || []
  const liveIds = new Set(liveFree.map((m) => m.id))

  const writes = []
  let removedCount = 0

  for (const d of existingDocs) {
    const docId = d.name.split("/").pop()
    if (!liveIds.has(docId)) {
      removedCount++
      writes.push({
        delete: `projects/${PROJECT_ID}/databases/(default)/documents/models/${docId}`,
      })
    }
  }

  const now = Date.now()
  liveFree.forEach((item, idx) => {
    const id = item.id
    const preset = PRESET_DISGUISES[id]
    const cat = catModels[id]
    const upstreamName = item.name || cat?.name || formatModelIdToTitle(id)

    const docData = {
      id,
      enabled: preset ? preset.enabled : true,
      disguisedName: preset?.name || `Sutradhar ${upstreamName.replace(/\s*free$/i, "")}`,
      disguisedDescription:
        preset?.description || `Sutradhar curated ${cat?.family || "AI"} model for coding and reasoning`,
      category: preset?.category || "flagship",
      badge: preset?.badge || "Recommended",
      sortOrder: preset?.sortOrder || idx + 1,
      upstreamName,
      upstreamFamily: cat?.family || id.split("-")[0] || "general",
      upstreamContext: cat?.limit?.context || 200000,
      upstreamOutput: cat?.limit?.output || 32000,
      reasoning: Boolean(cat?.reasoning ?? true),
      toolCall: Boolean(cat?.tool_call ?? true),
      attachment: Boolean(cat?.attachment ?? true),
      updatedAt: now,
      _verifiedByServer: SERVER_VERIFIED_TOKEN,
    }

    writes.push({
      update: {
        name: `projects/${PROJECT_ID}/databases/(default)/documents/models/${id}`,
        fields: toFirestoreFields(docData),
      },
    })
  })

  writes.push({
    update: {
      name: `projects/${PROJECT_ID}/databases/(default)/documents/settings/config`,
      fields: toFirestoreFields({
        providerName: "Sutradhar",
        lastSync: now,
        syncCount: liveFree.length,
        autoEnableNewModels: true,
        _verifiedByServer: SERVER_VERIFIED_TOKEN,
      }),
    },
  })

  const commitRes = await fetch(`${FIRESTORE_BASE}:commit`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ writes }),
  })

  if (!commitRes.ok) {
    throw new Error(`Batch commit failed: ${commitRes.status} ${await commitRes.text()}`)
  }

  console.log(
    `Successfully updated Firestore! Removed ${removedCount} stale models and seeded ${liveFree.length} live free models.`,
  )
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
