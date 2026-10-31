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

# This setting belongs ONLY to the isolated private CI installation.
# An explicit packages install is allowed; a compile-time surprise install is not.
& $initexmf '--set-config-value=[MPM]AutoInstall=0'
if ($LASTEXITCODE -ne 0) { throw "Could not disable private MiKTeX auto-install ($LASTEXITCODE)" }
$configValue = (& $initexmf '--show-config-value=[MPM]AutoInstall' 2>&1 | Out-String).Trim()
if ($LASTEXITCODE -ne 0 -or $configValue -ne '0') {
    throw "Private MiKTeX AutoInstall config was not verified off: $configValue"
}

# Explicitly resolve the declared fixture dependencies; no engine auto-installs.
# IDs are official MiKTeX package names, not TeX Live tlmgr names.
$packages = @('miktex-xetex-bin-x64-2.9','xetex','pgf','standalone',
              'fontspec','unicode-math','lm-math','lm','dejavu')
& $miktexExe packages install @packages
if ($LASTEXITCODE -ne 0) { throw "MiKTeX explicit package provisioning failed ($LASTEXITCODE)" }
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
