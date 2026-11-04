import { createHash } from "node:crypto";
import { promises as fs } from "node:fs";
import path from "node:path";
import { z } from "zod";
import { GoalWorkError } from "./goal-work-command.js";

const sha = z.string().regex(/^[a-f0-9]{64}$/);
export const goalWorkConfigSchema = z.object({
  schema: z.literal(1), enabled: z.literal(true),
  nativeSha256: sha, powershellSha256: sha, cmdSha256: sha,
  starterSha256: sha, dispatcherSha256: sha, transportSha256: sha,
}).strict();
export type GoalWorkConfig = Readonly<z.infer<typeof goalWorkConfigSchema>>;

/** The owner must separately review/install the entire protected closure. */
export const GOAL_WORK_PATHS = {
  native: "C:\\Program Files\\FreqtradeGoalReady\\GoalReadyHost.exe",
  powershell: "C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe",
  cmd: "C:\\Windows\\System32\\cmd.exe",
  starter: "C:\\Program Files\\FreqtradeGoalReady\\mcp-dispatch\\tools\\goal_ready_launcher\\Start-GoalReadySignedDispatch.ps1",
  dispatcher: "C:\\Program Files\\FreqtradeGoalReady\\mcp-dispatch\\tools\\goal_ready_launcher\\Invoke-GoalReadySignedDispatch.ps1",
  transport: "C:\\Program Files\\FreqtradeGoalReady\\mcp-dispatch\\tools\\p3_owner_launcher\\Prepare-P3OwnerEnrollment.ps1",
} as const;

export async function assertGoalWorkPath(filename: string, allowMissing = false): Promise<void> {
  if (!path.isAbsolute(filename) || filename.startsWith("\\\\") || path.resolve(filename) !== filename) {
    throw new GoalWorkError("GOAL_WORK_CANONICAL_LOCAL_PATH_REQUIRED");
  }
  let cursor = filename;
  for (;;) {
    try {
      const entry = await fs.lstat(cursor);
      if (entry.isSymbolicLink()) throw new GoalWorkError("GOAL_WORK_REPARSE_REFUSED");
      // realpath also detects Windows junctions/reparse redirects.
      if ((await fs.realpath(cursor)).toLowerCase() !== cursor.toLowerCase()) {
        throw new GoalWorkError("GOAL_WORK_REPARSE_REFUSED");
      }
    } catch (error) {
      if (!(allowMissing && error instanceof Error && "code" in error && error.code === "ENOENT")) throw error;
    }
    const parent = path.dirname(cursor);
    if (parent === cursor) return;
    cursor = parent;
  }
}

export async function readGoalWorkFile(filename: string, maximum: number): Promise<Buffer> {
  await assertGoalWorkPath(filename);
  const entry = await fs.lstat(filename);
  if (!entry.isFile() || entry.size < 1 || entry.size > maximum) throw new GoalWorkError("GOAL_WORK_FILE_SIZE_OR_TYPE");
  const raw = await fs.readFile(filename);
  if (raw.length < 1 || raw.length > maximum) throw new GoalWorkError("GOAL_WORK_FILE_SIZE_OR_TYPE");
  return raw;
}

export async function readGoalWorkConfig(filename: string): Promise<GoalWorkConfig> {
  const parsed = goalWorkConfigSchema.safeParse(JSON.parse((await readGoalWorkFile(filename, 4096)).toString("utf8")));
  if (!parsed.success) throw new GoalWorkError("GOAL_WORK_CONFIG_INVALID");
  return parsed.data;
}

export function goalWorkClosure(config: GoalWorkConfig): ReadonlyArray<readonly [string, string]> {
  return [
    [GOAL_WORK_PATHS.native, config.nativeSha256], [GOAL_WORK_PATHS.powershell, config.powershellSha256],
    [GOAL_WORK_PATHS.cmd, config.cmdSha256], [GOAL_WORK_PATHS.starter, config.starterSha256],
    [GOAL_WORK_PATHS.dispatcher, config.dispatcherSha256], [GOAL_WORK_PATHS.transport, config.transportSha256],
  ];
}

export async function verifyGoalWorkClosure(config: GoalWorkConfig): Promise<void> {
  for (const [filename, expected] of goalWorkClosure(config)) {
    const bytes = await readGoalWorkFile(filename, 64 * 1024 * 1024);
    if (createHash("sha256").update(bytes).digest("hex") !== expected) throw new GoalWorkError("GOAL_WORK_CLOSURE_PIN_MISMATCH");
  }
}
