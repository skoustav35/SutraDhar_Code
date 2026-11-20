import path from "path"
import fs from "fs/promises"
import { xdgData, xdgCache, xdgConfig, xdgState } from "xdg-basedir"
import os from "os"
import { Context, Effect, Layer } from "effect"
import { Flock } from "./util/flock"
import { Flag } from "./flag/flag"
import { makeGlobalNode } from "./effect/app-node"
import { Storage } from "./storage"

const app = Storage.APP_NAME
const homeDir = process.env.SUTRADHAR_TEST_HOME ?? os.homedir()
const root = path.join(homeDir, ".sutradhar")
const data = process.env.XDG_DATA_HOME ? path.join(process.env.XDG_DATA_HOME, app) : path.join(root, "data")
const cache = process.env.XDG_CACHE_HOME ? path.join(process.env.XDG_CACHE_HOME, app) : path.join(root, "cache")
const config = process.env.XDG_CONFIG_HOME ? path.join(process.env.XDG_CONFIG_HOME, app) : path.join(root, "config")
const state = process.env.XDG_STATE_HOME ? path.join(process.env.XDG_STATE_HOME, app) : path.join(root, "state")
const log = process.env.XDG_DATA_HOME ? path.join(data, "log") : path.join(root, "logs")
const tmp = path.join(os.tmpdir(), app)

const paths = {
  get home() {
    return process.env.SUTRADHAR_TEST_HOME ?? os.homedir()
  },
  root,
  data,
  bin: path.join(cache, "bin"),
  log,
  repos: path.join(data, "repos"),
  cache,
  config,
  state,
  tmp,
}

export const Path = paths

Flock.setGlobal({ state })

function isLegacyIgnored(name: string) {
  return name.toLowerCase().startsWith("opencode")
}

async function copyMissingFiltered(source: string, destination: string): Promise<void> {
  const sourceInfo = await fs.lstat(source).catch(() => undefined)
  if (!sourceInfo) return
  if (isLegacyIgnored(path.basename(source))) return

  const destInfo = await fs.lstat(destination).catch(() => undefined)
  if (destInfo) {
    if (sourceInfo.isDirectory() && destInfo.isDirectory()) {
      const entries = await fs.readdir(source, { withFileTypes: true }).catch(() => [])
      await Promise.all(
        entries
          .filter((entry) => !isLegacyIgnored(entry.name))
          .map((entry) => copyMissingFiltered(path.join(source, entry.name), path.join(destination, entry.name))),
      )
    }
    return
  }

  if (sourceInfo.isDirectory()) {
    await fs.mkdir(destination, { recursive: true })
    const entries = await fs.readdir(source, { withFileTypes: true }).catch(() => [])
    await Promise.all(
      entries
        .filter((entry) => !isLegacyIgnored(entry.name))
        .map((entry) => copyMissingFiltered(path.join(source, entry.name), path.join(destination, entry.name))),
    )
    return
  }

  if (sourceInfo.isSymbolicLink()) {
    const target = await fs.readlink(source).catch(() => undefined)
    if (target) await fs.symlink(target, destination).catch(() => {})
    return
  }

  await fs.mkdir(path.dirname(destination), { recursive: true }).catch(() => {})
  await fs.copyFile(source, destination).catch(() => {})
}

async function migrateLegacyXdgToSutradharRoot() {
  if (process.env.SUTRADHAR_TEST_HOME) return
  const marker = path.join(root, ".xdg-migrated")
  const hasMarker = await fs
    .access(marker)
    .then(() => true)
    .catch(() => false)
  if (hasMarker) return

  await fs.mkdir(root, { recursive: true }).catch(() => {})
  const tasks: Promise<void>[] = []
  if (!process.env.XDG_DATA_HOME && xdgData) {
    tasks.push(copyMissingFiltered(path.join(xdgData, app), path.join(root, "data")))
  }
  if (!process.env.XDG_CONFIG_HOME && xdgConfig) {
    tasks.push(copyMissingFiltered(path.join(xdgConfig, app), path.join(root, "config")))
  }
  if (!process.env.XDG_STATE_HOME && xdgState) {
    tasks.push(copyMissingFiltered(path.join(xdgState, app), path.join(root, "state")))
  }
  await Promise.all(tasks)
  await fs.writeFile(marker, new Date().toISOString()).catch(() => {})
}

await migrateLegacyXdgToSutradharRoot()

await Promise.all([
  fs.mkdir(Path.root, { recursive: true }),
  fs.mkdir(Path.data, { recursive: true }),
  fs.mkdir(Path.config, { recursive: true }),
  fs.mkdir(Path.state, { recursive: true }),
  fs.mkdir(Path.tmp, { recursive: true }),
  fs.mkdir(Path.log, { recursive: true }),
  fs.mkdir(Path.bin, { recursive: true }),
  fs.mkdir(Path.repos, { recursive: true }),
])

export class Service extends Context.Service<Service, Interface>()("@sutradhar/Global") {}

export interface Interface {
  readonly home: string
  readonly root: string
  readonly data: string
  readonly cache: string
  readonly config: string
  readonly state: string
  readonly tmp: string
  readonly bin: string
  readonly log: string
  readonly repos: string
}

export function make(input: Partial<Interface> = {}): Interface {
  return {
    home: Path.home,
    root: Path.root,
    data: Path.data,
    cache: Path.cache,
    config: Flag.SUTRADHAR_CONFIG_DIR ?? Path.config,
    state: Path.state,
    tmp: Path.tmp,
    bin: Path.bin,
    log: Path.log,
    repos: Path.repos,
    ...input,
  }
}

const layer = Layer.effect(
  Service,
  Effect.sync(() => Service.of(make())),
)

export const node = makeGlobalNode({ service: Service, layer: layer, deps: [] })

export const layerWith = (input: Partial<Interface>) =>
  Layer.effect(
    Service,
    Effect.sync(() => Service.of(make(input))),
  )

export * as Global from "./global"
