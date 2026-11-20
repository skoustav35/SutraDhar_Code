import type { Session } from "@sutradhar/sdk/v2/client"
import type { Accessor } from "solid-js"
import type { useLanguage } from "@/context/language"
import type { ServerConnection } from "@/context/server"

export type SidebarWorkspace = {
  directory: string
  name: string
  main: boolean
  sessions: Session[]
}

export type SidebarProject = {
  id: string
  name: string
  root: string
  git: boolean
  workspaces: SidebarWorkspace[]
}

export type WorkspaceSidebarController = {
  language: ReturnType<typeof useLanguage>
  open: Accessor<boolean>
  toggle: () => void
  servers: Accessor<{ key: ServerConnection.Key; name: string }[]>
  selectedServer: Accessor<ServerConnection.Key | undefined>
  selectServer: (key: ServerConnection.Key) => void
  projects: Accessor<SidebarProject[]>
  loading: Accessor<boolean>
  failed: Accessor<boolean>
  refresh: () => void
  currentSession: Accessor<string | undefined>
  currentDirectory: Accessor<string | undefined>
  currentServer: Accessor<ServerConnection.Key | undefined>
  collapsed: (directory: string) => boolean
  toggleCollapsed: (directory: string) => void
  pending: (key: string) => boolean
  openProject: () => void
  createWorkspace: (root: string, name: string) => Promise<boolean>
  newChat: (directory: string) => Promise<boolean>
  openChat: (session: Session) => void
  renameChat: (session: Session, title: string) => Promise<boolean>
  deleteChat: (session: Session) => Promise<boolean>
  archiveChat: (session: Session) => Promise<boolean>
  settings: () => void
  search: () => void
}
