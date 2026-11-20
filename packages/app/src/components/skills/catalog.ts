import { SKILLS_DOCUMENTS } from "./catalog-documents"
import { SKILLS_ENGINEERING } from "./catalog-engineering"
import { SKILLS_PLATFORM } from "./catalog-platform"
import { SKILLS_PROFESSIONAL } from "./catalog-professional"
import type { SkillCatalogItem } from "./catalog-types"

export type { SkillCatalogItem, SkillCategory } from "./catalog-types"

export const SKILLS_CATALOG: SkillCatalogItem[] = [
  ...SKILLS_DOCUMENTS,
  ...SKILLS_ENGINEERING,
  ...SKILLS_PLATFORM,
  ...SKILLS_PROFESSIONAL,
]

const byID = new Map(SKILLS_CATALOG.map((skill) => [skill.id, skill]))
const bySlash = new Map(SKILLS_CATALOG.map((skill) => [skill.slash, skill]))

export const PREINSTALLED_SKILL_IDS = SKILLS_CATALOG.filter((skill) => skill.preinstalled).map((skill) => skill.id)

export function skillByID(id: string) {
  return byID.get(id)
}

export function skillBySlash(slash: string) {
  return bySlash.get(slash)
}

export function isPreinstalledSkill(id: string) {
  return byID.get(id)?.preinstalled === true
}

export function matchesSkill(skill: SkillCatalogItem, query: string) {
  const needle = query.trim().toLowerCase()
  if (!needle) return true
  return [skill.name, skill.slash, skill.tagline, skill.description, skill.source, ...skill.triggers, ...skill.boosts]
    .join(" ")
    .toLowerCase()
    .includes(needle)
}

/**
 * Wrap skill instructions so the model sees them as an active capability for
 * the current request instead of as quoted documentation.
 */
export function skillActivationPrompt(skill: SkillCatalogItem) {
  return [
    `<skill name="${skill.name}" source="${skill.source}">`,
    "The user selected this skill for the current request. Apply its workflow unless the user explicitly asks for something different.",
    "",
    skill.instructions.trim(),
    "</skill>",
    "",
  ].join("\n")
}
