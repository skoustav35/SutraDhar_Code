import { getComponentCatalogue } from "@opentui/solid/components"
import { registerSpinner } from "opentui-spinner/solid"

export function registerSutradharSpinner() {
  if (!getComponentCatalogue().spinner) registerSpinner()
}
