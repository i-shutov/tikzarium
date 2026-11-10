# Audit an already-built TikZarium Windows PDF without Cargo, TeX or installation.
[CmdletBinding()]
param([string]$PdfPath, [string]$OutputDirectory, [switch]$SelfTest)
Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

function Normalize-QAText {
    param([AllowEmptyString()][string]$Value)
    if ($null -eq $Value) { return '' }
    return ([regex]::Replace($Value.Normalize([Text.NormalizationForm]::FormC), '\s+', ' ')).Trim()
}
function Test-QARequiredText {
    param([AllowEmptyString()][string]$Value)
    $v = Normalize-QAText -Value $Value
    return [pscustomobject]@{
        point = $v.Contains('Точка')
        cyrillic = $v.Contains('Кириллица')
        matches = ($v.Contains('Точка') -and $v.Contains('Кириллица'))
        normalized_length = $v.Length
    }
}
function Decode-QAUtf8 {
    param([byte[]]$Bytes)
    $decoder = New-Object System.Text.UTF8Encoding -ArgumentList $false,$true
    return $decoder.GetString($Bytes)
}
function Get-QACodepointPreview {
    param([AllowEmptyString()][string]$Value)
    $max = [Math]::Min($Value.Length, 70)
    $out = New-Object 'System.Collections.Generic.List[string]'
    for ($i = 0; $i -lt $max; $i++) {
        [void]$out.Add(('U+{0:X4}' -f [int][char]$Value[$i]))
    }
    return ($out -join ' ')
}
function Run-QASelfTest {
    $a = Test-QARequiredText -Value ('Точка' + [char]10 + 'Тест XeLaTeX: Кириллица.')
    if (-not $a.matches) { throw 'SelfTest: exact Cyrillic words rejected' }
    $bomText = [string][char]0xFEFF + 'Точка  Кириллица'
    if (-not (Test-QARequiredText -Value $bomText).matches) { throw 'SelfTest: BOM/whitespace rejected' }
    if ((Test-QARequiredText -Value 'Toчка Киpиллица').matches) {
        throw 'SelfTest: mixed Latin lookalikes wrongly accepted'
    }
    if ((Test-QARequiredText -Value 'Точка only').matches) {
        throw 'SelfTest: missing required word accepted'
    }
    $bytes = [Text.Encoding]::UTF8.GetBytes('Точка Кириллица')
    if (-not (Test-QARequiredText -Value (Decode-QAUtf8 -Bytes $bytes)).matches) {
        throw 'SelfTest: strict UTF8 round-trip failed'
    }
    $invalidRejected = $false
    try { [void](Decode-QAUtf8 -Bytes ([byte[]](0xD0))) } catch { $invalidRejected = $true }
    if (-not $invalidRejected) { throw 'SelfTest: malformed UTF8 accepted' }
    Write-Host 'PDF_CYRILLIC_AUDIT_SELFTEST_PASS (UTF8,NFC,BOM,whitespace,negative cases; no TeX)'
}
function Find-QAPoppler {
    param([Parameter(Mandatory)][string]$Name)
    $bin = Join-Path $env:LOCALAPPDATA 'Programs\TikZariumPoppler\poppler-25.07.0\Library\bin'
    $portable = Join-Path $bin ($Name + '.exe')
    if (Test-Path -LiteralPath $portable -PathType Leaf) { return $portable }
    $found = Get-Command ($Name + '.exe') -ErrorAction SilentlyContinue
    if ($found) { return $found.Source }
    return $null
}

if ($SelfTest) {
    Run-QASelfTest
    return
}
if ([string]::IsNullOrWhiteSpace($PdfPath)) {
    throw 'Provide -PdfPath pointing to the already generated windows-cyrillic.pdf'
}
$pdf = [IO.Path]::GetFullPath($PdfPath)
if (-not (Test-Path -LiteralPath $pdf -PathType Leaf)) { throw "PDF not found: $pdf" }
if ([string]::IsNullOrWhiteSpace($OutputDirectory)) {
    $suffix = '{0}-{1}' -f (Get-Date -Format 'yyyyMMdd-HHmmss'), [Guid]::NewGuid().ToString('N').Substring(0,8)
    $OutputDirectory = Join-Path (Split-Path -Parent $pdf) ('pdf-recheck-' + $suffix)
}
New-Item -ItemType Directory -Path $OutputDirectory -Force | Out-Null
$reportPath = Join-Path $OutputDirectory 'pdf-recheck.json'
$pdfBytes = [IO.File]::ReadAllBytes($pdf)
$pdfSha = (Get-FileHash -LiteralPath $pdf -Algorithm SHA256).Hash
$header = ($pdfBytes.Length -ge 5 -and [Text.Encoding]::ASCII.GetString($pdfBytes,0,5) -eq '%PDF-')
$startTail = [Math]::Max(0, $pdfBytes.Length - 2048)
$tail = [Text.Encoding]::ASCII.GetString($pdfBytes,$startTail,$pdfBytes.Length-$startTail)
$report = [ordered]@{
    schema = 'tikzarium.windows.cyrillic.postflight.v1'
    timestamp = (Get-Date -Format 'o')
    pdf = $pdf
    pdf_sha256 = $pdfSha
    pdf_bytes = $pdfBytes.Length
    pdf_header = $header
    pdf_eof = $tail.Contains('%%EOF')
    font_embedded_arial_to_unicode = $false
    checks = [ordered]@{}
    text_mode_pass = $null
    status = 'FAIL_UNVERIFIED'
}
try {
    if (-not $report.pdf_header -or -not $report.pdf_eof -or $pdfBytes.Length -lt 100) {
        throw 'PDF header/EOF/length check failed; original unchanged'
    }
    $pdffonts = Find-QAPoppler -Name 'pdffonts'
    $pdftotext = Find-QAPoppler -Name 'pdftotext'
    if (-not $pdffonts -or -not $pdftotext) {
        throw 'Private Poppler pdffonts or pdftotext missing; no installation attempted'
    }
    $fontReport = (& $pdffonts $pdf | Out-String)
    if ($LASTEXITCODE -ne 0) { throw "pdffonts failed: $LASTEXITCODE" }
    $fontReport | Set-Content -LiteralPath (Join-Path $OutputDirectory 'pdffonts.txt') -Encoding UTF8
    $fontRows = @($fontReport -split '\r?\n' | Where-Object {
        $_ -match 'Arial' -and $_ -match '\s+yes\s+(?:yes|no)\s+yes\s+\d+\s+\d+\s*$'
    })
    $report.font_embedded_arial_to_unicode = ($fontRows.Count -gt 0)
    foreach ($mode in @('standard','raw','layout')) {
        $path = Join-Path $OutputDirectory ('pdftotext-' + $mode + '.txt')
        $args = @()
        if ($mode -ne 'standard') { $args += '-' + $mode }
        $args += @('-enc','UTF-8',$pdf,$path)
        & $pdftotext @args
        $code = $LASTEXITCODE
        $entry = [ordered]@{
            exit_code = $code
            utf8_valid = $false
            byte_length = $null
            token_point = $false
            token_cyrillic = $false
            tokens_both = $false
            codepoints_first_70 = ''
        }
        if ($code -eq 0 -and (Test-Path -LiteralPath $path -PathType Leaf)) {
            $bytes = [IO.File]::ReadAllBytes($path)
            $entry.byte_length = $bytes.Length
            try {
                $decoded = Decode-QAUtf8 -Bytes $bytes
                $entry.utf8_valid = $true
                $found = Test-QARequiredText -Value $decoded
                $entry.token_point = $found.point
                $entry.token_cyrillic = $found.cyrillic
                $entry.tokens_both = $found.matches
                $entry.codepoints_first_70 = Get-QACodepointPreview -Value $decoded
                if ($found.matches -and $null -eq $report.text_mode_pass) {
                    $report.text_mode_pass = $mode
                }
            } catch {
                $entry['decode_error'] = $_.Exception.Message
            }
        }
        $report.checks[$mode] = $entry
    }
    if ($report.font_embedded_arial_to_unicode -and $null -ne $report.text_mode_pass) {
        $report.status = 'PASS_PDF_FONT_AND_CYRILLIC'
    }
} catch {
    $report['error'] = $_.Exception.Message
} finally {
    $report | ConvertTo-Json -Depth 7 | Set-Content -LiteralPath $reportPath -Encoding UTF8
    Write-Host "PDF QA report: $reportPath"
    Write-Host "Original PDF SHA256: $pdfSha"
    foreach ($mode in @('standard','raw','layout')) {
        if ($report.checks.Contains($mode)) {
            $rec = $report.checks[$mode]
            Write-Host ("{0}: UTF8={1}; Точка={2}; Кириллица={3}" -f $mode,$rec.utf8_valid,$rec.token_point,$rec.token_cyrillic)
        }
    }
}
if ($report.status -ne 'PASS_PDF_FONT_AND_CYRILLIC') {
    throw "PDF QA NOT_ACCEPTED. See diagnostic files in $OutputDirectory. Original PDF unchanged."
}
Write-Host "PDF_CYRILLIC_POSTFLIGHT_PASS via $($report.text_mode_pass); no reinstall, Cargo or XeLaTeX." -ForegroundColor Green
