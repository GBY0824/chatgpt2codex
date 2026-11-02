import { afterEach, describe, expect, it } from "vitest";
import { mkdtemp, mkdir, readFile, rm, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { goalAppCommand, type VerifiedAppCaller } from "./goal-app-intent.js";
import { createGoalStageReadOnlyHost } from "./goal-stage-readonly.js";

const dirs: string[] = [];
afterEach(async () => { for (const d of dirs.splice(0)) await rm(d, { recursive: true, force: true }); });
const auth: VerifiedAppCaller = {
  clientId: "synthetic-goal-app-owner",
  scopes: ["chatgpt2codex", "chatgpt2codex.goal"],
  expiresAt: Math.floor(Date.now()/1000)+3600,
  resource: new URL("http://127.0.0.1:7987/mcp"),
};
async function fixture() {
  const root=await mkdtemp(path.join(tmpdir(),"goal-stage-readonly-"));
  dirs.push(root);
  const research=path.join(root,"research");
  const state=path.join(root,"mcp-state");
  await mkdir(path.join(research,"docs"),{recursive:true});
  await mkdir(state,{recursive:true});
  return {root,research,state,stage:path.join(research,"docs","CURRENT_SYSTEM_STAGE.json")};
}
function stage(selected="P4R",p4="PENDING",p4r="ACTIVE",p3="COMPLETE") {
  return {schema_version:1,status:"ACTIVE",
    routing_override:{selected_work_item_id:selected},
    work_items:[
      {id:"P3",status:p3},{id:"P4R",status:p4r},{id:"P4",status:p4},
    ]};
}
describe("original MCP APP goal -> canonical Stage read-only host (no research)", () => {
  it("reveals live P4R blocker only after a distinct authenticated persisted APP ON",async()=>{
    const {research,state,stage:filename}=await fixture();
    const bytes=JSON.stringify(stage());
    await writeFile(filename,bytes);
    const host=createGoalStageReadOnlyHost(research);
    const on=await goalAppCommand(state,{action:"ON",expectedRevision:0},auth,true,host);
    expect(on).toMatchObject({
      code:"APP_GOAL_INTENT_RECORDED_ONLY",
      eventNotice:"APP_HOST_NOTIFIED_NO_EXECUTION",
      stageReadiness:"GOAL_STAGE_P4R_ACTIVE_P4_PENDING",
      researchExecutionAuthorized:false,originalChatTurnAttested:false,
      effectsIssued:0,
    });
    expect(await readFile(filename,"utf8")).toBe(bytes);
    const duplicate=await goalAppCommand(state,{action:"ON",expectedRevision:1},auth,true,host);
    expect(duplicate.code).toBe("APP_GOAL_ALREADY_ON_NO_REPLAY");
    expect(duplicate).not.toHaveProperty("stageReadiness");
    const off=await goalAppCommand(state,{action:"OFF"},auth,true,host);
    expect(off).toMatchObject({
      stageReadiness:"GOAL_APP_OFF_OBSERVED_NO_EXECUTION",
      researchExecutionAuthorized:false,effectsIssued:0,
    });
    expect(await readFile(filename,"utf8")).toBe(bytes);
  });

  it("P4 ACTIVE without an original P3 owner still cannot authorize research",async()=>{
    const f=await fixture();
    await writeFile(f.stage,JSON.stringify(stage("P4","ACTIVE","COMPLETE")));
    const response=await goalAppCommand(f.state,{action:"ON",expectedRevision:0},
      auth,true,createGoalStageReadOnlyHost(f.research));
    expect(response).toMatchObject({
      stageReadiness:"GOAL_STAGE_P4_OBSERVED_P3_PERMISSION_MISSING",
      researchExecutionAuthorized:false,effectsIssued:0,
    });
  });

  it("missing malformed and duplicated Stage entries never admit work",async()=>{
    const f=await fixture(), host=createGoalStageReadOnlyHost(f.research);
    let rev=0;
    async function run() {
      const out=await goalAppCommand(f.state,{action:"ON",expectedRevision:rev},auth,true,host);
      rev+=1;
      expect(out).toMatchObject({
        stageReadiness:"GOAL_STAGE_ROUTING_UNVERIFIED",
        researchExecutionAuthorized:false,effectsIssued:0,
      });
      await goalAppCommand(f.state,{action:"OFF"},auth,true,host);
      rev+=1;
    }
    await run();
    await writeFile(f.stage,"{broken");
    await run();
    await writeFile(f.stage,JSON.stringify({...stage(),work_items:[
      ...stage().work_items,{id:"P4",status:"ACTIVE"}]}));
    await run();
    await writeFile(f.stage,JSON.stringify({...stage(),routing_override:{selected_work_item_id:"UNKNOWN"}}));
    await run();
  });

  it("linked Stage file refuses rather than following alternate content",async()=>{
    const f=await fixture();
    const linked=path.join(f.root,"external-stage.json");
    await writeFile(linked,JSON.stringify(stage("P4","ACTIVE","COMPLETE")));
    await symlink(linked,f.stage,"file");
    const result=await goalAppCommand(f.state,{action:"ON",expectedRevision:0},auth,true,
      createGoalStageReadOnlyHost(f.research));
    expect(result.stageReadiness).toBe("GOAL_STAGE_ROUTING_UNVERIFIED");
    expect(result.researchExecutionAuthorized).toBe(false);
  });

  it("does not turn a foreign P4 state into authority when OAuth is absent",async()=>{
    const f=await fixture();
    await writeFile(f.stage,JSON.stringify(stage("P4","ACTIVE","COMPLETE")));
    await expect(goalAppCommand(f.state,{action:"ON",expectedRevision:0},
      undefined,true,createGoalStageReadOnlyHost(f.research)))
      .rejects.toMatchObject({code:"APP_GOAL_OAUTH_SCOPE_OR_AUTH_MISSING"});
  });
});
