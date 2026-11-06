[CmdletBinding()]
param([Parameter(Mandatory)][string]$OutputDir)
$ErrorActionPreference='Stop'
. (Join-Path $PSScriptRoot '..\tools\tikzarium_rust_environment.ps1')
New-Item -ItemType Directory -Force -Path $OutputDir | Out-Null
$OutputDir=(Resolve-Path -LiteralPath $OutputDir).Path
$names=@('CARGO_HOME','RUSTUP_HOME','RUSTUP_TOOLCHAIN','PATH')
$saved=@{};foreach($name in $names){$saved[$name]=[Environment]::GetEnvironmentVariable($name,'Process')}
$machine=[Environment]::GetEnvironmentVariable('PATH','Machine')
try {
 $missing=Join-Path $OutputDir 'missing-cache'
 if($null -ne (Use-TikzariumPrivateRust -CacheRoot $missing)){throw 'Nonexistent private cache falsely accepted'}
 if($env:PATH -cne $saved.PATH){throw 'Missing cache changed PATH'}
 $cache=Join-Path $OutputDir 'mock-cache'
 $bin=Join-Path $cache 'tikzarium-rust\cargo\bin'
 $rustup=Join-Path $cache 'tikzarium-rust\rustup'
 New-Item -ItemType Directory -Force -Path $bin,$rustup | Out-Null
 [IO.File]::WriteAllBytes((Join-Path $bin 'cargo.exe'),[byte[]]@(0))
 [IO.File]::WriteAllBytes((Join-Path $bin 'rustc.exe'),[byte[]]@(0))
 $actual=Use-TikzariumPrivateRust -CacheRoot $cache
 if($actual -cne (Join-Path $bin 'cargo.exe') -or $env:RUSTUP_HOME -cne $rustup -or $env:RUSTUP_TOOLCHAIN -cne '1.91.0-x86_64-pc-windows-msvc'){throw 'Private toolchain resolution mismatch'}
 if(-not $env:PATH.StartsWith($bin+';')){throw 'Current-process Rust PATH not set'}
 if([Environment]::GetEnvironmentVariable('PATH','Machine') -cne $machine){throw 'Machine PATH was modified'}
 @{'status'='PASS_PRIVATE_RUST_DISCOVERY_PROCESS_ONLY';'tests'=3;'executes_mock_binary'=$false} | ConvertTo-Json | Set-Content (Join-Path $OutputDir 'rust-environment-test.json') -Encoding UTF8
} finally {foreach($name in $names){[Environment]::SetEnvironmentVariable($name,$saved[$name],'Process')}}
