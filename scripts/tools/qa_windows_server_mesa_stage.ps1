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
$source='https://github.com/pal1000/mesa-dist-win/releases/download/26.2.6/mesa3d-26.2.6-release-mingw.7z'
$expected='da0f71d9181b672c1918f3c342f11118c687f6059a46b16502845160733cc388'
$work=Join-Path $expectedRoot 'payload'
$unpack=Join-Path $work 'unpack'
New-Item -ItemType Directory -Path $unpack -Force | Out-Null
$archive=Join-Path $work 'mesa3d-26.2.6-release-mingw.7z'
. (Join-Path $PSScriptRoot 'qa_windows_pinned_mesa_fetch.ps1')
$pinned=Get-TikzariumPinnedArchive -SourceUrl $source -ArchivePath $archive -ExpectedSha256 $expected
$sha=$pinned.sha256
$seven=(Get-Command 7z.exe -ErrorAction SilentlyContinue).Source
if(-not $seven -and (Test-Path 'C:\Program Files\7-Zip\7z.exe')){$seven='C:\Program Files\7-Zip\7z.exe'}
if($seven){ & $seven x $archive ("-o" + $unpack) -y | Out-Null }
else {
 $tar=(Get-Command tar.exe -ErrorAction SilentlyContinue).Source
 if(-not $tar){throw 'Neither 7z nor Windows tar available; no installer allowed'}
 & $tar -xf $archive -C $unpack
}
if($LASTEXITCODE -ne 0){throw 'Existing archiver could not extract pinned Mesa archive'}
$x64=Join-Path $unpack 'x64'
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
