import { describe, expect, test } from "bun:test"
import { PROFESSIONAL_AGENT_PROFILES, professionalProfile } from "../../src/agent/professional-profiles"

describe("professional agent profiles", () => {
  test("profiles are unique and cover the professional workflow", () => {
    const names = PROFESSIONAL_AGENT_PROFILES.map((profile) => profile.name)
    expect(new Set(names).size).toBe(names.length)
    expect(names).toEqual(
      expect.arrayContaining(["code", "debug", "verify", "review", "security", "computer", "browser", "desktop"]),
    )
  })

  test("computer use remains approval-first and read-only", () => {
    const profile = professionalProfile("computer")
    expect(profile?.permission["computer_*"]).toBe("ask")
    expect(profile?.permission["browser_*"]).toBe("ask")
    expect(profile?.permission.bash).toBeUndefined()
    expect(profile?.permission.edit).toBeUndefined()
    expect(profile?.prompt).toContain("Never enter passwords, tokens, or one-time codes")

    expect(professionalProfile("browser")?.permission["browser_*"]).toBe("ask")
    expect(professionalProfile("desktop")?.permission["desktop_*"]).toBe("ask")
  })
})
