# MiKTeX config values are printed amid advisory/INFO lines on hosted Windows.
# This function must accept only an unambiguous standalone numeric value 0.
function Assert-MiKTeXAutoInstallDisabled {
    [CmdletBinding()]
    param(
        [Parameter(Mandatory = $true)][string]$Transcript,
        [Parameter(Mandatory = $true)][int]$ExitCode
    )
    if ($ExitCode -ne 0) { throw "MiKTeX initexmf readback failed (exit $ExitCode)" }
    $numbers = @($Transcript -split '(?:\r\n|\n|\r)' |
        Where-Object { $_ -match '^\s*[-+]?\d+\s*$' } |
        ForEach-Object { $_.Trim() })
    if ($numbers.Count -ne 1 -or $numbers[0] -cne '0') {
        throw 'MiKTeX AutoInstall readback is missing, enabled, or ambiguous; offline build refused'
    }
    return '0'
}
