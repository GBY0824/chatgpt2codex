// Isolated cross-process GOAL APP-INTENT concurrency tests ONLY.
// No ChatGPT consumer turn is attested, no live OAuth file or task is read,
// and no actual GOAL research/work execution is authorized.
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { mkdtemp, readFile, writeFile, rm, stat } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";

if (process.argv.length < 3) throw Error("SYNTHETIC_BUILT_ROOT_REQUIRED");
const builtRoot = path.resolve(process.argv[2]);
const { goalAppCommand } = await import(
  pathToFileURL(path.join(builtRoot, "dist/server/goal-app-intent.js")).href
);
const prefix = "chatgpt2codex-goal-intent-cross-process-";
const auth = {
  clientId: "synthetic-goal-test-client",
  scopes: ["chatgpt2codex", "chatgpt2codex.goal"],
  resource: new URL("https://synthetic.example.test/mcp"),
  expiresAt: Math.floor(Date.now() / 1000) + 3600,
};
const localFile = "goal-app-command-intent.json";
if (process.argv[3] === "--worker") {
  const dir = process.argv[4];
  if (process.argv.length !== 5 || !path.isAbsolute(dir) ||
      !path.basename(path.dirname(dir)).startsWith(prefix)) {
    throw Error("SYNTHETIC_GOAL_WORKER_PATH_REJECTED");
  }
  try {
    const out = await goalAppCommand(dir, { action: "ON", expectedRevision: 0 }, auth, true);
    assert.equal(out.researchExecutionAuthorized, false);
    assert.equal(out.effectsIssued, 0);
    assert(["APP_GOAL_INTENT_RECORDED_ONLY", "APP_GOAL_REVISION_STALE"].includes(out.code));
    console.log("SYNTHETIC_GOAL_CHILD_RESULT:" + out.code);
  } catch (err) {
    if (err?.code !== "APP_GOAL_LOCK_BUSY_NO_REPLAY") throw err;
    console.log("SYNTHETIC_GOAL_CHILD_RESULT:" + err.code);
  }
} else {
  if (process.argv.length !== 3) throw Error("SYNTHETIC_GOAL_UNEXPECTED_ARGUMENTS");
  const temp = await mkdtemp(path.join(os.tmpdir(), prefix));
  async function worker(dir) {
    return await new Promise((resolve, reject) => {
      const child = spawn(process.execPath,
        [process.argv[1], builtRoot, "--worker", dir],
        { stdio: ["ignore", "pipe", "pipe"], windowsHide: true });
      let stdout = "", stderr = "";
      child.stdout.on("data", v => { stdout += v.toString().slice(0, 512); });
      child.stderr.on("data", v => { stderr += v.toString().slice(0, 512); });
      child.once("error", reject);
      child.once("close", code => {
        if (code !== 0) reject(Error("SYNTHETIC_GOAL_WORKER_EXIT_" + code + " " + stderr.slice(0, 400)));
        else {
          const codeLine = stdout.split(/\r?\n/).find(v => v.startsWith("SYNTHETIC_GOAL_CHILD_RESULT:"));
          if (!codeLine) reject(Error("SYNTHETIC_GOAL_WORKER_RESPONSE_INVALID"));
          else resolve(codeLine.replace("SYNTHETIC_GOAL_CHILD_RESULT:", "").trim());
        }
      });
    });
  }
  try {
    let recordedCount = 0, rejectedCount = 0;
    for (let iteration = 0; iteration < 4; iteration++) {
      const dir = path.join(temp, "synthetic-round-" + iteration);
      const codes = await Promise.all([worker(dir), worker(dir), worker(dir)]);
      assert.equal(codes.filter(code => code === "APP_GOAL_INTENT_RECORDED_ONLY").length, 1);
      assert.equal(codes.filter(code => code === "APP_GOAL_REVISION_STALE" ||
        code === "APP_GOAL_LOCK_BUSY_NO_REPLAY").length, 2);
      recordedCount++;
      rejectedCount += 2;
      const saved = JSON.parse(await readFile(path.join(dir, localFile), "utf8"));
      assert.equal(saved.requestedMode, "ON");
      assert.equal(saved.revision, 1);
      await assert.rejects(stat(path.join(dir, localFile + ".lock")), { code: "ENOENT" });
    }
    const dir = path.join(temp, "synthetic-stale");
    const lock = path.join(dir, localFile + ".lock");
    await (await import("node:fs/promises")).mkdir(dir);
    const foreign = '{"schema":1,"nonce":"synthetic-foreign-process-marker"}';
    await writeFile(lock, foreign, { flag: "wx", mode: 0o600 });
    assert.equal(await worker(dir), "APP_GOAL_LOCK_BUSY_NO_REPLAY");
    assert.equal(await readFile(lock, "utf8"), foreign);
    await assert.rejects(stat(path.join(dir, localFile)), { code: "ENOENT" });
    console.log(JSON.stringify({
      code: "SYNTHETIC_GOAL_CROSS_PROCESS_INTENT_EXCLUSION_PASS",
      independentProcesses: 12,
      winningOnRecords: recordedCount,
      staleOrBusyRejected: rejectedCount + 1,
      noEffectsAuthorized: true,
      originalConsumerTurnAttested: false,
      liveOwnerStateRead: false,
      productionDeploymentApproved: false,
    }));
  } finally {
    assert(path.basename(temp).startsWith(prefix));
    await rm(temp, { recursive: true, force: true });
  }
}
