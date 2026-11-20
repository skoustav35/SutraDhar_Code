import { createPromptProjectController } from "@/components/prompt-project-selector"
import { useTitlebarRightMount } from "@/components/titlebar"
import { useLayout } from "@/context/layout"
import { useSettings } from "@/context/settings"
import { Show, createEffect, createResource } from "solid-js"
import { IdeWorkspace } from "./session/ide-workspace"
import { createNewSessionDraftController } from "./new-session/new-session-draft-controller"
import { NewSessionStatus, NewSessionView } from "./new-session/new-session-view"
import { createNewSessionWorkspaceController } from "./new-session/new-session-workspace-controller"
import { useNewSessionCommands } from "./new-session/use-new-session-commands"

/** The draft-only V2 session page. Submitting promotes the draft into a real session. */
export default function NewSessionPage() {
  const layout = useLayout()
  const settings = useSettings()
  const rightMount = useTitlebarRightMount()
  const workspace = createNewSessionWorkspaceController()
  const draft = createNewSessionDraftController({
    worktree: workspace.selection.value,
    resetWorktree: workspace.selection.reset,
  })
  const project = createPromptProjectController({
    controls: draft.project.controls,
    onDone: draft.input.restoreFocus,
  })
  useNewSessionCommands({
    restoreFocus: draft.input.restoreFocus,
    project: {
      empty: project.empty,
      open: () => project.setOpen(true),
    },
  })
  createEffect(() => {
    if (!draft.prompt.ready()) return
    draft.input.restoreFocus()
  })
  const ready = Promise.resolve()
  const [suspendUntilPromptReady] = createResource(
    () => draft.prompt.readyPromise() ?? ready,
    (promise) => promise.then(() => true),
  )
  const pickBrainstorm = (promptText: string) => {
    draft.prompt.setText(promptText)
    draft.input.restoreFocus()
  }

  return (
    <div class="relative size-full overflow-hidden flex flex-col">
      {suspendUntilPromptReady()}
      <NewSessionStatus mount={rightMount} visible={() => settings.visibility.status() && !layout.appMode.isChat()} />
      <Show
        when={!layout.appMode.isIde()}
        fallback={
          <IdeWorkspace
            newLayout={true}
            reviewCount={() => 0}
            diffs={() => []}
            renderDiffs={() => (
              <div class="flex h-full items-center justify-center px-6 text-center text-13-regular text-text-weak">
                No code diffs in this draft yet. Submit a task in the Agents pane to inspect changes.
              </div>
            )}
            agentPane={
              <NewSessionView
                input={draft.input}
                project={project}
                workspace={workspace}
                onPickBrainstorm={pickBrainstorm}
              />
            }
          />
        }
      >
        <div class="flex-1 min-h-0 flex flex-col gap-3.5 p-3 md:py-4 md:pe-5 md:ps-3.5">
          <NewSessionView
            input={draft.input}
            project={project}
            workspace={workspace}
            onPickBrainstorm={pickBrainstorm}
          />
        </div>
      </Show>
    </div>
  )
}
