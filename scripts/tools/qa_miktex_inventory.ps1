# D06: capture ONLY canonical stdout inventory; MiKTeX emits security-risk
# warnings to stderr on hosted elevated runner and MUST NOT contaminate the
# before/after package-installation set.
function Assert-MiKTeXInventoryLines {
    [CmdletBinding()]
    param([Parameter(Mandatory = $true)][AllowEmptyCollection()][object[]]$Lines)
    $items = @($Lines | ForEach-Object { [string]$_ })
    if ($items.Count -lt 1) { throw 'MiKTeX returned an empty package inventory' }
    foreach ($item in $items) {
        if ($item -cnotmatch '^[A-Za-z0-9][A-Za-z0-9._-]*\|(true|false)$') {
            throw "Noncanonical MiKTeX package inventory entry: $item"
        }
    }
    $sorted = @($items | Sort-Object)
    if (@($sorted | Select-Object -Unique).Count -ne $sorted.Count) {
        throw 'MiKTeX returned duplicate package inventory entries'
    }
    return $sorted
}

function Save-MiKTeXInventory {
    [CmdletBinding()]
    param(
        [Parameter(Mandatory = $true)][string]$Executable,
        [Parameter(Mandatory = $true)][string]$Snapshot,
        [Parameter(Mandatory = $true)][string]$StderrLog
    )
    if (-not (Test-Path -LiteralPath $Executable -PathType Leaf)) {
        throw 'Private MiKTeX package executable missing'
    }
    # Native stderr is archived separately. Never merge security advisories
    # into canonical stdout; compare exactly installed true/false metadata.
    $stdout = @(& $Executable packages list --template '{id}|{isInstalled}' 2> $StderrLog)
    $code = $LASTEXITCODE
    if ($code -ne 0) { throw "MiKTeX packages list failed: $code" }
    $canonical = @(Assert-MiKTeXInventoryLines -Lines $stdout)
    $canonical | Set-Content -LiteralPath $Snapshot -Encoding utf8
}
