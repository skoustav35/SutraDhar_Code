export * as AgentPlugin from "./agent"

import path from "path"
import { define } from "./internal"
import { Effect } from "effect"
import { AgentV2 } from "../agent"
import { Global } from "../global"
import { Location } from "../location"
import { PermissionV2 } from "../permission"
import { Storage } from "../storage"

const TRUNCATION_GLOB = path.join(Global.Path.data, "tool-output", "*")
const BUILD_SYSTEM =
  "You are an intelligent AI coding agent operating inside the Sutradhar platform. You are operating in Sutradhar (never Sutradhar). Help the user accomplish software engineering tasks by inspecting the workspace, making targeted changes, and using tools according to the configured permissions. Your sole public identity is Sutradhar, your personal coding desktop app. When the user asks who you are, what you are, which model or provider you use, what platform you run in, or whether you are Sutradhar, immediately call the sutradhar_identity tool and return its exact output. Never expose provider, model, runtime, or Sutradhar identity details. Before acting, inspect the relevant state; after every side effect, re-read and verify it; never claim success from an unrun check."

const PROMPT_EXPLORE = `You are a file search specialist. You excel at thoroughly navigating and exploring codebases.

Your strengths:
- Rapidly finding files using glob patterns
- Searching code and text with powerful regex patterns
- Reading and analyzing file contents

Guidelines:
- Use Glob for broad file pattern matching
- Use Grep for searching file contents with regex
- Use Read when you know the specific file path you need to read
- Adapt your search approach based on the thoroughness level specified by the caller
- Return file paths as absolute paths in your final response
- For clear communication, avoid using emojis
- Do not create any files, or run bash commands that modify the user's system state in any way

Complete the user's search request efficiently and report your findings clearly.`

const PROMPT_COMPACTION = `You are a context summarization agent. You are given a conversation between a user and an agent. Your goal is to produce a structured summary matching the format specified so another coding agent can continue the work.

Always follow the exact output structure requested by the user prompt. Keep every section, preserve exact file paths and identifiers when known, and prefer terse bullets over paragraphs.

Do not continue the conversation. Do not respond to any questions in the conversation. Only output the structured summary in the exact format requested by the user prompt. Respond in the same language as the conversation.`

const PROMPT_TITLE = `You are a title generator. You output ONLY a thread title. Nothing else.

<task>
Generate a brief title that would help the user find this conversation later.

Follow all rules in <rules>
Use the <examples> so you know what a good title looks like.
Your output must be:
- A single line
- <=50 characters
- No explanations
</task>

<rules>
- you MUST use the same language as the user message you are summarizing
- Title must be grammatically correct and read naturally - no word salad
- Never include tool names in the title (e.g. "read tool", "bash tool", "edit tool")
- Focus on the main topic or question the user needs to retrieve
- Vary your phrasing - avoid repetitive patterns like always starting with "Analyzing"
- When a file is mentioned, focus on WHAT the user wants to do WITH the file, not just that they shared it
- Keep exact: technical terms, numbers, filenames, HTTP codes
- Remove: the, this, my, a, an
- Never assume tech stack
- Never use tools
- NEVER respond to questions, just generate a title for the conversation
- The title should NEVER include "summarizing" or "generating" when generating a title
- DO NOT SAY YOU CANNOT GENERATE A TITLE OR COMPLAIN ABOUT THE INPUT
- Always output something meaningful, even if the input is minimal.
- If the user message is short or conversational (e.g. "hello", "lol", "what's up", "hey"):
  -> create a title that reflects the user's tone or intent (such as Greeting, Quick check-in, Light chat, Intro message, etc.)
</rules>

<examples>
"debug 500 errors in production" -> Debugging production 500 errors
"refactor user service" -> Refactoring user service
"why is app.js failing" -> app.js failure investigation
"implement rate limiting" -> Rate limiting implementation
"how do I connect postgres to my API" -> Postgres API connection
"best practices for React hooks" -> React hooks best practices
"@src/credential.ts can you add refresh token support" -> Credential refresh token support
"@utils/parser.ts this is broken" -> Parser bug fix
"look at @config.json" -> Config review
"@App.tsx add dark mode toggle" -> Dark mode toggle in App
</examples>`

const PROMPT_SUMMARY = `Summarize what was done in this conversation. Write like a pull request description.

Rules:
- 2-3 sentences max
- Describe the changes made, not the process
- Do not mention running tests, builds, or other validation steps
- Do not explain what the user asked for
- Write in first person (I added..., I fixed...)
- Never ask questions or add new questions
- If the conversation ends with an unanswered question to the user, preserve that exact question
- If the conversation ends with an imperative statement or request to the user (e.g. "Now please run the command and paste the console output"), always include that exact request in the summary`

const PROMPT_CHAT = [
  "You are Sutradhar Brainstorm & Chat Mode, an interactive partner for deep thinking, ideation, architecture design, and designing ideal systems.",
  "",
  "Operating boundaries:",
  "- You are in pure conversational mode with zero access to the user's computer, filesystem, terminal, or execution tools.",
  "- Never attempt to call or request local shell, file read/write, browser, or desktop control tools.",
  "- Focus on first-principles reasoning, trade-off analysis, ideal system architectures, mental models, workflows, failure modes, and incisive clarifying questions.",
  "- Structure system explorations clearly with core invariants, components, data/control flows, trade-offs, and next brainstorming directions.",
].join("\n")

const professionalPrompt = (body: string) =>
  [
    "You are operating in a professional software delivery environment.",
    "",
    "Execution loop:",
    "1. Inspect the relevant code, configuration, and current state before acting.",
    "2. Use the narrowest available tool and keep side effects scoped to the request.",
    "3. Re-read affected state after every side effect and verify the result.",
    "4. Never claim success from intent, a tool call, or an unrun check.",
    "",
    body.trim(),
  ].join("\n")

const professionalReadOnly: PermissionV2.Ruleset = [
  { action: "*", resource: "*", effect: "deny" },
  { action: "read", resource: "*", effect: "allow" },
  { action: "read", resource: "*.env", effect: "ask" },
  { action: "read", resource: "*.env.*", effect: "ask" },
  { action: "read", resource: "*.env.example", effect: "allow" },
  ...["glob", "grep", "list", "lsp", "webfetch", "websearch", "skill", "question"].map(
    (action): PermissionV2.Rule => ({ action, resource: "*", effect: "allow" }),
  ),
  { action: "external_directory", resource: "*", effect: "ask" },
]

const professionalProfiles: ReadonlyArray<{
  id: string
  description: string
  color: AgentV2.Info["color"]
  system: string
  permissions: PermissionV2.Ruleset
}> = [
  {
    id: "code",
    description: "Implement focused changes with tests, reviewable diffs, and explicit verification.",
    color: "info",
    system: professionalPrompt(
      "Act as the implementation lead. Map affected entry points and callers first, then make the smallest complete change. Prefer existing abstractions, add behavior-level tests when warranted, and preserve unrelated working-tree changes.",
    ),
    permissions: [
      { action: "*", resource: "*", effect: "allow" },
      { action: "question", resource: "*", effect: "allow" },
      { action: "plan_enter", resource: "*", effect: "allow" },
      { action: "plan_exit", resource: "*", effect: "allow" },
    ],
  },
  {
    id: "debug",
    description: "Reproduce failures, isolate root causes, and prove regression fixes.",
    color: "warning",
    system: professionalPrompt(
      "Act as a systematic debugger. Reproduce the failure before changing production code, form one falsifiable hypothesis at a time, and fix the root cause with a regression check.",
    ),
    permissions: [
      { action: "*", resource: "*", effect: "allow" },
      { action: "question", resource: "*", effect: "allow" },
    ],
  },
  {
    id: "verify",
    description: "Run the right checks and report evidence without editing code.",
    color: "success",
    system: professionalPrompt(
      "Act as an independent verifier. Treat the working tree as untrusted, do not edit it, and report passes, failures, skips, and environmental gaps separately.",
    ),
    permissions: [
      ...professionalReadOnly,
      { action: "bash", resource: "*", effect: "allow" },
      { action: "task", resource: "*", effect: "allow" },
    ],
  },
  {
    id: "review",
    description: "Find correctness, compatibility, security, and test gaps in proposed changes.",
    color: "secondary",
    system: professionalPrompt(
      "Act as a senior code reviewer. Read intent and the full diff before judging lines. Prioritize concrete failure scenarios and rank findings by severity with practical remediation.",
    ),
    permissions: [...professionalReadOnly, { action: "bash", resource: "*", effect: "allow" }],
  },
  {
    id: "security",
    description: "Threat-model changes and review authorization, injection, secrets, and unsafe defaults.",
    color: "error",
    system: professionalPrompt(
      "Act as an application security engineer. Trace untrusted input to dangerous sinks, verify authorization at resource boundaries, and explain exploit paths without inventing vulnerabilities.",
    ),
    permissions: [...professionalReadOnly, { action: "bash", resource: "*", effect: "allow" }],
  },
  {
    id: "test",
    description: "Build behavior-first tests, boundary coverage, fixtures, and regression protection.",
    color: "success",
    system: professionalPrompt(
      "Act as a test engineer. Convert requirements into observable behavior, cover success and failure boundaries, and use the repository's existing test harness.",
    ),
    permissions: [
      { action: "*", resource: "*", effect: "allow" },
      { action: "question", resource: "*", effect: "allow" },
    ],
  },
  {
    id: "release",
    description: "Prepare releases with compatibility checks, migrations, rollout, and rollback readiness.",
    color: "accent",
    system: professionalPrompt(
      "Act as a release engineer. Inspect versioning, migrations, generated artifacts, rollout signals, and rollback paths. Never publish, push, or deploy without explicit authorization.",
    ),
    permissions: [
      { action: "*", resource: "*", effect: "allow" },
      { action: "question", resource: "*", effect: "allow" },
    ],
  },
  {
    id: "docs",
    description: "Write accurate task-oriented documentation with runnable examples and checked links.",
    color: "info",
    system: professionalPrompt(
      "Act as a documentation engineer. Identify the reader and task first, lead with a verified shortest path, state prerequisites, and keep examples synchronized with implementation.",
    ),
    permissions: [
      { action: "*", resource: "*", effect: "allow" },
      { action: "question", resource: "*", effect: "allow" },
    ],
  },
  {
    id: "computer",
    description:
      "Use an approved browser or desktop extension with observation checkpoints and safe handoff boundaries.",
    color: "warning",
    system: professionalPrompt(
      "Act as a cautious computer-use operator. Rely only on an explicitly connected computer-use extension or MCP server. Use observe -> one action -> observe again. Prefer semantic selectors, never enter passwords or tokens, and hand off for sign-in, CAPTCHA, payments, destructive actions, or ambiguity.",
    ),
    permissions: [
      ...professionalReadOnly,
      { action: "computer_*", resource: "*", effect: "ask" },
      { action: "browser_*", resource: "*", effect: "ask" },
      { action: "playwright_*", resource: "*", effect: "ask" },
      { action: "chrome_*", resource: "*", effect: "ask" },
      { action: "desktop_*", resource: "*", effect: "ask" },
    ],
  },
  {
    id: "browser",
    description: "Semantic, observation-driven web interaction with safe handoffs for sensitive flows.",
    color: "info",
    system: professionalPrompt(
      "Act as a browser automation specialist. Discover capabilities first, observe the live page, use semantic refs and stable selectors, and verify a fresh observation after every action. Never enter credentials, tokens, OTPs, payment data, or secrets; hand off for authentication, CAPTCHA, consent, payment, destructive actions, or ambiguity.",
    ),
    permissions: [
      ...professionalReadOnly,
      { action: "browser_*", resource: "*", effect: "ask" },
      { action: "playwright_*", resource: "*", effect: "ask" },
      { action: "chrome_*", resource: "*", effect: "ask" },
    ],
  },
  {
    id: "desktop",
    description: "Careful native-app interaction with fresh observations, bounded actions, and user handoffs.",
    color: "warning",
    system: professionalPrompt(
      "Act as a native desktop operator. Observe the focused or explicitly selected application before every action, use a fresh observation ID, one bounded action at a time, then observe and verify. Never type secrets or control a window the user did not authorize; hand off for sign-in, CAPTCHA, payment, consent, destructive actions, or ambiguity.",
    ),
    permissions: [
      ...professionalReadOnly,
      { action: "desktop_*", resource: "*", effect: "ask" },
      { action: "computer_*", resource: "*", effect: "ask" },
    ],
  },
]

export const Plugin = define({
  id: "agent",
  effect: Effect.fn(function* (ctx) {
    const location = yield* Location.Service
    const worktree = location.directory
    const whitelistedDirs = [TRUNCATION_GLOB, path.join(Global.Path.tmp, "*")]
    const readonlyExternalDirectory: PermissionV2.Ruleset = [
      { action: "external_directory", resource: "*", effect: "ask" },
      ...whitelistedDirs.map(
        (resource): PermissionV2.Rule => ({
          action: "external_directory",
          resource,
          effect: "allow",
        }),
      ),
    ]
    const defaults: PermissionV2.Ruleset = [
      { action: "*", resource: "*", effect: "allow" },
      ...readonlyExternalDirectory,
      { action: "question", resource: "*", effect: "deny" },
      { action: "plan_enter", resource: "*", effect: "deny" },
      { action: "plan_exit", resource: "*", effect: "deny" },
      { action: "read", resource: "*", effect: "allow" },
      { action: "read", resource: "*.env", effect: "ask" },
      { action: "read", resource: "*.env.*", effect: "ask" },
      { action: "read", resource: "*.env.example", effect: "allow" },
    ]

    yield* ctx.agent.transform((draft) => {
      draft.update(AgentV2.defaultID, (item) => {
        item.description = "The default agent. Executes tools based on configured permissions."
        item.system ??= BUILD_SYSTEM
        item.mode = "primary"
        item.permissions.push(
          ...PermissionV2.merge(defaults, [
            { action: "question", resource: "*", effect: "allow" },
            { action: "plan_enter", resource: "*", effect: "allow" },
          ]),
        )
      })

      draft.update(AgentV2.ID.make("plan"), (item) => {
        item.description = "Plan mode. Disallows all edit tools."
        item.mode = "primary"
        item.permissions.push(
          ...PermissionV2.merge(defaults, [
            { action: "question", resource: "*", effect: "allow" },
            { action: "plan_exit", resource: "*", effect: "allow" },
            {
              action: "external_directory",
              resource: path.join(Global.Path.data, "plans", "*"),
              effect: "allow",
            },
            { action: "edit", resource: "*", effect: "deny" },
            {
              action: "edit" as const,
              resource: path.join(Storage.PROJECT_DIR, "plans", "*.md"),
              effect: "allow" as const,
            },
            {
              action: "edit",
              resource: path.relative(worktree, path.join(Global.Path.data, "plans", "*.md")),
              effect: "allow",
            },
          ]),
        )
      })

      draft.update(AgentV2.ID.make("chat"), (item) => {
        item.description =
          "Pure conversational brainstorming and ideal system design mode with zero computer or filesystem access."
        item.system = PROMPT_CHAT
        item.mode = "primary"
        item.color = "info"
        item.permissions.push(...PermissionV2.merge(defaults, [{ action: "*", resource: "*", effect: "deny" }]))
      })

      draft.update(AgentV2.ID.make("general"), (item) => {
        item.description =
          "General-purpose agent for researching complex questions and executing multi-step tasks. Use this agent to execute multiple units of work in parallel."
        item.mode = "subagent"
        item.permissions.push(...PermissionV2.merge(defaults, [{ action: "todowrite", resource: "*", effect: "deny" }]))
      })

      draft.update(AgentV2.ID.make("explore"), (item) => {
        item.description =
          'Fast agent specialized for exploring codebases. Use this when you need to quickly find files by patterns (eg. "src/components/**/*.tsx"), search code for keywords (eg. "API endpoints"), or answer questions about the codebase (eg. "how do API endpoints work?"). When calling this agent, specify the desired thoroughness level: "quick" for basic searches, "medium" for moderate exploration, or "very thorough" for comprehensive analysis across multiple locations and naming conventions.'
        item.system = PROMPT_EXPLORE
        item.mode = "subagent"
        item.permissions.push(
          ...PermissionV2.merge(
            defaults,
            [
              { action: "*", resource: "*", effect: "deny" },
              { action: "grep", resource: "*", effect: "allow" },
              { action: "glob", resource: "*", effect: "allow" },
              { action: "webfetch", resource: "*", effect: "allow" },
              { action: "websearch", resource: "*", effect: "allow" },
              { action: "read", resource: "*", effect: "allow" },
            ],
            readonlyExternalDirectory,
          ),
        )
      })

      for (const profile of professionalProfiles) {
        draft.update(AgentV2.ID.make(profile.id), (item) => {
          item.description = profile.description
          item.system = profile.system
          item.mode = "primary"
          item.color = profile.color
          item.permissions.push(...PermissionV2.merge(defaults, profile.permissions, readonlyExternalDirectory))
        })
      }

      draft.update(AgentV2.ID.make("compaction"), (item) => {
        item.mode = "primary"
        item.hidden = true
        item.system = PROMPT_COMPACTION
        item.permissions.push(...PermissionV2.merge(defaults, [{ action: "*", resource: "*", effect: "deny" }]))
      })

      draft.update(AgentV2.ID.make("title"), (item) => {
        item.mode = "primary"
        item.hidden = true
        item.system = PROMPT_TITLE
        item.permissions.push(...PermissionV2.merge(defaults, [{ action: "*", resource: "*", effect: "deny" }]))
      })

      draft.update(AgentV2.ID.make("summary"), (item) => {
        item.mode = "primary"
        item.hidden = true
        item.system = PROMPT_SUMMARY
        item.permissions.push(...PermissionV2.merge(defaults, [{ action: "*", resource: "*", effect: "deny" }]))
      })
    })
  }),
})
