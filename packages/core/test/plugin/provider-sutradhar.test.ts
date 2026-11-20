import { afterEach, describe, expect } from "bun:test"
import { Effect, Layer } from "effect"
import { AppNodeBuilder } from "@sutradhar/core/effect/app-node-builder"
import { LayerNode } from "@sutradhar/core/effect/layer-node"
import { Catalog } from "@sutradhar/core/catalog"
import { EventV2 } from "@sutradhar/core/event"
import { Integration } from "@sutradhar/core/integration"
import { Location } from "@sutradhar/core/location"
import { ModelV2 } from "@sutradhar/core/model"
import { ProviderV2 } from "@sutradhar/core/provider"
import { SutradharPlugin } from "@sutradhar/core/plugin/provider/sutradhar"
import { AbsolutePath } from "@sutradhar/core/schema"
import { location } from "../fixture/location"
import { testEffect } from "../lib/effect"
import { catalogHost, host, integrationHost } from "./host"

const locationLayer = Layer.succeed(
  Location.Service,
  Location.Service.of(location({ directory: AbsolutePath.make(import.meta.dir) })),
)
const layer = AppNodeBuilder.build(LayerNode.group([Catalog.node, Integration.node, EventV2.node]), [
  [Location.node, locationLayer],
])
const it = testEffect(layer)

function required<T>(value: T | undefined): T {
  if (value === undefined) throw new Error("Expected value to be defined")
  return value
}

describe("SutradharPlugin", () => {
  const originalAdminUrl = process.env.SUTRADHAR_ADMIN_URL

  afterEach(() => {
    if (originalAdminUrl === undefined) delete process.env.SUTRADHAR_ADMIN_URL
    else process.env.SUTRADHAR_ADMIN_URL = originalAdminUrl
  })

  it.live("loads dynamic models from sutradhar-admin under Sutradhar provider without hardcoding", () =>
    Effect.gen(function* () {
      const server = Bun.serve({
        port: 0,
        fetch(req) {
          const url = new URL(req.url)
          if (url.pathname === "/api/models") {
            return Response.json({
              version: 1795100000000,
              gateway: {
                providerID: "sutradhar",
                providerName: "Sutradhar",
                proxyUrl: `${url.origin}/api/deepseek/v1`,
              },
              models: [
                {
                  id: "custom-model-1",
                  disguisedName: "Admin Custom Alpha",
                  upstreamFamily: "sutradhar-pro",
                  upstreamContext: 200_000,
                  upstreamOutput: 32_000,
                  reasoning: true,
                  toolCall: true,
                  attachment: true,
                  enabled: true,
                  systemPrompt: "You are Admin Custom Alpha.",
                },
                {
                  id: "hidden-draft-model",
                  disguisedName: "Hidden Draft",
                  enabled: false,
                },
              ],
            })
          }
          return new Response("Not Found", { status: 404 })
        },
      })

      try {
        process.env.SUTRADHAR_ADMIN_URL = server.url.toString().replace(/\/+$/, "")
        const catalog = yield* Catalog.Service
        const integration = yield* Integration.Service
        yield* SutradharPlugin.effect(
          host({
            catalog: catalogHost(catalog),
            integration: integrationHost(integration),
          }),
        )
        yield* Effect.sleep("50 millis")
        yield* catalog.reload()

        const provider = required(yield* catalog.provider.get(ProviderV2.ID.sutradhar))
        expect(provider.name).toBe("Sutradhar")
        expect(provider.disabled).toBe(false)
        expect(provider.api?.url).toBe(`${process.env.SUTRADHAR_ADMIN_URL}/api/deepseek/v1`)

        const custom = required(
          yield* catalog.model.get(ProviderV2.ID.sutradhar, ModelV2.ID.make("custom-model-1")),
        )
        expect(custom.name).toBe("Admin Custom Alpha")
        expect(custom.request.body.instructions).toBe("You are Admin Custom Alpha.")

        const disabledDraft = yield* catalog.model.get(
          ProviderV2.ID.sutradhar,
          ModelV2.ID.make("hidden-draft-model"),
        )
        expect(disabledDraft).toBeUndefined()
      } finally {
        server.stop(true)
      }
    }),
  )
})
