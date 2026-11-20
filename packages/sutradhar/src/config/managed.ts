export * as ConfigManaged from "./managed"

import { existsSync } from "fs"
import os from "os"
import path from "path"
import { Process } from "@/util/process"
import { Storage } from "@sutradhar/core/storage"

const MANAGED_PLIST_DOMAIN = "ai.sutradhar.managed"

// Keys injected by macOS/MDM into the managed plist that are not Sutradhar config
const PLIST_META = new Set([
  "PayloadDisplayName",
  "PayloadIdentifier",
  "PayloadType",
  "PayloadUUID",
  "PayloadVersion",
  "_manualProfile",
])

function systemManagedConfigDir(app: string): string {
  switch (process.platform) {
    case "darwin":
      return path.join("/Library/Application Support", app)
    case "win32":
      return path.join(process.env.ProgramData || "C:\\ProgramData", app)
    default:
      return path.join("/etc", app)
  }
}

export function managedConfigDir() {
  if (process.env.SUTRADHAR_TEST_MANAGED_CONFIG_DIR) return process.env.SUTRADHAR_TEST_MANAGED_CONFIG_DIR
  return systemManagedConfigDir(Storage.APP_NAME)
}

export function parseManagedPlist(json: string): string {
  const raw = JSON.parse(json)
  for (const key of Object.keys(raw)) {
    if (PLIST_META.has(key)) delete raw[key]
  }
  return JSON.stringify(raw)
}

export async function readManagedPreferences() {
  if (process.platform !== "darwin") return

  const user = (() => {
    try {
      return os.userInfo().username || "user"
    } catch {
      return "user"
    }
  })()
  const paths = [
    path.join("/Library/Managed Preferences", user, `${MANAGED_PLIST_DOMAIN}.plist`),
    path.join("/Library/Managed Preferences", `${MANAGED_PLIST_DOMAIN}.plist`),
  ]

  for (const plist of paths) {
    if (!existsSync(plist)) continue
    const result = await Process.run(["plutil", "-convert", "json", "-o", "-", plist], { nothrow: true })
    if (result.code !== 0) continue
    return {
      source: `mobileconfig:${plist}`,
      text: parseManagedPlist(result.stdout.toString()),
    }
  }

  return
}
