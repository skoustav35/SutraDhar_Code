import { Config } from "effect"

export function truthy(key: string) {
  const value = process.env[key]?.toLowerCase()
  return value === "true" || value === "1"
}

const copy = process.env["SUTRADHAR_EXPERIMENTAL_DISABLE_COPY_ON_SELECT"]
const fff = process.env["SUTRADHAR_DISABLE_FFF"]

function enabledByExperimental(key: string) {
  return process.env[key] === undefined ? truthy("SUTRADHAR_EXPERIMENTAL") : truthy(key)
}

export const Flag = {
  OTEL_EXPORTER_OTLP_ENDPOINT: process.env["OTEL_EXPORTER_OTLP_ENDPOINT"],
  OTEL_EXPORTER_OTLP_HEADERS: process.env["OTEL_EXPORTER_OTLP_HEADERS"],

  SUTRADHAR_AUTO_HEAP_SNAPSHOT: truthy("SUTRADHAR_AUTO_HEAP_SNAPSHOT"),
  SUTRADHAR_GIT_BASH_PATH: process.env["SUTRADHAR_GIT_BASH_PATH"],
  SUTRADHAR_CONFIG: process.env["SUTRADHAR_CONFIG"],
  SUTRADHAR_CONFIG_CONTENT: process.env["SUTRADHAR_CONFIG_CONTENT"],
  SUTRADHAR_DISABLE_AUTOUPDATE: truthy("SUTRADHAR_DISABLE_AUTOUPDATE"),
  SUTRADHAR_ALWAYS_NOTIFY_UPDATE: truthy("SUTRADHAR_ALWAYS_NOTIFY_UPDATE"),
  SUTRADHAR_DISABLE_PRUNE: truthy("SUTRADHAR_DISABLE_PRUNE"),
  SUTRADHAR_DISABLE_TERMINAL_TITLE: truthy("SUTRADHAR_DISABLE_TERMINAL_TITLE"),
  SUTRADHAR_SHOW_TTFD: truthy("SUTRADHAR_SHOW_TTFD"),
  SUTRADHAR_DISABLE_AUTOCOMPACT: truthy("SUTRADHAR_DISABLE_AUTOCOMPACT"),
  SUTRADHAR_DISABLE_MODELS_FETCH: truthy("SUTRADHAR_DISABLE_MODELS_FETCH"),
  SUTRADHAR_DISABLE_MOUSE: truthy("SUTRADHAR_DISABLE_MOUSE"),
  SUTRADHAR_FAKE_VCS: process.env["SUTRADHAR_FAKE_VCS"],
  SUTRADHAR_SERVER_PASSWORD: process.env["SUTRADHAR_SERVER_PASSWORD"],
  SUTRADHAR_SERVER_USERNAME: process.env["SUTRADHAR_SERVER_USERNAME"],
  SUTRADHAR_DISABLE_FFF: fff === undefined ? process.platform === "win32" : truthy("SUTRADHAR_DISABLE_FFF"),

  // Experimental
  SUTRADHAR_EXPERIMENTAL_FILEWATCHER: Config.boolean("SUTRADHAR_EXPERIMENTAL_FILEWATCHER").pipe(
    Config.withDefault(false),
  ),
  SUTRADHAR_EXPERIMENTAL_DISABLE_FILEWATCHER: Config.boolean("SUTRADHAR_EXPERIMENTAL_DISABLE_FILEWATCHER").pipe(
    Config.withDefault(false),
  ),
  SUTRADHAR_EXPERIMENTAL_DISABLE_COPY_ON_SELECT:
    copy === undefined ? process.platform === "win32" : truthy("SUTRADHAR_EXPERIMENTAL_DISABLE_COPY_ON_SELECT"),
  SUTRADHAR_MODELS_URL: process.env["SUTRADHAR_MODELS_URL"],
  SUTRADHAR_MODELS_PATH: process.env["SUTRADHAR_MODELS_PATH"],
  SUTRADHAR_DB: process.env["SUTRADHAR_DB"],

  SUTRADHAR_WORKSPACE_ID: process.env["SUTRADHAR_WORKSPACE_ID"],
  SUTRADHAR_EXPERIMENTAL_WORKSPACES: enabledByExperimental("SUTRADHAR_EXPERIMENTAL_WORKSPACES"),

  // Evaluated at access time (not module load) because tests, the CLI, and
  // external tooling set these env vars at runtime.
  get SUTRADHAR_DISABLE_PROJECT_CONFIG() {
    return truthy("SUTRADHAR_DISABLE_PROJECT_CONFIG")
  },
  get SUTRADHAR_EXPERIMENTAL_REFERENCES() {
    return enabledByExperimental("SUTRADHAR_EXPERIMENTAL_REFERENCES")
  },
  get SUTRADHAR_TUI_CONFIG() {
    return process.env["SUTRADHAR_TUI_CONFIG"]
  },
  get SUTRADHAR_CONFIG_DIR() {
    return process.env["SUTRADHAR_CONFIG_DIR"]
  },
  get SUTRADHAR_PURE() {
    return truthy("SUTRADHAR_PURE")
  },
  get SUTRADHAR_PERMISSION() {
    return process.env["SUTRADHAR_PERMISSION"]
  },
  get SUTRADHAR_PLUGIN_META_FILE() {
    return process.env["SUTRADHAR_PLUGIN_META_FILE"]
  },
  get SUTRADHAR_CLIENT() {
    return process.env["SUTRADHAR_CLIENT"] ?? "cli"
  },
}
