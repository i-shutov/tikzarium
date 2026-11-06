# Activate ONLY an already installed private TikZarium toolchain in THIS process.
# No downloads, registry writes, machine/user PATH edits or other runner changes.
function Use-TikzariumPrivateRust {
 [CmdletBinding()]
 param([string]$CacheRoot=$env:RUNNER_TOOL_CACHE)
 if([string]::IsNullOrWhiteSpace($CacheRoot)){return $null}
 $root=Join-Path $CacheRoot 'tikzarium-rust'
 $cargoHome=Join-Path $root 'cargo';$rustupHome=Join-Path $root 'rustup'
 $bin=Join-Path $cargoHome 'bin'
 $cargo=Join-Path $bin 'cargo.exe';$rustc=Join-Path $bin 'rustc.exe'
 if(-not (Test-Path -LiteralPath $cargo -PathType Leaf) -or -not (Test-Path -LiteralPath $rustc -PathType Leaf) -or -not (Test-Path -LiteralPath $rustupHome -PathType Container)){return $null}
 $env:CARGO_HOME=$cargoHome
 $env:RUSTUP_HOME=$rustupHome
 $env:RUSTUP_TOOLCHAIN='1.91.0-x86_64-pc-windows-msvc'
 $env:PATH="$bin;$env:PATH"
 return $cargo
}
