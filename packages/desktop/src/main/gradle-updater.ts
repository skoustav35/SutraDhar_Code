import { spawn } from "node:child_process"
import { createWriteStream } from "node:fs"
import { mkdir } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { Readable } from "node:stream"
import { pipeline } from "node:stream/promises"
import type { ReadableStream } from "node:stream/web"

const DEFAULT_ADMIN_URL = "https://sutradhar-admin.vercel.app"
const LOCAL_ADMIN_URL = "http://127.0.0.1:3099"

export interface AdminGradleRelease {
  readonly gradleVersion: string
  readonly winExeUrl?: string
  readonly winExeName?: string
  readonly macDmgUrl?: string
  readonly macDmgName?: string
  readonly releaseNotes?: string
  readonly mandatory?: boolean
  readonly updatedAt?: number
}

function parseVersionTokens(version: string): number[] {
  const cleaned = version.trim().replace(/^v/i, "").split(/[-+]/)[0] ?? ""
  const parts = cleaned
    .split(".")
    .map((token) => Number.parseInt(token.replace(/[^0-9]/g, ""), 10))
    .filter((num) => !Number.isNaN(num))
  return parts.length > 0 ? parts : [0]
}

/**
 * Returns < 0 when `currentVersion` is older than `remoteVersion`,
 * 0 when equal, and > 0 when `currentVersion` is newer.
 */
export function compareGradleVersions(currentVersion: string, remoteVersion: string): number {
  const left = parseVersionTokens(currentVersion)
  const right = parseVersionTokens(remoteVersion)
  const len = Math.max(left.length, right.length)
  for (let i = 0; i < len; i++) {
    const a = left[i] ?? 0
    const b = right[i] ?? 0
    if (a < b) return -1
    if (a > b) return 1
  }
  return 0
}

export function selectPlatformInstaller(
  release: AdminGradleRelease,
  platform: NodeJS.Platform = process.platform,
): { url: string; filename: string } | undefined {
  if (platform === "win32") {
    const url = release.winExeUrl?.trim()
    if (!url) return undefined
    const filename = release.winExeName?.trim() || `Sutradhar-Setup-${release.gradleVersion}.exe`
    return { url, filename }
  }
  if (platform === "darwin") {
    const url = release.macDmgUrl?.trim()
    if (!url) return undefined
    const filename = release.macDmgName?.trim() || `Sutradhar-${release.gradleVersion}.dmg`
    return { url, filename }
  }
  return undefined
}

async function resolveAdminBaseUrl(): Promise<string> {
  const configured = process.env.SUTRADHAR_ADMIN_URL?.trim().replace(/\/+$/, "")
  if (configured) return configured

  const localReachable = await fetch(`${LOCAL_ADMIN_URL}/api/releases/latest`, {
    method: "OPTIONS",
    signal: AbortSignal.timeout(350),
  })
    .then((res) => res.ok || res.status < 500)
    .catch(() => false)

  return localReachable ? LOCAL_ADMIN_URL : DEFAULT_ADMIN_URL
}

export async function fetchLatestAdminGradleRelease(baseUrl?: string): Promise<AdminGradleRelease | undefined> {
  const adminBase = (baseUrl || (await resolveAdminBaseUrl())).replace(/\/+$/, "")
  const res = await fetch(`${adminBase}/api/releases/latest?t=${Date.now()}`, {
    headers: { Accept: "application/json" },
    cache: "no-store",
    signal: AbortSignal.timeout(8_000),
  }).catch(() => undefined)
  if (!res?.ok) return undefined
  const data = (await res.json().catch(() => undefined)) as AdminGradleRelease | undefined
  if (!data || typeof data.gradleVersion !== "string" || !data.gradleVersion.trim()) return undefined
  return data
}

async function downloadInstallerToTemp(tempRoot: string, url: string, filename: string): Promise<string> {
  const dir = join(tempRoot, "sutradhar-gradle-updates")
  await mkdir(dir, { recursive: true })
  const safeName = filename.replace(/[^a-zA-Z0-9._-]/g, "-")
  const dest = join(dir, `${Date.now()}-${safeName}`)

  const res = await fetch(url)
  if (!res.ok || !res.body) {
    throw new Error(`Failed to download installer (${res.status})`)
  }
  const nodeStream = Readable.fromWeb(res.body as unknown as ReadableStream)
  await pipeline(nodeStream, createWriteStream(dest))
  return dest
}

export async function checkAndApplyAdminGradleUpdate(input: {
  stopSidecars: () => Promise<void>
  logger: {
    log: (message: string, meta?: unknown) => void
    warn: (message: string, meta?: unknown) => void
    error: (message: string, meta?: unknown) => void
  }
  currentVersion?: string
  adminBaseUrl?: string
}): Promise<{ updated: boolean; targetGradle?: string }> {
  const { app, shell } = await import("electron")
  const { setAppQuitting } = await import("./windows")

  const forceInDev = process.env.SUTRADHAR_FORCE_GRADLE_UPDATE === "1"
  if (!app.isPackaged && !forceInDev) {
    return { updated: false }
  }

  const localGradle = (input.currentVersion || app.getVersion() || "1.0.0").trim()
  const release = await fetchLatestAdminGradleRelease(input.adminBaseUrl)
  if (!release) return { updated: false }

  const remoteGradle = release.gradleVersion.trim()
  if (compareGradleVersions(localGradle, remoteGradle) >= 0) {
    input.logger.log("gradle version up-to-date", { localGradle, remoteGradle })
    return { updated: false, targetGradle: remoteGradle }
  }

  const installer = selectPlatformInstaller(release)
  if (!installer) {
    input.logger.warn("newer gradle version found in admin but no platform installer URL configured", {
      localGradle,
      remoteGradle,
      platform: process.platform,
    })
    return { updated: false, targetGradle: remoteGradle }
  }

  input.logger.log("downloading newer gradle installer from admin", {
    localGradle,
    remoteGradle,
    url: installer.url,
  })

  try {
    const tempRoot = typeof app.getPath === "function" ? app.getPath("temp") : tmpdir()
    const installerPath = await downloadInstallerToTemp(tempRoot, installer.url, installer.filename)
    input.logger.log("downloaded new gradle installer, launching reinstall", {
      installerPath,
      remoteGradle,
    })

    if (process.platform === "win32") {
      setAppQuitting()
      await input.stopSidecars().catch(() => undefined)
      const child = spawn(installerPath, [], {
        detached: true,
        stdio: "ignore",
      })
      child.unref()
      app.quit()
      return { updated: true, targetGradle: remoteGradle }
    }

    if (process.platform === "darwin") {
      await shell.openPath(installerPath)
      return { updated: true, targetGradle: remoteGradle }
    }
  } catch (error) {
    input.logger.error("gradle auto-update failed", {
      localGradle,
      remoteGradle,
      error: error instanceof Error ? error.message : String(error),
    })
  }

  return { updated: false, targetGradle: remoteGradle }
}
