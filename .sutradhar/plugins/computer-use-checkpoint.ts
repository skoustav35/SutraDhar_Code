import { tool } from "@sutradhar/plugin"

export default async function computerUseCheckpoint() {
  return {
    id: "computer-use-checkpoint",
    tool: {
      computer_use_checkpoint: tool({
        description:
          "Create an approval-first checkpoint before a browser or desktop action. This does not control the computer by itself.",
        args: {
          goal: tool.schema.string().describe("The user-visible goal"),
          target: tool.schema.string().describe("The application, page, or semantic target"),
          action: tool.schema.string().describe("The single next action to consider"),
          sensitive: tool.schema
            .boolean()
            .default(false)
            .describe("Whether the action could expose or change sensitive data"),
        },
        async execute(args, context) {
          await context.ask({
            permission: "computer_use",
            patterns: [args.target],
            always: [],
            metadata: { goal: args.goal, action: args.action, sensitive: args.sensitive },
          })

          return {
            title: "Computer-use checkpoint",
            output: [
              "Checkpoint approved for one next action.",
              `Goal: ${args.goal}`,
              `Target: ${args.target}`,
              `Next action: ${args.action}`,
              "Observe the resulting state before taking another action.",
              ...(args.sensitive
                ? [
                    "Sensitive action: keep the user in control and stop for credentials, consent, payment, or destruction.",
                  ]
                : []),
            ].join("\n"),
            metadata: { sessionID: context.sessionID, agent: context.agent, sensitive: args.sensitive },
          }
        },
      }),
    },
  }
}
