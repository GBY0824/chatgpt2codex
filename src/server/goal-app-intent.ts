/**
 * Explicit owner-authorized APP-level GOAL request, NOT an original consumer
 * ChatGPT user-turn attestation, P3 clearance, or permission to run research.
 */
import { randomUUID, createHash } from "node:crypto";
import { promises as fs } from "node:fs";
import path from "node:path";

export const GOAL_APP_SCOPE = "chatgpt2codex.goal";
export const GOAL_APP_SCHEMES = [
  { type: "oauth2", scopes: ["chatgpt2codex", GOAL_APP_SCOPE] },
] as const;

export interface VerifiedAppCaller {
  clientId: string;
  scopes: string[];
  expiresAt?: number;
  resource?: URL;
}
export interface GoalAppInput {
  action: "status" | "ON" | "OFF";
  expectedRevision?: number;
}
/** Post-commit APP notification for an independently authorized host.
 * Not a signed ChatGPT consumer turn, P3 work permit or execution command.
 * Its authenticated-principal fingerprint is diagnostic only. */
export interface PersistedGoalAppNotice {
  source: "OAUTH_SCOPED_APP_INTENT";
  action: "ON" | "OFF";
  revision: number;
  commandId: string;
  clientFingerprint: string;
  originalChatTurnAttested: false;
  researchExecutionAuthorized: false;
}
export type GoalAppNoticeHost = (notice: Readonly<PersistedGoalAppNotice>) => Promise<void>;
interface IntentState {
  schema: 1;
  requestedMode: "ON" | "OFF";
  revision: number;
  lastCommandId: string | null;
}

const INITIAL: IntentState = {
  schema: 1, requestedMode: "OFF", revision: 0, lastCommandId: null,
};
const MAX_BYTES = 4096;

export class GoalAppCommandError extends Error {
  readonly code: string;
  constructor(code: string) { super(code); this.code = code; }
}

function validateCaller(caller: VerifiedAppCaller | undefined, remote: boolean): void {
  if (!remote || !caller || typeof caller.clientId !== "string" || !caller.clientId.trim()
      || !Array.isArray(caller.scopes) || !caller.scopes.includes(GOAL_APP_SCOPE)
      || !caller.scopes.includes("chatgpt2codex")
      || typeof caller.expiresAt !== "number"
      || !Number.isFinite(caller.expiresAt)
      || caller.expiresAt <= Date.now() / 1000) {
    throw new GoalAppCommandError("APP_GOAL_OAUTH_SCOPE_OR_AUTH_MISSING");
  }
  // The remote HTTP transport verifies bearer token and audience/resource.
  // The model must NEVER supply these fields as tool arguments.
  const resource = caller.resource;
  const isHttps = resource instanceof URL && resource.protocol === "https:";
  const isLocalDevelopment = resource instanceof URL
    && resource.protocol === "http:"
    && (resource.hostname === "127.0.0.1" || resource.hostname === "localhost");
  if (!isHttps && !isLocalDevelopment) {
    throw new GoalAppCommandError("APP_GOAL_RESOURCE_UNVERIFIED");
  }
}

async function loadState(filename: string): Promise<IntentState> {
  // Only a genuinely missing file at the INITIAL lstat is a fresh ledger. If it
  // disappears between stat and read, fail closed: never silently reset
  // an existing OFF revocation fence to revision zero.
  let entry: import("node:fs").Stats;
  try {
    entry = await fs.lstat(filename);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return { ...INITIAL };
    throw new GoalAppCommandError("APP_GOAL_LEDGER_READ_FAILED");
  }
  if (!entry.isFile()) throw new GoalAppCommandError("APP_GOAL_LEDGER_READ_FAILED");
  if (entry.size > MAX_BYTES) throw new GoalAppCommandError("APP_GOAL_LEDGER_OVERSIZED");
  let raw: string;
  try {
    raw = await fs.readFile(filename, "utf8");
  } catch {
    throw new GoalAppCommandError("APP_GOAL_LEDGER_READ_FAILED");
  }
  // A simultaneous writer may enlarge a file AFTER the initial stat.
  if (Buffer.byteLength(raw, "utf8") > MAX_BYTES) {
    throw new GoalAppCommandError("APP_GOAL_LEDGER_OVERSIZED");
  }
  let value: unknown;
  try { value = JSON.parse(raw); }
  catch { throw new GoalAppCommandError("APP_GOAL_LEDGER_CORRUPT"); }
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new GoalAppCommandError("APP_GOAL_LEDGER_CORRUPT");
  }
  const v = value as Record<string, unknown>;
  if (Object.keys(v).sort().join(",") !== "lastCommandId,requestedMode,revision,schema"
      || v.schema !== 1 || (v.requestedMode !== "ON" && v.requestedMode !== "OFF")
      || !Number.isSafeInteger(v.revision) || (v.revision as number) < 0
      || (v.lastCommandId !== null && (typeof v.lastCommandId !== "string" ||
        !/^[-a-z0-9]{8,80}$/i.test(v.lastCommandId)))) {
    throw new GoalAppCommandError("APP_GOAL_LEDGER_CORRUPT");
  }
  return v as unknown as IntentState;
}

async function saveState(filename: string, state: IntentState): Promise<void> {
  const parent = path.dirname(filename);
  await fs.mkdir(parent, { recursive: true });
  const tmp = `${filename}.${randomUUID()}.tmp`;
  try {
    const file = await fs.open(tmp, "wx", 0o600);
    try { await file.writeFile(JSON.stringify(state) + "\n"); await file.sync(); }
    finally { await file.close(); }
    await fs.rename(tmp, filename);
  } finally { await fs.unlink(tmp).catch(() => undefined); }
}

/**
 * Serialize APP GOAL ledger writes across candidate MCP processes.
 * Preserve a replacement/mutated claim instead of unlinking a different
 * process's lock. A crash leaves the marker and always requires deliberate
 * owner-side recovery; this is NOT a production legacy OAuth writer lock.
 *
 * Filesystem check+unlink is best-effort, not an atomic unlink-by-handle;
 * shared-state isolation remains mandatory on any eventual live cutover.
 */
export async function withGoalIntentClaim<T>(
  lockPath: string, fn: () => Promise<T>,
): Promise<T> {
  let lock: import("node:fs/promises").FileHandle;
  try { lock = await fs.open(lockPath, "wx", 0o600); }
  catch { throw new GoalAppCommandError("APP_GOAL_LOCK_BUSY_NO_REPLAY"); }
  const marker = JSON.stringify({
    schema: 1, pid: process.pid, nonce: randomUUID(),
  });
  const identity = await lock.stat();
  try {
    await lock.writeFile(marker);
    await lock.sync();
    return await fn();
  } finally {
    await lock.close();
    let sameClaim = false;
    try {
      const [text, current] = await Promise.all([
        fs.readFile(lockPath, "utf8"), fs.lstat(lockPath),
      ]);
      sameClaim = current.isFile() && text === marker
        && current.dev === identity.dev && current.ino === identity.ino;
    } catch {
      // An absent, replaced, inaccessible or non-file marker is NOT owned.
    }
    if (!sameClaim) throw new GoalAppCommandError("APP_GOAL_LOCK_OWNERSHIP_LOST");
    await fs.unlink(lockPath);
  }
}

export async function goalAppCommand(
  stateDir: string, input: GoalAppInput, verifiedAuth: VerifiedAppCaller | undefined,
  remote: boolean,
  onPersistedNotice?: GoalAppNoticeHost,
): Promise<Record<string, unknown>> {
  validateCaller(verifiedAuth, remote);
  if (input.action !== "status" && input.action !== "ON" && input.action !== "OFF") {
    throw new GoalAppCommandError("APP_GOAL_ACTION_INVALID");
  }
  if (input.action === "ON" && (!Number.isSafeInteger(input.expectedRevision)
      || (input.expectedRevision as number) < 0)) {
    throw new GoalAppCommandError("APP_GOAL_REVISION_REQUIRED");
  }
  const filePath = path.join(stateDir, "goal-app-command-intent.json");
  if (input.action === "status") {
    const s = await loadState(filePath);
    return { code: "APP_GOAL_INTENT_STATUS_ONLY", requestedMode: s.requestedMode,
      revision: s.revision, researchExecutionAuthorized: false,
      originalChatTurnAttested: false, effectsIssued: 0 };
  }

  // Cross-process mutual exclusion; abandon/unknown lock fails closed.
  await fs.mkdir(stateDir, { recursive: true });
  const lockPath = `${filePath}.lock`;
  let written: { action: "ON" | "OFF"; revision: number; commandId: string } | null = null;
  const result = await withGoalIntentClaim(lockPath, async () => {
    const s = await loadState(filePath);
    if (input.action === "ON" && input.expectedRevision !== s.revision) {
      return { code: "APP_GOAL_REVISION_STALE", requestedMode: s.requestedMode,
        revision: s.revision, researchExecutionAuthorized: false, effectsIssued: 0 };
    }
    // A repeated ON with the SAME revision must not rotate commandId,
    // rewrite the ledger or generate an independently consumable event.
    // Otherwise a future authorized Goal event host could treat retries
    // or duplicated MCP calls as distinct ON commands.
    if (input.action === "ON" && s.requestedMode === "ON") {
      return { code: "APP_GOAL_ALREADY_ON_NO_REPLAY",
        requestedMode: s.requestedMode, revision: s.revision,
        researchExecutionAuthorized: false,
        originalChatTurnAttested: false, effectsIssued: 0 };
    }
    // OFF always fences an older ON. Repeated ON does not grant extra cycles.
    const next: IntentState = { schema: 1, requestedMode: input.action === "ON" ? "ON" : "OFF",
      revision: s.revision + (input.action === "OFF" || s.requestedMode !== "ON" ? 1 : 0),
      lastCommandId: randomUUID() };
    if (next.revision > Number.MAX_SAFE_INTEGER) {
      throw new GoalAppCommandError("APP_GOAL_REVISION_EXHAUSTED");
    }
    await saveState(filePath, next);
    written = { action: next.requestedMode, revision: next.revision,
      commandId: next.lastCommandId! };
    return { code: "APP_GOAL_INTENT_RECORDED_ONLY", requestedMode: next.requestedMode,
      revision: next.revision, researchExecutionAuthorized: false,
      originalChatTurnAttested: false, effectsIssued: 0 };
  });
  if (!written || !onPersistedNotice) return result;
  // Notify only after the durable state write AND lock release. GOAL OFF
  // must not wait for an executing ON host callback to release the lock.
  // A callback is a notification, NEVER authority to start P3 research.
  const emitted = written as { action: "ON" | "OFF"; revision: number; commandId: string };
  try {
    const latest = await loadState(filePath);
    if (latest.revision !== emitted.revision ||
        latest.lastCommandId !== emitted.commandId ||
        latest.requestedMode !== emitted.action) {
      return { ...result, eventNotice: "SUPERSEDED_BEFORE_NOTIFY",
        researchExecutionAuthorized: false, effectsIssued: 0 };
    }
    await onPersistedNotice(Object.freeze({
      source: "OAUTH_SCOPED_APP_INTENT" as const,
      action: emitted.action, revision: emitted.revision,
      commandId: emitted.commandId,
      clientFingerprint: createHash("sha256")
        .update(verifiedAuth!.clientId).digest("hex"),
      originalChatTurnAttested: false as const,
      researchExecutionAuthorized: false as const,
    }));
    return { ...result, eventNotice: "APP_HOST_NOTIFIED_NO_EXECUTION",
      researchExecutionAuthorized: false, effectsIssued: 0 };
  } catch {
    // Never rollback a persisted OFF or pretend a failed callback succeeded.
    // The host must reconcile the actual persisted revision before NEXT.
    return { ...result, code: "APP_GOAL_NOTICE_UNVERIFIED_RECONCILIATION_REQUIRED",
      eventNotice: "UNVERIFIED", researchExecutionAuthorized: false,
      originalChatTurnAttested: false, effectsIssued: 0 };
  }
}
