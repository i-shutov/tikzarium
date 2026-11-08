# PRIVATE Windows Server W2 ONLY. No system installation or product packaging.
# Every DLL is staged next to a copy of the exact reviewed native app in RUNNER_TEMP.
[CmdletBinding()]
param(
 [Parameter(Mandatory)][string]$AppDirectory,
 [Parameter(Mandatory)][string]$EvidenceDirectory,
 [Parameter(Mandatory)][string]$ExpectedSha,
 [ValidateSet('server-native','verified-hosted-release')][string]$BinaryOrigin='server-native'
)
$ErrorActionPreference='Stop'
if($env:GITHUB_ACTIONS -cne 'true' -or $env:RUNNER_OS -cne 'Windows' -or
   $env:RUNNER_ENVIRONMENT -cne 'self-hosted' -or
   $env:GITHUB_REPOSITORY -cne 'i-shutov/tikzarium'){
 throw 'Only trusted-main TikZarium self-hosted Windows W2 may stage test Mesa'
}
if($ExpectedSha -cnotmatch '^[0-9a-f]{40}$' -or (git rev-parse HEAD).Trim() -cne $ExpectedSha){
 throw 'Exact reviewed main SHA required'
}
if(-not $env:RUNNER_TEMP -or -not $env:GITHUB_RUN_ID){throw 'Runner temp/run ID missing'}
$expectedRoot=Join-Path $env:RUNNER_TEMP ('tikzarium-w2-gl-' + $env:GITHUB_RUN_ID)
$expectedBin=Join-Path $expectedRoot 'bin'
if([IO.Path]::GetFullPath($AppDirectory) -cne [IO.Path]::GetFullPath($expectedBin)){
 throw 'Mesa overlay must be inside current-run private temp folder'
}
if(-not (Test-Path -LiteralPath $EvidenceDirectory -PathType Container)){throw 'Original W1 report directory missing'}
$EvidenceDirectory=(Resolve-Path -LiteralPath $EvidenceDirectory).Path
. (Join-Path $PSScriptRoot 'qa_windows_w2_binary.ps1')
$binary=Get-W2BinaryEvidence -EvidenceDirectory $EvidenceDirectory -ExpectedSha $ExpectedSha -BinaryOrigin $BinaryOrigin
$app=Join-Path $AppDirectory 'tikzarium-app.exe'
if(-not (Test-Path -LiteralPath $app -PathType Leaf)){throw 'Staged EXE copy missing'}
$appHash=(Get-FileHash -LiteralPath $app -Algorithm SHA256).Hash.ToLowerInvariant()
if($appHash -cne $binary.app_sha256){throw 'Staged EXE differs from original W1 native EXE'}
# Original pinned pal1000 bytes preferred; a transport-only failure may
# select the independently SHA-pinned official MSYS2 build. A checksum,
# provenance or extraction failure is terminal, never permission to downgrade.
$source='https://github.com/pal1000/mesa-dist-win/releases/download/26.2.6/mesa3d-26.2.6-release-mingw.7z'
$expected='da0f71d9181b672c1918f3c342f11118c687f6059a46b16502845160733cc388'
$archiveKind='PAL1000_MINGW_26_2_6'
$relativeX64='x64'
$work=Join-Path $expectedRoot 'payload'
$unpack=Join-Path $work 'unpack'
New-Item -ItemType Directory -Path $unpack -Force | Out-Null
$archive=Join-Path $work 'mesa3d-26.2.6-release-mingw.7z'
. (Join-Path $PSScriptRoot 'qa_windows_pinned_mesa_fetch.ps1')
. (Join-Path $PSScriptRoot 'qa_windows_mesa_transport.ps1')
$seven=(Get-Command 7z.exe -ErrorAction SilentlyContinue).Source
if(-not $seven -and (Test-Path 'C:\Program Files\7-Zip\7z.exe')){$seven='C:\Program Files\7-Zip\7z.exe'}
 # Prefer original pal1000 bytes delivered as a short-lived GitHub Actions
 # artifact from the same separately verified successful exact-main CI run.
 # A mismatch is fatal; do not fall back to public CDN after bad escrow.
 $escrowRoot=Join-Path $env:RUNNER_TEMP 'tikzarium-hosted\qa-mesa'
 $escrowArchive=Join-Path $escrowRoot 'mesa3d-26.2.6-release-mingw.7z'
 $escrowReport=Join-Path $escrowRoot 'qa-mesa-escrow.json'
 $hasEscrowArchive=Test-Path -LiteralPath $escrowArchive -PathType Leaf
 $hasEscrowReport=Test-Path -LiteralPath $escrowReport -PathType Leaf
 if($hasEscrowArchive -xor $hasEscrowReport){
   throw 'PINNED_MESA_CI_ESCROW_INCOMPLETE_REJECTED'
 }
 if($hasEscrowArchive -and $hasEscrowReport){
   $original=Get-Content -LiteralPath $escrowReport -Raw -Encoding UTF8 | ConvertFrom-Json
   if($original.schema_version -ne 1 -or
      $original.status -cne 'PASS_EXACT_MAIN_HOSTED_QA_MESA_BYTES_NOT_PRODUCT' -or
      $original.source_sha -cne $ExpectedSha -or
      [string]$original.source_ci_run_id -cne [string]$binary.source_ci_run_id -or
      $original.archive_source -cne $source -or
      $original.archive_sha256 -cne $expected -or
      -not $original.no_system_install -or -not $original.no_product_distribution){
     throw 'PINNED_MESA_CI_ESCROW_UNTRUSTED_PROVENANCE'
   }
   $escrowSha=(Get-FileHash -LiteralPath $escrowArchive -Algorithm SHA256).Hash.ToLowerInvariant()
   if($escrowSha -cne $expected){throw 'PINNED_MESA_CI_ESCROW_SHA_MISMATCH'}
   Copy-Item -LiteralPath $escrowArchive -Destination $archive -Force
   if((Get-FileHash -LiteralPath $archive -Algorithm SHA256).Hash.ToLowerInvariant() -cne $expected){
     throw 'PINNED_MESA_CI_ESCROW_COPY_SHA_CHANGED'
   }
   $pinned=[PSCustomObject]@{source=$source;sha256=$expected;transport='TRUSTED_MAIN_SOURCE_CI_QA_ESCROW'}
   Write-Host 'PERSONAL_W2_MESA_ESCROW=PASS_EXACT_MAIN_SHA_NO_PUBLIC_CDN'
 }else{
try {
 $pinned=Get-TikzariumPinnedArchive -SourceUrl $source -ArchivePath $archive -ExpectedSha256 $expected
} catch {
 $primaryReason=$_.Exception.Message
 if($primaryReason -notlike 'PINNED_MESA_TRANSPORT_EXHAUSTED_*'){
   throw  # wrong digest, origin, local path or provenance are never fallback reasons
 }
 Write-Warning ('Original pal1000 Mesa QA-only transport unavailable; using '+
                'separately fixed-sha256 official MSYS2 source: '+$primaryReason)
 $source='https://mirror.msys2.org/mingw/mingw64/mingw-w64-x86_64-mesa-26.2.6-1-any.pkg.tar.zst'
 $expected='7b14de4d3f234efd0022d14dd7fb313ed751c829bb1f46026e0b2dce2d2d05a4'
 $archiveKind='MSYS2_MINGW64_MESA_26_2_6_1'
 $relativeX64='mingw64\bin'
 $archive=Join-Path $work 'mingw-w64-x86_64-mesa-26.2.6-1-any.pkg.tar.zst'
 # The owner's standard Windows Server image has native tar.exe but not
 # necessarily optional 7-Zip. Never auto-install 7-Zip to run physical QA.
 if(-not $seven -and -not (Get-Command tar.exe -ErrorAction SilentlyContinue)){
  throw 'PINNED_MSYS2_NO_PREINSTALLED_ARCHIVER'
 }
 $pinned=Get-TikzariumPinnedMsys2Archive -ArchivePath $archive
}
 }
$sha=$pinned.sha256
if($pinned.source -cne $source -or $sha -cne $expected){
 throw 'PINNED_MESA_SOURCE_OR_SHA_DRIFT_ON_SERVER'
}
# Distinguish compressed MSYS2 .tar.zst (native tar can unpack directly)
# from pal1000 .7z and from 7-Zip's intermediate *.pkg.tar file.
$extractMethod='NOT_RUN'
if($archiveKind -ceq 'MSYS2_MINGW64_MESA_26_2_6_1'){
 if($seven){
  & $seven x $archive ("-o" + $unpack) -y | Out-Null
  if($LASTEXITCODE -ne 0){throw 'PINNED_MSYS2_7ZIP_ZST_EXTRACTION_FAILED'}
  $tars=@(Get-ChildItem -LiteralPath $unpack -File -Filter '*.pkg.tar')
  if($tars.Count -ne 1){throw 'PINNED_MSYS2_EXACT_ONE_NESTED_TAR_REQUIRED'}
  & $seven x $tars[0].FullName ("-o" + $unpack) -y | Out-Null
  if($LASTEXITCODE -ne 0){throw 'PINNED_MSYS2_TAR_EXTRACTION_FAILED'}
  $extractMethod='EXISTING_7ZIP_ZST_AND_TAR'
 }else{
  . (Join-Path $PSScriptRoot 'qa_windows_msys2_tar_stage.ps1')
  $native=Expand-TikzariumPinnedMsys2WithWindowsTar -Archive $archive -Destination $unpack
  $extractMethod=$native.method
 }
}else{
 if($seven){
  & $seven x $archive ("-o" + $unpack) -y | Out-Null
 }else{
  $tar=(Get-Command tar.exe -ErrorAction SilentlyContinue).Source
  if(-not $tar){throw 'PINNED_PAL1000_NO_EXISTING_ARCHIVER'}
  & $tar -xf $archive -C $unpack
 }
 if($LASTEXITCODE -ne 0){throw 'PINNED_PAL1000_ARCHIVE_EXTRACTION_FAILED'}
 $extractMethod='EXISTING_ARCHIVER_PAL1000_7Z'
}

$x64=Join-Path $unpack $relativeX64
if(-not (Test-Path -LiteralPath $x64 -PathType Container)){throw 'Mesa x64 payload absent'}
$dlls=@(Get-ChildItem -LiteralPath $x64 -File -Filter '*.dll')
if($dlls.Count -lt 2 -or @($dlls | Where-Object {$_.Name -ieq 'opengl32.dll'}).Count -ne 1 -or
   @($dlls | Where-Object {$_.Name -ieq 'libgallium_wgl.dll'}).Count -ne 1){
 throw 'Pinned Mesa x64 software OpenGL/Gallium DLLs absent'
}
$manifest=@()
foreach($dll in $dlls){
 $target=Join-Path $AppDirectory $dll.Name
 Copy-Item -LiteralPath $dll.FullName -Destination $target -Force
 $manifest+=([ordered]@{name=$dll.Name;sha256=(Get-FileHash -LiteralPath $target -Algorithm SHA256).Hash.ToLowerInvariant()})
}
if((Get-FileHash -LiteralPath $app -Algorithm SHA256).Hash.ToLowerInvariant() -cne $appHash){
 throw 'Per-app Mesa copied over native EXE unexpectedly'
}
$proof=[ordered]@{
 schema_version=1
 status='PASS_TEMPORARY_PINNED_TEST_ONLY'
 source_sha=$ExpectedSha
 archive_url=$source
 archive_sha256=$sha
 archive_kind=$archiveKind
 archive_transport=$pinned.transport
 archive_extract_method=$extractMethod
 app_sha256=$appHash
 binary_origin=$BinaryOrigin
 dll_count=$dlls.Count
 dll_manifest=$manifest
 no_system_install=$true
 no_product_distribution=$true
 overlay_directory='RUNNER_TEMP_PRIVATE_NOT_UPLOADED'
 full_w2_qualification='NOT_RUN'
 physical_windows10='NOT_RUN'
}
$proof | ConvertTo-Json -Depth 7 | Set-Content -LiteralPath (Join-Path $EvidenceDirectory 'w2-mesa-software-gl-provenance.json') -Encoding UTF8
Write-Host 'PERSONAL_W2_MESA_TEMP_STAGE=PASS_PINNED_LLVMPIPE_ONLY'
