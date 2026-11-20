import { describe, expect, test } from "bun:test"
import { buildModelCatalog, formatContextWindow, isReasoningModel, type ModelCatalogItem } from "./model-catalog"

function item(
  partial: Partial<ModelCatalogItem> & { id: string; name: string; providerID?: string; providerName?: string },
): ModelCatalogItem {
  return {
    id: partial.id,
    name: partial.name,
    family: partial.family,
    provider: partial.provider ?? {
      id: partial.providerID ?? "sutradhar",
      name: partial.providerName ?? "Sutradhar",
    },
    limit: partial.limit ?? { context: 131_072 },
    capabilities: partial.capabilities,
  }
}

describe("modelCatalog", () => {
  test("places Sutradhar first and hides DeepSeek and Coarena entries", () => {
    const catalog = buildModelCatalog({
      items: [
        item({ id: "gpt-5", name: "GPT-5", providerID: "openai", providerName: "OpenAI" }),
        item({ id: "custom-model-b", name: "Beta Model", providerID: "sutradhar", providerName: "Sutradhar" }),
        item({ id: "custom-model-a", name: "Alpha Model", providerID: "sutradhar", providerName: "Sutradhar" }),
        item({ id: "deepseek-chat", name: "DeepSeek Chat (V3)", providerID: "deepseek", providerName: "DeepSeek" }),
        item({ id: "coarena-old", name: "Old Coarena", providerID: "coarena", providerName: "Coarena" }),
      ],
    })

    expect(catalog.groups.map((g) => g.id)).toEqual(["sutradhar", "openai"])
    expect(catalog.groups[0]!.label).toBe("Sutradhar")
    expect(catalog.groups[0]!.items.map((m) => m.id)).toEqual(["custom-model-a", "custom-model-b"])
  })

  test("filters with fuzzy and compact query tokens", () => {
    const items = [
      item({ id: "custom-pro", name: "Sutradhar Alpha Pro" }),
      item({ id: "custom-flash", name: "Sutradhar Flash 1017" }),
    ]

    const result = buildModelCatalog({ items, query: "flash1017" })
    expect(result.totalCount).toBe(1)
    expect(result.flat[0]!.item.id).toBe("custom-flash")
  })

  test("formats context windows cleanly and keeps unique recent entries", () => {
    expect(formatContextWindow(1_048_576)).toBe("1M")
    expect(formatContextWindow(131_072)).toBe("128K")
    expect(formatContextWindow(65_536)).toBe("64K")
    expect(isReasoningModel(item({ id: "chat-v3", name: "Chat V3" }))).toBe(false)
    expect(isReasoningModel(item({ id: "reason-pro", name: "Reason Pro", family: "thinking" }))).toBe(true)

    const items = [
      item({ id: "custom-pro", name: "Alpha Pro" }),
      item({ id: "custom-flash", name: "Beta Flash" }),
    ]
    const catalog = buildModelCatalog({ items, recent: [items[1]!, items[1]!] })
    expect(catalog.recent.map((m) => m.id)).toEqual(["custom-flash"])
  })
})
