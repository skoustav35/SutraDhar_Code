import { describe, expect, test } from "bun:test";
import fs from "fs/promises";
import os from "os";
import path from "path";
import { Storage } from "@sutradhar/core/storage";

describe("Sutradhar storage utilities", () => {
  test("copies missing files without overwriting canonical files", async () => {
    const root = await fs.mkdtemp(
      path.join(os.tmpdir(), "sutradhar-storage-test-"),
    );
    const source = path.join(root, "source");
    const canonical = path.join(root, Storage.PROJECT_DIR);

    await fs.mkdir(path.join(source, "agents"), { recursive: true });
    await fs.writeFile(
      path.join(source, "sutradhar.json"),
      '{"model":"source"}',
    );
    await fs.writeFile(
      path.join(source, "agents", "planner.md"),
      "source planner",
    );
    await fs.mkdir(canonical, { recursive: true });
    await fs.writeFile(
      path.join(canonical, "sutradhar.json"),
      '{"model":"canonical"}',
    );

    await Storage.copyMissingDirectory(source, canonical);

    expect(
      await fs.readFile(path.join(canonical, "sutradhar.json"), "utf8"),
    ).toBe('{"model":"canonical"}');
    expect(
      await fs.readFile(path.join(canonical, "agents", "planner.md"), "utf8"),
    ).toBe("source planner");

    await fs.rm(root, { recursive: true, force: true });
  });
});
