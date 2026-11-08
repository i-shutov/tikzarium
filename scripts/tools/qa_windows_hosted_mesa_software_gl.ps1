# CI-ONLY: Pin and deploy Mesa3D llvmpipe next to one disposable hosted EXE.
# Never install on the owner machine, alter global OpenGL, or ship this DLL in a release ZIP.
[CmdletBinding()]
param(
 [Parameter(Mandatory)][string]$AppDirectory,
 [Parameter(Mandatory)][string]$EvidenceDirectory
)
$ErrorActionPreference='Stop'
if($env:GITHUB_ACTIONS -cne 'true' -or $env:RUNNER_OS -cne 'Windows' -or $env:RUNNER_ENVIRONMENT -cne 'github-hosted'){
 throw 'Only disposable GitHub-hosted Windows Actions may use CI Mesa software rendering'
}
$source='https://github.com/pal1000/mesa-dist-win/releases/download/26.2.6/mesa3d-26.2.6-release-mingw.7z'
$expected='da0f71d9181b672c1918f3c342f11118c687f6059a46b16502845160733cc388'
$AppDirectory=(Resolve-Path -LiteralPath $AppDirectory).Path
if(-not (Test-Path -LiteralPath (Join-Path $AppDirectory 'tikzarium-app.exe') -PathType Leaf)){throw 'Native TikZarium GUI not built'}
New-Item -ItemType Directory -Path $EvidenceDirectory -Force | Out-Null
$EvidenceDirectory=(Resolve-Path -LiteralPath $EvidenceDirectory).Path
$seven=(Get-Command 7z.exe -ErrorAction SilentlyContinue).Source
if(-not $seven -and (Test-Path 'C:\Program Files\7-Zip\7z.exe')){$seven='C:\Program Files\7-Zip\7z.exe'}
if(-not $seven){throw '7-Zip not installed in disposable Windows hosted tool image'}
if(-not $env:RUNNER_TEMP){throw 'GitHub runner temp directory unavailable'}
$work=Join-Path $env:RUNNER_TEMP 'tikzarium-hosted-mesa-26.2.6'
New-Item -ItemType Directory -Path $work -Force | Out-Null
$archive=Join-Path $work 'mesa3d-26.2.6-release-mingw.7z'
$unpacked=Join-Path $work 'unpacked'
New-Item -ItemType Directory -Path $unpacked -Force | Out-Null
# Multiple bounded official GitHub release transports, always the exact same SHA.
# Pure offline negative self-test must run before touching the network.
. (Join-Path $PSScriptRoot 'qa_windows_mesa_transport.ps1')
Invoke-TikzariumMesaTransportSelfTest
# First preference is the original pal1000 26.2.6 MinGW archive. If GitHub's
# release CDN is genuinely unreachable, an independently SHA-pinned *official*
# MSYS2 26.2.6-1 package is allowed for disposable hosted QA only.
# Both share an OpenGL 26.2.6 software-driver codebase, NOT interchangeable
# binary attestations: provenance and all original DLL hashes stay explicit.
$archiveKind='PAL1000_MINGW_26_2_6'
$releaseLabel='Mesa 26.2.6 MinGW x64 (pal1000)'
$mesaRelativePath='x64'
try {
 $pinned=Get-TikzariumPinnedMesaArchive -ArchivePath $archive
 $actual=$pinned.sha256
 if($pinned.source -cne $source -or $actual -cne $expected){
   throw 'PINNED_MESA_SOURCE_OR_SHA_DRIFT'
 }
 & $seven x $archive "-o$unpacked" -y | Out-Null
 if($LASTEXITCODE -ne 0){throw 'PINNED_MESA_PAL1000_EXTRACTION_FAILED'}
} catch {
 $primaryReason=$_.Exception.Message
 if($primaryReason -like '*SHA256_MISMATCH*' -or
    $primaryReason -like '*SOURCE_OR_SHA_DRIFT*'){
   throw  # never try other suppliers after a hash/provenance mismatch
 }
 Write-Warning ('Primary pinned pal1000 QA asset transport/extract unavailable; '+
                'trying independently SHA-pinned MSYS2 26.2.6-1: '+$primaryReason)
 $source='https://mirror.msys2.org/mingw/mingw64/mingw-w64-x86_64-mesa-26.2.6-1-any.pkg.tar.zst'
 $archive=Join-Path $work 'mingw-w64-x86_64-mesa-26.2.6-1-any.pkg.tar.zst'
 $expected='7b14de4d3f234efd0022d14dd7fb313ed751c829bb1f46026e0b2dce2d2d05a4'
 $archiveKind='MSYS2_MINGW64_MESA_26_2_6_1'
 $releaseLabel='MSYS2 mingw-w64-x86_64-mesa 26.2.6-1'
 $mesaRelativePath='mingw64\bin'
 $ProgressPreference='SilentlyContinue'
 $downloaded=$false
 for($n=1;$n -le 3;$n++){
   if(Test-Path -LiteralPath $archive){Remove-Item -LiteralPath $archive -Force}
   try{
     Invoke-WebRequest -Uri $source -OutFile $archive -MaximumRedirection 7 -TimeoutSec 120 -UseBasicParsing | Out-Null
     if(-not (Test-Path -LiteralPath $archive -PathType Leaf)){throw 'MSYS2_PACKAGE_NO_BYTES'}
     $downloaded=$true
     break
   }catch{
     if(Test-Path -LiteralPath $archive){Remove-Item -LiteralPath $archive -Force}
     if($n -eq 3){throw "PINNED_MSYS2_DOWNLOAD_FAILED_AFTER_3: $($_.Exception.Message)"}
     Write-Warning "MSYS2 official QA mirror attempt $n/3 failed; no hash exceptions allowed"
     Start-Sleep -Milliseconds (900*$n)
   }
 }
 if(-not $downloaded){throw 'PINNED_MSYS2_UNREACHABLE'}
 $actual=Assert-TikzariumMsys2ArchiveHash -ArchivePath $archive
 & $seven x $archive "-o$unpacked" -y | Out-Null
 if($LASTEXITCODE -ne 0){throw 'PINNED_MSYS2_ZSTD_EXTRACTION_FAILED'}
 $tars=@(Get-ChildItem -LiteralPath $unpacked -Filter '*.pkg.tar' -File)
 if($tars.Count -ne 1){throw 'PINNED_MSYS2_EXACT_ONE_NESTED_TAR_REQUIRED'}
 & $seven x $tars[0].FullName "-o$unpacked" -y | Out-Null
 if($LASTEXITCODE -ne 0){throw 'PINNED_MSYS2_TAR_EXTRACTION_FAILED'}
}
Write-Host ("HOSTED_QA_MESA_SOURCE="+$archiveKind+" SHA256="+$actual)
$files=@(Get-ChildItem -LiteralPath $unpacked -File -Recurse)
$sample=@($files | Select-Object -First 45 | ForEach-Object {$_.FullName.Substring($unpacked.Length).TrimStart([char]'\')})
Write-Host ('MESA_EXTRACTED_TOTAL_FILES=' + $files.Count)
Write-Host ('MESA_EXTRACTED_SAMPLE=' + ($sample -join ' ; '))
$diagnostic=[ordered]@{archive_sha256=$actual;release=$releaseLabel;archive_kind=$archiveKind;file_count=$files.Count;sample_paths=$sample;raw_software_gl='NOT_YET_VALIDATED'}
$diagnostic | ConvertTo-Json -Depth 5 | Set-Content -LiteralPath (Join-Path $EvidenceDirectory 'mesa-extraction-diagnostic.json') -Encoding UTF8
# Only pinned MinGW x64. Mesa 26.2.6 MSVC release had no opengl32.dll.
$mesaX64=Join-Path $unpacked $mesaRelativePath
if(-not (Test-Path -LiteralPath $mesaX64 -PathType Container)){throw 'Pinned MinGW x64 Mesa directory absent'}
$dlls=@(Get-ChildItem -LiteralPath $mesaX64 -File -Filter '*.dll')
$gl=@($dlls | Where-Object {$_.Name -ieq 'opengl32.dll'})
if($gl.Count -ne 1){throw "Expected one MinGW x64 opengl32.dll; found $($gl.Count) in $($dlls.Count) DLLs"}
$appHashBefore=(Get-FileHash -LiteralPath (Join-Path $AppDirectory 'tikzarium-app.exe') -Algorithm SHA256).Hash.ToLowerInvariant()
# MinGW may need sibling runtime DLLs. Copy only into this one disposable build output.
# Never deploy system-wide, change PATH/UAC, or upload these DLLs as a release.
$manifest=@()
foreach($dll in $dlls){
 $destination=Join-Path $AppDirectory $dll.Name
 Copy-Item -LiteralPath $dll.FullName -Destination $destination -Force
 $manifest+=([ordered]@{name=$dll.Name;sha256=(Get-FileHash -LiteralPath $destination -Algorithm SHA256).Hash.ToLowerInvariant()})
}
$appHashAfter=(Get-FileHash -LiteralPath (Join-Path $AppDirectory 'tikzarium-app.exe') -Algorithm SHA256).Hash.ToLowerInvariant()
if($appHashAfter -cne $appHashBefore){throw 'Compiled TikZarium GUI EXE hash unexpectedly changed'}
$gallium=Join-Path $AppDirectory 'libgallium_wgl.dll'
$galliumHash='NOT_PRESENT_BUNDLED_IN_OPENGL32_OR_NOT_REQUIRED'
if(Test-Path -LiteralPath $gallium -PathType Leaf){
 $galliumHash=(Get-FileHash -LiteralPath $gallium -Algorithm SHA256).Hash.ToLowerInvariant()
}
# GitHub job/process only: software GL, not the customer's system policy.
$env:GALLIUM_DRIVER='llvmpipe'
$env:LIBGL_ALWAYS_SOFTWARE='1'
$enc=New-Object System.Text.UTF8Encoding($false)
[System.IO.File]::AppendAllText($env:GITHUB_ENV, "GALLIUM_DRIVER=llvmpipe`nLIBGL_ALWAYS_SOFTWARE=1`n", $enc)
$report=[ordered]@{
 schema_version=1
 evidence_kind='DISPOSABLE_GITHUB_WINDOWS_MESA_SOFTWARE_GL_ONLY'
 archive_url=$source
 archive_sha256=$actual
 provenance=$releaseLabel
 archive_kind=$archiveKind
 no_product_distribution=$true
 no_system_install=$true
 software_gl='Mesa llvmpipe'
 app_sha256=$appHashAfter
 dll_count=$dlls.Count
 deployed_x64_dlls=$manifest
 opengl32_sha256=(Get-FileHash -LiteralPath (Join-Path $AppDirectory 'opengl32.dll') -Algorithm SHA256).Hash.ToLowerInvariant()
 gallium_sha256=$galliumHash
}
$report | ConvertTo-Json -Depth 5 | Set-Content -LiteralPath (Join-Path $EvidenceDirectory 'mesa-software-gl-provenance.json') -Encoding UTF8
Write-Host 'HOSTED_MESA_LLVMPIPE_VERIFIED_CI_ONLY=PASS'
