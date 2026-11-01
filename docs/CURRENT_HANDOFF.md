# CURRENT_HANDOFF — single-MCP GOAL integration / Runtime V3 research

## 2026-11-02 KST — NEWEST INDEPENDENT SOURCE CI CLOSED 3/3

**Fully VERIFIED code+workflow source SHA:**
`5c2f392ee2c74ae180e1407805143b650e164e56`,
[Actions 41362146220](https://github.com/GBY0824/chatgpt2codex/actions/runs/41362146220)
**COMPLETED SUCCESS across all 3 jobs**: Linux
`source-verification`, native Windows `windows-source-regressions`,
and macOS `macos-control-regressions`.
Read actual Linux and Windows job logs, not just job statuses:

- `SYNTHETIC_GOAL_CROSS_PROCESS_INTENT_EXCLUSION_PASS`
  on **BOTH Linux and Windows**, with **12 independent child
  processes, 4 winning ON intent records, 9 stale-or-busy
  rejected requests** (8 from concurrent contention + 1 preexisting
  foreign lock). `noEffectsAuthorized=true`,
  `originalConsumerTurnAttested=false`,
  `liveOwnerStateRead=false`, and
  `productionDeploymentApproved=false`.
- Windows
  `SYNTHETIC_MULTI_SUPERVISOR_CUTOVER_FENCE_PASS
  cases=50 negativeCases=48 positiveFixtures=2`.
- Windows validated round-trip downloaded bundle integrity:
  `DOWNLOADED_ARTIFACT_SHA256_VERIFIED files=3480`.
  This is an **uninstalled staged test artifact**, not a new
  version of original owner Windows 7979.
- Earlier repair-only SHA `1bddc0b4cde3801342bdb989e329fc983fad4fa4`
  [Actions 41361889807](https://github.com/GBY0824/chatgpt2codex/actions/runs/41361889807)
  also independently completed **SUCCESS 3/3**. The preceding
  intermediate TS2322 failures were fixed, not hidden.

**Production and GOAL trust boundary unchanged:** owner Windows
read-only latest query: original port `7979` one listener,
isolated port `7987` one listener, original main
`ChatGPT To Codex MCP - Tailscale` task **Running**. Nothing
was stopped, restarted, replaced, merged, scheduled or deployed.
No private OAuth state or tokens read; never run old v0.2.0
and candidate with shared live state. The actually installed
watchdog does NOT match saved GitHub research source, and
deployed relaunch dispatch remains unverified; a more detailed
owner local AST inspection request had been denied and was
not bypassed.

This user-requested conversation is **manual continuation**,
NOT an authenticated original consumer context-limit event.
Actual GOAL research executions still **0**, actual unattended
same-Project normal ChatGPT CHAT rollovers **0/2**. No synthetic
CI receipt substitutes for either.

**Next permitted safe work:** establish independently authorized
deployed watcher/launcher/WScript/Startup role provenance, private
OAuth issuer/state continuity and reversible migration gates,
then request a SEPARATE explicit owner production cutover approval.
Only afterward could one test real owner OAuth re-consent and
provider-attested ordinary consumer CHAT events/successor creation.
This commit updates documentation after the verified source CI and
itself may create a newer docs-only Actions run; always re-check
PR HEAD and exact run when resuming.

---


## 2026-11-02 KST — GOAL APP INTENT LOCK OWNERSHIP + 3-PROCESS RACE TEST

**Owner instruction:** proceed as far as safely possible in one
manual research turn, including authorized Codex inspection, GitHub
source/test/CI/docs. This is NOT a real unattended ChatGPT rollover.
Original installed 7979, isolated stage 7987, Windows Tasks and
OAuth/client state remain UNCHANGED; PR #1 stays DRAFT/UNMERGED.

**Previously pending CI now independently verified:**
PR prior source HEAD
`c9483eb98a4ecda67f72b512fe26bd78ea26d977`
[Actions 41361268300](https://github.com/GBY0824/chatgpt2codex/actions/runs/41361268300)
**COMPLETED SUCCESS Linux/Windows/macOS 3/3**. This includes the
new four-deployed-script artifact/behavior-identity synthetic cutover
fence from `321422388f6a48c6ae19e122e63afca65bfddc84`.
The deployed watchdog still **differs** from the saved GitHub research
script and actual relaunch modes remain unverified. No production
cutover is approved.

**New substantive source issue and fix:** the fork
`src/server/goal-app-intent.ts` GOAL app-level intent lock was
created exclusively with `wx` but its previous `finally` removed
the lock pathname unconditionally. An external process changing or
replacing the lock pathname while an authenticated GOAL intent
transaction was active could cause deletion of a foreign lock.
Candidate `withGoalIntentClaim` commit
`dcd919facb08c4817bd578324fc1f4daa0815fed`
now records a unique random nonce and file identity, verifies
file type + saved content + `dev`/`ino` before unlink, and on any
mismatch **does NOT remove the current lock** and instead reports
`APP_GOAL_LOCK_OWNERSHIP_LOST`. Crash or stale marker stays
fail-closed, manual owner recovery only. This remains a
*best-effort userspace check+unlink*, not atomic OS
unlink-by-handle. The older production MCP still does NOT honor
this or candidate `oauth-write.lock`.

New unit tests at `30ec36c6ab819587b4ef5d58d928276505034ebd`
cover normal cleanup, changed nonce on same inode,
different-inode replacement, missing marker and foreign-busy lock.
**Honest failure lineage:** intermediate
[Actions 41361809445](https://github.com/GBY0824/chatgpt2codex/actions/runs/41361809445)
and
[Actions 41361836196](https://github.com/GBY0824/chatgpt2codex/actions/runs/41361836196)
FAILED Linux typecheck TS2322: async callback widened a narrowed
`ON|OFF` input union to include `status`. Code
`1bddc0b4cde3801342bdb989e329fc983fad4fa4`
fixed it by creating a safely narrowed literal at the callback.
[Actions 41361889807](https://github.com/GBY0824/chatgpt2codex/actions/runs/41361889807)
**COMPLETED SUCCESS Linux/Windows/macOS 3/3**,
including actual native Windows focused test/build.

**New REAL INDEPENDENT NODE PROCESS, but SYNTHETIC STATE tests:**
Source script `scripts/verify-goal-intent-cross-process.mjs`
at `f02d615bfa660dd593383fb27773faa52e968a04`
spawns 3 actual Node processes per round × 4 rounds, all
attempting `ON` at expected revision 0 against disposable,
random OS temp GOAL state. Exactly one ON may commit; two
must be stale/busy. Another process must reject a stale marker
without deleting it or creating a ledger. Fixture uses synthetic
APP auth, not OAuth tokens, and absolutely **no real consumer
CHAT auth/GOAL effect**. Workflow
`5c2f392ee2c74ae180e1407805143b650e164e56`
runs this after candidate build on Linux AND Windows.
At first check [Actions 41362146220](https://github.com/GBY0824/chatgpt2codex/actions/runs/41362146220)
had Linux independent process step SUCCESS while Windows
had not yet reached that step; independently fetch latest job
and final 3/3 before claiming full new test success.

New documentation section
`docs/GOAL_APP_AUTH_REVIEW.md` added at
`38660eedffa3a482ae1f563caae3573b7351a196`
and updated with actual child-process test at
`a17a259d81e323fcf0701ffcbbe3b614d4b366e7`.
Do not confuse this Source CI result with original owner installed
`7979` code or stage migration.

**Next safe action:** verify exact SHA `5c2f392...`
Windows CI; if failure, diagnose step and add regression fix.
Then inventory actual installed watchdog/launcher dispatch behavior
only with independently permitted read-only provenance, respecting
the previously **denied** detailed Windows AST request and
never bypassing approval. Continue private OAuth issuer/state
identity and reversible cutover planning without touching
installation until separately approved. Original native
consumer Project CHAT event/turn attestation and actual
automatic successor creation remain UNAVAILABLE/UNPROVEN.
Actual GOAL research executions **0** and unattended rollover
**0/2** despite all synthetic tests.

---


## 2026-11-02 KST — PRIORITY SHIFT: INSTALLED WATCHDOG DIFFERS FROM SAVED GITHUB SOURCE

**This is a user-commanded CONTINUATION, not autonomous ChatGPT
rollover. All changes are PR #1 source/tests/docs only.** This is
the latest owner-machine evidence and supersedes earlier assumptions
that `freqtrade-mcp-research`'s saved `Watch-ChatGPTToCodexMcp.ps1`
represents the actual deployed Windows watchdog.

- Direct connected Codex **read-only** Windows check: installed
  `%LOCALAPPDATA%/ChatGPTToCodexMCP/Watch-ChatGPTToCodexMcp.ps1`
  Git blob SHA **DOES NOT MATCH** the GitHub `main` research blob
  `c553fe6d740e37bb949025a7d8e41f27b3093256`.
  Local file 29,747 bytes, UTF-8 BOM, about 702 lines, no CRLF,
  PowerShell AST ParserError count **0**. Repeat in-memory Git blob
  after CRLF normalization still mismatched. The installed main
  launcher script exists but a verified matching GitHub reference
  has not been identified. Exact local hashes were redacted by
  the connector and **were not published**.
- Static lexical check on installed watchdog source (without
  executing it) found **zero direct** `Start-ScheduledTask`,
  `Stop-ScheduledTask` and `Start-Process` references, but
  references to main Tailscale task, restart marker, mutex and
  health/OAuth/owner-token checks. The different *saved research*
  script has direct scheduled task start branches for missing or
  unhealthy original 7979. Thus neither the old saved branch
  behavior nor absence of indirect methods can be asserted about
  the installed code. A follow-up detailed command-tree analysis
  request was **blocked by connector approval**, not bypassed.
- Existing previous live proof still stands: original 7979
  Node→PowerShell→WScript, WScript EnginePID matches one Running
  `ChatGPT To Codex MCP - Tailscale` scheduled task (5 retries,
  1-minute interval); seven same-script scheduled action paths,
  but distinct action-argument modes, and other recurrent watchdogs
  and Startup entry remain uncertain re-launch candidates.
- **Source-only safety gate change**
  [321422388f6a48c6ae19e122e63afca65bfddc84](https://github.com/GBY0824/chatgpt2codex/commit/321422388f6a48c6ae19e122e63afca65bfddc84):
  synthetic multi-supervisor cutover plan now refuses unless all
  four current installed script roles (watchdog, main launcher,
  shared WScript dispatcher, Startup entry) have a **SHA-256 for the
  observed file matching the SHA of separately audited same bytes**,
  and verified behavior/dispatch/relaunch modes. Positive test
  fixture SHA values are **dummy synthetic**. Adds eight new
  fail-closed negative cases for missing/duplicated inventories,
  altered/unset hashes and unaudited modes. It remains a nonlive
  logical policy test and *never* authorizes production.
- New owner receipt:
  `docs/OWNER_WINDOWS_7979_STARTUP_EVIDENCE.md` at commit
  `a71745e6a951efe90a001eb1691f58f3e8e78495`.
  New migration safety decision:
  `docs/MCP_SINGLE_RUNTIME_MIGRATION.md` at commit
  `bda3397750a3d27620c588897967c0902674499c`.
- Prior HEAD `7aa34b01f87d7fc163034a5a7131c402bdaf5cea`,
  [Actions 41360405589](https://github.com/GBY0824/chatgpt2codex/actions/runs/41360405589),
  independently **COMPLETED SUCCESS 3/3** Linux/Windows/macOS.
  The NEW source SHA `321422388...` has
  [Actions 41361096184](https://github.com/GBY0824/chatgpt2codex/actions/runs/41361096184):
  source/macOS completed SUCCESS; Windows was **IN PROGRESS**
  at initial checkpoint. Check exact SHA's final outcome, not
  the prior CI receipt. New docs commits also trigger workflows.
- Actual installed original `7979` and isolated `7987` remain
  **untouched**; old installed v0.2.0 cannot share OAuth writer lock
  with new candidate. No process/task stop, browser effect, token
  read/rotation, installer update or new automation.
  **GOAL actual research executions 0; actual unattended ordinary
  consumer Project CHAT rollovers 0/2**.

**Next smallest authorized step:** verify new source gate CI, then
obtain safe positive local provenance/behavior review for the deployed
watchdog and wrapper without violating the connector's approval
denial. Until this is verified, require `UNKNOWN_RELAUNCH_ROUTE`
and NO production cutover. Preserve existing OAuth/client
connections and seek separately scoped owner approval before any
live task disable, state backup, installer, restart or switch.
After migration safety, original ChatGPT consumer turn attestation
and two unattended Project rollover proofs are still missing.

---


## 2026-11-02 KST — VERIFIED NEW INSPECTOR REPAIR CI / SAFE CURRENT RESUME

**Actual source & CI, newly independently confirmed:**
`3d1f34bd85f75a097b7c18fc208d01213873b457`,
[Actions 41360030141](https://github.com/GBY0824/chatgpt2codex/actions/runs/41360030141)
**COMPLETED SUCCESS 3/3** Linux, native Windows, macOS.
Actual Windows job log contains
`SYNTHETIC_WSCRIPT_EXECUTABLE_CLASSIFIER_CI_PASS`,
`ONE_MCP_STARTUP_READONLY_INVENTORY_CI_PASS`,
`SYNTHETIC_MULTI_SUPERVISOR_CUTOVER_FENCE_PASS
cases=42 negativeCases=40 positiveFixtures=2`, and
`DOWNLOADED_ARTIFACT_SHA256_VERIFIED files=3480`.
This closes the earlier *source-editing* PowerShell parser regression
seen in the accurately recorded FAILED runs 41359813513 /
41359827171 / 41359905203. It is NOT evidence of live owner-PC
rollover, production deployment or actual task stop/restart.

New owner-PC **read-only** listener check independently confirmed
**one listener each** at original port `7979` and isolated `7987`;
no PC state, credentials, Windows Tasks or installed binaries changed.
Do not run old v0.2.0 and new candidate against the same OAuth state.

**Current next gate:** securely identify the actual installed
watcher/launcher script provenance (file presence has been observed
but content identity NOT read or proven), then classify independent
relaunch routes and design owner-approved reversible quiescence.
The saved GitHub research-source watchdog CAN invoke
`Start-ScheduledTask` for missing/unhealthy old listener, but it
has not been proven byte-identical to the deployed watcher. After
explicit operating-system/credential-owner approval for live cutover,
prove old OAuth continuity and original native Project CHAT event
ingress. Actual GOAL research 0 and unattended rollovers 0/2.
**No work continues outside a user-triggered turn without an
actual automation/tool; this remains a manual GitHub handoff.**

---


## 2026-11-02 ~07:40 KST — CONTINUED: MAIN TASK RELAUNCH FENCE + WINDOWS PARSER REPAIR

**Follow-up user request was `이어서 진행해`. This is a manual next turn,
NOT an unattended ChatGPT rollover.** New work in fork DRAFT PR #1;
existing production 7979, isolated stage 7987, live Windows Tasks,
program installation, OAuth credentials/issuer and Chrome remain
**unchanged**. The real GOAL research execution count is still **0**;
ordinary ChatGPT Project CHAT unattended rollover **0/2**.

1. **Verified GitHub baseline:** previous PR HEAD
   `12ff8339c036c7aee9930fff8393e0ba99a55fba`,
   [Actions 41341924389](https://github.com/GBY0824/chatgpt2codex/actions/runs/41341924389),
   COMPLETED SUCCESS Linux/Windows/macOS **3/3** after the prior chat.
2. **Live Windows, safe owner read-only connector:** original 7979 still
   has exactly **one** listener, main
   `ChatGPT To Codex MCP - Tailscale` Task Scheduler status Running.
   Filename-presence-only check showed
   `Watch-ChatGPTToCodexMcp.ps1` and
   `Start-FixedTailscaleMcp.ps1` in the known local MCP launcher
   directory. No script bytes, secrets, OAuth state or task settings
   were read/modified. **This does not prove deployed script bytes
   equal any GitHub saved version.**
3. **Independent saved watchdog source analysis (not deployed evidence):**
   `GBY0824/freqtrade-mcp-research` `main` contains
   `tools/Watch-ChatGPTToCodexMcp.ps1`, blob
   `c553fe6d740e37bb949025a7d8e41f27b3093256`.
   That source calls `Start-ScheduledTask` for its main task on a
   missing 7979 listener or an unhealthy expected local MCP endpoint,
   the latter with a restart marker. Separate public-Funnel repair
   primarily changes Tailscale transport. A matching installed
   filename does NOT prove identical source/behavior; actual relaunch
   has NOT been induced or observed.
4. **Important safety omission fixed:** synthetic supervisor cutover
   policy had not REQUIRED the real live Tailscale main task by name.
   Code `aca982e7f5184f6515f1f35274fe7d7058bc97ff`
   now requires its known Task Scheduler EnginePID-owner association,
   treats it as non-optional legacy-relauncher, requires its running
   instance to be stopped and its 5-retry/startup trigger pathways
   suppressed. Missing/mislabeled/Running main task negative cases
   added. [Actions 41359438356](https://github.com/GBY0824/chatgpt2codex/actions/runs/41359438356)
   **COMPLETED SUCCESS 3/3** Linux/Windows/macOS;
   Windows printed `SYNTHETIC_MULTI_SUPERVISOR_CUTOVER_FENCE_PASS
   cases=42 negativeCases=40 positiveFixtures=2`, integrated 10-case
   Windows crash+FileShare PASS and sealed 3,480-file artifact
   checksum PASS. **Synthetic, not deployed or cutover permission.**
5. **Windows diagnostic parser issue found and repaired:**
   `Inspect-OneMcpStartupReadOnly.ps1` previously used
   `[IO.Path]::GetFileName` on external Task Scheduler
   `Action.Execute` metadata and could throw on invalid input.
   Source-only commit `7fc97030` introduced nonthrowing
   WScript executable classification; workflow `e0679e80` added
   9 pure synthetic test strings. Their initial Windows CI runs
   [41359813513](https://github.com/GBY0824/chatgpt2codex/actions/runs/41359813513),
   [41359827171](https://github.com/GBY0824/chatgpt2codex/actions/runs/41359827171)
   **FAILED** due a new editing error: ordinary JS
   `String.replace(old, replacementString)` expanded the embedded
   PowerShell regex's literal `$'` sequence as a special replacement
   token, duplicating/truncating the script and breaking its parser.
   This is **not** a live host or OAuth failure.
   **Repair commit**
   `3d1f34bd85f75a097b7c18fc208d01213873b457`
   restored the previously known-clean source at `12ff8339`
   and reapplied the classifier patch via **callback-based replacement**,
   with strict one-occurrence and structural checks. Matching
   [Actions 41360030141](https://github.com/GBY0824/chatgpt2codex/actions/runs/41360030141)
   was IN PROGRESS at original note; **check its exact Windows job
   before claiming this repair all-platform PASS**.
6. New detailed [owner startup evidence](./OWNER_WINDOWS_7979_STARTUP_EVIDENCE.md)
   and [one-MCP migration design](./MCP_SINGLE_RUNTIME_MIGRATION.md)
   describe strict source-vs-deployment provenance and required
   quiescence sequence. Previous known safe main_task/CI code SHA
   is `aca982e7` until the repaired classifier CI completes.

**Immediate next safe action:** fetch latest PR HEAD/Actions; if
`3d1f34b` Windows CI fails, inspect precise failing step and repair
with another regression, not guess. Then analyze real watchdog/Startup
mode effects only under separately permitted sanitized inspection.
Original live Task Scheduler EnginePID association with Tailscale is
known; independent watchdog re-launch capability remains unverified.
No live task disable, restart, install, OAuth read/rotation, merge,
new automation, browser effect, or automatic rollover proof.

---


## 2026-11-02 KST — NEW SOURCE INSPECTOR / INTEGRITY TESTS

New fork-only **read-only** diagnostic source
`scripts/Inspect-OneMcpStartupReadOnly.ps1` at
`33681c3d77a41556fce5b5bd139a58abe7db1331`
now compares current Scheduler COM running instance `EnginePID` to a
verified current WScript ancestor and rechecks listener/ancestor identity.
It reports only bounded safe booleans/counts, fails closed on inaccessible
Scheduler state, does not read process or task command lines or OAuth
tokens, and keeps **automatic relaunch safety and production cutover
authorization false**. The separate live Windows COM observation
already identified the Tailscale running instance; THIS new source has
not been deployed to that owner installation. Windows CI assertion
source `9f1bbb01bef23428cdc1b33137069a890a7430e7`
verifies bounded non-overclaim on disposable runner listener;
[Actions 41341851549](https://github.com/GBY0824/chatgpt2codex/actions/runs/41341851549)
was IN PROGRESS at checkpoint.

Also hardened synthetic supervisor policy at code
`61fde4b533cded581a2d49473b72272755be7290`:
refuses missing/negative/contradictory whole-scheduler scan counts,
with explicit new regression cases and accurate positive+negative
fixture total. Independently check
[Actions 41341693066](https://github.com/GBY0824/chatgpt2codex/actions/runs/41341693066)
before claiming source CI success.

All work remains draft PR source, tests and sanitized read-only
owner observations. Existing production 7979/staging 7987 and OAuth
state are untouched. Remaining: identify actual independent relaunch
behavior of recurrent watchdogs, prove OAuth issuer/state ownership
and private backup, obtain separate explicit live migration approval,
and independently demonstrate genuine authenticated original consumer
Project chat GOAL cycle and 2/2 unattended rollovers (still 0/2).

---

## 2026-11-02 KST — STRONG DIRECT LIVE OWNER MATCH: TASK SCHEDULER ENGINE PID

The original production 7979 process's `wscript.exe` ancestor was
compared **directly and read-only** against Windows Task Scheduler COM
`IRunningTask.EnginePID`. Two independent sanitized owner-host
queries established exactly **one** running
`ChatGPT To Codex MCP - Tailscale` task instance with
`EnginePID == live WScript ancestor PID`. Three other named
OSINT/watchdog/self-healing task queries had zero current running
instances and did not match. This **confirms the currently running
task-engine ↔ WScript process association**, previously unproven.
No raw PID, path, arguments, OAuth secrets or settings were emitted
or altered.

Relevant real task policy: Tailscale task has logon trigger,
`RestartCount=5`, `RestartInterval=PT1M`,
`ExecutionTimeLimit=PT0S`, `MultipleInstances=IgnoreNew`.
Separately recurring Emergent Watchdog and MCP SelfHealing tasks remain
Ready, with logon/time triggers and PT2M/PT5M limits, respectively.
Original process creation 2026-10-17 and scheduler LastRunTime
2026-10-29 remain different; do not conflate historical events.

Owner proof source [OWNER_WINDOWS_7979_STARTUP_EVIDENCE.md](./OWNER_WINDOWS_7979_STARTUP_EVIDENCE.md),
commit `86a43b1563c11c3ec20c3d00f5547b6ce91f5612`.
**Remaining real gap:** which additional watchdog/Startup actions can
recreate the old 7979 writer after the proven Tailscale task is stopped;
there are 7 total same-script scheduler task actions in the complete
scan, of which 6 use distinct argument modes. Require role-specific,
privacy-preserving source examination and separate live cutover
authorization. Do not disable unrelated OSINT tasks merely because
they share a script, and never run two live writers on shared OAuth
state. GOAL real cycles 0, real unattended Project rollovers 0/2.

---

## 2026-11-02 KST — INVOCATION ROLE FINGERPRINT / OWNER SAFE HANDOFF

A further **on-PC sanitized read-only** comparison across all seven
same-script task actions found **7 distinct argument-mode groups**.
**Exactly one** task's normalized post-script arguments match the
live 7979 WScript ancestor: `ChatGPT To Codex MCP - Tailscale`,
currently Running. The other six tasks use different arguments.
This is a strong *invocation configuration* match, NOT proof of the
historical task launcher or present restart/kill control. In fact the
live WScript creation time was **2026-10-17 10:42:16 KST** while the
Tailscale task's **LastRunTime was 2026-10-29 15:02:09**, and its
last Task Result was nonzero `2147946720`. Do NOT equate these
events or disable it by inference. This is recorded in
[OWNER_WINDOWS_7979_STARTUP_EVIDENCE.md](./OWNER_WINDOWS_7979_STARTUP_EVIDENCE.md)
(doc commit `d4a2fad84a10cc994a88f5f4e0323067e1504b27`).

**Policy repair:** all seven action modes require explicit classification,
but disabling every task merely because it shares a script would risk
interfering with unrelated OSINT/Tailscale functions. Candidate source
commit `96ec8f15f78e9ca1691da12a140b506a926d2ba5`
now distinguishes `legacy-relauncher`, independently
`verified-unrelated` (requires both no legacy relaunch and no shared
OAuth writer proofs), and `unknown` (blocks). A separate synthetic
positive case verifies that genuinely independent tasks can remain
running; unsupported exclusions must fail closed. **Do not claim
current source CI PASS without checking the exact SHA's Windows job.**
[Actions 41341083967](https://github.com/GBY0824/chatgpt2codex/actions/runs/41341083967)
was IN PROGRESS at first check.

**Next required real evidence:** identify which task modes or additional
Startup routes can actually relaunch port 7979, through a bounded,
user-approved and sanitized read-only analysis of script behavior
and invocation modes. Do not read/print OAuth credentials. Only
quiesce proven legacy routes, with independently authorized service
cutover and rollback. No Windows process/task or OAuth changes made.
GOAL research executions = 0; real consumer unattended rollovers = 0/2.

---

## 2026-11-02 KST — IMPORTANT CORRECTION: 7 LIVE SCRIPT-MATCHING TASKS

A fresh, corrected **whole-Task-Scheduler** owner Windows read-only
comparison, not merely a task-NAME filter, scanned **234 tasks / 236
actions**, including **9 WScript actions**, **0** unparseable WScript
arguments, and **7** task actions matching the original 7979 live
WScript ancestor's exact normalized full script path. At the observed
instant, 3 matched tasks were Running, 2 Ready and 2 Disabled. The
earlier three-task inventory was **incomplete for cutover design**.
Neither these script-path matches nor task state proves which historical
launcher started original Node or that all 7 can independently restart it.
No raw script paths, arguments, credentials or user state were emitted;
no task or process changed.

The first broader scan also counted seven but logged exceptions on
other task executables, so a corrected non-throwing scan was run to
produce the authoritative complete counts above. A missing/unparsed
action must fail closed.

**Repair in fork review source**
[3bd9e8a](https://github.com/GBY0824/chatgpt2codex/commit/3bd9e8a489262c09d79bbbea779674a160b47564):
`scripts/verify-synthetic-supervisor-quiescence.mjs` now requires a
DYNAMIC verified task inventory whose length equals the observed
full-action scan. It specifically tests extra enabled/Running hidden
routes, missing/falsified counts and unparseable actions; never assumes
three known names exhaust the restart mechanisms. New detailed
[owner evidence](./OWNER_WINDOWS_7979_STARTUP_EVIDENCE.md) commit
`a543885857502873820a25ef691ed0d05bf5e715`.

**CI receipt:** earlier source/workflow test SHA
`4162ea1728d54793594e38a5dbb3153f2ce84053`,
[Actions 41340462559](https://github.com/GBY0824/chatgpt2codex/actions/runs/41340462559),
completed SUCCESS 3/3 for the *older three-task synthetic gate*.
That success does NOT validate the subsequently corrected dynamic
inventory. Check independent newer Actions
[41340759049](https://github.com/GBY0824/chatgpt2codex/actions/runs/41340759049)
for repair SHA `3bd9e8a`; it was in progress when checked.
Latest PR HEAD may differ because of documentation commits.

**Immediate safe next steps:** inspect the purpose/argument-mode of
ALL seven same-script task actions by strictly sanitized approved
read-only analysis, then inventory Startup/other launch routes; design
an owner-approved reversible quiescence and recovery plan with all
routes addressed. Do not stop, disable, install, merge, rotate OAuth,
or run the old v0.2.0 beside new shared-state writer. Actual GOAL
research executions 0; real unattended ChatGPT Project rollovers 0/2.

---

## 2026-11-02 KST — NEXT-CHAT RESUMPTION: SUPERVISOR CUTOVER SAFETY

**This section supersedes the earlier 03:53 checkpoint for new work.**
This is a fresh user-invoked chat after limit, not an automatic consumer
rollover. Production was not cut over.

- Baseline source/head `5148526506f663573772595ec91e164b8873e677`
  independently checked: Actions
  [41339034142](https://github.com/GBY0824/chatgpt2codex/actions/runs/41339034142)
  **COMPLETED SUCCESS 3/3** Linux/macOS/Windows.
- New independent real Windows read-only Codex inspection, under a
  tests-only project lease: one original 7979 listener PID; WScript ancestor
  still present. Two task supervisor candidates are both enabled,
  logon/time-triggered, use `IgnoreNew`: Emergent-Watchdog Ready,
  last successful 2026-11-02 04:09 KST, PT2M limit; McpSelfHealing
  Ready, last successful 04:08 KST, PT5M. The latter was briefly
  Running in an earlier snapshot. OAuthGuard Disabled with last run
  2026-09-14 16:04. No task, process, credential or program was modified.
- The previously proven exact shared WScript script path **does not**
  identify which task created the historical 2026-10-17 PID. An exploratory
  textual command-suffix comparison failed to match for all three, but
  differing quoting/invocation parameters make it unsuitable for unique
  owner attribution. Do not infer task-to-process identity.
- Source commit
  [8e809425](https://github.com/GBY0824/chatgpt2codex/commit/8e809425597560da1a9d0e32dffc769f9b998a6c)
  adds `scripts/verify-synthetic-supervisor-quiescence.mjs`: 21
  fail-closed *synthetic* negative cases plus 1 fully satisfied synthetic
  model; it explicitly **never authorizes production** or accesses Windows
  owner data. Workflow commit
  [4162ea17](https://github.com/GBY0824/chatgpt2codex/commit/4162ea1728d54793594e38a5dbb3153f2ce84053)
  runs the script on hosted Windows CI. Owner-evidence doc commit
  [991280e6](https://github.com/GBY0824/chatgpt2codex/commit/991280e616644725288f8d70f766a71aea8c71ec)
  records the new actual task observations.
- Target Actions
  [41340462559](https://github.com/GBY0824/chatgpt2codex/actions/runs/41340462559)
  was **IN PROGRESS** at this checkpoint: source+macOS succeeded,
  Windows had not completed. **Fetch final jobs and the first failing step
  if any; fix with a regression rather than retroactively declaring PASS.**
- Mandatory remaining gates: exact relaunch route coverage and a
  separately approved live quiescence/restore test; independently verified
  original issuer/state identity and private OAuth recovery; clear owner
  approval before touching any 7979 service/task/Startup/program or client
  registration; followed by original consumer ChatGPT event attestation
  and two unattended same-Project rollover observations. GOAL actual
  research executions **0**, genuine rollovers **0/2**.
- The original v0.2.0 does **not** honor new `oauth-write.lock`.
  Never let old and candidate write to the same live OAuth state.
  The synthetic policy's green result is NOT operational readiness.
- Next chat should read THIS section, inspect exact HEAD/latest CI,
  verify follow-up Windows route safely, and implement only approved
  changes. Refresh this handoff and private
  [research Issue #2](https://github.com/GBY0824/freqtrade-mcp-research/issues/2)
  at each milestone; keep PR #1 DRAFT / unmerged.

---


> **Canonical continuity file for new ChatGPT conversations.** This document is
> intentionally committed to the research branch so a fresh assistant can
> identify the goal, code, evidence, gates and exact next action. **Do not
> treat the SHA/run values below as live until verified against GitHub.**

## 2026-11-02 03:53 KST — CHAT LIMIT / NEXT CHAT MUST RESUME HERE

**Reason for checkpoint:** the user reports this ChatGPT conversation is at its
limit. This is a **GitHub-backed context handoff**, not a successful or automatic
rollover. New chat should act on GitHub state immediately without making the
user restate the research or previous results.

**Canonical GitHub locations:**
- Fork [GBY0824/chatgpt2codex](https://github.com/GBY0824/chatgpt2codex),
  branch `goal-app-auth-review-20261101`, draft/unmerged
  [PR #1](https://github.com/GBY0824/chatgpt2codex/pull/1).
- Chronological research audit and detailed findings:
  [GBY0824/freqtrade-mcp-research Issue #2](https://github.com/GBY0824/freqtrade-mcp-research/issues/2).
- This file plus [OWNER_WINDOWS_7979_STARTUP_EVIDENCE.md](./OWNER_WINDOWS_7979_STARTUP_EVIDENCE.md)
  and [MCP_SINGLE_RUNTIME_MIGRATION.md](./MCP_SINGLE_RUNTIME_MIGRATION.md).
- Exact PR HEAD when the checkpoint began:
  `055fe10e355d36f1bc0c5c85920097e1061bfa67`;
  [Actions 41338894626](https://github.com/GBY0824/chatgpt2codex/actions/runs/41338894626)
  had Linux/macOS **SUCCESS** and Windows **IN PROGRESS** at checkpoint.
  These are observed states, **not** a claim of a completed run.
  The present docs update will create a newer PR HEAD; fetch it and
  its latest CI rather than assuming this reference is current.
- Last conclusively checked code/test reference from the previous chat:
  `d7aa9eb0d3ea16d925ed7d0d5ddea4d651ff2644`,
  [Actions 41337482236](https://github.com/GBY0824/chatgpt2codex/actions/runs/41337482236),
  completed SUCCESS **3/3** Linux/Windows/macOS, with 10 synthetic
  Windows recovery cases and SHA-256 verification of 3,480 files.
  Later successful CI may exist; confirm rather than claim stale proof.

**Newly established direct, sanitized Windows evidence:**
- Original installed production `127.0.0.1:7979` runs `node.exe`
  under `powershell.exe` under `wscript.exe`, creation time
  **2026-10-17 10:42 KST**. Separate isolated stage uses port `7987`.
- Current-user Startup directory has `ChatGPTToCodexEmergent.cmd`.
  Relevant Task Scheduler tasks include
  `ChatGPTToCodexEmergent-Watchdog` and
  `ChatGPTToCodexMcpSelfHealing`: both Ready WScript launcher candidates
  with logon/time triggers and successful recent runs (2026-11-02
  03:34 and 03:33, result 0). `ChatGPTToCodexOAuthGuard` is disabled.
  Task Scheduler Operational logging is disabled, zero records.
- **Stronger independently recorded read-only Codex evidence:** the
  absolute normalized WScript script path of the live process's
  WScript ancestor exactly matches the action script path for all
  three named tasks. Only sanitized match booleans were returned, not
  raw paths/arguments/credentials. This identifies a **shared script**,
  **not** which task created the live PID, which task owns restart
  control, or whether the script receives the same arguments.
- Never disable/modify a guessed task or Startup item; multiple
  possible WScript-based relaunch mechanisms remain.
- No live Windows program/Task/credential/OAuth change or PR merge has
  been authorized or performed. Original legacy v0.2.0 does NOT
  honor candidate `oauth-write.lock`; old/new must never share a live
  OAuth state directory concurrently.

**Research goal (the project, not merely the MCP PR):**
Preserve one upgraded existing MCP + optional, explicitly authorized
GOAL scope while building event-driven autonomous research continuity
for ordinary ChatGPT Project chats from Android/other PCs, home Windows
receiver, limit detection, automatic same-Project successor chat creation,
context reconstruction and verified work resumption. Acceptance:
**two genuinely unattended, independently evidenced ChatGPT rollovers,
currently 0/2**. GOAL actual research executions remain **0**.
Previous OAuth, synthetic recovery and cross-process lock tests are
important safety engineering, not proof of the core rollover goal.

**Immediate next action sequence, with minimum user intervention:**
1. Fetch *current* PR #1 HEAD, this handoff, owner startup evidence and
   research Issue #2. Inspect new HEAD's GitHub Actions jobs and failures.
   If an actual source/CI defect exists, diagnose and fix with a test.
2. Reconcile exact WScript shared path evidence with the two active
   watchdog candidates. Design a **read-only, sanitized, approved**
   deterministic mapping of task invocation → process ancestry and
   restart behavior; **do not** infer the last launcher from recent
   task runs. Verify what is possible without changing live settings.
3. Build/test (in disposable Windows fixtures first) an *owner-authorized*,
   reversible old-writer shutdown and prevention of legacy auto-relaunch
   with monitoring of **all** real supervisors. Do not issue actual
   production stops or task changes without separate authorization.
4. Verify existing OAuth issuer/state owner using tightly scoped,
   approved private inspection; preserve OAuth registrations/client
   tokens without printing or uploading secrets. Plan a private
   rollback-safe state/installer cutover. Do not run `init` or rotate
   Owner Token during migration.
5. After explicit live-cutover authorization, prove real ChatGPT client
   continuity and then return to **authenticated original consumer
   Project CHAT event capture**, successor conversation handoff and two
   unattended rollovers.
6. On each completed milestone: **commit source + test**, verify actual
   CI, update this file and post exact SHA/run/blocked gates to private
   research Issue #2. Don't imply background work or 2/2 without evidence.

**If a connector reports approval required:** honor the refusal and
report exactly what remains blocked. Do not bypass protection or
invent results. Use this GitHub record to resume a new user-invoked chat.

---

## Where to pick up

- Review-source repository: [GBY0824/chatgpt2codex](https://github.com/GBY0824/chatgpt2codex), branch `goal-app-auth-review-20261101`, **draft and unmerged PR [#1](https://github.com/GBY0824/chatgpt2codex/pull/1)**. Original upstream: `ezBuilder/chatgpt2codex`. Do not silently merge to main or upstream.
- Durable private operational journal: [GBY0824/freqtrade-mcp-research, Issue #2](https://github.com/GBY0824/freqtrade-mcp-research/issues/2). Keep adding dated, source-SHA-pinned progress and next-step comments; do not treat old comments as latest evidence.
- Detailed constraints, CI and security proof boundaries: [MCP_SINGLE_RUNTIME_MIGRATION.md](./MCP_SINGLE_RUNTIME_MIGRATION.md).
- Existing owner Windows production: original v0.2.0 localhost **127.0.0.1:7979**, installed under `%LOCALAPPDATA%\Programs\ChatGPT To Codex`. Separate isolated test-source server **127.0.0.1:7987**; *do not promote this older installed stage* because it lacks newer build provenance. At last read-only listener check both were alive; PIDs can change.
- Original long-term research repository: `GBY0824/freqtrade-mcp-research`, Windows workspace `D:\freqtrade_mcp`. Preserve existing service/research/codex runtime; do not install this fork into it without independent owner approval.
- **NEW read-only evidence on REAL original Windows MCP lifecycle (2026-11-02):**
  [`OWNER_WINDOWS_7979_STARTUP_EVIDENCE.md`](./OWNER_WINDOWS_7979_STARTUP_EVIDENCE.md).
  Original port 7979 listener is `node.exe`, direct parent `powershell.exe`,
  next ancestor `wscript.exe`; the current-user Startup directory contains
  filename `ChatGPTToCodexEmergent.cmd`. This is direct **process ancestry
  plus a plausible startup entry**, NOT yet proven supervisor/cutover owner.
  The startup CMD was later checked for **boolean command-type
  patterns only**, not printed: it references PowerShell but did not
  directly mention WScript. No process command lines, task arguments
  or owner tokens were read. **13** scheduler task names matched the
  chatgpt/codex/mcp filter; two WScript-based watchdog/self-healing
  candidates are Ready with login/time triggers; an OAuth guard task
  is Disabled. This establishes MULTIPLE plausible supervisors and no
  unique owner. At 2026-11-02 03:33–03:34 local, both Ready tasks
  had recent successful runs (LastTaskResult=0), whereas original
  wscript/powershell/node process creation was **2026-10-17 10:42**.
  Task Scheduler Operational logging is **disabled** with zero records,
  so the original start-event identity cannot be reconstructed there.
  Expanded read-only source inventory now also counts WScript candidate
  tasks that completed successfully in the previous 15 minutes, but
  **never assigns ownership** from timing alone. No task arguments,
  process command lines, private OAuth state or configuration changes.
  Do not disable startup or scheduled tasks without cutover approval.
- **Codex owner PC follow-up (2026-11-02):** A sanitized in-memory
  comparison established the **exact normalized full WScript script
  path is identical across the live 7979 process ancestor and all
  three relevant Task Scheduler actions**, including two Ready
  recurring watchdogs and the Disabled OAuth guard. No raw paths,
  actions/command lines or tokens were printed. Therefore all three
  task definitions reference the same script; however task-to-PID
  historical launcher attribution, control behavior and arguments
  remain **unverified**. See
  [OWNER_WINDOWS_7979_STARTUP_EVIDENCE.md](./OWNER_WINDOWS_7979_STARTUP_EVIDENCE.md).
  User explicitly permits using connected Codex to retrieve PC
  facts. Favor scoped nonmutating private in-memory comparisons and
  return sanitized booleans, no raw credentials or commands.


## User's actual objective (nonnegotiable)

1. Build **one upgraded existing MCP**, not two permanently deployed MCPs.
2. Add opt-in GOAL intent/authority while preserving current useful MCP tools,
   original OAuth clients/permissions and Windows behavior.
3. Eventually enable ordinary ChatGPT Project chats, from Android/other PCs
   as well as Windows, to be detected in an always-on home Windows receiver.
4. Detect actual ChatGPT chat limit, move unattended to successor chat,
   restore current Project and detailed research context, and resume work.
5. Require **two real, independently verified unattended rollovers** for
   success. **Currently 0/2.** Successful synthetic CI, OAuth compatibility,
   and GOAL read-only scope **do not** count as actual rollover.
6. Write each meaningful source/test/decisions to GitHub and refresh this
   handoff + private Issue #2. Avoid user manual intervention when permission
   already exists. Do NOT schedule a periodic GOAL job to substitute for
   event-driven autonomous continuation.

## Verified progress (not project completion percentage)

- OAuth authorization-code+PKCE in isolated test and source-only GOAL
  read-only scope smoke proved; GOAL actual research execution remains **0**.
- Baseline original MCP tools/default contract and Linux/Windows/macOS
  regressions repeatedly pass on the fork.
- Candidate and original baseline OAuth JSON/client/token interfaces pass
  **synthetic cross-version** client, refresh-rotation and Owner Token hash
  tests without silently adding the GOAL scope to existing basic tokens.
- Existing malformed `oauth.json` no longer quietly resets clients:
  `JsonOAuthStore` only initializes empty on `ENOENT`. Owner-token CLI/init
  refuses bad state before rotating credentials or project writes.
- Windows integration **synthetic** path verifies concurrent transaction
  lock, force-exit recovery, Windows FileShare.None locked-file refusal,
  program-file SHA-pinned capture and new-folder restore even if old
  program folder was replaced or disappeared. Not real user-state rollback.
- New candidate cross-process OAuth writer lock `oauth-write.lock`: 3
  independent Node processes register 8 synthetic clients each, **24 retained**;
  stale lock blocks writes. This lock is **NOT honored by production v0.2.0**.
- **Latest FULLY VERIFIED code+workflow SHA:**
  `d7aa9eb0d3ea16d925ed7d0d5ddea4d651ff2644`,
  [GitHub Actions 41337482236](https://github.com/GBY0824/chatgpt2codex/actions/runs/41337482236)
  **COMPLETED SUCCESS Linux/Windows/macOS 3/3**. New read-only
  `Inspect-OneMcpStartupReadOnly.ps1` reports recent successful WScript
  task candidate COUNT and warns if two+ such candidates coexist, but
  always refuses to claim unique supervisor identity, actual legacy
  relaunch safety or production cutover authority. Windows synthetic
  process test `ONE_MCP_STARTUP_READONLY_INVENTORY_CI_PASS`,
  10 integrated synthetic Windows recovery cases, and post-upload/
  download `DOWNLOADED_ARTIFACT_SHA256_VERIFIED files=3480` all PASS.
  Sealed CI-only artifact ID `13096195606` (expires Nov 8 2026).
  **NOT installed**. Later docs-only HEAD commits do not imply fresh
  full CI runs; fetch current PR head and most recent matching workflow.
  Last source auth-lock proof [41334720405](https://github.com/GBY0824/chatgpt2codex/actions/runs/41334720405)
  passed Linux/Windows/macOS 3/3 with 7/7 tests, 24 synthetic OAuth
  client records, and 3,480 sealed files.
- **Latest writer-lock ownership repair:** every claim has a random nonce
  and file identity; cleanup refuses to delete a modified/replaced claim
  (`OAUTH_WRITE_LOCK_OWNERSHIP_LOST`). CI negative test demonstrates
  foreign marker remains and blocks the next write. This is best-effort
  validation, **not an atomic unlink-by-handle** guarantee.
- **Failure diagnosis already closed:** first ownership-regression CI
  [41334554024](https://github.com/GBY0824/chatgpt2codex/actions/runs/41334554024)
  failed on all three OS because Vitest default test timeout was 5 seconds,
  while the intended stale-lock refusal waits 5 seconds. Test timeout
  extended to 20 seconds in source SHA `d220dbbf`, followed by clean
  all-platform independent validation. Do not count the failed run as PASS.
- **Status freshness:** this handoff text is maintained on an active branch
  and a docs-only later commit may move its HEAD. Always fetch current
  PR HEAD/latest run and compare before reporting final CI status.

## The current source areas

- `src/auth/oauth-store.ts`: OAuth JSON schema, corrupted-file behavior,
  candidate cross-process writer claim and claim ownership check.
- `src/auth/oauth-store-failclosed.test.ts`: corruption + replaced-claim
  regressions.
- `scripts/verify-oauth-writer-lock.mjs`: 3 real child process writers /
  fail-closed stale lock in synthetic temp path only.
- `src/cli.ts`: init/owner-token preflight.
- `scripts/verify-corrupt-oauth-cli-rotation.mjs`: real compiled CLI
  against fake corrupted state and stale lock.
- `scripts/verify-legacy-auth-continuity.mjs`: baseline-vs-candidate
  ephemeral OAuth basic token compatibility.
- `.github/workflows/goal-app-auth-review.yml`: all-platform CI, review-only
  checksum-provenance staging bundle; never a production deployment.
- `docs/MCP_SINGLE_RUNTIME_MIGRATION.md`: migration gates and limitations.

## Immediate next work for the new chat

1. **Read current PR head, this file and the latest Issue #2 comments.**
   Check exact commit's GitHub Actions, all jobs, especially Linux+Windows
   writer-lock ownership test, synthetic stale lock CLI and archived
   3,480-file integrity. If failure, inspect log, reproduce in isolated
   temp fixture, correct and commit with a clear regression receipt.
2. Verify lock ownership protection across Windows filesystem semantics.
   Explicitly distinguish accidental replacement from adversarial
   time-of-check/time-of-unlink race: no atomic unlink-by-handle guarantee.
3. Audit potential stale lock handling on crash and failure, without
   automatically deleting foreign locks. Preserve existing user tokens.
4. **Actual original 7979 launch/supervision remains UNVERIFIED**
   although process ancestry, Startup CMD candidate and two actively
   recurring WScript watchdog task candidates are directly observed.
   Task Scheduler operational event history is disabled; do not assume
   the launch task from current LastRunTime. Any inspection of action
   arguments/process command lines, source script contents or private
   OAuth state requires separate owner-authorized scope and must never
   print secrets. Do not change/suspend either watchdog by guess.
   Pin issuer and exact state-path identity before cutover.
5. Complete a rollback-safe private program+config+OAuth continuity plan
   with real owner approval before **any** production port 7979 cutover.
   Old v0.2.0 ignores new lock: NEVER run old and new against same state
   simultaneously. No `init` or Owner Token rotation during migration.
6. Return eventually to real provider-confirmed original consumer ChatGPT
   turn/origin/successor Project rollover with **2/2** independent proofs.

## Operating guardrails and status reporting

- **No production effect** unless separately authorized: no stopping
  original 7979, no touching 7987 owner stage, no live program overwrite,
  no OAuth or token read/rotation, no public tunnel, no owner registry
  change, no automatic PR merge.
- **State != test:** source CI / simulated failure / sanitized read-only
  inspection is never equivalent to real end-to-end ChatGPT rollover.
- Keep records compact: exact commit SHA, file changed, test case count,
  matching GitHub Actions run+job result, known failure and repair, next
  blocker. Never claim background operation or a scheduled continuation
  without a real triggered automation.
- At each safe milestone: commit source/tests, validate CI, update this
  handoff **and** post a GitHub research Issue #2 checkpoint. On a new
  chat, read this file instead of relying on a long conversation recap.
