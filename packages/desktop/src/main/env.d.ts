interface ImportMetaEnv {
  readonly SUTRADHAR_CHANNEL: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

declare module "virtual:sutradhar-server" {
  export namespace Server {
    export const listen: typeof import("../../../sutradhar/dist/types/src/node").Server.listen
    export type Listener = import("../../../sutradhar/dist/types/src/node").Server.Listener
  }
  export namespace Config {
    export const get: typeof import("../../../sutradhar/dist/types/src/node").Config.get
    export type Info = import("../../../sutradhar/dist/types/src/node").Config.Info
  }
  export const bootstrap: typeof import("../../../sutradhar/dist/types/src/node").bootstrap
}
