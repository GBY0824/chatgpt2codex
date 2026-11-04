# Read-only classification of the process currently listening on a local MCP port.
# This tool does NOT touch services or fetch/print command lines or credentials.
[CmdletBinding()]
param(
  [ValidateRange(1,65535)][int]$Port = 7979,
  [switch]$ValidateWscriptClassifierOnly
)
Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

function Test-IsWscriptExecutable([string]$Executable) {
  # Never throw on malformed Task Scheduler Action.Execute.
  # Only examine basename text; no command-line arguments or private paths.
  $value = ([string]$Executable).Trim().Trim([char]34)
  return $value -match '(?i)(?:^|[\\/])wscript\.exe$'
}

if ($ValidateWscriptClassifierOnly) {
  # Pure CI-only fixtures: no real task, socket or private file inspection.
  $fixtures = @(
    @{ value='wscript.exe'; expected=$true },
    @{ value='C:\Windows\System32\wscript.exe'; expected=$true },
    @{ value='"C:\Program Files\Test\wscript.exe"'; expected=$true },
    @{ value='C:/Windows/System32/wscript.exe'; expected=$true },
    @{ value=''; expected=$false },
    @{ value='::invalid|path'; expected=$false },
    @{ value='C:\Windows\System32\cscript.exe'; expected=$false },
    @{ value='wscript.exe -arg'; expected=$false },
    @{ value='notwscript.exe'; expected=$false }
  )
  foreach ($fixture in $fixtures) {
    if ((Test-IsWscriptExecutable ([string]$fixture.value)) -ne [bool]$fixture.expected) {
      throw 'SYNTHETIC_WSCRIPT_EXECUTABLE_CLASSIFIER_FAILED'
    }
  }
  [pscustomobject]@{
    code='SYNTHETIC_WSCRIPT_EXECUTABLE_CLASSIFIER_PASS'
    cases=$fixtures.Count
    ownerHostInspected=$false
    productionCutoverAuthorized=$false
  } | ConvertTo-Json -Compress
  return
}


$base = [ordered]@{
  code = "SINGLE_MCP_STARTUP_OWNERSHIP_UNVERIFIED"
  port = $Port
  listenLoopbackOnly = $false
  listenerObserved = $false
  uniqueListeningPid = $false
  processObserved = $false
  windowsServiceDirectlyOwnsPid = $false
  launchingParentObserved = $false
  processExecutableBasename = $null
  parentExecutableBasename = $null
  processAncestryBasenames = @()
  currentUserStartupCandidatePresent = $false
  allUsersStartupCandidatePresent = $false
  startupFoldersInspected = $false
  startupCandidateProvenLauncher = $false
  taskNameMetadataInspected = $false
  matchingScheduledTaskCount = 0
  readyWscriptTaskCandidateCount = 0
  recentlySuccessfulWscriptTaskCandidateCount = 0
  multipleRecentWscriptCandidatesObserved = $false
  taskHistoryMetadataInspected = $false
  taskEventLogCorrelationEstablished = $false
  # Read-only COM engine identity is narrower than restart/supervisor proof.
  taskEngineInstanceScanCompleted = $false
  liveWscriptTaskEngineMatchCount = 0
  liveWscriptTailscaleInstanceMatch = $false
  legacyAutoRelaunchSafetyVerified = $false
  identifiedOwnerScheduledTask = $false
  taskActionArgumentsRead = $false
  automaticStartupMechanismIdentified = $false
  ownerApprovalRequired = $true
  fullProcessCommandLineRead = $false
  credentialsRead = $false
  registryEdited = $false
  serviceOrProcessChanged = $false
  productionCutoverAuthorized = $false
}
$all = @(Get-NetTCPConnection -State Listen -LocalPort $Port -ErrorAction SilentlyContinue)
if ($all.Count -eq 0) {
  $base.code = "SINGLE_MCP_LISTENER_NOT_OBSERVED"
  [pscustomobject]$base | ConvertTo-Json -Compress
  return
}
$base.listenerObserved = $true
if (@($all | Where-Object { $_.LocalAddress -notin @("127.0.0.1","::1") }).Count -gt 0) {
  $base.code = "SINGLE_MCP_NON_LOOPBACK_LISTENER_PRESENT"
  [pscustomobject]$base | ConvertTo-Json -Compress
  return
}
$base.listenLoopbackOnly = $true
$owners = @($all | Select-Object -ExpandProperty OwningProcess -Unique)
if ($owners.Count -ne 1 -or [int]$owners[0] -le 0) {
  $base.code = "SINGLE_MCP_AMBIGUOUS_LISTENER_OWNER"
  [pscustomobject]$base | ConvertTo-Json -Compress
  return
}
$base.uniqueListeningPid = $true
$pidValue = [int]$owners[0]
try {
  $proc = Get-CimInstance -ClassName Win32_Process -Filter ("ProcessId = " + $pidValue) -ErrorAction Stop
} catch {
  $base.code = "SINGLE_MCP_PROCESS_METADATA_UNAVAILABLE"
  [pscustomobject]$base | ConvertTo-Json -Compress
  return
}
if ($null -eq $proc) {
  $base.code = "SINGLE_MCP_PROCESS_DISAPPEARED"
  [pscustomobject]$base | ConvertTo-Json -Compress
  return
}
$base.processObserved = $true
$base.processExecutableBasename = if ($proc.ExecutablePath) {
  [IO.Path]::GetFileName([string]$proc.ExecutablePath)
} else { $null }
$parentPid = [int]$proc.ParentProcessId
if ($parentPid -gt 0) {
  try {
    $parent = Get-CimInstance -ClassName Win32_Process -Filter ("ProcessId = " + $parentPid) -ErrorAction Stop
    if ($null -ne $parent) {
      $base.launchingParentObserved = $true
      $base.parentExecutableBasename = if ($parent.ExecutablePath) {
        [IO.Path]::GetFileName([string]$parent.ExecutablePath)
      } else { $null }
    }
  } catch {
    # Unknown parent isn't evidence of startup ownership.
  }
}
try {
  $services = @(Get-CimInstance -ClassName Win32_Service -Filter ("ProcessId = " + $pidValue) -ErrorAction Stop)
  if ($services.Count -eq 1) { $base.windowsServiceDirectlyOwnsPid = $true }
} catch {
  # Access errors are not permission to infer any service ownership.
}
# Inspect at most six direct ancestor names, never any process command
# line, environment variable, arguments, full paths, user identities or tokens.
# Reject a younger "parent" after PID reuse as unproven ancestry.
$chain = @()
$wscriptAncestor = $null
$cursor = $proc
for ($depth = 0; $depth -lt 6 -and $null -ne $cursor; $depth++) {
  $name = if ($cursor.ExecutablePath) { [IO.Path]::GetFileName([string]$cursor.ExecutablePath) } else { "unknown" }
  $chain += $name
  if ($null -eq $wscriptAncestor -and $name -ieq 'wscript.exe') { $wscriptAncestor = $cursor }
  $nextPid = [int]$cursor.ParentProcessId
  if ($nextPid -le 0 -or $nextPid -eq [int]$cursor.ProcessId) { break }
  try {
    $ancestor = Get-CimInstance -ClassName Win32_Process -Filter ("ProcessId = " + $nextPid) -ErrorAction Stop
    if ($null -eq $ancestor) { break }
    if ($ancestor.CreationDate -and $cursor.CreationDate -and
        [datetime]$ancestor.CreationDate -gt [datetime]$cursor.CreationDate) { break }
    $cursor = $ancestor
  } catch {
    break
  }
}
$base.processAncestryBasenames = @($chain)

# Task Scheduler IRunningTask.EnginePID associates a CURRENT running
# scheduler instance with the CURRENT WScript ancestor. This does not
# identify all other scripts that could relaunch the process later.
# No command lines, action arguments, environment, task principal or
# credential values are accessed, executed or emitted.
if ($null -ne $wscriptAncestor) {
  try {
    $scheduler = New-Object -ComObject Schedule.Service
    $scheduler.Connect()
    $runningTasks = @(Get-ScheduledTask -ErrorAction Stop | Where-Object { $_.State -eq 'Running' })
    $engineMatches = @()
    $complete = $true
    foreach ($task in $runningTasks) {
      try {
        $registered = $scheduler.GetFolder([string]$task.TaskPath).GetTask([string]$task.TaskName)
        foreach ($instance in @($registered.GetInstances(0))) {
          if ([int]$instance.EnginePID -eq [int]$wscriptAncestor.ProcessId) {
            $engineMatches += [string]$task.TaskName
          }
        }
      } catch {
        # A partially unreadable scheduler cannot establish a UNIQUE owner.
        $complete = $false
      }
    }
    # Avoid reporting a coincidental match after the original PID exits.
    $again = Get-CimInstance -ClassName Win32_Process -Filter (
      'ProcessId = ' + [int]$wscriptAncestor.ProcessId) -ErrorAction Stop
    $againListener = @(Get-NetTCPConnection -State Listen -LocalPort $Port -ErrorAction Stop |
      Select-Object -ExpandProperty OwningProcess -Unique)
    if ($null -eq $again -or
        [datetime]$again.CreationDate -ne [datetime]$wscriptAncestor.CreationDate -or
        $againListener.Count -ne 1 -or [int]$againListener[0] -ne $pidValue) {
      $complete = $false
    }
    if ($complete) {
      $base.taskEngineInstanceScanCompleted = $true
      $base.liveWscriptTaskEngineMatchCount = @($engineMatches).Count
      $base.liveWscriptTailscaleInstanceMatch = @($engineMatches).Count -eq 1 -and
        $engineMatches[0] -ceq 'ChatGPT To Codex MCP - Tailscale'
    }
  } catch {
    # Unavailable COM/task metadata is UNKNOWN, never a false proof of no task.
  }
}

# Startup folder inspection is filename metadata ONLY. No shortcuts or
# scripts are opened, expanded or executed. Presence is supporting evidence,
# never proof the observed PID was actually launched by that entry.
try {
  $userStartup = [Environment]::GetFolderPath('Startup')
  $commonStartup = [Environment]::GetFolderPath('CommonStartup')
  if ($userStartup -and $commonStartup) {
    $startupEntries = @()
    foreach ($folder in @($userStartup, $commonStartup)) {
      if (!(Test-Path -LiteralPath $folder -PathType Container)) { throw "FOLDER_UNAVAILABLE" }
      $startupEntries += ,@(Get-ChildItem -LiteralPath $folder -File -ErrorAction Stop |
        Where-Object { $_.Name -match '(?i)chatgpt|codex|mcp' })
    }
    $base.startupFoldersInspected = $true
    $base.currentUserStartupCandidatePresent = @($startupEntries[0]).Count -gt 0
    $base.allUsersStartupCandidatePresent = @($startupEntries[1]).Count -gt 0
  }
} catch {
  # No conclusion if either scope is inaccessible.
}

# Task names and executable BASENAMES only. We never inspect/print a
# scheduled task's arguments, working folder, owner, credential or script.
# Multiple plausible WScript tasks cannot identify which owns this PID.
try {
  $relatedTasks = @(Get-ScheduledTask -ErrorAction Stop |
    Where-Object { $_.TaskName -match '(?i)chatgpt|codex|mcp' })
  $base.taskNameMetadataInspected = $true
  $base.matchingScheduledTaskCount = $relatedTasks.Count
  $readyWscript = 0
  $recentSuccess = 0
  $nowLocal = Get-Date
  foreach ($task in $relatedTasks) {
    if ([string]$task.State -notin @("Ready", "Running")) { continue }
    $isWscript = $false
    foreach ($action in @($task.Actions)) {
      if (Test-IsWscriptExecutable ([string]$action.Execute)) {
        $isWscript = $true
        break
      }
    }
    if (!$isWscript) { continue }
    $readyWscript++
    # Get-ScheduledTaskInfo reads metadata only, not action arguments.
    # A successful recent task does not prove it owns the observed PID,
    # and absent/disabled event history does not prove absence of a watcher.
    try {
      $info = Get-ScheduledTaskInfo -InputObject $task -ErrorAction Stop
      $base.taskHistoryMetadataInspected = $true
      if ($info -and [int64]$info.LastTaskResult -eq 0 -and
          $info.LastRunTime -and [datetime]$info.LastRunTime -le $nowLocal -and
          [datetime]$info.LastRunTime -ge $nowLocal.AddMinutes(-15)) {
        $recentSuccess++
      }
    } catch {
      # TaskInfo is not readable for some user or Windows configurations.
    }
  }
  $base.readyWscriptTaskCandidateCount = $readyWscript
  $base.recentlySuccessfulWscriptTaskCandidateCount = $recentSuccess
  $base.multipleRecentWscriptCandidatesObserved = ($recentSuccess -ge 2)
} catch {
  # Some Windows editions or restricted accounts hide scheduled task data.
  # Unknown is never a claim that the service has no scheduler/watchdog.
}
$base.code = "SINGLE_MCP_LISTENER_PROCESS_OBSERVED_STARTUP_STILL_UNVERIFIED"
# A process-parent observation and service PID are insufficient evidence of
# Task Scheduler, Run-key, Start Menu, tunnel or authenticated plugin owners.
# Keep automaticStartupMechanismIdentified=false under all outcomes.
[pscustomobject]$base | ConvertTo-Json -Compress
