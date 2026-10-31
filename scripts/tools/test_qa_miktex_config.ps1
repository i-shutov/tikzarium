# D06 live PowerShell parser regression: runs before the MiKTeX installer.
$ErrorActionPreference = 'Stop'
. (Join-Path $PSScriptRoot 'qa_miktex_config.ps1')
$example = @'
initexmf: security risk: running with elevated privileges
10 [0x000017b8] INFO initexmf null - this is MiKTeX Configuration Utility 5.5 (MiKTeX 25.12)
10 [0x000017b8] INFO initexmf null - Operating on the private (per-user) MiKTeX setup
0
10 [0x000017b8] INFO initexmf null - this process finishes with exit code 0
'@
if ((Assert-MiKTeXAutoInstallDisabled -Transcript $example -ExitCode 0) -cne '0') {
    throw 'Failed to parse real MiKTeX 25.12 INFO transcript'
}
$badCases = @(
    @{ Label = 'no numeric readback'; Text = 'INFO 25.12'; Exit = 0 },
    @{ Label = 'AutoInstall enabled'; Text = '1'; Exit = 0 },
    @{ Label = 'unexpected numeric'; Text = '99'; Exit = 0 },
    @{ Label = 'two values'; Text = "0`n0"; Exit = 0 },
    @{ Label = 'one good and one bad'; Text = "0`n1"; Exit = 0 },
    @{ Label = 'readback failed'; Text = '0'; Exit = 1 }
)
foreach ($case in $badCases) {
    $rejected = $false
    try { $null = Assert-MiKTeXAutoInstallDisabled -Transcript $case.Text -ExitCode $case.Exit }
    catch { $rejected = $true }
    if (-not $rejected) { throw "Fail-open readback: $($case.Label)" }
}
Write-Host 'D06 MiKTeX config readback parser: 7/7 PASS (host PowerShell only)'
