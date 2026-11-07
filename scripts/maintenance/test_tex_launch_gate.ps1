# Windows PS5.1 current-user policy tests; no TeX executed by this test.
$ErrorActionPreference='Stop'
. (Join-Path $PSScriptRoot 'tex_launch_gate.ps1')
function Assert-TexGate($facts,[string]$expected){
  $actual=(Test-TikzariumMaintenanceTexTokenFacts -Facts $facts).status
  if($actual -cne $expected){throw "Expected $expected, got $actual"}
}
Assert-TexGate ([pscustomobject]@{token_is_elevated=$false;token_integrity_rid=8192;session_id=2;token_elevation_type='LIMITED';administrator_sid_in_token=$true}) 'ELIGIBLE_CURRENT_USER_TOKEN'
Assert-TexGate ([pscustomobject]@{token_is_elevated=$false;token_integrity_rid=8192;session_id=2;token_elevation_type='DEFAULT'}) 'ELIGIBLE_CURRENT_USER_TOKEN'
Assert-TexGate ([pscustomobject]@{token_is_elevated=$true;token_integrity_rid=12288;session_id=2;token_elevation_type='DEFAULT'}) 'ELIGIBLE_CURRENT_USER_TOKEN'
Assert-TexGate ([pscustomobject]@{token_is_elevated=$false;token_integrity_rid=12288;session_id=2;token_elevation_type='LIMITED'}) 'ELIGIBLE_CURRENT_USER_TOKEN'
Assert-TexGate ([pscustomobject]@{token_is_elevated=$false;token_integrity_rid=8192;session_id=2;token_elevation_type='FULL'}) 'ELIGIBLE_CURRENT_USER_TOKEN'
Assert-TexGate ([pscustomobject]@{token_is_elevated=$false;token_integrity_rid=8192;session_id=0;token_elevation_type='LIMITED'}) 'BLOCKED_SESSION0'
Assert-TexGate ([pscustomobject]@{token_is_elevated=$false;token_integrity_rid=4096;session_id=2;token_elevation_type='LIMITED'}) 'BLOCKED_INTEGRITY'
Assert-TexGate ([pscustomobject]@{token_is_elevated=$true;token_integrity_rid=16384;session_id=2;token_elevation_type='DEFAULT'}) 'BLOCKED_INTEGRITY'
Assert-TexGate ([pscustomobject]@{token_is_elevated='false';token_integrity_rid=8192;session_id=2;token_elevation_type='LIMITED'}) 'BLOCKED_TOKEN_UNKNOWN'
Assert-TexGate ([pscustomobject]@{token_is_elevated=$false;token_integrity_rid=8192;session_id=2}) 'BLOCKED_TOKEN_UNKNOWN'
Assert-TexGate $null 'BLOCKED_TOKEN_UNKNOWN'
$high=Test-TikzariumMaintenanceTexTokenFacts -Facts ([pscustomobject]@{token_is_elevated=$true;token_integrity_rid=12288;session_id=2;token_elevation_type='FULL'})
if(-not $high.warning_required){throw 'Elevated Administrator warning must remain explicit'}
$repair=Get-Content -LiteralPath (Join-Path $PSScriptRoot 'repair_toolchain.ps1') -Raw
$prove=Get-Content -LiteralPath (Join-Path $PSScriptRoot 'prove_miktex_fixture.ps1') -Raw
$workflow=Get-Content -LiteralPath (Join-Path $PSScriptRoot '..\..\.github\workflows\maintenance-win-toolchain.yml') -Raw
foreach($source in @($repair,$prove)){
 if($source -notmatch 'Get-TikzariumMaintenanceTexGate' -or $source -notmatch 'ELIGIBLE_CURRENT_USER_TOKEN'){throw 'Both maintenance entrypoints must use current-user token facts'}
}
if($workflow -match '(?m)^\s*run:.*-Provision(Rust|Msvc)\b'){throw 'Automatic installer switch detected'}
$live=Get-TikzariumMaintenanceTexGate
$observed=& (Join-Path $PSScriptRoot '..\tools\qa_windows_token.ps1')
if($live.status -notin @('BLOCKED_SESSION0','BLOCKED_INTEGRITY','ELIGIBLE_CURRENT_USER_TOKEN')){throw 'Read-only live Windows token gate failed'}
$expected=Test-TikzariumMaintenanceTexTokenFacts -Facts $observed
if($expected.status -cne $live.status){throw 'Live token facts and policy disagree'}
if($observed.session_id -eq 0 -and $live.status -cne 'BLOCKED_SESSION0'){throw 'Live Session0 would not block maintenance'}
Write-Host ('HOSTED_WINDOWS_REAL_TOKEN_PREFLIGHT={0}; no TeX invoked' -f $live.status)
Write-Host 'MAINTENANCE_CURRENT_USER_CONTRACT_PASS; no actual XeLaTeX executed by this test'
