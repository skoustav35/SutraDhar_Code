export type SkillCategory = "documents" | "engineering" | "design" | "platform" | "productivity" | "research"

export interface SkillCatalogItem {
  /** Stable local identifier. */
  id: string
  /** Skill name as published at the source. */
  name: string
  /** Slash trigger used in chat. */
  slash: string
  /** One-line pitch shown on the card. */
  tagline: string
  /** Longer explanation shown in the detail view. */
  description: string
  category: SkillCategory
  /** Attribution, for example "anthropics/skills". */
  source: string
  sourceUrl: string
  license: string
  /** Situations that should activate the skill. */
  triggers: string[]
  /** Concrete capabilities the skill adds. */
  boosts: string[]
  /** Distilled SKILL.md content injected into the prompt. */
  instructions: string
  /** Enabled out of the box. */
  preinstalled?: boolean
}

export function skillInstructions(name: string, description: string, body: string): string {
  return [
    "---",
    `name: ${name}`,
    `description: ${description}`,
    "compatibility: sutradhar",
    "---",
    "",
    body.trim(),
    "",
  ].join("\n")
}
