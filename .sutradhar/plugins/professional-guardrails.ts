import { tool } from "@sutradhar/plugin"

const redact = (value: unknown) => {
  if (typeof value !== "string") return value
  return value
    .replace(/(api[_-]?key|token|password|secret|authorization)\s*[:=]\s*[^\s,;]+/gi, "$1=[REDACTED]")
    .replace(/Bearer\s+[A-Za-z0-9._~+\/-]+=*/gi, "Bearer [REDACTED]")
}

const redactString = (value: string) => String(redact(value))

function scrub(value: unknown): unknown {
  if (typeof value === "string") return redact(value)
  if (Array.isArray(value)) return value.map(scrub)
  if (!value || typeof value !== "object") return value
  return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, scrub(item)]))
}

export default async function professionalGuardrails() {
  return {
    id: "professional-guardrails",
    "tool.execute.before": async (
      input: { tool: string; sessionID: string; callID: string },
      output: { args: unknown },
    ) => {
      output.args = scrub(output.args)
    },
    "tool.execute.after": async (
      _input: {
        tool: string
        sessionID: string
        callID: string
        args: unknown
      },
      output: { title: string; output: string; metadata: unknown },
    ) => {
      output.output = redactString(output.output)
    },
    tool: {
      summarize_action: tool({
        description: "Create a concise, redacted audit summary for the current tool action.",
        args: {
          action: tool.schema.string().describe("The action that occurred"),
          result: tool.schema.string().describe("The observed result"),
        },
        async execute(args) {
          return `Action: ${redactString(args.action)}\nResult: ${redactString(args.result)}`
        },
      }),
    },
  }
}
