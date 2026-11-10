# Adversarial W3 runtime SHA guards: no real GUI, drivers or TeX.
# Synthetic temporary files ONLY in GitHub-hosted Windows PowerShell 5.1.
[CmdletBinding()]
param()
Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
$guard = Join-Path (Split-Path -Parent $PSScriptRoot) 'W3-Source-Guard.ps1'
. $guard
$root = Join-Path ([IO.Path]::GetTempPath()) ("tikzarium-w3-runtime-test-" + [Guid]::NewGuid().ToString('N'))
$runtime = Join-Path $root 'runtime'
$source = Join-Path $root 'native-source-app.exe'
$reportPath = Join-Path $root 'w3-mesa-preflight.json'
$sha = 'a' * 40

function Hash([string]$Path) {
    return (Get-FileHash -LiteralPath $Path -Algorithm SHA256).Hash.ToLowerInvariant()
}
function Check-Failure([string]$Expected) {
    $observed = ''
    try {
        Assert-W3PreparedRuntime -Repo $root -AppPath $source -RunDir $runtime -ReportPath $reportPath -ExpectedSourceSha $sha
    } catch {
        $observed = $_.Exception.Message
    }
    if (-not $observed.Contains($Expected)) {
        throw "W3 negative $Expected: unexpected result $observed"
    }
}

try {
    New-Item -Path $runtime -ItemType Directory -Force | Out-Null
    [IO.File]::WriteAllBytes($source, ([Text.Encoding]::ASCII.GetBytes('synthetic-source-app-not-executable')))
    $app = Join-Path $runtime 'tikzarium-app.exe'
    $gl = Join-Path $runtime 'opengl32.dll'
    $wgl = Join-Path $runtime 'libgallium_wgl.dll'
    [IO.File]::Copy($source, $app)
    [IO.File]::WriteAllBytes($gl, ([Text.Encoding]::ASCII.GetBytes('original-gl')))
    [IO.File]::WriteAllBytes($wgl, ([Text.Encoding]::ASCII.GetBytes('original-wgl')))
    $truth = [ordered]@{
        scope = 'ISOLATED_USER_W3_MESA_LLVMPIPE_QA_ONLY'
        status = 'MESA_PREPARED_GUI_NOT_YET_ACCEPTED'
        source_proof = [ordered]@{ source_sha = $sha; app_sha256 = (Hash $source) }
        isolated_app_sha256 = (Hash $app)
        runtime_dll_sha256 = [ordered]@{
            'opengl32.dll' = (Hash $gl)
            'libgallium_wgl.dll' = (Hash $wgl)
        }
    }
    function Get-W3SourceProof {
        param([string]$Repo,[string]$AppPath,[string]$ExpectedSourceSha)
        return [ordered]@{ source_sha = $script:sha; app_sha256 = (Hash $AppPath) }
    }
    $truth | ConvertTo-Json -Depth 8 | Set-Content -LiteralPath $reportPath -Encoding UTF8
    Assert-W3PreparedRuntime -Repo $root -AppPath $source -RunDir $runtime -ReportPath $reportPath -ExpectedSourceSha $sha
    [IO.File]::AppendAllText($app, 'different')
    Check-Failure 'W3_PREPARED_APP_CHANGED'
    [IO.File]::Copy($source, $app, $true)
    [IO.File]::AppendAllText($gl, 'tampered')
    Check-Failure 'W3_PREPARED_MESA_DLL_CHANGED'
    [IO.File]::WriteAllBytes($gl, ([Text.Encoding]::ASCII.GetBytes('original-gl')))
    Remove-Item -LiteralPath $wgl -Force
    Check-Failure 'W3_PREPARED_MESA_DLL_SET_CHANGED'
    [IO.File]::WriteAllBytes($wgl, ([Text.Encoding]::ASCII.GetBytes('original-wgl')))
    $oldSha = $truth.source_proof.source_sha
    $truth.source_proof.source_sha = 'b' * 40
    $truth | ConvertTo-Json -Depth 8 | Set-Content -LiteralPath $reportPath -Encoding UTF8
    Check-Failure 'W3_PREPARED_SOURCE_CHANGED'
    $truth.source_proof.source_sha = $oldSha
    $truth.Remove('runtime_dll_sha256')
    $truth | ConvertTo-Json -Depth 8 | Set-Content -LiteralPath $reportPath -Encoding UTF8
    Check-Failure 'W3_PREPARED_MANIFEST_UNVERIFIED'
    Write-Host 'W3_PREPARED_RUNTIME_SYNTHETIC_SHA_NEGATIVE_PASS_5_CASES_NO_GUI'
} finally {
    if (Test-Path -LiteralPath $root) {
        Remove-Item -LiteralPath $root -Recurse -Force
    }
}
