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
$source='https://github.com/pal1000/mesa-dist-win/releases/download/26.2.6/mesa3d-26.2.6-release-msvc.7z'
$expected='b2e00615feaba45942343c265cc8c5f576142ca682c1ac6661922d4b72492877'
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
$archive=Join-Path $work 'mesa3d-26.2.6-release-msvc.7z'
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
$diagnostic=[ordered]@{archive_sha256=$actual;release='Mesa 26.2.6 MSVC';file_count=$files.Count;sample_paths=$sample;raw_software_gl='NOT_YET_VALIDATED'}
$diagnostic | ConvertTo-Json -Depth 5 | Set-Content -LiteralPath (Join-Path $EvidenceDirectory 'mesa-extraction-diagnostic.json') -Encoding UTF8
$all=@($files | Where-Object {$_.Name -ieq 'opengl32.dll'})
$gl=@($all | Where-Object {$_.FullName -match '(?i)[\\/](x64|x86_64)[\\/]' -and $_.FullName -notmatch '(?i)[\\/]debug[\\/]'})
if($gl.Count -ne 1){throw "Expected exactly one Mesa MSVC x64 opengl32.dll; found $($gl.Count) of $($all.Count)"}
$mega=Join-Path $gl[0].Directory.FullName 'libgallium_wgl.dll'
if(-not (Test-Path -LiteralPath $mega -PathType Leaf)){throw 'Mesa3D x64 libgallium_wgl.dll missing from matched opengl32.dll location'}
$copy=@($gl[0].FullName,$mega)
foreach($file in $copy){Copy-Item -LiteralPath $file -Destination (Join-Path $AppDirectory (Split-Path $file -Leaf)) -Force}
# GitHub job/process only: software GL, not the customer's system policy.
$env:GALLIUM_DRIVER='llvmpipe'
$env:LIBGL_ALWAYS_SOFTWARE='1'
$enc=New-Object System.Text.UTF8Encoding($false)
[System.IO.File]::AppendAllLines($env:GITHUB_ENV, @('GALLIUM_DRIVER=llvmpipe','LIBGL_ALWAYS_SOFTWARE=1'), $enc)
$report=[ordered]@{
 schema_version=1
 evidence_kind='DISPOSABLE_GITHUB_WINDOWS_MESA_SOFTWARE_GL_ONLY'
 archive_url=$source
 archive_sha256=$actual
 provenance='pal1000/mesa-dist-win Github Release 26.2.6 MSVC x64'
 no_product_distribution=$true
 no_system_install=$true
 software_gl='Mesa llvmpipe'
 app_sha256=(Get-FileHash -LiteralPath (Join-Path $AppDirectory 'tikzarium-app.exe') -Algorithm SHA256).Hash.ToLowerInvariant()
 opengl32_sha256=(Get-FileHash -LiteralPath (Join-Path $AppDirectory 'opengl32.dll') -Algorithm SHA256).Hash.ToLowerInvariant()
 gallium_sha256=(Get-FileHash -LiteralPath (Join-Path $AppDirectory 'libgallium_wgl.dll') -Algorithm SHA256).Hash.ToLowerInvariant()
}
$report | ConvertTo-Json -Depth 5 | Set-Content -LiteralPath (Join-Path $EvidenceDirectory 'mesa-software-gl-provenance.json') -Encoding UTF8
Write-Host 'HOSTED_MESA_LLVMPIPE_VERIFIED_CI_ONLY=PASS'
