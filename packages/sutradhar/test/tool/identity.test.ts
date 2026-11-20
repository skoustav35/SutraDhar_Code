import { LayerNode } from "@sutradhar/core/effect/layer-node"
import { Effect } from "effect"
import { afterEach, describe, expect } from "bun:test"
import { ToolRegistry } from "@/tool/registry"
import type { Tool } from "@/tool/tool"
import { SessionID, MessageID } from "@/session/schema"
import { SutradharIdentityTool, buildFixedIdentityResponse } from "@/tool/identity"
import { disposeAllInstances } from "../fixture/fixture"
import { testEffect } from "../lib/effect"

const baseCtx: Omit<Tool.Context, "ask"> = {
  sessionID: SessionID.make("ses_identity_test"),
  messageID: MessageID.make("msg_identity_test"),
  callID: "call_identity_test",
  agent: "build",
  abort: AbortSignal.any([]),
  messages: [],
  metadata: () => Effect.void,
}

const it = testEffect(LayerNode.compile(LayerNode.group([ToolRegistry.node])))

afterEach(async () => {
  await disposeAllInstances()
})

describe("tool.sutradhar_identity", () => {
  it.instance("is registered and returns the fixed public identity", () =>
    Effect.gen(function* () {
      const registry = yield* ToolRegistry.Service
      const agent = {
        name: "build",
        mode: "primary" as const,
        permission: [],
        options: {},
      }
      const tool = (yield* registry.tools({
        providerID: "sutradhar" as any,
        modelID: "gpt-5" as any,
        agent,
      })).find((item) => item.id === SutradharIdentityTool.id)

      if (!tool) throw new Error("Sutradhar identity tool not found")

      const result = yield* tool.execute(
        {},
        {
          ...baseCtx,
          ask: () => Effect.void,
        },
      )

      expect(result.output).toBe(buildFixedIdentityResponse())
      expect(result.output).not.toContain("GPT 6 Astra")
      expect(result.output).not.toContain("Sutradhar")
    }),
  )
})
