# One-MCP integration gates — production 7979, review 7987

**Status:** compatibility validation in progress. **NO production deployment or merge approved.**
This is an upgrade of the *same* ChatGPT To Codex codebase, **not** a permanent second MCP service.

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
