# W3 physical QA runtime-source integrity guards. Read-only; no Git network,
# account, UAC, RDP, MiKTeX or driver changes. Load via dot-source from launcher.
Set-StrictMode -Version Latest

function Test-W3Sha([string]$Actual, [string]$Expected) {
    if ($Actual -cnotmatch '^[0-9a-f]{40}$') { return $false }
    return ([string]::IsNullOrWhiteSpace($Expected) -or
        ($Expected -cmatch '^[0-9a-f]{40}$' -and $Actual -ceq $Expected))
}
function Test-W3Freshness([datetime]$ExeUtc, [datetime]$SourceUtc) {
    return ($ExeUtc -ge $SourceUtc)
}
function Get-W3SourceProof {
    [CmdletBinding()]
    param(
        [Parameter(Mandatory)][string]$Repo,
        [Parameter(Mandatory)][string]$AppPath,
        [string]$ExpectedSourceSha = ''
    )
    $gitPath = 'C:\Program Files\Git\cmd\git.exe'
    if (-not (Test-Path -LiteralPath $gitPath -PathType Leaf)) {
        throw 'W3_SOURCE_GIT_NOT_FOUND: existing Git required; no install performed.'
    }
    if (-not (Test-Path -LiteralPath $AppPath -PathType Leaf)) {
        throw "W3_APP_NOT_BUILT: $AppPath. Compile accepted main: cargo build --locked -j 1 -p tikzarium-app"
    }
    $sourceSha = (& $gitPath -C $Repo rev-parse HEAD | Out-String).Trim().ToLowerInvariant()
    if ($LASTEXITCODE -ne 0 -or -not (Test-W3Sha $sourceSha $ExpectedSourceSha)) {
        throw "W3_WRONG_SOURCE_SHA: actual=$sourceSha expected=$ExpectedSourceSha"
    }
    $branch = (& $gitPath -C $Repo symbolic-ref --short HEAD | Out-String).Trim()
    if ($LASTEXITCODE -ne 0 -or $branch -cne 'main') {
        throw "W3_WRONG_BRANCH: require clean local main, got $branch"
    }
    $dirty = @(& $gitPath -C $Repo status --porcelain --untracked-files=no)
    if ($LASTEXITCODE -ne 0 -or @($dirty | Where-Object { $_.Trim() }).Count -gt 0) {
        throw 'W3_DIRTY_GIT_WORKTREE: tracked changes not allowed in physical GUI QA'
    }
    # This merged commit introduced the in-app Save & Build modal. No false
    # Win10 W3 proof with the old native Save As version of the app.
    & $gitPath -C $Repo merge-base --is-ancestor '57cb62e4b70f896eb48978da4252ec1fede6c26a' HEAD 2>$null
    if ($LASTEXITCODE -ne 0) {
        throw 'W3_PRE_PR152_SOURCE: accepted GUI Build fix not in local history'
    }
    $modal = Join-Path $Repo 'crates\tikzarium-app\src\build_save_dialog.rs'
    if (-not (Test-Path -LiteralPath $modal -PathType Leaf)) {
        throw 'W3_SOURCE_MODAL_MISSING: source lacks accepted in-app Save & Build modal'
    }
    # Compilation inputs must not be newer than the debug PE. This is a
    # freshness fence, not cryptographic attestation of Cargo build inputs.
    $appUtc = (Get-Item -LiteralPath $AppPath).LastWriteTimeUtc
    $inputs = @(
        (Join-Path $Repo 'Cargo.toml'),
        (Join-Path $Repo 'Cargo.lock'),
        (Join-Path $Repo 'examples\quickstart.tex')
    )
    $inputs += @(Get-ChildItem -LiteralPath (Join-Path $Repo 'crates') -Recurse -File |
        Where-Object { $_.Extension -in @('.rs', '.toml') } |
        Select-Object -ExpandProperty FullName)
    $inputs += @(Get-ChildItem -LiteralPath (Join-Path $Repo 'extensions') -Recurse -File -Filter '*.toml' |
        Select-Object -ExpandProperty FullName)
    $stale = @($inputs | Where-Object {
        -not (Test-Path -LiteralPath $_ -PathType Leaf) -or
        -not (Test-W3Freshness $appUtc (Get-Item -LiteralPath $_).LastWriteTimeUtc)
    })
    if ($stale.Count -gt 0) {
        throw "W3_STALE_APP_EXE: newer build input $($stale[0]); rerun cargo build --locked -j 1 -p tikzarium-app"
    }
    return [ordered]@{
        source_sha = $sourceSha
        local_main_branch_confirmed = $true
        clean_tracked_worktree = $true
        accepted_pr152_ancestor = $true
        app_last_write_utc = $appUtc.ToString('o')
        app_sha256 = (Get-FileHash -LiteralPath $AppPath -Algorithm SHA256).Hash.ToLowerInvariant()
        expected_sha_supplied = (-not [string]::IsNullOrWhiteSpace($ExpectedSourceSha))
        remote_main_freshness = 'NOT_CHECKED_NO_NETWORK'
        status = 'LOCAL_SOURCE_AND_BINARY_FRESHNESS_ONLY_NOT_W3_PASS'
    }
}
function Assert-W3PreparedRuntime {
    [CmdletBinding()]
    param(
        [Parameter(Mandatory)][string]$Repo,
        [Parameter(Mandatory)][string]$AppPath,
        [Parameter(Mandatory)][string]$RunDir,
        [Parameter(Mandatory)][string]$ReportPath,
        [string]$ExpectedSourceSha = ''
    )
    if (-not (Test-Path -LiteralPath $ReportPath -PathType Leaf)) {
        throw 'W3_PREPARED_MANIFEST_MISSING: run PrepareAndRun / PrepareOnly'
    }
    $report = Get-Content -LiteralPath $ReportPath -Raw -Encoding UTF8 | ConvertFrom-Json
    # Under Set-StrictMode a missing property throws before a normal $null
    # check. Enforce a predictable fail-closed error for truncated JSON.
    foreach ($field in @('scope','status','source_proof','runtime_dll_sha256','isolated_app_sha256')) {
        if ($null -eq $report.PSObject.Properties[$field]) {
            throw "W3_PREPARED_MANIFEST_UNVERIFIED: required $field absent"
        }
    }
    if ($report.scope -cne 'ISOLATED_USER_W3_MESA_LLVMPIPE_QA_ONLY' -or
        $report.status -cne 'MESA_PREPARED_GUI_NOT_YET_ACCEPTED' -or
        $null -eq $report.source_proof -or
        $null -eq $report.runtime_dll_sha256) {
        throw 'W3_PREPARED_MANIFEST_UNVERIFIED: legacy overlay cannot qualify W3'
    }
    $proof = Get-W3SourceProof -Repo $Repo -AppPath $AppPath -ExpectedSourceSha $ExpectedSourceSha
    if ($report.source_proof.source_sha -cne $proof.source_sha -or
        $report.source_proof.app_sha256 -cne $proof.app_sha256) {
        throw 'W3_PREPARED_SOURCE_CHANGED: source SHA or EXE differs from staged overlay'
    }
    $candidate = Join-Path $RunDir 'tikzarium-app.exe'
    if (-not (Test-Path -LiteralPath $candidate -PathType Leaf)) {
        throw 'W3_PREPARED_APP_MISSING'
    }
    $actualExe = (Get-FileHash -LiteralPath $candidate -Algorithm SHA256).Hash.ToLowerInvariant()
    if ($actualExe -cne $proof.app_sha256 -or
        $actualExe -cne $report.isolated_app_sha256.ToLowerInvariant()) {
        throw 'W3_PREPARED_APP_CHANGED: staged native EXE bytes not trustworthy'
    }
    $expected = @($report.runtime_dll_sha256.PSObject.Properties)
    $actualDll = @(Get-ChildItem -LiteralPath $RunDir -Filter '*.dll' -File)
    if ($expected.Count -lt 2 -or $actualDll.Count -ne $expected.Count) {
        throw 'W3_PREPARED_MESA_DLL_SET_CHANGED'
    }
    foreach ($item in $actualDll) {
        $entry = $report.runtime_dll_sha256.PSObject.Properties[$item.Name]
        $hash = (Get-FileHash -LiteralPath $item.FullName -Algorithm SHA256).Hash.ToLowerInvariant()
        if ($null -eq $entry -or $hash -cne [string]$entry.Value) {
            throw "W3_PREPARED_MESA_DLL_CHANGED: $($item.Name)"
        }
    }
    Write-Host ("W3_RUNTIME_SOURCE_AND_DLL_SHA256_VERIFIED: " + $proof.source_sha + " (physical GUI NOT_RUN)")
}
function Test-W3ProvenancePure {
    $now = [DateTime]::UtcNow
    if (-not (Test-W3Sha ('a' * 40) ('a' * 40)) -or
        (Test-W3Sha ('a' * 40) ('b' * 40)) -or
        (Test-W3Sha 'NOT_CHECKED' '') -or
        (Test-W3Sha ('A' * 40) ('A' * 40)) -or
        (Test-W3Sha ('a' * 40) 'incorrect') -or
        -not (Test-W3Freshness $now $now) -or
        -not (Test-W3Freshness $now $now.AddSeconds(-1)) -or
        (Test-W3Freshness $now $now.AddSeconds(1))) {
        throw 'W3_PROVENANCE_SELFTEST_FAILED'
    }
    Write-Host 'W3_PROVENANCE_PURE_SELFTEST_PASS_8_CASES_NO_OS_MUTATIONS'
}
