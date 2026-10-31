# Fail-closed host-only assertions for MiKTeX package inventory parser.
$ErrorActionPreference = 'Stop'
. (Join-Path $PSScriptRoot 'qa_miktex_inventory.ps1')
function Expect-Refused([object[]]$lines) {
    $thrown = $false
    try { $null = @(Assert-MiKTeXInventoryLines -Lines $lines) }
    catch { $thrown = $true }
    if (-not $thrown) { throw 'Noncanonical MiKTeX inventory was accepted' }
}
$ok = @(Assert-MiKTeXInventoryLines -Lines @('zeta|false', 'alpha|true'))
if (($ok -join ',') -cne 'alpha|true,zeta|false') { throw 'Canonical MiKTeX inventory parser failed' }
Expect-Refused @()
Expect-Refused @('security risk: running with elevated privileges')
Expect-Refused @('alpha|true', 'security risk: running with elevated privileges')
Expect-Refused @('alpha|other')
Expect-Refused @('alpha|true', 'alpha|true')
Expect-Refused @('x=abc|false')
Write-Host 'D06 MiKTeX package inventory parser: canonical + 6 rejects PASS (host PowerShell)'
