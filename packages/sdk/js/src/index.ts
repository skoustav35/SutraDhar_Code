export * from "./client.js"
export * from "./server.js"

import { createSutradharClient } from "./client.js"
import { createSutradharServer } from "./server.js"
import type { ServerOptions } from "./server.js"

export async function createSutradhar(options?: ServerOptions) {
  const server = await createSutradharServer({
    ...options,
  })

  const client = createSutradharClient({
    baseUrl: server.url,
  })

  return {
    client,
    server,
  }
}
