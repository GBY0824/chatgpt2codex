/**
 * Explicit owner-authorized APP-level GOAL request, NOT an original consumer
 * ChatGPT user-turn attestation, P3 clearance, or permission to run research.
 */
import { randomUUID } from "node:crypto";
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
  let raw: string;
  try {
    const stat = await fs.stat(filename);
    if (stat.size > MAX_BYTES) throw new GoalAppCommandError("APP_GOAL_LEDGER_OVERSIZED");
    raw = await fs.readFile(filename, "utf8");
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return { ...INITIAL };
    throw error;
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

export async function goalAppCommand(
  stateDir: string, input: GoalAppInput, verifiedAuth: VerifiedAppCaller | undefined,
  remote: boolean,
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
  let lock: import("node:fs/promises").FileHandle;
  try { lock = await fs.open(lockPath, "wx", 0o600); }
  catch { throw new GoalAppCommandError("APP_GOAL_LOCK_BUSY_NO_REPLAY"); }
  try {
    const s = await loadState(filePath);
    if (input.action === "ON" && input.expectedRevision !== s.revision) {
      return { code: "APP_GOAL_REVISION_STALE", requestedMode: s.requestedMode,
        revision: s.revision, researchExecutionAuthorized: false, effectsIssued: 0 };
    }
    // OFF always fences an older ON. Repeated ON does not grant extra cycles.
    const next: IntentState = { schema: 1, requestedMode: input.action,
      revision: s.revision + (input.action === "OFF" || s.requestedMode !== "ON" ? 1 : 0),
      lastCommandId: randomUUID() };
    if (next.revision > Number.MAX_SAFE_INTEGER) {
      throw new GoalAppCommandError("APP_GOAL_REVISION_EXHAUSTED");
    }
    await saveState(filePath, next);
    return { code: "APP_GOAL_INTENT_RECORDED_ONLY", requestedMode: next.requestedMode,
      revision: next.revision, researchExecutionAuthorized: false,
      originalChatTurnAttested: false, effectsIssued: 0 };
  } finally {
    await lock.close();
    await fs.unlink(lockPath).catch(() => undefined);
  }
}
