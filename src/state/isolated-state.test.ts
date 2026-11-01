import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { resolveIsolatedStateDir } from "./isolated-state.js";

describe("isolated review state selection (production default is invariant)", () => {
  let root: string;
  let production: string;
  let isolated: string;
  beforeEach(async () => {
    root = await fs.mkdtemp(path.join(os.tmpdir(), "goal-app-isolated-state-"));
    production = path.join(root, "running-production-state");
    isolated = path.join(root, "separate-goal-review-state");
    await fs.mkdir(production);
  });
  afterEach(async () => {
    await fs.rm(root, { force: true, recursive: true });
  });

  it("keeps the original default path when the flag is omitted", async () => {
    expect(await resolveIsolatedStateDir(undefined, production)).toBe(production);
  });
  it("accepts a separate absolute path without creating it", async () => {
    // Canonicalization expands macOS /var -> /private/var and Windows 8.3 aliases.
    expect(await resolveIsolatedStateDir(isolated, production)).toBe(
      path.join(await fs.realpath(root), path.basename(isolated)),
    );
    await expect(fs.stat(isolated)).rejects.toMatchObject({ code: "ENOENT" });
  });
  it("rejects a CLI bare flag or empty/relative paths", async () => {
    for (const input of [true, "", "relative/stage", " stage "]) {
      await expect(resolveIsolatedStateDir(input, production)).rejects.toThrow(
        "ISOLATED_STATE_ABSOLUTE_PATH_REQUIRED",
      );
    }
  });
  it("rejects direct overlap with production state", async () => {
    await expect(resolveIsolatedStateDir(production, production)).rejects.toThrow(
      "ISOLATED_STATE_OVERLAPS_PRODUCTION",
    );
  });
  it("rejects child and parent paths which could touch production state", async () => {
    await expect(resolveIsolatedStateDir(path.join(production, "goal"), production)).rejects.toThrow(
      "ISOLATED_STATE_OVERLAPS_PRODUCTION",
    );
    await expect(resolveIsolatedStateDir(root, production)).rejects.toThrow(
      "ISOLATED_STATE_OVERLAPS_PRODUCTION",
    );
  });
  it("rejects the filesystem root", async () => {
    await expect(resolveIsolatedStateDir(path.parse(root).root, production)).rejects.toThrow(
      "ISOLATED_STATE_OVERLAPS_PRODUCTION",
    );
  });
  it.skipIf(process.platform === "win32")("rejects an existing symlink alias to production", async () => {
    const alias = path.join(root, "alias");
    await fs.symlink(production, alias, "dir");
    await expect(resolveIsolatedStateDir(alias, production)).rejects.toThrow(
      "ISOLATED_STATE_OVERLAPS_PRODUCTION",
    );
    await expect(resolveIsolatedStateDir(path.join(alias, "subdir"), production)).rejects.toThrow(
      "ISOLATED_STATE_OVERLAPS_PRODUCTION",
    );
  });
});
