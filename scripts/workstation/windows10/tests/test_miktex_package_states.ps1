# Hosted Windows PowerShell 5.1 regression; no network, MiKTeX or installation.
[CmdletBinding()]
param()
Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
$source = Join-Path (Split-Path -Parent $PSScriptRoot) 'TikZarium-Win10-Setup.ps1'
if (-not (Test-Path -LiteralPath $source)) { throw 'Setup source not found' }
$tokens = $null
$errors = $null
$ast = [System.Management.Automation.Language.Parser]::ParseFile($source, [ref]$tokens, [ref]$errors)
if (@($errors).Count -gt 0) { throw 'Source parse failed' }
$converter = $ast.Find({
    param($node)
    ($node -is [System.Management.Automation.Language.FunctionDefinitionAst]) -and
    ($node.Name -eq 'ConvertTo-MiKTeXInstalledState')
}, $true)
if ($null -eq $converter) { throw 'Pure MiKTeX status converter missing' }
. ([scriptblock]::Create($converter.Extent.Text))
foreach ($inputValue in @('true', 'TRUE', ' True ')) {
    $observed = ConvertTo-MiKTeXInstalledState -RawStatus $inputValue -PackageId 'pgf'
    if ($observed -ne $true) { throw "Expected installed for '$inputValue'" }
}
foreach ($inputValue in @('false', 'FALSE', (' false' + [char]13 + [char]10))) {
    $observed = ConvertTo-MiKTeXInstalledState -RawStatus $inputValue -PackageId 'pgf'
    if ($observed -ne $false) { throw "Expected missing for '$inputValue'" }
}
foreach ($inputValue in @('', 'unknown', 'pgf already installed', 'true false')) {
    $threw = $false
    try {
        [void](ConvertTo-MiKTeXInstalledState -RawStatus $inputValue -PackageId 'pgf')
    } catch {
        $threw = $true
    }
    if (-not $threw) { throw "Invalid isInstalled '$inputValue' was accepted" }
}
$sourceText = Get-Content -LiteralPath $source -Raw
if ($sourceText -match 'packages install pgf standalone fontspec xcolor unicode-math') {
    throw 'Non-idempotent unconditional MiKTeX install regression'
}
if ($sourceText -notmatch 'Test-MiKTeXPackageInstalled -ManagerPath \$ManagerPath -PackageId \$id') {
    throw 'Required installed-state check missing'
}
if ($sourceText -notmatch 'Ensure-RequiredMiKTeXPackages -ManagerPath \$miktex') {
    throw 'User setup does not call idempotent provisioning'
}
Write-Host 'MIKTEX PACKAGE STATES REGRESSION PASS (no packages installed)'
