import { describe, expect, test } from "bun:test"
import { compareGradleVersions, selectPlatformInstaller } from "./gradle-updater"

describe("gradle-updater", () => {
  test("compares gradle version numbers accurately", () => {
    expect(compareGradleVersions("1.0.0", "1.0.0")).toBe(0)
    expect(compareGradleVersions("1.0.0", "1.0.1")).toBe(-1)
    expect(compareGradleVersions("1.0.0", "2.0.0")).toBe(-1)
    expect(compareGradleVersions("1.2.0", "1.1.9")).toBe(1)
    expect(compareGradleVersions("1.0.0-local", "1.0.1")).toBe(-1)
  })

  test("selects the matching platform installer URL and default filename", () => {
    const release = {
      gradleVersion: "1.0.2",
      winExeUrl: "https://sutradhar-admin.vercel.app/downloads/Sutradhar-Setup-1.0.2.exe",
      macDmgUrl: "https://sutradhar-admin.vercel.app/downloads/Sutradhar-1.0.2.dmg",
    }

    expect(selectPlatformInstaller(release, "win32")).toEqual({
      url: "https://sutradhar-admin.vercel.app/downloads/Sutradhar-Setup-1.0.2.exe",
      filename: "Sutradhar-Setup-1.0.2.exe",
    })
    expect(selectPlatformInstaller(release, "darwin")).toEqual({
      url: "https://sutradhar-admin.vercel.app/downloads/Sutradhar-1.0.2.dmg",
      filename: "Sutradhar-1.0.2.dmg",
    })
  })
})
