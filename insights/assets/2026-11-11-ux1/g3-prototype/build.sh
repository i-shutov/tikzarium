#!/usr/bin/env bash
set -euo pipefail
ux1_root=/workspace/scratch/c934e9a9f24a
ux1_proto="$ux1_root/ux1_g3_prototype"
ux1_repo="$ux1_root/tikzarium"
export RUSTUP_HOME="$ux1_root/rustup"
export CARGO_HOME="$ux1_root/cargo"
export PATH="$ux1_root/cargo/bin:$PATH"
rustc --edition=2024 -C opt-level=3 -C debuginfo=0 \
  -L "dependency=$ux1_repo/target/release/deps" \
  --extern "eframe=$ux1_repo/target/release/deps/libeframe-d04273f22ae6115f.rlib" \
  "$ux1_proto/prototype.rs" -o "$ux1_proto/prototype"
# Correctness only: "$ux1_proto/prototype"
# All final trimmed cases: "$ux1_proto/prototype" --bench
# Recorded final targeted run:
# UX1_LINES=100000 UX1_UNIQUE=1 "$ux1_proto/prototype" --bench
