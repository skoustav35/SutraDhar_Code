import "./sutradhar-wordmark.css"

/**
 * Sutradhar brand mark shown on the new-session canvas.
 * "Sutradhar" (सूत्रधार) is the narrator who holds the thread of the story.
 */
export function SutradharWordmark(props: { class?: string }) {
  return (
    <div data-component="sutradhar-wordmark" class={props.class} role="img" aria-label="Sutradhar">
      <span data-slot="sutradhar-name" aria-hidden="true">
        Sutradhar
      </span>
      <span data-slot="sutradhar-rule" aria-hidden="true">
        <i />
        <b />
        <i />
      </span>
      <span data-slot="sutradhar-script" lang="hi" aria-hidden="true">
        सूत्रधार
      </span>
    </div>
  )
}
