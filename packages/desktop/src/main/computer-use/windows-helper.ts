import { spawn, type ChildProcessWithoutNullStreams } from "node:child_process"
import { createInterface } from "node:readline"
import { join } from "node:path"
import { app } from "electron"
import { fileURLToPath } from "node:url"
import { dirname } from "node:path"
import { write as writeLog } from "../logging"

type HelperResponse = {
  id: string
  ok: boolean
  data?: unknown
  error?: string
}

type Pending = {
  resolve: (value: HelperResponse) => void
  reject: (error: Error) => void
  timer: NodeJS.Timeout
}

const root = dirname(fileURLToPath(import.meta.url))

function helperPath() {
  return app.isPackaged
    ? join(process.resourcesPath, "computer-use", "windows-helper.ps1")
    : join(root, "../../resources/computer-use/windows-helper.ps1")
}

export class WindowsComputerHelper {
  #child: ChildProcessWithoutNullStreams | undefined
  #pending = new Map<string, Pending>()
  #lineReader: ReturnType<typeof createInterface> | undefined
  #startPromise: Promise<void> | undefined

  async start() {
    if (process.platform !== "win32") throw new Error("The Windows computer helper is only available on Windows")
    if (this.#child && !this.#child.killed) return
    if (this.#startPromise) return this.#startPromise

    this.#startPromise = new Promise<void>((resolve, reject) => {
      const child = spawn(
        process.env.SystemRoot
          ? `${process.env.SystemRoot}\\System32\\WindowsPowerShell\\v1.0\\powershell.exe`
          : "powershell.exe",
        ["-NoLogo", "-NoProfile", "-NonInteractive", "-ExecutionPolicy", "Bypass", "-STA", "-File", helperPath()],
        { stdio: ["pipe", "pipe", "pipe"], windowsHide: true },
      )

      this.#child = child
      this.#lineReader = createInterface({ input: child.stdout })
      this.#lineReader.on("line", (line) => this.#handleLine(line))
      child.stderr.on("data", (chunk) =>
        writeLog("computer-use", "windows helper stderr", { text: chunk.toString() }, "warn"),
      )
      child.once("error", (error) => {
        this.#failAll(error instanceof Error ? error : new Error(String(error)))
        reject(error)
      })
      child.once("exit", (code, signal) => {
        const error = new Error(`Windows computer helper exited (code=${code ?? "null"}, signal=${signal ?? "null"})`)
        this.#failAll(error)
        this.#child = undefined
        this.#lineReader?.close()
        this.#lineReader = undefined
      })

      void this.request("health", {}, 10_000).then((response) => {
        if (!response.ok) {
          reject(new Error(response.error ?? "Windows computer helper health check failed"))
          return
        }
        resolve()
      }, reject)
    }).finally(() => {
      this.#startPromise = undefined
    })

    return this.#startPromise
  }

  async stop() {
    const child = this.#child
    this.#child = undefined
    this.#lineReader?.close()
    this.#lineReader = undefined
    if (!child) return
    this.#failAll(new Error("Windows computer helper stopped"))
    child.stdin.end()
    if (!child.killed) child.kill()
  }

  async request(command: string, payload: Record<string, unknown>, timeoutMs = 20_000): Promise<HelperResponse> {
    await this.startIfNeeded(command === "health")
    const child = this.#child
    if (!child || child.killed || !child.stdin.writable) throw new Error("Windows computer helper is unavailable")

    const id = cryptoRandomId()
    const response = new Promise<HelperResponse>((resolve, reject) => {
      const timer = setTimeout(() => {
        this.#pending.delete(id)
        reject(new Error(`Windows computer helper timed out while executing ${command}`))
      }, timeoutMs)
      this.#pending.set(id, { resolve, reject, timer })
    })

    child.stdin.write(`${JSON.stringify({ id, command, ...payload })}\n`)
    return response
  }

  private async startIfNeeded(forHealth: boolean) {
    if (this.#child && !this.#child.killed) return
    if (forHealth) {
      await this.start()
      return
    }
    await this.start()
  }

  #handleLine(line: string) {
    let value: HelperResponse
    try {
      value = JSON.parse(line) as HelperResponse
    } catch {
      writeLog("computer-use", "invalid windows helper response", { line }, "warn")
      return
    }
    const pending = this.#pending.get(value.id)
    if (!pending) return
    clearTimeout(pending.timer)
    this.#pending.delete(value.id)
    pending.resolve(value)
  }

  #failAll(error: Error) {
    for (const pending of this.#pending.values()) {
      clearTimeout(pending.timer)
      pending.reject(error)
    }
    this.#pending.clear()
  }
}

function cryptoRandomId() {
  return `${Date.now().toString(36)}_${Math.random().toString(36).slice(2)}`
}
