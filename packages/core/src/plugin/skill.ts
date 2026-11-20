/// <reference path="../markdown.d.ts" />

export * as SkillPlugin from "./skill"

import { define } from "./internal"
import { Effect } from "effect"
import { AbsolutePath } from "../schema"
import { SkillV2 } from "../skill"
import customizeSutradharContent from "./skill/customize-sutradhar.md" with { type: "text" }

export const CustomizeSutradharContent = customizeSutradharContent

export const Plugin = define({
  id: "skill",
  effect: Effect.fn(function* (ctx) {
    yield* ctx.skill.transform((draft) => {
      draft.source(
        SkillV2.EmbeddedSource.make({
          type: "embedded",
          skill: SkillV2.Info.make({
            name: "customize-sutradhar",
            description:
              "Use ONLY when the user is editing or creating Sutradhar's own configuration: sutradhar.json, sutradhar.jsonc, files under .sutradhar/, or files under ~/.config/sutradhar/. Also use when creating or fixing Sutradhar agents, subagents, commands, skills, plugins, MCP servers, or permission rules. Do not use for the user's own application code, or for any project that is not configuring Sutradhar itself.",
            location: AbsolutePath.make("/builtin/customize-sutradhar.md"),
            content: CustomizeSutradharContent,
          }),
        }),
      )
    })
  }),
})
