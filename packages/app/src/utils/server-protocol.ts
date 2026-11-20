import type { ServerConnection } from "@/context/server"
import { authTokenFromCredentials } from "./server"

export type ServerProtocol = "v1" | "v2"

function headers(server: ServerConnection.HttpBase) {
  if (!server.password) return
  return {
    Authorization: `Basic ${authTokenFromCredentials({ username: server.username, password: server.password })}`,
  }
}

async function probe(server: ServerConnection.HttpBase, fetch: typeof globalThis.fetch, path: string) {
  const response = await fetch(new URL(path, server.url), {
    headers: headers(server),
    signal: AbortSignal.timeout(5_000),
  })
  if (!response.ok || !response.headers.get("content-type")?.includes("application/json")) {
    return { responded: true as const, value: undefined }
  }
  const value: unknown = await response.json()
  if (!value || typeof value !== "object") return { responded: true as const, value: undefined }
  return { responded: true as const, value }
}

async function detectOnce(
  server: ServerConnection.HttpBase,
  fetch: typeof globalThis.fetch,
): Promise<{ protocol: ServerProtocol } | { networkFailed: true }> {
  const legacyResult = await probe(server, fetch, "/global/health").catch(() => undefined)
  const legacy = legacyResult?.value
  if (legacy && "healthy" in legacy && legacy.healthy === true) return { protocol: "v1" }

  const currentResult = await probe(server, fetch, "/api/info").catch(() => undefined)
  const current = currentResult?.value
  if (current && "pid" in current && typeof current.pid === "number") return { protocol: "v2" }
  if (current && "urls" in current) return { protocol: "v2" }
  if (current && "healthy" in current && current.healthy === true) return { protocol: "v1" }

  if (!legacyResult && !currentResult) return { networkFailed: true }
  return { protocol: "v2" }
}

export async function detectServerProtocol(
  server: ServerConnection.HttpBase,
  fetch: typeof globalThis.fetch,
): Promise<ServerProtocol> {
  // Retry briefly on startup connection failures so a warming sidecar isn't misclassified.
  for (let attempt = 0; attempt < 5; attempt++) {
    const result = await detectOnce(server, fetch)
    if ("protocol" in result) return result.protocol
    if (attempt < 4) await new Promise((resolve) => setTimeout(resolve, 150))
  }

  return "v1"
}
