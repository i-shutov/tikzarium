# TikZarium Windows 10 W3 — isolated software OpenGL (Mesa llvmpipe) for real RDP GUI.
# No system-wide OpenGL changes, registry, driver, UAC, admin, or runner changes.
# Requires Windows PowerShell 5.1, a previously compiled local tikzarium-app.exe,
# and the SHA256-pinned upstream Mesa3D archive. Does NOT claim W3 GUI PASS.
[CmdletBinding()]
param(
    [ValidateSet('PrepareAndRun', 'PrepareOnly', 'RunPrepared')]
    [string]$Action = 'PrepareAndRun'
)
Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
$ProgressPreference = 'SilentlyContinue'

$repo = Join-Path $env:USERPROFILE 'source\tikzarium'
$sourceApp = Join-Path $repo 'target\debug\tikzarium-app.exe'
$root = Join-Path $env:USERPROFILE 'Documents\TikZarium-QA\W3-Mesa-26.2.6'
$archive = Join-Path $root 'downloads\mesa3d-26.2.6-release-mingw.7z'
$unpack = Join-Path $root 'unpacked'
$runDir = Join-Path $root 'runtime'
$workspace = Join-Path $env:USERPROFILE 'Documents\TikZarium-QA\W3-physical'
$evidence = Join-Path $root 'w3-mesa-preflight.json'
$sourceUrl = 'https://github.com/pal1000/mesa-dist-win/releases/download/26.2.6/mesa3d-26.2.6-release-mingw.7z'
$shaExpected = 'da0f71d9181b672c1918f3c342f11118c687f6059a46b16502845160733cc388'

function Say([string]$Message) {
    Write-Host ('[{0}] {1}' -f (Get-Date -Format 'HH:mm:ss'), $Message) -ForegroundColor Cyan
}
function Assert-MesaArchive {
    if (-not (Test-Path -LiteralPath $archive -PathType Leaf)) {
        throw "Pinned Mesa archive missing: $archive"
    }
    $actual = (Get-FileHash -LiteralPath $archive -Algorithm SHA256).Hash.ToLowerInvariant()
    if ($actual -cne $shaExpected) {
        throw "MESA_SHA256_MISMATCH: expected=$shaExpected actual=$actual. Refusing extraction and execution."
    }
    Say "MESA_SHA256_VERIFIED: $actual"
}
function Prepare-MesaRuntime {
    if (-not (Test-Path -LiteralPath $sourceApp -PathType Leaf)) {
        throw "TikZarium app missing. Build first: $sourceApp"
    }
    New-Item -ItemType Directory -Path (Split-Path -Parent $archive) -Force | Out-Null
    New-Item -ItemType Directory -Path $workspace -Force | Out-Null
    if (-not (Test-Path -LiteralPath $archive -PathType Leaf)) {
        Say "Downloading official Mesa3D 26.2.6 release (56 MB); no system installation."
        try {
            [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
            Invoke-WebRequest -Uri $sourceUrl -OutFile $archive -UseBasicParsing -MaximumRedirection 8 -TimeoutSec 240
        } catch {
            Remove-Item -LiteralPath $archive -Force -ErrorAction SilentlyContinue
            throw
        }
    }
    Assert-MesaArchive
    $tar = Join-Path $env:SystemRoot 'System32\tar.exe'
    if (-not (Test-Path -LiteralPath $tar -PathType Leaf)) {
        throw "Windows built-in bsdtar.exe missing: $tar. Do not install a system driver."
    }
    if (-not (Test-Path -LiteralPath $unpack -PathType Container)) {
        New-Item -ItemType Directory -Path $unpack -Force | Out-Null
    }
    $mesaCandidates = @(Get-ChildItem -LiteralPath $unpack -Recurse -File -Filter 'opengl32.dll' -ErrorAction SilentlyContinue | Where-Object { $_.Directory.Name -eq 'x64' })
    if ($mesaCandidates.Count -ne 1) {
        Say "Extracting SHA256-verified .7z with Windows built-in tar (supports 7z)."
        & $tar -xf $archive -C $unpack
        if ($LASTEXITCODE -ne 0) { throw "Windows tar.exe extraction failed: exit $LASTEXITCODE" }
        $mesaCandidates = @(Get-ChildItem -LiteralPath $unpack -Recurse -File -Filter 'opengl32.dll' -ErrorAction SilentlyContinue | Where-Object { $_.Directory.Name -eq 'x64' })
    }
    if ($mesaCandidates.Count -ne 1) {
        throw "Expected exactly one x64/opengl32.dll in pinned Mesa distribution, found $($mesaCandidates.Count)."
    }
    $mesaBin = $mesaCandidates[0].Directory.FullName
    $wgl = Join-Path $mesaBin 'libgallium_wgl.dll'
    if (-not (Test-Path -LiteralPath $wgl -PathType Leaf)) {
        throw "Missing x64/libgallium_wgl.dll required by Mesa WGL: $wgl"
    }
    $libraries = @(Get-ChildItem -LiteralPath $mesaBin -File -Filter '*.dll')
    if ($libraries.Count -lt 2) { throw 'Mesa x64 runtime has fewer than two DLLs.' }
    # Only our dedicated QA runtime directory is replaced, never target/debug or system32.
    if (Test-Path -LiteralPath $runDir) {
        Remove-Item -LiteralPath $runDir -Recurse -Force
    }
    New-Item -ItemType Directory -Path $runDir -Force | Out-Null
    Copy-Item -LiteralPath $sourceApp -Destination (Join-Path $runDir 'tikzarium-app.exe') -Force
    foreach ($dll in $libraries) {
        Copy-Item -LiteralPath $dll.FullName -Destination (Join-Path $runDir $dll.Name) -Force
    }
    foreach ($required in @('opengl32.dll', 'libgallium_wgl.dll', 'tikzarium-app.exe')) {
        if (-not (Test-Path -LiteralPath (Join-Path $runDir $required) -PathType Leaf)) {
            throw "Runtime staging incomplete; missing $required"
        }
    }
    $gitPath = 'C:\Program Files\Git\cmd\git.exe'
    $sourceSha = 'NOT_CHECKED'
    if (Test-Path -LiteralPath $gitPath) {
        $sourceSha = (& $gitPath -C $repo rev-parse HEAD | Out-String).Trim()
        if ($LASTEXITCODE -ne 0) { $sourceSha = 'NOT_CHECKED' }
    }
    $report = [ordered]@{
        timestamp = (Get-Date -Format 'o')
        scope = 'ISOLATED_USER_W3_MESA_LLVMPIPE_QA_ONLY'
        status = 'MESA_PREPARED_GUI_NOT_YET_ACCEPTED'
        user = [Security.Principal.WindowsIdentity]::GetCurrent().Name
        mesa_version = '26.2.6'
        mesa_release_url = $sourceUrl
        mesa_archive_sha256 = $shaExpected
        mesa_bin = $mesaBin
        mesa_dll_count = $libraries.Count
        source_sha = $sourceSha
        original_app_sha256 = (Get-FileHash -LiteralPath $sourceApp -Algorithm SHA256).Hash
        isolated_app_sha256 = (Get-FileHash -LiteralPath (Join-Path $runDir 'tikzarium-app.exe') -Algorithm SHA256).Hash
        source_unchanged = $true
        system_drivers_modified = $false
        registry_modified = $false
        w3_gui_physical = 'NOT_RUN'
    }
    if ($report.original_app_sha256 -cne $report.isolated_app_sha256) {
        throw 'Copied application differs from source executable.'
    }
    $report | ConvertTo-Json -Depth 5 | Set-Content -LiteralPath $evidence -Encoding UTF8
    Say "Isolated Mesa runtime prepared: $runDir"
    Say "Evidence: $evidence"
}
function Run-IsolatedGui {
    $candidate = Join-Path $runDir 'tikzarium-app.exe'
    foreach ($required in @($candidate, (Join-Path $runDir 'opengl32.dll'), (Join-Path $runDir 'libgallium_wgl.dll'))) {
        if (-not (Test-Path -LiteralPath $required -PathType Leaf)) {
            throw "Runtime not prepared: $required. First use -Action PrepareAndRun."
        }
    }
    New-Item -ItemType Directory -Path $workspace -Force | Out-Null
    $oldGallium = [Environment]::GetEnvironmentVariable('GALLIUM_DRIVER', 'Process')
    $oldSoftware = [Environment]::GetEnvironmentVariable('LIBGL_ALWAYS_SOFTWARE', 'Process')
    $oldPath = $env:Path
    try {
        $env:GALLIUM_DRIVER = 'llvmpipe'
        $env:LIBGL_ALWAYS_SOFTWARE = '1'
        $env:Path = "$runDir;$oldPath"
        Say 'Launching isolated GUI with GALLIUM_DRIVER=llvmpipe; no system OpenGL modification.'
        Say 'If a window opens: W3 physical six gestures/F1/Undo/Save/Open/IME/GUI->PDF still need manual evidence.'
        Push-Location -LiteralPath $workspace
        try {
            & $candidate
            $exit = $LASTEXITCODE
            if ($exit -ne 0) { throw "Isolated GUI exited with code $exit. Send complete error output." }
        } finally {
            Pop-Location
        }
    } finally {
        $env:Path = $oldPath
        [Environment]::SetEnvironmentVariable('GALLIUM_DRIVER', $oldGallium, 'Process')
        [Environment]::SetEnvironmentVariable('LIBGL_ALWAYS_SOFTWARE', $oldSoftware, 'Process')
    }
}
if (-not [Environment]::Is64BitProcess) { throw 'Run 64-bit Windows PowerShell for x64 TikZarium/Mesa.' }
$os = Get-CimInstance Win32_OperatingSystem
if ([int]$os.ProductType -ne 1 -or [int]$os.BuildNumber -lt 19045) {
    throw 'Requires Windows 10 Pro x64 build 19045+ workstation; do not run on the personal Server.'
}
$current = [Security.Principal.WindowsIdentity]::GetCurrent()
$principal = New-Object Security.Principal.WindowsPrincipal($current)
if ($principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)) {
    throw 'W3 isolated software GL QA must run as non-admin tikzarium-qa.'
}
switch ($Action) {
    'PrepareAndRun' { Prepare-MesaRuntime; Run-IsolatedGui }
    'PrepareOnly'  { Prepare-MesaRuntime }
    'RunPrepared'  { Run-IsolatedGui }
}
