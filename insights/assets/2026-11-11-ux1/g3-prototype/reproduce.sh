#!/usr/bin/env bash
set -euo pipefail

if (( $# != 2 )); then
  printf 'Usage: bash %s /absolute/path/to/libeframe-HASH.rlib /absolute/output/path\n' "$0" >&2
  exit 2
fi

g3_script_dir="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
g3_eframe_rlib="$1"
g3_output="$2"
if [[ "$g3_eframe_rlib" != /* || ! -f "$g3_eframe_rlib" || "$g3_output" != /* ]]; then
  printf 'Pass an existing absolute eframe rlib path and an absolute output path.\n' >&2
  exit 2
fi

rustc --edition=2024 -C opt-level=3 -C debuginfo=0 \
  -L "dependency=$(dirname -- "$g3_eframe_rlib")" \
  --extern "eframe=$g3_eframe_rlib" \
  "$g3_script_dir/prototype.rs" -o "$g3_output"
