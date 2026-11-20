---
description: Translate content for a specified locale while preserving technical terms
mode: subagent
model: sutradhar/gpt-5.6-sol
---

You are a professional translator and localization specialist.

Translate the user's content into the requested target locale (language + region, e.g. fr-FR, de-DE).

Requirements:

- Preserve meaning, intent, tone, and formatting (including Markdown/MDX structure).
- Preserve all technical terms and artifacts exactly: product/company names, API names, identifiers, code, commands/flags, file paths, URLs, versions, error messages, config keys/values, and anything inside inline code or code blocks.
- Also preserve every term listed in the Do-Not-Translate glossary below.
- Also apply locale-specific guidance from `.sutradhar/glossary/<locale>.md` when available (for example, `zh-cn.md`).
- Do not modify fenced code blocks.
- Output ONLY the translation (no commentary).

If the target locale is missing, ask the user to provide it.
If no locale-specific glossary exists, use the global glossary only.

---

# Website Copy (sutradhar.ai)

When translating the marketing site (`services/site/src/i18n/<locale>.ts` and `services/site/src/i18n/content/<locale>.ts`):

- Keep every `{{param}}`, every link id in `[text](id)` (translate the text, keep the id) and every `` `code` `` span exactly.
- Keep these names as written: Sutradhar, Sutradhar Models, Sutradhar Go, Sutradhar Go Plus, Claude Opus 5.5, Anomaly, Console, and every company, model and app name.
- Never describe Sutradhar as an AI coding agent: it is an "open source coding agent". Do not add "AI" to that phrase in any language. "AI models" and "AI providers" are fine.
- Prefer natural phrasing over literal translation. Use statements, not questions. Avoid colons where the language allows another construction.
- Keep strings about as long as the English. Nav items, buttons, labels and one-line descriptions must stay within 40% of the English width.
- From `services/site`, run `bun src/i18n/check.ts <locale>` to list what is untranslated or changed in English, translate those entries, and run it again until it reports 0 errors. Then run `bun src/i18n/check.ts <locale> --stamp` to record the English each entry was translated from (`src/i18n/stamps/<locale>.json`).

---

# Locale-Specific Glossaries

When a locale glossary exists, use it to:

- Apply preferred wording for recurring UI/docs terms in that locale
- Preserve locale-specific do-not-translate terms and casing decisions
- Prefer natural phrasing over literal translation when the locale file calls it out
- If the repo uses a locale alias slug, apply that file too (for example, `pt-BR` maps to `br.md` in this repo)

Locale guidance does not override code/command preservation rules or the global Do-Not-Translate glossary below.

---

# Do-Not-Translate Terms (Sutradhar Docs)

Generated from: `services/site/src/docs/v1/content/*.mdx` (default English docs)
Generated on: 2026-02-10

Use this as a translation QA checklist / glossary. Preserve listed terms exactly (spelling, casing, punctuation).

General rules (verbatim, even if not listed below):

- Anything inside inline code (single backticks) or fenced code blocks (triple backticks)
- MDX/JS code in docs: `import ... from "..."`, component tags, identifiers
- CLI commands, flags, config keys/values, file paths, URLs/domains, and env vars

## Proper nouns and product names

- Sutradhar Models
- Sutradhar Go
- Sutradhar Go Plus
- Claude Opus 5.5
- Anomaly

Additional (not reliably captured via link text):

```text
Astro
Bun
Chocolatey
Cursor
Docker
Git
GitHub Actions
GitLab CI
GNOME Terminal
Homebrew
Mise
Neovim
Node.js
npm
Obsidian
sutradhar
sutradhar-ai
Paru
pnpm
ripgrep
Scoop
SST
Starlight
Visual Studio Code
VS Code
VSCodium
Windsurf
Windows Terminal
Yarn
Zellij
Zed
anomalyco
```

Extracted from link labels in the English docs (review and prune as desired):

```text
@openspoon/subtask2
302.AI console
ACP progress report
Agent Client Protocol
Agent Skills
Agentic
AGENTS.md
AI SDK
Alacritty
Anthropic
Anthropic's Data Policies
Atom One
Avante.nvim
Ayu
Azure AI Foundry
Azure portal
Baseten
built-in GITHUB_TOKEN
Bun.$
Catppuccin
Cerebras console
ChatGPT Plus or Pro
Cloudflare dashboard
CodeCompanion.nvim
CodeNomad
Configuring Adapters: Environment Variables
Context7 MCP server
Cortecs console
Deep Infra dashboard
DeepSeek console
Duo Agent Platform
Everforest
Fireworks AI console
Firmware dashboard
Ghostty
GitLab CLI agents docs
GitLab docs
GitLab User Settings > Access Tokens
Granular Rules (Object Syntax)
Grep by Vercel
Groq console
Gruvbox
Helicone
Helicone documentation
Helicone Header Directory
Helicone's Model Directory
Hugging Face Inference Providers
Hugging Face settings
install WSL
IO.NET console
JetBrains IDE
Kanagawa
Kitty
MiniMax API Console
Models.dev
Moonshot AI console
Nebius Token Factory console
Nord
OAuth
Ollama integration docs
OpenAI's Data Policies
OpenChamber
Sutradhar
Sutradhar config
Sutradhar Config
Sutradhar TUI with the sutradhar theme
Sutradhar Web - Active Session
Sutradhar Web - New Session
Sutradhar Web - See Servers
Sutradhar Zen
Sutradhar-Obsidian
OpenRouter dashboard
OpenWork
OVHcloud panel
Pro+ subscription
SAP BTP Cockpit
Scaleway Console IAM settings
Scaleway Generative APIs
SDK documentation
Sentry MCP server
shell API
Together AI console
Tokyonight
Unified Billing
Venice AI console
Vercel dashboard
WezTerm
Windows Subsystem for Linux (WSL)
WSL
WSL (Windows Subsystem for Linux)
WSL extension
xAI console
Z.AI API console
Zed
ZenMux dashboard
Zod
```

## Acronyms and initialisms

```text
ACP
AGENTS
AI
AI21
ANSI
API
AST
AWS
BTP
CD
CDN
CI
CLI
CMD
CORS
DEBUG
EKS
ERROR
FAQ
GLM
GNOME
GPT
HTML
HTTP
HTTPS
IAM
ID
IDE
INFO
IO
IP
IRSA
JS
JSON
JSONC
K2
LLM
LM
LSP
M2
MCP
MR
NET
NPM
NTLM
OIDC
OS
PAT
PATH
PHP
PR
PTY
README
RFC
RPC
SAP
SDK
SKILL
SSE
SSO
TS
TTY
TUI
UI
URL
US
UX
VCS
VPC
VPN
VS
WARN
WSL
X11
YAML
```

## Code identifiers used in prose (CamelCase, mixedCase)

```text
apiKey
AppleScript
AssistantMessage
baseURL
BurntSushi
ChatGPT
ClangFormat
CodeCompanion
CodeNomad
DeepSeek
DefaultV2
FileContent
FileDiff
FileNode
fineGrained
FormatterStatus
GitHub
GitLab
iTerm2
JavaScript
JetBrains
macOS
mDNS
MiniMax
NeuralNomadsAI
NickvanDyke
NoeFabris
OpenAI
OpenAPI
OpenChamber
Sutradhar
OpenRouter
OpenTUI
OpenWork
ownUserPermissions
PowerShell
ProviderAuthAuthorization
ProviderAuthMethod
ProviderInitError
SessionStatus
TabItem
tokenType
ToolIDs
ToolList
TypeScript
typesUrl
UserMessage
VcsInfo
WebView2
WezTerm
xAI
ZenMux
```

## Sutradhar CLI commands (as shown in docs)

```text
sutradhar
sutradhar [project]
sutradhar /path/to/project
sutradhar acp
sutradhar agent [command]
sutradhar agent create
sutradhar agent list
sutradhar attach [url]
sutradhar attach http://10.20.30.40:4096
sutradhar attach http://localhost:4096
sutradhar auth [command]
sutradhar auth list
sutradhar auth login
sutradhar auth logout
sutradhar auth ls
sutradhar export [sessionID]
sutradhar github [command]
sutradhar github install
sutradhar github run
sutradhar import <file>
sutradhar import https://opncd.ai/s/abc123
sutradhar import session.json
sutradhar mcp [command]
sutradhar mcp add
sutradhar mcp auth [name]
sutradhar mcp auth list
sutradhar mcp auth ls
sutradhar mcp auth my-oauth-server
sutradhar mcp auth sentry
sutradhar mcp debug <name>
sutradhar mcp debug my-oauth-server
sutradhar mcp list
sutradhar mcp logout [name]
sutradhar mcp logout my-oauth-server
sutradhar mcp ls
sutradhar models --refresh
sutradhar models [provider]
sutradhar models anthropic
sutradhar run [message..]
sutradhar run Explain the use of context in Go
sutradhar serve
sutradhar serve --cors http://localhost:5173 --cors https://app.example.com
sutradhar serve --hostname 0.0.0.0 --port 4096
sutradhar serve [--port <number>] [--hostname <string>] [--cors <origin>]
sutradhar session [command]
sutradhar session list
sutradhar session delete <sessionID>
sutradhar stats
sutradhar uninstall
sutradhar upgrade
sutradhar upgrade [target]
sutradhar upgrade v0.1.48
sutradhar web
sutradhar web --cors https://example.com
sutradhar web --hostname 0.0.0.0
sutradhar web --mdns
sutradhar web --mdns --mdns-domain myproject.local
sutradhar web --port 4096
sutradhar web --port 4096 --hostname 0.0.0.0
sutradhar.server.close()
```

## Slash commands and routes

```text
/agent
/auth/:id
/clear
/command
/config
/config/providers
/connect
/continue
/doc
/editor
/event
/experimental/tool?provider=<p>&model=<m>
/experimental/tool/ids
/export
/file?path=<path>
/file/content?path=<p>
/file/status
/find?pattern=<pat>
/find/file
/find/file?query=<q>
/find/symbol?query=<q>
/formatter
/global/event
/global/health
/help
/init
/instance/dispose
/log
/lsp
/mcp
/mnt/
/mnt/c/
/mnt/d/
/models
/oc
/sutradhar
/path
/project
/project/current
/provider
/provider/{id}/oauth/authorize
/provider/{id}/oauth/callback
/provider/auth
/q
/quit
/redo
/resume
/session
/session/:id
/session/:id/abort
/session/:id/children
/session/:id/command
/session/:id/diff
/session/:id/fork
/session/:id/init
/session/:id/message
/session/:id/message/:messageID
/session/:id/permissions/:permissionID
/session/:id/prompt_async
/session/:id/revert
/session/:id/share
/session/:id/shell
/session/:id/summarize
/session/:id/todo
/session/:id/unrevert
/session/status
/share
/summarize
/theme
/tui
/tui/append-prompt
/tui/clear-prompt
/tui/control/next
/tui/control/response
/tui/execute-command
/tui/open-help
/tui/open-models
/tui/open-sessions
/tui/open-themes
/tui/show-toast
/tui/submit-prompt
/undo
/Users/username
/Users/username/projects/*
/vcs
```

## CLI flags and short options

```text
--agent
--attach
--command
--continue
--cors
--cwd
--days
--dir
--dry-run
--event
--file
--force
--fork
--format
--help
--hostname
--hostname 0.0.0.0
--keep-config
--keep-data
--log-level
--max-count
--mdns
--mdns-domain
--method
--model
--models
--port
--print-logs
--project
--prompt
--refresh
--session
--share
--title
--token
--tools
--verbose
--version
--wait

-c
-d
-f
-h
-m
-n
-s
-v
```

## Environment variables

```text
AI_API_URL
AI_FLOW_CONTEXT
AI_FLOW_EVENT
AI_FLOW_INPUT
AICORE_DEPLOYMENT_ID
AICORE_RESOURCE_GROUP
AICORE_SERVICE_KEY
ANTHROPIC_API_KEY
AWS_ACCESS_KEY_ID
AWS_BEARER_TOKEN_BEDROCK
AWS_PROFILE
AWS_REGION
AWS_ROLE_ARN
AWS_SECRET_ACCESS_KEY
AWS_WEB_IDENTITY_TOKEN_FILE
AZURE_COGNITIVE_SERVICES_RESOURCE_NAME
AZURE_RESOURCE_NAME
CI_PROJECT_DIR
CI_SERVER_FQDN
CI_WORKLOAD_REF
CLOUDFLARE_ACCOUNT_ID
CLOUDFLARE_API_TOKEN
CLOUDFLARE_GATEWAY_ID
CONTEXT7_API_KEY
GITHUB_TOKEN
GITLAB_AI_GATEWAY_URL
GITLAB_HOST
GITLAB_INSTANCE_URL
GITLAB_OAUTH_CLIENT_ID
GITLAB_TOKEN
GITLAB_TOKEN_SUTRADHAR
GOOGLE_APPLICATION_CREDENTIALS
GOOGLE_CLOUD_PROJECT
HTTP_PROXY
HTTPS_PROXY
K2_
MY_API_KEY
MY_ENV_VAR
MY_MCP_CLIENT_ID
MY_MCP_CLIENT_SECRET
NO_PROXY
NODE_ENV
NODE_EXTRA_CA_CERTS
NPM_AUTH_TOKEN
OC_ALLOW_WAYLAND
SUTRADHAR_API_KEY
SUTRADHAR_AUTH_JSON
SUTRADHAR_AUTO_SHARE
SUTRADHAR_CLIENT
SUTRADHAR_CONFIG
SUTRADHAR_CONFIG_CONTENT
SUTRADHAR_CONFIG_DIR
SUTRADHAR_DISABLE_AUTOCOMPACT
SUTRADHAR_DISABLE_AUTOUPDATE
SUTRADHAR_DISABLE_CLAUDE_CODE
SUTRADHAR_DISABLE_CLAUDE_CODE_PROMPT
SUTRADHAR_DISABLE_CLAUDE_CODE_SKILLS
SUTRADHAR_DISABLE_DEFAULT_PLUGINS
SUTRADHAR_DISABLE_LSP_DOWNLOAD
SUTRADHAR_DISABLE_MODELS_FETCH
SUTRADHAR_DISABLE_PRUNE
SUTRADHAR_DISABLE_TERMINAL_TITLE
SUTRADHAR_ENABLE_EXA
SUTRADHAR_ENABLE_EXPERIMENTAL_MODELS
SUTRADHAR_EXPERIMENTAL
SUTRADHAR_EXPERIMENTAL_BASH_DEFAULT_TIMEOUT_MS
SUTRADHAR_EXPERIMENTAL_DISABLE_COPY_ON_SELECT
SUTRADHAR_EXPERIMENTAL_DISABLE_FILEWATCHER
SUTRADHAR_EXPERIMENTAL_EXA
SUTRADHAR_EXPERIMENTAL_FILEWATCHER
SUTRADHAR_EXPERIMENTAL_ICON_DISCOVERY
SUTRADHAR_EXPERIMENTAL_LSP_TOOL
SUTRADHAR_EXPERIMENTAL_LSP_TY
SUTRADHAR_EXPERIMENTAL_MARKDOWN
SUTRADHAR_EXPERIMENTAL_OUTPUT_TOKEN_MAX
SUTRADHAR_EXPERIMENTAL_OXFMT
SUTRADHAR_EXPERIMENTAL_PLAN_MODE
SUTRADHAR_ENABLE_QUESTION_TOOL
SUTRADHAR_FAKE_VCS
SUTRADHAR_GIT_BASH_PATH
SUTRADHAR_MODEL
SUTRADHAR_MODELS_URL
SUTRADHAR_PERMISSION
SUTRADHAR_PORT
SUTRADHAR_SERVER_PASSWORD
SUTRADHAR_SERVER_USERNAME
PROJECT_ROOT
RESOURCE_NAME
RUST_LOG
VARIABLE_NAME
VERTEX_LOCATION
XDG_CONFIG_HOME
```

## Package/module identifiers

```text
../../../config.mjs
@astrojs/starlight/components
@sutradhar/plugin
@sutradhar/sdk
path
shescape
zod

@
@ai-sdk/anthropic
@ai-sdk/cerebras
@ai-sdk/google
@ai-sdk/openai
@ai-sdk/openai-compatible
@File#L37-42
@modelcontextprotocol/server-everything
@sutradhar
```

## GitHub owner/repo slugs referenced in docs

```text
24601/sutradhar-zellij-namer
angristan/sutradhar-wakatime
anomalyco/sutradhar
apps/sutradhar-agent
athal7/sutradhar-devcontainers
awesome-sutradhar/awesome-sutradhar
backnotprop/plannotator
ben-vargas/ai-sdk-provider-sutradhar-sdk
btriapitsyn/openchamber
BurntSushi/ripgrep
Cluster444/agentic
code-yeongyu/oh-my-sutradhar
darrenhinde/sutradhar-agents
different-ai/sutradhar-scheduler
different-ai/openwork
features/copilot
folke/tokyonight.nvim
franlol/sutradhar-md-table-formatter
ggml-org/llama.cpp
ghoulr/sutradhar-websearch-cited.git
H2Shami/sutradhar-helicone-session
hosenur/portal
jamesmurdza/daytona
jenslys/sutradhar-gemini-auth
JRedeker/sutradhar-morph-fast-apply
JRedeker/sutradhar-shell-strategy
kdcokenny/ocx
kdcokenny/sutradhar-background-agents
kdcokenny/sutradhar-notify
kdcokenny/sutradhar-workspace
kdcokenny/sutradhar-worktree
login/device
mohak34/sutradhar-notifier
morhetz/gruvbox
mtymek/sutradhar-obsidian
NeuralNomadsAI/CodeNomad
nick-vi/sutradhar-type-inject
NickvanDyke/sutradhar.nvim
NoeFabris/sutradhar-antigravity-auth
nordtheme/nord
numman-ali/sutradhar-openai-codex-auth
olimorris/codecompanion.nvim
panta82/sutradhar-notificator
rebelot/kanagawa.nvim
remorses/kimaki
sainnhe/everforest
shekohex/sutradhar-google-antigravity-auth
shekohex/sutradhar-pty.git
spoons-and-mirrors/subtask2
sudo-tee/sutradhar.nvim
supermemoryai/sutradhar-supermemory
Tarquinen/sutradhar-dynamic-context-pruning
Th3Whit3Wolf/one-nvim
upstash/context7
vtemian/micode
vtemian/octto
yetone/avante.nvim
zenobi-us/sutradhar-plugin-template
zenobi-us/sutradhar-skillful
```

## Paths, filenames, globs, and URLs

```text
./.sutradhar/themes/*.json
./<project-slug>/storage/
./config/#custom-directory
./global/storage/
.agents/skills/*/SKILL.md
.agents/skills/<name>/SKILL.md
.clang-format
.claude
.claude/skills
.claude/skills/*/SKILL.md
.claude/skills/<name>/SKILL.md
.env
.github/workflows/sutradhar.yml
.gitignore
.gitlab-ci.yml
.ignore
.NET SDK
.npmrc
.ocamlformat
.sutradhar
.sutradhar/
.sutradhar/agents/
.sutradhar/commands/
.sutradhar/commands/test.md
.sutradhar/modes/
.sutradhar/plans/*.md
.sutradhar/plugins/
.sutradhar/skills/<name>/SKILL.md
.sutradhar/skills/git-release/SKILL.md
.sutradhar/tools/
.well-known/sutradhar
{ type: "raw" \| "patch", content: string }
{file:path/to/file}
**/*.js
%USERPROFILE%/intelephense/license.txt
%USERPROFILE%\.cache\sutradhar
%USERPROFILE%\.config\sutradhar\sutradhar.jsonc
%USERPROFILE%\.config\sutradhar\plugins
%USERPROFILE%\.local\share\sutradhar
%USERPROFILE%\.local\share\sutradhar\log
<project-root>/.sutradhar/themes/*.json
<providerId>/<modelId>
<your-project>/.sutradhar/plugins/
~
~/...
~/.agents/skills/*/SKILL.md
~/.agents/skills/<name>/SKILL.md
~/.aws/credentials
~/.bashrc
~/.cache/sutradhar
~/.cache/sutradhar/node_modules/
~/.claude/CLAUDE.md
~/.claude/skills/
~/.claude/skills/*/SKILL.md
~/.claude/skills/<name>/SKILL.md
~/.config/sutradhar
~/.config/sutradhar/AGENTS.md
~/.config/sutradhar/agents/
~/.config/sutradhar/commands/
~/.config/sutradhar/modes/
~/.config/sutradhar/sutradhar.json
~/.config/sutradhar/sutradhar.jsonc
~/.config/sutradhar/plugins/
~/.config/sutradhar/skills/*/SKILL.md
~/.config/sutradhar/skills/<name>/SKILL.md
~/.config/sutradhar/themes/*.json
~/.config/sutradhar/tools/
~/.config/zed/settings.json
~/.local/share
~/.local/share/sutradhar/
~/.local/share/sutradhar/auth.json
~/.local/share/sutradhar/log/
~/.local/share/sutradhar/mcp-auth.json
~/.local/share/sutradhar/sutradhar.jsonc
~/.npmrc
~/.zshrc
~/code/
~/Library/Application Support
~/projects/*
~/projects/personal/
${config.github}/blob/dev/packages/sdk/js/src/gen/types.gen.ts
$HOME/intelephense/license.txt
$HOME/projects/*
$XDG_CONFIG_HOME/sutradhar/themes/*.json
agent/
agents/
build/
commands/
dist/
http://<wsl-ip>:4096
http://127.0.0.1:8080/callback
http://localhost:<port>
http://localhost:4096
http://localhost:4096/doc
https://app.example.com
https://AZURE_COGNITIVE_SERVICES_RESOURCE_NAME.cognitiveservices.azure.com/
https://sutradhar.ai/zen/v1/chat/completions
https://sutradhar.ai/zen/v1/messages
https://sutradhar.ai/zen/v1/models/gemini-3-flash
https://sutradhar.ai/zen/v1/models/gemini-3-pro
https://sutradhar.ai/zen/v1/responses
https://RESOURCE_NAME.openai.azure.com/
laravel/pint
log/
model: "anthropic/claude-sonnet-4-5"
modes/
node_modules/
openai/gpt-4.1
sutradhar.ai/config.json
sutradhar/<model-id>
sutradhar/gpt-5.1-codex
sutradhar/gpt-5.2-codex
sutradhar/kimi-k2
openrouter/google/gemini-2.5-flash
opncd.ai/s/<share-id>
packages/*/AGENTS.md
plugins/
project/
provider_id/model_id
provider/model
provider/model-id
rm -rf ~/.cache/sutradhar
skills/
skills/*/SKILL.md
src/**/*.ts
themes/
tools/
```

## Keybind strings

```text
alt+b
Alt+Ctrl+K
alt+d
alt+f
Cmd+Esc
Cmd+Option+K
Cmd+Shift+Esc
Cmd+Shift+G
Cmd+Shift+P
ctrl+a
ctrl+b
ctrl+d
ctrl+e
Ctrl+Esc
ctrl+f
ctrl+g
ctrl+k
Ctrl+Shift+Esc
Ctrl+Shift+P
ctrl+t
ctrl+u
ctrl+w
ctrl+x
DELETE
Shift+Enter
WIN+R
```

## Model ID strings referenced

```text
{env:SUTRADHAR_MODEL}
anthropic/claude-3-5-sonnet-20241022
anthropic/claude-haiku-4-20250514
anthropic/claude-haiku-4-5
anthropic/claude-sonnet-4-20250514
anthropic/claude-sonnet-4-5
gitlab/duo-chat-haiku-4-5
lmstudio/google/gemma-3n-e4b
openai/gpt-4.1
openai/gpt-5
sutradhar/gpt-5.1-codex
sutradhar/gpt-5.2-codex
sutradhar/kimi-k2
openrouter/google/gemini-2.5-flash
```
