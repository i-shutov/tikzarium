# Windows PS5.1 hosted-only synthetic current-token gate tests; no TeX executed.
$ErrorActionPreference='Stop'
. (Join-Path $PSScriptRoot 'tex_launch_gate.ps1')
function Assert-TexGate($facts,[string]$expected){
  $actual=(Test-TikzariumMaintenanceTexTokenFacts -Facts $facts).status
  if($actual -cne $expected){throw "Expected $expected, got $actual"}
}
Assert-TexGate ([pscustomobject]@{token_is_elevated=$false;token_integrity_rid=8192;session_id=2;token_elevation_type='LIMITED';administrator_sid_in_token=$true}) 'ELIGIBLE_NON_ELEVATED_TOKEN'
Assert-TexGate ([pscustomobject]@{token_is_elevated=$false;token_integrity_rid=8192;session_id=2;token_elevation_type='DEFAULT'}) 'ELIGIBLE_NON_ELEVATED_TOKEN'
Assert-TexGate ([pscustomobject]@{token_is_elevated=$true;token_integrity_rid=12288;session_id=2;token_elevation_type='DEFAULT'}) 'BLOCKED_ELEVATED'
Assert-TexGate ([pscustomobject]@{token_is_elevated=$false;token_integrity_rid=12288;session_id=2;token_elevation_type='LIMITED'}) 'BLOCKED_ELEVATED'
Assert-TexGate ([pscustomobject]@{token_is_elevated=$false;token_integrity_rid=8192;session_id=2;token_elevation_type='FULL'}) 'BLOCKED_ELEVATED'
Assert-TexGate ([pscustomobject]@{token_is_elevated=$false;token_integrity_rid=8192;session_id=0;token_elevation_type='LIMITED'}) 'BLOCKED_SESSION0'
Assert-TexGate ([pscustomobject]@{token_is_elevated=$false;token_integrity_rid=4096;session_id=2;token_elevation_type='LIMITED'}) 'BLOCKED_INTEGRITY'
Assert-TexGate ([pscustomobject]@{token_is_elevated='false';token_integrity_rid=8192;session_id=2;token_elevation_type='LIMITED'}) 'BLOCKED_TOKEN_UNKNOWN'
Assert-TexGate ([pscustomobject]@{token_is_elevated=$false;token_integrity_rid=8192;session_id=2}) 'BLOCKED_TOKEN_UNKNOWN'
Assert-TexGate $null 'BLOCKED_TOKEN_UNKNOWN'
$repair=Get-Content -LiteralPath (Join-Path $PSScriptRoot 'repair_toolchain.ps1') -Raw
$prove=Get-Content -LiteralPath (Join-Path $PSScriptRoot 'prove_miktex_fixture.ps1') -Raw
$workflow=Get-Content -LiteralPath (Join-Path $PSScriptRoot '..\..\.github\workflows\maintenance-win-toolchain.yml') -Raw
if($repair -notmatch 'Get-TikzariumMaintenanceTexGate' -or
   $prove -notmatch 'Get-TikzariumMaintenanceTexGate'){throw 'Both TeX entrypoints must preflight'}
if($workflow -match '(?m)^\s*run:.*-Provision(Rust|Msvc)\b'){throw 'Automatic installer switch detected'}
Write-Host 'MAINTENANCE_TEX_GATE_CONTRACT_PASS; no actual XeLaTeX executed'
