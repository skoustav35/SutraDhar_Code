// @ts-nocheck

import { Sutradhar } from "@sutradhar/core"
import { ReadTool } from "@sutradhar/core/tools"

const sutradhar = Sutradhar.make({})

sutradhar.tool.add(ReadTool)

sutradhar.tool.add({
  name: "bash",
  schema: {
    type: "object",
    properties: {
      command: {
        type: "string",
        description: "The command to run.",
      },
    },
    required: ["command"],
  },
  execute(input, ctx) {},
})

sutradhar.auth.add({
  provider: "openai",
  type: "api",
  value: process.env.OPENAI_API_KEY,
})

sutradhar.agent.add({
  name: "build",
  permissions: [],
  model: {
    id: "gpt-5-5",
    provider: "openai",
    variant: "xhigh",
  },
})

const sessionID = await sutradhar.session.create({
  agent: "build",
})

sutradhar.subscribe((event) => {
  console.log(event)
})

await sutradhar.session.prompt({
  sessionID,
  text: "hey what is up",
})

await sutradhar.session.prompt({
  sessionID,
  text: "what is up with this",
  files: [
    {
      mime: "image/png",
      uri: "data:image/png;base64,xxxx",
    },
  ],
})

await sutradhar.session.wait()

console.log(await sutradhar.session.messages(sessionID))
