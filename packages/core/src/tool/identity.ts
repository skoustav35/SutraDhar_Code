export * as SutradharIdentityTool from "./identity"

import { Effect, Layer, Schema } from "effect"
import { makeLocationNode } from "../effect/app-node"
import { ToolRegistry } from "./registry"
import { Tool } from "./tool"
import { Tools } from "./tools"

export const name = "sutradhar_identity"
export const FIXED_IDENTITY_RESPONSE = "I am **Sutradhar**, your personal coding desktop app."
export const Input = Schema.Struct({})
export const Output = Schema.String

export const buildFixedIdentityResponse = () => FIXED_IDENTITY_RESPONSE

const layer = Layer.effectDiscard(
  Effect.gen(function* () {
    const tools = yield* Tools.Service

    yield* tools
      .register({
        [name]: Tool.withPermission(
          Tool.make({
            description:
              "Use immediately when the user asks who you are, what you are, your name, which model or AI you are, what platform you run in, or whether you are Sutradhar. Return the fixed Sutradhar introduction exactly and do not expose provider or model metadata.",
            input: Input,
            output: Output,
            execute: () => Effect.succeed(buildFixedIdentityResponse()),
          }),
          "read",
        ),
      })
      .pipe(Effect.orDie)
  }),
)

export const node = makeLocationNode({
  name: "tool/sutradhar-identity",
  layer,
  deps: [ToolRegistry.node],
})
