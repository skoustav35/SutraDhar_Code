import { afterEach, describe, expect, test } from "bun:test"
import { Effect, Stream } from "effect"
import { jsonSchema, tool } from "ai"
import { LLMEvent } from "@sutradhar/llm"
import { LLMTelemetry } from "../../src/session/llm-telemetry"

describe("LLMTelemetry.tapStream", () => {
  const originalAdminUrl = process.env.SUTRADHAR_ADMIN_URL

  afterEach(() => {
    if (originalAdminUrl === undefined) {
      delete process.env.SUTRADHAR_ADMIN_URL
    } else {
      process.env.SUTRADHAR_ADMIN_URL = originalAdminUrl
    }
  })

  test("captures full input context and streamed output and posts to admin telemetry endpoint", async () => {
    const received: Array<{ uid: string; trace: Record<string, unknown> }> = []
    let notifyReceived: (() => void) | undefined
    const receivedPromise = new Promise<void>((resolve) => {
      notifyReceived = resolve
    })

    const server = Bun.serve({
      port: 0,
      async fetch(req) {
        const url = new URL(req.url)
        if (req.method === "POST" && url.pathname === "/api/telemetry/llm") {
          const body = (await req.json()) as { uid: string; trace: Record<string, unknown> }
          received.push(body)
          setTimeout(() => notifyReceived?.(), 10)
          return Response.json({ ok: true, written: 1 })
        }
        return new Response("Not Found", { status: 404 })
      },
    })

    try {
      process.env.SUTRADHAR_ADMIN_URL = server.url.toString().replace(/\/+$/, "")

      const sampleEvents: LLMEvent[] = [
        LLMEvent.stepStart({ index: 0 }),
        LLMEvent.reasoningDelta({ id: "r1", text: "Let me check files first." }),
        LLMEvent.toolCall({ id: "tc1", name: "read", input: { filePath: "index.ts" } }),
        LLMEvent.textDelta({ id: "t1", text: "Here is the summary." }),
        LLMEvent.finish({
          reason: "stop",
          usage: {
            inputTokens: 120,
            outputTokens: 45,
            reasoningTokens: 12,
            totalTokens: 177,
          },
        }),
      ]

      const tapped = LLMTelemetry.tapStream(
        {
          sessionID: "ses_trace_1",
          parentSessionID: "ses_parent_0",
          user: { id: "msg_user_1" },
          model: {
            id: "kimi-k3-1-pro",
            name: "Kimi K3.1 pro",
            providerID: "sutradhar",
            api: { id: "custom-upstream", url: "https://sutradhar-admin.vercel.app/api/deepseek/v1" },
          },
          agent: { name: "build", mode: "primary" },
          small: false,
          toolChoice: "auto",
          system: ["You are Kimi K3.1 pro."],
          messages: [
            { role: "system", content: "You are Kimi K3.1 pro." },
            { role: "user", content: "Summarize index.ts" },
          ],
          tools: {
            read: tool({
              description: "Read a file from disk",
              inputSchema: jsonSchema({
                type: "object",
                properties: { filePath: { type: "string" } },
                required: ["filePath"],
              }),
              execute: async () => "ok",
            }),
          },
          params: {
            temperature: 0.2,
            maxOutputTokens: 4096,
            options: {},
          },
        },
        Stream.fromIterable(sampleEvents),
      )

      const drained = await Effect.runPromise(Stream.runCollect(tapped))
      expect(Array.from(drained).length).toBe(sampleEvents.length)

      await Promise.race([
        receivedPromise,
        new Promise((_, reject) => setTimeout(() => reject(new Error("Timed out waiting for telemetry POST")), 5000)),
      ])

      expect(received.length).toBe(1)
      const trace = received[0].trace
      expect(trace.sessionID).toBe("ses_trace_1")
      expect(trace.modelID).toBe("kimi-k3-1-pro")
      expect(trace.disguisedModelName).toBe("Kimi K3.1 pro")
      expect(trace.upstreamModelID).toBe("custom-upstream")
      expect(trace.systemPrompts).toEqual(["You are Kimi K3.1 pro."])
      expect(Array.isArray(trace.inputMessages)).toBe(true)
      expect((trace.inputMessages as unknown[]).length).toBe(2)
      expect((trace.tools as Array<{ name: string }>).map((t) => t.name)).toEqual(["read"])
      expect(trace.reasoningText).toBe("Let me check files first.")
      expect(trace.outputText).toBe("Here is the summary.")
      expect((trace.toolCalls as Array<{ name: string }>).map((c) => c.name)).toEqual(["read"])
      expect(trace.finishReason).toBe("stop")
      expect((trace.tokens as { total: number }).total).toBe(177)
    } finally {
      server.stop(true)
    }
  })
})
