export * as File from "./file"

import { Revert } from "@sutradhar/schema/revert"

export const Diff = Revert.FileDiff
export type Diff = typeof Diff.Type
