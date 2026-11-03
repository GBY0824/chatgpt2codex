import { afterEach, describe, expect, it } from "vitest";
import { createHash, randomBytes } from "node:crypto";
import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { goalAppCommand, type VerifiedAppCaller } from "./goal-app-intent.js";
import { createGoalProcessNoticeHost, type GoalProcessHostConfig } from "./goal-process-notice-host.js";

const roots: string[] = [];
afterEach(async () => {
  for (const x of roots.splice(0)) await rm(x, {recursive: true, force: true});
});
const auth: VerifiedAppCaller = {
  clientId: "synthetic-owner", scopes: ["chatgpt2codex", "chatgpt2codex.goal"],
  expiresAt: Math.floor(Date.now() / 1000) + 3600,
  resource: new URL("http://127.0.0.1:7987/mcp"),
};
const adapter = `
import { readFileSync, appendFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { createHmac, timingSafeEqual } from "node:crypto";
let data = "";
for await (const chunk of process.stdin) data += chunk.toString();
const wire = JSON.parse(data);
const payload = JSON.parse(wire.body);
const key = readFileSync(join(dirname(payload.intentLedgerPath), "goal-process-bridge.key"));
const expected = createHmac("sha256", key).update(wire.body).digest("hex");
if (wire.schema !== 1 || typeof wire.signature !== "string"
    || wire.signature.length !== expected.length
    || !timingSafeEqual(Buffer.from(wire.signature,"hex"), Buffer.from(expected,"hex"))) {
  process.exit(8);
}
const ledger = JSON.parse(readFileSync(payload.intentLedgerPath, "utf8"));
const notice = payload.notice;
if (payload.schema !== 1 || ledger.lastCommandId !== notice.commandId
    || ledger.revision !== notice.revision
    || ledger.requestedMode !== notice.action
    || notice.originalChatTurnAttested !== false
    || notice.researchExecutionAuthorized !== false) {
  process.exit(9);
}
appendFileSync(join(dirname(payload.intentLedgerPath), "notice-count"), "1");
console.log(JSON.stringify({
  schema: 1, effectsIssued: 0,
  code: notice.action === "OFF" ?
    "GOAL_APP_OFF_OBSERVED_NO_EXECUTION" :
    "GOAL_STAGE_P4R_ACTIVE_P4_PENDING",
}));
`;
async function fixture(readiness = "GOAL_STAGE_P4R_ACTIVE_P4_PENDING") {
  const root = await mkdtemp(path.join(tmpdir(), "goal-process-bridge-"));
  roots.push(root);
  const research = path.join(root, "research");
  const state = path.join(root, "state");
  await mkdir(research); await mkdir(state);
  await mkdir(path.join(research,"staging"));
  const bridgeKeyFile=path.join(state,"goal-process-bridge.key");
  await writeFile(bridgeKeyFile,randomBytes(32));
  const script = path.join(research, "trusted-host.mjs");
  const source = adapter.replace("GOAL_STAGE_P4R_ACTIVE_P4_PENDING", readiness);
  await writeFile(script, source);
  const cfg: GoalProcessHostConfig = {
    projectRoot: research, stateDir: state, executable: process.execPath,
    script, scriptSha256: createHash("sha256").update(source).digest("hex"),
    bridgeKeyFile, engineStateFile:path.join(research,"staging","goal-engine-state.json"),
  };
  return {root, research, state, script, cfg};
}
describe("single original MCP -> owner-pinned GoalEventEngine process bridge", () => {
  it.each([
    "GOAL_STAGE_P4_OBSERVED_P3_PERMISSION_MISSING",
    "GOAL_STAGE_P4_OBSERVED_EXECUTION_UNVERIFIED",
  ])("reports %s as unverified execution, never an auth conclusion", async (code) => {
    const f = await fixture(code);
    const host = await createGoalProcessNoticeHost(f.cfg);
    const result = await goalAppCommand(f.state, {action:"ON", expectedRevision:0}, auth, true, host);
    expect(result).toMatchObject({
      stageReadiness:"GOAL_STAGE_P4_OBSERVED_EXECUTION_UNVERIFIED",
      researchExecutionAuthorized:false, originalChatTurnAttested:false, effectsIssued:0,
    });
  });
  it("forwards only committed authenticated distinct APP notices and fences OFF", async () => {
    const f = await fixture();
    const host = await createGoalProcessNoticeHost(f.cfg);
    const on = await goalAppCommand(f.state, {action:"ON", expectedRevision:0}, auth, true, host);
    expect(on).toMatchObject({
      code:"APP_GOAL_INTENT_RECORDED_ONLY",
      eventNotice:"APP_HOST_NOTIFIED_NO_EXECUTION",
      stageReadiness:"GOAL_STAGE_P4R_ACTIVE_P4_PENDING",
      researchExecutionAuthorized:false, effectsIssued:0,
    });
    const dupe = await goalAppCommand(f.state,{action:"ON",expectedRevision:1},auth,true,host);
    expect(dupe.code).toBe("APP_GOAL_ALREADY_ON_NO_REPLAY");
    const off = await goalAppCommand(f.state,{action:"OFF"},auth,true,host);
    expect(off.stageReadiness).toBe("GOAL_APP_OFF_OBSERVED_NO_EXECUTION");
    expect(await readFile(path.join(f.state,"notice-count"),"utf8")).toBe("11");
  });

  it("refuses missing OAuth scope without invoking owner process", async () => {
    const f = await fixture();
    const host = await createGoalProcessNoticeHost(f.cfg);
    await expect(goalAppCommand(f.state, {action:"ON",expectedRevision:0},
      {...auth,scopes:["chatgpt2codex"]},true,host))
      .rejects.toMatchObject({code:"APP_GOAL_OAUTH_SCOPE_OR_AUTH_MISSING"});
    await expect(readFile(path.join(f.state,"notice-count"),"utf8")).rejects.toThrow();
  });

  it("refuses replaced host script while preserving durable OFF and no replay",async()=>{
    const f = await fixture();
    const host = await createGoalProcessNoticeHost(f.cfg);
    await writeFile(f.script,adapter+"\n// changed after owner pin");
    const out = await goalAppCommand(f.state,{action:"OFF"},auth,true,host);
    expect(out).toMatchObject({
      code:"APP_GOAL_NOTICE_UNVERIFIED_RECONCILIATION_REQUIRED",
      requestedMode:"OFF",eventNotice:"UNVERIFIED",effectsIssued:0,
    });
    const persisted=JSON.parse(await readFile(path.join(f.state,"goal-app-command-intent.json"),"utf8"));
    expect(persisted.requestedMode).toBe("OFF");
  });

  it("rejects unpinned/untrusted executable and external script before startup",async()=>{
    const f=await fixture();
    await expect(createGoalProcessNoticeHost({...f.cfg,scriptSha256:"0".repeat(64)}))
      .rejects.toThrow("GOAL_PROCESS_HOST_SOURCE_PIN_MISMATCH");
    await expect(createGoalProcessNoticeHost({...f.cfg,script:path.join(f.root,"elsewhere.mjs")}))
      .rejects.toThrow("GOAL_PROCESS_HOST_OWNER_PIN_REQUIRED");
    await expect(createGoalProcessNoticeHost({...f.cfg,executable:"node"}))
      .rejects.toThrow("GOAL_PROCESS_HOST_OWNER_PIN_REQUIRED");
  });
});
