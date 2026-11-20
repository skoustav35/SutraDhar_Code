import type { ServerCtx } from "@/context/global"
import { loadHomeSessionIndex, type HomeSessionIndex } from "@/context/global-sync/home-session-index"

type HomeSessionSummary = HomeSessionIndex["sessions"][number]

export async function loadUnifiedHomeSessionIndex(
  ctx: ServerCtx,
  eventSequence: number,
  signal: AbortSignal,
): Promise<HomeSessionIndex> {
  const v2Promise = loadHomeSessionIndex(
    (input, options) => ctx.sdk.client.v2.session.list(input, options),
    eventSequence,
    signal,
  ).catch(() => undefined)

  const v1Promise = loadHomeSessionIndex(
    async (input, options) => {
      const page = await ctx.sdk.api.session.list({ parentID: null, limit: input.limit }, options)
      return {
        data: {
          data: page.data.map((item) => ({
            ...item,
            title: item.title ?? "",
            location: item.location,
            revert: item.revert
              ? {
                  messageID: item.revert.messageID,
                  partID: item.revert.partID,
                  snapshot: item.revert.snapshot,
                }
              : undefined,
          })),
          cursor: {},
        },
      }
    },
    eventSequence,
    signal,
  ).catch(() => undefined)

  const [v2Result, v1Result] = await Promise.all([v2Promise, v1Promise])
  if (!v2Result && !v1Result) {
    return loadHomeSessionIndex(
      (input, options) => ctx.sdk.client.v2.session.list(input, options),
      eventSequence,
      signal,
    )
  }

  const merged = new Map<string, HomeSessionSummary>()
  for (const item of v1Result?.sessions ?? []) {
    merged.set(item.id, item)
  }
  for (const item of v2Result?.sessions ?? []) {
    const existing = merged.get(item.id)
    if (!existing) {
      merged.set(item.id, item)
      continue
    }
    const title = item.title?.trim() ? item.title : existing.title
    merged.set(item.id, { ...existing, ...item, title })
  }

  return {
    sessions: [...merged.values()].sort((a, b) => b.time.updated - a.time.updated),
    eventSequence: v2Result?.eventSequence ?? v1Result?.eventSequence ?? eventSequence,
  }
}
