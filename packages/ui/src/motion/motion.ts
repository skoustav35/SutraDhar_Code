import type { SpringOptions } from "motion"
import { createSignal, type Accessor } from "solid-js"
import { useSpring } from "../components/motion-spring"

export type SpringConfig = Partial<
  Pick<SpringOptions, "visualDuration" | "bounce" | "stiffness" | "damping" | "mass" | "velocity">
>

/**
 * Named spring feels. `visualDuration` is preferred over a fixed `duration` so
 * an animation reaches its end state in the same time regardless of distance
 * travelled, which keeps drags and reveals feeling consistent.
 */
export const SPRING = {
  snappy: { visualDuration: 0.16, bounce: 0.2 },
  default: { visualDuration: 0.28, bounce: 0.2 },
  gentle: { visualDuration: 0.42, bounce: 0.12 },
  bouncy: { visualDuration: 0.5, bounce: 0.45 },
} satisfies Record<string, SpringConfig>

export type SpringName = keyof typeof SPRING

export type MotionSpeed = "instant" | "fast" | "normal" | "slow" | "slower"

const DURATION_VAR: Record<MotionSpeed, string> = {
  instant: "--motion-instant",
  fast: "--motion-fast",
  normal: "--motion-normal",
  slow: "--motion-slow",
  slower: "--motion-slower",
}

// Stand-in for the custom properties when they cannot be read, such as during a
// server render or in an environment without a document.
const DURATION_FALLBACK: Record<MotionSpeed, number> = {
  instant: 0,
  fast: 90,
  normal: 180,
  slow: 280,
  slower: 420,
}

/**
 * Resolves a named speed to milliseconds. Reads the CSS custom properties so
 * timing lives in one place and automatically honors the reduce-motion
 * override that rewrites those values.
 */
export function motionDuration(speed: MotionSpeed = "normal"): number {
  if (typeof document === "undefined") return DURATION_FALLBACK[speed]
  const value = getComputedStyle(document.documentElement).getPropertyValue(DURATION_VAR[speed])
  return Number.parseFloat(value) || DURATION_FALLBACK[speed]
}

const REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)"

let reducedMotion: Accessor<boolean> | undefined

/**
 * Reactive `prefers-reduced-motion` state. The signal is module scoped so any
 * number of components share a single media-query listener for the lifetime of
 * the page instead of each registering and cleaning up their own.
 */
export function useReducedMotion(): Accessor<boolean> {
  if (reducedMotion) return reducedMotion
  const query = typeof window === "undefined" ? undefined : window.matchMedia(REDUCED_MOTION_QUERY)
  const [matches, setMatches] = createSignal(query?.matches ?? false)
  query?.addEventListener("change", (event) => setMatches(event.matches))
  reducedMotion = matches
  return reducedMotion
}

/**
 * Spring against a named feel. Under reduce-motion it swaps to `snappy`, which
 * is the shortest preset that still resolves to a valid spring configuration
 * rather than a degenerate one.
 */
export function useMotionSpring(
  target: () => number,
  name: SpringName = "default",
  snapKey?: () => unknown,
): Accessor<number> {
  const reduced = useReducedMotion()
  return useSpring(target, () => (reduced() ? SPRING.snappy : SPRING[name]), snapKey)
}
