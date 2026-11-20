import { $ } from "bun"
import { join } from "node:path"

// Dev runs the CLI from source so the desktop always talks to the backend in
// this checkout; packaged builds bundle a compiled copy from prebuild instead.
process.env.SUTRADHAR_CHANNEL = "dev"
process.env.SUTRADHAR_DESKTOP_CLI_DEV ??= join(import.meta.dirname, "../../cli")
process.env.SUTRADHAR_VERSION ??= `1.18.35-local-${Date.now()}`
if (!process.env.NODE_OPTIONS?.includes("--max-old-space-size")) {
  process.env.NODE_OPTIONS = [process.env.NODE_OPTIONS, "--max-old-space-size=6144"].filter(Boolean).join(" ")
}

// Electron must run as a GUI app. If an embedding shell (e.g. a Node-based
// terminal or an Electron host process) exports ELECTRON_RUN_AS_NODE=1, the
// desktop would launch in plain-Node mode with no Electron API and never render
// a window. Always clear it so `electron` boots the real app runtime.
delete process.env.ELECTRON_RUN_AS_NODE

await $`bunx electron-vite dev`
