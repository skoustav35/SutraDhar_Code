import { describe, expect, test } from "bun:test"
import { SKILLS_CATALOG, isPreinstalledSkill, skillByID, skillBySlash } from "./catalog"

describe("skills catalog", () => {
  test("ids and slash triggers are unique", () => {
    const ids = new Set<string>()
    const slashes = new Set<string>()
    for (const skill of SKILLS_CATALOG) {
      expect(ids.has(skill.id)).toBe(false)
      expect(slashes.has(skill.slash)).toBe(false)
      ids.add(skill.id)
      slashes.add(skill.slash)
    }
  })

  test("every skill carries actionable instructions", () => {
    for (const skill of SKILLS_CATALOG) {
      expect(skill.instructions.trim().length).toBeGreaterThan(80)
      expect(skill.instructions.startsWith("---")).toBe(true)
      expect(skill.slash).toMatch(/^[a-z0-9][a-z0-9-]*$/)
      expect(skill.tagline.length).toBeGreaterThan(0)
      expect(skill.triggers.length).toBeGreaterThan(0)
      expect(skill.boosts.length).toBeGreaterThan(0)
    }
  })

  test("lookups resolve by id and slash", () => {
    for (const skill of SKILLS_CATALOG) {
      expect(skillByID(skill.id)?.slash).toBe(skill.slash)
      expect(skillBySlash(skill.slash)?.id).toBe(skill.id)
      expect(isPreinstalledSkill(skill.id)).toBe(skill.preinstalled === true)
    }
    expect(skillByID("missing")).toBeUndefined()
    expect(skillBySlash("missing")).toBeUndefined()
  })
})
