# Offline, non-executing preparation of a verified GitHub CI source bundle.
# This script never runs npm, reads OAuth credentials, starts a service,
# changes the original connector, or broadens an HTTP endpoint.
[CmdletBinding()]
param(
  [Parameter(Mandatory = $true)][string]$BundleRoot,
  [Parameter(Mandatory = $true)][string]$DestinationRoot
)
Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

function Assert-Disjoint([string]$Destination, [string]$Protected, [string]$Code) {
  $a = [IO.Path]::GetFullPath($Destination).TrimEnd([IO.Path]::DirectorySeparatorChar)
  $b = [IO.Path]::GetFullPath($Protected).TrimEnd([IO.Path]::DirectorySeparatorChar)
  if ($a.Equals($b, [StringComparison]::OrdinalIgnoreCase) -or
      $a.StartsWith($b + [IO.Path]::DirectorySeparatorChar, [StringComparison]::OrdinalIgnoreCase) -or
      $b.StartsWith($a + [IO.Path]::DirectorySeparatorChar, [StringComparison]::OrdinalIgnoreCase)) {
    throw $Code
  }
}
function Verify-Bundle([string]$Root) {
  $absolute = [IO.Path]::GetFullPath($Root).TrimEnd([IO.Path]::DirectorySeparatorChar)
  $manifest = Join-Path $absolute 'SHA256SUMS.txt'
  if (!(Test-Path -LiteralPath $manifest -PathType Leaf)) { throw 'STAGE_MANIFEST_MISSING' }
  $lines = @(Get-Content -LiteralPath $manifest)
  if ($lines.Count -lt 4) { throw 'STAGE_MANIFEST_TOO_SHORT' }
  $seen = [Collections.Generic.HashSet[string]]::new([StringComparer]::OrdinalIgnoreCase)
  foreach ($line in $lines) {
    if ($line -cnotmatch '^([a-f0-9]{64})  (.+)$') { throw 'STAGE_MANIFEST_INVALID' }
    $expected = $Matches[1]
    $rel = $Matches[2]
    $candidate = [IO.Path]::GetFullPath((Join-Path $absolute ($rel.Replace('/', '\'))))
    if (-not $candidate.StartsWith($absolute + [IO.Path]::DirectorySeparatorChar, [StringComparison]::OrdinalIgnoreCase)) {
      throw 'STAGE_MANIFEST_PATH_ESCAPE'
    }
    if (-not $seen.Add($candidate)) { throw 'STAGE_MANIFEST_DUPLICATE' }
    if (!(Test-Path -LiteralPath $candidate -PathType Leaf)) { throw 'STAGE_BUNDLE_FILE_MISSING' }
    if ((Get-Item -LiteralPath $candidate).Attributes -band [IO.FileAttributes]::ReparsePoint) {
      throw 'STAGE_BUNDLE_SYMLINK_FORBIDDEN'
    }
    $actual = (Get-FileHash -Algorithm SHA256 -LiteralPath $candidate).Hash.ToLowerInvariant()
    if ($actual -cne $expected) { throw 'STAGE_SHA256_MISMATCH' }
  }
  $actualEntries = @(Get-ChildItem -LiteralPath $absolute -Recurse -File |
    Where-Object { $_.FullName -ne $manifest })
  if ($seen.Count -ne $actualEntries.Count) { throw 'STAGE_UNLISTED_FILE' }
  foreach ($entry in $actualEntries) {
    if (-not $seen.Contains($entry.FullName)) { throw 'STAGE_UNLISTED_FILE' }
  }
  if (!(Test-Path -LiteralPath (Join-Path $absolute 'dist\cli.js') -PathType Leaf)) {
    throw 'STAGE_CLI_MISSING'
  }
}

if (!(Test-Path -LiteralPath $BundleRoot -PathType Container)) { throw 'STAGE_SOURCE_MISSING' }
$bundle = (Resolve-Path -LiteralPath $BundleRoot).ProviderPath
$destination = [IO.Path]::GetFullPath($DestinationRoot)
if (Test-Path -LiteralPath $destination) { throw 'STAGE_DEST_ALREADY_EXISTS' }
Assert-Disjoint $destination $bundle 'STAGE_SOURCE_DEST_OVERLAP'
$defaultConnector = Join-Path $HOME '.local\share\chatgpt2codex'
Assert-Disjoint $destination $defaultConnector 'STAGE_PRODUCTION_STATE_OVERLAP'
if ($env:LOCALAPPDATA) {
  $installedApp = Join-Path $env:LOCALAPPDATA 'Programs\ChatGPT To Codex'
  Assert-Disjoint $destination $installedApp 'STAGE_PRODUCTION_INSTALL_OVERLAP'
}
Verify-Bundle $bundle
# The destination must be a new, separate directory. No overwrite, no
# restart, no owner-token access, no network and no browser interaction.
New-Item -ItemType Directory -Path $destination -ErrorAction Stop | Out-Null
Get-ChildItem -LiteralPath $bundle -Force | ForEach-Object {
  Copy-Item -LiteralPath $_.FullName -Destination $destination -Recurse -Force
}
Verify-Bundle $destination
@{
  code = 'STAGE_OFFLINE_PREPARED_ONLY'
  path = $destination
  checksumVerified = $true
  serviceStarted = $false
  existingConnectorChanged = $false
  userOAuthConsentCompleted = $false
  researchExecutionAuthorized = $false
} | ConvertTo-Json -Compress
