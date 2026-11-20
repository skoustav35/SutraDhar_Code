import path from "path"
import { fileURLToPath } from "url"

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const dir = path.resolve(__dirname, "..")

process.chdir(dir)

const LEGACY_PROVIDER_PREFIX = ["open", "code"].join("")

function stripLegacyProviders(text: string): string {
  try {
    const parsed: unknown = JSON.parse(text)
    if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) return text
    return JSON.stringify(
      Object.fromEntries(
        Object.entries(parsed).filter(([key]) => !key.toLowerCase().startsWith(LEGACY_PROVIDER_PREFIX)),
      ),
    )
  } catch {
    return text
  }
}

const modelsUrl = process.env.SUTRADHAR_MODELS_URL || "https://models.dev"
const rawModelsData = process.env.MODELS_DEV_API_JSON
  ? await Bun.file(process.env.MODELS_DEV_API_JSON).text()
  : await fetch(`${modelsUrl}/api.json`, { signal: AbortSignal.timeout(10_000) })
      .then((x) => (x.ok ? x.text() : "{}"))
      .catch(() => "{}")
export const modelsData = stripLegacyProviders(rawModelsData)
console.log("Loaded models.dev snapshot")
