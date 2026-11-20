import { $ } from "bun"
import { downloadCliToResources } from "./utils"

await $`bun run install-electron`

await $`bun ./scripts/copy-icons.ts ${process.env.SUTRADHAR_CHANNEL ?? "dev"}`

await $`cd ../sutradhar && bun script/build-node.ts`
await downloadCliToResources()
