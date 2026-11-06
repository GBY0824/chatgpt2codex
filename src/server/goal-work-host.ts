import { createHash } from "node:crypto";
import { promises as fs } from "node:fs";
import path from "node:path";
import { z } from "zod";
import { gzipSync } from "node:zlib";
import { GoalWorkError, type GoalWorkHost, type GoalWorkInput } from "./goal-work-command.js";
import { assertGoalWorkPath, readGoalWorkFile, verifyGoalWorkClosure, GOAL_WORK_PATHS, type GoalWorkConfig } from "./goal-work-pins.js";
import { goalWorkPrelude, goalWorkFinally, goalWorkFunctions, goalWorkPolicyProbe, psLiteral, runGoalPowerShell, type GoalPowerShellRunner } from "./goal-work-powershell.js";

const code = z.string().regex(/^[A-Z0-9_]{1,128}$/);
const ack = z.object({ code }).strict();
const preparedSingle = z.object({
  code: z.literal("GOAL_OWNER_WORK_SIGNATURE_REQUIRED"), opr: z.string().max(128),
  job_id: z.string().max(128), outputs: z.array(z.string().max(4096)).max(128),
  launch_args: z.array(z.string().max(4096)).max(128),
  signing_bytes_base64: z.string().min(1).max(49152).regex(/^[A-Za-z0-9+/]+={0,2}$/),
}).strict();
const preparedStep = preparedSingle.omit({ code: true, opr: true });
const preparedSequence = z.object({
  code: z.literal("GOAL_OWNER_WORK_SEQUENCE_SIGNATURE_REQUIRED"),
  maximum_steps: z.number().int().min(2).max(8), expiry_extended: z.literal(false),
  steps: z.array(preparedStep).min(2).max(8),
}).strict().refine(value => value.maximum_steps === value.steps.length
  && new Set(value.steps.map(step => step.job_id)).size === value.steps.length);
const prepared = z.union([preparedSingle, preparedSequence]);
const policy = z.object({ code: z.literal("GOAL_READY_POLICY_VERIFIED"), signer_fingerprint: z.string().regex(/^SHA256:[A-Za-z0-9+/]{43}$/) }).strict();
const supervisor = z.object({
  schema: z.literal(1), phase: z.literal("EXACT_SUPERVISOR_STARTED_NO_EXECUTION_PROOF"),
  requestSha256: z.string().regex(/^[a-f0-9]{64}$/), supervisorPid: z.number().int().positive(),
  supervisorStartedUtc: z.string().datetime({ offset: true }), retryAuthorized: z.literal(false),
  researchProofVerifiedByTransport: z.literal(false),
}).strict();
const receipt = z.object({
  schema: z.literal(1), requestSha256: z.string().regex(/^[a-f0-9]{64}$/),
  phase: z.enum(["SUPERVISOR_ADMITTED_BEFORE_START", "EXACT_SUPERVISOR_STARTED_NO_EXECUTION_PROOF", "ADMITTED_BEFORE_PROCESS_START", "EXACT_PROCESS_STARTED", "EXACT_PROCESS_EXIT_OBSERVED", "MCP_RESERVED_BEFORE_START"]),
  retryAuthorized: z.literal(false), pid: z.number().int().positive().optional(),
  processStartedUtc: z.string().datetime({ offset: true }).optional(),
  supervisorPid: z.number().int().positive().optional(), supervisorStartedUtc: z.string().datetime({ offset: true }).optional(),
  exitCode: z.number().int().optional(), responseAccepted: z.boolean().optional(),
  backendCode: code.nullable().optional(), researchProofVerifiedByTransport: z.literal(false).optional(),
}).passthrough();

type WorkHostEnvironment = {
  readonly config: GoalWorkConfig;
  readonly stateDir: string;
  readonly run: GoalPowerShellRunner;
  readonly verify: () => Promise<void>;
};

function decode<T>(raw: string, schema: z.ZodType<T>): T {
  try { return schema.parse(JSON.parse(raw)); }
  catch (error) {
    if (!(error instanceof Error)) throw error;
    throw new GoalWorkError("GOAL_WORK_ACK_INVALID_PRESERVE_NO_REPLAY", true);
  }
}

async function reserve(base: string, digest: string): Promise<void> {
  const filename = `${base}.mcp-attempt.json`;
  await assertGoalWorkPath(filename, true);
  try {
    const file = await fs.open(filename, "wx", 0o600);
    try { await file.writeFile(JSON.stringify({ schema: 1, phase: "MCP_RESERVED_BEFORE_START", requestSha256: digest, retryAuthorized: false }) + "\n"); await file.sync(); }
    finally { await file.close(); }
  } catch (error) {
    if (!(error instanceof Error)) throw error;
    throw new GoalWorkError("GOAL_WORK_ATTEMPT_EXISTS_OR_UNCONFIRMED_NO_REPLAY");
  }
}

async function observe(directory: string, digest: string): Promise<Record<string, unknown>[]> {
  const results: Record<string, unknown>[] = [];
  for (const suffix of ["mcp-attempt", "supervisor.attempt", "supervisor.started", "attempt", "started", "result"]) {
    const filename = path.join(directory, `${digest}.${suffix}.json`);
    try {
      const value = decode((await readGoalWorkFile(filename, 8192)).toString("utf8"), receipt);
      if (value.requestSha256 !== digest) throw new GoalWorkError("GOAL_WORK_RECEIPT_DIGEST_MISMATCH");
      // Return only bounded identity/terminal fields, never captured stdout/stderr or signable bytes.
      results.push({ phase: value.phase, ...(value.pid ? { pid: value.pid, processStartedUtc: value.processStartedUtc } : {}),
        ...(value.supervisorPid ? { supervisorPid: value.supervisorPid, supervisorStartedUtc: value.supervisorStartedUtc } : {}),
        ...(value.exitCode !== undefined ? { exitCode: value.exitCode, responseAccepted: value.responseAccepted, backendCode: value.backendCode } : {}) });
    } catch (error) {
      if (error instanceof Error && "code" in error && error.code === "ENOENT") continue;
      throw error;
    }
  }
  return results;
}

async function recoveryDirectory(attempts: string, digest: string): Promise<string> {
  const first = path.join(attempts, "recovery");
  const pendingCodes = new Set(["GOAL_PUBLICATION_STILL_RUNNING", "GOAL_EXISTING_WORKER_STILL_RUNNING"]);
  for (let index = 0; index < 64; index++) {
    const directory = index === 0 ? first : path.join(first, digest, String(index));
    const marker = path.join(directory, `${digest}.mcp-attempt.json`);
    try { await readGoalWorkFile(marker, 8192); }
    catch (error) {
      if (error instanceof Error && "code" in error && error.code === "ENOENT") return directory;
      throw error;
    }
    // Only a positively finished pending observation permits another observation.
    // Missing/failed/ambiguous processes retain their permanent no-replay fence.
    try {
      const previous = decode((await readGoalWorkFile(path.join(directory, `${digest}.result.json`), 8192)).toString("utf8"), receipt);
      if (previous.requestSha256 === digest && previous.phase === "EXACT_PROCESS_EXIT_OBSERVED"
          && previous.exitCode === 0 && previous.responseAccepted === true
          && typeof previous.backendCode === "string" && pendingCodes.has(previous.backendCode)) continue;
    } catch (error) {
      if (!(error instanceof Error && "code" in error && error.code === "ENOENT")) throw error;
    }
    throw new GoalWorkError("GOAL_WORK_ATTEMPT_EXISTS_OR_UNCONFIRMED_NO_REPLAY");
  }
  throw new GoalWorkError("GOAL_WORK_RECOVERY_OBSERVATION_BUDGET_EXHAUSTED");
}

function recoveryBody(config: GoalWorkConfig, request: string, directory: string, digest: string): string {
  // Reuse the existing supervisor/transport, with a fixed existing-checkpoint operation.
  const detached = goalWorkPrelude(config) + goalWorkFunctions() + `
Assert-LocalPath ${psLiteral(request)};Assert-LocalPath ${psLiteral(directory)}
$wire=[IO.File]::ReadAllBytes(${psLiteral(request)})
$i=[Diagnostics.ProcessStartInfo]::new();$i.FileName=${psLiteral(GOAL_WORK_PATHS.native)};$i.Arguments='--resume-checkpoint'
$i.WorkingDirectory=${psLiteral(path.win32.dirname(GOAL_WORK_PATHS.native))}
$null=Invoke-GoalReadySignedTransport -Info $i -Wire $wire -AttemptDirectory ${psLiteral(directory)} -ExpectedRequestSha256 '${digest}'
` + goalWorkFinally;
  const packed = gzipSync(Buffer.from(detached, "utf8")).toString("base64");
  return goalWorkFunctions() + `
$memory=[IO.MemoryStream]::new([Convert]::FromBase64String('${packed}'))
$zip=[IO.Compression.GZipStream]::new($memory,[IO.Compression.CompressionMode]::Decompress)
$reader=[IO.StreamReader]::new($zip,[Text.Encoding]::UTF8)
try{$detachedBody=$reader.ReadToEnd()}finally{$reader.Dispose();$memory.Dispose()}
Start-GoalReadyHiddenSupervisor -Body $detachedBody -RequestSha256 '${digest}' -AttemptDirectory ${psLiteral(directory)} | ConvertTo-Json -Compress
`;
}

/** Composition seam for isolated process-stub tests; never supplied by MCP input. */
export function composeGoalWorkHost(environment: WorkHostEnvironment): GoalWorkHost {
  const root = path.join(environment.stateDir, "goal-work");
  const attempts = path.join(root, "attempts");
  return async (input: GoalWorkInput) => {
    try {
      await environment.verify();
      await assertGoalWorkPath(root, true);
      const prelude = goalWorkPrelude(environment.config);
      switch (input.operation) {
        case "prepare": {
          // Preparation only emits owner review bytes; it never signs or starts work.
          // Like status, the native child requires explicit inheritable stdio
          // handles and the nested policy verifier can outlast 12 seconds.
          const raw = await environment.run(prelude + goalWorkPolicyProbe(GOAL_WORK_PATHS.native, "--prepare-owner-request") + goalWorkFinally, { timeoutMs: 30000 });
          return { ...decode(raw, prepared), effectsIssued: 0, signatureIssued: false, retryAuthorized: false };
        }
        case "status": {
          // This strictly read-only policy check starts a nested bounded PowerShell
          // verifier. Grant it a separate finite budget; dispatch and recover
          // retain their original 12-second no-replay execution budget.
          const raw = await environment.run(prelude + goalWorkPolicyProbe(GOAL_WORK_PATHS.native, "--check-policy") + goalWorkFinally, { timeoutMs: 30000 });
          const verified = decode(raw, policy);
          const receipts = input.requestSha256 ? await observe(attempts, input.requestSha256) : [];
          const recoveryReceipts: Record<string, unknown>[] = [];
          if (input.requestSha256) {
            const first = path.join(attempts, "recovery");
            for (let index = 0; index < 64; index++) {
              const directory = index === 0 ? first : path.join(first, input.requestSha256, String(index));
              const observed = await observe(directory, input.requestSha256);
              if (observed.length === 0) break;
              recoveryReceipts.push(...observed.map(value => ({ observation: index, ...value })));
            }
          }
          return { code: "GOAL_WORK_STATUS_OBSERVED", policyCode: verified.code, signerFingerprint: verified.signer_fingerprint,
            receipts, recoveryReceipts, effectsIssued: 0, retryAuthorized: false, researchProofVerifiedByTransport: false };
        }
        case "dispatch":
        case "recover": {
          const digest = input.requestSha256;
          if (!digest || !/^[a-f0-9]{64}$/.test(digest)) throw new GoalWorkError("GOAL_WORK_DIGEST_REQUIRED");
          const request = path.join(root, "inbox", `${digest}.signed.json`);
          const bytes = await readGoalWorkFile(request, 65536);
          const actual = createHash("sha256").update(bytes).digest("hex"); bytes.fill(0);
          if (actual !== digest) throw new GoalWorkError("GOAL_WORK_SIGNED_REQUEST_DIGEST_MISMATCH");
          const directory = input.operation === "recover" ? await recoveryDirectory(attempts, digest) : attempts;
          if (input.operation === "recover") {
            const prior = await observe(attempts, digest);
            if (!prior.some(value => value.phase === "EXACT_PROCESS_STARTED" || value.phase === "EXACT_PROCESS_EXIT_OBSERVED")) {
              throw new GoalWorkError("GOAL_WORK_ORIGINAL_PROCESS_RECEIPT_REQUIRED");
            }
          }
          await assertGoalWorkPath(directory, true);
          await fs.mkdir(directory, { recursive: true, mode: 0o700 });
          await assertGoalWorkPath(directory);
          await reserve(path.join(directory, digest), digest);
          const body = input.operation === "dispatch"
            ? `$global:LASTEXITCODE=0;& ${psLiteral(GOAL_WORK_PATHS.starter)} -SignedRequest ${psLiteral(request)} -AttemptDirectory ${psLiteral(directory)} -ExpectedHostSha256 '${environment.config.nativeSha256}' -ExpectedDispatcherSha256 '${environment.config.dispatcherSha256}' -ExpectedSignedRequestSha256 '${digest}'\nif($LASTEXITCODE -ne 0){throw 'GOAL_WORK_DISPATCH_UNCONFIRMED'}`
            : recoveryBody(environment.config, request, directory, digest);
          const value = decode(await environment.run(prelude + body + goalWorkFinally), supervisor);
          if (value.requestSha256 !== digest) throw new GoalWorkError("GOAL_WORK_ACK_DIGEST_MISMATCH", true);
          return { ...value, code: input.operation === "dispatch" ? "GOAL_WORK_DISPATCH_SUPERVISOR_STARTED" : "GOAL_WORK_RECOVERY_SUPERVISOR_STARTED" };
        }
        default: {
          const exhaustive: never = input.operation;
          throw new GoalWorkError(`GOAL_WORK_OPERATION_INVALID_${exhaustive}`);
        }
      }
    } catch (error) {
      if (error instanceof GoalWorkError) throw error;
      if (!(error instanceof Error)) throw error;
      throw new GoalWorkError("GOAL_WORK_LOCAL_STATE_UNVERIFIED_NO_REPLAY");
    }
  };
}

export async function createGoalWorkHost(config: GoalWorkConfig, stateDir: string): Promise<GoalWorkHost> {
  if (process.platform !== "win32") throw new GoalWorkError("GOAL_WORK_WINDOWS_REQUIRED");
  await verifyGoalWorkClosure(config);
  await runGoalPowerShell(goalWorkPrelude(config) + goalWorkFinally);
  return composeGoalWorkHost({ config, stateDir, run: runGoalPowerShell, verify: () => verifyGoalWorkClosure(config) });
}
