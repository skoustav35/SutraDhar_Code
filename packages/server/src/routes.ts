import { Database } from "@sutradhar/core/database/database"
import { LayerNode } from "@sutradhar/core/effect/layer-node"
import { httpClient } from "@sutradhar/core/effect/app-node-platform"
import { AppNodeBuilder } from "@sutradhar/core/effect/app-node-builder"
import { EventV2 } from "@sutradhar/core/event"
import { Credential } from "@sutradhar/core/credential"
import { PermissionSaved } from "@sutradhar/core/permission/saved"
import { PtyTicket } from "@sutradhar/core/pty/ticket"
import { SessionV2 } from "@sutradhar/core/session"
import { SessionExecution } from "@sutradhar/core/session/execution"
import { LocationServiceMap } from "@sutradhar/core/location-service-map"
import { SessionExecutionLocal } from "@sutradhar/core/session/execution/local"
import { ToolOutputStore } from "@sutradhar/core/tool-output-store"
import { HttpRouter, HttpServer } from "effect/unstable/http"
import { HttpApiBuilder } from "effect/unstable/httpapi"
import { Layer, Option } from "effect"
import { Api } from "./api"
import { ServerAuth } from "./auth"
import { handlers } from "./handlers"
import { authorizationLayer } from "./middleware/authorization"
import { schemaErrorLayer } from "./middleware/schema-error"
import { PtyEnvironment } from "./pty-environment"
import { layer as locationLayer } from "./location"
import { sessionLocationLayer } from "./middleware/session-location"
import { compatRoutes } from "./compat-routes"

const applicationServices = LayerNode.group([
  Database.node,
  EventV2.node,
  httpClient,
  ToolOutputStore.cleanupNode,
  SessionV2.node,
  PermissionSaved.node,
  PtyTicket.node,
  Credential.node,
  PtyEnvironment.node,
  LocationServiceMap.node,
])

export function createRoutes(password?: string) {
  return makeRoutes(
    password
      ? ServerAuth.Config.configLayer({ username: "sutradhar", password: Option.some(password) })
      : ServerAuth.Config.layer,
  )
}

export function createEmbeddedRoutes() {
  return makeRoutes(ServerAuth.Config.configLayer({ username: "sutradhar", password: Option.none() }))
}

function makeRoutes<AuthError, AuthServices>(auth: Layer.Layer<ServerAuth.Config, AuthError, AuthServices>) {
  const serviceLayer = AppNodeBuilder.build(applicationServices, [[SessionExecution.node, SessionExecutionLocal.node]])

  return Layer.mergeAll(HttpApiBuilder.layer(Api, { openapiPath: "/openapi.json" }), compatRoutes).pipe(
    Layer.provide(handlers),
    Layer.provide(sessionLocationLayer),
    Layer.provide(locationLayer),
    Layer.provide(authorizationLayer),
    Layer.provide(schemaErrorLayer),
    Layer.provide(auth),
    Layer.provide(serviceLayer),
  )
}

export const routes = createRoutes()

export const webHandler = () =>
  HttpRouter.toWebHandler(routes.pipe(Layer.provide(HttpServer.layerServices)), { disableLogger: true })
