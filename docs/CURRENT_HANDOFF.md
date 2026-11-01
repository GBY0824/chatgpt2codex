# CURRENT_HANDOFF — single-MCP GOAL integration / Runtime V3 research

> **Canonical continuity file for new ChatGPT conversations.** This document is
> intentionally committed to the research branch so a fresh assistant can
> identify the goal, code, evidence, gates and exact next action. **Do not
> treat the SHA/run values below as live until verified against GitHub.**

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
  unique owner. Expanded source inspection outputs only counts,
  basename-only ancestry and Startup-presence booleans. Do not disable
  startup or scheduled tasks without separate cutover approval.

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
- **Latest independently verified all-platform source baseline:**
  `a5b1328cf75d290519d29286aa9d74dc2e09c8d6`,
  [Actions 41336172569](https://github.com/GBY0824/chatgpt2codex/actions/runs/41336172569)
  **COMPLETED SUCCESS 3/3**. It includes sanitized process ancestry/
  current-user Startup inspection on synthetic Windows sockets and
  preserves all prior OAuth concurrency and 3,480-file checksum tests.
  New Scheduled Task metadata counts and non-attribution CI on source
  SHA `fc87df3b4335350ba0b3f1c43a344ac5103d777c`
  ([Actions 41336612917](https://github.com/GBY0824/chatgpt2codex/actions/runs/41336612917))
  were **in progress at this handoff edit**; check before claiming PASS.
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
4. Only after source tests: obtain **authorized read-only** information
   on original Windows 7979 service/Task/launcher ownership and exact
   existing OAuth issuer + state path. Earlier deeper OS inspection was
   blocked by `APPROVAL_REQUIRED`: never bypass or invent proof.
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
