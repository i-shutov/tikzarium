[CmdletBinding()]
param([Parameter(Mandatory)][string]$OutputDir)
$ErrorActionPreference='Stop'
$results=[ordered]@{schema_version=1;source_sha=$env:GITHUB_SHA;status='FAIL_REQUIRED_EVIDENCE';cargo='NOT_RUN';miktex='NOT_RUN';gui='NOT_RUN';arbitrary_admin_document_sandbox='NOT_RUN';physical_windows10='NOT_RUN'}
foreach($spec in @(@('cargo','cargo-final.json'),@('miktex','miktex-fixed-fixture.json'))) {
 $path=Join-Path $OutputDir $spec[1]
 if(Test-Path -LiteralPath $path -PathType Leaf){$results[$spec[0]]=(Get-Content -LiteralPath $path -Raw -Encoding UTF8 | ConvertFrom-Json).status}
}
if($results.cargo -eq 'PASS_PERSONAL_SERVER_NATIVE_CARGO_COMPILE_LINK_RUN' -and $results.miktex -eq 'PASS_FIXED_TRUSTED_MIKTEX_PDF_NOT_GENERAL_ADMIN_SANDBOX'){$results.status='PASS_PERSONAL_CARGO_AND_FIXED_MIKTEX_PDF'}
$results | ConvertTo-Json -Depth 5 | Set-Content (Join-Path $OutputDir 'toolchain-final.json') -Encoding UTF8
Write-Host ($results | ConvertTo-Json -Compress)
if($results.status -ne 'PASS_PERSONAL_CARGO_AND_FIXED_MIKTEX_PDF'){exit 2}
