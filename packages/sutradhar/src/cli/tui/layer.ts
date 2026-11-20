import { run as runTui, type TuiInput } from "@sutradhar/tui"
import { Global } from "@sutradhar/core/global"
import { AppNodeBuilder } from "@sutradhar/core/effect/app-node-builder"
import { Effect } from "effect"

export function run(input: TuiInput) {
  return runTui(input).pipe(Effect.provide(AppNodeBuilder.build(Global.node)))
}
