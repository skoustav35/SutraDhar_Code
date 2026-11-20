import { Show } from "solid-js"
import { ScrollView } from "@sutradhar/ui/scroll-view"
import { ChatBrainstormHome } from "@/components/chat-mode/chat-brainstorm-view"
import { useLayout } from "@/context/layout"
import { createHomeController } from "./home/home-controller"
import { createHomeProjectsController } from "./home/home-projects-controller"
import { HomeUtilityNav } from "./home/home-projects-view"
import { createHomeScrollController } from "./home/home-scroll-controller"
import { createHomeSessionSearchController } from "./home/home-session-search-controller"
import { createHomeSessionsController } from "./home/home-sessions-controller"
import { HomeSessions } from "./home/home-sessions"

/** Matches the rounded content plane the session route uses, so routes agree. */
const CONTENT_PLANE =
  "rounded-[18px] border border-v2-border-border-base bg-v2-background-bg-base shadow-[var(--v2-elevation-raised)]"

export function NewHome() {
  const layout = useLayout()
  const home = createHomeController()
  const projects = createHomeProjectsController(home)
  const sessions = createHomeSessionsController(home)
  const search = createHomeSessionSearchController(home, sessions)
  const scroll = createHomeScrollController(sessions.data.groups)
  return (
    <Show when={!layout.appMode.isChat()} fallback={<ChatBrainstormHome />}>
      <div data-slot="home-content-frame" class="m-3 md:my-4 md:me-5 md:ms-3.5 min-h-0 flex-1 self-stretch">
        <div data-slot="session-panel-frame" class={`flex h-full min-h-0 flex-col overflow-hidden lg:flex-row ${CONTENT_PLANE}`}>
          <div class="min-h-0 min-w-0 flex-1 flex flex-col">
            <ScrollView
              class="h-full [container-type:size]"
              thumbContainer={scroll.viewport.thumbTrack}
              thumbHoverTarget={scroll.viewport.hoverTarget}
              viewportRef={scroll.viewport.setViewport}
              onScroll={(event) => scroll.viewport.update(event.currentTarget.scrollTop)}
              onWheel={scroll.viewport.containOuterWheel}
            >
              <div
                class={`
                mx-auto flex min-h-full w-full max-w-[860px] flex-col gap-6 px-6
                lg:px-10 lg:pt-6
              `}
              >
                <HomeSessions sessions={sessions} search={search} scroll={scroll} />
                <HomeUtilityNav
                  class="flex lg:hidden"
                  onOpenSettings={projects.utility.settings}
                  onOpenHelp={projects.utility.help}
                  language={projects.copy.language}
                />
              </div>
            </ScrollView>
          </div>
        </div>
      </div>
    </Show>
  )
}
