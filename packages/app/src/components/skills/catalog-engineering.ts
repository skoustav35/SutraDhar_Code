import { skillInstructions, type SkillCatalogItem } from "./catalog-types"

export const SKILLS_ENGINEERING: SkillCatalogItem[] = [
  {
    id: "superpowers-tdd",
    name: "test-driven-development",
    slash: "tdd",
    tagline: "Red, green, refactor with proof",
    description:
      "Drive changes from a failing test so every behaviour is specified before it is implemented.",
    category: "engineering",
    source: "obra/superpowers",
    sourceUrl: "https://github.com/obra/superpowers",
    license: "MIT",
    triggers: ["implementing a feature", "fixing a bug", "changing behaviour"],
    boosts: ["Behaviour-first tests", "Regression safety", "Small steps"],
    preinstalled: true,
    instructions: skillInstructions(
      "test-driven-development",
      "Use TDD for every behaviour change",
      `
## Workflow

1. Write the smallest failing test that describes the next behaviour.
2. Run it and confirm it fails for the expected reason. A test that passes immediately is not specifying anything.
3. Write only enough production code to make it pass.
4. Refactor with the test green; keep the public behaviour unchanged.
5. Commit in small increments with the test and the code together.

## Rules

- Never write production code without a failing test that demands it.
- Test behaviour through public interfaces, not private helpers.
- One assertion concept per test; name tests after the behaviour.
- If a bug fix ships, it ships with a regression test that fails without the fix.
`,
    ),
  },
  {
    id: "superpowers-systematic-debugging",
    name: "systematic-debugging",
    slash: "debug",
    tagline: "Find the root cause before patching",
    description:
      "Reproduce, isolate, and prove the cause of a bug instead of guessing at symptoms.",
    category: "engineering",
    source: "obra/superpowers",
    sourceUrl: "https://github.com/obra/superpowers",
    license: "MIT",
    triggers: ["a failing test", "a runtime error", "intermittent behaviour"],
    boosts: ["Reproduction", "Bisection", "Root-cause proof"],
    preinstalled: true,
    instructions: skillInstructions(
      "systematic-debugging",
      "Debug from reproduction to root cause",
      `
## Workflow

1. Reproduce reliably and capture the exact command, input, and environment.
2. Read the full error and the code path that produced it before changing anything.
3. Form one falsifiable hypothesis at a time and design a check for it.
4. Bisect: disable variables, narrow inputs, or walk history until the boundary is clear.
5. Prove the cause with a failing test, then fix the cause rather than the symptom.
6. Remove debug scaffolding and re-run the broader suite.

## Rules

- Never apply a fix you cannot explain.
- Never silence an error without fixing or documenting it.
- Record what the investigation ruled out; it is part of the result.
`,
    ),
  },
  {
    id: "superpowers-writing-plans",
    name: "writing-plans",
    slash: "plan",
    tagline: "Turn an idea into an executable plan",
    description:
      "Break work into ordered, verifiable steps with explicit risks and rollback points.",
    category: "engineering",
    source: "obra/superpowers",
    sourceUrl: "https://github.com/obra/superpowers",
    license: "MIT",
    triggers: ["starting a multi-file change", "scoping an epic", "coordinating parallel work"],
    boosts: ["Task decomposition", "Risk surfacing", "Verification steps"],
    preinstalled: true,
    instructions: skillInstructions(
      "writing-plans",
      "Write implementation plans",
      `
## Workflow

1. Restate the goal and the constraints in one paragraph.
2. Map the current behaviour by reading the code that will change.
3. Split the work into steps that each leave the repository working.
4. For every step, name the files, the verification, and the rollback.
5. List the assumptions that could invalidate the plan and how to check them early.
6. Keep the plan in the repository when the work spans sessions.

## Rules

- Steps are verbs, not topics.
- Every step has an observable completion signal.
- No step requires a broken intermediate state on main.
- Prefer reversible changes and feature flags where risk is high.
`,
    ),
  },
  {
    id: "superpowers-requesting-code-review",
    name: "requesting-code-review",
    slash: "review",
    tagline: "Review changes for real defects",
    description:
      "Review a diff for correctness, regressions, and missing tests before it ships.",
    category: "engineering",
    source: "obra/superpowers",
    sourceUrl: "https://github.com/obra/superpowers",
    license: "MIT",
    triggers: ["before merging", "reviewing a pull request", "auditing an agent's diff"],
    boosts: ["Defect focus", "Test coverage", "Risk ranking"],
    preinstalled: true,
    instructions: skillInstructions(
      "requesting-code-review",
      "Review code changes",
      `
## Workflow

1. Read the intent first: linked issue, commit messages, and the shape of the diff.
2. Review for correctness: edge cases, error paths, concurrency, and data loss.
3. Check compatibility: public APIs, config keys, migrations, and callers outside the diff.
4. Check tests: do they fail without the change and cover the risky branches?
5. Rank findings as blocking, important, or nit. Quote the exact line for each.

## Rules

- Do not report style preferences as defects unless they change meaning.
- Every finding explains the failure scenario, not just the rule.
- If the diff is too large to reason about, say so and ask for it to be split.
- Approve only when the risky paths are covered.
`,
    ),
  },
  {
    id: "superpowers-verification",
    name: "verification-before-completion",
    slash: "verify",
    tagline: "Prove the work is actually done",
    description:
      "Run the checks that would catch failure, then report evidence instead of confidence.",
    category: "engineering",
    source: "obra/superpowers",
    sourceUrl: "https://github.com/obra/superpowers",
    license: "MIT",
    triggers: ["before claiming a task is complete", "after a refactor", "handing off work"],
    boosts: ["Evidence-based completion", "Checklist discipline", "Honest reporting"],
    instructions: skillInstructions(
      "verification-before-completion",
      "Verify work before declaring it complete",
      `
## Workflow

1. List the claims you are about to make and the command that proves each one.
2. Run type checks, tests, and the relevant build.
3. Exercise the user-facing path when the change is visible.
4. Report the exact commands and their results.
5. Disclose anything not verified and why.

## Rules

- No "should work" without a check.
- A passing subset is not a passing suite; say which subset ran.
- If a check is broken in the environment, say so explicitly.
`,
    ),
  },
  {
    id: "superpowers-improve-architecture",
    name: "improve-codebase-architecture",
    slash: "architecture",
    tagline: "Find the seams worth changing",
    description:
      "Diagnose coupling, boundaries, and duplication, then propose staged, reversible improvements.",
    category: "engineering",
    source: "mattpocock/skills",
    sourceUrl: "https://github.com/mattpocock/skills",
    license: "MIT",
    triggers: ["a hard-to-change module", "repeated defects in one area", "planning a refactor"],
    boosts: ["Boundary analysis", "Incremental refactors", "Dependency direction"],
    instructions: skillInstructions(
      "improve-codebase-architecture",
      "Diagnose and improve architecture",
      `
## Workflow

1. Trace the data flow through the area in question, noting every cross-module dependency.
2. Identify the forces: volatility, fan-in, fan-out, duplicated policy, and leaky abstractions.
3. Propose the smallest change that improves the seam, not a rewrite.
4. Sequence the work so each step compiles and is independently revertible.
5. Define the metric that proves the improvement (change size, cycle count, test scope).

## Rules

- Prefer moving a boundary over adding a layer.
- Do not introduce indirection without a second caller.
- Every proposed step names its blast radius.
`,
    ),
  },
  {
    id: "mattpocock-grill-me",
    name: "grill-me",
    slash: "grill",
    tagline: "Stress-test a plan with hard questions",
    description:
      "Interview the author about a design until the assumptions, edge cases, and failure modes are explicit.",
    category: "research",
    source: "mattpocock/skills",
    sourceUrl: "https://github.com/mattpocock/skills",
    license: "MIT",
    triggers: ["a plan that feels too easy", "a risky design decision", "before committing to an approach"],
    boosts: ["Assumption hunting", "Edge-case discovery", "Decision records"],
    instructions: skillInstructions(
      "grill-me",
      "Interview the author to harden a plan",
      `
## Workflow

1. Ask one question at a time and wait for the answer.
2. Probe the goal, the user, the constraints, and what happens when each assumption is false.
3. Ask for the failure mode and the rollback for the riskiest step.
4. Push on ambiguity: "which exact case", "how would we know", "what did we measure".
5. Finish with a summary of decisions, open questions, and owners.

## Rules

- No multi-part question dumps.
- Do not accept "it should be fine" as an answer.
- Keep tone direct and respectful; the goal is clarity, not combat.
`,
    ),
  },
  {
    id: "mattpocock-ubiquitous-language",
    name: "ubiquitous-language",
    slash: "glossary",
    tagline: "One name for one concept",
    description:
      "Extract a domain glossary and align code, tests, and docs with it.",
    category: "engineering",
    source: "mattpocock/skills",
    sourceUrl: "https://github.com/mattpocock/skills",
    license: "MIT",
    triggers: ["inconsistent naming", "onboarding confusion", "domain-heavy code"],
    boosts: ["Term extraction", "Naming consistency", "Shared vocabulary"],
    instructions: skillInstructions(
      "ubiquitous-language",
      "Build and apply a domain glossary",
      `
## Workflow

1. Collect the nouns and verbs used by the domain experts and by the code.
2. Group synonyms and pick one canonical term per concept with a one-line definition.
3. Record terms that are deliberately different and why.
4. Rename code incrementally, starting at the boundary where confusion costs most.
5. Add the glossary to the repository and reference it from contributing docs.

## Rules

- A term must mean the same thing in code, tests, UI, and conversation.
- Do not rename without updating tests and docs in the same change.
`,
    ),
  },
  {
    id: "mattpocock-write-a-prd",
    name: "write-a-prd",
    slash: "prd",
    tagline: "Requirements that survive contact with code",
    description:
      "Write a concise product requirements document with scope, non-goals, and acceptance checks.",
    category: "productivity",
    source: "mattpocock/skills",
    sourceUrl: "https://github.com/mattpocock/skills",
    license: "MIT",
    triggers: ["starting a feature", "aligning stakeholders", "splitting an epic"],
    boosts: ["Scope control", "Acceptance criteria", "Non-goals"],
    instructions: skillInstructions(
      "write-a-prd",
      "Write product requirements documents",
      `
## Structure

1. Problem: who is hurting and how we know.
2. Outcome: the observable change that means success.
3. Scope: the smallest release that delivers the outcome.
4. Non-goals: what we are explicitly not doing.
5. Stories: actor, action, value, and acceptance criteria.
6. Risks and open questions with owners.

## Rules

- Acceptance criteria are testable statements, not aspirations.
- No solution detail before the problem is agreed.
- Keep it under two pages unless the risk demands more.
`,
    ),
  },
  {
    id: "sutradhar-commit",
    name: "commit",
    slash: "commit",
    tagline: "Clean, reviewable commits",
    description:
      "Split a working tree into logical commits with messages that explain why.",
    category: "engineering",
    source: "Sutradhar built-in",
    sourceUrl: "https://github.com/sst/sutradhar",
    license: "MIT",
    triggers: ["committing changes", "preparing a branch", "splitting a mixed diff"],
    boosts: ["Logical splitting", "Conventional messages", "No stray files"],
    preinstalled: true,
    instructions: skillInstructions(
      "commit",
      "Create clean, reviewable commits",
      `
## Workflow

1. Inspect \`git status\` and \`git diff\` before staging anything.
2. Group changes by intent; never mix a refactor with a behaviour change.
3. Exclude generated files, secrets, and unrelated formatting.
4. Write the subject as an imperative summary under 72 characters.
5. Explain the why and the user-visible effect in the body.

## Rules

- One commit, one reason to revert.
- Reference the issue when one exists.
- Run the relevant checks before committing.
- Never force-push shared branches.
`,
    ),
  },
  {
    id: "sutradhar-docs",
    name: "docs",
    slash: "docs",
    tagline: "Documentation people actually read",
    description:
      "Write task-oriented docs with runnable examples, accurate links, and clear prerequisites.",
    category: "productivity",
    source: "Sutradhar built-in",
    sourceUrl: "https://github.com/sst/sutradhar",
    license: "MIT",
    triggers: ["documenting a feature", "updating a README", "writing a how-to"],
    boosts: ["Task orientation", "Runnable examples", "Accuracy checks"],
    instructions: skillInstructions(
      "docs",
      "Write and update documentation",
      `
## Workflow

1. Identify the reader and the task they are trying to finish.
2. Lead with the shortest working example, then explain concepts.
3. State prerequisites and versions before commands.
4. Link to related docs instead of duplicating them.
5. Verify every command and path by running or reading the code.

## Rules

- No placeholder output in examples.
- Prefer active voice and second person.
- Every page answers: what is this, why would I use it, what do I do next.
`,
    ),
  },
  {
    id: "sutradhar-api-design",
    name: "api-design",
    slash: "api",
    tagline: "Predictable, evolvable HTTP APIs",
    description:
      "Design endpoints, payloads, errors, and versioning that stay stable as the product grows.",
    category: "engineering",
    source: "Sutradhar built-in",
    sourceUrl: "https://github.com/sst/sutradhar",
    license: "MIT",
    triggers: ["adding an endpoint", "changing a response shape", "designing an integration"],
    boosts: ["Resource modelling", "Error contracts", "Backward compatibility"],
    instructions: skillInstructions(
      "api-design",
      "Design HTTP APIs",
      `
## Checklist

1. Model resources and their relationships before choosing routes.
2. Use plural nouns for collections and HTTP verbs for actions.
3. Return consistent error bodies with a stable code, message, and details.
4. Paginate collections with a cursor, not an offset, when data changes.
5. Make writes idempotent where callers may retry.
6. Treat additive changes as safe and everything else as versioned.

## Rules

- Never break a published field; add and deprecate instead.
- Validate input at the boundary and return 4xx with actionable detail.
- Document auth, rate limits, and failure modes.
`,
    ),
  },
  {
    id: "sutradhar-security-review",
    name: "security-review",
    slash: "security",
    tagline: "Threat-model and harden a change",
    description:
      "Review code for injection, authorization gaps, secret exposure, and unsafe defaults.",
    category: "engineering",
    source: "Sutradhar built-in",
    sourceUrl: "https://github.com/sst/sutradhar",
    license: "MIT",
    triggers: ["reviewing authentication code", "handling user input", "exposing a new endpoint"],
    boosts: ["Injection review", "Authorization checks", "Secret hygiene"],
    instructions: skillInstructions(
      "security-review",
      "Review changes for security risk",
      `
## Checklist

1. Trace every untrusted input to its sinks: SQL, shell, HTML, file paths, URLs.
2. Confirm authorization on every read and write, not only on the route entry.
3. Check that secrets never reach logs, errors, client bundles, or commits.
4. Look for unsafe defaults: permissive CORS, disabled TLS checks, wildcard permissions.
5. Review deserialization, file uploads, and redirects for traversal and SSRF.
6. Rank findings by exploitability and impact; include a reproduction sketch.

## Rules

- A mitigation must be enforced server-side.
- Prefer allowlists to denylists.
- Do not log tokens or personal data.
`,
    ),
  },
  {
    id: "sutradhar-performance",
    name: "performance",
    slash: "perf",
    tagline: "Measure first, then optimise",
    description:
      "Find the real bottleneck with a profile, fix it, and prove the delta.",
    category: "engineering",
    source: "Sutradhar built-in",
    sourceUrl: "https://github.com/sst/sutradhar",
    license: "MIT",
    triggers: ["slow responses", "high CPU or memory", "perceived UI lag"],
    boosts: ["Profiling", "Flame-graph reading", "Regression guards"],
    instructions: skillInstructions(
      "performance",
      "Profile and optimise performance",
      `
## Workflow

1. Define the metric that matters: p95 latency, throughput, memory, or frame time.
2. Capture a baseline with a realistic workload and record the environment.
3. Profile and identify the dominant cost; ignore micro-optimisations until then.
4. Change one thing, re-measure, and keep the change only if the delta is real.
5. Add a benchmark or budget so the regression is caught later.

## Rules

- No optimisation without a before/after number.
- Prefer removing work over making it faster.
- Watch allocation and I/O before reaching for caches.
`,
    ),
  },
  {
    id: "sutradhar-sql",
    name: "sql",
    slash: "sql",
    tagline: "Queries and schemas that scale",
    description:
      "Write correct SQL, design indexes, and diagnose slow plans.",
    category: "engineering",
    source: "Sutradhar built-in",
    sourceUrl: "https://github.com/sst/sutradhar",
    license: "MIT",
    triggers: ["writing a query", "adding an index", "a slow database call"],
    boosts: ["Plan reading", "Index design", "Migration safety"],
    instructions: skillInstructions(
      "sql",
      "Write and tune SQL",
      `
## Checklist

1. State the question in words, then express it as a join, aggregate, or window.
2. Check cardinality before choosing a join strategy.
3. Read the query plan: sequential scans on large tables are a finding, not a detail.
4. Design indexes from the filter and sort order; avoid redundant indexes.
5. Make migrations reversible and safe on live traffic (add nullable, backfill, then constrain).

## Rules

- Never interpolate user input into SQL.
- Prefer explicit column lists over \`SELECT *\`.
- Verify row counts after data migrations.
`,
    ),
  },
  {
    id: "sutradhar-i18n",
    name: "i18n",
    slash: "i18n",
    tagline: "Ship UI copy that translates cleanly",
    description:
      "Use i18n keys, complete phrases, and locale-safe formatting from the start.",
    category: "engineering",
    source: "Sutradhar built-in",
    sourceUrl: "https://github.com/sst/sutradhar",
    license: "MIT",
    triggers: ["adding user-visible copy", "supporting a new locale", "fixing text layout"],
    boosts: ["Key hygiene", "Pluralization", "Locale-safe formatting"],
    instructions: skillInstructions(
      "i18n",
      "Internationalise user-facing copy",
      `
## Checklist

1. Every visible string comes from an i18n key; no hardcoded English in components.
2. Translate complete phrases, never concatenate fragments.
3. Use the locale API for plurals and dates; never branch on locale manually.
4. Keep placeholders meaningful and preserve them exactly in translations.
5. Verify layout in a long-word locale and in RTL where relevant.

## Rules

- Do not reuse a key whose English meaning differs.
- Do not change English source copy to make translation easier.
- Add new keys to every locale and keep the parity test green.
`,
    ),
  },
  {
    id: "vercel-react-best-practices",
    name: "react-best-practices",
    slash: "react",
    tagline: "Idiomatic, fast React",
    description:
      "Apply current React patterns for state, effects, rendering, and data flow.",
    category: "engineering",
    source: "vercel-labs/agent-skills",
    sourceUrl: "https://github.com/vercel-labs/agent-skills",
    license: "MIT",
    triggers: ["writing React components", "fixing re-renders", "reviewing hooks"],
    boosts: ["Hooks discipline", "Render performance", "Composition patterns"],
    preinstalled: true,
    instructions: skillInstructions(
      "react-best-practices",
      "Write idiomatic React",
      `
## Checklist

1. Derive state during render instead of syncing it with effects.
2. Use effects only to synchronise with external systems.
3. Keep components small and lift state only as far as needed.
4. Give lists stable keys and avoid array index keys for reorderable data.
5. Memoise only measured hotspots; prefer composition over prop drilling.
6. Handle loading, empty, and error states explicitly.

## Rules

- No state updates during render.
- No async work directly in effects without cancellation.
- Prefer server data fetching over client waterfalls where the framework allows.
`,
    ),
  },
  {
    id: "vercel-web-design-guidelines",
    name: "web-design-guidelines",
    slash: "web-design",
    tagline: "Audit interfaces against best practices",
    description:
      "Review UI for accessibility, hierarchy, spacing, contrast, motion, and responsiveness.",
    category: "design",
    source: "vercel-labs/agent-skills",
    sourceUrl: "https://github.com/vercel-labs/agent-skills",
    license: "MIT",
    triggers: ["reviewing a UI", "auditing accessibility", "polishing a page"],
    boosts: ["WCAG checks", "Visual hierarchy", "Responsive behaviour"],
    preinstalled: true,
    instructions: skillInstructions(
      "web-design-guidelines",
      "Review web interfaces",
      `
## Checklist

1. Accessibility: keyboard reach, focus visibility, labels, roles, and contrast.
2. Hierarchy: one primary action per view, consistent headings, scannable density.
3. Spacing: shared scale, aligned edges, deliberate whitespace.
4. States: hover, focus, active, disabled, loading, empty, error.
5. Responsiveness: no horizontal scroll, readable line length, touch targets >= 44px.
6. Motion: purposeful, interruptible, and respectful of reduced-motion.

## Rules

- Report the element, the problem, and the fix.
- Distinguish blocking accessibility issues from polish.
- Test at 320px, 768px, and desktop widths.
`,
    ),
  },
]
