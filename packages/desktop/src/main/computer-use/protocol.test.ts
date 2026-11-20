import { describe, expect, test } from "bun:test"
import { asNumber, asString, isRecord, observationId, sessionId } from "./protocol"

describe("computer-use protocol", () => {
  test("creates scoped identifiers", () => {
    expect(sessionId()).toMatch(/^computer_[0-9a-f-]+$/)
    expect(observationId()).toMatch(/^obs_[0-9a-f-]+$/)
  })

  test("narrows untrusted payload values", () => {
    expect(isRecord({ value: 1 })).toBe(true)
    expect(isRecord(null)).toBe(false)
    expect(isRecord([1])).toBe(false)
    expect(asString("ok")).toBe("ok")
    expect(asString(1)).toBeUndefined()
    expect(asNumber(4)).toBe(4)
    expect(asNumber(Number.NaN)).toBeUndefined()
  })
})
