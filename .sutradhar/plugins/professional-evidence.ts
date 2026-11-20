import { tool } from "@sutradhar/plugin"

export default async function professionalEvidence() {
  return {
    id: "professional-evidence",
    tool: {
      verification_report: tool({
        description:
          "Turn verification claims into a concise evidence report. Use this before declaring a coding task complete.",
        args: {
          claims: tool.schema.array(tool.schema.string()).describe("Claims that need proof"),
          checks: tool.schema
            .array(
              tool.schema.object({
                claim: tool.schema.string(),
                command: tool.schema.string(),
                result: tool.schema.string(),
              }),
            )
            .describe("Checks that were actually run"),
          gaps: tool.schema.array(tool.schema.string()).default([]).describe("Claims that remain unverified"),
        },
        async execute(args) {
          const checks = args.checks
            .map((check) => `- ${check.claim}\n  - Command: \`${check.command}\`\n  - Result: ${check.result}`)
            .join("\n")
          const gaps = args.gaps.length ? args.gaps.map((gap) => `- ${gap}`).join("\n") : "- None reported"
          return [
            "## Verification report",
            "",
            "### Claims",
            ...args.claims.map((claim) => `- ${claim}`),
            "",
            "### Evidence",
            checks || "- No checks supplied",
            "",
            "### Gaps",
            gaps,
          ].join("\n")
        },
      }),
    },
  }
}
