// Synthetic policy tests only: this script NEVER inspects or changes an owner's PC,
// scheduled tasks, OAuth state, network, installation or service. It proves that
// a proposed migration plan fails closed when any known relaunch route is missed.
import assert from "node:assert/strict";

const liveMainTaskName = "ChatGPT To Codex MCP - Tailscale";
const requiredTasks = [
  liveMainTaskName,
  "ChatGPTToCodexEmergent-Watchdog",
  "ChatGPTToCodexMcpSelfHealing",
  "ChatGPTToCodexOAuthGuard",
];

function assess(plan) {
  const blockers = [];
  const block = (reason) => blockers.push(reason);
  if (plan.inventoryComplete !== true) block("SUPERVISOR_INVENTORY_INCOMPLETE");
  if (plan.otherAutostartRoutesExcluded !== true) block("UNKNOWN_RELAUNCH_ROUTE");
  if (plan.ownerQuiescenceApproval !== true) block("OWNER_QUIESCENCE_APPROVAL_REQUIRED");
  if (plan.ownerCutoverApproval !== true) block("OWNER_CUTOVER_APPROVAL_REQUIRED");
  if (plan.originalTaskEngineOwnerVerified !== true)
    block("LIVE_MAIN_TASK_ENGINE_OWNER_UNVERIFIED");
  if (plan.schedulerActionScanComplete !== true ||
      !Number.isSafeInteger(plan.enumeratedActions) || plan.enumeratedActions < 0 ||
      !Number.isSafeInteger(plan.enumeratedWscriptActions) || plan.enumeratedWscriptActions < 0 ||
      plan.enumeratedActions < plan.enumeratedWscriptActions ||
      plan.enumeratedWscriptActions < plan.enumeratedMatchingTaskCount)
    block("ACTION_SCAN_INCOMPLETE");
  if (plan.unparseableWscriptActions !== 0) block("ACTION_SCAN_UNPARSEABLE");
  // The three named candidates are NOT the whole universe. Read-only owner
  // inspection found seven scheduled actions pointing to the SAME script.
  // Never hardcode three (or seven) as a production complete-inventory count:
  // discover all task actions and demand a one-to-one snapshot.
  if (!Array.isArray(plan.tasks) || !Number.isInteger(plan.enumeratedMatchingTaskCount) ||
      plan.enumeratedMatchingTaskCount < requiredTasks.length ||
      plan.tasks.length !== plan.enumeratedMatchingTaskCount ||
      new Set(plan.tasks.map(t => t.name)).size !== plan.tasks.length ||
      requiredTasks.some(name => !plan.tasks.some(t => t.name === name))) {
    block("TASK_INVENTORY_NOT_EXACT");
  } else {
    for (const task of plan.tasks) {
      // Every same-script action must be examined, but a shared launcher
      // may implement an unrelated mode (OSINT, etc.). Blocking unrelated
      // owner workflows is not required when non-relaunch is independently
      // established. A matching script path or argument suffix is NOT proof
      // of active restart authority.
      if (task.presentVerified !== true || task.actionIdentityVerified !== true)
        block("TASK_IDENTITY_UNVERIFIED:" + task.name);
      if (task.name === liveMainTaskName) {
        // The live Task Scheduler EnginePID was independently correlated
        // with the original 7979 WScript ancestor. It is not optional and
        // cannot be relabeled as an unrelated OSINT/Tailscale action.
        if (task.routeRole !== "legacy-relauncher")
          block("LIVE_MAIN_TASK_MUST_REMAIN_LEGACY_RELAUNCHER");
        if (task.taskEngineInstanceStoppedVerified !== true)
          block("LIVE_MAIN_RUNNING_INSTANCE_NOT_STOPPED");
        if (task.restartSuppressionVerified !== true)
          block("LIVE_MAIN_RESTART_POLICY_NOT_SUPPRESSED");
        if (task.allScheduledTriggersDisabledVerified !== true)
          block("LIVE_MAIN_LOGON_TRIGGER_NOT_SUPPRESSED");
      }
      if (task.routeRole === "legacy-relauncher") {
        if (task.enabled === true || task.running === true || task.disabledVerified !== true)
          block("TASK_NOT_QUIESCED:" + task.name);
      } else if (task.routeRole === "verified-unrelated") {
        if (task.noLegacyRelaunchProof !== true || task.noSharedOAuthWriterProof !== true)
          block("UNRELATED_ROUTE_ISOLATION_UNVERIFIED:" + task.name);
      } else {
        block("TASK_RELAUNCH_ROLE_UNVERIFIED:" + task.name);
      }
    }
  }
  if (plan.startupEntryInspected !== true) block("STARTUP_ENTRY_NOT_INSPECTED");
  if (plan.startupEntryPresent === true && plan.startupEntryDisabledVerified !== true)
    block("STARTUP_RELAUNCH_STILL_POSSIBLE");
  if (plan.startupEntryPresent !== true && plan.startupEntryPresent !== false)
    block("STARTUP_ENTRY_PRESENCE_UNKNOWN");
  if (plan.allTriggersQuiescenceVerified !== true)
    block("TRIGGER_COVERAGE_UNVERIFIED");
  if (plan.listenerPidCount !== 0 || plan.oldWriterStopped !== true)
    block("LEGACY_WRITER_MAY_STILL_BE_RUNNING");
  if (plan.noRelaunchProbeVerified !== true)
    block("RELAUNCH_PREVENTION_NOT_OBSERVED");
  if (plan.releaseProvenancePinned !== true) block("CANDIDATE_PROVENANCE_UNVERIFIED");
  if (plan.oldProgramSnapshotVerified !== true) block("ORIGINAL_BACKUP_UNVERIFIED");
  if (plan.oauthIssuerAndStateIdentityPinned !== true) block("OAUTH_STATE_OWNER_UNVERIFIED");
  if (plan.privateStateBackupVerified !== true) block("OAUTH_STATE_BACKUP_UNVERIFIED");
  if (plan.rollbackRehearsed !== true) block("ROLLBACK_UNVERIFIED");
  if (plan.oldAndNewNeverShareLiveState !== true) block("DUAL_OAUTH_WRITER_RISK");
  return {
    syntheticPreconditionsMet: blockers.length === 0,
    blockers,
    // A synthetic fixture is NEVER a license to touch real port 7979.
    productionCutoverAuthorized: false,
  };
}

const approvedFixture = {
  inventoryComplete: true,
  otherAutostartRoutesExcluded: true,
  ownerQuiescenceApproval: true,
  ownerCutoverApproval: true,
  originalTaskEngineOwnerVerified: true,
  // Seven is just this synthetic fixture's size, not a production assumption.
  enumeratedActions: 236,
  enumeratedWscriptActions: 9,
  unparseableWscriptActions: 0,
  schedulerActionScanComplete: true,
  enumeratedMatchingTaskCount: 7,
  tasks: [...requiredTasks, "SyntheticSharedRouteA", "SyntheticSharedRouteB",
    "SyntheticSharedRouteC"].map(name => ({
    name, presentVerified: true, actionIdentityVerified: true,
    routeRole: "legacy-relauncher", noLegacyRelaunchProof: false,
    noSharedOAuthWriterProof: false,
    taskEngineInstanceStoppedVerified: true,
    restartSuppressionVerified: true,
    allScheduledTriggersDisabledVerified: true,
    enabled: false, running: false, disabledVerified: true,
  })),
  startupEntryInspected: true,
  startupEntryPresent: true,
  startupEntryDisabledVerified: true,
  allTriggersQuiescenceVerified: true,
  listenerPidCount: 0,
  oldWriterStopped: true,
  noRelaunchProbeVerified: true,
  releaseProvenancePinned: true,
  oldProgramSnapshotVerified: true,
  oauthIssuerAndStateIdentityPinned: true,
  privateStateBackupVerified: true,
  rollbackRehearsed: true,
  oldAndNewNeverShareLiveState: true,
};
// Separate positive synthetic model: unrelated modes may remain Running
// ONLY when static/runtime evidence positively excludes both 7979 relaunch
// and concurrent writes to the legacy OAuth state. This is NOT a factual
// classification of any real owner task; no real tasks are touched.
const isolatedModeFixture = structuredClone(approvedFixture);
for (const task of isolatedModeFixture.tasks.slice(4)) {
  task.routeRole = "verified-unrelated";
  task.noLegacyRelaunchProof = true;
  task.noSharedOAuthWriterProof = true;
  task.running = true;
  task.enabled = true;
  task.disabledVerified = false;
}
assert.equal(assess(isolatedModeFixture).syntheticPreconditionsMet, true);

const scenarios = [
  ["WATCHDOG_ACTIVE", p => { p.tasks[1].enabled = true; }, "TASK_NOT_QUIESCED:ChatGPTToCodexEmergent-Watchdog"],
  ["LIVE_MAIN_RUNNING", p => { p.tasks[0].running = true; }, "TASK_NOT_QUIESCED:ChatGPT To Codex MCP - Tailscale"],
  ["LIVE_MAIN_TASK_ENGINE_UNVERIFIED", p => { p.originalTaskEngineOwnerVerified = false; }, "LIVE_MAIN_TASK_ENGINE_OWNER_UNVERIFIED"],
  ["LIVE_MAIN_ENGINE_STILL_ACTIVE", p => { p.tasks[0].taskEngineInstanceStoppedVerified = false; }, "LIVE_MAIN_RUNNING_INSTANCE_NOT_STOPPED"],
  ["LIVE_MAIN_RESTARTS_NOT_SUPPRESSED", p => { p.tasks[0].restartSuppressionVerified = false; }, "LIVE_MAIN_RESTART_POLICY_NOT_SUPPRESSED"],
  ["LIVE_MAIN_LOGON_TRIGGER_ACTIVE", p => { p.tasks[0].allScheduledTriggersDisabledVerified = false; }, "LIVE_MAIN_LOGON_TRIGGER_NOT_SUPPRESSED"],
  ["LIVE_MAIN_FALSIFIED_AS_UNRELATED", p => { p.tasks[0].routeRole = "verified-unrelated"; p.tasks[0].noLegacyRelaunchProof = true; p.tasks[0].noSharedOAuthWriterProof = true; }, "LIVE_MAIN_TASK_MUST_REMAIN_LEGACY_RELAUNCHER"],
  ["LIVE_MAIN_TASK_OMITTED", p => { p.tasks.shift(); p.enumeratedMatchingTaskCount -= 1; }, "TASK_INVENTORY_NOT_EXACT"],
  ["SECOND_WATCHDOG_ACTIVE", p => { p.tasks[2].running = true; }, "TASK_NOT_QUIESCED:ChatGPTToCodexMcpSelfHealing"],
  ["DISABLED_GUARD_UNVERIFIED", p => { p.tasks[3].disabledVerified = false; }, "TASK_NOT_QUIESCED:ChatGPTToCodexOAuthGuard"],
  ["SHARED_SCRIPT_BUT_UNVERIFIED_IDENTITY", p => { p.tasks[1].actionIdentityVerified = false; }, "TASK_IDENTITY_UNVERIFIED:ChatGPTToCodexEmergent-Watchdog"],
  ["UNKNOWN_TASK", p => { p.tasks[3].name = "DifferentTask"; }, "TASK_INVENTORY_NOT_EXACT"],
  ["FOURTH_ROUTE_ENABLED", p => { p.tasks[4].enabled = true; }, "TASK_NOT_QUIESCED:SyntheticSharedRouteA"],
  ["SEVENTH_ROUTE_RUNNING", p => { p.tasks[6].running = true; }, "TASK_NOT_QUIESCED:SyntheticSharedRouteC"],
  ["HIDDEN_ROUTE_OMITTED", p => { p.tasks.pop(); }, "TASK_INVENTORY_NOT_EXACT"],
  ["WRONG_SHARED_SCRIPT_COUNT", p => { p.enumeratedMatchingTaskCount = 3; }, "TASK_INVENTORY_NOT_EXACT"],
  ["UNPARSEABLE_ACTION", p => { p.unparseableWscriptActions = 1; }, "ACTION_SCAN_UNPARSEABLE"],
  ["INCOMPLETE_ACTION_SCAN", p => { p.schedulerActionScanComplete = false; }, "ACTION_SCAN_INCOMPLETE"],
  ["MISSING_TOTAL_ACTION_COUNT", p => { delete p.enumeratedActions; }, "ACTION_SCAN_INCOMPLETE"],
  ["MISSING_WSCRIPT_ACTION_COUNT", p => { delete p.enumeratedWscriptActions; }, "ACTION_SCAN_INCOMPLETE"],
  ["NEGATIVE_ACTION_COUNT", p => { p.enumeratedActions = -1; }, "ACTION_SCAN_INCOMPLETE"],
  ["IMPOSSIBLE_MATCH_COUNT", p => { p.enumeratedWscriptActions = 6; }, "ACTION_SCAN_INCOMPLETE"],
  ["UNKNOWN_TASK_ROLE", p => { p.tasks[5].routeRole = "unknown"; }, "TASK_RELAUNCH_ROLE_UNVERIFIED:SyntheticSharedRouteB"],
  ["FALSE_UNRELATED_CLAIM", p => { p.tasks[5].routeRole = "verified-unrelated"; }, "UNRELATED_ROUTE_ISOLATION_UNVERIFIED:SyntheticSharedRouteB"],
  ["STARTUP_ENTRY_STILL_ENABLED", p => { p.startupEntryDisabledVerified = false; }, "STARTUP_RELAUNCH_STILL_POSSIBLE"],
  ["UNINSPECTED_STARTUP", p => { p.startupEntryInspected = false; }, "STARTUP_ENTRY_NOT_INSPECTED"],
  ["UNKNOWN_AUTOSTART", p => { p.otherAutostartRoutesExcluded = false; }, "UNKNOWN_RELAUNCH_ROUTE"],
  ["SCHEDULER_TRIGGER_NOT_COVERED", p => { p.allTriggersQuiescenceVerified = false; }, "TRIGGER_COVERAGE_UNVERIFIED"],
  ["OLD_LISTENER_STILL_RUNNING", p => { p.listenerPidCount = 1; }, "LEGACY_WRITER_MAY_STILL_BE_RUNNING"],
  ["LEGACY_WRITER_NOT_STOPPED", p => { p.oldWriterStopped = false; }, "LEGACY_WRITER_MAY_STILL_BE_RUNNING"],
  ["NO_RELAUNCH_PROBE", p => { p.noRelaunchProbeVerified = false; }, "RELAUNCH_PREVENTION_NOT_OBSERVED"],
  ["UNPINNED_RELEASE", p => { p.releaseProvenancePinned = false; }, "CANDIDATE_PROVENANCE_UNVERIFIED"],
  ["UNVERIFIED_PROGRAM_BACKUP", p => { p.oldProgramSnapshotVerified = false; }, "ORIGINAL_BACKUP_UNVERIFIED"],
  ["UNKNOWN_OAUTH_ISSUER", p => { p.oauthIssuerAndStateIdentityPinned = false; }, "OAUTH_STATE_OWNER_UNVERIFIED"],
  ["NO_PRIVATE_STATE_BACKUP", p => { p.privateStateBackupVerified = false; }, "OAUTH_STATE_BACKUP_UNVERIFIED"],
  ["NO_ROLLBACK_PROOF", p => { p.rollbackRehearsed = false; }, "ROLLBACK_UNVERIFIED"],
  ["CONCURRENT_OLD_AND_NEW", p => { p.oldAndNewNeverShareLiveState = false; }, "DUAL_OAUTH_WRITER_RISK"],
  ["NO_QUIESCENCE_APPROVAL", p => { p.ownerQuiescenceApproval = false; }, "OWNER_QUIESCENCE_APPROVAL_REQUIRED"],
  ["NO_CUTOVER_APPROVAL", p => { p.ownerCutoverApproval = false; }, "OWNER_CUTOVER_APPROVAL_REQUIRED"],
  ["NOT_COMPLETE_INVENTORY", p => { p.inventoryComplete = false; }, "SUPERVISOR_INVENTORY_INCOMPLETE"],
];
const positive = assess(structuredClone(approvedFixture));
assert.equal(positive.syntheticPreconditionsMet, true);
assert.deepEqual(positive.blockers, []);
assert.equal(positive.productionCutoverAuthorized, false);
for (const [name, mutate, reason] of scenarios) {
  const sample = structuredClone(approvedFixture);
  mutate(sample);
  const result = assess(sample);
  assert.equal(result.syntheticPreconditionsMet, false, name);
  assert.ok(result.blockers.includes(reason), name + ": " + result.blockers.join(", "));
  assert.equal(result.productionCutoverAuthorized, false, name);
}
console.log("SYNTHETIC_MULTI_SUPERVISOR_CUTOVER_FENCE_PASS cases=" + (scenarios.length + 2) +
  " negativeCases=" + scenarios.length + " positiveFixtures=2");
console.log("productionCutoverAuthorized=false ownerHostTouched=false oauthRead=false tasksModified=false");
