import { expect, test } from "bun:test"
import { isFreeModel, isFreeModelProvider, popularProviders } from "./provider-catalog"

test("keeps Sutradhar prominent and removes DeepSeek/Coarena from popular providers", () => {
  expect(popularProviders.indexOf("sutradhar")).toBe(0)
  expect(popularProviders.includes("deepseek")).toBe(false)
  expect(popularProviders.includes("coarena")).toBe(false)
  expect(isFreeModelProvider("deepseek")).toBe(false)
  expect(isFreeModel("deepseek", { input: 0 })).toBe(false)
})
