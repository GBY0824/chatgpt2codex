# GOAL app-command OAuth review (not deployed)

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
