import { skillInstructions, type SkillCatalogItem } from "./catalog-types"

const source = "Sutradhar built-in"
const sourceUrl = "https://github.com/sst/sutradhar"

export const SKILLS_PROFESSIONAL: SkillCatalogItem[] = [
  {
    id: "sutradhar-computer-use",
    name: "computer-use-operator",
    slash: "computer-use",
    tagline: "Observe, act once, observe again",
    description:
      "Operate an approved browser or desktop extension with explicit checkpoints, stable selectors, and safe handoff boundaries.",
    category: "platform",
    source,
    sourceUrl,
    license: "MIT",
    triggers: ["using a browser or desktop extension", "automating a UI workflow", "verifying a visual state"],
    boosts: ["State-aware interaction", "Approval boundaries", "Recovery after UI changes"],
    preinstalled: true,
    instructions: skillInstructions(
      "computer-use-operator",
      "Use computer control safely and repeatably",
      `
## Operating loop

1. Confirm the target application, the user-visible goal, and the allowed scope.
2. Observe the current screen or semantic page state before every action.
3. Prefer accessible names, roles, labels, and stable selectors over coordinates.
4. Perform one reversible action, then observe again and compare the result with the goal.
5. Stop for sign-in, CAPTCHA, payment, destructive confirmation, secrets, or ambiguity; ask the user to take over.
6. If a tool is unavailable or the UI changes unexpectedly, recover by observing again rather than replaying stale clicks.

## Tool families

- Browser: computer_capabilities, browser_observe, browser_tabs, browser_navigate, browser_click, browser_fill, browser_select, browser_key, browser_scroll, browser_wait, browser_close, browser_handoff.
- Desktop: desktop_observe, desktop_windows, desktop_focus_window, desktop_click, desktop_type, desktop_key, desktop_scroll, desktop_drag, desktop_wait, desktop_handoff.
- Verification: computer_verify.

## Rules

- Never guess a coordinate or claim a click succeeded without a changed state.
- Never enter passwords, tokens, or one-time codes.
- Keep a short action log with the observed state, action, and verification result.
`,
    ),
  },
  {
    id: "sutradhar-agent-orchestration",
    name: "agent-orchestration",
    slash: "orchestrate",
    tagline: "Split work without losing control",
    description:
      "Coordinate research, implementation, review, and verification agents with explicit ownership and shared evidence.",
    category: "productivity",
    source,
    sourceUrl,
    license: "MIT",
    triggers: ["parallelizing a large task", "delegating to subagents", "coordinating a multi-stage change"],
    boosts: ["Clear ownership", "Small handoffs", "Conflict prevention"],
    preinstalled: true,
    instructions: skillInstructions(
      "agent-orchestration",
      "Coordinate multiple agents",
      `
## Workflow

1. Define the user-visible outcome and split the work by independent boundary, not by arbitrary file count.
2. Give each agent a self-contained brief with inputs, constraints, allowed tools, and a required evidence report.
3. Keep one owner for integration; parallel agents must not edit the same files without an explicit merge plan.
4. Reconcile findings before implementation and resolve conflicting assumptions with a targeted check.
5. Run a final verifier over the combined diff and record what was actually checked.

## Rules

- Do not delegate the same investigation twice.
- Never treat a subagent summary as proof without inspecting the changed state.
- Keep private credentials and raw sensitive payloads out of handoffs.
`,
    ),
  },
  {
    id: "sutradhar-repository-audit",
    name: "repository-audit",
    slash: "audit",
    tagline: "Build a map before making a risky change",
    description:
      "Survey a repository's architecture, entry points, checks, dependencies, and ownership before implementation.",
    category: "research",
    source,
    sourceUrl,
    license: "MIT",
    triggers: ["joining an unfamiliar repository", "planning a cross-cutting change", "auditing a production codebase"],
    boosts: ["Architecture map", "Risk ranking", "Check discovery"],
    instructions: skillInstructions(
      "repository-audit",
      "Audit a repository before changing it",
      `
## Workflow

1. Locate repository instructions, package boundaries, manifests, and the real application entry point.
2. Trace the user flow through UI, transport, domain, persistence, and external integrations.
3. Identify current checks, fixtures, generated files, and known local constraints.
4. Rank the smallest set of files and boundaries that can satisfy the request.
5. Return an evidence-based map with exact paths, assumptions, and a recommended first check.

## Rules

- Read local instructions before inferring conventions.
- Do not modify files during an audit unless the user explicitly requests a fix.
- Separate observed facts from hypotheses and stale documentation.
`,
    ),
  },
  {
    id: "sutradhar-incident-response",
    name: "incident-response",
    slash: "incident",
    tagline: "Stabilise first, explain second",
    description:
      "Investigate a production incident with a timeline, containment plan, safe evidence capture, and follow-up fixes.",
    category: "platform",
    source,
    sourceUrl,
    license: "MIT",
    triggers: ["production outage", "elevated error rates", "data integrity incident"],
    boosts: ["Containment", "Timeline building", "Blameless follow-up"],
    instructions: skillInstructions(
      "incident-response",
      "Respond to software incidents",
      `
## Workflow

1. State the impact, affected scope, current confidence, and the next safe containment action.
2. Capture timestamps in UTC, deploys, alerts, errors, traffic changes, and operator actions.
3. Prefer reversible containment over speculative fixes; protect evidence before cleanup.
4. Form hypotheses from observed signals and test them against independent evidence.
5. After recovery, write the root cause, contributing factors, detection gap, corrective actions, and owner.

## Rules

- Do not delete logs or rotate evidence during investigation.
- Do not blame individuals; describe system conditions and decisions.
- Escalate security, privacy, and data-loss signals immediately.
`,
    ),
  },
  {
    id: "sutradhar-observability",
    name: "observability",
    slash: "observe",
    tagline: "Make failure diagnosable",
    description:
      "Design logs, metrics, traces, and alerts that explain user impact without leaking secrets or personal data.",
    category: "platform",
    source,
    sourceUrl,
    license: "MIT",
    triggers: ["adding telemetry", "debugging an opaque service", "designing alerts"],
    boosts: ["Useful signals", "Privacy-safe context", "Actionable alerts"],
    instructions: skillInstructions(
      "observability",
      "Improve production observability",
      `
## Checklist

1. Start from a user-visible question: what failed, for whom, where, and since when?
2. Choose a low-cardinality metric for the SLO and a trace or structured log for diagnosis.
3. Include correlation identifiers and operation names, never secrets, tokens, or raw personal payloads.
4. Define alert thresholds, runbook links, ownership, and a useful first query.
5. Test sampling, redaction, clock skew, retries, and failure paths before shipping.

## Rules

- Do not add telemetry that cannot drive a decision.
- Keep labels bounded and stable.
- Treat observability data as production data with retention and access controls.
`,
    ),
  },
  {
    id: "sutradhar-dependency-upgrade",
    name: "dependency-upgrade",
    slash: "upgrade",
    tagline: "Upgrade with a rollback story",
    description:
      "Update dependencies deliberately, inspect changelogs and lockfiles, and prove compatibility before merging.",
    category: "engineering",
    source,
    sourceUrl,
    license: "MIT",
    triggers: ["updating a package", "fixing a dependency vulnerability", "refreshing a lockfile"],
    boosts: ["Compatibility checks", "Minimal churn", "Rollback readiness"],
    instructions: skillInstructions(
      "dependency-upgrade",
      "Upgrade dependencies safely",
      `
## Workflow

1. Identify the package, current version, target version, supported runtimes, and reason for the upgrade.
2. Read the release notes and migration guide for breaking changes, security fixes, and peer requirements.
3. Update the smallest dependency surface and keep lockfile changes attributable to the request.
4. Run type checks, unit tests, integration tests, and the build path that exercises the package.
5. Record residual advisories, transitive changes, and the rollback or pinning plan.

## Rules

- Do not upgrade unrelated packages in the same change.
- Do not suppress a vulnerability without documenting the accepted risk.
- Treat generated lockfiles as evidence, not as a substitute for compatibility testing.
`,
    ),
  },
  {
    id: "sutradhar-accessibility",
    name: "accessibility-audit",
    slash: "a11y",
    tagline: "Make the happy path reachable",
    description:
      "Audit interfaces for keyboard access, semantics, focus, contrast, motion, localization, and responsive behavior.",
    category: "design",
    source,
    sourceUrl,
    license: "MIT",
    triggers: ["reviewing a UI", "fixing keyboard navigation", "shipping a new dialog or form"],
    boosts: ["Keyboard paths", "Focus management", "Inclusive states"],
    instructions: skillInstructions(
      "accessibility-audit",
      "Audit and improve accessibility",
      `
## Checklist

1. Walk the complete flow with a keyboard: reach every control, see focus, and preserve a logical order.
2. Verify names, roles, values, labels, descriptions, errors, and live announcements for assistive technology.
3. Check contrast, target size, zoom, reduced motion, high contrast, RTL, and long translated strings.
4. Test loading, empty, error, disabled, and permission states, not only the success state.
5. Report the element, user impact, reproduction path, and smallest durable fix.

## Rules

- Do not use color or hover as the only signal.
- Do not hide focus outlines without a stronger replacement.
- Fix semantics at the component boundary so future callers inherit the improvement.
`,
    ),
  },
  {
    id: "sutradhar-release-readiness",
    name: "release-readiness",
    slash: "ready",
    tagline: "Turn a diff into a ship decision",
    description:
      "Evaluate a change against tests, migrations, rollout, monitoring, documentation, and rollback criteria.",
    category: "productivity",
    source,
    sourceUrl,
    license: "MIT",
    triggers: ["preparing a release", "reviewing a launch checklist", "handing off a feature"],
    boosts: ["Go/no-go clarity", "Rollback criteria", "Operational handoff"],
    instructions: skillInstructions(
      "release-readiness",
      "Prepare a release decision",
      `
## Workflow

1. State the user-visible change, affected systems, rollout shape, and success metrics.
2. Verify code, tests, migrations, feature flags, configuration, documentation, and generated artifacts.
3. Define preflight checks, staged rollout signals, abort thresholds, and the exact rollback action.
4. Confirm ownership for support, monitoring, and follow-up cleanup.
5. Return a go, no-go, or conditional decision with evidence and open blockers.

## Rules

- A green unit test does not prove migration safety or operational readiness.
- Never hide a known blocker inside a general confidence statement.
- Keep release decisions reversible and time-bounded.
`,
    ),
  },
  {
    id: "sutradhar-contract-testing",
    name: "contract-testing",
    slash: "contract",
    tagline: "Protect the boundary that callers trust",
    description:
      "Design contract tests for APIs, events, plugins, and integrations so producers and consumers evolve safely.",
    category: "engineering",
    source,
    sourceUrl,
    license: "MIT",
    triggers: ["changing an API", "adding an event", "upgrading an integration"],
    boosts: ["Compatibility coverage", "Schema discipline", "Consumer safety"],
    instructions: skillInstructions(
      "contract-testing",
      "Test integration contracts",
      `
## Workflow

1. Identify the producer, consumer, versioned contract, and compatibility promise.
2. Capture required fields, optional fields, error shapes, ordering, idempotency, and limits.
3. Write tests that fail on breaking changes and tolerate documented additive evolution.
4. Exercise real serialization and transport boundaries where mocks could hide drift.
5. Publish the contract and give failures an owner, migration note, and rollback path.

## Rules

- Do not test only implementation details behind the boundary.
- Make compatibility direction explicit: producer, consumer, or both.
- Treat error responses and timeouts as part of the contract.
`,
    ),
  },
]
