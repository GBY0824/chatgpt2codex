import { afterEach, describe, expect, it } from "vitest";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { GoalAppCommandError, goalAppCommand, withGoalIntentClaim, type VerifiedAppCaller } from "./goal-app-intent.js";

const auth: VerifiedAppCaller = {
  clientId: "owner-approved-client", scopes: ["chatgpt2codex", "chatgpt2codex.goal"],
  expiresAt: Math.floor(Date.now() / 1000) + 3600,
  resource: new URL("https://example.test/mcp"),
};
const dirs: string[] = [];
afterEach(async () => { for (const d of dirs.splice(0)) await rm(d, { recursive: true, force: true }); });
async function dir(): Promise<string> { const d = await mkdtemp(path.join(tmpdir(), "goal-app-")); dirs.push(d); return d; }
const call = (d: string, action: "ON" | "OFF" | "status", expectedRevision?: number,
              caller: VerifiedAppCaller | undefined = auth, remote = true) =>
  goalAppCommand(d, { action, expectedRevision }, caller, remote);

describe("OAuth-scoped APP intent — NOT ChatGPT provider turn or research authorization", () => {
  it("records ON only as intent", async () => {
    const d = await dir();
    expect(await call(d, "ON", 0)).toMatchObject({ code: "APP_GOAL_INTENT_RECORDED_ONLY",
      researchExecutionAuthorized: false, originalChatTurnAttested: false, effectsIssued: 0 });
    expect(await call(d, "status")).toMatchObject({ requestedMode: "ON", revision: 1 });
  });
  it("OFF fences old ON across restart", async () => {
    const d = await dir();
    await call(d, "ON", 0); await call(d, "OFF");
    expect(await call(d, "ON", 1)).toMatchObject({ code: "APP_GOAL_REVISION_STALE", requestedMode: "OFF" });
    expect(await call(d, "status")).toMatchObject({ requestedMode: "OFF", revision: 2 });
  });
  it("does not treat repeated ON as new work, OFF increments revision", async () => {
    const d = await dir();
    expect((await call(d, "ON", 0)).revision).toBe(1);
    expect((await call(d, "ON", 1)).revision).toBe(1);
    await call(d, "OFF");
    expect((await call(d, "OFF")).revision).toBe(3);
  });
  it("requires verified remote OAuth bearer + dedicated scope", async () => {
    const d = await dir();
    await expect(call(d, "ON", 0, undefined, false)).rejects.toBeInstanceOf(GoalAppCommandError);
    await expect(call(d, "ON", 0, { ...auth, scopes: ["chatgpt2codex"] })).rejects.toBeInstanceOf(GoalAppCommandError);
    await expect(call(d, "ON", 0, { ...auth, expiresAt: 0 })).rejects.toBeInstanceOf(GoalAppCommandError);
    await expect(call(d, "ON", 0, { ...auth, resource: new URL("http://example.test") })).rejects.toBeInstanceOf(GoalAppCommandError);
    expect((await call(d, "status")).revision).toBe(0);
  });
  it("denies ON without a fresh revision", async () => {
    const d = await dir();
    await expect(call(d, "ON")).rejects.toMatchObject({ code: "APP_GOAL_REVISION_REQUIRED" });
    await call(d, "OFF");
    expect((await call(d, "ON", 0)).code).toBe("APP_GOAL_REVISION_STALE");
  });
  it("releases an unchanged synthetic APP intent claim after a normal transaction", async () => {
    const d = await dir();
    const marker = path.join(d, "synthetic-intent.lock");
    await withGoalIntentClaim(marker, async () => {
      expect((await readFile(marker, "utf8")).includes('"nonce":')).toBe(true);
    });
    await expect(readFile(marker, "utf8")).rejects.toMatchObject({ code: "ENOENT" });
  });

  it("refuses to unlink an APP intent claim modified in place by another writer", async () => {
    const d = await dir();
    const marker = path.join(d, "synthetic-intent.lock");
    const foreign = '{"schema":1,"nonce":"synthetic-foreign-owner"}';
    await expect(withGoalIntentClaim(marker, async () => {
      // Same inode, changed nonce: stat-only identity is not sufficient.
      await writeFile(marker, foreign, "utf8");
    })).rejects.toMatchObject({ code: "APP_GOAL_LOCK_OWNERSHIP_LOST" });
    expect(await readFile(marker, "utf8")).toBe(foreign);
    await expect(withGoalIntentClaim(marker, async () => {
      throw new Error("must-not-execute");
    })).rejects.toMatchObject({ code: "APP_GOAL_LOCK_BUSY_NO_REPLAY" });
    expect(await readFile(marker, "utf8")).toBe(foreign);
  });

  it("refuses to unlink a foreign APP intent claim replacing the locked inode", async () => {
    const d = await dir();
    const marker = path.join(d, "synthetic-intent.lock");
    const foreign = "synthetic-replaced-marker-not-owner";
    await expect(withGoalIntentClaim(marker, async () => {
      await rm(marker);
      await writeFile(marker, foreign, "utf8");
    })).rejects.toMatchObject({ code: "APP_GOAL_LOCK_OWNERSHIP_LOST" });
    expect(await readFile(marker, "utf8")).toBe(foreign);
  });

  it("fails closed on a missing claim instead of silently returning success", async () => {
    const d = await dir();
    const marker = path.join(d, "synthetic-intent.lock");
    await expect(withGoalIntentClaim(marker, async () => {
      await rm(marker);
    })).rejects.toMatchObject({ code: "APP_GOAL_LOCK_OWNERSHIP_LOST" });
  });

  it("fails closed on corrupt state and a held lock", async () => {
    const d = await dir();
    const f = path.join(d, "goal-app-command-intent.json");
    await writeFile(f, "{broken", "utf8");
    await expect(call(d, "ON", 0)).rejects.toMatchObject({ code: "APP_GOAL_LEDGER_CORRUPT" });
    expect(await readFile(f, "utf8")).toBe("{broken");
    await rm(f);
    await writeFile(f + ".lock", "hold", "utf8");
    await expect(call(d, "ON", 0)).rejects.toMatchObject({ code: "APP_GOAL_LOCK_BUSY_NO_REPLAY" });
  });
});
