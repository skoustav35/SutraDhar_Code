import { Context } from "effect"
import type { InstanceContext } from "@/project/instance-context"
import type { WorkspaceV2 } from "@sutradhar/core/workspace"

export const InstanceRef = Context.Reference<InstanceContext | undefined>("~sutradhar/InstanceRef", {
  defaultValue: () => undefined,
})

export const WorkspaceRef = Context.Reference<WorkspaceV2.ID | undefined>("~sutradhar/WorkspaceRef", {
  defaultValue: () => undefined,
})
