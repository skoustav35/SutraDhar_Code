import { execFile } from "node:child_process"
import path from "node:path"
import { fileURLToPath } from "node:url"
import { promisify } from "node:util"

import type { Configuration } from "electron-builder"

const execFileAsync = promisify(execFile)
const packageDir = path.dirname(fileURLToPath(import.meta.url))
const rootDir = path.resolve(packageDir, "../..")
const signScript = path.join(rootDir, "script", "sign-windows.ps1")
const metainfoFpm = (appId: string) =>
  `${path.join(packageDir, "resources", `${appId}.metainfo.xml`)}=/usr/share/metainfo/${appId}.metainfo.xml`

async function signWindows(configuration: { path: string }) {
  if (process.platform !== "win32") return
  if (process.env.GITHUB_ACTIONS !== "true") return

  await execFileAsync(
    "pwsh",
    ["-NoLogo", "-NoProfile", "-ExecutionPolicy", "Bypass", "-File", signScript, configuration.path],
    { cwd: rootDir },
  )
}

const channel = (() => {
  const raw = process.env.SUTRADHAR_CHANNEL
  if (raw === "dev" || raw === "beta" || raw === "prod") return raw
  return "prod"
})()

const APP_IDS = {
  dev: "ai.sutradhar.desktop.dev",
  beta: "ai.sutradhar.desktop.beta",
  prod: "ai.sutradhar.desktop",
} as const

const getBase = (appId: string): Configuration => ({
  artifactName: "sutradhar-desktop-${os}-${arch}.${ext}",
  directories: {
    output: "dist",
    buildResources: "resources",
  },
  extraMetadata: {
    desktopName: `${appId}.desktop`,
  },
  files: ["out/**/*", "resources/**/*"],
  extraResources: [
    {
      from: "native/",
      to: "native/",
      filter: ["index.js", "index.d.ts", "build/Release/mac_window.node", "swift-build/**"],
    },
    {
      from: "resources/computer-use/",
      to: "computer-use/",
      filter: ["windows-helper.ps1"],
    },
  ],
  mac: {
    category: "public.app-category.developer-tools",
    icon: `resources/icons/icon.icns`,
    hardenedRuntime: true,
    gatekeeperAssess: false,
    entitlements: "resources/entitlements.plist",
    entitlementsInherit: "resources/entitlements.plist",
    notarize: Boolean(process.env.APPLE_ID && process.env.APPLE_APP_SPECIFIC_PASSWORD),
    target: ["dmg", "zip"],
  },
  dmg: {
    sign: Boolean(process.env.CSC_LINK || process.env.CSC_NAME),
  },
  protocols: {
    name: "Sutradhar",
    schemes: ["sutradhar"],
  },
  win: {
    icon: `resources/icons/icon.ico`,
    signtoolOptions: {
      sign: signWindows,
    },
    target: ["nsis"],
    verifyUpdateCodeSignature: false,
  },
  nsis: {
    oneClick: true,
    perMachine: false,
    createDesktopShortcut: "always",
    createStartMenuShortcut: true,
    shortcutName: "Sutradhar",
    uninstallDisplayName: "Sutradhar",
    installerIcon: `resources/icons/icon.ico`,
    installerHeaderIcon: `resources/icons/icon.ico`,
  },
  linux: {
    icon: `resources/icons`,
    category: "Development",
    executableName: appId,
    desktop: {
      entry: {
        // Match the installed .desktop file and hicolor icon basename so
        // Linux shells can associate the running Electron window with its launcher.
        StartupWMClass: appId,
      },
    },
    target: ["AppImage", "deb", "rpm"],
  },
})

function getConfig() {
  const appId = APP_IDS[channel]
  const base = getBase(appId)

  switch (channel) {
    case "dev": {
      return {
        ...base,
        appId,
        productName: "Sutradhar Dev",
        deb: { fpm: [metainfoFpm(appId)] },
        rpm: { packageName: "sutradhar-dev", fpm: [metainfoFpm(appId)] },
      }
    }
    case "beta": {
      return {
        ...base,
        appId,
        productName: "Sutradhar Beta",
        protocols: { name: "Sutradhar Beta", schemes: ["sutradhar"] },
        deb: { fpm: [metainfoFpm(appId)] },
        rpm: { packageName: "sutradhar-beta", fpm: [metainfoFpm(appId)] },
      }
    }
    case "prod": {
      return {
        ...base,
        appId,
        productName: "Sutradhar",
        protocols: { name: "Sutradhar", schemes: ["sutradhar"] },
        deb: { fpm: [metainfoFpm(appId)] },
        rpm: { packageName: "sutradhar", fpm: [metainfoFpm(appId)] },
      }
    }
  }
}

export default getConfig()
