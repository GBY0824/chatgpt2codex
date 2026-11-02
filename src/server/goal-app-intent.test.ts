import { afterEach, describe, expect, it } from "vitest";
import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
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
  it("does not rewrite the ledger or rotate commandId for duplicate ON", async () => {
    const d = await dir();
    const file = path.join(d, "goal-app-command-intent.json");
    expect((await call(d, "ON", 0)).revision).toBe(1);
    const initial = await readFile(file, "utf8");
    const id = JSON.parse(initial).lastCommandId;
    expect(typeof id).toBe("string");
    const duplicate = await call(d, "ON", 1);
    expect(duplicate).toMatchObject({
      code: "APP_GOAL_ALREADY_ON_NO_REPLAY",
      revision: 1, effectsIssued: 0,
      researchExecutionAuthorized: false,
      originalChatTurnAttested: false,
    });
    expect(await readFile(file, "utf8")).toBe(initial);
    expect(JSON.parse(await readFile(file, "utf8")).lastCommandId).toBe(id);
    const stale = await call(d, "ON", 0);
    expect(stale.code).toBe("APP_GOAL_REVISION_STALE");
    expect(await readFile(file, "utf8")).toBe(initial);
    const off = await call(d, "OFF");
    expect(off.revision).toBe(2);
    const afterOff = await readFile(file, "utf8");
    expect(afterOff).not.toBe(initial);
    const reOn = await call(d, "ON", 2);
    expect(reOn.revision).toBe(3);
    expect(reOn.code).toBe("APP_GOAL_INTENT_RECORDED_ONLY");
    expect(JSON.parse(await readFile(file, "utf8")).lastCommandId).not.toBe(id);
  });
  it("notifies an approved host only for distinct persisted APP ON/OFF commands", async () => {
    const d = await dir();
    const notices: Array<Record<string, unknown>> = [];
    const host = async (notice: Record<string, unknown>) => {
      notices.push({ ...notice });
    };
    const on = await goalAppCommand(d, { action: "ON", expectedRevision: 0 },
      auth, true, host);
    expect(on).toMatchObject({
      code: "APP_GOAL_INTENT_RECORDED_ONLY",
      eventNotice: "APP_HOST_NOTIFIED_NO_EXECUTION",
      researchExecutionAuthorized: false, effectsIssued: 0,
    });
    expect(notices).toHaveLength(1);
    expect(notices[0]).toMatchObject({
      source: "OAUTH_SCOPED_APP_INTENT", action: "ON", revision: 1,
      researchExecutionAuthorized: false, originalChatTurnAttested: false,
    });
    expect(notices[0].clientFingerprint).toMatch(/^[a-f0-9]{64}$/);
    expect(JSON.stringify(notices)).not.toContain(auth.clientId);
    const duplicate = await goalAppCommand(d, { action: "ON", expectedRevision: 1 },
      auth, true, host);
    expect(duplicate.code).toBe("APP_GOAL_ALREADY_ON_NO_REPLAY");
    expect(notices).toHaveLength(1);
    const off = await goalAppCommand(d, { action: "OFF" }, auth, true, host);
    expect(off.eventNotice).toBe("APP_HOST_NOTIFIED_NO_EXECUTION");
    expect(notices).toHaveLength(2);
    expect(notices[1]).toMatchObject({
      action: "OFF", revision: 2,
      researchExecutionAuthorized: false, originalChatTurnAttested: false,
    });
  });

  it("preserves durable OFF/ON intent when a host notice fails, requiring reconciliation", async () => {
    const d = await dir();
    const failing = async () => { throw new Error("synthetic-test-host-refusal"); };
    const on = await goalAppCommand(d, { action: "ON", expectedRevision: 0 },
      auth, true, failing);
    expect(on).toMatchObject({
      code: "APP_GOAL_NOTICE_UNVERIFIED_RECONCILIATION_REQUIRED",
      eventNotice: "UNVERIFIED", effectsIssued: 0,
    });
    expect(await call(d, "status")).toMatchObject({ requestedMode: "ON", revision: 1 });
    // Failed notification is NOT replayed by a duplicate ON.
    const retried = await goalAppCommand(d, { action: "ON", expectedRevision: 1 },
      auth, true, failing);
    expect(retried.code).toBe("APP_GOAL_ALREADY_ON_NO_REPLAY");
    expect(await call(d, "status")).toMatchObject({ requestedMode: "ON", revision: 1 });
    const off = await goalAppCommand(d, { action: "OFF" }, auth, true, failing);
    expect(off.code).toBe("APP_GOAL_NOTICE_UNVERIFIED_RECONCILIATION_REQUIRED");
    expect(await call(d, "status")).toMatchObject({ requestedMode: "OFF", revision: 2 });
  });

  it("does not hold the ON lock while the host observes the event; OFF can revoke", async () => {
    const d = await dir();
    let entered!: () => void;
    let resume!: () => void;
    const started = new Promise<void>(resolve => { entered = resolve; });
    const held = new Promise<void>(resolve => { resume = resolve; });
    const onPromise = goalAppCommand(d, { action: "ON", expectedRevision: 0 },
      auth, true, async notice => {
        expect(notice.action).toBe("ON");
        entered();
        await held;
      });
    await started;
    // OFF must be able to persist even when the host is still awaiting
    // completion of its observational callback from the earlier ON.
    const off = await call(d, "OFF");
    expect(off).toMatchObject({
      code: "APP_GOAL_INTENT_RECORDED_ONLY", revision: 2,
    });
    resume();
    expect(await onPromise).toMatchObject({
      eventNotice: "APP_HOST_NOTIFIED_NO_EXECUTION",
      researchExecutionAuthorized: false,
    });
    expect(await call(d, "status")).toMatchObject({ requestedMode: "OFF", revision: 2 });
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

  it("treats only a genuinely absent GOAL ledger as the initial OFF revision", async () => {
    const d = await dir();
    const f = path.join(d, "goal-app-command-intent.json");
    expect(await call(d, "status")).toMatchObject({
      requestedMode: "OFF", revision: 0, originalChatTurnAttested: false,
    });
    await mkdir(f);
    await expect(call(d, "status")).rejects.toMatchObject({
      code: "APP_GOAL_LEDGER_READ_FAILED",
    });
    await expect(call(d, "ON", 0)).rejects.toMatchObject({
      code: "APP_GOAL_LEDGER_READ_FAILED",
    });
    expect((await (await import("node:fs/promises")).stat(f)).isDirectory()).toBe(true);
  });

  it("rejects oversized and malformed GOAL ledgers without resetting OFF revocation", async () => {
    const d = await dir();
    const f = path.join(d, "goal-app-command-intent.json");
    await call(d, "OFF");
    const fenced = await readFile(f, "utf8");
    await writeFile(f, "x".repeat(4097), "utf8");
    await expect(call(d, "status")).rejects.toMatchObject({
      code: "APP_GOAL_LEDGER_OVERSIZED",
    });
    await expect(call(d, "ON", 0)).rejects.toMatchObject({
      code: "APP_GOAL_LEDGER_OVERSIZED",
    });
    await writeFile(f, fenced.slice(0, -2), "utf8");
    await expect(call(d, "ON", 0)).rejects.toMatchObject({
      code: "APP_GOAL_LEDGER_CORRUPT",
    });
    await writeFile(f, fenced, "utf8");
    expect(await call(d, "status")).toMatchObject({
      requestedMode: "OFF", revision: 1,
    });
    expect((await call(d, "ON", 0)).code).toBe("APP_GOAL_REVISION_STALE");
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
