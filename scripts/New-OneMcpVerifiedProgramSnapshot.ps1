# Creates a verified offline PROGRAM-FILES-ONLY snapshot or restores to a NEW directory.
# Deliberately never replaces an existing installed MCP, stops a process or reads
# the separate OAuth/user state. This is NOT a live cutover installer.
[CmdletBinding()]
param(
  [Parameter(Mandatory)][ValidateSet('Capture','Restore')][string]$Mode,
  [Parameter(Mandatory)][string]$ExistingProgramDir,
  [Parameter(Mandatory)][string]$SnapshotDir,
  [string]$RestoreDir = '',
  [string]$ExpectedCliSha = '',
  [string]$ExpectedReceiptSha = '',
  [switch]$ApproveBackupOnly
)
Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

function Assert-Absolute([string]$Value) {
  if (!$Value -or ![IO.Path]::IsPathRooted($Value) -or $Value.StartsWith('\\')) {
    throw 'SNAPSHOT_ABSOLUTE_LOCAL_PATH_REQUIRED'
  }
  return [IO.Path]::GetFullPath($Value).TrimEnd('\','/')
}
function Assert-NoReparseAncestors([string]$Path) {
  $cursor = [IO.Path]::GetFullPath($Path)
  while ($true) {
    if (Test-Path -LiteralPath $cursor) {
      $item = Get-Item -LiteralPath $cursor -Force -ErrorAction Stop
      if (($item.Attributes -band [IO.FileAttributes]::ReparsePoint) -ne 0) {
        throw 'SNAPSHOT_REPARSE_PATH_REFUSED'
      }
    }
    $parent = [IO.Directory]::GetParent($cursor)
    if ($null -eq $parent) { break }
    $cursor = $parent.FullName
  }
}
function Assert-Separate([string]$A,[string]$B) {
  $cmp = [StringComparison]::OrdinalIgnoreCase
  if ($A.Equals($B,$cmp) -or
      $A.StartsWith($B + [IO.Path]::DirectorySeparatorChar,$cmp) -or
      $B.StartsWith($A + [IO.Path]::DirectorySeparatorChar,$cmp)) {
    throw 'SNAPSHOT_PATH_OVERLAP_DENIED'
  }
}
function Assert-NewLocation([string]$Target,[string]$Existing) {
  if (Test-Path -LiteralPath $Target) { throw 'SNAPSHOT_DESTINATION_ALREADY_EXISTS' }
  $parent = [IO.Directory]::GetParent($Target)
  if ($null -eq $parent -or !(Test-Path -LiteralPath $parent.FullName -PathType Container)) {
    throw 'SNAPSHOT_PARENT_MUST_ALREADY_EXIST'
  }
  Assert-NoReparseAncestors $Target
  Assert-Separate $Target $Existing
  if ($env:LOCALAPPDATA) {
    Assert-Separate $Target (Assert-Absolute (Join-Path $env:LOCALAPPDATA 'Programs\ChatGPT To Codex'))
    Assert-Separate $Target (Assert-Absolute (Join-Path $env:LOCALAPPDATA 'ChatGPTToCodexGoalAppStaging'))
    Assert-Separate $Target (Assert-Absolute (Join-Path $env:LOCALAPPDATA 'ChatGPTToCodexGoalAppState'))
  }
  Assert-Separate $Target (Assert-Absolute (Join-Path $HOME '.local\share\chatgpt2codex'))
}
function Get-Tree([string]$Root) {
  Assert-NoReparseAncestors $Root
  $entries = [System.Collections.Generic.List[object]]::new()
  foreach ($item in Get-ChildItem -LiteralPath $Root -Recurse -Force) {
    if (($item.Attributes -band [IO.FileAttributes]::ReparsePoint) -ne 0) {
      throw 'SNAPSHOT_TREE_REPARSE_DENIED'
    }
    if ($item.PSIsContainer) { continue }
    $rel = $item.FullName.Substring($Root.Length+1).Replace('\','/')
    if (!$rel -or $rel -match '[\x00-\x1f:]' -or $rel -match '\\' -or
        $rel.Split('/') -contains '.' -or $rel.Split('/') -contains '..') {
      throw 'SNAPSHOT_UNSAFE_RELATIVE_PATH'
    }
    $entries.Add([pscustomobject]@{
      path = $rel
      sha256 = (Get-FileHash -LiteralPath $item.FullName -Algorithm SHA256).Hash.ToLowerInvariant()
      bytes = [int64]$item.Length
    })
  }
  return @($entries | Sort-Object -Property path)
}
function Compare-Tree([string]$Root,$Expected) {
  $actual = @(Get-Tree $Root)
  if ($actual.Count -ne $Expected.Count) { throw 'SNAPSHOT_FILE_SET_MISMATCH' }
  $observed = [System.Collections.Generic.HashSet[string]]::new([StringComparer]::OrdinalIgnoreCase)
  for ($i=0; $i -lt $Expected.Count; $i++) {
    $entry = $Expected[$i]
    $rel = [string]$entry.path
    if (!$rel -or $rel -match '[\x00-\x1f:\\]' -or $rel.StartsWith('/') -or
        [IO.Path]::IsPathRooted($rel) -or
        @($rel.Split('/') | Where-Object { $_ -in @('','..','.') }).Count -gt 0 -or
        !$observed.Add($rel) -or
        [string]$entry.sha256 -cnotmatch '^[a-f0-9]{64}$' -or
        [long]$entry.bytes -lt 0) {
      throw 'SNAPSHOT_INVALID_RECEIPT_ENTRY'
    }
    if ($actual[$i].path -cne $rel -or
        $actual[$i].sha256 -cne [string]$entry.sha256 -or
        $actual[$i].bytes -ne [long]$entry.bytes) {
      throw 'SNAPSHOT_FILE_HASH_MISMATCH'
    }
  }
}
function Get-Sha([string]$File) {
  if (!(Test-Path -LiteralPath $File -PathType Leaf)) { throw 'SNAPSHOT_CLI_OR_RECEIPT_MISSING' }
  return (Get-FileHash -LiteralPath $File -Algorithm SHA256).Hash.ToLowerInvariant()
}

if (!$ApproveBackupOnly) { throw 'SNAPSHOT_EXPLICIT_BACKUP_ONLY_APPROVAL_REQUIRED' }
$original = Assert-Absolute $ExistingProgramDir
$snapshot = Assert-Absolute $SnapshotDir
Assert-NoReparseAncestors $original
Assert-NoReparseAncestors $snapshot
if (!(Test-Path -LiteralPath $original -PathType Container)) {
  throw 'SNAPSHOT_ORIGINAL_PROGRAM_MISSING'
}
if ($ExpectedCliSha -cnotmatch '^[a-f0-9]{64}$') {
  throw 'SNAPSHOT_EXTERNALLY_PINNED_CLI_SHA_REQUIRED'
}
if ((Get-Sha (Join-Path $original 'dist\cli.js')) -cne $ExpectedCliSha) {
  throw 'SNAPSHOT_ORIGINAL_CLI_SHA_MISMATCH'
}
Assert-Separate $original $snapshot

if ($Mode -eq 'Capture') {
  if ($RestoreDir) { throw 'SNAPSHOT_RESTORE_PATH_NOT_ALLOWED_IN_CAPTURE' }
  Assert-NewLocation $snapshot $original
  $before = @(Get-Tree $original)
  if ($before.Count -eq 0) { throw 'SNAPSHOT_EMPTY_PROGRAM_DENIED' }
  # Backup snapshot receives a new directory; never writes into the installed tree.
  New-Item -ItemType Directory -Path $snapshot -ErrorAction Stop | Out-Null
  $copy = Join-Path $snapshot 'program'
  Copy-Item -LiteralPath $original -Destination $copy -Recurse -Force -ErrorAction Stop
  Compare-Tree $copy $before
  Compare-Tree $original $before
  $receipt = [pscustomobject]@{
    schemaVersion = 1
    expectedCliSha = $ExpectedCliSha
    files = @($before)
    containsOnlyProgramTree = $true
    productionCutoverAuthorized = $false
  }
  $tmp = Join-Path $snapshot 'RECEIPT-WRITING.tmp'
  $final = Join-Path $snapshot 'BACKUP_RECEIPT.json'
  [IO.File]::WriteAllText($tmp,($receipt | ConvertTo-Json -Depth 8 -Compress),[Text.UTF8Encoding]::new($false))
  Move-Item -LiteralPath $tmp -Destination $final -ErrorAction Stop
  [pscustomobject]@{
    code='ONE_MCP_PROGRAM_SNAPSHOT_VERIFIED'
    fileCount=$before.Count
    receiptSha256=(Get-Sha $final)
    installedFilesUnchanged=$true
    separateOAuthStateCopied=$false
    restoredOrInstalled=$false
    processOrServiceChanged=$false
    productionCutoverAuthorized=$false
  } | ConvertTo-Json -Compress
  return
}

if (!$RestoreDir) { throw 'SNAPSHOT_RESTORE_DESTINATION_REQUIRED' }
$target = Assert-Absolute $RestoreDir
Assert-Separate $snapshot $target
Assert-NewLocation $target $original
if (!(Test-Path -LiteralPath $snapshot -PathType Container)) { throw 'SNAPSHOT_DIRECTORY_NOT_FOUND' }
$receiptFile = Join-Path $snapshot 'BACKUP_RECEIPT.json'
if ($ExpectedReceiptSha -cnotmatch '^[a-f0-9]{64}$' -or
    (Get-Sha $receiptFile) -cne $ExpectedReceiptSha) {
  throw 'SNAPSHOT_EXTERNALLY_PINNED_RECEIPT_SHA_MISMATCH'
}
$receipt = Get-Content -LiteralPath $receiptFile -Encoding UTF8 -Raw | ConvertFrom-Json
if ($receipt.schemaVersion -ne 1 -or
    $receipt.containsOnlyProgramTree -ne $true -or
    $receipt.productionCutoverAuthorized -ne $false -or
    [string]$receipt.expectedCliSha -cne $ExpectedCliSha) {
  throw 'SNAPSHOT_RECEIPT_UNTRUSTED'
}
$source = Join-Path $snapshot 'program'
if (!(Test-Path -LiteralPath $source -PathType Container)) { throw 'SNAPSHOT_PROGRAM_MISSING' }
Compare-Tree $source @($receipt.files)
if ((Get-Sha (Join-Path $source 'dist\cli.js')) -cne $ExpectedCliSha) {
  throw 'SNAPSHOT_RECEIPT_CLI_SHA_MISMATCH'
}
Copy-Item -LiteralPath $source -Destination $target -Recurse -Force -ErrorAction Stop
Compare-Tree $target @($receipt.files)
[pscustomobject]@{
  code='ONE_MCP_PROGRAM_RESTORED_TO_NEW_FOLDER_ONLY'
  fileCount=@($receipt.files).Count
  originalInstallationUnchanged=$true
  separateOAuthStateCopied=$false
  processOrServiceChanged=$false
  productionCutoverAuthorized=$false
} | ConvertTo-Json -Compress
