# Static negative contract for user-only local OpenGL fallback; no archive download.
[CmdletBinding()]
param()
Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
$path = Join-Path (Split-Path -Parent $PSScriptRoot) 'Invoke-TikZarium-W3-Mesa.ps1'
$tokens = $null
$issues = $null
[void][System.Management.Automation.Language.Parser]::ParseFile($path, [ref]$tokens, [ref]$issues)
if (@($issues).Count -gt 0) { throw 'Mesa launcher PowerShell parser error' }
$content = Get-Content -LiteralPath $path -Raw
foreach ($required in @(
  'da0f71d9181b672c1918f3c342f11118c687f6059a46b16502845160733cc388',
  'mesa3d-26.2.6-release-mingw.7z',
  "GALLIUM_DRIVER = 'llvmpipe'",
  "LIBGL_ALWAYS_SOFTWARE = '1'",
  'libgallium_wgl.dll',
  'opengl32.dll',
  'system_drivers_modified = $false',
  'TIKZARIUM_XELATEX',
  'xelatex.exe',
  'pdftoppm.exe',
  'SHA256',
  '7zr.exe 26.05',
  '9bf582b894dfa665f852d7e9112b02290a1c303c2d95a21fcdc41ffcb03143b7',
  '7zr.exe archive CRC test failed',
  '7zr.exe extraction failed'
)) {
    if (-not $content.Contains($required)) { throw "Mesa launcher contract missing: $required" }
}
if ($content -match '(?im)^\s*(?:Set-ItemProperty|New-ItemProperty|reg\.exe|reg add|Add-LocalGroupMember|Install-WindowsFeature)\b') {
    throw 'Mesa W3 QA must not modify OS policy, registry or user groups'
}
if ($content -match '&\s*\$tar\s+-xf') {
    throw 'Unsupported Windows 10 tar/LZMA extraction regression'
}

$guardPath = Join-Path (Split-Path -Parent $PSScriptRoot) 'W3-Source-Guard.ps1'
if (-not (Test-Path -LiteralPath $guardPath -PathType Leaf)) { throw 'Missing W3 source guard file' }
$guardTokens = $null
$guardErrors = $null
[void][System.Management.Automation.Language.Parser]::ParseFile(
    $guardPath, [ref]$guardTokens, [ref]$guardErrors
)
if (@($guardErrors).Count -ne 0) { throw "W3 source guard PS5.1 parse failure: $($guardErrors[0].Message)" }
foreach ($required in @(
    'W3-Source-Guard.ps1',
    'Get-W3SourceProof',
    'Assert-W3PreparedRuntime',
    'runtime_dll_sha256',
    '-ExpectedSourceSha $ExpectedSourceSha',
    'W3_ACCEPTED_SOURCE_PROVENANCE',
    'Test-W3ProvenancePure',
    'W3_EXPECTED_SOURCE_SHA_REQUIRED'
)) {
    if (-not $content.Contains($required)) { throw "Mesa W3 provenance contract missing: $required" }
}
$guardText = Get-Content -LiteralPath $guardPath -Raw
foreach ($required in @(
    'W3_PRE_PR152_SOURCE',
    'W3_STALE_APP_EXE',
    'W3_DIRTY_GIT_WORKTREE',
    'W3_PREPARED_APP_CHANGED',
    'W3_PREPARED_MESA_DLL_CHANGED',
    '57cb62e4b70f896eb48978da4252ec1fede6c26a',
    'NOT_CHECKED_NO_NETWORK',
    'W3_NOT_ACCEPTED'
)) {
    if ($required -eq 'W3_NOT_ACCEPTED') { continue }
    if (-not $guardText.Contains($required)) { throw "W3 source guard fail-closed fence missing: $required" }
}
if ($guardText -match '(?im)^\s*(?:Set-ItemProperty|New-ItemProperty|reg\.exe|reg add|Add-LocalGroupMember|Install-WindowsFeature|git\s+fetch|git\s+reset)\b') {
    throw 'W3 guard must never install packages or change OS, Git or user state'
}
& powershell.exe -NoProfile -ExecutionPolicy Bypass -File $path -Action SelfTest
if ($LASTEXITCODE -ne 0) { throw 'W3 source/sha/freshness pure selftest failed' }
Write-Host 'W3 SOURCE/FRESHNESS/STAGED SHA256 NEGATIVE CONTRACT PASS (no external tools)' 

Write-Host 'W3 MESA ISOLATED LAUNCHER STATIC CONTRACT PASS'
