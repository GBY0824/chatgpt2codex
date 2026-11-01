[CmdletBinding()]
param(
  [Parameter(Mandatory)][string]$ExistingProgramDir,
  [Parameter(Mandatory)][string]$CandidateStageDir
)
# Never installs, stops/starts services, copies, deletes or changes permissions.
# A report cannot authorize a real cutover, and no credentials are examined.
Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

function Canonical-ExistingDir([string]$value) {
  if (-not [System.IO.Path]::IsPathRooted($value)) { throw "READONLY_PREFLIGHT_ABSOLUTE_PATH_REQUIRED" }
  $full = [System.IO.Path]::GetFullPath($value)
  if (!(Test-Path -LiteralPath $full -PathType Container)) { throw "READONLY_PREFLIGHT_DIRECTORY_MISSING" }
  return (Get-Item -LiteralPath $full -ErrorAction Stop).FullName.TrimEnd('\','/')
}
function Sha256([string]$file) {
  if (!(Test-Path -LiteralPath $file -PathType Leaf)) { return $null }
  return (Get-FileHash -LiteralPath $file -Algorithm SHA256).Hash.ToLowerInvariant()
}
function Version([string]$dir) {
  $pkg = Join-Path $dir "package.json"
  if (!(Test-Path -LiteralPath $pkg -PathType Leaf)) { return $null }
  return (Get-Content -LiteralPath $pkg -Raw -Encoding UTF8 | ConvertFrom-Json).version
}
function ManifestDigest([string]$dir,[string]$filename) {
  $manifest = Join-Path $dir "SHA256SUMS.txt"
  if (!(Test-Path -LiteralPath $manifest -PathType Leaf)) { return $null }
  $matching = @(
    Get-Content -LiteralPath $manifest -Encoding UTF8 |
      Where-Object { $_ -match '^([0-9a-fA-F]{64})  (.+)$' -and $Matches[2] -eq $filename }
  )
  if ($matching.Count -ne 1) { return $null }
  $actual = [regex]::Match($matching[0],'^([0-9a-fA-F]{64})  (.+)$')
  return $actual.Groups[1].Value.ToLowerInvariant()
}
function Provenance([string]$dir) {
  $file = Join-Path $dir "STAGING_PROVENANCE.txt"
  if (!(Test-Path -LiteralPath $file -PathType Leaf)) { return $null }
  $keys = @{}
  foreach($line in Get-Content -LiteralPath $file -Encoding ASCII) {
    if ($line -notmatch '^([A-Za-z][A-Za-z0-9]*)=([^\r\n]*)$') { return $null }
    if ($keys.ContainsKey($Matches[1])) { return $null }
    $keys[$Matches[1]] = $Matches[2]
  }
  if ($keys.Count -ne 6 -or $keys['reviewOnly'] -ne 'true' -or
      $keys['productionDeploymentApproved'] -ne 'false' -or
      $keys['sourcePrHeadSha'] -notmatch '^[a-f0-9]{40}$' -or
      $keys['ciCheckoutSha'] -notmatch '^[a-f0-9]{40}$') { return $null }
  return $keys
}

$existing = Canonical-ExistingDir $ExistingProgramDir
$candidate = Canonical-ExistingDir $CandidateStageDir
$cmp = [StringComparison]::OrdinalIgnoreCase
if ($existing.Equals($candidate,$cmp) -or
    $existing.StartsWith($candidate + [IO.Path]::DirectorySeparatorChar,$cmp) -or
    $candidate.StartsWith($existing + [IO.Path]::DirectorySeparatorChar,$cmp)) {
  throw "READONLY_PREFLIGHT_PATH_OVERLAP"
}
$installedHash = Sha256 (Join-Path $existing "dist\cli.js")
$candidateHash = Sha256 (Join-Path $candidate "dist\cli.js")
$pkgHash = Sha256 (Join-Path $candidate "package.json")
$provenanceHash = Sha256 (Join-Path $candidate "STAGING_PROVENANCE.txt")
$provenance = Provenance $candidate
$manifest = Test-Path -LiteralPath (Join-Path $candidate "SHA256SUMS.txt") -PathType Leaf
$three = $manifest -and $null -ne $candidateHash -and $null -ne $pkgHash -and $null -ne $provenanceHash -and
  $candidateHash -eq (ManifestDigest $candidate "dist/cli.js") -and
  $pkgHash -eq (ManifestDigest $candidate "package.json") -and
  $provenanceHash -eq (ManifestDigest $candidate "STAGING_PROVENANCE.txt")
$reasons = @()
if ($null -eq $installedHash) { $reasons += "EXISTING_CLI_MISSING" }
if ($null -eq $candidateHash) { $reasons += "CANDIDATE_CLI_MISSING" }
if ($null -eq $provenance) { $reasons += "CANDIDATE_PROVENANCE_MISSING_OR_INVALID" }
if (-not $three) { $reasons += "CANDIDATE_CRITICAL_MANIFEST_MISMATCH" }
if ($installedHash -and $candidateHash -and $installedHash -eq $candidateHash) { $reasons += "NO_BINARY_DIFFERENCE" }
$originalVersion = Version $existing
$stageVersion = Version $candidate
if ($originalVersion -eq $stageVersion) { $reasons += "VERSION_STRING_NOT_BUILD_ID" }

[pscustomobject]@{
  code = "READONLY_SINGLE_MCP_CUTOVER_PREFLIGHT"
  existingCliPresent = [bool]($null -ne $installedHash)
  candidateCliPresent = [bool]($null -ne $candidateHash)
  existingAndCandidateDiffer = [bool]($installedHash -ne $candidateHash)
  originalPackageVersion = $originalVersion
  candidatePackageVersion = $stageVersion
  candidateHasSelfConsistentCriticalManifest = [bool]$three
  candidateHasReviewProvenance = [bool]($null -ne $provenance)
  candidateSourceSha = $(if($null -ne $provenance){$provenance['sourcePrHeadSha']}else{$null})
  serviceAndProcessOwnershipChecked = $false
  fullBundleManifestVerified = $false
  installedUserStateInspected = $false
  credentialsRead = $false
  productionCutoverAuthorized = $false
  productionChanged = $false
  reasons = @($reasons)
} | ConvertTo-Json -Compress -Depth 4
