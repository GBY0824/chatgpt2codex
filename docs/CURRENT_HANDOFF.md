# CURRENT_HANDOFF — single-MCP GOAL integration / Runtime V3 research

## 2026-11-02 KST — NEXT REAL MIGRATION BLOCKER: NONEMPTY IS NECESSARY BUT NOT SUFFICIENT

**Owner-requested manual continuation**, not unattended ChatGPT
Project rollover. Fork `GBY0824/chatgpt2codex` branch
`goal-app-auth-review-20261101`, PR #1 remains
DRAFT/UNMERGED. **Real GOAL research cycles 0; genuine
unattended ordinary Project CHAT rollover 0/2.**

**Starting point independently verified:** prior HEAD
`966cdff7c2dceaedd81bc8ed0a16a2d27f97bd4d`
[Actions 41369530197](https://github.com/GBY0824/chatgpt2codex/actions/runs/41369530197)
**COMPLETED SUCCESS 3/3 Linux/Windows/macOS**.

**New fixed defect (candidate code only):**
`--require-existing-oauth-state` previously required
the original `oauth.json` pathname plus valid JSON,
but *a syntactically valid file with `clients: []`*
could still pass, silently breaking continuity of
the registered ChatGPT OAuth clients after restart.
`src/auth/oauth-store.ts` commit
`79d0f555817fa407f4c3108893bce86f6feac93a`
now rejects **zero registered clients** with
`OAUTH_REQUIRED_CLIENT_REGISTRATIONS_MISSING` when
the migration flag is true. New clean first enrollment
without migration flag is still permitted.
`src/auth/oauth-store-failclosed.test.ts`
`e3be66509cd5cb5bdc252c3cd5e409e2e59a8392`
covers fresh-vs-migration difference, write refusal
and byte preservation. The REAL compiled CLI test
`scripts/verify-required-existing-oauth-startup.mjs`
`65ce55c31ab61ca4444c5416041f48df44826476`
now includes valid empty JSON rejection prior to
owner-token inquiry or any HTTP bind.
[Actions 41384713762](https://github.com/GBY0824/chatgpt2codex/actions/runs/41384713762)
for exact SHA `65ce55c31...` independently
**COMPLETED SUCCESS 3/3**, including native Windows
`emptyClientRegistrationsRejected:true`,
4-round OAuth writer concurrency and all 3,480
staging bundle files validated.
**Transparent earlier interim test failures:**
`41384649020` and `41384673512`
were due to the *old* synthetic CLI fixture expecting
a missing-owner-token rejection for an EMPTY registered-client
set. The newer, stronger rejection intentionally
happens earlier; the fixture was updated.

**Read-only diagnostic aligned with new safety requirement:**
`scripts/inspect-oauth-state-readonly.mjs` commit
`d3b9e609409da52c23c0a2f074a749eea1676f75`
returns `AUTH_STATE_READONLY_NO_REGISTERED_CLIENTS`
instead of falsely passing a valid empty client set.
Disposable source fixture
`scripts/verify-oauth-readonly-migration-clients.mjs`
`4d3c8530cc7f942b2a13c37ab1bbad7d07e41784`
uses a fake owner marker and OAuth JSON to ensure
empty clients blocked, nonempty client structurally
accepted, foreign resource rejected, client IDs
self-inconsistent refused, **zero actual owner
identifiers printed or inspected**. Linux and
native Windows workflow steps inserted at
`f4eb909f295d0d5f963a611dd7da16067be35c39`.

**Final source-only cutover contract strengthened:**
`scripts/verify-synthetic-supervisor-quiescence.mjs`
commit `7f16c85c040f870b88a4be2cfc6429743412ddc5`
requires at least one registered candidate client
AND explicit **private old/new client-ID SET
continuity proof**, not merely a nonempty document,
as well as previous issuer identity, backup,
single-writer quiescence, script provenance and
owner approvals. New missing/zero and false/string
negative cases. Positive fixture facts are SYNTHETIC
and **NOT** real owner client data.

**New real Windows read-only supervisor STATUS ONLY:**
- Original 7979 one listener; isolated 7987 one.
- Main `ChatGPT To Codex MCP - Tailscale`: Running,
  1 enabled trigger, RestartCount 5, PT1M, IgnoreNew.
- `ChatGPTToCodexEmergent-Watchdog`: Ready, 2
  enabled triggers, one task action, IgnoreNew.
- `ChatGPTToCodexMcpSelfHealing`: Ready, 2
  enabled triggers, one task action, IgnoreNew.
- `ChatGPTToCodexOAuthGuard`: task Disabled, two
  configured enabled triggers (not evidence it can run
  while disabled), one action, IgnoreNew.
Only metadata: no task command-line arguments,
script contents, OAuth tokens or credentials read;
all tasks/settings unchanged. The disabled
guard is NOT an active route, but main/watchdogs
still need separate control-flow proof.
Previous connector-denied full AST inventory
was NOT attempted again or bypassed.

**Latest code CI:** exact source commit
`7f16c85c040f870b88a4be2cfc6429743412ddc5`,
[Actions 41385129390](https://github.com/GBY0824/chatgpt2codex/actions/runs/41385129390):
Linux/macOS jobs SUCCESS and Windows specific new
read-only client and revised supervisor-gate
steps SUCCESS when initially observed. Windows
full downloadable artifact round-trip was
still IN PROGRESS. Do not claim latest
source 3/3 until all job results are complete.
Related source + native fixture
[41385052529](https://github.com/GBY0824/chatgpt2codex/actions/runs/41385052529)
similarly had Linux/macOS success and Windows pending.

**Remaining exact gates:** actual installed Windows watcher
differs from saved GitHub research script; live relaunch
modes of launcher/WScript/Startup not fully attested.
No private owner client-ID set/issuer comparison or
OAuth state backup, no single-writer reversible
old-v0.2.0 cutover approval, and no provider-attested
normal ChatGPT Project CHAT context-limit/successor
or Goal P3 executor proof. No production operation,
token/client/installer/task modification, no
old-and-new shared OAuth state. A source-only
test PASS is never a real rollover success.

---


## 2026-11-02 KST — FULL 3/3 VERIFICATION CLOSED: EXISTING OAUTH COLD-START FENCE

**Latest exactly verified substantive code+CI SHA**
`40a1090ecae767a31390fdf63be4a02a0c452ed1`,
[GitHub Actions 41369156870](https://github.com/GBY0824/chatgpt2codex/actions/runs/41369156870):
**COMPLETED SUCCESS all 3/3** Linux, native Windows,
macOS. Actual native Windows and Linux CI logs inspected:
- `SYNTHETIC_REQUIRED_EXISTING_OAUTH_STARTUP_GATE_PASS`:
  an actual compiled CLI child cannot open an HTTP listener,
  write project state, or generate empty OAuth state if
  a migrated `--require-existing-oauth-state` document
  is missing. String 'false', non-HTTP misuse and missing
  owner token denied. New legitimate first-time enrollment
  remains unaffected when opt-in absent.
- `SYNTHETIC_MULTI_SUPERVISOR_CUTOVER_FENCE_PASS
  cases=52 negativeCases=50 positiveFixtures=2`:
  future cutover policy now rejects an unproven
  candidate existing-OAuth startup gate.
- `SYNTHETIC_GOAL_CROSS_PROCESS_INTENT_EXCLUSION_PASS`:
  12 independent synthetic children, 4 ON intent wins,
  9 stale/busy denials, NO real user-turn attestation.
- `SYNTHETIC_OAUTH_CROSS_PROCESS_WRITER_EXCLUSION_PASS`:
  4 rounds of 3 independent writers, 24 mock clients
  per round preserved; old v0.2.0 still ignores lock.
- `ISOLATED_STATE_CLI_FAIL_CLOSED_PASS`:
  the earlier Windows test expected empty state directory
  BEFORE rejecting missing owner token; its stronger
  NO-WRITE expectation is now independently verified.
- `DOWNLOADED_ARTIFACT_SHA256_VERIFIED files=3480`
  for CI-hosted uninstalled Windows stage package.

The intermediate Windows CI failures
`41368938671` and `41368999340` came from the
outdated test expectation; source code security was not
reverted to pass it. `40a1090e...` fixes the test
to assert the stricter behavior. This receipt is not
owner-machine deployment, provider native ordinary
Project CHAT event or automatic rollover evidence.

**State:** PR #1 remains DRAFT/UNMERGED, original
installed 7979 and isolated stage 7987 remain untouched,
no scheduler/Startup/OAuth token/real browser effects,
no public connector reconsent, no owner production
cutover. Provider-attested normal ChatGPT consumer
CHAT limit and same-Project successor still missing.
ACTUAL research GOAL cycles 0, unattended rollovers 0/2.
Next requires independently approved exact deployed
watchdog/launcher/WScript/Startup provenance,
private OAuth issuer/client state backup, owner
reversible one-writer migration approval, then
real provider event/successor proof if supported.

---


## 2026-11-02 KST — NEXT PHASE: RESTART-PROOF EXISTING OAUTH PRE-FLIGHT (SOURCE ONLY)

**User-directed manual continuation** of a single-original-MCP
migration. Fork `GBY0824/chatgpt2codex` branch
`goal-app-auth-review-20261101`, PR #1 still DRAFT/UNMERGED.
Production original Windows 7979, isolated candidate 7987,
Task Scheduler, OAuth tokens/registered clients, Chrome and
Project CHAT remain **UNTAMPERED**. This is NOT a live cutover
or an unattended normal ChatGPT Project chat rollover.

**New practical migration blocker fixed in source only:**
A same-process `JsonOAuthStore` memory bit cannot detect
that `oauth.json` disappeared **after a full process restart**.
Without a hard migration startup gate, a new candidate might
treat the missing previously registered clients/refresh tokens
as a fresh empty OAuth enrollment and silently replace them
on the first write. Candidate source changes:

- `src/auth/oauth-store.ts` commit `e2fda7d16d61a97165ce2f0f9ad206d15a37f1ae`:
  opt-in `new JsonOAuthStore(stateDir, true)` denies
  even initially absent `oauth.json` with
  `OAUTH_STORE_READ_FAILED`. Existing malformed,
  symlink/non-file state remains denied. Default `false`
  preserves truly fresh first-time setup.
- `src/auth/oauth-provider.ts` `c78ee227...` and
  `src/server/http.ts` `b2672a2b...` carry
  `requireExistingOAuthState` to every HTTP
  OAuth provider action, not solely initial check.
- `src/cli.ts` `22d5b62d...`, hardened
  `bac85c98357ab2d5cc167e7957b2d9817d669021`:
  opt-in `--require-existing-oauth-state` first
  checks persisted OAuth JSON BEFORE project/ledger
  writes or HTTP socket bind. It rejects `--stdio`
  misuse and string argument `false` rather than
  silently falling back. A missing owner token now
  refuses before project state initialization as well.
  **DO NOT add this flag to the installed owner
  command until the owner separately approves cutover
  and private OAuth state backup has been verified.**
- Disposable test fixture `src/auth/oauth-store-failclosed.test.ts`
  `cf3d5f160eda8c79a46bf7adb4b24e54a47b754b`:
  first missing state refusal, reset-after-restart
  denial, registered-client and synthetic refresh-token
  byte-restoration continuity.
- Actual compiled isolated HTTP CLI regression
  `scripts/verify-required-existing-oauth-startup.mjs`
  `916fa10ce8c78ec1d351a8f8d7a1ddf22068e5fe`
  spawns real child CLI on Linux and Windows,
  verifies missing OAuth refuses BEFORE any directory
  or listener, malformed flag and stdio opt-in denied,
  ordinary fresh enrollment remains available,
  and valid fake OAuth alone is insufficient when
  owner token is absent. No owner system accessed.
  CI wired at `e0175195ca62ee2937fa4d32ef7ff585c8dcfe74`.
- `scripts/verify-synthetic-supervisor-quiescence.mjs`
  `135903a0eb6e750e38b76112cd69ee8b533a87e6`
  requires `candidateRequiresExistingOAuthState === true`
  for any cutover plan, including missing/false/string
  negative cases. Synthetic fixture values do NOT
  prove a real Startup or Scheduled Task command
  actually includes the flag.
- **Transparent CI failure/repair:** intermediate
  [Actions 41368938671](https://github.com/GBY0824/chatgpt2codex/actions/runs/41368938671)
  and `41368999340` had Windows job FAILURE because
  an older isolated CLI smoke expected staging state
  initialization BEFORE the missing owner token was
  rejected. The new safer behavior intentionally
  forbids that write. Workflow fix
  `40a1090ecae767a31390fdf63be4a02a0c452ed1`
  changes the smoke to require **NO state directory**
  after missing-owner-token refusal instead.
  This is a stricter safety assertion, not suppressed
  test execution.

**Verification at first checkpoint:**
[Actions 41369156870](https://github.com/GBY0824/chatgpt2codex/actions/runs/41369156870)
for exact source + workflow SHA `40a1090e...`:
Linux source and macOS controls **SUCCESS**;
Windows real compiled CLI missing-OAuth preflight,
GOAL/OAuth writer and updated isolated-stage smoke
steps separately **SUCCESS**, final Windows offline
artifact verification **IN PROGRESS**. Verify all
3 job statuses and logs before asserting final PASS.
Prior baseline source `dfed328...` [41367840079](https://github.com/GBY0824/chatgpt2codex/actions/runs/41367840079)
was independently **COMPLETED SUCCESS 3/3**.

**Actual blocker remains:** original old installed v0.2.0
ignores candidate `oauth-write.lock`; require privately
pinned OAuth issuer/client identity and verified snapshot,
full installed watchdog/launcher/WScript/Startup
provenance (installed watcher differs from GitHub
research version), owner-approved reversible and truly
single-writer quiescence, and active real command
attestation for `--require-existing-oauth-state`.
Official ordinary consumer ChatGPT Project CHAT
context-limit notification, original provider-attested
turn and exact native same-Project successor creation
remain UNPROVEN/UNAVAILABLE via this MCP.
No fake Work/dots/API acceptance, no Chrome effect,
and no GOAL execution authority from app ON alone.
Actual GOAL work 0; genuine unattended rollovers 0/2.

---


## 2026-11-02 KST — VERIFIED current OAuth disappearing-state continuity 3/3

**Exact latest SOURCE/TESTS SHA:**
`dfed328cc3e7da50732d53f11f4553b9083671ac`,
[GitHub Actions 41367840079](https://github.com/GBY0824/chatgpt2codex/actions/runs/41367840079)
independently **COMPLETED SUCCESS Linux/Windows/macOS
3/3**. Actual job logs checked:
- Linux 47/47 focused tests; Windows 46 passed, 1 skipped.
- Windows and Linux both passed
  `SYNTHETIC_GOAL_CROSS_PROCESS_INTENT_EXCLUSION_PASS`:
  12 independent Node child processes, four synthetic
  ON intent wins, nine stale/busy rejections, zero
  real execution effects.
- Windows and Linux both passed
  `SYNTHETIC_OAUTH_CROSS_PROCESS_WRITER_EXCLUSION_PASS`:
  4 rounds of 3 Node writers, 24 dummy clients retained
  per round, no stale foreign lock deleted.
- Windows `SYNTHETIC_MULTI_SUPERVISOR_CUTOVER_FENCE_PASS
  cases=50 negativeCases=48 positiveFixtures=2`;
  downloaded isolated Windows bundle
  `DOWNLOADED_ARTIFACT_SHA256_VERIFIED files=3480`.
  This was only CI staging, NOT an owner PC installation.

**Actual new protective behavior:**
`JsonOAuthStore.load()` now allows new blank OAuth
state only if `oauth.json` was *initially absent* and
this same process instance has never observed/persisted
a valid OAuth file. If a known-good store disappears
after registration or between `lstat` and `readFile`,
writes fail closed with `OAUTH_STORE_READ_FAILED`
instead of losing client/token records. Symlinks and
non-files fail closed. The source tests simulate
disappearance and restore bytes in a disposable fixture,
asserting both synthetic **registered-client identity
and refresh-token record** survive restoration.
This is SAME-PROCESS protection; a fresh process that
never saw prior state requires owner-pinned backups or
a separate durable provenance fence to detect prior
external deletion. Nothing in this source repairs a
lost real OAuth file or authorizes an auto-rotation.

**Independent Windows OAuth contention decision tests:**
exact source/test `0b2558a2003a9023629f532eb0502a628d74497d`
[CI 41367547751](https://github.com/GBY0824/chatgpt2codex/actions/runs/41367547751)
also **COMPLETED SUCCESS 3/3**. Sixteen deterministic
cases ensure Windows EPERM with missing/unknown lock
only retries bounded OS-atomic exclusive creation,
with persistent denial as actual IO failure;
the prior flake run remains archived, not hidden.

**Live host remains untouched:** fresh read-only
Codex bridge observed original 7979 one listener,
isolated 7987 one listener, and main original Task
Scheduler state Running. No installed program,
Windows service/task/Startup, OAuth clients/tokens,
ChatGPT consumer CHAT, Chrome or real research worker
was touched. PR #1 remains DRAFT unmerged.
The installed Windows watchdog remains byte-different
from preserved GitHub research script; original
relaunch modes not fully proven. Original v0.2.0
does not honor candidate OAuth lock and may not
be dual-written. Official ordinary consumer native
Project CHAT limit/successor attestation remains
unavailable or unproven; no client API/Work/dots
substitution is accepted.

**Next stage priority:** with separately approved
access verify exact installed watcher/launcher/
WScript/Startup bytes and per-argument control flow;
prepare owner-approved reversible isolated OAuth
snapshot+single-writer migration. Genuine ordinary
consumer CHAT limit notification, native same-Project
successor and P3 research permit need their own
independent evidence. Actual GOAL research effects
**0**, unattended rollover **0/2**.

---


## 2026-11-02 KST — OWNER REQUEST: CLOSE OLD PROBLEMS, THEN ADVANCE; OAUTH PERSISTENCE RECOVERY

**Manual user turn**, no unattended rollover. Draft PR #1
`goal-app-auth-review-20261101`; original 7979, isolated stage
7987, Windows original installed binaries, scheduled tasks,
Chrome and all actual user OAuth state untouched. Live Codex
read-only check in this turn independently found exactly
one listener on original 7979 and one on stage 7987, and
`ChatGPT To Codex MCP - Tailscale` task **Running**.
No OAuth or command-line raw text read from owner PC.

**Baseline independently verified:** previous HEAD
`2486842d1ec664e471c68865a1835f74bd259d91`,
[Actions 41367236267](https://github.com/GBY0824/chatgpt2codex/actions/runs/41367236267)
**COMPLETED SUCCESS Linux/Windows/macOS 3/3**.

**Windows OAuth open EPERM reproducibility/test quality improved:**
- New source-only `decideOAuthExclusiveOpenFailure`
  in `src/auth/oauth-store.ts` at commit
  `ea0db7c8f5b4c7a9d2089be65a0aa4baa6740c1b`
  factors current actual exclusive `wx` open decision into
  `retry | busy | io-failed`. User data writes remain impossible
  until OS exclusive open genuinely succeeds. Verified existing
  lock can return BUSY after <=5s; unverified Windows EPERM/
  EACCES becomes I/O FAILED after <=5s (not false ownership);
  other platform/errno errors fail immediately. This preserves
  the earlier bounded behavior; no unapproved live changes.
- Unit tests commit
  `0b2558a2003a9023629f532eb0502a628d74497d`
  runs **16 deterministic input combinations** including
  expired timeout and *unverified* EPERM, not just helper
  boolean. This is deterministic policy coverage rather than
  a fake claim to inject real Windows OS errors.
- Exact
  [Actions 41367547751](https://github.com/GBY0824/chatgpt2codex/actions/runs/41367547751)
  source/test SHA `0b2558a...`
  **COMPLETED SUCCESS Linux/Windows/macOS 3/3**.
  Existing historical intermittent EPERM runs remain documented.
  A set of passing tests does NOT prove no future EPERM;
  errno-category diagnostics and cross-process four-round test
  stay active.

**Second, separately important OAuth existing-state protection:**
Previous `JsonOAuthStore.load()` considered `ENOENT`
from a single `readFile` equivalent to a new, empty OAuth
store. If an already-registered `oauth.json` vanished
between existing-file check and read, or after it had been
loaded earlier by the same process, a later write might
silently start a new empty store and discard registered
client and refresh-token continuity. Candidate source
`ea57917479c7685275e7f27a62d682d35f2f2baf`
now separates initial missing `lstat` from later
`readFile` errors, refuses symlink/non-file state, and
remembers when the same store instance has already
observed or persisted an OAuth state file. Any later
disappearance triggers `OAUTH_STORE_READ_FAILED`,
not silently replacing an established store with an
empty document. Initial truly absent file still
allows fresh first-time initialization. This is
**same-instance safety only**, not a cryptographic
proof of past state after a whole-process restart
without an owner backup/anchor.

New tests
`624aa38e5339706d09912bd6e125b569d8f2b9b3`,
expanded at
`dfed328cc3e7da50732d53f11f4553b9083671ac`,
register a synthetic client, save a synthetic refresh
token, remove the existing store, assert both reads
and every candidate write REFUSE, restore original
bytes, and verify both client and refresh-token
records retained. These are disposable test files,
**not owner state**. Latest
[Actions 41367840079](https://github.com/GBY0824/chatgpt2codex/actions/runs/41367840079)
for exact expanded tests was queued on initial receipt;
check Linux+Windows+macOS completion before claiming
3/3. Earlier `624aa38e...` native Windows still
in progress at prior check.

**Unresolved production gates still separate:**
(1) real installed Windows watchdog differs from GitHub
archived watcher; shared WScript/Startup/scheduler paths
need owner-authorized source/behavior attestation;
(2) existing old v0.2.0 ignores candidate OAuth writer lock,
so no shared state or live cutover without explicit
owner-approved reversible quiescence/backup;
(3) OpenAI's documented MCP Events apply to Work/dots,
not provider-attested ordinary consumer native Project
CHAT context-limit and same-Project successor;
(4) GOAL ON/OFF app intent is not a P3 research executor
permit. Real GOAL effects **0**, real ordinary CHAT
unattended rollovers **0/2**. PR #1 remains DRAFT
UNMERGED. Never label synthetic testing as actual rollout.

---


## 2026-11-02 KST — VERIFIED LATEST OAUTH WINDOWS EPERM RETRY SOURCE CI 3/3

**Exact independently verified latest source + unit tests SHA:**
`aeac9dc927bb1d80975f4ebe41e15c95ba0effaa`,
[GitHub Actions 41366873885](https://github.com/GBY0824/chatgpt2codex/actions/runs/41366873885)
**COMPLETED SUCCESS 3/3** (Linux, hosted native Windows,
macOS). Read real Windows job logs:
`SYNTHETIC_MULTI_SUPERVISOR_CUTOVER_FENCE_PASS
cases=50 negativeCases=48 positiveFixtures=2`;
`SYNTHETIC_GOAL_CROSS_PROCESS_INTENT_EXCLUSION_PASS`
12 child processes / 4 synthetic ON wins / 9 denied;
`SYNTHETIC_OAUTH_CROSS_PROCESS_WRITER_EXCLUSION_PASS`
4 distinct synthetic rounds, 3 actual Node writers per
round, 24 mock clients retained per round, one foreign
lock refused; and Windows isolated archive
`DOWNLOADED_ARTIFACT_SHA256_VERIFIED files=3480`.
No production code was installed or exercised.

**Caution despite success:** exact source run
`25292373...` / Windows job
[41366400794](https://github.com/GBY0824/chatgpt2codex/actions/runs/41366400794)
FAILED with sanitized `errno=EPERM:reason=LOCK_IO_FAILED`
in a previous concurrent test; a later green cannot
mathematically exclude further rare Windows errors.
Source `c6a58dcc...` only permits a bounded 5-second
repetition of the SAME OS-exclusive `wx` open on
Win32 EPERM/EACCES without interpreting unknown lock
as owned. On persistent unverified error it still
raises IO_FAILED, never silently grants access.
Keep diagnostic and four-round regression checks.

OpenAI [official MCP Events documentation](https://developers.openai.com/plugins/build/mcp-events)
currently specifies Work chats and dots for events,
not normal consumer ChatGPT Project chat limit
notifications or creation of its native successor;
`_meta["openai/session"]` is tool-call correlation
only per [plugin reference](https://developers.openai.com/plugins/reference).
Do not silently substitute Work or API `/conversations`
for user's ordinary CHAT 2/2 success contract.
Provider-attested ordinary CHAT limit/turn and successor
creation remain missing. The historical deployed
watchdog bytes differ from saved GitHub research source.
Original Windows 7979 and separate stage 7987,
Windows Scheduled Tasks, existing OAuth and Chrome
remain untouched. PR #1 DRAFT UNMERGED.
**Actual GOAL research executions 0, unattended CHAT rollover 0/2.**

**Next safe action:** read back latest HEAD after this
docs commit, assess whether official ordinary consumer
CHAT attestor becomes available, and continue privately
approved deployed-script provenance/rollback design.
No live task disable, OAuth rotation, installer execution,
GOAL dispatch or rollover proof without explicit authority.

---


## 2026-11-02 KST — OFFICIAL OPENAI MCP EVENT SCOPE AND SECOND WINDOWS RETRY

**Current official developer documentation independently reviewed:**
- OpenAI [MCP Events](https://developers.openai.com/plugins/build/mcp-events):
  **event subscriptions are documented for Work chats
  on web, Work + Cloud desktop, and dots**. Although a connected
  MCP can publish updates via events/list/subscribe/unsubscribe,
  the currently documented mechanism is **NOT a verified
  original ordinary consumer ChatGPT Project CHAT turn/limit
  event attestor**, and its destinations are not documented as
  an API for native same-Project chat rollover. Do not change
  the user's exact ordinary CHAT 2/2 target to Work or dots.
- OpenAI [Plugin reference](https://developers.openai.com/plugins/reference):
  tool-call `_meta["openai/session"]` is an **anonymized
  conversation/session correlation hint** available during tool
  invocations. It does not prove every Android/desktop user
  turn, context-limit boundary or newly created successor.
  Other client user-agent hints are best-effort; no identity
  or Goal authorization may rest on them.
- OpenAI [Conversations API create](https://developers.openai.com/api/reference/resources/conversations/methods/create)
  documents `POST /conversations` for API-managed
  conversations, not an API to create a new ordinary
  consumer ChatGPT Project CHAT. Do not substitute API chat
  for the acceptance contract.
These are **documented current support boundaries**, not
proof that future platform features can never exist.
Stay blocked on authenticated original provider turn/limit
event + exact native same-Project successor.

**Actual intermittent Windows native CI root evidence:**
previous source SHA `25292373...` had Windows FAILED
`SYNTHETIC_WRITER_EXIT_1:errno=EPERM:reason=LOCK_IO_FAILED`;
the earlier EACCES/EPERM retry required positive `lstat`
evidence and could refuse when no regular lock was seen.
This is not proof that any production OAuth token was touched.

**Second fail-closed candidate refinement:**
`c6a58dcc445612eaeb741e771426765051af104f`
recognizes unverified Windows EPERM/EACCES only as a
*transient OS exclusive-open denial*, NOT a verified
competing writer lock. It retries **exactly the same
atomic `wx`** until <=5s deadline; unless `wx`
succeeds, no OAuth state transaction occurs. If a
regular existing lock was observed the timeout remains
`BUSY_OR_STALE`; with unverified/missing pathname
persistent denial remains `OAUTH_WRITE_LOCK_IO_FAILED`,
with no automatic deletion/reclamation. All other
errno and non-Windows access failures remain immediately
fail-closed. Regression `aeac9dc927bb1d80975f4ebe41e15c95ba0effaa`
distinguishes the two categories.
[Actions 41366873885](https://github.com/GBY0824/chatgpt2codex/actions/runs/41366873885)
had Linux/macOS success, hosted native Windows
GOAL race and OAuth 4-round cross-process steps SUCCESS,
and final artifact verification still PENDING at the
initial observation. Recheck all jobs for exact SHA
before declaring complete CI 3/3; also retain the
FAILED 41366400794 evidence because a later green
does not prove flakiness impossible forever.

No original deployed Windows 7979/isolated 7987
or user OAuth/Task Scheduler/Chrome/consumer ChatGPT
state was modified. The downloaded Windows stage bundle
is NOT installed. PR #1 remains DRAFT/UNMERGED.
Actual GOAL research effects 0; genuine unattended
native Project CHAT rollover 0/2. Only user-triggered
continuation in this turn, not an unattended transition.

---


## 2026-11-02 KST — INTERMITTENT WINDOWS EPERM STILL OBSERVED; BOUNDED RETRY REPAIR UNDER CI

**Corrective evidence after earlier 3/3 green:** exact source
`25292373d79022bd8b4ded5883df2837d09f3a71`
[Actions 41366400794](https://github.com/GBY0824/chatgpt2codex/actions/runs/41366400794)
**COMPLETED FAILURE** native Windows, despite successful Linux
source and macOS jobs. The Windows failure again occurred during
independently spawned synthetic OAuth client writers, but the new
sanitized test diagnostic now proves
`SYNTHETIC_WRITER_EXIT_1:errno=EPERM:reason=LOCK_IO_FAILED`.
Thus the *previous* limited retry fix did not fully eliminate the
intermittent Windows issue. An EPERM was received when the open
attempt had NOT independently verified a regular lock pathname.
Earlier 3/3 successful runs do not make this failure disappear.

**Source-only second refinement:**
`src/auth/oauth-store.ts` commit
`c6a58dcc445612eaeb741e771426765051af104f`
separates two concepts:
(1) a **verified** competing writer lock (EEXIST or
Windows EPERM/EACCES where an existing ordinary file is
positively seen), and
(2) Windows EPERM/EACCES from `open(path, 'wx')` when a
competing file cannot be observed.
Both can retry the **same OS-enforced atomic exclusive
open** under the original <=5s deadline, but (2) is NEVER
reported as verified lock ownership and **MUST fail as
`OAUTH_WRITE_LOCK_IO_FAILED` on deadline** rather than
fabricating `BUSY_OR_STALE`. Nothing writes state until
`wx` actually succeeds, and no foreign claim is removed.
Other OS errors and non-Windows EPERM/EACCES continue
to fail immediately. Pure regression classification cases
committed `aeac9dc927bb1d80975f4ebe41e15c95ba0effaa`.
Corresponding
[Actions 41366873885](https://github.com/GBY0824/chatgpt2codex/actions/runs/41366873885)
was in progress at initial note: verify actual native Windows
cross-process and artifact final result. Continue retaining
sanitized errno-only failure receipts; do not label flaky
Windows behavior resolved based on a single successful run.

**Earlier good CI unaffected:** source/test
`39bebe89c63b837c61a32b6bf2a9b616aaca8332`
[Actions 41366425924](https://github.com/GBY0824/chatgpt2codex/actions/runs/41366425924)
**COMPLETED 3/3 SUCCESS** with GOAL OFF-fence fail-closed
and 4-round synthetic OAuth writer tests. But the
separate FAILED 41366400794 proves intermittent EPERM
could recur; both facts are preserved.

The user's original and isolated Windows 7979/7987,
Task Scheduler, Startup, OAuth issuers, tokens and
consumer ChatGPT Project chat were not touched.
GOAL's real research cycles **0**, genuine unattended
same-Project rollover **0/2**. The installed watchdog
remains different from saved GitHub source, and a
separately owner-approved reversible single-writer
cutover and genuine provider-attested ChatGPT consumer
event/successor remain missing. PR #1 draft, no merge.

---


## 2026-11-02 KST — INDEPENDENT 3/3 VERIFIED CURRENT SOURCE (OAUTH + OFF FENCE)

**New latest VERIFIABLE code/test source SHA:**
`39bebe89c63b837c61a32b6bf2a9b616aaca8332`,
[GitHub Actions 41366425924](https://github.com/GBY0824/chatgpt2codex/actions/runs/41366425924)
**COMPLETED SUCCESS, all 3 independent jobs**
(Linux source verification, native Windows regressions, full macOS).
Read the actual Linux/Windows job logs:

- Linux focused source tests **43 passed / 43**.
  Native Windows **42 passed / 1 skipped** in 5 files,
  with typecheck and Windows build success.
- BOTH Linux and Windows independently report
  `SYNTHETIC_GOAL_CROSS_PROCESS_INTENT_EXCLUSION_PASS`
  (12 Node child processes; 4 committed ON intents and
  9 rejected stale/busy requests, 0 actual effects).
- BOTH report
  `SYNTHETIC_OAUTH_CROSS_PROCESS_WRITER_EXCLUSION_PASS`
  (3 independent clients per round × **4 synthetic rounds**
  = 12 normal workers, plus 1 stale-lock probe;
  24 unique clients per round; no lock leaked or removed
  without ownership; `legacyWriterAlsoHonorsLock=false`).
- Windows `SYNTHETIC_MULTI_SUPERVISOR_CUTOVER_FENCE_PASS
  cases=50 negativeCases=48 positiveFixtures=2`.
  Stage package download SHA-256 verified **3,480** files.
  None of this ran against the owner's real installed service
  or live authentication state.

**Originally detected failure and repair is now CLOSED at the
source/CI level:** prior docs SHA `a6233283...`,
[Actions 41362546187](https://github.com/GBY0824/chatgpt2codex/actions/runs/41362546187)
had Windows writer I/O failure.
Source `6039f030...` verifies existing *regular* lock on
Windows EPERM/EACCES before bounded contention retry; other IO
errors still fail closed. CI child diagnostics reveal errno
category only. Four-round real process regression at
`a6d424a...`, independently [Actions 41366259726](https://github.com/GBY0824/chatgpt2codex/actions/runs/41366259726),
also **COMPLETED SUCCESS 3/3**. A transient failure in an
earlier run is not proof it can never recur; retain errno
diagnostics and regression.

**GOAL OFF revocation fence protected:** revised
`src/server/goal-app-intent.ts` checks initial
`lstat` separately from existing-state `readFile`;
non-file/symlink, unreadable/race-disappearing, oversized or
corrupted existing ledger fails closed, not a fake new
OFF revision zero. Source commits
`00086832...`, `25292373...`; negative tests
`39bebe89...`. Unit tests do **not** deterministically
inject stat/read removal between syscalls; the code's
safe behavior is inspected and surrounding errors tested.

**Actual owner Windows production unchanged:** original
7979 old MCP, independent 7987 candidate stage, original
Tailscale Task Scheduler and OAuth records untouched;
PR #1 remains DRAFT UNMERGED. The installed watchdog
differs from the GitHub research archived script, so
live auto-relaunch authority is not fully audited.
Previous connected local detailed AST query was DENIED
and not bypassed. Never share old 0.2.0 OAuth writer
state with a new candidate.

**Goal still requires provider and owner gates:**
Authenticated ordinary consumer ChatGPT Project CHAT
context-limit/turn attestation, authenticated exact same-Project
successor created unattended and separate approved P3
research executor. No source or CI result establishes
these provider capabilities. ACTUAL GOAL executions **0**;
genuine unattended rollovers **0/2**.

**Safe next step:** independently verify current fork
PR HEAD and CI after this documentation commit;
only with additional approved access verify deployed
watchdog/launcher/WScript/Startup roles and OAuth issuer,
prepare reversible original-state backup in private.
Do not stop/install/rotate/merge or claim rollover.
GitHub Issue #2 and this file form continuity.

---


## 2026-11-02 KST — NEW: WINDOWS OAUTH LOCK-OPEN FLUKE + GOAL OFF FENCE RACE

This continuation was explicitly requested by user, **NOT** an
unattended consumer CHAT rollover. All changes source/tests/docs
only on review branch `goal-app-auth-review-20261101`; PR #1
remains DRAFT UNMERGED. Original running Windows MCP port 7979,
isolated stage 7987, Scheduler, OAuth clients/tokens, browser and
installed binaries have NOT been changed. Real GOAL work **0**;
same-Project ordinary consumer CHAT unattended rollovers **0/2**.

**New actual CI failure discovered:** prior docs HEAD
`a6233283cba2f127bdf50f9d25558f396ac566cc`,
[GitHub Actions 41362546187](https://github.com/GBY0824/chatgpt2codex/actions/runs/41362546187)
**COMPLETED FAILURE** (Linux source and macOS SUCCESS,
native Windows FAILURE in
`Windows separate candidate processes serialize OAuth client writes`).
Native Windows log shows `OAUTH_WRITE_LOCK_IO_FAILED` from
the candidate `open('oauth-write.lock', 'wx')` cross-process
test. The underlying errno was initially NOT logged, so it is
NOT verified whether this was an OS sharing transient or actual
permission/IO error. Earlier runs for this test had passed;
do not misstate this as normal successful CI.

**Bounded OAuth protection repair, source only:**
- `src/auth/oauth-store.ts` commit
  `6039f030c199c3fb21030b32048279534e590287`:
  preserve normal EEXIST busy retry. On **Windows only**
  allow EACCES/EPERM as a potential competing-writer condition
  **ONLY after lstat independently verifies a regular lock file
  at exactly the lock pathname**. If not present, unreadable,
  symlink/dir, other errno, or any other platform: immediately
  fail closed with original IO error. Busy cases retain the
  existing strict 5-second deadline, and never steal/delete
  unknown locks.
- `src/auth/oauth-store-failclosed.test.ts` commit
  `57f10cd3e2ed8b8fe5ae5ea605aa79590ce1549e`
  adds platform/errno/verified-file classification negatives.
- `scripts/verify-oauth-writer-lock.mjs` commit
  `4f8920fb7818ba929c755881ef12a79f2700fc60`
  records **errno category only** for a failed disposable
  synthetic child, not private paths or credentials; commit
  `a6d424a7972c17e85cf0ec7dbf04b42b64482de5`
  repeats actual 3-worker x 8-client Windows/Linux contention
  test over **4** fresh synthetic directories, each ensuring
  24 distinct clients and no orphan lock. Its first round
  still tests one stale foreign claim and unchanged OAuth bytes.
  No owner state is used. CI on source at `6039...`,
  `57f10...`, and `4f892...` independently returned
  **COMPLETED SUCCESS Linux/Windows/macOS 3/3**.
  New four-round SHA
  [Actions 41366259726](https://github.com/GBY0824/chatgpt2codex/actions/runs/41366259726)
  had Linux/macOS success and Windows still in progress at
  first checkpoint. Verify final independently.

**Additional GOAL ledger safety defect, source only:**
`goal-app-intent.ts` previously grouped `stat` and
`readFile` under the same catch that returned the initial
OFF, revision-0 state on *any* ENOENT. If a previously
existing OFF-fence ledger disappeared after stat but before
read, the catch could silently reinitialize revision zero.
Commit `00086832cbba583f7e2f096b61f0b700f03ac45d`
now distinguishes initial missing pathname from failure while
reading an existing ledger: latter gets
`APP_GOAL_LEDGER_READ_FAILED`, not silent fresh state;
also re-checks bounded UTF-8 size after read. Commit
`25292373d79022bd8b4ded5883df2837d09f3a71`
uses `lstat` to refuse a symlink/non-file ledger.
Tests `39bebe89c63b837c61a32b6bf2a9b616aaca8332`
assert absent-initial OFF, non-file refusal, oversized/malformed
refusal, and preserved known OFF revision after original bytes
are restored. These are controlled disposable fixtures only;
not a deterministic injected stat/read race test.
The latest exact code/test
[Actions 41366425924](https://github.com/GBY0824/chatgpt2codex/actions/runs/41366425924)
was **IN PROGRESS** when first checked; recheck final
Linux/Windows/macOS job outcomes before claiming 3/3.

**Near-term safe next step:** verify all CI for precise
`a6d424...` and `39bebe...`, fix actual test failures
rather than weakening fail-closed auth. Then require
separately authorized deployed watchdog/launcher/WScript/
Startup provenance (real installed watchdog differs from
GitHub archived watcher), explicit owner-approved one-writer
reversible old-v0.2.0 OAuth cutover, official authenticated
original consumer CHAT turn/context limit/same-Project
successor provenance and separate P3 GOAL work permit.
Existing app GOAL ON/OFF ledger is **intent only**,
not authority to execute work, and no mechanism proven here
can actually create an unattended ordinary consumer CHAT.
No denial bypass, no scheduled workaround, no live migration.

---


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
