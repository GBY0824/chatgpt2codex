# Owner Windows 7979 startup — read-only observed evidence (2026-11-02 KST)

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
- The Startup observation is based on **entry filenames only**:
  no startup script content, shortcut target, process command-line,
  registry values, Task Scheduler arguments, OAuth files or secrets were
  read or printed.

## What is and is not proven

The runtime process ancestry **`wscript.exe` -> `powershell.exe` ->
`node.exe`** is directly observed. The matching current-user Startup
filename is a plausible lifecycle candidate, **not proof** that this
specific .cmd starts this specific process chain. The initiating login
item vs Task Scheduler vs watchdog remains **UNVERIFIED** until the
owner authorizes the precise lifecycle investigation.

The repo's `scripts/Inspect-OneMcpStartupReadOnly.ps1` was expanded
after this observation to output a bounded ancestry of executable
**basenames only** plus Startup candidate presence booleans, while
retaining `automaticStartupMechanismIdentified:false` and
`productionCutoverAuthorized:false`. The script and synthetic CI
may not claim specific owner startup identity based on a matching file
name. A current-user Startup entry cannot be safely deleted, modified
or disabled without separately approved live cutover.

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
