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
Write-Host 'W3 MESA ISOLATED LAUNCHER STATIC CONTRACT PASS'
