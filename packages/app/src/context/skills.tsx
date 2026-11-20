import { createSimpleContext } from "@sutradhar/ui/context"
import { createMemo } from "solid-js"
import { createStore } from "solid-js/store"
import { Persist, persisted } from "@/utils/persist"
import {
  PREINSTALLED_SKILL_IDS,
  SKILLS_CATALOG,
  isPreinstalledSkill,
  skillActivationPrompt,
  skillByID,
  skillBySlash,
  type SkillCatalogItem,
} from "@/components/skills/catalog"

type SkillsState = {
  /** Catalog id -> install timestamp (ms). */
  installed: Record<string, number>
}

const DefaultState: SkillsState = { installed: {} }

export const { use: useSkills, provider: SkillsProvider } = createSimpleContext({
  name: "Skills",
  init: () => {
    const [store, setStore] = persisted(
      Persist.global("skills.marketplace"),
      createStore<SkillsState>({ ...DefaultState, installed: { ...DefaultState.installed } }),
    )

    const enabled = createMemo(() => new Set([...PREINSTALLED_SKILL_IDS, ...Object.keys(store.installed)]))

    const isInstalled = (id: string) => enabled().has(id)

    const installed = createMemo(() => SKILLS_CATALOG.filter((skill) => enabled().has(skill.id)))

    const available = createMemo(() => SKILLS_CATALOG.filter((skill) => !enabled().has(skill.id)))

    return {
      catalog: () => SKILLS_CATALOG,
      installed,
      available,
      isInstalled,
      isBuiltin: isPreinstalledSkill,
      byID: skillByID,
      bySlash: skillBySlash,
      prompt: (skill: SkillCatalogItem) => skillActivationPrompt(skill),
      install(id: string) {
        if (!skillByID(id) || isPreinstalledSkill(id)) return
        setStore("installed", id, Date.now())
      },
      uninstall(id: string) {
        if (!skillByID(id) || isPreinstalledSkill(id)) return
        setStore("installed", (current) => {
          const next = { ...current }
          delete next[id]
          return next
        })
      },
    }
  },
})
