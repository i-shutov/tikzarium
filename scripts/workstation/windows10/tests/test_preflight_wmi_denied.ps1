# Simulates restricted Codex WMI access on Windows PowerShell 5.1.
# No OS changes, installations, ACL edits or dependency downloads.
[CmdletBinding()]
param([ValidateSet('Win10', 'Server')][string]$SimulatedOS = 'Win10')
Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

function Get-CimInstance {
    param([string]$ClassName)
    throw 'SIMULATED_WMI_ACCESS_DENIED'
}
function Get-ItemProperty {
    param([string]$LiteralPath)
    if ($LiteralPath -cne 'HKLM:\SOFTWARE\Microsoft\Windows NT\CurrentVersion') {
        throw "Unexpected registry access: $LiteralPath"
    }
    $name = if ($SimulatedOS -eq 'Server') { 'Windows Server 2025' } else { 'Windows 10 Pro' }
    return [pscustomobject]@{
        ProductName = $name
        CurrentBuildNumber = '19045'
        CurrentBuild = '19045'
        UBR = 4412
    }
}
$directory = Split-Path -Parent $PSScriptRoot
& (Join-Path $directory 'TikZarium-Win10-PREFLIGHT.ps1') -SetupPath (Join-Path $directory 'TikZarium-Win10-Setup.ps1') -RunnerPath (Join-Path $directory 'TikZarium-Win10-Runner-OPTIONAL.ps1')
# Script 'exit N' sets LASTEXITCODE in the caller scope; forward it to the
# outer powershell.exe process so the hosted negative test can assert exit 1.
exit ([int]$LASTEXITCODE)
