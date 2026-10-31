# D06 CI-only private MiKTeX installation; never invoked by TikZarium on user hosts.
# All paths under runner.temp; registry/system PATH untouched. Fail closed.
$ErrorActionPreference = 'Stop'
$ProgressPreference = 'SilentlyContinue'
$hashExpected = '14b42dd9f4b4a7813a8bfd69c8f99316c2888cc4ee26f631f397e163d85d6c62'
$download = 'https://miktex.org/download/ctan/systems/win32/miktex/setup/windows-x64/basic-miktex-25.12-x64.exe'
$root = Join-Path $env:RUNNER_TEMP 'tikzarium-miktex-private'
$installer = Join-Path $root 'basic-miktex-25.12-x64.exe'
$userInstall = Join-Path $root 'install'
$userConfig = Join-Path $root 'config'
$userData = Join-Path $root 'data'
$recordDir = Join-Path (Get-Location) '.qa-artifacts/miktex-windows-server'
New-Item -ItemType Directory -Force -Path $root, $userInstall, $userConfig, $userData, $recordDir | Out-Null
# Even with --private / --no-registry, MiKTeX 25.12 may otherwise select
# runneradmin's Roaming profile for package writes. Scope ALL child processes
# to CI runner-temp roots; validate the *actual* root report before modifying.
$env:MIKTEX_USERINSTALL = $userInstall
$env:MIKTEX_USERCONFIG = $userConfig
$env:MIKTEX_USERDATA = $userData
# Persist a record even if the installer, config probe or package provision fails.
@{ schema_version = 1; stage = 'installer-start'; status = 'INCOMPLETE'; host = 'windows-2022'; physical_windows10 = 'NOT_RUN' } |
    ConvertTo-Json | Set-Content -LiteralPath (Join-Path $recordDir 'setup-stage.json') -Encoding utf8
. (Join-Path $PSScriptRoot 'qa_miktex_config.ps1')

Invoke-WebRequest -Uri $download -OutFile $installer -MaximumRedirection 10
$downloadedHash = (Get-FileHash -Path $installer -Algorithm SHA256).Hash.ToLowerInvariant()
if ($downloadedHash -ne $hashExpected) { throw "MiKTeX installer SHA-256 mismatch: $downloadedHash" }

# Official setupwiz switches: --private, --unattended, --no-registry, --user-*.
$argsInstall = @('--unattended','--private','--no-registry','--no-additional-roots',
    "--user-install=$userInstall", "--user-config=$userConfig", "--user-data=$userData")
$installerProcess = Start-Process -FilePath $installer -ArgumentList $argsInstall -Wait -PassThru -NoNewWindow
if ($installerProcess.ExitCode -ne 0) { throw "Private MiKTeX setup failed: exit $($installerProcess.ExitCode)" }

$miktexExe = Get-ChildItem -LiteralPath $userInstall -File -Recurse -Filter miktex.exe |
    Select-Object -First 1 -ExpandProperty FullName
$initexmf = Get-ChildItem -LiteralPath $userInstall -File -Recurse -Filter initexmf.exe |
    Select-Object -First 1 -ExpandProperty FullName
if (-not $miktexExe -or -not $initexmf) { throw 'Isolated MiKTeX utility executables missing' }
$bin = Split-Path -Parent $miktexExe
$env:PATH = "$bin;$env:PATH"
# An installer executable in runner-temp is NOT proof that the MiKTeX user
# package root is isolated. Do not write settings or install packages before
# validating UserInstall/UserConfig/UserData from a real initexmf --report.
$rootReport = (& $initexmf --report 2>&1 | Out-String)
$reportExitCode = $LASTEXITCODE
$rootReport | Set-Content -LiteralPath (Join-Path $recordDir 'texmf-roots-preflight.log') -Encoding utf8
$null = Assert-MiKTeXPrivateRoots -Report $rootReport -ExitCode $reportExitCode `
    -Install $userInstall -Config $userConfig -Data $userData
@{ schema_version = 1; stage = 'texmf-roots-verified'; status = 'INCOMPLETE'
   user_install = $userInstall; user_config = $userConfig; user_data = $userData } |
    ConvertTo-Json | Set-Content -LiteralPath (Join-Path $recordDir 'setup-stage.json') -Encoding utf8


# This setting belongs ONLY to the isolated private CI installation.
# An explicit packages install is allowed; a compile-time surprise install is not.
& $initexmf '--set-config-value=[MPM]AutoInstall=0'
if ($LASTEXITCODE -ne 0) { throw "Could not disable private MiKTeX auto-install ($LASTEXITCODE)" }
# MiKTeX 25.12 emits INFO lines and an elevated-runner warning around the
# standalone value 0. Compare ONLY the exact numeric output line, not the
# entire diagnostic transcript; fail on duplicate/ambiguous numeric lines.
$configTranscript = (& $initexmf '--show-config-value=[MPM]AutoInstall' 2>&1 | Out-String)
$configExitCode = $LASTEXITCODE
$configValue = Assert-MiKTeXAutoInstallDisabled -Transcript $configTranscript -ExitCode $configExitCode
@{ schema_version = 1; stage = 'autoinstall-off-verified'; status = 'INCOMPLETE'; config_readback = $configValue; installer_sha256 = $downloadedHash } |
    ConvertTo-Json | Set-Content -LiteralPath (Join-Path $recordDir 'setup-stage.json') -Encoding utf8

# Explicitly resolve the declared fixture dependencies; no engine auto-installs.
# IDs are official MiKTeX package names, not TeX Live tlmgr names.
# The pinned 25.12 basic installer rejected an official XeTeX package ID
# as unknown in hosted CI run 41188398041. Refresh ONLY the isolated private
# package index before explicitly installing packages. Never alter a user's
# MiKTeX installation or enable auto-install during document compilation.
# https://docs.miktex.org/manual/miktex-packages.html
$refreshTranscript = (& $miktexExe packages update-package-database 2>&1 | Out-String)
$refreshExitCode = $LASTEXITCODE
$refreshTranscript | Set-Content -LiteralPath (Join-Path $recordDir 'package-db-refresh.log') -Encoding utf8
if ($refreshExitCode -ne 0) { throw "MiKTeX private package index refresh failed ($refreshExitCode)" }
@{ schema_version = 1; stage = 'private-package-index-refreshed'
   status = 'INCOMPLETE'; config_readback = $configValue; installer_sha256 = $downloadedHash } |
    ConvertTo-Json | Set-Content -LiteralPath (Join-Path $recordDir 'setup-stage.json') -Encoding utf8

$packages = @('miktex-xetex-bin-x64-2.9','xetex','pgf','standalone',
              'fontspec','unicode-math','lm-math','lm','dejavu')
# Require the exact official IDs to be available in the refreshed index.
# Retain the metadata transcript on failure; an unknown ID must fail closed.
$metadataPath = Join-Path $recordDir 'package-metadata-before-install.txt'
New-Item -ItemType File -Force -Path $metadataPath | Out-Null
$missingPackages = @()
foreach ($package in $packages) {
    $rawInfo = (& $miktexExe packages info --template '{id}|{version}|{timePackaged}|{isInstalled}' $package 2>&1 | Out-String)
    $lookupExitCode = $LASTEXITCODE
    "$package => $($rawInfo.Trim())" | Out-File -FilePath $metadataPath -Append -Encoding utf8
    $matchesId = @($rawInfo -split '(?:\r\n|\r|\n)' |
        Where-Object { $_ -match ('^' + [regex]::Escape($package) + '\|') })
    if ($lookupExitCode -ne 0 -or $matchesId.Count -ne 1) {
        throw "MiKTeX refreshed index missing/ambiguous official package $package (exit $lookupExitCode)"
    }
    $fields = @($matchesId[0].Trim() -split '\|', 4)
    if ($fields.Count -ne 4 -or $fields[0] -cne $package -or
        $fields[3] -cnotin @('true','false')) {
        throw "MiKTeX package $package has malformed installation metadata"
    }
    if ($fields[3] -ceq 'false') { $missingPackages += $package }
}
# The Basic 25.12 installer may contain XeTeX binaries already. Installing a
# present package is a MiKTeX ERROR, not an idempotent no-op. Explicitly
# install ONLY verified missing dependencies; never infer missing from a failed
# install command and never enable automatic installs during compilation.
@{ schema_version = 1; stage = 'package-metadata-validated'; status = 'INCOMPLETE'
   missing_packages = $missingPackages; installed_by_basic = @($packages | Where-Object { $_ -notin $missingPackages }) } |
    ConvertTo-Json -Depth 5 | Set-Content -LiteralPath (Join-Path $recordDir 'setup-stage.json') -Encoding utf8
if ($missingPackages.Count -gt 0) {
    & $miktexExe packages install @missingPackages
    if ($LASTEXITCODE -ne 0) { throw "MiKTeX explicit package provisioning failed ($LASTEXITCODE)" }
} else {
    Write-Host 'All declared MiKTeX dependencies already installed by the private basic distribution'
}
# Assert that provisioning and any MiKTeX maintenance still use the same
# isolated TEXMF roots; a successful package exit is not enough.
$rootReportPost = (& $initexmf --report 2>&1 | Out-String)
$rootReportPostExitCode = $LASTEXITCODE
$rootReportPost | Set-Content -LiteralPath (Join-Path $recordDir 'texmf-roots-post-provision.log') -Encoding utf8
$null = Assert-MiKTeXPrivateRoots -Report $rootReportPost -ExitCode $rootReportPostExitCode `
    -Install $userInstall -Config $userConfig -Data $userData
$packageVersionFile = Join-Path $recordDir 'explicit-package-versions.txt'
foreach ($package in $packages) {
    $info = (& $miktexExe packages info --template '{id}|{version}|{timePackaged}|{isInstalled}' $package 2>&1 | Out-String).Trim()
    if ($LASTEXITCODE -ne 0) { throw "Cannot inspect installed package version for $package" }
    "$package => $info" | Out-File -FilePath $packageVersionFile -Append -Encoding utf8
}

$xelatex = Get-ChildItem -LiteralPath $userInstall -File -Recurse -Filter xelatex.exe |
    Select-Object -First 1 -ExpandProperty FullName
if (-not $xelatex) { throw 'Private MiKTeX xelatex.exe missing after explicit provisioning' }
$version = (& $xelatex --version 2>&1 | Select-Object -First 4) -join "\n"
if ($LASTEXITCODE -ne 0 -or $version -notmatch '(?i)MiKTeX') {
    throw "Not verified as MiKTeX XeLaTeX: $version"
}

# PATH for next steps is temporary job-local; the user-installed TeX is untouched.
$bin | Out-File -FilePath $env:GITHUB_PATH -Append -Encoding utf8
"MIKTEX_USERINSTALL=$userInstall" | Out-File -FilePath $env:GITHUB_ENV -Append -Encoding utf8
"MIKTEX_USERCONFIG=$userConfig" | Out-File -FilePath $env:GITHUB_ENV -Append -Encoding utf8
"MIKTEX_USERDATA=$userData" | Out-File -FilePath $env:GITHUB_ENV -Append -Encoding utf8
"TIKZARIUM_XELATEX=$xelatex" | Out-File -FilePath $env:GITHUB_ENV -Append -Encoding utf8
"TIKZARIUM_MIKTEX_EXE=$miktexExe" | Out-File -FilePath $env:GITHUB_ENV -Append -Encoding utf8
"TIKZARIUM_MIKTEX_PREFIX=$userInstall" | Out-File -FilePath $env:GITHUB_ENV -Append -Encoding utf8
$setupRecord = @{
    schema_version = 1; installer_url = $download; installer_sha256 = $downloadedHash
    installer_flags = $argsInstall; private_install = $true; no_registry = $true
    auto_install_disabled = $true; auto_install_config_readback = $configValue; explicit_packages = $packages
    user_install = $userInstall; user_config = $userConfig; user_data = $userData
    xelatex_path = $xelatex; xelatex_version = $version
    ci_host = 'windows-2022'; target_windows10 = 'NOT_RUN'; physical_mac_arm = 'NOT_RUN'
}
$setupRecord | ConvertTo-Json -Depth 5 | Out-File -FilePath (Join-Path $recordDir 'setup.json') -Encoding utf8
Write-Host "MiKTeX private XeLaTeX: $xelatex"
