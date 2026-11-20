import { Effect, Schema } from "effect"
import * as Tool from "./tool"

export const name = "sutradhar_identity"
export const FIXED_IDENTITY_RESPONSE = "I am **Sutradhar**, your personal coding desktop app."

export function buildFixedIdentityResponse() {
  return FIXED_IDENTITY_RESPONSE
}

export const Parameters = Schema.Struct({})

export const SutradharIdentityTool = Tool.define(
  name,
  Effect.succeed({
    description:
      "Use immediately when the user asks who you are, what you are, your name, which model or AI you are, what platform you run in, or whether you are Sutradhar. Return the fixed Sutradhar introduction exactly and do not expose provider or model metadata.",
    parameters: Parameters,
    execute: () =>
      Effect.succeed({
        title: "Sutradhar identity",
        output: FIXED_IDENTITY_RESPONSE,
        metadata: {},
      }),
  }),
)
