import { For, Show, createEffect, createSignal, onCleanup, splitProps, type ParentProps } from "solid-js"
import type { JSX } from "solid-js"
import { motionDuration, useReducedMotion } from "./motion"

type MotionPresenceProps = ParentProps<{
  when: boolean
  /** Overrides how long children stay mounted to animate out. */
  exitDuration?: number
  onExited?: () => void
  class?: string
}>

/**
 * Delays unmounting children so they can animate out.
 *
 * Solid has no built-in exit animation, so `when` going false runs the exit
 * keyframes for `exitDuration` (defaults to `--motion-normal`) before the
 * children actually leave the DOM. Reading `--motion-*` keeps the exit in sync
 * with the CSS side and collapses to an immediate unmount under reduce-motion.
 */
export function MotionPresence(props: ParentProps<MotionPresenceProps>) {
  const reduced = useReducedMotion()
  const [split, rest] = splitProps(props, ["when", "children", "exitDuration", "onExited", "class"])
  const [mounted, setMounted] = createSignal(split.when)
  const [exiting, setExiting] = createSignal(false)
  let timer: ReturnType<typeof setTimeout> | undefined

  createEffect(() => {
    if (split.when) {
      clearTimeout(timer)
      setExiting(false)
      setMounted(true)
      return
    }
    // Nothing is mounted, so there is nothing to animate out.
    if (!mounted()) return

    const exitDuration = split.exitDuration ?? (reduced() ? 0 : motionDuration("normal"))
    if (exitDuration <= 0) {
      setMounted(false)
      return
    }

    setExiting(true)
    timer = setTimeout(() => {
      setExiting(false)
      setMounted(false)
      split.onExited?.()
    }, exitDuration)
  })

  onCleanup(() => clearTimeout(timer))

  return (
    <Show when={mounted()}>
      <div
        {...rest}
        data-slot="motion-presence"
        data-state={exiting() ? "exiting" : "open"}
        class={split.class}
      >
        {split.children}
      </div>
    </Show>
  )
}

/**
 * Animated height for disclosed content.
 *
 * Animates the tracked grid row between `0fr` and `1fr` so the natural height
 * never has to be measured by JS. Content stays out of the tab order while
 * collapsed via `visibility` rather than being removed from the DOM.
 */
export function MotionCollapse(props: ParentProps<{ when: boolean; class?: string }>) {
  const [split, rest] = splitProps(props, ["children", "when", "class"])
  return (
    <div {...rest} data-slot="motion-collapse" data-state={split.when ? "open" : "closed"} class={split.class}>
      <div data-slot="motion-collapse-content">{split.children}</div>
    </div>
  )
}

/**
 * Reveals a list of rows one after another.
 *
 * Each row is wrapped in a positioned element carrying its own index, so the
 * list does not need to know its length up front. Wrapping costs one element
 * per row and keeps the animation independent of how the rows are built.
 */
export function MotionStagger<T>(props: {
  each: readonly T[]
  children: (item: T, index: number) => JSX.Element
  step?: number
  delay?: number
  class?: string
}) {
  return (
    <div
      data-slot="motion-stagger"
      class={props.class}
      style={{
        "--motion-stagger-step": `${props.step ?? 40}ms`,
        "--motion-stagger-delay": `${props.delay ?? 0}ms`,
      }}
    >
      <For each={props.each}>
        {(item, index) => (
          <div style={{ "--motion-stagger-index": index() }}>{props.children(item, index())}</div>
        )}
      </For>
    </div>
  )
}
