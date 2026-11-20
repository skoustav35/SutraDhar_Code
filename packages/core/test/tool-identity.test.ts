import { describe, expect } from "bun:test"
import { Effect } from "effect"
import { AppNodeBuilder } from "@sutradhar/core/effect/app-node-builder"
import { LayerNode } from "@sutradhar/core/effect/layer-node"
import { SessionV2 } from "@sutradhar/core/session"
import { SutradharIdentityTool } from "@sutradhar/core/tool/identity"
import { ToolOutputStore } from "@sutradhar/core/tool-output-store"
import { ToolRegistry } from "@sutradhar/core/tool/registry"
import { testEffect } from "./lib/effect"
import { settleTool, toolDefinitions, toolIdentity } from "./lib/tool"

const sessionID = SessionV2.ID.make("ses_identity_tool_test")
const it = testEffect(
  AppNodeBuilder.build(LayerNode.group([ToolRegistry.node, ToolRegistry.toolsNode, SutradharIdentityTool.node]), [
    [ToolOutputStore.node, ToolOutputStore.nodeWithoutConfig],
  ]),
)

describe("SutradharIdentityTool", () => {
  it.effect("registers and returns the fixed public identity", () =>
    Effect.gen(function* () {
      const registry = yield* ToolRegistry.Service

      expect((yield* toolDefinitions(registry)).map((definition) => definition.name)).toEqual([
        SutradharIdentityTool.name,
      ])
      expect(
        yield* settleTool(registry, {
          sessionID,
          ...toolIdentity,
          call: {
            type: "tool-call",
            id: "call-identity",
            name: SutradharIdentityTool.name,
            input: {},
          },
        }),
      ).toMatchObject({
        result: {
          type: "text",
          value: "I am **Sutradhar**, your personal coding desktop app.",
        },
      })
    }),
  )
})
