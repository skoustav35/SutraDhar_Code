import { skillInstructions, type SkillCatalogItem } from "./catalog-types"

export const SKILLS_PLATFORM: SkillCatalogItem[] = [
  {
    id: "anthropic-frontend-design",
    name: "frontend-design",
    slash: "frontend",
    tagline: "Distinctive interfaces, not template defaults",
    description:
      "Design and build production-grade frontends with deliberate typography, colour, layout, and motion.",
    category: "design",
    source: "anthropics/skills",
    sourceUrl: "https://github.com/anthropics/skills/blob/main/skills/frontend-design/SKILL.md",
    license: "Source-available",
    triggers: ["building a new page", "redesigning an interface", "adding visual polish"],
    boosts: ["Design direction", "Type and colour systems", "Motion and detail"],
    preinstalled: true,
    instructions: skillInstructions(
      "frontend-design",
      "Design distinctive frontend interfaces",
      `
## Workflow

1. Choose a specific direction before coding: editorial, technical, warm, brutalist, or minimal. Write it down in one sentence.
2. Pick a type pairing with contrast (display plus text) and a restrained palette with one accent.
3. Build a spacing and radius scale; reuse it everywhere.
4. Compose with a clear grid and one focal element per screen.
5. Add motion only where it communicates state or hierarchy; keep durations short.
6. Implement real content and real states, not lorem ipsum and happy paths.

## Avoid

- Purple gradients on white cards as a default aesthetic.
- Uniform card grids with no hierarchy.
- Icon-only controls without labels or tooltips.
- Decorative glass effects that reduce contrast.
`,
    ),
  },
  {
    id: "anthropic-webapp-testing",
    name: "webapp-testing",
    slash: "browser-test",
    tagline: "Drive a real browser to verify behaviour",
    description:
      "Use Playwright to reproduce flows, assert on real UI state, and capture evidence.",
    category: "platform",
    source: "anthropics/skills",
    sourceUrl: "https://github.com/anthropics/skills/blob/main/skills/webapp-testing/SKILL.md",
    license: "Source-available",
    triggers: ["testing a web flow", "reproducing a UI bug", "verifying a deploy"],
    boosts: ["Playwright flows", "Selectors that last", "Screenshots and traces"],
    preinstalled: true,
    instructions: skillInstructions(
      "webapp-testing",
      "Test web applications with Playwright",
      `
## Workflow

1. Start the app and confirm the URL and seeded data.
2. Drive the flow the way a user would: click, type, navigate.
3. Prefer role and label selectors over CSS classes and XPath.
4. Assert on visible outcome, not implementation detail.
5. Capture a screenshot or trace on failure.
6. Clean up test data and stop the process.

## Rules

- Wait for observable state, never fixed sleeps.
- One test, one behaviour.
- Keep credentials out of the test file.
`,
    ),
  },
  {
    id: "anthropic-skill-creator",
    name: "skill-creator",
    slash: "skill-creator",
    tagline: "Write skills that actually trigger",
    description:
      "Create and refine SKILL.md files with precise descriptions, progressive disclosure, and verifiable workflows.",
    category: "platform",
    source: "anthropics/skills",
    sourceUrl: "https://github.com/anthropics/skills/blob/main/skills/skill-creator/SKILL.md",
    license: "Source-available",
    triggers: ["authoring a skill", "fixing a skill that never activates", "packaging expertise"],
    boosts: ["Trigger writing", "Progressive disclosure", "Evaluation"],
    instructions: skillInstructions(
      "skill-creator",
      "Create and improve skills",
      `
## Workflow

1. Define the job the skill does and the phrases that should trigger it.
2. Write the description as "what it does and when to use it", including concrete trigger words.
3. Keep the main file short; move deep reference material into linked files.
4. Write steps as an executable workflow with checks, not a list of topics.
5. Add at least three realistic prompts and verify the skill activates on all of them.

## Rules

- The description is the routing signal; make it specific and searchable.
- One skill, one responsibility.
- Include failure handling and stop conditions.
`,
    ),
  },
  {
    id: "anthropic-mcp-builder",
    name: "mcp-builder",
    slash: "mcp-builder",
    tagline: "Build MCP servers that agents can use",
    description:
      "Design tools, resources, and prompts for the Model Context Protocol with clear schemas and safe behaviour.",
    category: "platform",
    source: "anthropics/skills",
    sourceUrl: "https://github.com/anthropics/skills/blob/main/skills/mcp-builder/SKILL.md",
    license: "Source-available",
    triggers: ["creating an MCP server", "exposing APIs to agents", "reviewing MCP tools"],
    boosts: ["Tool schemas", "Error contracts", "Safety boundaries"],
    instructions: skillInstructions(
      "mcp-builder",
      "Build Model Context Protocol servers",
      `
## Workflow

1. List the tasks an agent should complete, then design the fewest tools that cover them.
2. Write precise names, descriptions, and JSON schemas; include examples in descriptions.
3. Return structured content and actionable errors.
4. Keep tools idempotent where possible and require confirmation for destructive actions.
5. Add resources for read-only context instead of overloading tools.

## Rules

- Never expose secrets in tool output.
- Validate inputs and return a clear error instead of throwing.
- Prefer one composable tool over many narrow ones.
- Document auth and rate limits.
`,
    ),
  },
  {
    id: "vercel-agent-browser",
    name: "agent-browser",
    slash: "agent-browser",
    tagline: "Scripted browser automation from the CLI",
    description:
      "Navigate, click, fill, and snapshot pages with the agent-browser CLI.",
    category: "platform",
    source: "vercel-labs/agent-browser",
    sourceUrl: "https://github.com/vercel-labs/agent-browser",
    license: "MIT",
    triggers: ["automating a browser", "taking screenshots", "verifying a live site"],
    boosts: ["Element snapshots", "Form automation", "Visual evidence"],
    instructions: skillInstructions(
      "agent-browser",
      "Automate a browser with agent-browser",
      `
## Workflow

1. \`agent-browser open <url>\` to navigate.
2. \`agent-browser snapshot -i\` to get interactive elements and refs.
3. Act on refs: \`agent-browser click @e1\`, \`agent-browser fill @e2 "text"\`.
4. Re-snapshot after any navigation or mutation.
5. Capture a screenshot when the visual result matters.

## Rules

- Refs are invalid after DOM changes; always re-snapshot.
- Prefer visible labels when choosing an element.
- Close the session when finished.
`,
    ),
  },
  {
    id: "supabase-agent-skills",
    name: "supabase",
    slash: "supabase",
    tagline: "Postgres and Supabase without footguns",
    description:
      "Design schemas, row-level security, migrations, and client queries the Supabase way.",
    category: "platform",
    source: "supabase/agent-skills",
    sourceUrl: "https://github.com/supabase/agent-skills",
    license: "Apache-2.0",
    triggers: ["working with Supabase", "writing row-level security", "designing a Postgres schema"],
    boosts: ["RLS policies", "Migration safety", "Client query patterns"],
    instructions: skillInstructions(
      "supabase",
      "Work with Supabase and Postgres",
      `
## Checklist

1. Enable row-level security on every exposed table and write policies for select, insert, update, delete separately.
2. Test policies as an anonymous user and as each role.
3. Keep migrations in files; never edit production schema by hand.
4. Use foreign keys and indexes for every join and filter in hot paths.
5. Select only needed columns; avoid N+1 calls from the client.
6. Store secrets in server-side environment variables, never in the client bundle.

## Rules

- Security definer functions need an explicit search_path and permission check.
- Prefer database constraints over application-only validation.
`,
    ),
  },
  {
    id: "prisma-skills",
    name: "prisma",
    slash: "prisma",
    tagline: "Schema, migrations and queries that stay safe",
    description:
      "Model data, evolve migrations, and write efficient Prisma Client queries.",
    category: "platform",
    source: "prisma/skills",
    sourceUrl: "https://github.com/prisma/skills",
    license: "Apache-2.0",
    triggers: ["changing a Prisma schema", "writing a migration", "debugging a Prisma query"],
    boosts: ["Schema modelling", "Migration review", "Query efficiency"],
    instructions: skillInstructions(
      "prisma",
      "Work with Prisma",
      `
## Checklist

1. Model relations explicitly and add indexes for foreign keys used in filters.
2. Generate migrations and read the SQL before applying it.
3. Make destructive migrations staged: add, backfill, switch reads, then remove.
4. Use select/include deliberately to avoid over-fetching.
5. Wrap multi-step writes in a transaction.
6. Log slow queries and inspect the generated SQL when performance matters.

## Rules

- Never run migrate reset against shared data.
- Regenerate the client after schema changes.
- Keep seed data idempotent.
`,
    ),
  },
  {
    id: "shadcn-ui",
    name: "shadcn",
    slash: "shadcn",
    tagline: "Compose accessible components the shadcn way",
    description:
      "Add, customise, and theme shadcn/ui components without breaking accessibility or design tokens.",
    category: "design",
    source: "shadcn-ui/ui",
    sourceUrl: "https://github.com/shadcn-ui/ui",
    license: "MIT",
    triggers: ["adding a shadcn component", "theming a component library", "building forms and tables"],
    boosts: ["Registry usage", "Token theming", "Accessible composition"],
    instructions: skillInstructions(
      "shadcn",
      "Work with shadcn/ui components",
      `
## Checklist

1. Add components through the CLI so dependencies and structure stay correct.
2. Theme with CSS variables; never hardcode colour values in components.
3. Compose primitives (dialog, popover, command) instead of rebuilding behaviour.
4. Keep focus management and keyboard behaviour intact when customising.
5. Use the form and table patterns for validation and sorting rather than ad-hoc code.

## Rules

- Do not remove aria attributes while restyling.
- Keep variant APIs consistent with the existing component.
- Check dark mode and RTL after theming.
`,
    ),
  },
  {
    id: "remotion-skills",
    name: "remotion",
    slash: "remotion",
    tagline: "Programmatic video in React",
    description:
      "Build deterministic, parameterised video compositions with Remotion.",
    category: "design",
    source: "remotion-dev/skills",
    sourceUrl: "https://github.com/remotion-dev/skills",
    license: "Remotion License",
    triggers: ["rendering a video", "creating an animated explainer", "generating video from data"],
    boosts: ["Composition structure", "Frame-accurate animation", "Deterministic renders"],
    instructions: skillInstructions(
      "remotion",
      "Build video compositions with Remotion",
      `
## Checklist

1. Define compositions with explicit width, height, fps, and duration.
2. Drive animation from \`useCurrentFrame\` and \`interpolate\`; avoid timers.
3. Keep every asset local or pinned so renders are reproducible.
4. Split scenes into components with their own timing.
5. Preview in the studio, then render a short range before the full video.

## Rules

- No Math.random without a seeded source.
- No browser-only APIs during render.
- Respect font loading before capturing frames.
`,
    ),
  },
  {
    id: "ui-ux-pro-max",
    name: "ui-ux-pro-max",
    slash: "ui-ux",
    tagline: "Design systems, palettes and UX patterns",
    description:
      "Choose typography, colour, layout, and interaction patterns for a specific product and audience.",
    category: "design",
    source: "nextlevelbuilder/ui-ux-pro-max-skill",
    sourceUrl: "https://github.com/nextlevelbuilder/ui-ux-pro-max-skill",
    license: "MIT",
    triggers: ["choosing a design direction", "building a design system", "improving UX"],
    boosts: ["Style selection", "Palette and type scales", "UX heuristics"],
    instructions: skillInstructions(
      "ui-ux-pro-max",
      "Apply UX and visual design systems",
      `
## Workflow

1. Identify the product category, audience, and emotional target.
2. Pick a style direction and justify it in one sentence.
3. Define tokens: colour roles, type scale, spacing, radius, shadow, motion.
4. Map the core flows and cover empty, loading, and error states.
5. Review against heuristics: visibility of status, match to the real world, user control, consistency, error prevention.

## Rules

- Contrast meets WCAG AA.
- One primary action per screen.
- Interaction patterns follow platform expectations.
- Document the tokens before styling screens.
`,
    ),
  },
  {
    id: "vercel-deployment",
    name: "vercel-deployment",
    slash: "deploy",
    tagline: "Ship and roll back safely",
    description:
      "Prepare, deploy, verify, and roll back a deployment with explicit checks.",
    category: "platform",
    source: "vercel-labs/agent-skills",
    sourceUrl: "https://github.com/vercel-labs/agent-skills",
    license: "MIT",
    triggers: ["deploying an app", "debugging a failed build", "rolling back a release"],
    boosts: ["Build triage", "Environment checks", "Safe rollback"],
    instructions: skillInstructions(
      "vercel-deployment",
      "Deploy and verify releases",
      `
## Workflow

1. Confirm the target environment and the commit being deployed.
2. Verify required environment variables exist in that environment.
3. Run the build locally when the toolchain allows it.
4. Deploy, then check logs and the health endpoint.
5. Exercise the critical user path on the deployed URL.
6. Record the previous good deployment for rollback.

## Rules

- Never deploy secrets into a public environment.
- Do not promote a preview without smoke tests.
- Roll back first, diagnose second, when users are affected.
`,
    ),
  },
  {
    id: "vercel-find-skills",
    name: "find-skills",
    slash: "find-skills",
    tagline: "Discover and install new capabilities",
    description:
      "Search the open skills ecosystem for a capability, evaluate it, and install it safely.",
    category: "platform",
    source: "vercel-labs/skills",
    sourceUrl: "https://github.com/vercel-labs/skills",
    license: "MIT",
    triggers: ["a task no current skill covers", "looking for a community skill", "extending the agent"],
    boosts: ["Ecosystem search", "Quality signals", "Safe installation"],
    instructions: skillInstructions(
      "find-skills",
      "Find and evaluate new skills",
      `
## Workflow

1. Describe the missing capability in concrete terms before searching.
2. Search the skills registry and GitHub for matching SKILL.md files.
3. Check the source repository, license, recency, and whether the skill has real instructions.
4. Read the skill before installing; reject anything that requests secrets or broad permissions.
5. Install into a project or user skill folder and verify activation with a test prompt.

## Rules

- Prefer official or well-maintained sources.
- Never install a skill that runs opaque scripts.
- Record where the skill came from.
`,
    ),
  },
  {
    id: "superpowers-brainstorming",
    name: "brainstorming",
    slash: "brainstorm",
    tagline: "Expand the option space before deciding",
    description:
      "Generate and compare distinct approaches, including the one nobody proposed.",
    category: "research",
    source: "obra/superpowers",
    sourceUrl: "https://github.com/obra/superpowers",
    license: "MIT",
    triggers: ["an underspecified problem", "a design decision with tradeoffs", "stuck on an approach"],
    boosts: ["Divergent options", "Tradeoff framing", "Decision criteria"],
    instructions: skillInstructions(
      "brainstorming",
      "Explore solution options",
      `
## Workflow

1. Restate the problem and the constraints.
2. Generate at least five genuinely different approaches, including a boring one and an unconventional one.
3. For each, state the mechanism, the cost, the risk, and what it optimises for.
4. Choose explicit evaluation criteria and score the options.
5. Recommend one with the reasoning and the conditions that would change the recommendation.

## Rules

- Quantity before judgement.
- No false balance: make a recommendation.
- Name the option you rejected and why.
`,
    ),
  },
  {
    id: "superpowers-dispatching-parallel-agents",
    name: "dispatching-parallel-agents",
    slash: "parallel",
    tagline: "Split work across agents without collisions",
    description:
      "Partition independent work, give each agent full context, and merge results safely.",
    category: "productivity",
    source: "obra/superpowers",
    sourceUrl: "https://github.com/obra/superpowers",
    license: "MIT",
    triggers: ["large investigations", "many independent files", "parallel research"],
    boosts: ["Work partitioning", "Context packaging", "Conflict avoidance"],
    instructions: skillInstructions(
      "dispatching-parallel-agents",
      "Coordinate parallel agents",
      `
## Workflow

1. Split work by ownership boundaries so two agents never edit the same file.
2. Give each agent the goal, the constraints, the files it owns, and the expected output format.
3. Ask for evidence and open questions, not just conclusions.
4. Merge by reviewing diffs in dependency order.
5. Run the full verification once after the merge.

## Rules

- No overlapping write scopes.
- Background agents get complete context; they cannot see this conversation.
- Keep one owner for shared interfaces and migrations.
`,
    ),
  },
  {
    id: "superpowers-handoff",
    name: "handoff",
    slash: "handoff",
    tagline: "Leave work resumable by anyone",
    description:
      "Write a handoff that captures state, decisions, next steps, and traps.",
    category: "productivity",
    source: "obra/superpowers",
    sourceUrl: "https://github.com/obra/superpowers",
    license: "MIT",
    triggers: ["ending a session", "pausing work", "transferring ownership"],
    boosts: ["State capture", "Decision log", "Resume checklist"],
    instructions: skillInstructions(
      "handoff",
      "Write a resumable handoff",
      `
## Structure

1. Goal and current status in two sentences.
2. What changed, with file paths and commit references.
3. Decisions made and the reasoning, including rejected options.
4. What is verified and what is not.
5. Next steps in order with the exact command to start.
6. Known traps, flaky tests, and open questions.

## Rules

- Assume the reader has no context.
- Prefer links and paths over vague descriptions.
- State the branch and worktree explicitly.
`,
    ),
  },
]
