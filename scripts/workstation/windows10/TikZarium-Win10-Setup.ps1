# TikZarium Windows 10 Pro 22H2 x64 workstation setup (also Windows 11 Pro), 2026-11-09.
# Win10 19045 is the primary physical release QA target; do not require Windows 11.
# V4 direct official installers with pinned SHA256; winget is NOT required.
# Machine is admin-only; User is non-admin tikzarium-qa; CurrentUser runs per-user setup in any existing non-elevated interactive profile (including Admin with a filtered medium token).
# Does NOT modify UAC, RDP/firewall policies, Windows Server, existing runners, drivers, or services.
[CmdletBinding()]
param(
    [ValidateSet('Machine', 'User', 'CurrentUser', 'Check')]
    [string]$Phase = 'Machine',
    [ValidatePattern('^[A-Za-z][A-Za-z0-9_-]{2,19}$')]
    [string]$QaUser = 'tikzarium-qa',
    [switch]$WithNode,
    [switch]$SkipBuild,
    [switch]$SkipTexProvision
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
$ProgressPreference = 'SilentlyContinue'
$RepoUrl = 'https://github.com/i-shutov/tikzarium.git'
$Staging = 'C:\ProgramData\TikZariumSetup'
$ScriptName = 'TikZarium-Win10-Setup.ps1'
$script:TranscriptRunning = $false
$script:SourceScriptPath = $PSCommandPath
$script:RestartRecommended = $false

function Say([string]$Message) {
    Write-Host ('[{0}] {1}' -f (Get-Date -Format 'HH:mm:ss'), $Message) -ForegroundColor Cyan
}
function Assert-NativeExit([string]$Operation, [int[]]$SuccessCodes = @(0)) {
    $code = $LASTEXITCODE
    if ($SuccessCodes -notcontains $code) {
        throw ('{0} failed with exit code {1}' -f $Operation, $code)
    }
}
function Refresh-Path {
    $userPath = [Environment]::GetEnvironmentVariable('Path', 'User')
    $machinePath = [Environment]::GetEnvironmentVariable('Path', 'Machine')
    $env:Path = "$machinePath;$userPath;$env:USERPROFILE\.cargo\bin"
}
function Get-CommandPath([string]$Name) {
    $cmd = Get-Command $Name -ErrorAction SilentlyContinue | Select-Object -First 1
    if ($null -eq $cmd) { return $null }
    return $cmd.Source
}
# No Microsoft Store / winget dependency. All external binaries are from
# official vendor download endpoints; verify SHA256 where published.
function Require-PinnedDownload {
    param([Parameter(Mandatory)][string]$Url,
          [Parameter(Mandatory)][string]$Destination,
          [Parameter(Mandatory)][string]$Sha256)
    $parent = Split-Path -Parent $Destination
    New-Item -ItemType Directory -Path $parent -Force | Out-Null
    if (Test-Path -LiteralPath $Destination) {
        $old = (Get-FileHash -LiteralPath $Destination -Algorithm SHA256).Hash.ToLowerInvariant()
        if ($old -ceq $Sha256.ToLowerInvariant()) {
            Say "Reuse verified archive: $Destination"
            return $Destination
        }
        throw "Existing download has wrong SHA256: $Destination. Inspect/remove it before retry."
    }
    Say "Downloading official distribution: $Url"
    try {
        [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
        Invoke-WebRequest -Uri $Url -OutFile $Destination -UseBasicParsing -ErrorAction Stop
        $actual = (Get-FileHash -LiteralPath $Destination -Algorithm SHA256).Hash.ToLowerInvariant()
        if ($actual -cne $Sha256.ToLowerInvariant()) {
            Remove-Item -LiteralPath $Destination -Force
            throw "Hash mismatch on download: expected $Sha256, actual $actual"
        }
    } catch {
        if (Test-Path -LiteralPath $Destination) { Remove-Item -LiteralPath $Destination -Force }
        throw
    }
    Say "SHA256 VERIFIED: $Destination"
    return $Destination
}
function Download-SignedMicrosoftBootstrapper {
    param([string]$Url, [string]$Destination)
    New-Item -ItemType Directory -Path (Split-Path -Parent $Destination) -Force | Out-Null
    # VS bootstrap URL is a vendor-maintained mutable redirect, so unlike the
    # pinned assets, verify Authenticode and explicitly validate the signer.
    if (Test-Path -LiteralPath $Destination) { Remove-Item -LiteralPath $Destination -Force }
    [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
    Invoke-WebRequest -Uri $Url -OutFile $Destination -UseBasicParsing -ErrorAction Stop
    $sig = Get-AuthenticodeSignature -LiteralPath $Destination
    if ($sig.Status -ne 'Valid' -or -not $sig.SignerCertificate -or
        $sig.SignerCertificate.Subject -notmatch 'Microsoft') {
        Remove-Item -LiteralPath $Destination -Force
        throw 'Visual Studio installer has no valid Microsoft Authenticode signature.'
    }
    Say 'Verified Microsoft Authenticode signature on VS Build Tools bootstrapper.'
    return $Destination
}
function Run-ExeInstaller {
    param([Parameter(Mandatory)][string]$Exe,
          [Parameter(Mandatory)][string]$Arguments,
          [string]$Name = 'installer')
    Say "Starting $Name"
    $p = Start-Process -FilePath $Exe -ArgumentList $Arguments -Wait -PassThru
    if (@(0,3010) -notcontains $p.ExitCode) {
        throw "$Name failed with exit code $($p.ExitCode)"
    }
    if ($p.ExitCode -eq 3010) { $script:RestartRecommended = $true }
}
function Ensure-Git {
    Refresh-Path
    $candidates = @('C:\Program Files\Git\cmd\git.exe',
                    'C:\Program Files (x86)\Git\cmd\git.exe')
    foreach ($candidate in $candidates) {
        if (Test-Path -LiteralPath $candidate) {
            Say "Git already installed: $candidate"
            return
        }
    }
    $found = Get-CommandPath 'git.exe'
    if ($found) { Say "Git already installed: $found"; return }
    $url = 'https://github.com/git-for-windows/git/releases/download/v2.56.0.windows.1/Git-2.56.0-64-bit.exe'
    $sha = 'bfe94e7b419b16eee9fecbd1253a98e3d4f49ba8f029630549052278ffe286a6'
    $exe = Require-PinnedDownload -Url $url -Destination (Join-Path $Staging 'downloads\Git-2.56.0-64-bit.exe') -Sha256 $sha
    Run-ExeInstaller -Exe $exe -Arguments '/VERYSILENT /NORESTART /NOCANCEL /SP-' -Name 'Git for Windows 2.56.0'
    if (-not (Test-Path 'C:\Program Files\Git\cmd\git.exe')) {
        throw 'Git installer returned success but git.exe was not found.'
    }
}
function Ensure-VCRedist {
    $key = 'HKLM:\SOFTWARE\Microsoft\VisualStudio\14.0\VC\Runtimes\x64'
    $state = Get-ItemProperty -Path $key -ErrorAction SilentlyContinue
    if ($state -and $state.Installed -eq 1) { Say 'Existing x64 Visual C++ runtime detected'; return }
    $exe = Download-SignedMicrosoftBootstrapper `
        -Url 'https://aka.ms/vs/17/release/vc_redist.x64.exe' `
        -Destination (Join-Path $Staging 'downloads\vc_redist.x64.exe')
    Run-ExeInstaller -Exe $exe -Arguments '/install /quiet /norestart' -Name 'Microsoft VC++ x64 runtime'
}
function Ensure-Rustup {
    $cargoDir = Join-Path $env:USERPROFILE '.cargo\bin'
    $rustup = Join-Path $cargoDir 'rustup.exe'
    if (Test-Path -LiteralPath $rustup) { Say "Rustup already installed: $rustup"; return $rustup }
    $url = 'https://static.rust-lang.org/rustup/archive/1.29.3/x86_64-pc-windows-msvc/rustup-init.exe'
    $sha = '38027d51d69a5d05493627a0634dbea52d6cd793c8f072d2373d3f4163eec7db'
    $exe = Require-PinnedDownload -Url $url -Destination (Join-Path $env:TEMP 'tikzarium-rustup-1.29.3\rustup-init.exe') -Sha256 $sha
    # Install rustup only; the next stage explicitly installs pinned Rust 1.91.0.
    & $exe -y --default-host 'x86_64-pc-windows-msvc' --default-toolchain 'none' --profile 'minimal' --no-modify-path
    Assert-NativeExit 'rustup-init'
    if (-not (Test-Path -LiteralPath $rustup)) { throw 'rustup-init succeeded but rustup.exe is missing' }
    return $rustup
}
function Ensure-PrivateMiKTeX {
    $existing = Get-Xelatex
    if ($existing) { Say "Existing XeLaTeX found: $existing"; return $existing }
    $url = 'https://miktex.org/download/ctan/systems/win32/miktex/setup/windows-x64/basic-miktex-25.12-x64.exe'
    $sha = '14b42dd9f4b4a7813a8bfd69c8f99316c2888cc4ee26f631f397e163d85d6c62'
    $exe = Require-PinnedDownload -Url $url -Destination (Join-Path $env:TEMP 'tikzarium-basic-miktex-25.12-x64.exe') -Sha256 $sha
    $installPath = Join-Path $env:LOCALAPPDATA 'Programs\MiKTeX'
    Run-ExeInstaller -Exe $exe -Arguments ('--private --unattended --user-install="' + $installPath + '"') -Name 'private MiKTeX'
    $existing = Get-Xelatex
    if (-not $existing) { throw 'MiKTeX installer completed but xelatex.exe was not found.' }
    return $existing
}
function Ensure-Poppler {
    $target = Join-Path $env:LOCALAPPDATA 'Programs\TikZariumPoppler'
    $bin = Join-Path $target 'poppler-25.07.0\Library\bin'
    if ((Test-Path -LiteralPath (Join-Path $bin 'pdffonts.exe')) -and
        (Test-Path -LiteralPath (Join-Path $bin 'pdftotext.exe'))) {
        Say "Poppler already extracted at $bin"
        $userPath = [Environment]::GetEnvironmentVariable('Path', 'User')
        if ((@($userPath -split ';') -notcontains $bin)) {
            [Environment]::SetEnvironmentVariable('Path', "$userPath;$bin", 'User')
        }
        $env:Path = "$bin;$env:Path"
        return
    }
    $url = 'https://github.com/oschwartz10612/poppler-windows/releases/download/v25.07.0-0/Release-25.07.0-0.zip'
    $sha = '435e6265738470b7ae6498b8a298a4025bacb9349656207ef54d0f069687ce57'
    $zip = Require-PinnedDownload -Url $url -Destination (Join-Path $env:TEMP 'tikzarium-poppler-25.07.0-0.zip') -Sha256 $sha
    New-Item -ItemType Directory -Path $target -Force | Out-Null
    Expand-Archive -LiteralPath $zip -DestinationPath $target -Force
    if (-not (Test-Path -LiteralPath (Join-Path $bin 'pdffonts.exe'))) {
        throw "Poppler binaries not found in verified archive extraction: $bin"
    }
    # Persistent user-scoped PATH for the GUI after a fresh RDP sign-in.
    $userPath = [Environment]::GetEnvironmentVariable('Path', 'User')
    if ((@($userPath -split ';') -notcontains $bin)) {
        [Environment]::SetEnvironmentVariable('Path', "$userPath;$bin", 'User')
    }
    $env:Path = "$bin;$env:Path"
    Say "Poppler QA PDF utilities ready: $bin"
}
function ConvertTo-MiKTeXInstalledState {
    param([Parameter(Mandatory)][string]$RawStatus,
          [Parameter(Mandatory)][string]$PackageId)
    $state = $RawStatus.Trim().ToLowerInvariant()
    if ($state -ceq 'true') { return $true }
    if ($state -ceq 'false') { return $false }
    throw "Unexpected MiKTeX isInstalled status for $($PackageId): '$RawStatus' (expected true or false)"
}
function Test-MiKTeXPackageInstalled {
    param([Parameter(Mandatory)][string]$ManagerPath,
          [Parameter(Mandatory)][string]$PackageId)
    $rawStatus = & $ManagerPath --disable-installer packages info --template '{isInstalled}' $PackageId
    Assert-NativeExit "MiKTeX package info $PackageId"
    return (ConvertTo-MiKTeXInstalledState -RawStatus ($rawStatus | Out-String) -PackageId $PackageId)
}
function Ensure-RequiredMiKTeXPackages {
    param([Parameter(Mandatory)][string]$ManagerPath)
    $required = @('pgf', 'standalone', 'fontspec', 'xcolor', 'unicode-math')
    $missing = @()
    foreach ($id in $required) {
        if (Test-MiKTeXPackageInstalled -ManagerPath $ManagerPath -PackageId $id) {
            Say "MiKTeX ALREADY INSTALLED: $id"
        } else {
            $missing += $id
        }
    }
    if ($missing.Count -eq 0) {
        Say 'All 5 required MiKTeX packages already installed; no downloads/install needed.'
        return
    }
    Say ("Explicit MiKTeX provisioning ONLY missing packages: " + ($missing -join ', '))
    & $ManagerPath --enable-installer packages update-package-database
    Assert-NativeExit 'MiKTeX update package DB'
    foreach ($id in $missing) {
        if (Test-MiKTeXPackageInstalled -ManagerPath $ManagerPath -PackageId $id) {
            Say "MiKTeX dependency already installed: $id"
            continue
        }
        Say "MiKTeX INSTALL: $id"
        & $ManagerPath --enable-installer packages install $id
        Assert-NativeExit "MiKTeX install $id"
        if (-not (Test-MiKTeXPackageInstalled -ManagerPath $ManagerPath -PackageId $id)) {
            throw "MiKTeX still reports package not installed after provisioning: $id"
        }
    }
    foreach ($id in $required) {
        if (-not (Test-MiKTeXPackageInstalled -ManagerPath $ManagerPath -PackageId $id)) {
            throw "MiKTeX required package absent after provisioning: $id"
        }
    }
    Say 'MiKTeX explicit provisioning PASS: all five packages installed.'
}

function Start-SetupTranscript([string]$Path) {
    $parent = Split-Path -Parent $Path
    New-Item -ItemType Directory -Path $parent -Force | Out-Null
    try {
        Start-Transcript -Path $Path -Append | Out-Null
        $script:TranscriptRunning = $true
    } catch {
        Write-Warning "Cannot start transcript: $($_.Exception.Message)"
    }
}
function Get-OsInfo {
    # Local Codex sandbox can deny WMI. Read-only registry fallback is supported;
    # never change ACLs, services or WMI permissions to make QA work.
    $os = $null
    try {
        $os = Get-CimInstance -ClassName Win32_OperatingSystem -ErrorAction Stop
    } catch {
        Say ('WMI/CIM unavailable; read-only Windows CurrentVersion registry fallback: ' + $_.Exception.Message)
    }
    if ($null -eq $os) {
        $cv = Get-ItemProperty -LiteralPath 'HKLM:\SOFTWARE\Microsoft\Windows NT\CurrentVersion' -ErrorAction Stop
        $buildStr = if ($cv.CurrentBuildNumber) { [string]$cv.CurrentBuildNumber } else { [string]$cv.CurrentBuild }
        if (-not $buildStr -or $buildStr -notmatch '^\d+$') {
            throw 'Windows build could not be established through CIM or registry'
        }
        $caption = [string]$cv.ProductName
        if ([string]::IsNullOrWhiteSpace($caption)) { throw 'Windows edition unavailable through registry' }
        $os = [pscustomobject]@{
            Caption = $caption
            BuildNumber = $buildStr
            ProductType = if ($caption -match 'Windows Server') { 3 } else { 1 }
            OSArchitecture = if ([Environment]::Is64BitOperatingSystem) { '64-bit' } else { '32-bit' }
            TotalVisibleMemorySize = $null
        }
    }
    $build = [int]$os.BuildNumber
    $isWorkstation = ([int]$os.ProductType -eq 1)
    $isWin10 = ($build -ge 19045 -and $build -lt 22000)
    $isWin11 = ($build -ge 22000)
    $is64 = ([Environment]::Is64BitOperatingSystem)
    if (-not $isWorkstation -or -not $is64 -or -not ($isWin10 -or $isWin11)) {
        throw "Requires a 64-bit Windows workstation: Windows 10 22H2 build 19045+ or Windows 11. Found $($os.Caption), build $($os.BuildNumber), ProductType=$($os.ProductType), $($os.OSArchitecture). Windows Server is excluded."
    }
    if ($isWin10) {
        Say "Windows 10 x64 build $($build): SUPPORTED, primary target for TikZarium physical release QA."
    } else {
        Say "Windows 11 x64 build $($build): SUPPORTED, extra compatibility target."
    }
    $script:OsInfo = $os
    return $os
}
function Get-MsvcInfo {
    $vswhere = Join-Path ${env:ProgramFiles(x86)} 'Microsoft Visual Studio\Installer\vswhere.exe'
    if (-not (Test-Path -LiteralPath $vswhere)) { return $null }
    $installed = & $vswhere -latest -products '*' -requires Microsoft.VisualStudio.Component.VC.Tools.x86.x64 -property installationPath
    if ($LASTEXITCODE -ne 0 -or -not $installed) { return $null }
    return ($installed | Select-Object -First 1)
}
function Get-AnyVsInstancePath {
    $vswhere = Join-Path ${env:ProgramFiles(x86)} 'Microsoft Visual Studio\Installer\vswhere.exe'
    if (-not (Test-Path -LiteralPath $vswhere)) { return $null }
    $found = & $vswhere -latest -products '*' -property installationPath
    if ($LASTEXITCODE -ne 0 -or -not $found) { return $null }
    return ($found | Select-Object -First 1)
}
function Test-WindowsSdkX64 {
    $kits = Get-ItemProperty 'HKLM:\SOFTWARE\Microsoft\Windows Kits\Installed Roots' -ErrorAction SilentlyContinue
    if (-not $kits -or -not $kits.KitsRoot10) { return $false }
    $lib = Join-Path $kits.KitsRoot10 'Lib'
    if (-not (Test-Path -LiteralPath $lib)) { return $false }
    $files = @(Get-ChildItem -LiteralPath $lib -Filter 'kernel32.lib' -Recurse -ErrorAction SilentlyContinue |
              Where-Object { $_.FullName -like '*\um\x64\kernel32.lib' })
    return ($files.Count -gt 0)
}
function Ensure-MsvcSdk {
    if ((Get-MsvcInfo) -and (Test-WindowsSdkX64)) {
        Say 'Already have MSVC C++ x64 and Windows SDK; no Visual Studio changes.'
        return
    }
    $anyVs = Get-AnyVsInstancePath
    if ($anyVs) {
        # A pre-existing Visual Studio / Build Tools instance may lack the C++ workload.
        # Modify the existing VS instance explicitly; never assume it contains C++ tools.
        $installer = Join-Path ${env:ProgramFiles(x86)} 'Microsoft Visual Studio\Installer\setup.exe'
        if (-not (Test-Path -LiteralPath $installer)) {
            throw "Existing Visual Studio lacks MSVC/SDK; setup.exe not found at $installer"
        }
        Say "Adding C++ Desktop workload and SDK to existing Visual Studio: $anyVs"
        $args = @('modify', '--installPath', ('"' + $anyVs + '"'),
                  '--add', 'Microsoft.VisualStudio.Workload.VCTools',
                  '--includeRecommended', '--quiet', '--norestart')
        $p = Start-Process -FilePath $installer -ArgumentList $args -Wait -PassThru
        if (@(0,3010) -notcontains $p.ExitCode) { throw "Visual Studio modify failed: exit $($p.ExitCode)" }
        if ($p.ExitCode -eq 3010) { $script:RestartRecommended = $true }
    } else {
        $bootstrapper = Download-SignedMicrosoftBootstrapper `
            -Url 'https://aka.ms/vs/17/release/vs_BuildTools.exe' `
            -Destination (Join-Path $Staging 'downloads\vs_BuildTools.exe')
        Run-ExeInstaller -Exe $bootstrapper -Arguments '--quiet --wait --norestart --add Microsoft.VisualStudio.Workload.VCTools --includeRecommended' -Name 'Visual Studio 2022 Build Tools'
    }
    Check-MsvcSdk
}
function Check-MsvcSdk {
    $vs = Get-MsvcInfo
    $hasSdk = Test-WindowsSdkX64
    Say ('MSVC={0}; Windows SDK x64 libs={1}' -f $vs, $hasSdk)
    if (-not $vs -or -not $hasSdk) {
        throw 'MSVC x64 and/or Windows SDK missing after install. Review the Visual Studio Installer logs and the Desktop development with C++ workload; then rerun Machine.'
    }
}
function Get-Xelatex {
    Refresh-Path
    $cmd = Get-CommandPath 'xelatex.exe'
    if ($cmd) { return $cmd }
    $candidates = @(
        (Join-Path $env:LOCALAPPDATA 'Programs\MiKTeX\miktex\bin\x64\xelatex.exe'),
        (Join-Path $env:APPDATA 'MiKTeX\miktex\bin\x64\xelatex.exe'),
        (Join-Path $env:ProgramFiles 'MiKTeX\miktex\bin\x64\xelatex.exe'),
        (Join-Path ${env:ProgramFiles(x86)} 'MiKTeX\miktex\bin\x64\xelatex.exe')
    )
    foreach ($candidate in $candidates) {
        if (Test-Path -LiteralPath $candidate) {
            $env:Path = "$(Split-Path -Parent $candidate);$env:Path"
            return $candidate
        }
    }
    return $null
}
function Get-CurrentInfo {
    $os = Get-OsInfo
    $ident = [Security.Principal.WindowsIdentity]::GetCurrent()
    $principal = New-Object Security.Principal.WindowsPrincipal($ident)
    $ram = if ($null -ne $os.TotalVisibleMemorySize -and $os.TotalVisibleMemorySize -gt 0) { ([math]::Round(($os.TotalVisibleMemorySize / 1048576), 2)).ToString() + ' GiB' } else { 'UNKNOWN_NO_WMI' }
    Say "OS: $($os.Caption); build: $($os.BuildNumber); RAM: $ram"
    Say "User: $($ident.Name); elevated: $($principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator))"
    return $principal
}
function Setup-Machine {
    $principal = Get-CurrentInfo
    if (-not $principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)) {
        throw 'Phase Machine must be run from an elevated Windows PowerShell on this Windows 10/11 workstation.'
    }
    New-Item -ItemType Directory -Path $Staging -Force | Out-Null
    Start-SetupTranscript (Join-Path $Staging ('machine-{0}.log' -f (Get-Date -Format 'yyyyMMdd-HHmmss')))
    $self = $script:SourceScriptPath
    if (-not $self) { throw 'Run the script from a .ps1 file, not pasted interactively.' }
    $target = Join-Path $Staging $ScriptName
    if ([IO.Path]::GetFullPath($self) -ine [IO.Path]::GetFullPath($target)) {
        Copy-Item -LiteralPath $self -Destination $target -Force
    }
    # Restrict script tampering: Users can read/execute, only SYSTEM/Admins can write.
    & icacls.exe $Staging '/inheritance:r' '/grant:r' '*S-1-5-18:(OI)(CI)F' '*S-1-5-32-544:(OI)(CI)F' '*S-1-5-32-545:(OI)(CI)RX' | Out-Host
    Assert-NativeExit 'icacls'
    & icacls.exe $target '/reset' | Out-Host
    Assert-NativeExit 'icacls script'

    $user = Get-LocalUser -Name $QaUser -ErrorAction SilentlyContinue
    if (-not $user) {
        Say "Create local standard user: $QaUser"
        $password = Read-Host "Enter a NEW password for $QaUser (not shown)" -AsSecureString
        if ($password.Length -lt 1) { throw 'Empty password refused.' }
        New-LocalUser -Name $QaUser -Password $password -FullName 'TikZarium QA' -Description 'Non-admin interactive TikZarium QA account' | Out-Null
    } else {
        if (-not $user.Enabled) { throw "User $QaUser exists but is disabled; refusing to change account state." }
        Say "User $QaUser already exists; password left untouched"
    }
    $admins = Get-LocalGroup -SID 'S-1-5-32-544'
    $remoteUsers = Get-LocalGroup -SID 'S-1-5-32-555'
    $members = @(Get-LocalGroupMember -Group $admins.Name)
    if (@($members | Where-Object { $_.Name -ieq "$env:COMPUTERNAME\$QaUser" }).Count -gt 0) {
        throw "Account $QaUser belongs to Administrators. Refusing to treat it as non-admin."
    }
    $rdpMembers = @(Get-LocalGroupMember -Group $remoteUsers.Name)
    if (@($rdpMembers | Where-Object { $_.Name -ieq "$env:COMPUTERNAME\$QaUser" }).Count -eq 0) {
        Add-LocalGroupMember -Group $remoteUsers.Name -Member $QaUser
        Say "Added $QaUser to existing Remote Desktop Users group; no RDP policy change"
    }
    # Only the W3 essentials. No Store, winget, Python, Node or global policy changes.
    if ($WithNode) { Write-Warning 'WithNode is not supported by direct core bootstrap; install Node separately after W3 QA.' }
    Ensure-Git
    Ensure-MsvcSdk
    Ensure-VCRedist
    if ($script:RestartRecommended) { Write-Warning 'One or more installers requested a REBOOT (3010). Restart Windows before phase User.' }
    Say 'Machine phase complete. QA user: -Phase User. Existing medium-token Admin profile: -Phase CurrentUser (without elevated PowerShell).'
    Say "User phase command: powershell.exe -NoProfile -ExecutionPolicy Bypass -File `"$target`" -Phase User"
}
function Setup-User {
    param([switch]$UseCurrentProfile)
    $principal = Get-CurrentInfo
    $currentName = [Security.Principal.WindowsIdentity]::GetCurrent().Name
    if (-not $UseCurrentProfile -and -not $currentName.EndsWith("\$QaUser", [StringComparison]::OrdinalIgnoreCase)) {
        throw "Phase User must run while logged on as .\$QaUser, current: $currentName"
    }
    if ($principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)) {
        throw 'User and CurrentUser setup must be launched with a non-elevated (medium integrity) token; an Administrator account is allowed without elevation.'
    }
    if ($UseCurrentProfile) {
        Say "CurrentUser selected: existing $currentName profile. No new account, UAC change or Machine phase."
    }
    $qaRoot = Join-Path $env:USERPROFILE 'Documents\TikZarium-QA'
    $evidence = Join-Path $qaRoot ('evidence\{0}' -f (Get-Date -Format 'yyyyMMdd-HHmmss'))
    New-Item -ItemType Directory -Path $evidence -Force | Out-Null
    Start-SetupTranscript (Join-Path $evidence 'setup-transcript.txt')
    Say "Evidence directory: $evidence"
    Ensure-Rustup | Out-Null
    Ensure-PrivateMiKTeX | Out-Null
    Ensure-Poppler
    Refresh-Path
    # Refresh-Path reconstructs PATH; prepend pinned portable QA utilities again.
    $popplerBin = Join-Path $env:LOCALAPPDATA 'Programs\TikZariumPoppler\poppler-25.07.0\Library\bin'
    if (Test-Path -LiteralPath $popplerBin) { $env:Path = "$popplerBin;$env:Path" }

    $rustup = Join-Path $env:USERPROFILE '.cargo\bin\rustup.exe'
    if (-not (Test-Path -LiteralPath $rustup)) {
        $rustup = Get-CommandPath 'rustup.exe'
    }
    if (-not $rustup) { throw 'rustup not found after install. Reopen non-elevated PowerShell and rerun -Phase User.' }
    & $rustup set default-host 'x86_64-pc-windows-msvc'
    Assert-NativeExit 'rustup host'
    & $rustup toolchain install '1.91.0-x86_64-pc-windows-msvc' --profile minimal --component rustfmt --component clippy
    Assert-NativeExit 'Rust 1.91.0 install'
    & $rustup default '1.91.0-x86_64-pc-windows-msvc'
    Assert-NativeExit 'Rust default'
    Refresh-Path

    $xelatex = Get-Xelatex
    if (-not $xelatex) {
        throw 'MiKTeX xelatex.exe not found. Start MiKTeX Console as this user and complete first-run setup, then rerun -Phase User.'
    }
    $miktex = Join-Path (Split-Path -Parent $xelatex) 'miktex.exe'
    if (-not (Test-Path -LiteralPath $miktex)) { throw "MiKTeX package manager not found at $miktex" }
    & $xelatex --version | Out-Host
    Assert-NativeExit 'xelatex --version'
    if (-not $SkipTexProvision) {
        Ensure-RequiredMiKTeXPackages -ManagerPath $miktex
    } else {
        Say 'Skipping explicit MiKTeX package provisioning (-SkipTexProvision). PDF test still required.'
    }
    $sourceRoot = Join-Path $env:USERPROFILE 'source'
    $repo = Join-Path $sourceRoot 'tikzarium'
    New-Item -ItemType Directory -Path $sourceRoot -Force | Out-Null
    $git = Get-CommandPath 'git.exe'
    if (-not $git -and (Test-Path -LiteralPath 'C:\Program Files\Git\cmd\git.exe')) {
        $git = 'C:\Program Files\Git\cmd\git.exe'
    }
    if (-not $git) { throw 'Git not found; phase Machine must install Git system-wide.' }
    if (-not (Test-Path (Join-Path $repo '.git'))) {
        & $git clone --branch main --single-branch $RepoUrl $repo
        Assert-NativeExit 'git clone'
    } else {
        $remote = (& $git -C $repo remote get-url origin | Out-String).Trim()
        Assert-NativeExit 'git remote'
        if ($remote -notin @($RepoUrl, 'git@github.com:i-shutov/tikzarium.git')) {
            throw "Unexpected origin: $remote"
        }
        $dirty = (& $git -C $repo status --porcelain | Out-String).Trim()
        Assert-NativeExit 'git status'
        if ($dirty) { throw 'Existing checkout has local changes: refusing automatic pull.' }
        & $git -C $repo fetch origin main
        Assert-NativeExit 'git fetch'
        & $git -C $repo checkout main
        Assert-NativeExit 'git checkout main'
        & $git -C $repo merge --ff-only origin/main
        Assert-NativeExit 'git fast-forward'
    }
    $sha = (& $git -C $repo rev-parse HEAD | Out-String).Trim()
    Assert-NativeExit 'git SHA'
    Say "Exact source SHA: $sha"
    Check-MsvcSdk
    $cargo = Join-Path $env:USERPROFILE '.cargo\bin\cargo.exe'
    if (-not (Test-Path -LiteralPath $cargo)) { throw 'cargo.exe missing in QA profile.' }
    $env:CARGO_BUILD_JOBS = '1'  # Compatible with a 4-GiB Windows VM; lower memory pressure.
    $summary = [ordered]@{
        timestamp = (Get-Date -Format 'o')
        machine = $env:COMPUTERNAME
        user = $currentName
        windows = $script:OsInfo.Caption
        build = $script:OsInfo.BuildNumber
        source_sha = $sha
        rust_toolchain = '1.91.0-x86_64-pc-windows-msvc'
        xelatex_path = $xelatex
        compiled_pdf = 'NOT_RUN'
        native_gui = 'NOT_RUN (manual real RDP input required)'
        git_worktree = $repo
    }
    if (-not $SkipBuild) {
        Push-Location $repo
        try {
            & $cargo check --locked --workspace --all-targets -j 1
            Assert-NativeExit 'cargo check'
            & $cargo run --locked -j 1 -p tikzarium-cli -- doctor
            Assert-NativeExit 'tikzarium-cli doctor'
            & $cargo build --locked -j 1 -p tikzarium-app
            Assert-NativeExit 'native GUI build'
            $source = Join-Path $repo 'examples\windows-cyrillic.tex'
            $pdf = Join-Path $evidence 'windows-cyrillic.pdf'
            & $cargo run --locked -j 1 -p tikzarium-cli -- build $source $pdf
            Assert-NativeExit 'TikZarium CLI real XeLaTeX PDF'
            if (-not (Test-Path -LiteralPath $pdf)) { throw 'Product CLI reported success but PDF is absent.' }
            $summary['compiled_pdf'] = $pdf
            $summary['pdf_sha256'] = (Get-FileHash -LiteralPath $pdf -Algorithm SHA256).Hash
            $pdffonts = Get-CommandPath 'pdffonts.exe'
            if ($pdffonts) {
                $fontReport = (& $pdffonts $pdf | Out-String)
                Assert-NativeExit 'pdffonts'
                $fontReport | Set-Content -Path (Join-Path $evidence 'pdffonts.txt') -Encoding UTF8
                # pdffonts columns: name, type, encoding, emb, sub, uni, object, ID.
                # Require a *single Arial row* with emb=yes and ToUnicode (uni=yes).
                $arialRows = @($fontReport -split '\r?\n' | Where-Object {
                    $_ -match 'Arial' -and $_ -match '\s+yes\s+(?:yes|no)\s+yes\s+\d+\s+\d+\s*$'
                })
                if ($arialRows.Count -lt 1) {
                    throw 'Embedded Arial with ToUnicode was not confirmed in the same pdffonts row.'
                }
                $summary['embedded_arial_audited'] = $true
            } else {
                $summary['embedded_arial_audited'] = 'NOT_RUN: pdffonts missing'
            }
            $pdftotext = Get-CommandPath 'pdftotext.exe'
            if ($pdftotext) {
                $textPath = Join-Path $evidence 'pdf-extracted.txt'
                & $pdftotext -enc UTF-8 $pdf $textPath
                Assert-NativeExit 'pdftotext'
                $extracted = Get-Content -LiteralPath $textPath -Raw -Encoding UTF8
                if (-not $extracted.Contains('Точка') -or -not $extracted.Contains('Кириллица')) {
                    throw 'Cyrillic text not recovered from product PDF.'
                }
                $summary['cyrillic_text_audited'] = $true
            } else {
                $summary['cyrillic_text_audited'] = 'NOT_RUN: pdftotext missing'
            }
            Say "Physical PDF generated and audited: $pdf"
        } finally {
            Pop-Location
        }
    }
    $summary | ConvertTo-Json -Depth 5 | Set-Content -Path (Join-Path $evidence 'environment.json') -Encoding UTF8
    Say "Environment report: $(Join-Path $evidence 'environment.json')"
    Say "Launch native GUI in this UNLOCKED RDP session: & `"$(Join-Path $repo 'target\debug\tikzarium-app.exe')`""
    Say 'Manual W3 Windows 10 QA still required: 6 pointer gestures, F1, Undo, Save/Open, Cyrillic IME, GUI -> XeLaTeX PDF, DPI.'
}
try {
    switch ($Phase) {
        'Machine' { Setup-Machine }
        'User'    { Setup-User }
        'CurrentUser' { Setup-User -UseCurrentProfile }
        'Check' {
            Get-CurrentInfo | Out-Null
            Refresh-Path
            $bin = Join-Path $env:LOCALAPPDATA 'Programs\TikZariumPoppler\poppler-25.07.0\Library\bin'
            if (Test-Path -LiteralPath $bin) { $env:Path = "$bin;$env:Path" }
            foreach ($program in @('git', 'rustup', 'cargo', 'rustc', 'xelatex', 'pdffonts', 'pdftotext')) {
                Write-Host ('{0,-10} {1}' -f $program, (Get-CommandPath $program))
            }
            Say "MSVC: $(Get-MsvcInfo)"
        }
    }
} catch {
    Write-Host ("FAILED: " + $_.Exception.Message) -ForegroundColor Red
    throw
} finally {
    if ($script:TranscriptRunning) { Stop-Transcript | Out-Null }
}