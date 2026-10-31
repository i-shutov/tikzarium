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

# Refuse MiKTeX package operations if they resolve outside the CI root.
# --private and --no-registry affect setup but are not sufficient evidence:
# the 2026-10-31 live log used runneradmin's default AppData for packages.
function Assert-MiKTeXPrivateRoots {
    [CmdletBinding()]
    param(
        [Parameter(Mandatory = $true)][string]$Report,
        [Parameter(Mandatory = $true)][int]$ExitCode,
        [Parameter(Mandatory = $true)][string]$Install,
        [Parameter(Mandatory = $true)][string]$Config,
        [Parameter(Mandatory = $true)][string]$Data
    )
    if ($ExitCode -ne 0) { throw "MiKTeX initexmf root report failed (exit $ExitCode)" }
    $expected = @{ UserInstall = $Install; UserConfig = $Config; UserData = $Data }
    $lines = $Report -split '(?:\r\n|\n|\r)'
    foreach ($name in @('UserInstall','UserConfig','UserData')) {
        $values = @(
            foreach ($line in $lines) {
                $match = [regex]::Match($line, '^\s*' + [regex]::Escape($name) + '\s*:\s*(.+?)\s*$')
                if ($match.Success) { $match.Groups[1].Value.Trim() }
            }
        )
        if ($values.Count -ne 1) { throw "Missing or ambiguous MiKTeX $name root" }
        $observed = [IO.Path]::GetFullPath($values[0]).TrimEnd([char]92, [char]47)
        $required = [IO.Path]::GetFullPath($expected[$name]).TrimEnd([char]92, [char]47)
        if (-not [string]::Equals($observed, $required, [StringComparison]::OrdinalIgnoreCase)) {
            throw "MiKTeX $name escaped the private CI root: $observed"
        }
    }
    return $true
}
