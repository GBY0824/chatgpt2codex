# One-MCP integration gates — production 7979, review 7987

## 2026-11-02 — Snapshot comparator no longer silently ignores unknown fields or update metadata

A further code-level audit found that the first read-only
old/new OAuth snapshot comparison validated the known
clients/tokens/owner fields but did not require either
snapshot's `oauth.json.updatedAt` to match and did not
reject **additional, unrecognized persisted fields**.
Consequently a baseline with extra unexamined persisted
data or a different document update marker could
receive a structural-match receipt even though the
two file contents were not equivalent.

Source patch `ff628b24515ccc2607b735b5fee8e3e8b2d161ff`
now requires the exact documented top-level
`owner-token.json` and `oauth.json` field sets
and exact persisted client/token record field sets.
The `clientJson` itself is compared in full as
opaque registration data (not stripped or logged).
Unknown additional fields refuse comparison
`OAUTH_PRIVATE_CONTINUITY_RECORDS_INVALID`.
`oauth.json` version and `updatedAt` now also
participate in the snapshot equality decision;
`oauthDocumentMetadataMatches` is a Boolean
receipt field and mismatch rejects.

Synthetic regression
`140df7fd99e94a551b362e29c56734c450ac4736`
spawns the same read-only comparator on fake
independent snapshots and verifies refusal on
new update marker, extra document, owner, client,
or token fields while a truly equivalent pair
still passes. No user OAuth state, installed
program, browser, task or credentials touched.
[CI 41387603370](https://github.com/GBY0824/chatgpt2codex/actions/runs/41387603370)
was IN PROGRESS on first read. Linux
compiled comparison step had already PASSED;
check Windows/macos full conclusion separately.

**Deliberate limit:** even byte/metadata-equivalent
separately frozen files are not proof of current
live OAuth authorization, original writer
quiescence or trusted externally pinned backup.
The comparison still returns
`productionCutoverAuthorized=false`,
`existingChatGPTAuthorizationProven=false`,
`oldWriterQuiescenceVerified=false`,
`externallyPinnedSnapshotVerified=false`.
No production cutover approved. Real GOAL
research cycles 0, native ordinary Project
CHAT unattended rollover 0/2.

---


## 2026-11-02 — Executable PRIVATE old/new OAuth equality check (NOT deployment)

The prior cutover gate `oldAndNewRegisteredClientSetsPrivatelyMatched`
was a Boolean policy assertion, not an actual file comparison.
That is insufficient: an unrelated, syntactically valid
`oauth.json` with one client can satisfy the minimum count.
A new **read-only, candidate-source** utility now compares
two pre-existing, distinctly rooted state directories:

`node scripts/compare-oauth-state-readonly.mjs <baseline-root> <candidate-root> <pinned-resource-mcp-url>`

**Safety contract:** No automatic capture, copy, modification,
OAuth rotation, process stop, task change or port bind.
Private OAuth records and client IDs stay in local process
memory; stdout contains Boolean results only, with no
identifiers, hashes or full paths. Both directories must
exist, be absolute, separate/not nested and free of symlink
or junction ancestors; documents must be bounded regular
files stable through a read. Structurally validates
`owner-token.json` and `oauth.json`, requires nonempty
client registration and unique client/token keys, and
compares **owner-token record, sorted registered client
IDs and details, hashed access and refresh token records,
and OAuth resource alignment**. Any mismatch exits nonzero;
no silent fallback to an empty state.

The code is at `scripts/compare-oauth-state-readonly.mjs`
(`6555a9b0`, hardened `9023c88e`).
`scripts/verify-oauth-private-continuity-comparison.mjs`
(`f3cb1bab`, hardened `ac23e547`)
executes two random, fully synthetic, non-owner state
directories, verifies all-equal PASS, refusal of same-path,
replacement client ID, changed refresh token/owner token,
foreign OAuth resource, empty-client state and zero
sensitive-value stdout. CI workflow `931025df`
runs the actual Node utility on Linux **and Windows**.

**Important epistemic boundary:** A matching pair is only
a *structural snapshot equality receipt*, not proof that
the original live v0.2.0 writer is quiescent, that a
pre-approved immutable backup exists, that the endpoint
issuer matches a trusted private external pin, that
the snapshots are the currently active installed state,
or that ChatGPT has retained a usable connection.
The tool outputs
`oldWriterQuiescenceVerified=false`,
`externallyPinnedSnapshotVerified=false`,
`existingChatGPTAuthorizationProven=false`, and
`productionCutoverAuthorized=false` even when its
local snapshot records all match.
Only after separate owner approval and PRIVATE
capture/verification of the original owner's state
may this comparison be considered as one input to
a future reversible cutover. It is **not** run
against the actual owner's OAuth records in this turn.

Source CI must be independently verified at the exact
code SHA; do not state 3/3 merely because Linux passed
while hosted Windows still runs its full artifact
download and hash round-trip.

**Remaining path:** audit actual deployed watchdog,
launcher, shared WScript per-argument modes, Startup entry
and independent task triggers before any live old-7979
quiescence; owner-approved private immutable OAuth backup;
compare identical snapshots locally; only then
separately approved one-writer switch and rollback.
Native ordinary consumer ChatGPT Project CHAT turn,
context-limit event and exact same-Project successor
are STILL not provider-attested by this candidate.
GOAL research execution 0; genuine CHAT rollover 0/2.

---


## 2026-11-02 — Registered OAuth client set integrity is REQUIRED

**Newly verified source gap:** a valid `oauth.json` document with
`clients: []` satisfied the existing-file/syntax check despite
not preserving ANY ChatGPT OAuth client registrations. The
candidate-only `--require-existing-oauth-state` path now also
refuses zero registered clients with
`OAUTH_REQUIRED_CLIENT_REGISTRATIONS_MISSING`, while
normal first-time OAuth enrollment (without the flag)
remains allowed. This does **not** establish equivalence of
nonempty old/new registered-client IDs or issuer/resource.
Those still require separate PRIVATE owner-pinned evidence.

- Candidate store: `79d0f555817fa407f4c3108893bce86f6feac93a`
- Disposable unit tests: `e3be66509cd5cb5bdc252c3cd5e409e2e59a8392`
- Compiled CLI synthetic check: `65ce55c31ab61ca4444c5416041f48df44826476`
  [Actions 41384713762](https://github.com/GBY0824/chatgpt2codex/actions/runs/41384713762):
  **COMPLETED SUCCESS Linux/Windows/macOS 3/3**, including
  native Windows `emptyClientRegistrationsRejected:true`,
  independent candidate OAuth writer regression, and
  3,480-file staged archive integrity.

**Read-only preflight alignment:** existing
`scripts/inspect-oauth-state-readonly.mjs` incorrectly reported
`AUTH_STATE_READONLY_STRUCTURAL_GATE_PASS` for a valid
but empty client list (a vacuous structural check).
`d3b9e609409da52c23c0a2f074a749eea1676f75`
now returns a *blocked* result
`AUTH_STATE_READONLY_NO_REGISTERED_CLIENTS`;
the synthetic fixture at `4d3c8530cc7f942b2a13c37ab1bbad7d07e41784`
checks zero clients, structurally valid nonempty
client, foreign issuer resource, and mismatched client ID
without printing or modifying real owner data. It is
wired into Linux/Windows CI at `f4eb909f295d0d5f963a611dd7da16067be35c39`.

**Migration plan refusal** at
`7f16c85c040f870b88a4be2cfc6429743412ddc5`:
the synthetic cutover plan must prove both an integer
`candidateRegisteredClientCount >= 1` and literal
`oldAndNewRegisteredClientSetsPrivatelyMatched === true`,
plus the existing issuer/state identity, independent
verified backup and single-writer safeguards.
This is policy validation on fake values, **not** a
completed private client-ID comparison or permission
to migrate production OAuth state.

**Fresh owner Windows read-only metadata (NO TASK CHANGE):**
- `7979`: one listener; isolated `7987`: one listener.
- `ChatGPT To Codex MCP - Tailscale`: Running, one
  action, one enabled trigger, RestartCount 5,
  RestartInterval PT1M, IgnoreNew instances.
- `ChatGPTToCodexEmergent-Watchdog`: Ready, one action,
  two enabled triggers, IgnoreNew.
- `ChatGPTToCodexMcpSelfHealing`: Ready, one action,
  two enabled triggers, IgnoreNew.
- `ChatGPTToCodexOAuthGuard`: Disabled at task level
  with two configured enabled triggers, IgnoreNew.
No arguments, script bytes, process command lines,
credentials or stored OAuth contents were read.
This is NOT proof of every independent relaunch mode;
it does establish why stopping only the main task
could leave other supervisors eligible to run.
A previous detailed owner AST request was DENIED and
was NOT bypassed.

**No live cutover:** original v0.2.0 on 7979
does not honor the candidate OAuth writer lock,
and the installed watchdog differs from historical
GitHub research watcher. Owner must approve reversible
quiescence, verify launcher/watcher/WScript/Startup
roles privately and pin actual OAuth client set and
issuer continuity before any task/installer/credential
mutation. Normal ChatGPT Project CHAT unattended
context-limit and successor attestation not proven.
Actual research GOAL effects 0; automatic rollover 0/2.

---


## 2026-11-02 — COLD-START OAuth continuity gate (source-only, not deployed)

The original v0.2.0 and the upgraded candidate **MUST NEVER write
the same live OAuth state concurrently**. Once a separately authorized
single-writer migration is eventually executed, a new hazard remains:
a full candidate process restart loses the in-memory fact that the
old `oauth.json` had previously existed. If that file is deleted,
misconfigured, missing from a backup, or pointed at the wrong empty
state directory, the earlier default JSON store could initialize
a brand-new empty OAuth document and lose registered ChatGPT OAuth
client and refresh-token continuity.

**Candidate-only mitigation** in review PR #1:
- `JsonOAuthStore(stateDir, requireExistingState=true)` refuses
  the ABSENCE of `oauth.json` with `OAUTH_STORE_READ_FAILED`
  even on a fresh process after restart. Existing malformed,
  inaccessible, symlinked and non-file states also remain denied.
  Fresh first-time installations continue using default `false`.
- `SingleUserOAuthProvider` and `HttpServerConfig` propagate
  the opted-in requirement for **every** later OAuth operation,
  not merely the CLI's one startup probe.
- The future owner-approved HTTP launch would explicitly use
  `--require-existing-oauth-state`, which preflights the
  existing persisted OAuth document **BEFORE** project/ledger
  writes, owner-token-dependent server setup or any socket bind.
  Missing owner token is checked before any project/ledger writes
  as well. The option is refused for stdio (not an OAuth HTTP
  transport), and `--require-existing-oauth-state false`
  is rejected as a malformed attempt to silently disable it.
- The synthetic multi-supervisor cutover gate now REQUIRES
  `candidateRequiresExistingOAuthState === true` (a literal
  boolean) and rejects omitted/false/string claims. This policy
  alone is NOT proof the actual Windows Task Scheduler or Startup
  launch command has the option: verify the real launch args
  with separately authorized private owner inspection before
  any cutover.

**Evidence:** source+unit tests and actual compiled CLI
(`scripts/verify-required-existing-oauth-startup.mjs`) use
random disposable CI state directories only and check missing
OAuth/owner-token refusal before writing a directory or binding
a port, mandatory-state refusal after a fresh restart, preserved
registered-client and refresh-token identity after synthetic
snapshot restoration, opt-in flag syntax and stdio misuse.
Linux+hosted Windows CI steps run the executable and never
contact owner :7979 or isolated :7987.

Development commits:
`e2fda7d1` store; `c78ee227` provider;
`b2672a2b` HTTP; `22d5b62d` CLI;
`cf3d5f16` tests; `bac85c98` stricter
flag+no-unauthorized-writes; `916fa10c`
compiled CLI test; `e0175195` CI;
`135903a0` migration refusal;
`40a1090e` updates previous Windows staging
smoke to the **stronger** no-state-writes-without-owner-token
behavior. Earlier intermediate Windows CI runs FAILED
because the old test expected an empty staging directory to
be created before denying the missing token; this obsolete
expectation was updated, without weakening the new
no-writes protection.

**Cutover remains blocked:** no live Windows service or OAuth file
was read/written, no program/task/Startup was changed, no credentials
were shared, and the actual old-relauncher command/script modes still
need approval-compatible provenance. The permanent startup command's
opt-in mode, pinned private state backup, owner re-consent and
rollback must be explicitly verified before any production work.
Even perfect OAuth continuity does NOT solve official ordinary
ChatGPT Project CHAT limit/turn attestation or native unattended
successor creation: actual GOAL cycles 0, rollovers 0/2.

---


## 2026-11-02 — STOP treating saved research watchdog source as installed runtime

**Direct Windows read-only provenance shows a real mismatch.**
The installed `Watch-ChatGPTToCodexMcp.ps1` Git blob is NOT
`c553fe6d740e37bb949025a7d8e41f27b3093256`, the blob SHA of
`GBY0824/freqtrade-mcp-research` `main`'s saved script.
The installed script is 29,747 bytes with UTF-8 BOM, about 702
PowerShell lines and parser error count zero; its direct lexical
`Start-ScheduledTask` call count is zero. The saved GitHub
script has direct `Start-ScheduledTask` branches for absent or
unhealthy 7979. It is **not valid** to infer those two branch
behaviors are present in the installed Windows version.
Neither file was executed and no raw script contents, tokens or
OAuth values were emitted. A fuller command inventory was denied
by connected-tool approval; do not circumvent this denial.

**Mandatory G3/G4 evidence refinement** at code commit
`321422388f6a48c6ae19e122e63afca65bfddc84`:
`verify-synthetic-supervisor-quiescence.mjs` requires one-to-one
SHA-256 and actual deployed mode audit for all four script roles:
(1) watchdog, (2) original main launcher,
(3) WScript dispatcher, and (4) current-user Startup entry.
Merely finding matching filenames, stored research scripts or
synthetic task names must never unblock production cutover.
The 4-role fixture uses **synthetic dummy 64-hex values**;
`productionCutoverAuthorized=false` in all cases.
Real owners' script bytes/hashes have NOT been inserted into
GitHub. The SHA equality must refer to the SAME inspected deployed
bytes and separately reviewed version, not forced equality with a
historically preserved different repo revision.

**Remaining evidence:** safely inspect deployed control-flow and
task argument modes only through owner-authorized, privacy-safe means,
confirm indirect relaunch routes and current private OAuth
issuer/state identity, rehearse reversible quiescence and backups
on a synthetic clone, then request separate live cutover approval.
Until these gates pass, leave both 7979 and 7987 intact and do not
let old 0.2.0 and candidate share live OAuth writes.

---


**Status:** compatibility validation in progress. **NO production deployment or merge approved.**
This is an upgrade of the *same* ChatGPT To Codex codebase, **not** a permanent second MCP service.

## 2026-11-02 — verified running task and source-level relaunch-risk gate

**Live read-only host evidence (not a cutover approval):** the currently running
original `7979` WScript ancestor matches the Task Scheduler
`IRunningTask.EnginePID` of `ChatGPT To Codex MCP - Tailscale`.
This is a true **current engine association**, independently confirmed
twice, not proof that disabling this task alone prevents relaunch. The
task's scheduler settings are one logon trigger and **up to five retries
at one-minute intervals**; the separate
`ChatGPTToCodexEmergent-Watchdog` and
`ChatGPTToCodexMcpSelfHealing` each have both logon/time triggers.
Owner Windows currently has one 7979 listener; no real task was changed.

**Potential watchdog relaunch behavior from saved research source, not
proven live installation:** the separately preserved
`GBY0824/freqtrade-mcp-research` `main` file
`tools/Watch-ChatGPTToCodexMcp.ps1` uses
`Start-ScheduledTask -TaskName $MainTaskName` in two conditional branches:
when the expected 7979 listener is **absent**, and when the expected
process exists but the protected local MCP endpoint **fails its health
check** (the latter also writes a restart-request marker).
Public Funnel-only recovery is separate and primarily performs Tailscale
network repairs. This code could restore the old writer **if it is the
script actually deployed**, but the installed Windows script version and
invocation route have **not** been hash-matched to this research source.
Do not promote source-path resemblance to live watchdog behavior.
Also, `Start-ScheduledTask` under `IgnoreNew` may not spawn another
process while the old task is already running. No actual relaunch was
induced or observed.

**Previously missing main-task safety gate repaired** in
`scripts/verify-synthetic-supervisor-quiescence.mjs` at source SHA
`aca982e7f5184f6515f1f35274fe7d7058bc97ff`.
The model now requires `ChatGPT To Codex MCP - Tailscale` by name,
forbids relabeling its verified role as unrelated, and requires explicit
evidence for **current engine shutdown, five-retry restart suppression,
logon-trigger suppression**, along with all other independently recurring
routes, no old OAuth writer, and pinned private state backup. It tests
missing/misclassified/active main-task negative cases.
This is a **synthetic validation of refusal logic**, not a production
quiescence or shared OAuth-state migration.

**Safe production gate sequence** (do not execute without separate owner
authorization): (1) independent read-only verification of deployed
launcher/watcher script identity, mode-dependent behavior and every
scheduler/Startup route; (2) strictly private OAuth issuer and
registered-client state identity plus hash-backed snapshot, with no
tokens printed or uploaded; (3) owner-approved temporary quiescence of
*verified old-7979 relaunchers only*, preserving unrelated OSINT modes,
including Scheduler retry and Startup paths; (4) verify no original
writer remains, and observe for a sufficient period to cover known
retry and recurring launch paths without assuming one sleep proves
permanent suppression; (5) staged new candidate on **separate state**
until original is quiesced, then a reversible, single-writer handover;
(6) revalidate existing OAuth client continuity, legacy tools, GOAL
read-only status, and independent rollback. **No installer overwrite,
new OAuth init, task stopping, token rotation or 7987 consolidation
is permitted by this research note.**

---

## Verified owner-PC starting point (2026-11-01 KST)

- Original installed MCP: `127.0.0.1:7979`, binary under
  `%LOCALAPPDATA%\Programs\ChatGPT To Codex`; current service was observed alive.
- Separate fork staging MCP: `127.0.0.1:7987`, binary under
  `%LOCALAPPDATA%\ChatGPTToCodexGoalAppStaging`,
  state `%LOCALAPPDATA%\ChatGPTToCodexGoalAppState`, scratch workspace separate.
- Independent read-only Windows inventory reported both `dist/cli.js` present,
  **different SHA-256**, separate listening process IDs, production process not
  using staging CLI, staging process using staging CLI.
- **Both package.json versions read `0.2.0`**: the version string CANNOT
  distinguish the fork. Provenance requires commit/build digest and manifest.
- Owner completed actual loopback OAuth Authorization Code + PKCE with
  `chatgpt2codex.goal`, authenticated MCP initialize, read-only
  `goal_app_command(status)`, and verified test-token revocations:
  `LOCAL_OAUTH_SMOKE=PASS`. That does **not** attest ordinary ChatGPT user turns.
- Original installed operating configuration, credentials, service registration,
  browser extension and research Stage have **not** been migrated.
- The production CLI, Windows installer, startup scripts, and any V3 extensions
  are **not** replaced by the staging bundle merely because source CI passes.

## Automated source compatibility fence

`scripts/verify-legacy-mcp-compat.mjs`, executed by the PR's Linux CI job,
builds candidate **and existing `main`** independently and fails closed unless:

1. Every legacy registered MCP tool remains registered.
2. Every legacy model-visible MCP tool remains visible, while legacy hidden
   tools stay hidden.
3. Existing tool input field names and Zod field type/optional/nullable
   contracts are preserved. The only reviewed tool addition is
   `goal_app_command`.
4. The previous default HTTP host, port `7979`, public URL, session capacity
   and TTL remain unchanged.
5. Baseline OAuth redirect hosts and access/refresh TTLs stay unchanged;
   `chatgpt2codex` remains the first/default scope and only
   `chatgpt2codex.goal` is added.
6. Default process-level idle shutdown remains unchanged.

The test is **source/runtime registration compatibility**, not proof of
Windows installer behavior, configuration migration, existing-client
reconsent, Tailscale Funnel compatibility, or real unattended rollover.
Existing full macOS tests and focused Windows tests also remain mandatory.

## Important installation risk

Existing upstream `scripts/install-windows.ps1` uses
`Copy-Item ... -Recurse -Force` directly into the installed program directory
and updates shortcuts. **Do not run it for an in-place trial upgrade.** It
does not establish an independently verified backup, rollback, preserved
process ownership or a zero-downtime transition. The staging package is
not an upgrade installer.

## Required gates before a single production MCP cutover

- **G1 — source:** current PR CI succeeds, legacy contract fence succeeds,
  and all relevant tests pass at a recorded fork commit.
- **G2 — identity:** produce a signed or hash-manifested release with
  unambiguous fork build identity; verify owner-PC staged files against
  that manifest and don't identify code solely by `0.2.0`.
- **G3 — state:** document original actual state directory, service launch
  flags, OAuth issuer/resource, extension/plugin connections and any
  credential migration requirements. Do not copy credentials to GitHub,
  chat or disposable CI. Never silently merge staging owner credentials
  with existing production credentials.
- **G4 — reversible migration:** develop a separate, owner-approved
  rollback-capable installer or switch procedure. First test it against
  synthetic Windows installations and state; keep the real production
  instance entirely untouched in negative tests. Backup bytes and
  config with checksum verification, read-only manifest receipts, and
  explicit rollback steps; never run the existing force-overwrite script.
- **G5 — explicit cutover approval:** separately ask the owner before any
  production service stop, install-directory write, startup setting,
  connection URL, OAuth client consent or port 7979 change. A source PR,
  existing local OAuth test consent, or `GOAL ON` intent does not constitute
  upgrade approval.
- **G6 — live rollback check:** after approved swap, verify existing MCP
  clients, authenticated tool calls, project leases, legacy functions,
  and new GOAL intent (read-only first). Any failure reverts using
  independently verified backups without losing user state.
- **G7 — consolidation:** only after prolonged verified stable single
  instance, stop and remove test-only listener 7987 and scratch artifacts,
  subject to owner approval; never leave duplicate writers/credential
  owners or silently remove private data.
- **G8 — separately scoped research:** app OAuth GOAL intent is *not*
  original consumer ChatGPT provider-turn attestation or protected P3/Stage
  authorization. No autonomous research, browser SEND/OPEN or unattended
  rollover is enabled by the cutover. Real ordinary same-Project ChatGPT
  rollovers remain **0/2** until independently demonstrated.

## Reporting convention

Every completed gate: record commit SHA, CI run, artifact SHA, observed
Windows state, PASS/FAIL and remaining blockers in private research
issue `GBY0824/freqtrade-mcp-research#2`. Do not publish owner tokens,
OAuth codes, callbacks, user data, secret state directories or credential
snapshots. No automatic PR merge, startup replacement, tunnel exposure,
background schedules or irreversible deployment.

## Synthetic Windows cutover rehearsal (no owner-PC writes)

The PR Windows CI now runs `node scripts/verify-synthetic-windows-cutover.mjs`
using Node 22 in a **fresh temp directory made by the test itself**. The
script accepts no user-supplied paths and never points to
`%LOCALAPPDATA%\Programs\ChatGPT To Codex`. It does not stop real services
or access real credentials, clipboard, registry, default state or network.

Its synthetic fixtures model:

- a baseline installed directory and a separate candidate package;
- an independent state directory (contents must survive unchanged);
- a SHA-256-backed legacy backup;
- a copied/staged candidate and digest verification;
- a two-rename switch with retention of the old tree;
- exception-triggered recovery that must restore the original byte digest.

Six separately checked scenarios are success, rejected missing installer marker,
rejected running-service precondition, rejected tampered candidate,
rollback after the old tree is moved aside, and rollback after the new tree
is activated. Unexpected error codes and altered state fail the CI job.

**Limits:** this is a deterministic filesystem model, **not** a production
upgrade installer. It cannot prove Windows locked-file behavior, abrupt power
loss, process handover, startup service/shortcut migration, user application
configuration compatibility, actual installed artifact provenance, or stable
rollback on the owner's original machine. It does **not** satisfy G4/G5/G6 by
itself and is not authority to change port 7979.

Current source gate result must be taken from the **latest** Actions run for
this review branch, not an earlier passing commit.

## Process interruption and recovery journal — synthetic only

The Windows CI also runs
`node scripts/verify-synthetic-windows-crash-recovery.mjs`.
This is an **independent process crash/restart exercise**, not a production
installer and not a claimed physical power outage test.

The script creates its own disposable temp fixture, stores an unguessable
marker proof, refuses arbitrary installation directory arguments, and checks
canonical placement under OS temp before child processes perform any rename.
Each fixture contains only synthetic CLI data, a separate synthetic state,
an immutable original backup, a candidate staged tree and a journal carrying
original/candidate/state tree SHA-256 digests. Journal writes use an exclusive
temporary file, flush the file with fsync and rename to journal.json.

**Replayed real process exits (exit code 73):**

1. Before moving the old installed tree.
2. After old-tree retirement, *before* its journal phase update.
3. After old-tree retirement and journal update.
4. After candidate activation, *before* its journal phase update.
5. After candidate activation and journal update.
6. During recovery itself, immediately after quarantining the candidate.
7. During recovery itself, immediately after restoring the original.

A new Node process must restore the original exactly (SHA-256 file-tree digest)
and preserve the independent state; a second recovery must be idempotent.
Before any restore mutation, independently verify the journal, original backup,
user state, retired tree and any installed candidate. Unexpected bytes or
existing quarantine directories cause refusal instead of forced overwrite.

**Negative cases:** corrupted backup, corrupted journal, foreign active
installation bytes and modified protected state are all expected to fail
closed with no recovery rename. No credential, real Windows service or
network listener is touched in these fixtures.

**Proof boundary:** a forced Node exit models a process crash. OS-cached
directory metadata, simultaneous writers, Windows ACLs/locks, service
configuration, storage power-loss ordering and operating system reboot are
**not proven** by a same-host process restart. A journal recipe in a test
script is **not** a live recovery agent. This is research toward the G4
reversible updater, not permission to replace the user's original MCP.

Evidence requires the exact GitHub Actions Windows job logs with
`SYNTHETIC_PROCESS_CRASH_AND_JOURNAL_RECOVERY_PASS`, the final run status,
and a matching fork commit SHA. No schedule-based monitoring, exposed public
endpoint or production cutover is included.

## Concurrent operators and Windows locked-file rehearsal — synthetic only

The CI-owned script `scripts/verify-synthetic-windows-locks.mjs` tests a
**separate synthetic transaction-ownership design**, not the installed MCP.
It accepts no real installation path. It creates a random marker-protected
directory directly beneath the CI runner's OS temp directory, uses
`fs.open(..., "wx")` to acquire an exclusive transaction lock, and verifies
the owner process, independent contender processes and restoration tests are
separate processes.

- A live owner holds the lock while a second **upgrade** attempt and a
  simultaneous **recovery** attempt both fail closed without changing the
  synthetic installed tree or synthetic user state.
- A normal owner release allows a new recovery request to acquire it.
- A killed owner leaves a stale lock and both follow-on upgrade/recovery
  requests refuse to proceed. The test harness alone may remove that
  marker-proven stale lock during disposable fixture cleanup.
- On Windows CI, a PowerShell child holds a **real .NET FileStream opened with
  FileShare.None** on the synthetic installed `dist/cli.js`. A competing
  Node read and directory rename must fail while the handle is open; the
  synthetic state must be byte-for-byte unchanged.
- After the Windows child closes, the synthetic directory move and rollback
  must both work. On non-Windows platforms this particular file-sharing
  subtest is *skipped*, not counted as a Windows proof.

**Important limitation:** exclusive lock and file-sharing tests exercise a
standalone model, not yet the earlier synthetic journal worker/recover code,
much less any actual production updater. Cross-process lock ownership,
crashed-owner stale-lock adjudication and journal recovery must be integrated
and retested in a *single* eventual upgrader before G4 can close. Do not
delete a real lock file, force-replace a locked Windows executable, bypass
a running service, or use the old `Copy-Item -Force` installer.

The Windows Actions job result is authoritative: check the synthetic
`SYNTHETIC_LOCK_CASE_PASS` entries and
`actualWindowsFileShareTested:true` in its final JSON. This does not test
an OS reboot or physical power loss and does not modify the real port 7979
instance or user credentials.

## Unified transaction engine — independently executed Windows CI

Source-only script `scripts/verify-integrated-synthetic-mcp-upgrade.mjs`
combines the previously separate concurrency/transaction lock and journal
crash-recovery models. This is still **a test-only harness**: it rejects
arbitrary path arguments and can work only under its own random, marker-
verified, directly nested OS-temp fixture directory.

Unlike earlier independent tests, **both the synthetic upgrade worker and
recovery worker acquire the SAME exclusive owner lock before performing
their file-tree and journal checks**. The lock records the owner PID and a
random nonce; a second worker cannot enter during an owner operation. If
the owner process terminates abnormally, the lock persists and all callers
fail closed. Only the CI supervisor, after proving the specific child PID
it launched has exited, may remove a lock in its own verified fixture.
This is intentionally not a production stale-lock policy.

The process creates an fsync'd journal containing SHA-256 digests of
baseline installed tree, candidate and independent state. It tests five
upgrade-crash points, two secondary recovery-crash points, repeated recovery
idempotence, and foreign bytes failing closed. After a crash, a **fresh
Node process** resumes recovery to exactly the original digest. The
independent state must remain identical. File-tree renames never use
`-Force` or overwrite an unknown destination.

The Windows CI invokes a PowerShell child with a true `FileShare.None`
handle on a **synthetic** candidate/installed file. It verifies both OS
read-denial and that the integrated upgrader refuses to proceed while the
handle is open. After release, integrated upgrade+recovery must succeed.

**Verified result:** [Windows CI 41314467909](https://github.com/GBY0824/chatgpt2codex/actions/runs/41314467909)
completed **SUCCESS**, including Linux and macOS jobs. The actual Windows
job log reports `SYNTHETIC_INTEGRATED_TRANSACTION_RECOVERY_PASS`,
`casesPassed:10`, `actualWindowsFileShareTested:true`,
`realInstalledAppTouched:false`, `ownerStateRead:false`,
`productionInstallerAvailable:false`, `realPowerLossTested:false`.
An initial separate test failure was traced to incorrectly passing the
PowerShell file path after `-Command`, so the temporary file was not
actually locked; fixed by passing the path through an explicitly scoped
child environment variable, matching the independently successful
Windows FileShare regression. Do not count those failed runs as PASS.

**Real owner Windows preflight read-only:** original installed `:7979`
and isolated staging `:7987` listeners both alive on 127.0.0.1 with
different processes; installed and staged CLI hashes differ, but both
`package.json` versions say `0.2.0`. The *existing staged executable*
does **not** have `STAGING_PROVENANCE.txt`, because provenance was
introduced in later CI packaging, not retroactively installed. Therefore
the current staging tree must NOT be promoted to production. A newly
packaged release must be verified against its own source/CI digest, and
all owner-facing state/config/service migration needs separate approval.

Still not demonstrated: real production service handoff, Windows
service/task/uninstaller configuration updates, existing-client OAuth
reconsent, actual power cut+reboot, real updater stale-lock adjudication,
directory durability across storage barriers, or original consumer
ChatGPT provider-turn proof/rollover 0/2.

## Read-only owner-PC candidate provenance preflight

`scripts/Inspect-OneMcpCutoverReadiness.ps1` accepts **only two explicit
directory arguments** (existing installation and staged candidate) and
prints a JSON report. It performs NO file copy/write/delete, changes NO
service, config, registry or credential, and does not inspect the original
user state. It compares installed/staged `dist/cli.js` hashes and package
versions, checks the stage's `STAGING_PROVENANCE.txt` source/CI identities,
and verifies that the manifest's **critical entries** agree with candidate
`dist/cli.js`, `package.json`, and the provenance file. It does NOT
replace full offline bundle manifest verification or independently attest
signed publisher identity.

Every report states `productionCutoverAuthorized:false`,
`productionChanged:false`, `credentialsRead:false`,
`serviceAndProcessOwnershipChecked:false`, and
`fullBundleManifestVerified:false`. A report never authorizes a live
upgrade even when the critical manifest is self-consistent.

GitHub-hosted Windows CI tests a candidate with provenance and manifest,
an older unproven candidate lacking those receipts, and same-path
overlap rejection. The owner's currently running 7987 staging copy
was independently observed to **lack** the newer provenance file and is
therefore NOT acceptable for single-MCP production replacement. No owner
interaction, hidden path probing or token transfer was performed for
this gate. A separate owner-approved preflight against a **new** verified
bundle is required before a real cutover.

## Full manifest + externally pinned source (hardening)

The earlier read-only readiness gate checked only three critical manifest
entries and returned `fullBundleManifestVerified:false`. It now scans
**every staged file including hidden files**, verifies each SHA-256 against
`SHA256SUMS.txt`, rejects unmanifested extra files, missing files, duplicate
manifest entries and `..`/absolute/backslash/colon traversal paths. It
also rejects reparse points in the selected install/candidate path chain
and staged tree, so aliases to production are not quietly accepted.

The optional `-ExpectedSourceSha` argument is an **external trust pin**.
Without a valid 40-hex SHA, or if it does not equal the candidate's
`sourcePrHeadSha`, `candidatePassesReadOnlyIntegrityGates` is always
false. Matching both the full manifest and supplied pin merely supplies
a **read-only integrity assessment**, never production cutover consent or a
publisher signature. The old 0.2.0 version collision remains a report
warning rather than being treated as build identity.

On the GitHub-hosted Windows CI, the positive case uses the actual PR
source SHA and CI-produced staged package. Negative cases require
refusal for an omitted/wrong source SHA, an older candidate missing
provenance, an extra hidden file, a modified noncritical README file and
overlapping installed/candidate directory inputs. This detects real
problems missed by a critical-files-only verifier, while leaving the
owner's 7979 service untouched.

A source SHA and editable hash manifest are not code-signing: before
real deployment, separately establish which GitHub publisher/source
and distribution channel the owner actually trusts.

## Privacy-minimal Windows startup inventory (review-only)

`scripts/Inspect-OneMcpStartupReadOnly.ps1 -Port 7979` is an on-demand
**read-only** reporter. It uses Windows TCP listener ownership and CIM
process/service metadata; its JSON reports only booleans, executable
**basenames**, and status codes. It never emits full process command lines,
Windows usernames, OAuth URLs, service configuration, credentials or
installed state. It refuses to classify a wildcard listener as
loopback-only and marks missing/ambiguous processes as unknown.

`automaticStartupMechanismIdentified` and
`productionCutoverAuthorized` remain `false`: a PID/parent observation
does not reveal whether Task Scheduler, Start Menu, a Windows Service,
a plugin, a tunnel or another process owns the lifecycle. That must be
established separately by an authorized owner-PC check before any real
cutover. Previous remote process/service inspection was blocked by
`APPROVAL_REQUIRED`; this script has been **authored and CI-tested,
not run on the owner's production Windows installation**.

GitHub-hosted Windows tests start a temporary loopback TCP listener, verify
the reporting fields without reading command lines, close it and verify
the missing-listener response, then create a wildcard listener and verify
it is rejected as non-loopback. No production process/port is inspected
by this CI test.

The review-only Windows staging archive now includes both
`Inspect-OneMcpCutoverReadiness.ps1` and
`Inspect-OneMcpStartupReadOnly.ps1` under its checksum manifest.
Their presence is checked after the offline copy. This is for a later
explicitly owner-approved preflight, not an auto-upgrade or cutover.

## Offline staging hardening: hidden files and reparse paths

The preparatory `scripts/Prepare-GoalAppOfflineStage.ps1` now enumerates
**all files including Windows Hidden files** via `Get-ChildItem -Force`,
and rejects files not declared by `SHA256SUMS.txt`. It also checks
each existing path component before staging and rejects directory
junctions, symbolic links, and other reparse points in input files
or folders, even when the referenced path would otherwise look
textually disjoint from the protected production directory.

On GitHub-hosted Windows, CI first demonstrates the normal offline
bundle preparation succeeds, then mutates the README and confirms
`STAGE_SHA256_MISMATCH`, restores it, adds a new file with the Windows
`Hidden` attribute and confirms `STAGE_UNLISTED_FILE`, removes it,
creates a temporary junction to an outside folder and confirms the
reparse point cannot pass verification. The temporary junction and
negative test artifacts are not part of the sealed published package.
The downloaded artifact is independently re-verified and replayed.

These are **offline package acceptance tests**, not an owner-PC
installation, proof against all possible race conditions, a trusted
publisher signature, or production cutover authorization. Never
apply the old force-copy installer to the live 7979 installation.

## Verified program snapshot and restore-to-new-folder (pre-cutover gate, not installer)

The review branch now contains
`scripts/New-OneMcpVerifiedProgramSnapshot.ps1`, which implements two
explicit **owner-initiated** modes:

- **Capture** makes a *new* disjoint backup folder holding an exact copy
  of an installed-program file tree and a JSON receipt with each file's
  SHA-256, length and relative path. The caller must provide the existing
  program's externally pinned `dist/cli.js` SHA-256 and
  `-ApproveBackupOnly`. The script hashes source before and after
  copying, hashes the fresh backup, and only then publishes
  `BACKUP_RECEIPT.json` and its independent SHA-256.
- **Restore** accepts a pinned snapshot receipt SHA-256, pins the
  original CLI SHA-256 again, verifies the entire snapshot file tree,
  and creates a *different* new folder with restored program files.
  It then re-hashes all restored files. This mode **refuses** an already
  existing destination, wrong receipt hash, altered file, source/dest
  overlap or reparse-point path.

The script never deletes or replaces the original installation, stops
a process, restarts a service, modifies OAuth or user-state directories,
runs npm, changes shortcuts/ports, grants GOAL authority, or installs
the candidate upgrade. On failure, any newly created incomplete backup
or restore folder is left for manual inspection, rather than performing
an unsafe recursive delete. Receipts and backup copies remain **private
local artifacts** and must never be uploaded to a source repository:
the program tree might contain embedded configuration or private data.

GitHub-hosted Windows CI uses **only synthetic fixtures** containing
three program files (including an actual Windows Hidden asset) and
a separate synthetic user-state file. It verifies the successful
capture and new-folder restoration, rejects absent explicit approval,
wrong original CLI hash, wrong receipt SHA, existing restore
destination and deliberately tampered backed-up program file. It also
checks that independent user state never changes. The review-only
CI stage package includes this script under the full SHA256 manifest.

**Boundaries:** this is a program-file backup, **not a complete MCP
rollback**. It does not back up the separately stored OAuth data,
registered client state, Windows Task Scheduler/service/startup settings,
browser extension, user research state, or external connections. Live
backup consistency depends on the program directory staying unchanged
during the snapshot; hash comparisons detect ordinary modification but
do not eliminate filesystem TOCTOU or abrupt power failure. Before an
actual single-runtime cutover, separately inspect/backup those other
state owners, close processes safely, prove Windows installer ownership,
test handoff/rollback with authentic clients, and obtain explicit owner
authorization for any real port 7979 replacement. A program-only backup
**never authorizes** the actual cutover.

## Legacy OAuth continuity and migration — source and synthetic gate

**Source identity before fail-closed hardening:** baseline `main`
and an earlier draft revision had identical Git blobs for
`src/auth/oauth-store.ts` (baseline 495445cf),
`src/auth/owner-token.ts` (73c6e3fe),
`src/auth/oauth-provider.ts` (ce8b859f),
`src/state/store.ts` (80317f90) and
`src/state/ledger.ts` (341c999b). **The candidate OAuth store is
now intentionally different:** its persisted JSON format and token
interfaces stay compatible, but corrupt/unreadable existing documents
are rejected rather than converted to empty. The CLI now checks this
before any owner-token rotation. The cross-version synthetic CI is the
active compatibility proof, not identical code blobs. Neither proves
actual hosted ChatGPT reconnection.

**Synthetic cross-version proof:** `scripts/verify-legacy-auth-continuity.mjs`
is run as a separate CI test after building *both* fork main and candidate.
It creates its own random temporary state, registers a fake client using
baseline code, stores synthetic basic-scope access/refresh token hashes,
and stores a fake owner-token hash. A fresh candidate instance must
read that client and tokens without modifying their bytes, accept the
synthetic owner token, reject a wrong value, preserve basic-only
scopes (never silently add `chatgpt2codex.goal`), rotate the synthetic
refresh token one time, and prove the baseline can read the new
basic-scope refresh token. This test shares no real user credentials,
client IDs or tokens.

**New conservative privacy-minimal gate:**
`scripts/inspect-oauth-state-readonly.mjs` takes an explicit absolute
state directory and a separately pinned MCP resource URL.
It reads only `oauth.json` and `owner-token.json`, returns *booleans and
status codes only*, and never prints client IDs, token hashes, token
values, redirect URLs, secret paths or source content. It rejects
missing/malformed records, missing or duplicate client references,
inconsistent resource URLs, invalid path inputs or symbolic link
aliases. It does not call `init`, rotate a token, register clients,
issue permissions, persist any data or authenticate a real ChatGPT turn.
Synthetic CI exercises positive, wrong resource and corrupted store
cases. This is **not** a user-authorized probe of the real state folder;
no owner Windows credentials are read by CI.

**Critical lifecycle rules for future cutover:**

- Keep production's existing state directory and the exact OAuth
  issuer/public MCP resource URL; a changed issuer/resource may make
  existing tokens unusable despite identical JSON serialization.
- Do **not** run `chatgpt2codex init` as an upgrade step: it rewrites
  project registry and active session. Do **not** run
  `owner-token --generate` or `owner-token --set-stdin`, since
  those actions deliberately clear all OAuth client/token registrations.
- Never run old 7979 and new 7979 simultaneously against the same OAuth
  store. **The candidate now uses an exclusive oauth-write.lock claim**
  for read-modify-write cycles across candidate processes, but the
  deployed legacy v0.2.0 does **not** recognize this file. Therefore the
  old writer MUST still be stopped using the verified lifecycle owner
  before the candidate can share its state directory.
  The isolated 7987 staging service must keep its **separate state**.
- Existing basic-scope tokens may continue to authorize *legacy* MCP
  operations if valid, not expired, not revoked, and the resource/issuer
  and client remain unchanged. **GOAL remains an opt-in additional
  scope** and requires separate explicit owner approval/re-consent.
  Compatibility is not an assurance that any particular hosted ChatGPT
  client will reconnect automatically.
- Do not put a real `oauth.json`, `owner-token.json`, decrypted
  credentials, hashes of stored tokens or backup receipts into GitHub,
  chat, a public CI artifact or staging test fixture. A separate
  owner-approved private credential/state backup and lifecycle inventory
  are required before any actual 7979 cutover.

**Remaining proof:** owner-authorized read-only original startup mechanism,
exact production issuer/resource and state-path identity, existing ChatGPT
client reconnection before/after a *separately approved reversible
cutover*, GOAL consent for additional scope, and the original ordinary
consumer ChatGPT Project CHAT provider-turn attestation + two rollovers.
The last target remains **0/2** until live evidence exists.

## Prevent silent OAuth client loss on corrupt files (source-only)

Prior implementation of `JsonOAuthStore.load()` silently returned an
empty store after **any** JSON parse, schema validation or read failure.
The next registration or token update could then overwrite existing
`oauth.json`, apparently erasing all registered clients. This is
incompatible with safe in-place migration.

The draft candidate now distinguishes a genuinely absent file
(`ENOENT`, allowed on first-time initialization) from an existing
invalid/unsupported/unreadable file (hard error
`OAUTH_STORE_CORRUPT_REFUSE_WRITE` or `OAUTH_STORE_READ_FAILED`).
Normal OAuth operations, including `clearAll()`, will not overwrite a
damaged existing document. The corrupt original bytes remain intact
for private, owner-controlled recovery.

The CLI `init`, `owner-token --generate` and
`owner-token --set-stdin` check OAuth readability **before** changing
the Owner Token, and `init` checks it before project/session writes.
`scripts/verify-corrupt-oauth-cli-rotation.mjs` tests actual compiled
CLI commands with a disposable fake owner-token hash and corrupt OAuth
JSON. The `src/auth/oauth-store-failclosed.test.ts` suite also tests
invalid JSON, valid JSON with invalid schema, unsupported version,
unreadable non-file, all store mutation paths and recovery after
explicit fixture repair. These are **synthetic source/CLI CI tests**,
never probes of the owner's actual secrets.

**Limits:** The corrupt-file guard does not provide transactional
OAuth/Owner Token rotation. Cross-process candidate OAuth writer locking
is now addressed in the following section, but it cannot prevent a
legacy process (which ignores the new lock) from writing the same store
or guarantee service continuity after a crash/storage failure. Do
not rotate tokens or run `init` as a migration procedure. Full program
and private state migration still requires separately authorized
backup, shutdown of the verified original writer, signed/trusted
release, real-client health checks and rollback. PR remains draft,
source-only, with consumer CHAT rollovers 0/2.

## Exclusive candidate OAuth writer claims (cross-process source gate)

The upgraded candidate's `JsonOAuthStore` now creates
`oauth-write.lock` with exclusive `wx` semantics **before** each
OAuth read-modify-persist transaction (new client, token pair rotation,
token deletion and reset). It holds the lock through the save and
releases it in a `finally` path. Other candidate processes wait
briefly for a legitimate writer; after a bounded wait they reject with
`OAUTH_WRITE_LOCK_BUSY_OR_STALE` rather than overwriting each other's
data. The lock contains only a PID and creation timestamp, no token
secrets. Normal OAuth reads remain read-only and are not locked.

A process crash can leave `oauth-write.lock` behind. **This is an
intentional fail-closed stop:** the candidate does not infer safety
from a dead PID or automatically delete the lock. A verified original
writer shutdown, private OAuth backup/checksums and separately
authorized lock recovery are required to resolve a stale marker.
`init` and Owner Token rotation now call `assertWritable()` before
changing Owner Token or project/session state, to reject an already
stale claim early. This is still NOT a transactional two-file
Owner Token/OAuth replacement if a crash occurs between writes.

CI `scripts/verify-oauth-writer-lock.mjs` launches **three real Node
processes** against a disposable synthetic state; each registers eight
fake clients. It requires all 24 registrations to survive and a separate
stale-lock attempt to fail without changing the JSON or deleting the
claim. The built CLI regression separately verifies that a stale
claim blocks Owner Token rotation before changing its hash. These
tests never reference the installed 7979 or isolated 7987 directories.

**Critical scope limitation:** the original production v0.2.0 OAuth
store does not honor the new claim. This is **candidate-vs-candidate
protection only**, NOT permission to point two differently versioned
processes at the same production state. Also not proven: lock ownership
against arbitrary OS-level file replacement, a full power loss and
restart, or live ChatGPT client continuity. Never reuse the old
production state with an active legacy writer. PR remains draft and
rollover evidence remains 0/2.
