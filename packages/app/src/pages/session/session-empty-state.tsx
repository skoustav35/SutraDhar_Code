import { Icon } from "@opencode-ai/ui/v2/icon"
import "./session-empty-state.css"

/**
 * Poised, prominent welcome state for a new session.
 * High-craft Codex aesthetic scaled for desktop presence.
 */
export function SessionEmptyState(props: { project: string; onPick?: (prompt: string) => void }) {
  return (
    <div data-component="session-empty-state">
      <div data-slot="empty-inner">
        {/* Sutradhar Insignia Artifact: Ambient aura and vector mark */}
        <div data-slot="empty-insignia-aura" aria-hidden="true">
          <div data-slot="empty-insignia">
            <svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
              <circle cx="32" cy="32" r="28" stroke="currentColor" stroke-width="1.3" stroke-dasharray="3 3" opacity="0.3" />
              <circle cx="32" cy="32" r="20" stroke="currentColor" stroke-width="1.6" opacity="0.65" />
              <path
                d="M18 32C18 24.268 24.268 18 32 18C39.732 18 46 24.268 46 32C46 39.732 39.732 46 32 46"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
              />
              <path
                d="M25 27L31 32L25 37"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
              />
              <line x1="34" y1="37" x2="39" y2="37" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
              <circle cx="32" cy="46" r="2.5" fill="currentColor" />
            </svg>
          </div>
        </div>

        <h2 data-slot="empty-title">
          What should we work on in{" "}
          <span data-slot="project-name">{props.project}</span>?
        </h2>

        <p data-slot="empty-subline">
          Ask questions, orchestrate features, or start with a suggestion.
        </p>

        {/* Scaled suggestion pills: sleek, comfortable click targets */}
        <div data-slot="empty-pills">
          <button
            type="button"
            data-slot="empty-pill"
            onClick={() => props.onPick?.("Give me an overview of this project, its architecture, and key entry points.")}
          >
            <Icon name="magnifying-glass" size="small" />
            <span>Explore codebase</span>
          </button>
          <span data-slot="pill-divider" aria-hidden="true" />
          <button
            type="button"
            data-slot="empty-pill"
            onClick={() => props.onPick?.("Review my recent changes and suggest any improvements or catch potential issues.")}
          >
            <Icon name="branch" size="small" />
            <span>Review changes</span>
          </button>
          <span data-slot="pill-divider" aria-hidden="true" />
          <button
            type="button"
            data-slot="empty-pill"
            onClick={() => props.onPick?.("Help me plan and implement the next feature for this project.")}
          >
            <Icon name="edit" size="small" />
            <span>Plan a feature</span>
          </button>
        </div>
      </div>
    </div>
  )
}
