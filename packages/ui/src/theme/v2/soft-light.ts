import { hexToOklch, oklchToHex } from "../color"
import type { HexColor, ResolvedV2Theme, V2ColorValue } from "../types"

/**
 * Soft light-mode finish.
 *
 * Light appearance is re-grounded on warm neutrals and low-chroma surfaces so the
 * chrome reads like paper instead of flat grey: the neutral ramp is rotated onto a
 * warm hue, the surface ramp gains real separation instead of four near-identical
 * greys, hairlines and hover tints pick up a warm ink, and elevation switches to
 * wide, low-alpha shadows. Text and icon roles are pinned to target lightness so
 * the hierarchy survives the re-tint and body text stays above 4.5:1.
 *
 * Accent tokens are deliberately left alone — they carry the theme's identity.
 * Dark mode is deliberately untouched.
 */

/** Warm hue shared by every neutral, hairline and shadow in light mode. */
const WARM_HUE = 72

const alpha = (value: number) => `rgba(46, 40, 34, ${value})`

/** Neutral chroma grows with depth so dark greys read warm without going beige. */
function chromaFor(lightness: number, floor: number, span: number) {
  return Math.max(floor, span * (1 - lightness))
}

function isHex(value: V2ColorValue): value is HexColor {
  return typeof value === "string" && value.startsWith("#")
}

/** Resolves `var(--x)` chains down to a hex, so semantic tokens can be re-emitted. */
function resolveHex(value: V2ColorValue, tokens: ResolvedV2Theme): HexColor | undefined {
  if (isHex(value)) return value
  if (typeof value !== "string") return
  const name = value.match(/^var\(--(.+)\)$/)?.[1]
  if (!name) return
  return resolveHex(tokens[name] ?? "", tokens)
}

/** Re-emits a token at `lightness`, but never lighter, so a theme's own choice wins. */
function deepen(value: V2ColorValue, tokens: ResolvedV2Theme, lightness: number): V2ColorValue {
  const hex = resolveHex(value, tokens)
  if (!hex) return value
  const base = hexToOklch(hex)
  if (base.l <= lightness) return value
  return oklchToHex({ l: lightness, c: chromaFor(lightness, 0.005, 0.011), h: WARM_HUE })
}

/** Text and icon roles hit exact targets so the hierarchy survives the warm re-tint. */
function tone(value: V2ColorValue, tokens: ResolvedV2Theme, lightness: number): V2ColorValue {
  const hex = resolveHex(value, tokens)
  if (!hex) return value
  return oklchToHex({ l: lightness, c: chromaFor(lightness, 0.006, 0.009), h: WARM_HUE })
}

const SURFACE_TARGETS: Array<[string, number]> = [
  ["v2-background-bg-deep", 0.965],
  ["v2-background-bg-layer-01", 0.945],
  ["v2-background-bg-layer-02", 0.925],
  ["v2-background-bg-layer-03", 0.9],
  ["v2-background-bg-layer-04", 0.865],
]

const TEXT_TARGETS: Array<[string, number]> = [
  ["v2-text-text-base", 0.28],
  ["v2-text-text-muted", 0.48],
  ["v2-text-text-faint", 0.55],
]

const ICON_TARGETS: Array<[string, number]> = [
  ["v2-icon-icon-base", 0.42],
  ["v2-icon-icon-muted", 0.58],
]

const GREY_STEPS = [100, 200, 300, 400, 500, 600, 700, 800, 900, 1000, 1100, 1200] as const

/** Wide, low-alpha shadows. A tight contact layer plus a broad ambient layer. */
const ELEVATION: Record<string, string> = {
  "v2-elevation-raised": `0 1px 2px ${alpha(0.04)}, 0 6px 16px -6px ${alpha(0.07)}, 0 0 0 0.5px ${alpha(0.07)}`,
  "v2-elevation-floating": `0 2px 4px ${alpha(0.05)}, 0 12px 28px -8px ${alpha(0.1)}, 0 0 0 0.5px ${alpha(0.09)}`,
  "v2-elevation-overlay": `0 4px 8px ${alpha(0.06)}, 0 24px 56px -12px ${alpha(0.14)}, 0 0 0 0.5px ${alpha(0.1)}`,
  "v2-elevation-button-neutral": `0 1px 1.5px ${alpha(0.06)}, 0 0 0 0.5px ${alpha(0.1)}`,
  "v2-elevation-button-contrast": `0 1px 1.5px ${alpha(0.2)}, 0 0 0 0.5px ${alpha(0.9)}, inset 0 1px 1px rgba(255, 255, 255, 0.14)`,
}

export function softenLightV2(tokens: ResolvedV2Theme): ResolvedV2Theme {
  const soft: Record<string, V2ColorValue> = {
    // Content stays crisp white; only the chrome and insets warm up.
    "v2-background-bg-base": "#ffffff",

    "v2-border-border-muted": alpha(0.07),
    "v2-border-border-base": alpha(0.1),
    "v2-border-border-strong": alpha(0.18),

    "v2-overlay-simple-overlay-hover": alpha(0.045),
    "v2-overlay-simple-overlay-pressed": alpha(0.085),
    "v2-overlay-simple-overlay-contrast-hover": "rgba(0, 0, 0, 0.14)",
    "v2-overlay-simple-overlay-contrast-pressed": "rgba(0, 0, 0, 0.24)",

    ...ELEVATION,
  }

  for (const [token, lightness] of SURFACE_TARGETS) {
    const next = deepen(tokens[token], tokens, lightness)
    if (next !== tokens[token]) soft[token] = next
  }

  for (const [token, lightness] of TEXT_TARGETS) soft[token] = tone(tokens[token], tokens, lightness)
  for (const [token, lightness] of ICON_TARGETS) soft[token] = tone(tokens[token], tokens, lightness)

  for (const step of GREY_STEPS) {
    const token = `v2-grey-${step}`
    const hex = resolveHex(tokens[token] ?? "", tokens)
    if (!hex) continue
    const base = hexToOklch(hex)
    soft[token] = oklchToHex({ l: base.l, c: chromaFor(base.l, 0.0035, 0.011), h: WARM_HUE })
  }

  return { ...tokens, ...soft }
}
