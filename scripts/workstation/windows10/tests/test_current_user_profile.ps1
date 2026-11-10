# Hosted PowerShell 5.1, no installation: invariants for filtered Admin CurrentUser mode.
[CmdletBinding()]
param()
Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
$directory = Split-Path -Parent $PSScriptRoot
$script = Join-Path $directory 'TikZarium-Win10-Setup.ps1'
$mesa = Join-Path $directory 'Invoke-TikZarium-W3-Mesa.ps1'
foreach ($path in @($script, $mesa)) {
    $tokens = $null
    $errorsFound = $null
    [void][System.Management.Automation.Language.Parser]::ParseFile($path,[ref]$tokens,[ref]$errorsFound)
    if (@($errorsFound).Count -gt 0) { throw "PARSE ERROR: $path" }
}
$text = Get-Content -LiteralPath $script -Raw
$gl = Get-Content -LiteralPath $mesa -Raw
foreach ($required in @(
    "[ValidateSet('Machine', 'User', 'CurrentUser', 'Check')]",
    "'CurrentUser' { Setup-User -UseCurrentProfile }",
    'if (-not $UseCurrentProfile -and -not $currentName.EndsWith',
    'User and CurrentUser setup must be launched with a non-elevated',
    'WMI/CIM unavailable; read-only Windows CurrentVersion registry fallback',
    'windows = $script:OsInfo.Caption',
    'build = $script:OsInfo.BuildNumber'
)) {
    if (-not $text.Contains($required)) { throw "Missing current-user setup invariant: $required" }
}
if ($text.Contains('        windows = (Get-CimInstance Win32_OperatingSystem).Caption')) {
    throw 'Environment report is unexpectedly WMI-dependent'
}
if ($gl -match 'W3 isolated software GL QA must run as non-admin tikzarium-qa') {
    throw 'Mesa launcher must allow medium token of existing Admin user'
}
if (-not $gl.Contains("Get-ItemProperty -LiteralPath 'HKLM:\SOFTWARE\Microsoft\Windows NT\CurrentVersion'")) {
    throw 'Mesa launcher still relies on WMI for build check'
}
Write-Host 'CURRENT_USER_SETUP_AND_MESA_STATIC_PASS; no installation and no GUI claimed'
