import { app, BrowserWindow, session, type Debugger } from "electron"
import { observationId, type ComputerControl, type ComputerObservation, type ComputerRect } from "./protocol"

type BrowserTarget = {
  ref: string
  backendNodeId?: number
  nodeId?: string
  role?: string
  name?: string
  path?: string
  bounds?: ComputerRect
}

type BrowserSnapshot = {
  observationId: string
  controls: Map<string, BrowserTarget>
  text: string
  title: string
  url: string
}

type BrowserSession = {
  id: string
  window: BrowserWindow
  debugger: Debugger
  snapshot?: BrowserSnapshot
  createdAt: number
}

const MAX_CONTROLS = 180
const MAX_TEXT = 50_000
const DEFAULT_PARTITION = "persist:sutradhar-computer-use"

export class ManagedBrowserController {
  #sessions = new Map<string, BrowserSession>()

  async create(sessionID: string) {
    const current = this.#sessions.get(sessionID)
    if (current && !current.window.isDestroyed()) {
      return current
    }

    const browserSession = session.fromPartition(`${DEFAULT_PARTITION}-${safePartition(sessionID)}`, { cache: false })
    const window = new BrowserWindow({
      show: true,
      title: app.getName(),
      width: 1280,
      height: 860,
      backgroundColor: "#111318",
      webPreferences: {
        session: browserSession,
        contextIsolation: true,
        nodeIntegration: false,
        sandbox: true,
      },
    })
    const debug = window.webContents.debugger
    debug.attach("1.3")
    const currentSession: BrowserSession = { id: sessionID, window, debugger: debug, createdAt: Date.now() }
    this.#sessions.set(sessionID, currentSession)

    window.on("closed", () => {
      if (this.#sessions.get(sessionID) === currentSession) this.#sessions.delete(sessionID)
      try {
        if (debug.isAttached()) debug.detach()
      } catch {}
    })
    window.webContents.setWindowOpenHandler(({ url: target }) => {
      void this.navigate(sessionID, target)
      return { action: "deny" }
    })
    window.webContents.on("will-navigate", (event, target) => {
      if (!/^https?:\/\//i.test(target)) event.preventDefault()
    })

    return currentSession
  }

  async close(sessionID: string) {
    const current = this.#sessions.get(sessionID)
    if (!current) return
    this.#sessions.delete(sessionID)
    if (!current.window.isDestroyed()) current.window.close()
    try {
      if (current.debugger.isAttached()) current.debugger.detach()
    } catch {}
  }

  async stop() {
    await Promise.all([...this.#sessions.keys()].map((id) => this.close(id)))
  }

  list(sessionID?: string) {
    return [...this.#sessions.values()]
      .filter((item) => !sessionID || item.id === sessionID)
      .map((item) => ({
        id: item.id,
        title: item.window.getTitle(),
        url: item.window.webContents.getURL(),
        focused: item.window.isFocused(),
        destroyed: item.window.isDestroyed(),
      }))
  }

  async navigate(sessionID: string, url: string) {
    const current = await this.create(sessionID)
    if (!/^https?:\/\//i.test(url)) throw new Error("Managed browser navigation only allows http(s) URLs")
    await current.window.loadURL(url)
    return this.observe(sessionID, { includeScreenshot: true, includeAccessibility: true })
  }

  async focus(sessionID: string) {
    const current = this.#require(sessionID)
    if (current.window.isMinimized()) current.window.restore()
    current.window.show()
    current.window.focus()
  }

  async observe(
    sessionID: string,
    options: { includeScreenshot?: boolean; includeAccessibility?: boolean } = {},
  ): Promise<ComputerObservation> {
    const current = await this.create(sessionID)
    await this.#ensureDebugger(current)
    const id = observationId()
    const title = current.window.webContents.getTitle()
    const url = current.window.webContents.getURL()
    const text = await this.#visibleText(current)
    const controls = new Map<string, BrowserTarget>()

    if (options.includeAccessibility !== false) {
      const ax = await current.debugger.sendCommand("Accessibility.getFullAXTree")
      const nodes = Array.isArray((ax as { nodes?: unknown[] }).nodes) ? (ax as { nodes: unknown[] }).nodes : []
      for (const node of nodes) {
        if (controls.size >= MAX_CONTROLS) break
        if (!isRecord(node)) continue
        const role = readAXValue(node.role)
        const name = readAXValue(node.name)
        const value = readAXValue(node.value)
        const backendNodeId = typeof node.backendDOMNodeId === "number" ? node.backendDOMNodeId : undefined
        const nodeId = typeof node.nodeId === "string" ? node.nodeId : undefined
        if (!backendNodeId && !nodeId) continue
        if (!isInteractiveRole(role) && !name && !value) continue
        const ref = `browser_${id}_${controls.size + 1}`
        const target: BrowserTarget = { ref, backendNodeId, nodeId, role, name, bounds: undefined }
        if (backendNodeId) target.bounds = await this.#bounds(current, backendNodeId)
        controls.set(ref, target)
      }
    }

    current.snapshot = { observationId: id, controls, text, title, url }
    const result: ComputerObservation = {
      observationId: id,
      surface: "browser",
      sessionID,
      title,
      url,
      text,
      controls: [...controls.values()].map(toControl),
      state: { readyState: await this.#readyState(current), focused: current.window.isFocused() },
    }
    if (options.includeScreenshot !== false) result.screenshot = await this.#screenshot(current)
    return result
  }

  async click(
    sessionID: string,
    input: { observationId: string; target: string; clickCount?: number; button?: string },
  ) {
    const current = this.#require(sessionID)
    const target = await this.#resolveTarget(current, input.observationId, input.target)
    const bounds =
      target.bounds ?? (target.backendNodeId ? await this.#bounds(current, target.backendNodeId) : undefined)
    if (!bounds) throw new Error("Browser target has no visible bounds")
    const x = bounds.x + bounds.width / 2
    const y = bounds.y + bounds.height / 2
    const button = input.button === "right" ? "right" : input.button === "middle" ? "middle" : "left"
    await current.debugger.sendCommand("Input.dispatchMouseEvent", { type: "mouseMoved", x, y })
    for (let i = 0; i < Math.max(1, Math.min(2, input.clickCount ?? 1)); i++) {
      await current.debugger.sendCommand("Input.dispatchMouseEvent", {
        type: "mousePressed",
        x,
        y,
        button,
        clickCount: i + 1,
      })
      await current.debugger.sendCommand("Input.dispatchMouseEvent", {
        type: "mouseReleased",
        x,
        y,
        button,
        clickCount: i + 1,
      })
    }
    await this.#settle(current)
    return this.observe(sessionID)
  }

  async fill(sessionID: string, input: { observationId: string; target: string; text: string }) {
    const current = this.#require(sessionID)
    const target = await this.#resolveTarget(current, input.observationId, input.target)
    await this.#focusTarget(current, target)
    await this.#key(current, "a", ["Control"])
    await current.debugger.sendCommand("Input.insertText", { text: input.text })
    await this.#settle(current)
    return this.observe(sessionID)
  }

  async select(sessionID: string, input: { observationId: string; target: string; option: string }) {
    const current = this.#require(sessionID)
    const target = await this.#resolveTarget(current, input.observationId, input.target)
    if (!target.backendNodeId) throw new Error("Browser select target is not backed by a DOM node")
    const resolved = await current.debugger.sendCommand("DOM.resolveNode", { backendNodeId: target.backendNodeId })
    const objectId = (resolved as { object?: { objectId?: string } }).object?.objectId
    if (!objectId) throw new Error("Browser select target could not be resolved")
    const result = await current.debugger.sendCommand("Runtime.callFunctionOn", {
      objectId,
      functionDeclaration:
        "function(value){ if (!(this instanceof HTMLSelectElement)) return false; this.value = value; this.dispatchEvent(new Event('input',{bubbles:true})); this.dispatchEvent(new Event('change',{bubbles:true})); return true; }",
      arguments: [{ value: input.option }],
      returnByValue: true,
    })
    if ((result as { result?: { value?: unknown } }).result?.value !== true)
      throw new Error("Target is not a select control")
    await this.#settle(current)
    return this.observe(sessionID)
  }

  async key(sessionID: string, input: { observationId?: string; key: string; modifiers?: string[] }) {
    const current = this.#require(sessionID)
    await this.#key(current, input.key, input.modifiers ?? [])
    await this.#settle(current)
    return this.observe(sessionID)
  }

  async scroll(sessionID: string, input: { observationId?: string; direction: string; amount: number }) {
    const current = this.#require(sessionID)
    const bounds = current.window.getContentBounds()
    const dx = input.direction === "left" ? -input.amount : input.direction === "right" ? input.amount : 0
    const dy = input.direction === "up" ? -input.amount : input.direction === "down" ? input.amount : 0
    await current.debugger.sendCommand("Input.dispatchMouseEvent", {
      type: "mouseWheel",
      x: Math.max(1, Math.round(bounds.width / 2)),
      y: Math.max(1, Math.round(bounds.height / 2)),
      deltaX: dx,
      deltaY: dy,
    })
    await this.#settle(current)
    return this.observe(sessionID)
  }

  async wait(sessionID: string, milliseconds: number) {
    await new Promise((resolve) => setTimeout(resolve, Math.max(50, Math.min(5000, milliseconds))))
    return this.observe(sessionID)
  }

  async verify(sessionID: string, assertions: string[]) {
    const current = await this.observe(sessionID, { includeScreenshot: false, includeAccessibility: true })
    const results = assertions.map((assertion) => ({ assertion, passed: this.#matches(current, assertion) }))
    return { passed: results.every((item) => item.passed), results, observation: current }
  }

  #require(sessionID: string) {
    const current = this.#sessions.get(sessionID)
    if (!current || current.window.isDestroyed()) throw new Error(`Managed browser session ${sessionID} is unavailable`)
    return current
  }

  async #resolveTarget(session: BrowserSession, observation: string, target: string) {
    if (session.snapshot?.observationId !== observation) throw new Error("Browser observation is stale; observe again")
    const known = session.snapshot.controls.get(target)
    if (known) return known
    if (!isSafeSelector(target))
      throw new Error("Browser target must be a ref from the latest observation or a safe selector")
    const result = await session.debugger.sendCommand("DOM.getDocument", { depth: 0, pierce: true })
    const rootNodeId = (result as { root?: { nodeId?: number } }).root?.nodeId
    if (!rootNodeId) throw new Error("Browser DOM is unavailable")
    const query = await session.debugger.sendCommand("DOM.querySelector", { nodeId: rootNodeId, selector: target })
    const nodeId = (query as { nodeId?: number }).nodeId
    if (!nodeId) throw new Error(`Browser selector did not match: ${target}`)
    const resolved = await session.debugger.sendCommand("DOM.describeNode", { nodeId })
    const backendNodeId = (resolved as { node?: { backendNodeId?: number } }).node?.backendNodeId
    return { ref: target, nodeId: String(nodeId), backendNodeId, path: target }
  }

  async #focusTarget(session: BrowserSession, target: BrowserTarget) {
    if (target.backendNodeId) {
      await session.debugger.sendCommand("DOM.focus", { backendNodeId: target.backendNodeId })
      return
    }
    if (target.path) {
      await session.window.webContents.executeJavaScript(
        `document.querySelector(${JSON.stringify(target.path)})?.focus()`,
      )
      return
    }
    throw new Error("Browser target cannot be focused")
  }

  async #key(session: BrowserSession, key: string, modifiers: string[]) {
    const modifierBits = modifiers.reduce((bits, modifier) => bits | modifierBit(modifier), 0)
    const normalized = key.length === 1 ? key : keyName(key)
    await session.debugger.sendCommand("Input.dispatchKeyEvent", {
      type: "rawKeyDown",
      key: normalized,
      code: codeName(normalized),
      windowsVirtualKeyCode: virtualKeyCode(normalized),
      nativeVirtualKeyCode: virtualKeyCode(normalized),
      modifiers: modifierBits,
    })
    await session.debugger.sendCommand("Input.dispatchKeyEvent", {
      type: "keyUp",
      key: normalized,
      code: codeName(normalized),
      windowsVirtualKeyCode: virtualKeyCode(normalized),
      nativeVirtualKeyCode: virtualKeyCode(normalized),
      modifiers: modifierBits,
    })
  }

  async #bounds(session: BrowserSession, backendNodeId: number) {
    try {
      await session.debugger.sendCommand("DOM.enable")
      const result = await session.debugger.sendCommand("DOM.getBoxModel", { backendNodeId })
      const content = (result as { model?: { content?: number[] } }).model?.content
      if (!content || content.length < 8) return undefined
      const xs = [content[0], content[2], content[4], content[6]]
      const ys = [content[1], content[3], content[5], content[7]]
      const minX = Math.min(...xs)
      const maxX = Math.max(...xs)
      const minY = Math.min(...ys)
      const maxY = Math.max(...ys)
      return { x: minX, y: minY, width: Math.max(0, maxX - minX), height: Math.max(0, maxY - minY) }
    } catch {
      return undefined
    }
  }

  async #screenshot(session: BrowserSession) {
    const image = await session.window.webContents.capturePage()
    return { data: image.toPNG().toString("base64"), mime: "image/png", filename: `browser-${session.id}.png` }
  }

  async #visibleText(session: BrowserSession) {
    try {
      const value = await session.window.webContents.executeJavaScript(
        "document.body?.innerText ?? document.title ?? ''",
      )
      return String(value).slice(0, MAX_TEXT)
    } catch {
      return ""
    }
  }

  async #readyState(session: BrowserSession) {
    try {
      return await session.window.webContents.executeJavaScript("document.readyState")
    } catch {
      return "unknown"
    }
  }

  async #settle(session: BrowserSession) {
    const start = Date.now()
    let previous = ""
    while (Date.now() - start < 3000) {
      const current = await this.#visibleText(session)
      if (current === previous) return
      previous = current
      await new Promise((resolve) => setTimeout(resolve, 120))
    }
  }

  async #ensureDebugger(session: BrowserSession) {
    if (!session.debugger.isAttached()) session.debugger.attach("1.3")
    await session.debugger.sendCommand("Page.enable")
    await session.debugger.sendCommand("Runtime.enable")
    await session.debugger.sendCommand("DOM.enable")
    await session.debugger.sendCommand("Accessibility.enable")
  }

  #matches(observation: ComputerObservation, assertion: string) {
    const normalized = assertion.trim()
    const lower = normalized.toLowerCase()
    if (lower.startsWith("url contains "))
      return (observation.url ?? "").toLowerCase().includes(normalized.slice(13).toLowerCase())
    if (lower.startsWith("title contains "))
      return (observation.title ?? "").toLowerCase().includes(normalized.slice(16).toLowerCase())
    if (lower.startsWith("text contains "))
      return (observation.text ?? "").toLowerCase().includes(normalized.slice(14).toLowerCase())
    return `${observation.title ?? ""}\n${observation.url ?? ""}\n${observation.text ?? ""}`
      .toLowerCase()
      .includes(lower)
  }
}

function toControl(target: BrowserTarget): ComputerControl {
  return {
    ref: target.ref,
    role: target.role,
    name: target.name,
    bounds: target.bounds,
    backendNodeId: target.backendNodeId,
  }
}

function isRecord(value: unknown): value is Record<string, any> {
  return typeof value === "object" && value !== null
}

function readAXValue(value: unknown) {
  if (!isRecord(value)) return undefined
  return typeof value.value === "string" || typeof value.value === "number" ? String(value.value) : undefined
}

function isInteractiveRole(role?: string) {
  return (
    !!role &&
    /button|link|textbox|combobox|checkbox|radio|menuitem|tab|listbox|option|slider|spinbutton|scrollbar|switch/i.test(
      role,
    )
  )
}

function isSafeSelector(value: string) {
  return value.length > 0 && value.length <= 500 && !/[;{}]|javascript:/i.test(value)
}

function safePartition(value: string) {
  return value.replace(/[^a-zA-Z0-9._-]/g, "-").slice(0, 80) || "session"
}

function modifierBit(value: string) {
  if (value === "Alt") return 1
  if (value === "Control") return 2
  if (value === "Meta") return 4
  if (value === "Shift") return 8
  return 0
}

function keyName(value: string) {
  const names: Record<string, string> = {
    Enter: "Enter",
    Tab: "Tab",
    Escape: "Escape",
    Backspace: "Backspace",
    Delete: "Delete",
    ArrowUp: "ArrowUp",
    ArrowDown: "ArrowDown",
    ArrowLeft: "ArrowLeft",
    ArrowRight: "ArrowRight",
    Space: " ",
  }
  return names[value] ?? value
}

function codeName(key: string) {
  if (key === " ") return "Space"
  if (key.length === 1 && /[a-z]/i.test(key)) return `Key${key.toUpperCase()}`
  if (key.length === 1 && /[0-9]/.test(key)) return `Digit${key}`
  return key
}

function virtualKeyCode(key: string) {
  const values: Record<string, number> = {
    Enter: 13,
    Tab: 9,
    Escape: 27,
    Backspace: 8,
    Delete: 46,
    ArrowUp: 38,
    ArrowDown: 40,
    ArrowLeft: 37,
    ArrowRight: 39,
    " ": 32,
  }
  if (values[key] !== undefined) return values[key]
  if (key.length === 1) return key.toUpperCase().charCodeAt(0)
  return 0
}
