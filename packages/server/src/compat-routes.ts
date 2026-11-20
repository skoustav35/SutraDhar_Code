import { existsSync } from "node:fs"
import { Database } from "@sutradhar/core/database/database"
import { InstallationVersion } from "@sutradhar/core/installation/version"
import { Location } from "@sutradhar/core/location"
import { LocationServiceMap } from "@sutradhar/core/location-services"
import { ProjectTable } from "@sutradhar/core/project/sql"
import { AbsolutePath } from "@sutradhar/core/schema"
import { WorkspaceV2 } from "@sutradhar/core/workspace"
import { Effect } from "effect"
import { HttpRouter, HttpServerRequest, HttpServerResponse } from "effect/unstable/http"

function safeDirectory(candidate?: string | null) {
  if (!candidate) return process.cwd()
  if (existsSync(candidate)) return candidate
  return process.cwd()
}

function locationFromRequest(request: HttpServerRequest.HttpServerRequest) {
  const url = new URL(request.url, "http://localhost")
  const directory = safeDirectory(url.searchParams.get("location[directory]"))
  const workspaceID = url.searchParams.get("location[workspace]")
  return Location.Ref.make({
    directory: AbsolutePath.make(directory),
    workspaceID: workspaceID ? WorkspaceV2.ID.make(workspaceID) : undefined,
  })
}

const currentLocation = Effect.gen(function* () {
  const location = yield* Location.Service
  return {
    directory: location.directory,
    ...(location.workspaceID ? { workspaceID: location.workspaceID } : {}),
    project: {
      id: location.project.id,
      directory: location.project.directory,
    },
  }
})

// Serves the compat endpoints used by the web/desktop frontend against standalone V2 servers.
export const compatRoutes = HttpRouter.use((router) =>
  Effect.gen(function* () {
    const { db } = yield* Database.Service
    const locations = yield* LocationServiceMap.Service

    yield* router.add("GET", "/api/info", () =>
      Effect.succeed(
        HttpServerResponse.jsonUnsafe({
          pid: process.pid,
          urls: [],
          protocol: "v2",
          version: InstallationVersion,
        }),
      ),
    )

    yield* router.add("GET", "/api/project", () =>
      db
        .select()
        .from(ProjectTable)
        .all()
        .pipe(
          Effect.orDie,
          Effect.map((rows) =>
            HttpServerResponse.jsonUnsafe(
              rows.map((row) => ({
                id: row.id,
                worktree: row.worktree,
                ...(row.vcs === "git" ? { vcs: "git" as const } : {}),
                ...(row.name ? { name: row.name } : {}),
                ...(row.icon_url || row.icon_url_override || row.icon_color
                  ? {
                      icon: {
                        ...(row.icon_url ? { url: row.icon_url } : {}),
                        ...(row.icon_url_override ? { override: row.icon_url_override } : {}),
                        ...(row.icon_color ? { color: row.icon_color } : {}),
                      },
                    }
                  : {}),
                ...(row.commands ? { commands: row.commands } : {}),
                time: {
                  created: row.time_created,
                  updated: row.time_updated,
                  ...(typeof row.time_initialized === "number" ? { initialized: row.time_initialized } : {}),
                },
                sandboxes: row.sandboxes ?? [],
              })),
            ),
          ),
        ),
    )

    yield* router.add("GET", "/api/project/current", (request) =>
      Effect.gen(function* () {
        const location = yield* currentLocation
        return HttpServerResponse.jsonUnsafe({
          id: location.project.id,
          directory: location.project.directory,
        })
      }).pipe(Effect.provide(locations.get(locationFromRequest(request)))),
    )

    yield* router.add("GET", "/api/mcp", (request) =>
      Effect.gen(function* () {
        const location = yield* currentLocation
        return HttpServerResponse.jsonUnsafe({
          location,
          data: [],
        })
      }).pipe(Effect.provide(locations.get(locationFromRequest(request)))),
    )

    yield* router.add("GET", "/api/mcp/resource", (request) =>
      Effect.gen(function* () {
        const location = yield* currentLocation
        return HttpServerResponse.jsonUnsafe({
          location,
          data: {
            resources: [],
            templates: [],
          },
        })
      }).pipe(Effect.provide(locations.get(locationFromRequest(request)))),
    )
  }),
)
