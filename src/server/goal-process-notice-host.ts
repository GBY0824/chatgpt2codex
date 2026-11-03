/**
 * Explicit owner-selected process bridge from ONE existing MCP to the
 * separately governed Windows GoalEventEngine host. This does not deploy a
 * worker, attest native consumer CHAT turns, or authorize P3 execution.
 *
 * No network service or second MCP is created. Startup requires a pinned,
 * regular owner-selected adapter script and a fixed executable; requests
 * are supplied over stdin, never shell arguments or token-bearing logs.
 */
import { spawn } from "node:child_process";
import { createHash, createHmac } from "node:crypto";
import { promises as fs } from "node:fs";
import path from "node:path";
import type {
  GoalAppNoticeHost, GoalAppReadinessCode, PersistedGoalAppNotice,
} from "./goal-app-intent.js";

export interface GoalProcessHostConfig {
  projectRoot: string;
  stateDir: string;
  executable: string;
  script: string;
  scriptSha256: string;
  /** Explicit owner-provisioned IPC key, NEVER OAuth bearer or owner token. */
  bridgeKeyFile: string;
  /** Explicit canonical GoalEventEngine state under the research staging root. */
  engineStateFile: string;
}

const allowedReadiness = new Set<GoalAppReadinessCode>([
  "GOAL_APP_OFF_OBSERVED_NO_EXECUTION",
  "GOAL_STAGE_P4R_ACTIVE_P4_PENDING",
  "GOAL_STAGE_P4_OBSERVED_P3_PERMISSION_MISSING",
  "GOAL_STAGE_P4_OBSERVED_EXECUTION_UNVERIFIED",
  "GOAL_STAGE_ROUTING_UNVERIFIED",
]);

async function pinnedScript(config: GoalProcessHostConfig): Promise<void> {
  const root = path.resolve(config.projectRoot);
  const script = path.resolve(config.script);
  const engineState = path.resolve(config.engineStateFile);
  if (!path.isAbsolute(config.projectRoot) || !path.isAbsolute(config.script)
      || !path.isAbsolute(config.executable) || !path.isAbsolute(config.stateDir)
      || !path.isAbsolute(config.bridgeKeyFile)
      || !path.isAbsolute(config.engineStateFile)
      || !engineState.startsWith(path.join(root, "staging") + path.sep)
      || path.resolve(config.bridgeKeyFile) !== path.join(path.resolve(config.stateDir), "goal-process-bridge.key")
      || !/^[a-f0-9]{64}$/.test(config.scriptSha256)
      || !script.startsWith(root + path.sep)) {
    throw new Error("GOAL_PROCESS_HOST_OWNER_PIN_REQUIRED");
  }
  const [rootInfo, scriptInfo, executableInfo, keyInfo] = await Promise.all([
    fs.lstat(root), fs.lstat(script), fs.lstat(config.executable),
    fs.lstat(config.bridgeKeyFile),
  ]);
  if (!rootInfo.isDirectory() || rootInfo.isSymbolicLink()
      || !scriptInfo.isFile() || scriptInfo.isSymbolicLink()
      || scriptInfo.size > 1024 * 1024
      || !executableInfo.isFile() || executableInfo.isSymbolicLink()
      || !keyInfo.isFile() || keyInfo.isSymbolicLink() || keyInfo.size !== 32) {
    throw new Error("GOAL_PROCESS_HOST_FILE_UNVERIFIED");
  }
  const content = await fs.readFile(script);
  const after = await fs.lstat(script);
  if (after.dev !== scriptInfo.dev || after.ino !== scriptInfo.ino
      || after.size !== scriptInfo.size || after.mtimeMs !== scriptInfo.mtimeMs
      || createHash("sha256").update(content).digest("hex") !== config.scriptSha256) {
    throw new Error("GOAL_PROCESS_HOST_SOURCE_PIN_MISMATCH");
  }
}

async function deliver(
  config: GoalProcessHostConfig,
  notice: Readonly<PersistedGoalAppNotice>,
): Promise<GoalAppReadinessCode> {
  // Verify source pin again on EVERY event: no stale executable from a
  // replaced review candidate. The actual Python host must independently
  // recheck this MCP's durable intent ledger and its own P3 permission.
  await pinnedScript(config);
  // The host independently verifies this HMAC with its owner-provisioned
  // private IPC key AND checks the current durable intent ledger. This is
  // complementary to, NEVER a replacement for, HTTP OAuth scope checking.
  const body = JSON.stringify({
    schema: 1,
    notice,
    intentLedgerPath: path.join(config.stateDir, "goal-app-command-intent.json"),
    canonicalStagePath: path.join(config.projectRoot, "docs", "CURRENT_SYSTEM_STAGE.json"),
  });
  const key = await fs.readFile(config.bridgeKeyFile);
  if (key.length !== 32) throw new Error("GOAL_PROCESS_HOST_BRIDGE_KEY_INVALID");
  const signature = createHmac("sha256", key).update(body).digest("hex");
  key.fill(0);
  const envelope = JSON.stringify({ schema: 1, body, signature }) + "\n";
  if (Buffer.byteLength(envelope) > 4096) throw new Error("GOAL_PROCESS_HOST_ENVELOPE_TOO_LARGE");
  return await new Promise<GoalAppReadinessCode>((resolve, reject) => {
    const child = spawn(config.executable, [config.script, "--engine-state-file", config.engineStateFile,
      "--original-mcp-state-dir", config.stateDir], {
      cwd: config.projectRoot, shell: false,
      stdio: ["pipe", "pipe", "pipe"],
      windowsHide: true,
      // Do not inherit OAuth tokens or unrelated service credentials.
      env: Object.fromEntries([
        "PATH", "Path", "SystemRoot", "WINDIR", "TEMP", "TMP",
        "HOME", "USERPROFILE", "LANG", "LC_ALL",
      ].filter((key) => process.env[key] !== undefined)
         .map((key): [string, string] => [key, process.env[key]!]).concat([
          ["PYTHONDONTWRITEBYTECODE", "1"],
        ])),
    });
    let stdout = "";
    let stderrBytes = 0;
    let done = false;
    const finish = (error?: Error, result?: GoalAppReadinessCode) => {
      if (done) return;
      done = true;
      clearTimeout(timeout);
      if (error || !result) reject(error ?? new Error("GOAL_PROCESS_HOST_NO_ACK"));
      else resolve(result);
    };
    const timeout = setTimeout(() => {
      child.kill();
      finish(new Error("GOAL_PROCESS_HOST_TIMEOUT_RECONCILE"));
    }, 8000);
    child.stdout!.setEncoding("utf8");
    child.stdout!.on("data", (v: string) => {
      stdout += v;
      if (Buffer.byteLength(stdout) > 2048) {
        child.kill();
        finish(new Error("GOAL_PROCESS_HOST_RESPONSE_OVERSIZED"));
      }
    });
    child.stderr!.on("data", (v: Buffer) => {
      stderrBytes += v.length;
      // Never return stderr; it could contain sensitive local paths.
      if (stderrBytes > 8192) {
        child.kill();
        finish(new Error("GOAL_PROCESS_HOST_ERROR_OVERSIZED"));
      }
    });
    child.on("error", () => finish(new Error("GOAL_PROCESS_HOST_LAUNCH_FAILED")));
    child.on("close", (code: number | null) => {
      if (done) return;
      if (code !== 0) return finish(new Error("GOAL_PROCESS_HOST_UNVERIFIED_EXIT"));
      try {
        const result = JSON.parse(stdout) as Record<string, unknown>;
        if (result.schema !== 1 || result.effectsIssued !== 0
            || typeof result.code !== "string"
            || !allowedReadiness.has(result.code as GoalAppReadinessCode)
            || (notice.action === "OFF" &&
              result.code !== "GOAL_APP_OFF_OBSERVED_NO_EXECUTION")
            || (notice.action === "ON" &&
              result.code === "GOAL_APP_OFF_OBSERVED_NO_EXECUTION")) {
          return finish(new Error("GOAL_PROCESS_HOST_INVALID_ACK"));
        }
        // Older pinned hosts use this over-specific diagnostic. Keep their
        // acknowledgement compatible without asserting missing P3 authority.
        const readiness = result.code === "GOAL_STAGE_P4_OBSERVED_P3_PERMISSION_MISSING"
          ? "GOAL_STAGE_P4_OBSERVED_EXECUTION_UNVERIFIED" : result.code;
        finish(undefined, readiness as GoalAppReadinessCode);
      } catch {
        finish(new Error("GOAL_PROCESS_HOST_INVALID_JSON"));
      }
    });
    child.stdin!.on("error", () => {
      // A closed pipe is covered by nonzero exit / missing authenticated ACK.
    });
    child.stdin!.end(envelope);
  });
}

/** Startup opt-in; impossible to activate from MCP tool arguments. */
export async function createGoalProcessNoticeHost(
  config: GoalProcessHostConfig,
): Promise<GoalAppNoticeHost> {
  await pinnedScript(config);
  return async (notice) => {
    if (notice.source !== "OAUTH_SCOPED_APP_INTENT"
        || notice.originalChatTurnAttested !== false
        || notice.researchExecutionAuthorized !== false
        || !/^[a-f0-9]{64}$/.test(notice.clientFingerprint)) {
      throw new Error("GOAL_PROCESS_HOST_UNAUTHENTICATED_NOTICE");
    }
    return deliver(config, notice);
  };
}
