# GOAL app-command OAuth review (not deployed)

## 2026-11-02 KST — APP GOAL ON/OFF -> governed host notification hook (source only)

**Actual implementation direction is now GOAL-first**, not another
iteration of unrelated OAuth snapshot hardening. The candidate
single ORIGINAL MCP now supports a **bounded post-commit event hook**
to which a future separately authorized research host may subscribe
within the same MCP runtime. This does NOT create a second MCP,
a scheduled watcher, a browser message sender, a P3 writer,
or autonomous research authority.

- Candidate source `src/server/goal-app-intent.ts`
  `5b9ef83be43a712eba8ffad7c4e7c58872757e64`
  exports typed `PersistedGoalAppNotice`,
  `GoalAppNoticeHost`, and the optional
  `goalAppCommand(..., onPersistedNotice)`.
  After a **server-verified** OAuth goal-scope APP request
  saves the ON or OFF intent and releases its exclusive
  ledger lock, the optional host is notified once with
  `source="OAUTH_SCOPED_APP_INTENT"`,
  revision, command ID and a SHA256 **opaque client
  fingerprint**, but no raw OAuth token/client ID or
  ChatGPT turn claim. The typed record explicitly says
  `originalChatTurnAttested=false` and
  `researchExecutionAuthorized=false`.
  The current host must independently verify current
  P4 Stage, P3 owner/one-use work permit and actual
  ledger freshness before starting any worker.
- Repeated ON with unchanged revision no longer rotates
  `lastCommandId` or produces a second notification;
  pre-existing OFF safety continues to win. Patch
  `3dfd7b893a12dff5fa633e387df2f65647c8db09`.
- Host notifications are attempted **after unlocking**,
  so a slow ON observation never prevents GOAL OFF
  revocation. A callback failure cannot roll back an
  already persisted OFF, falsely grant a work permit
  or silently count completed work: it reports
  `APP_GOAL_NOTICE_UNVERIFIED_RECONCILIATION_REQUIRED`.
  No automatic resend of an ambiguous ON; an owner
  host must reconcile durable ledger revision/command ID.
- `src/types.ts` commit
  `282d148a89d6adbc0844960f0a19bd70d4c8b623`
  adds **optional, disabled-by-default**
  `ToolContext.goalAppNoticeHost` callback, and
  `src/server/tools.ts` commit
  `801642fd02b3ca6ebe670b4a46852acf9395e217`
  passes it to the already-registered original MCP
  `goal_app_command` implementation.
  Neither HTTP nor stdio runtime currently injects a
  P3-capable host; that is a separate approval boundary.
- Synthetic Vitest at
  `b2ff3c73273c067c2f703fdaca1b26801c5e6eb6`
  executes real in-process callback delivery for distinct
  authenticated fake ON/OFF requests, duplicate ON
  suppression, callback failure/durable state recovery
  and a paused ON callback while OFF persists. It
  proves no P3 permission, execution or consumer
  ChatGPT provider-turn proof was minted.
- Exact source+test
  [Actions 41391113493](https://github.com/GBY0824/chatgpt2codex/actions/runs/41391113493)
  Linux focused tests, TypeScript and build and macOS
  control regressions **SUCCESS**; native Windows
  full CI still **IN PROGRESS** at first checkpoint.
  Check full 3/3 independently before claiming it.

**LIVE owner-PC GOAL readiness** read-only code through
connected original ChatGPT To Codex:
`python -B tools/runtime_vnext/goal_control_mcp/server.py --readiness`
returned **GOAL_READINESS_BLOCKED** with `P3 COMPLETE`,
`P4R ACTIVE`, `P4 PENDING`, Chrome self-report fresh
but NOT provider-authenticated, and
`goal_execution_authorized=false`, `effects_issued=0`,
`accepted_unattended_rollovers=0/2`.
Thus this candidate APP event hook is necessary plumbing,
NOT the actual operational Goal loop. No protected
Stage edit, P3 owner grant, live OAuth cutover,
MCP reinstall, Chrome action, Work/dots substitution
or worker execution occurred.

---


## 2026-11-02 KST — real independent Node processes, synthetic GOAL state only

Candidate script
`scripts/verify-goal-intent-cross-process.mjs` at source
[commit f02d615bfa660dd593383fb27773faa52e968a04](https://github.com/GBY0824/chatgpt2codex/commit/f02d615bfa660dd593383fb27773faa52e968a04)
runs **3 separate Node.js child processes per round**, 4 rounds,
against new random synthetic `goal-app-command-intent.json`
directories. Every child presents synthetic APP-scope auth and the
same `expectedRevision=0` while attempting `ON`.
The test requires exactly 1 committed intent (revision 1) per
round, and 2 rejected/stale or lock-busy attempts (12 processes in
total). It verifies the lock marker is removed after normal
completion. Another child attempts to write with a deliberately
stale foreign marker and must fail without removing it or creating
the GOAL ledger. The test **never touches any owner directory,
OAuth client/token, browser CHAT, Scheduler task or installed MCP**.

[Workflow 5c2f392ee2c74ae180e1407805143b650e164e56](https://github.com/GBY0824/chatgpt2codex/commit/5c2f392ee2c74ae180e1407805143b650e164e56)
runs this real process-spawn synthetic regression against the
compiled candidate on both Linux and native Windows after
`npm run build`. The output asserts
`SYNTHETIC_GOAL_CROSS_PROCESS_INTENT_EXCLUSION_PASS`,
`noEffectsAuthorized=true`, and
`originalConsumerTurnAttested=false`.
New [Actions 41362146220](https://github.com/GBY0824/chatgpt2codex/actions/runs/41362146220)
was **IN PROGRESS** on initial receipt. Check the exact SHA's
full Linux/Windows/macOS results before declaring PASS.

Even an all-green result would prove only **candidate app intent
ledger safety**, not authentic consumer CHAT event ingestion, not
research execution approval, and not unattended rollover.
Real GOAL execution 0; ordinary Project CHAT automatic rollover 0/2.

---


## 2026-11-02 KST — GOAL intent ledger lock ownership repair (source only)

The previous source-only `goalAppCommand` wrote app-level intent
under a `wx` exclusive `goal-app-command-intent.json.lock` marker,
but its `finally` unconditionally closed and unlinked the marker.
This could remove **another process's replacement lock** if a
local operator or process replaced/modified the path during the
current transaction. It did not authorize research, but could
undermine safe concurrency and orderly owner recovery.

**Candidate repair** at
[code dcd919facb08c4817bd578324fc1f4daa0815fed](https://github.com/GBY0824/chatgpt2codex/commit/dcd919facb08c4817bd578324fc1f4daa0815fed):
`withGoalIntentClaim` writes a random nonce into the owned marker,
pins its `dev`/`ino`, and before cleanup requires matching
bytes, regular-file type and filesystem identity. If any condition
fails, it **does not unlink the foreign or missing lock** and throws
`APP_GOAL_LOCK_OWNERSHIP_LOST`. Existing owner recovery remains
manual on a crashed or stale marker; no automatic PID/age reclamation.
A final check and `unlink` is still a best-effort userspace
operation, **not atomic unlink-by-handle**, just as the existing
OAuth writer lock policy warns. Do not conflate GOAL intent locking
with original v0.2.0's unprotected OAuth writer.

[Tests 30ec36c6ab819587b4ef5d58d928276505034ebd](https://github.com/GBY0824/chatgpt2codex/commit/30ec36c6ab819587b4ef5d58d928276505034ebd)
cover (a) normal claim cleanup, (b) same-inode content/nonce
replacement, (c) different-inode replacement, (d) missing lock, and
(e) refusal to start another claimant while a foreign lock remains.
They operate only in random disposable test directories.

**Actual CI diagnosis and repair:** source/Windows CI for intermediate
SHA `dcd919fa` and tests SHA `30ec36c6` FAILED
at Linux `npm run typecheck`, `TS2322`, because the narrower
`ON|OFF` value widened to include `status` inside a new
async closure. Fixed at
[1bddc0b4cde3801342bdb989e329fc983fad4fa4](https://github.com/GBY0824/chatgpt2codex/commit/1bddc0b4cde3801342bdb989e329fc983fad4fa4).
Independent Linux source tests, build, typecheck and macOS full
regressions passed at
[Actions 41361889807](https://github.com/GBY0824/chatgpt2codex/actions/runs/41361889807);
native Windows was still IN PROGRESS at first checkpoint and must
be checked for a final 3/3. No production file, authentication
client, Chrome, Windows task, browser or Project CHAT changed.

This is ONLY APP-level GOAL intent concurrency hardening.
Authenticated original consumer ChatGPT user-turn/Project successor
attestation and authorized P3 research execution are still absent.
Actual GOAL cycles 0, genuine unattended normal CHAT rollovers 0/2.

---


This branch modifies the **source fork only**. It does not replace or restart the user's installed ChatGPT To Codex v0.2.0, Chrome Runtime V3, Tailscale Funnel, OAuth credentials, Windows services, or research Stage.

## Behavior

- Existing default `chatgpt2codex` OAuth scope and all existing MCP tool registrations stay intact.
- Add an opt-in `chatgpt2codex.goal` OAuth scope and `goal_app_command` tool; a successful **server-verified** MCP bearer request must include both scopes, a nonexpired token, the authenticated resource and a remote HTTPS origin. Model-supplied owner/identity/credential values are never tool arguments.
- `goal_app_command({action:"status"})` reads the independent app-intent ledger without effects.
- `ON` requires `expectedRevision` from the current status; a stale revision blocks an old ON from re-enabling after OFF. `OFF` always increments the revocation fence. Cross-process file-locking and atomic/fsync persistence fail closed on unknown/corrupt state.
- Recorded ON is **intent only**: `researchExecutionAuthorized=false`, `originalChatTurnAttested=false`, `effectsIssued=0`.
- The OAuth owner-token authorization screen will require **explicit owner consent/reconnection** to receive the new scope. Previously issued default-scope tokens must fail closed on the new tool.
- The existing protected P3 preregistration/Stage authority and one-use research permit remain completely separate. No new worker, publisher, scheduled task, browser SEND/OPEN, or rollover service is registered.

## Review gates

1. **Current verified source CI: run #41285148711 SUCCESS**, code SHA `08ae37b219c7e485c49e6f1efa4296a4cecfef9c`. Linux Node 22: full `npm run typecheck`, 22/22 GOAL/MCP scoped tests, full `npm run build`; macOS Node 22: complete `npm test` 417/417 PASS across 38 files. Previous run #41283091691 (20/20, 415/415) is superseded.
2. **CI verified real local HTTP OAuth + MCP integration**: an old basic-only OAuth token cannot call `goal_app_command`, a separately authorized goal-scoped token can read status and record ON/OFF, and stale ON is blocked after OFF. The isolated test uses authenticated `http://127.0.0.1` loopback; production Funnel remains HTTPS, and no live owner token or user production session was used. Additional non-loopback TLS staging remains necessary before real production rollout.
3. Owner-approved Windows deployment to a staging runtime, original binary backup, explicit rollback, and separate installed-version confirmation. Do NOT overwrite `C:\Users\khosw\AppData\Local\Programs\ChatGPT To Codex\dist\` during code review.
3a. **New isolated tests (2026-11-01)**: CA-verified temporary HTTPS listener exercises real OAuth discovery and anonymous `/mcp` refusal. A separate authenticated HTTP/MCP regression denies a basic-only bearer even when reusing the session ID initially created by a goal-scoped token. No TLS trust bypass, production access or credential use. This is **local test HTTPS**, not production-equivalent Tailscale Funnel deployment, user reconsent or consumer CHAT attestation.
3b. **Consent UX gap repaired in source only**: `goal_app_command` now returns an MCP `_meta["mcp/www_authenticate"]` insufficient-scope challenge for a basic-only verified remote caller, with a resource-metadata URL derived from the authenticated server context, never model inputs. Official [OpenAI MCP auth guidance](https://developers.openai.com/plugins/build/auth) requires both per-tool `securitySchemes` and this challenge to offer scoped reauthorization. Native CI verifies it; actual ChatGPT UI and real owner consent are **NOT YET TESTED**.
4. Only then seek lawful original P3 owner/lineage clearance and independently authenticated one-work-permit dispatch. No consumer ChatGPT Project CHAT provider-turn proof is supplied by this OAuth tool: ordinary unattended rollover contract remains 0/2.

## Trust boundary

This feature separates **app-level authenticated owner request** from **original consumer ChatGPT message attestation**. `goal_intake` and `goal_loop` remain development tracking tools, not an auto-work controller. No code here grants permission to bypass earlier denied protected P3 reads.


## 2026-11-01 — Verified Windows CI and full isolated HTTPS owner flow

- New CI source job `windows-source-regressions` executes on **GitHub-hosted Windows**, not the owner's installed machine. OpenSSL temporary-test availability, Node 22 `npm ci`, GOAL/MCP regressions, TypeScript typecheck and build all passed.
- The isolated HTTPS integration now validates certificate trust (`rejectUnauthorized: true`), OAuth discovery, anonymous MCP rejection, DCR client registration, authorization-code + PKCE(S256) owner-token approval using **synthetic test-only credentials**, token exchange, authenticated MCP initialization and `goal_app_command(status)`. The status remains **OFF**, revision 0, `originalChatTurnAttested=false`, `researchExecutionAuthorized=false`, `effectsIssued=0`.
- **CI run 41285928446 SUCCESS**, code commit `2e40eebe0504a563dafe6d7b75f2cc3d20c6aa1b`: Linux 22/22 focused, macOS 417/417 full, Windows 22/22 focused, all configured typecheck/build steps passed. Earlier run `41285762350` had first demonstrated isolated Windows CI success before the expanded HTTPS flow.
- This is **NOT** the owner's Windows production test, a ChatGPT UI OAuth re-consent receipt, a Tailscale Funnel HTTPS test, a consumer ChatGPT provider-turn attestation, or a GOAL execution authorization. Nothing was installed, merged, exposed, scheduled, restarted, or sent through a real research CHAT. Original scientific/Stage and no-replay fences remain unchanged.
- The connected Windows project read-only `npm:runtime:v3-publication-status` returned `publicationVerified=false`, `remoteMainSha=null`, and `remoteAndLocalEqual=false`. Do not interpret that diagnostic as proving canonical local↔remote parity; the separate `npm:runtime:v3-allowlist-summary` returned an existing 3,664 tracked/export entries, but **not a fresh source scan**. A prior read-only local-shell status call timed out. Avoid blind retries, force updates or alternate-tool redaction bypass.
- **Next gated transition (not approved by this CI)**: explicitly owner-approved, rollback-ready, isolated Windows staging installation and actual ChatGPT OAuth scope re-consent, without replacing the running v0.2.0 service. Original P3 owner/Stage permission plus independently authenticated exact ordinary consumer CHAT turns remain separate requirements. Actual GOAL cycles 0; unattended ordinary Project CHAT rollover 0/2.

## 2026-11-01 — Isolated Windows bundle and local tool gate

- **Owner Windows source clone exists:** `.goal-app-isolated-stage` inside the registered `freqtrade-mcp` project workspace. Git clone of public `GBY0824/chatgpt2codex` review branch returned exit 0, and `git status --short` returned empty. Its `rev-parse HEAD` output was redacted by the connector; do **not** claim local hash identity. No existing installed app or research writer was changed. Local Node reports v26.12.0 (different from CI Node 22), so no local executable compatibility is asserted.
- **Local dependency install was deliberately NOT completed:** the connected Windows MCP tool returned `exit 64: only npm run is supported by this project-local command shim` for isolated `npm --prefix .goal-app-isolated-stage ci --no-audit --no-fund`. Do **not** route this same denied local installation through an alternate command or wrapper. The clone contains source only, with no verified local `node_modules`, build or running staging server.
- **Independent prebuilt bundle:** GitHub-hosted Windows-only PR CI run [41286665324](https://github.com/GBY0824/chatgpt2codex/actions/runs/41286665324) completed SUCCESS, with test/typecheck/build gates; isolated production-dependency pruning, SHA-256 file manifest, explanatory README and `actions/upload-artifact@v4` succeeded. Workflow edit SHA `95079714aed3a738c33b8699d2e639082eb4a64a`. GitHub artifact ID `13075921221`, name `goal-app-windows-source-65150a0b08995afdeb072b7fa987722255485d06`, size 4,751,850 bytes, expires 2026-11-08 07:55:53 UTC. Note: the artifact name contains the GitHub PR checkout/merge SHA, **not** the source branch head SHA. Check the associated workflow and head independently; do not infer a production install from artifact creation.
- **GitHub artifact is not installed on the Windows PC**. Do not reuse the running :7979 port, existing service owner state, OAuth credentials, Tailscale Funnel or production user account. No real ChatGPT OAuth user re-consent, P3 Stage activation, approved research worker or ordinary consumer CHAT rollover has occurred.
- **Safe resume:** independently verify isolated local clone and existing writer state, then obtain a permitted *local staging installation mechanism* without circumventing the connector's exact `npm ci` refusal. Explicit new OAuth consent requires an actually deployed separate HTTPS staging endpoint and user interaction; neither is present. Original P3 owner clearance, one-use execution permit and consumer CHAT provider-attestation remain independent. Research Goal actual 0; ordinary consumer CHAT rollovers 0/2.


## 2026-11-01 — Root-cause closure and offline isolated-stage package

**Root cause of user's Windows local `npm ci` exit 64 is CONFIRMED.** The original research repository's `npm.cmd` (private continuity `GBY0824/freqtrade-mcp-research/npm.cmd`) explicitly contains `if /I not "%~1"=="run" ... exit /b 64`, so the project's command shim rejects all subcommands other than `npm run`. This is an intentional safety/read-only allowlist, **not a Node.js/Windows dependency installation failure**. The research root's `npm.cmd`, connected MCP command policy, and production Windows installation remain untouched; do not attempt to bypass the denial with a renamed command or alternate interpreter.

**Second root cause exposed during safety review:** original `src/cli.ts` used `os.homedir()/.local/share/chatgpt2codex` as an unconditional state root for all commands. Merely choosing another executable folder or HTTP port could still reuse the installed owner's authentication/ledger state. That would make "isolated" deployment false. Review branch now has:
- `src/state/isolated-state.ts`, `src/state/isolated-state.test.ts`, and guarded `--isolated-state-dir <ABSOLUTE_PATH>` wired through CLI init/serve/owner-token/doctor/control. Existing default remains unchanged. Overlapping state roots (including symlink aliases) are rejected; malformed/non-absolute paths are rejected.
- In isolated HTTP mode the built-in listener is restricted to loopback, an explicit non-7979 port and matching loopback HTTP origin. Inherited desktop control is rejected in stdio/HTTP; local `control` commands are disabled in isolated mode. This **does not** grant HTTPS/Funnel exposure, OAuth re-consent, P3 work permission or official consumer CHAT rollover.
- The temporary review bundle is produced on the GitHub-hosted Windows CI, not within the owner's research-root restricted `npm.cmd` environment.
- `scripts/Prepare-GoalAppOfflineStage.ps1` performs **offline COPY ONLY**: check no production state/install overlap, validate every `SHA256SUMS.txt` entry, reject path escapes, symlinks/duplicates/missing or extra files, copy to a new destination with no overwrite, re-verify the copied contents. It starts no service, asks for no secrets and cannot authorize GOAL work.
- Windows CI tests both valid offline preparation and a deliberately tampered README that must be rejected before any staging. The CLI fail-closed smoke explicitly checks a separate test state does not inherit an owner token and refuses port 7979 without writing state.

**Verified final source CI:** [GitHub Actions run 41287815158](https://github.com/GBY0824/chatgpt2codex/actions/runs/41287815158) SUCCESS for code SHA `6552a904bbd3f70249ac745f92f66d3cc68aa210`: Linux 29/29 focused tests, macOS 424/424 full tests, Windows 28/28 focused tests + 1 Unix-only symlink test skipped, configured typechecks/builds, Windows CLI fail-closed smoke and package verification/tamper-negative all passed. One previous CI failure came from comparing non-canonical path aliases (Windows 8.3 / macOS `/var`); the test now expects canonical resolved paths. Another came from a PowerShell expected-nonzero native process termination; the negative smoke now uses a child process with inspected exit/error, rather than treating expected rejection as CI failure.

**Latest Windows bundle:** artifact ID `13076186053`, name `goal-app-windows-source-15cd9bc4004ff9af35ab07c86d91eec82fa229d1`, size 4,756,502 bytes, expires `2026-11-08T08:12:50Z`. Includes `dist/`, production `node_modules/`, manifest and offline stage preparer. The artifact label contains GitHub's PR merge checkout SHA, **not necessarily** the PR head. Verify the actual workflow run before use. The *existing* local source-only clone `.goal-app-isolated-stage` was created before these changes and has not been updated/installed. Do not infer user-PC package parity or startup from CI.

**Still blocked / requires distinct approval:** There is no authorized binary-transfer/installer tool exposed from the connected ChatGPT To Codex 2 app to copy this ZIP into the user's Windows machine, and the existing project's direct npm installation remains prohibited. Local stage package transfer, separate OAuth owner consent, a separately approved HTTPS endpoint, original P3 owner permission and the independent original consumer CHAT provider turn attestor are not yet verified. Running `GOAL ON` is **not** authorized by a copied package. Actual research GOAL cycles **0**, genuine ordinary Project CHAT rollovers **0/2**.

**Safe next action:** transfer the verified archive through an authorized user-approved file operation (or user download), extract to a separate temporary folder, invoke the bundled offline preparation script with a fresh destination outside the production install and production state, and independently verify it before separately requesting any local-only launch. Do **not** remove the research-root `npm.cmd` restriction, deploy to :7979, reuse existing OAuth tokens or silently merge PR #1.

## 2026-11-01 — Extracted owner ZIP failure root cause and confirmed corrective artifact

The owner actually ran `Prepare-GoalAppOfflineStage.ps1 -BundleRoot .` against the extracted artifact from run 41287815158; it exited **STAGE_BUNDLE_FILE_MISSING** before destination creation. Independent download and ZIP inspection of that exact artifact ID `13076186053` established **3,396 actual archive files vs 3,475 SHA256SUMS entries; 80 missing files**, all dot-named or under dot-named paths (including `node_modules/.bin/node-which` and `node_modules/.package-lock.json`). **Root cause fully confirmed:** `actions/upload-artifact@v4` defaults to excluding hidden files, while the package manifest included them. Neither the owner's extraction location nor the safety script's integrity rejection was wrong. Do not suppress the SHA256 mismatch or weaken the verifier.

Review branch workflow corrected by commit `d8ba9feaf27dd4cf2bf8f96d91f2aed43805b7c4`: upload uses `include-hidden-files: true` for the explicitly assembled staging-only package and then the same CI job **downloads the published artifact** with `actions/download-artifact@v4`, independently checks file count and runs the exact offline stage script on the downloaded bytes. **[Actions 41289995096](https://github.com/GBY0824/chatgpt2codex/actions/runs/41289995096) completed SUCCESS**, including Linux/macOS/Windows jobs and the post-upload round-trip test.

Corrected Windows artifact **ID 13076691869**, name `goal-app-windows-source-eb481d9c7371cb0b9ceaa325f86ac95ad0364695`, expires 2026-11-08 08:43:26 UTC. Independently downloaded ZIP `goal-app-windows-fixed-20261101.zip`: **3,476 archived files including SHA256SUMS, 3,475 manifest entries, all 80 previously omitted dot-files present, zero missing, zero SHA-256 mismatches, zero extra or unsafe manifest paths**. The corrected ZIP was made available to the owner in the same conversation. Earlier artifact 13076186053 is **INVALID for offline deployment and MUST NOT be reused**.

No local Windows app, installed connector, owner OAuth/Stage, research execution or consumer ordinary CHAT rollover was changed. Corrected archive must be extracted into a NEW directory, never mixed into old failed ZIP contents. Only after actual on-PC `STAGE_OFFLINE_PREPARED_ONLY` receipt can local staging copy be called successful. GOAL actual 0; ordinary Project CHAT rollover 0/2.
