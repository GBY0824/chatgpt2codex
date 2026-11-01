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

1. `npm ci`, `npm run typecheck`, `npm test`, `npm run build` in a complete source checkout. This branch has a PR-only GitHub Actions workflow; a green run must be checked before any merge.
2. Additional OAuth integration test against authenticated `/mcp`: no credential, old-scope token, wrong resource and expired token fail; newly owner-consented goal scope can read status/record ON/OFF; repeated stale ON fails after OFF. Do not paste tokens in ChatGPT.
3. Owner-approved Windows deployment to a staging runtime, original binary backup, explicit rollback, and separate installed-version confirmation. Do NOT overwrite `C:\Users\khosw\AppData\Local\Programs\ChatGPT To Codex\dist\` during code review.
4. Only then seek lawful original P3 owner/lineage clearance and independently authenticated one-work-permit dispatch. No consumer ChatGPT Project CHAT provider-turn proof is supplied by this OAuth tool: ordinary unattended rollover contract remains 0/2.

## Trust boundary

This feature separates **app-level authenticated owner request** from **original consumer ChatGPT message attestation**. `goal_intake` and `goal_loop` remain development tracking tools, not an auto-work controller. No code here grants permission to bypass earlier denied protected P3 reads.
