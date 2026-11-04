# Owner Windows 7979 startup — read-only observed evidence (2026-11-02 KST)

## 2026-11-02 KST — confirmed deployed watchdog/source mismatch (read-only)

Fresh direct owner-Windows `ChatGPT To Codex` bridge inspection,
under a tests-only lease; **NO process/task/Startup/OAuth/installation
changes**:

- GitHub research file
  `GBY0824/freqtrade-mcp-research` `main`
  `tools/Watch-ChatGPTToCodexMcp.ps1` has **Git blob SHA-1**
  `c553fe6d740e37bb949025a7d8e41f27b3093256`
  (read directly through the connected GitHub app).
- The **actually installed**
  `%LOCALAPPDATA%/ChatGPTToCodexMCP/Watch-ChatGPTToCodexMcp.ps1`
  is present, but its local `git hash-object` **DOES NOT MATCH**
  the above GitHub research blob. Local script is 29,747 bytes,
  UTF-8 BOM present, **no CRLF** in its decoded content.
  A second in-memory Git blob check with CRLF normalized still
  did not match. The installed script has ~702 lines and PowerShell
  parser reported **zero** syntax errors.
- The installed script includes references to the original main
  Tailscale task, a restart marker, local MCP and OAuth/owner-token
  health indicators, and a mutex. Pure source-only keyword counting
  returned **zero direct `Start-ScheduledTask`,
  `Stop-ScheduledTask` and `Start-Process` occurrences**.
  By contrast the GitHub research-file text contains two direct
  `Start-ScheduledTask` calls. Some `PublicProbeOnly` and
  `AuthProbeOnly` lexical probes did not match exact patterns
  in the installed source. This is **static presence/absence evidence
  only**, not a proof that indirect launcher APIs cannot restart the
  old process. Never assert exact installed restart predicates or
  absence of indirect execution from such text searches.
- The companion installed `Start-FixedTailscaleMcp.ps1` is present.
  Its Git blob fingerprint was computed locally without leaking source
  or arguments, but no independently matched GitHub reference was
  available. The shared WScript dispatch script and Startup CMD
  still require independent deployed-byte/behavior audit.
- A more extensive local syntax-tree command inventory request was
  **blocked by the connector's network/egress approval boundary**.
  It was **not** retried via a workaround, and no additional command
  inventory result is claimed.

**Consequence:** prior conclusions taken directly from GitHub's saved
`Watch-ChatGPTToCodexMcp.ps1` MUST NOT be promoted to the actual
deployed watchdog behavior. Even though `IRunningTask.EnginePID`
independently proves the existing 7979 WScript task instance is
associated with `ChatGPT To Codex MCP - Tailscale`, the remaining
independent relaunch effect paths are still unknown.

Candidate source-only synthetic migration gate was strengthened at
commit `321422388f6a48c6ae19e122e63afca65bfddc84`.
It now rejects any deployment transition without **four separately
audited, observed-versus-reviewed identical SHA-256 artifacts**:
deployed watchdog, main launcher, shared WScript dispatcher and
Startup entry. Each role additionally requires a positive behavioral
and relaunch-mode review, not just equal filenames or hashes. Tests
use synthetic fake hashes, **not** owner hashes, and never authorize
production cutover. Matching [CI run 41361096184](https://github.com/GBY0824/chatgpt2codex/actions/runs/41361096184)
was in progress on initial check; verify exact final jobs before
declaring new gates PASS.

GOAL actual research execution 0; unattended normal consumer
Project CHAT rollover 0/2. The original 7979/isolated 7987
installations remain unchanged.

---


## 2026-11-02 07:40 KST continuation — main task is mandatory, watchdog source remains unverified

Fresh owner-PC read-only connector check: exactly **one** original
`7979` listener; the registered task `ChatGPT To Codex MCP - Tailscale`
was **Running**. A separate read-only filename-existence check found
both `Watch-ChatGPTToCodexMcp.ps1` and `Start-FixedTailscaleMcp.ps1`
in the known `%LOCALAPPDATA%/ChatGPTToCodexMCP` directory. **No
file was opened or hashed**, no task configuration or OAuth state read
and no Windows program changed. Presence is NOT source-byte identity.

Independently, GitHub research repository
`GBY0824/freqtrade-mcp-research` `main`,
`tools/Watch-ChatGPTToCodexMcp.ps1` (Git blob
`c553fe6d740e37bb949025a7d8e41f27b3093256`) contains
`Start-ScheduledTask -TaskName $MainTaskName` in conditional branches
where the expected local 7979 listener is missing, or where its
expected process is present but the local protected MCP endpoint is
unhealthy. This saved source also uses a restart-marker path in the
second branch. Its `PublicProbeOnly` path primarily checks/repairs
Tailscale transport rather than starting the Task Scheduler job.
**This is research-source behavior, not proof the owner PC runs
these exact bytes or that an invocation has actually relaunched a
process.** Do not touch the local script merely to force a test.

The prior synthetic migration script omitted the real running main
Tailscale task from its required named-route list. This was corrected
at source commit `aca982e7f5184f6515f1f35274fe7d7058bc97ff`.
The review-only Windows CI for this precise SHA, [Actions 41359438356](https://github.com/GBY0824/chatgpt2codex/actions/runs/41359438356),
**COMPLETED SUCCESS 3/3** (Linux/Windows/macOS); verified Windows
job output:
`SYNTHETIC_MULTI_SUPERVISOR_CUTOVER_FENCE_PASS cases=42
negativeCases=40 positiveFixtures=2` and downloaded staged archive
`DOWNLOADED_ARTIFACT_SHA256_VERIFIED files=3480`.
The model now fails closed if the main task was omitted, mislabeled
unrelated, has a live engine, has an unblocked restart policy or logon
trigger, or if other relaunch/OAuth safeguards are absent.
**The approved synthetic fixture never grants production cutover.**

A separate source-only inspector fix,
`7fc97030d6c13afc576fd001f3667b5a527ab796`, no longer calls
`[IO.Path]::GetFileName` on arbitrary Task Scheduler
`Action.Execute` strings, which can throw on malformed external
task metadata and truncate classification. A pure synthetic string
classifier mode and a hosted Windows regression step were added in
`e0679e802432e810b7e363de64fbf8da5c5f5dc4`.
Corresponding [Actions 41359827171](https://github.com/GBY0824/chatgpt2codex/actions/runs/41359827171)
was **IN PROGRESS** at the original checkpoint. Re-check final CI
before claiming the follow-up fix is all-platform PASS.

This evidence does not prove that independent recurrent watchdogs
cannot re-create 7979 after the main task exits. Identifying deployed
watcher source identity and every re-launching mode, original private
OAuth issuer/state, and owner-approved reversible quiescence remain
strict prerequisites. GOAL executions still 0; real unattended CHAT
rollovers still 0/2.

---

## Scope

This is a *non-secret, read-only* evidence receipt for an existing single-MCP
migration gate. It is **not** authorization to alter the owner Windows host,
stop its running MCP, inspect process command-line parameters, read owner
credentials, start a second MCP against the same OAuth state, or merge PR #1.

## Direct observations from the owner Windows host

- TCP listener for original operational MCP: localhost
  `127.0.0.1:7979`.
- Current listener executable basename: **`node.exe`**.
- Its direct process parent basename: **`powershell.exe`**.
- The next known ancestor: **`wscript.exe`**.
- These three observed processes had creation hours around
  **2026-10-17 10:00 local Windows clock**.
- Windows Service CIM direct PID ownership check returned **false** for
  the Node listener PID. This does **not** prove that some other service,
  watchdog, task or script is not responsible for its lifecycle.
- Current user's Windows Startup folder contains a candidate entry
  named **`ChatGPTToCodexEmergent.cmd`**. The common/all-users Startup
  folder had no filename matching the MCP/ChatGPT/Codex filter.
- The Startup filename was observed without opening the file. A
  **separate later targeted read-only check** of that one CMD file
  checked **only boolean command-type patterns**: it mentions PowerShell
  and ChatGPT/Codex, but does not directly mention WScript. **No CMD
  contents, command arguments, file paths or tokens were printed.**
- Matching Windows Task Scheduler **task-name metadata only** revealed
  **13** task names related to ChatGPT/Codex/MCP; not all are necessarily
  owners of this 7979 process. For three relevant lifecycle candidates,
  task actions have executable basename `wscript.exe`. Two watchdog/
  self-healing tasks were in **Ready** state with logon and time triggers,
  and one authentication guard was **Disabled**. Neither task arguments
  nor task scripts were opened or printed. Ready != running.
- **Timestamp correlation (2026-11-02 03:33-03:34 local check):**
  the live listener's `node.exe`, parent `powershell.exe` and ancestor
  `wscript.exe` have process creation minute **2026-10-17 10:42**.
  The Ready scheduled task `ChatGPTToCodexEmergent-Watchdog` most
  recently ran at **2026-11-02 03:34**, LastTaskResult **0**. The Ready
  task `ChatGPTToCodexMcpSelfHealing` most recently ran at
  **2026-11-02 03:33**, LastTaskResult **0**. Both action executable
  basenames are `wscript.exe`. The Disabled `ChatGPTToCodexOAuthGuard`
  last ran on **2026-09-14 16:04**. These **current successes**, many
  days after the original process was created, indicate the two tasks
  remain recurring supervision candidates but **do not prove** they
  launched or currently control this exact PID.
- A targeted query for Task Scheduler operational event IDs 100/102/
  200/201 in the original start window **2026-10-17 10:40-10:45**
  returned zero records. A subsequent **read-only log-metadata check**
  verified that `Microsoft-Windows-TaskScheduler/Operational` logging is
  **disabled**, with `RecordCount=0`. Thus this log cannot corroborate
  historical supervisor identity. No logging setting was changed or
  enabled. Do not infer launcher identity from missing event logs.
- No process command-line, Task Scheduler action arguments, OAuth files,
  owner token values, startup settings or other service configuration
  was modified; no credentials were printed.

## What is and is not proven

The runtime process ancestry **`wscript.exe` -> `powershell.exe` ->
`node.exe`** is directly observed. The matching current-user Startup
filename is a plausible lifecycle candidate, **not proof** that this
specific .cmd starts this specific process chain. There are also
**multiple Ready WScript-based scheduled watchdog candidates**, so the
process's actual launcher/supervisor is **not uniquely established**.
Do not disable any task or Startup entry based solely on this evidence.
The precise initiating login item versus scheduler/watchdog remains
**UNVERIFIED** pending owner-authorized action/link examination.

The repo's `scripts/Inspect-OneMcpStartupReadOnly.ps1` was expanded
after this observation to output a bounded ancestry of executable
**basenames only** plus Startup candidate presence booleans, while
retaining `automaticStartupMechanismIdentified:false` and
`productionCutoverAuthorized:false`. The script and synthetic CI
may not claim specific owner startup identity based on a matching file
name. A current-user Startup entry cannot be safely deleted, modified
or disabled without separately approved live cutover.

## Direct process-to-task action comparison (Codex read-only, 2026-11-02)

The owner explicitly offered use of the connected Codex bridge for PC
information. A **read-only** on-PC comparison examined the original
7979 `wscript.exe` ancestor's command line and the registered action
arguments for `ChatGPTToCodexEmergent-Watchdog`,
`ChatGPTToCodexMcpSelfHealing` and the Disabled
`ChatGPTToCodexOAuthGuard`, **in memory only**. The response printed
no raw command line, action arguments, script paths, token values or
credentials, and made no changes.

**Observed:** a WScript-family filename (`.vbs`, `.vbe`, `.wsf`, `.js`,
or `.jse`) could be extracted from the active WScript command line
and from each of the three task action argument strings. Their
extracted **filenames match, case-insensitively, for all three**.
Therefore comparing the basename alone cannot distinguish the
original process launcher; multiple tasks may refer to a shared
filename or script family, and the Disabled guard's basename match
does not make it a running supervisor.

**Verified stronger read-only identity (second Codex query):** an
independent sanitized follow-up extracted absolute WScript script file
paths from the active original 7979 process ancestor and the three
named scheduled task action arguments **in local memory**, normalized
them case-insensitively, and returned `exactFullPathMatch=true`
for **all three**. It returned **zero raw paths or arguments**. All
three tasks thus reference the same full script file path as the
currently observed WScript ancestor, not just the same basename.

**Still not verified:** which task invocation at 2026-10-17 10:42
launched the process, which task has active PID supervision authority,
or whether all three invoke the shared script with identical options.
The Disabled OAuth guard's script-path match alone does not establish
that it currently runs. Historical Task Scheduler operational logging
is disabled. Do not disable tasks or edit launchers on the basis of
path identity alone. Exact script behavior/arguments remain unprinted
and unconfirmed. No service restarts, OAuth data access or production
changes were made.
## 2026-11-02 follow-up: current task policy, multiple re-launch routes (read-only)

An additional direct Windows inspection via the connected Codex bridge, with
a **tests-only lease** and no configuration or secret reads, independently
observed **exactly one** listener PID on 7979. The same listener's WScript
ancestor was present at this observation.

Current task metadata at the inspection instant:

| Task | State | Last successful local run | Trigger types | Multiple instances | Execution time limit |
| --- | --- | --- | --- | --- | --- |
| `ChatGPTToCodexEmergent-Watchdog` | Ready | 2026-11-02 04:09 KST | Logon + Time | IgnoreNew | PT2M |
| `ChatGPTToCodexMcpSelfHealing` | Ready | 2026-11-02 04:08 KST | Logon + Time | IgnoreNew | PT5M |
| `ChatGPTToCodexOAuthGuard` | Disabled | 2026-09-14 16:04 KST | Logon + Time | IgnoreNew | PT5M |

Both active watchdog candidates therefore remain configured to run again.
A momentary `Running` state was also directly observed for the self-healing
task before a subsequent `Ready` inspection; this transient observation
**is not evidence that it created or owns the original node PID**.

A bounded in-memory experiment compared textual argument suffixes after
the shared WScript script extension. All three task action suffixes failed
an exact textual match to the observed process suffix; the comparison is
**not a reliable normalized argument identity proof** (quoting, wrapper
options or different invocation parameters can all explain it). No raw
arguments, paths or secrets were emitted. Do NOT use this experiment as a
reason to disable a particular task.

NEW **source-only fail-closed policy rehearsal**:
`scripts/verify-synthetic-supervisor-quiescence.mjs` is executed on isolated
Windows CI by the review workflow. It rejects omitting either enabled
watchdog, the disabled-but-registered guard, current-user Startup,
unverified external launch mechanisms, missing re-launch observations,
a running old OAuth writer, unpinned original state/backups, or missing
owner approval. The test deliberately returns
`productionCutoverAuthorized=false` even for a perfect synthetic fixture.
It does NOT examine or disable real Windows tasks. Source commits
`8e809425597560da1a9d0e32dffc769f9b998a6c` and
`4162ea1728d54793594e38a5dbb3153f2ce84053`.
GitHub CI must be checked against the **latest** HEAD before any success claim.

### Full Task Scheduler action scan — correction to three-task assumption

A follow-up direct Windows read-only scan checked **234 task definitions**
and **236 task actions** without filtering by task name. There were
**9 WScript executable actions**, all 9 script argument paths parsed,
and **7 actions whose normalized full script path exactly equals the
original live 7979 WScript ancestor's script path**. At the instant of
the successful complete scan, **3** of those matching tasks were
Running, **2** Ready, and **2** Disabled. The WScript ancestor script
path was successfully parsed. No script path, action arguments, process
command lines, tokens or raw credentials were emitted. No changes.

An initial scan discovered seven matches but also raised exceptions for
other tasks with malformed executable strings. **Do not treat that initial
run as complete evidence.** The corrected independent full scan used a
non-throwing executable-name check; all 236 actions were examined,
with zero WScript argument parsing failures.

This disproves the assumption that only the three previously named
tasks can invoke the shared launcher: additional task action matches
include categories such as Tailscale/OSINT, and a further task name was
redacted by the connector. Exact script-path equality does NOT prove
that all seven launch or control the same old Node instance: they may
pass different arguments. But all seven require an explicit,
separately approved impact analysis before any quiescence/cutover plan.
The GitHub synthetic test was corrected in code commit
`3bd9e8a489262c09d79bbbea779674a160b47564` so its inventory size
is **dynamic**, not the former fixed three tasks; it rejects missing
extra actions and unparseable scans. Synthetic CI is not proof of
real task suppression.

**Consequence:** stopping only one plausible watchdog is not a safe
migration plan; stopping both without handling Startup and unenumerated
restart routes is also insufficient. Historical launcher attribution remains
unverified. Actual production stop/restart, live OAuth inspection, and any
task changes remain approval-gated.

### Argument-mode comparison across all seven shared-script task actions

A further bounded **in-memory, read-only** comparison normalized the text
after each task's quoted script path. All **7 tasks had distinct argument
suffix groups**. Only ONE task had the same normalized argument suffix
as the currently observed 7979 WScript ancestor:

- `ChatGPT To Codex MCP - Tailscale` — one exact normalized suffix match,
  state **Running** at the inspection instant.
- The other six matched the shared script path but did **not** match the
  original process's argument suffix. The watchdogs, OAuth Guard and
  OSINT-labeled actions therefore should **not** be presumed to be
  equivalent launches just because the launcher script path matches.

This is strong evidence for the *invocation configuration* of the
original WScript process. It is **not historical Task Scheduler start
event proof** or a demonstration of the supervisor/relaunch behavior.
The relevant Task Scheduler metadata also differs in time:
the WScript ancestor was created **2026-10-17 10:42:16 KST**,
whereas the Tailscale task's reported last run was
**2026-10-29 15:02:09 KST**, with a nonzero reported last task
result (`2147946720`) and Running state. The discrepancy prevents
claiming the latter last-run record launched the current process.

**Safety refinement:** A conservative cutover inventory must include
all seven same-script actions, but must NOT blindly disable unrelated
OSINT or other modes. Each mode must be classified with independent
evidence into *can relaunch the old 7979 writer*, *proven unrelated to
both legacy relaunch and shared OAuth writes*, or *unknown*. Unknown
fails closed. Only demonstrated legacy-relauncher tasks should be
quiesced under explicit owner approval.

The isolated CI model was revised in
`96ec8f15f78e9ca1691da12a140b506a926d2ba5` so a positively
verified unrelated synthetic task can remain running; unsupported
claims of unrelatedness are rejected. This is a model only.
No real script contents or task settings were changed and no raw
command lines, arguments, script paths, or token values were output.
Verify the revision's matching GitHub Actions workflow before
claiming PASS.

### Stronger live Task Scheduler instance proof: the original 7979 engine is Tailscale task-owned

A **read-only** Windows Task Scheduler COM `Schedule.Service` query retrieved
`GetInstances(0)` for the currently Running
`ChatGPT To Codex MCP - Tailscale` registered task, then compared the
running instance's `EnginePID` directly with the original 7979 listener
process's independently observed WScript ancestor PID **in memory**.
The result was `same=true` with exactly **one** running instance.
A second independent read-only check reproduced `same=true` for
Tailscale, while current `GetInstances(0)` counts for the named
OSINT/Watchdog/SelfHealing tasks were 0 and their comparisons false.
No PIDs, raw command lines, arguments, script paths or credentials
were emitted; none of these processes or tasks were changed.

**Interpretation:** the currently live original 7979 WScript ancestor
is confirmed to be the engine instance associated with the named
Tailscale scheduled task. This is much stronger **live process-to-task
association** than matching names, script paths, arguments or run times.
It does **not** by itself establish every independent watchdog that
could relaunch port 7979 after its process exits or the full program
impact of disabling these tasks. Task Scheduler historical Operational
logging remains disabled; Task LastRunTime disagreement must not be
silently reinterpreted as a historical start event.

Additional direct task SETTINGS metadata (read-only):
- `ChatGPT To Codex MCP - Tailscale`: Running; Logon trigger;
  `RestartCount=5`, `RestartInterval=PT1M`,
  `ExecutionTimeLimit=PT0S`, `MultipleInstances=IgnoreNew`.
- `ChatGPTToCodexEmergent-Watchdog`: Ready; Logon+Time triggers;
  `RestartCount=0`, `ExecutionTimeLimit=PT2M`.
- `ChatGPTToCodexMcpSelfHealing`: Ready; Logon+Time triggers;
  `RestartCount=0`, `ExecutionTimeLimit=PT5M`.

**Practical implication:** an eventual owner-approved migration must
account for the actually running Tailscale task instance and its
5 × 1-minute restart policy **as well as** independently recurring
watchdog and Startup routes. Disabling only one named watchdog
cannot establish safe quiescence. This is an inventory finding,
not permission to disable, stop or overwrite anything.

### Reproducible read-only source inspector (candidate only)

Source commit `33681c3d77a41556fce5b5bd139a58abe7db1331`
extends `scripts/Inspect-OneMcpStartupReadOnly.ps1` to perform a
read-only `IRunningTask.EnginePID` comparison **only when a verified
WScript ancestor exists**, checking that the original listener and
ancestor remain the same after scanning. New output fields are
`taskEngineInstanceScanCompleted`,
`liveWscriptTaskEngineMatchCount` and
`liveWscriptTailscaleInstanceMatch`. All default to false/zero and
any inaccessible scheduler metadata fails closed. The inspector
does **not** fetch or output process/task command lines, arguments,
raw process identifiers, private paths or OAuth data, and retains
`identifiedOwnerScheduledTask=false`,
`legacyAutoRelaunchSafetyVerified=false`, and
`productionCutoverAuthorized=false` because live instance identity
does not prove all independent restart mechanisms.

Workflow source commit `9f1bbb01bef23428cdc1b33137069a890a7430e7`
adds a hosted Windows synthetic listener assertion that any reported
Tailscale engine match must be backed by a complete scan and exactly
one match. This is **source-only**; the owner-PC installation was NOT
updated. Positive direct owner-host COM identity evidence is the
separately recorded read-only Codex query above. Check exact matching
GitHub Actions run status before reporting a new regression PASS.

## Next approval and safety gate

Before an in-place single-MCP upgrade, identify who actually supervises
the original PowerShell/WScript/Node process and how its PID is
stopped/restarted after reboot. Establish the original OAuth issuer,
existing-client state location and **private** recovery plan through
separately owner-approved read-only inspection. Preserve current legacy
`7979` and isolated `7987` processes and existing credentials.
Original v0.2.0 does **not** honor the candidate's `oauth-write.lock`
file: never run legacy and new candidate as concurrent writers to the
same state directory. No live cutover or authenticated ChatGPT-client
reconnection has occurred; genuine automatic Project rollovers remain
**0/2**.
