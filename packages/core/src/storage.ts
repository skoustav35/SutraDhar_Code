export * as Storage from "./storage";

import fs from "fs/promises";
import path from "path";

export const APP_NAME = "sutradhar";

export const PROJECT_DIR = ".sutradhar";

export const CONFIG_FILES = ["sutradhar.json", "sutradhar.jsonc"] as const;
export const PROJECT_DIRS = [PROJECT_DIR] as const;

export const VERSION_FILE = ".sutradhar-version";
export const MIGRATION_MARKER = ".sutradhar-migration-complete";

export function isProjectDirectory(directory: string) {
  return path.basename(directory) === PROJECT_DIR;
}

export function isCanonicalProjectDirectory(directory: string) {
  return path.basename(directory) === PROJECT_DIR;
}

async function exists(filepath: string) {
  return fs
    .access(filepath)
    .then(() => true)
    .catch(() => false);
}

async function copyMissingEntry(
  source: string,
  destination: string,
): Promise<void> {
  const sourceInfo = await fs.lstat(source).catch(() => undefined);
  if (!sourceInfo) return;

  const destinationInfo = await fs.lstat(destination).catch(() => undefined);
  if (destinationInfo) {
    if (sourceInfo.isDirectory() && destinationInfo.isDirectory()) {
      const entries = await fs.readdir(source, { withFileTypes: true });
      await Promise.all(
        entries.map((entry) =>
          copyMissingEntry(
            path.join(source, entry.name),
            path.join(destination, entry.name),
          ),
        ),
      );
    }
    return;
  }

  if (sourceInfo.isDirectory()) {
    await fs.mkdir(destination, { recursive: true });
    const entries = await fs.readdir(source, { withFileTypes: true });
    await Promise.all(
      entries.map((entry) =>
        copyMissingEntry(
          path.join(source, entry.name),
          path.join(destination, entry.name),
        ),
      ),
    );
    return;
  }

  if (sourceInfo.isSymbolicLink()) {
    const target = await fs.readlink(source);
    await fs.symlink(target, destination).catch(() => {});
    return;
  }

  await fs.copyFile(source, destination).catch(() => {});
}

/** Copy only missing entries so a user's canonical Sutradhar files always win. */
export async function copyMissingDirectory(
  source: string,
  destination: string,
) {
  if (!(await exists(source))) return false;
  await copyMissingEntry(source, destination);
  return true;
}
