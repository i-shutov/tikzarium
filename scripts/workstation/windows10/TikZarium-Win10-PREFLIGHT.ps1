# Read-only Windows PowerShell 5.1 syntax/OS preflight.
[CmdletBinding()]
param(
    [string]$SetupPath,
    [string]$RunnerPath
)

$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest
try {
    $scriptDir = Split-Path -Path $PSCommandPath -Parent
    if ([string]::IsNullOrWhiteSpace($scriptDir)) {
        throw 'Cannot locate script directory. Invoke a saved .ps1 file with -File.'
    }
    if ([string]::IsNullOrWhiteSpace($SetupPath)) {
        $SetupPath = Join-Path -Path $scriptDir -ChildPath 'TikZarium-Win10-Setup.ps1'
    }
    if ([string]::IsNullOrWhiteSpace($RunnerPath)) {
        $RunnerPath = Join-Path -Path $scriptDir -ChildPath 'TikZarium-Win10-Runner-OPTIONAL.ps1'
    }

    Write-Host ('PowerShell {0}' -f $PSVersionTable.PSVersion) -ForegroundColor Cyan
    foreach ($path in @($PSCommandPath, $SetupPath, $RunnerPath)) {
        if (-not (Test-Path -LiteralPath $path -PathType Leaf)) {
            throw ('File missing: {0}' -f $path)
        }
        $tokens = $null
        $parseErrors = $null
        [void][System.Management.Automation.Language.Parser]::ParseFile(
            $path, [ref]$tokens, [ref]$parseErrors
        )
        if ($null -ne $parseErrors -and $parseErrors.Count -gt 0) {
            foreach ($issue in $parseErrors) {
                Write-Host ('PARSE ERROR: {0}:{1}:{2}: {3}' -f $path,
                    $issue.Extent.StartLineNumber, $issue.Extent.StartColumnNumber,
                    $issue.Message) -ForegroundColor Red
            }
            throw ('Syntax validation failed for {0}' -f $path)
        }
        $hash = (Get-FileHash -LiteralPath $path -Algorithm SHA256).Hash
        Write-Host ('SYNTAX PASS: {0} (SHA256 {1})' -f (Split-Path -Leaf $path), $hash) -ForegroundColor Green
    }
    # Genuine Windows PowerShell 5.1; WMI can be blocked inside a restricted
    # local Codex sandbox. Registry fallback only reads existing values.
    $os = $null
    try {
        $os = Get-CimInstance -ClassName Win32_OperatingSystem -ErrorAction Stop
    } catch {
        Write-Warning ('WMI/CIM unavailable; using read-only Windows registry: ' + $_.Exception.Message)
    }
    if ($null -eq $os) {
        $cv = Get-ItemProperty -LiteralPath 'HKLM:\SOFTWARE\Microsoft\Windows NT\CurrentVersion' -ErrorAction Stop
        $buildValue = if ($cv.CurrentBuildNumber) { [string]$cv.CurrentBuildNumber } else { [string]$cv.CurrentBuild }
        if ([string]::IsNullOrWhiteSpace($buildValue) -or $buildValue -notmatch '^[0-9]+$') {
            throw 'CurrentVersion registry missing valid Windows build'
        }
        $product = [string]$cv.ProductName
        if ([string]::IsNullOrWhiteSpace($product)) {
            throw 'CurrentVersion registry missing ProductName'
        }
        $os = [pscustomobject]@{
            Caption = $product
            BuildNumber = $buildValue
            ProductType = if ($product -match 'Windows Server') { 3 } else { 1 }
            OSArchitecture = if ([Environment]::Is64BitOperatingSystem) { '64-bit' } else { '32-bit' }
        }
    }
    $build = [int]$os.BuildNumber
    $supported = (([int]$os.ProductType -eq 1) -and
                  ([Environment]::Is64BitOperatingSystem) -and ($build -ge 19045))
    if (-not $supported) {
        throw ('Requires Windows 10 x64 build 19045+ or Windows 11 x64. Detected {0}, build {1}' -f $os.Caption, $build)
    }
    Write-Host ('OS PASS: {0}; build {1}' -f $os.Caption, $build) -ForegroundColor Green
    if (-not (Get-Command 'winget.exe' -ErrorAction SilentlyContinue)) {
        Write-Host 'winget not found: OK (direct vendor installers)' -ForegroundColor Green
    }
    Write-Host 'PREFLIGHT PASS (syntax and OS only; no installers executed)' -ForegroundColor Green
    exit 0
} catch {
    Write-Host ('PREFLIGHT FAIL: {0}' -f $_.Exception.Message) -ForegroundColor Red
    exit 1
}