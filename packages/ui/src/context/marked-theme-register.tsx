import { registerCustomTheme } from "@pierre/diffs"
import { SutradharTheme } from "./marked-theme"

let registered = false

export function registerSutradharTheme() {
  if (registered) return
  registered = true
  registerCustomTheme("Sutradhar", () => Promise.resolve(SutradharTheme))
}
