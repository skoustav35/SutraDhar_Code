import { addons, types } from "storybook/manager-api"
import { ThemeTool } from "./theme-tool"

addons.register("sutradhar/theme-toggle", () => {
  addons.add("sutradhar/theme-toggle/tool", {
    type: types.TOOL,
    title: "Theme",
    match: ({ viewMode }) => viewMode === "story" || viewMode === "docs",
    render: ThemeTool,
  })
})
