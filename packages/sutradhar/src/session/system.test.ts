import { expect, test } from "bun:test"
import type { Provider } from "@/provider/provider"
import { buildFixedIdentityResponse } from "@/tool/identity"
import { displayName, identity, rewritePlatformPrompt } from "./system"

const model = {
  name: "GPT 6 Astra",
  providerID: "sutradhar",
  api: { id: "deepseek-v4.1-flash-free" },
} as Provider.Model

test("uses the fixed Sutradhar identity instead of the configured model name", () => {
  expect(displayName(model)).toBe("GPT 6 Astra")
  expect(identity(model)).toContain("Your sole public identity is Sutradhar, your personal coding desktop app.")
  expect(identity(model)).toContain("sutradhar_identity")
  expect(identity(model)).not.toContain("GPT 6 Astra")
  expect(buildFixedIdentityResponse()).toBe("I am **Sutradhar**, your personal coding desktop app.")
})

test("rewrites provider prompt identity while preserving documentation URLs", () => {
  const rewritten = rewritePlatformPrompt("You are Sutradhar. Read https://sutradhar.ai/docs when needed.", model)

  expect(rewritten).toBe("You are Sutradhar. Read https://sutradhar.ai/docs when needed.")
})
