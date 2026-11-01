[CmdletBinding()]
param(
  [Parameter(Mandatory)][string]$ExistingProgramDir,
  [Parameter(Mandatory)][string]$CandidateStageDir,
  [string]$ExpectedSourceSha = ''
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
function Assert-NoReparsePath([string]$value) {
  $cursor = [IO.Path]::GetFullPath($value)
  while ($true) {
    $item = Get-Item -LiteralPath $cursor -Force -ErrorAction Stop
    if (($item.Attributes -band [IO.FileAttributes]::ReparsePoint) -ne 0) {
      throw "READONLY_PREFLIGHT_REPARSE_PATH_REFUSED"
    }
    $parent = [IO.Directory]::GetParent($cursor)
    if ($null -eq $parent) { break }
    $cursor = $parent.FullName
  }
}
function Read-FullBundleManifest([string]$dir) {
  $manifestPath = Join-Path $dir 'SHA256SUMS.txt'
  if (!(Test-Path -LiteralPath $manifestPath -PathType Leaf)) { return $false }
  $expected = [System.Collections.Generic.Dictionary[string,string]]::new(
    [StringComparer]::OrdinalIgnoreCase)
  foreach ($line in Get-Content -LiteralPath $manifestPath -Encoding ASCII) {
    if ($line -cnotmatch '^([0-9a-f]{64})  (.+)$') { return $false }
    $hash = $Matches[1]
    $rel = $Matches[2]
    if ($rel -match '[\x00-\x1f\\:]' -or
        $rel.StartsWith('/') -or
        $rel -eq 'SHA256SUMS.txt' -or
        $rel.Split('/') -contains '..' -or
        $rel.Split('/') -contains '.' -or
        [IO.Path]::IsPathRooted($rel) -or
        $expected.ContainsKey($rel)) { return $false }
    $expected.Add($rel,$hash)
  }
  if ($expected.Count -eq 0) { return $false }
  $found = [System.Collections.Generic.HashSet[string]]::new([StringComparer]::OrdinalIgnoreCase)
  foreach ($item in Get-ChildItem -LiteralPath $dir -Recurse -Force) {
    if (($item.Attributes -band [IO.FileAttributes]::ReparsePoint) -ne 0) { return $false }
    if ($item.PSIsContainer) { continue }
    $rel = $item.FullName.Substring($dir.Length + 1).Replace('\','/')
    if ($rel -eq 'SHA256SUMS.txt') { continue }
    if (!$expected.ContainsKey($rel)) { return $false }
    if (!$found.Add($rel)) { return $false }
    if ((Sha256 $item.FullName) -cne $expected[$rel]) { return $false }
  }
  return $found.Count -eq $expected.Count
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
Assert-NoReparsePath $existing
Assert-NoReparsePath $candidate
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
$expectedShaValid = $ExpectedSourceSha -cmatch '^[a-f0-9]{40}$'
$pinnedSourceMatch = $expectedShaValid -and $null -ne $provenance -and
  $provenance['sourcePrHeadSha'] -ceq $ExpectedSourceSha
$fullManifest = Read-FullBundleManifest $candidate
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
if (-not $fullManifest) { $reasons += "CANDIDATE_FULL_MANIFEST_INVALID" }
if (-not $expectedShaValid) { $reasons += "PINNED_SOURCE_SHA_REQUIRED" }
elseif (-not $pinnedSourceMatch) { $reasons += "CANDIDATE_SOURCE_SHA_MISMATCH" }
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
  candidatePinnedSourceMatches = [bool]$pinnedSourceMatch
  candidateFullManifestVerified = [bool]$fullManifest
  candidatePassesReadOnlyIntegrityGates = [bool]($fullManifest -and $three -and $pinnedSourceMatch -and $installedHash -and $candidateHash -and $installedHash -ne $candidateHash)
  candidateSourceSha = $(if($null -ne $provenance){$provenance['sourcePrHeadSha']}else{$null})
  serviceAndProcessOwnershipChecked = $false
  fullBundleManifestVerified = [bool]$fullManifest
  installedUserStateInspected = $false
  credentialsRead = $false
  productionCutoverAuthorized = $false
  productionChanged = $false
  reasons = @($reasons)
} | ConvertTo-Json -Compress -Depth 4
