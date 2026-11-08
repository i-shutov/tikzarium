# Exact trusted-main CI's QA-only original pal1000 archive transfer to personal W2.
# Never included in the product ZIP, installed in Windows or treated as GUI PASS.
[CmdletBinding()]
param([switch]$SelfTest,[string]$OutputDir,[string]$ExpectedSourceSha,[string]$SourceRunId)
$ErrorActionPreference='Stop'

function Assert-TikzariumMesaEscrow {
 [CmdletBinding()]
 param([Parameter(Mandatory)][string]$Archive,
       [Parameter(Mandatory)][string]$Manifest,
       [Parameter(Mandatory)][string]$ExpectedSourceSha,
       [Parameter(Mandatory)][string]$SourceRunId)
 if($ExpectedSourceSha -cnotmatch '^[0-9a-f]{40}$' -or
    $SourceRunId -cnotmatch '^[1-9][0-9]*$'){
   throw 'MESA_ESCROW_INVALID_EXACT_SOURCE_REFERENCE'
 }
 if(-not (Test-Path -LiteralPath $Manifest -PathType Leaf) -or
    -not (Test-Path -LiteralPath $Archive -PathType Leaf)){
   throw 'MESA_ESCROW_ARCHIVE_OR_MANIFEST_MISSING'
 }
 $m=Get-Content -LiteralPath $Manifest -Encoding UTF8 -Raw | ConvertFrom-Json
 if($m.schema_version -ne 1 -or
    $m.status -cne 'PASS_ORIGINAL_PINNED_MESA_QA_ARTIFACT_ONLY' -or
    $m.source_sha -cne $ExpectedSourceSha -or
    ([string]$m.source_ci_run_id) -cne $SourceRunId -or
    $m.archive_url -cne 'https://github.com/pal1000/mesa-dist-win/releases/download/26.2.6/mesa3d-26.2.6-release-mingw.7z' -or
    $m.archive_sha256 -cne 'da0f71d9181b672c1918f3c342f11118c687f6059a46b16502845160733cc388' -or
    $m.archive_file -cne 'mesa3d-26.2.6-release-mingw.7z' -or
    $m.no_system_install -ne $true -or $m.no_product_distribution -ne $true){
   throw 'MESA_ESCROW_MANIFEST_PROVENANCE_MISMATCH'
 }
 $actual=(Get-FileHash -LiteralPath $Archive -Algorithm SHA256).Hash.ToLowerInvariant()
 $size=(Get-Item -LiteralPath $Archive).Length
 if($actual -cne 'da0f71d9181b672c1918f3c342f11118c687f6059a46b16502845160733cc388' -or
    $size -ne 55815794 -or $size -ne [int64]$m.archive_size){
   throw 'MESA_ESCROW_ORIGINAL_ARCHIVE_SHA_OR_LENGTH_MISMATCH'
 }
 return [PSCustomObject]@{
   source='https://github.com/pal1000/mesa-dist-win/releases/download/26.2.6/mesa3d-26.2.6-release-mingw.7z'
   sha256=$actual
   transport='EXACT_MAIN_CI_QA_ESCROW'
   attempts=0
 }
}
function Save-TikzariumMesaEscrow {
 [CmdletBinding()]
 param([string]$Dir,[string]$Sha,[string]$Run)
 if($env:GITHUB_ACTIONS -cne 'true' -or
    $env:GITHUB_REPOSITORY -cne 'i-shutov/tikzarium' -or
    $env:RUNNER_ENVIRONMENT -cne 'github-hosted' -or
    $env:RUNNER_OS -cne 'Windows' -or
    $env:GITHUB_EVENT_NAME -cne 'push' -or
    $env:GITHUB_REF -cne 'refs/heads/main'){
   throw 'MESA_ESCROW_ONLY_FROM_HOSTED_EXACT_MAIN_PUSH'
 }
 if($Sha -cnotmatch '^[0-9a-f]{40}$' -or $Run -cnotmatch '^[1-9][0-9]*$' -or
    $Sha -cne $env:GITHUB_SHA -or $Run -cne $env:GITHUB_RUN_ID){
   throw 'MESA_ESCROW_WRONG_MAIN_SHA_OR_SOURCE_CI_RUN'
 }
 $checkout=(& git rev-parse HEAD | Out-String).Trim()
 if($LASTEXITCODE -ne 0 -or $checkout -cne $Sha){
   throw 'MESA_ESCROW_CHECKOUT_SHA_DRIFT'
 }
 New-Item -ItemType Directory -Force -Path $Dir | Out-Null
 $Dir=(Resolve-Path -LiteralPath $Dir).Path
 $archive=Join-Path $Dir 'mesa3d-26.2.6-release-mingw.7z'
 $manifest=Join-Path $Dir 'qa-escrow-provenance.json'
 . (Join-Path $PSScriptRoot 'qa_windows_mesa_transport.ps1')
 $pinned=Get-TikzariumPinnedMesaArchive -ArchivePath $archive
 if($pinned.source -cne 'https://github.com/pal1000/mesa-dist-win/releases/download/26.2.6/mesa3d-26.2.6-release-mingw.7z' -or
    $pinned.sha256 -cne 'da0f71d9181b672c1918f3c342f11118c687f6059a46b16502845160733cc388'){
   throw 'MESA_ESCROW_ORIGINAL_SOURCE_DRIFT'
 }
 $bytes=(Get-Item -LiteralPath $archive).Length
 if($bytes -ne 55815794){throw 'MESA_ESCROW_EXACT_ORIGINAL_ARCHIVE_LENGTH_WRONG'}
 $manifestData=[ordered]@{
   schema_version=1
   status='PASS_ORIGINAL_PINNED_MESA_QA_ARTIFACT_ONLY'
   source_sha=$Sha
   source_ci_run_id=$Run
   archive_file='mesa3d-26.2.6-release-mingw.7z'
   archive_url='https://github.com/pal1000/mesa-dist-win/releases/download/26.2.6/mesa3d-26.2.6-release-mingw.7z'
   archive_sha256='da0f71d9181b672c1918f3c342f11118c687f6059a46b16502845160733cc388'
   archive_size=$bytes
   no_system_install=$true
   no_product_distribution=$true
   physical_windows10='NOT_RUN'
   w2b_full='NOT_RUN'
 }
 $manifestData | ConvertTo-Json -Depth 4 | Set-Content -Encoding UTF8 -LiteralPath $manifest
 [void](Assert-TikzariumMesaEscrow -Archive $archive -Manifest $manifest -ExpectedSourceSha $Sha -SourceRunId $Run)
 Write-Host 'MAIN_CI_PINNED_QA_MESA_ESCROW=PASS_ORIGINAL_BYTES_NOT_PHYSICAL_GUI'
}
if($SelfTest){
 $t=Join-Path ([IO.Path]::GetTempPath()) ('tikzarium-qa-escrow-selftest-'+[Guid]::NewGuid().ToString('N'))
 New-Item -ItemType Directory -Path $t -Force | Out-Null
 try {
   $ar=Join-Path $t 'mesa3d-26.2.6-release-mingw.7z'
   $proof=Join-Path $t 'qa-escrow-provenance.json'
   $sha='a'*40;$run='123'
   $bad=[ordered]@{
     schema_version=1;status='PASS_ORIGINAL_PINNED_MESA_QA_ARTIFACT_ONLY'
     source_sha=$sha;source_ci_run_id=$run
     archive_file='mesa3d-26.2.6-release-mingw.7z'
     archive_url='https://github.com/pal1000/mesa-dist-win/releases/download/26.2.6/mesa3d-26.2.6-release-mingw.7z'
     archive_sha256='da0f71d9181b672c1918f3c342f11118c687f6059a46b16502845160733cc388'
     archive_size=55815794
     no_system_install=$true;no_product_distribution=$true
   }
   $bad | ConvertTo-Json | Set-Content -LiteralPath $proof -Encoding UTF8
   $missing=$false
   try{[void](Assert-TikzariumMesaEscrow -Archive $ar -Manifest $proof -ExpectedSourceSha $sha -SourceRunId $run)}
   catch{$missing=($_.Exception.Message -like '*MESA_ESCROW_ARCHIVE_OR_MANIFEST_MISSING*')}
   if(-not $missing){throw 'MESA_ESCROW_SELFTEST_MISSING_ACCEPTED'}
   [IO.File]::WriteAllBytes($ar,[byte[]](1,2,3,4))
   $wrong=$false
   try{[void](Assert-TikzariumMesaEscrow -Archive $ar -Manifest $proof -ExpectedSourceSha $sha -SourceRunId $run)}
   catch{$wrong=($_.Exception.Message -like '*MESA_ESCROW_ORIGINAL_ARCHIVE_SHA_OR_LENGTH_MISMATCH*')}
   if(-not $wrong){throw 'MESA_ESCROW_SELFTEST_INVALID_ARCHIVE_ACCEPTED'}
   $bad.source_ci_run_id='999'
   $bad | ConvertTo-Json | Set-Content -LiteralPath $proof -Encoding UTF8
   $foreign=$false
   try{[void](Assert-TikzariumMesaEscrow -Archive $ar -Manifest $proof -ExpectedSourceSha $sha -SourceRunId $run)}
   catch{$foreign=($_.Exception.Message -like '*MESA_ESCROW_MANIFEST_PROVENANCE_MISMATCH*')}
   if(-not $foreign){throw 'MESA_ESCROW_SELFTEST_WRONG_RUN_ACCEPTED'}
   $bad.source_ci_run_id=$run
   $bad.archive_url='https://unapproved.example.invalid/mesa.7z'
   $bad | ConvertTo-Json | Set-Content -LiteralPath $proof -Encoding UTF8
   $redirect=$false
   try{[void](Assert-TikzariumMesaEscrow -Archive $ar -Manifest $proof -ExpectedSourceSha $sha -SourceRunId $run)}
   catch{$redirect=($_.Exception.Message -like '*MESA_ESCROW_MANIFEST_PROVENANCE_MISMATCH*')}
   if(-not $redirect){throw 'MESA_ESCROW_SELFTEST_UNPINNED_SOURCE_ACCEPTED'}
   Write-Host 'MESA_ESCROW_SELFTEST=PASS_4_NEGATIVES_NO_NETWORK_NO_OS_INPUT'
 } finally {
   Remove-Item -LiteralPath $t -Force -Recurse -ErrorAction SilentlyContinue
 }
 return
}
# Dot-source without arguments exposes only the typed, fail-closed validator.
if($PSBoundParameters.Count -eq 0){return}
if([string]::IsNullOrWhiteSpace($OutputDir) -or
   [string]::IsNullOrWhiteSpace($ExpectedSourceSha) -or
   [string]::IsNullOrWhiteSpace($SourceRunId)){
 throw 'MESA_ESCROW_PRODUCTION_REQUIRES_DIR_EXACT_SHA_CI_RUN'
}
Save-TikzariumMesaEscrow -Dir $OutputDir -Sha $ExpectedSourceSha -Run $SourceRunId
