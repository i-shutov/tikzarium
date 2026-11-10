# OPTIONAL TikZarium Windows 10 QA runner bootstrap.
# Deliberately does not affect the existing tikzarium-winserver runner.
# Usage: non-elevated QA user, -Mode Prepare; then (only if wanted) -Mode Register.
[CmdletBinding()]
param(
    [ValidateSet('Prepare', 'Register')][string]$Mode = 'Prepare',
    [string]$RunnerLabel = 'tikzarium-win10-qa'
)
$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest
$me = [Security.Principal.WindowsIdentity]::GetCurrent()
$principal = New-Object Security.Principal.WindowsPrincipal($me)
if ($principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)) {
    throw 'Run as an ordinary QA user, not elevated Administrator.'
}
if ($RunnerLabel -cne 'tikzarium-win10-qa') {
    throw 'Only the dedicated, untrusted-PR-excluded custom label is allowed.'
}
$dir = Join-Path $env:USERPROFILE 'actions-runner-tikzarium-win10'
$archive = Join-Path $env:TEMP 'actions-runner-tikzarium-win-x64.zip'
if ($Mode -eq 'Prepare') {
    if (Test-Path (Join-Path $dir 'config.cmd')) {
        Write-Host "Already prepared: $dir"
        return
    }
    $headers = @{ 'User-Agent' = 'TikZarium-Win10-Runner-Setup'; 'Accept' = 'application/vnd.github+json' }
    $release = Invoke-RestMethod -Uri 'https://api.github.com/repos/actions/runner/releases/latest' -Headers $headers
    $assets = @($release.assets | Where-Object { $_.name -match '^actions-runner-win-x64-[0-9.]+\.zip$' })
    if ($assets.Count -ne 1) { throw 'Cannot uniquely identify the official Windows x64 runner ZIP.' }
    $asset = $assets[0]
    if (-not $asset.PSObject.Properties['digest'] -or $asset.digest -notmatch '^sha256:([a-fA-F0-9]{64})$') {
        throw 'Official GitHub release asset has no SHA256 digest; refusing unverified extraction.'
    }
    $expected = $Matches[1].ToLowerInvariant()
    Invoke-WebRequest -Uri $asset.browser_download_url -OutFile $archive -UseBasicParsing
    $actual = (Get-FileHash -LiteralPath $archive -Algorithm SHA256).Hash.ToLowerInvariant()
    if ($actual -cne $expected) { throw "Checksum mismatch. Expected $expected, actual $actual" }
    New-Item -ItemType Directory -Force -Path $dir | Out-Null
    Expand-Archive -LiteralPath $archive -DestinationPath $dir -Force
    if (-not (Test-Path (Join-Path $dir 'config.cmd'))) { throw 'Runner archive does not contain config.cmd.' }
    Remove-Item -LiteralPath $archive -Force
    Write-Host "Prepared official runner in $dir, SHA256 $actual"
    Write-Host 'Not registered and not running. Existing Windows Server runner unchanged.'
    Write-Host 'If you intentionally want this separate QA runner: gh auth login -h github.com; run this script -Mode Register.'
    return
}
$config = Join-Path $dir 'config.cmd'
if (-not (Test-Path -LiteralPath $config)) { throw 'First run -Mode Prepare.' }
if (Test-Path -LiteralPath (Join-Path $dir '.runner')) {
    throw 'This runner is already registered. Do not re-register.'
}
$gh = Get-Command gh.exe -ErrorAction SilentlyContinue
if (-not $gh) { throw 'GitHub CLI missing. Run the main workstation setup first.' }
& $gh.Source auth status -h github.com 2>$null | Out-Null
if ($LASTEXITCODE -ne 0) { throw 'Authenticate locally using gh auth login -h github.com. Do not share tokens in chat.' }
$token = (& $gh.Source api -X POST 'repos/i-shutov/tikzarium/actions/runners/registration-token' --jq '.token' | Out-String).Trim()
if ($LASTEXITCODE -ne 0 -or -not $token) { throw 'Cannot obtain repository runner registration token.' }
Push-Location $dir
try {
    & $config --url 'https://github.com/i-shutov/tikzarium' --token $token `
        --name ("${env:COMPUTERNAME}-tikzarium-win10") `
        --labels $RunnerLabel --no-default-labels --unattended
    if ($LASTEXITCODE -ne 0) { throw "Runner registration failed: $LASTEXITCODE" }
} finally {
    $token = $null
    Pop-Location
}
Write-Host 'Registered with custom label ONLY, no default labels, no Windows service.'
Write-Host "Launch interactively in unlocked RDP session: & `"$(Join-Path $dir 'run.cmd')`""
Write-Host 'Do not assign untrusted pull_request workflows to this public-repository runner.'