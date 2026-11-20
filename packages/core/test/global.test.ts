import { describe, expect, test } from "bun:test"
import fs from "fs/promises"
import os from "os"
import path from "path"
import { Global } from "@sutradhar/core/global"

describe("global paths", () => {
  test("tmp path is under the system temp directory", () => {
    expect(Global.Path.tmp).toBe(path.join(os.tmpdir(), "sutradhar"))
    expect(Global.make().tmp).toBe(Global.Path.tmp)
  })

  test("tmp path is created on module load", async () => {
    expect((await fs.stat(Global.Path.tmp)).isDirectory()).toBe(true)
  })

  test("exposes canonical sutradhar config path under .sutradhar", () => {
    expect(Global.Path.root).toBe(path.join(Global.Path.home, ".sutradhar"))
    if (process.env.XDG_CONFIG_HOME) {
      expect(path.basename(Global.Path.config)).toBe("sutradhar")
      return
    }
    expect(Global.Path.config).toBe(path.join(Global.Path.root, "config"))
  })
})
