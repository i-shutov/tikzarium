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
Invoke-WebRequest -Uri $source -OutFile $archive -MaximumRedirection 6 -UseBasicParsing
$actual=(Get-FileHash -LiteralPath $archive -Algorithm SHA256).Hash.ToLowerInvariant()
if($actual -cne $expected){throw "Pinned Mesa3D GitHub release SHA mismatch: $actual"}
& $seven x $archive "-o$unpacked" -y | Out-Null
if($LASTEXITCODE -ne 0){throw 'Cannot extract verified Mesa3D archive'}
$files=@(Get-ChildItem -LiteralPath $unpacked -File -Recurse)
$sample=@($files | Select-Object -First 45 | ForEach-Object {$_.FullName.Substring($unpacked.Length).TrimStart([char]'\')})
Write-Host ('MESA_EXTRACTED_TOTAL_FILES=' + $files.Count)
Write-Host ('MESA_EXTRACTED_SAMPLE=' + ($sample -join ' ; '))
$diagnostic=[ordered]@{archive_sha256=$actual;release='Mesa 26.2.6 MinGW x64';file_count=$files.Count;sample_paths=$sample;raw_software_gl='NOT_YET_VALIDATED'}
$diagnostic | ConvertTo-Json -Depth 5 | Set-Content -LiteralPath (Join-Path $EvidenceDirectory 'mesa-extraction-diagnostic.json') -Encoding UTF8
# Only pinned MinGW x64. Mesa 26.2.6 MSVC release had no opengl32.dll.
$mesaX64=Join-Path $unpacked 'x64'
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
 provenance='pal1000/mesa-dist-win Github Release 26.2.6 MinGW x64'
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
