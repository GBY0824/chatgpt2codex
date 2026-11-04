// CI-only: execute the compiled original MCP CLI's opt-in GOAL Stage
// diagnostic gate. Disposable local paths, no owner OAuth or real listeners.
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtemp, stat, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

if (process.argv.length !== 3) throw Error("SYNTHETIC_BUILD_ROOT_REQUIRED");
const root=path.resolve(process.argv[2]);
const cli=path.join(root,"dist","cli.js");
const temp=await mkdtemp(path.join(os.tmpdir(),"goal-stage-cli-preflight-"));
const rootProject=path.join(temp,"synthetic-research-workspace");
const state=path.join(temp,"never-created-state");
function run(args) {
  const res=spawnSync(process.execPath,[cli,"serve",...args],{
    cwd:root,encoding:"utf8",windowsHide:true,timeout:12000,
    env:{...process.env,CHATGPT2CODEX_CONTROL:"0"},
    maxBuffer:8192,
  });
  assert.equal(res.error,undefined);
  assert.equal(res.status,1,"STAGE_STARTUP_FENCE_MUST_FAIL_WITHOUT_AUTH");
  assert(!res.stderr.includes(temp),"must not leak private state path");
  return res.stderr;
}
const isolated=[
  "--http","--host","127.0.0.1","--port","49871",
  "--public-url","http://127.0.0.1:49871",
  "--isolated-state-dir",state,
];
async function absent() {
  await assert.rejects(()=>stat(state),{code:"ENOENT"});
}
try {
  assert.match(run([...isolated,"--goal-readonly-stage-check","false"]),
    /GOAL_READONLY_STAGE_FLAG_MUST_BE_BOOLEAN/);
  await absent();
  assert.match(run([...isolated,"--goal-readonly-stage-check"]),
    /GOAL_READONLY_STAGE_ABSOLUTE_WORKSPACE_REQUIRED/);
  await absent();
  assert.match(run([...isolated,"--workspace",rootProject,
    "--goal-readonly-stage-check"]),/no owner token found/);
  await absent();
  assert.match(run(["--stdio","--workspace",rootProject,
    "--goal-readonly-stage-check"]),/GOAL_READONLY_STAGE_REQUIRES_HTTP/);
  await absent();
  console.log(JSON.stringify({
    code:"SYNTHETIC_GOAL_STAGE_CLI_FAIL_CLOSED_PASS",
    falseStringCannotDisableFlag:true,
    absoluteOwnerWorkspaceRequired:true,
    noOAuthOrOwnerTokenMeansNoWrites:true,
    stdioCannotActivateGoalAppHost:true,
    researchExecutionAuthorized:false,
    originalChatTurnAttested:false,
    ownerStateRead:false,
    portOpened:false,
  }));
} finally {
  assert(path.basename(temp).startsWith("goal-stage-cli-preflight-"));
  await rm(temp,{recursive:true,force:true});
}
