#!/usr/bin/env bash
set -euo pipefail

OUT_DIR="assets/manuals/raw"
mkdir -p "$OUT_DIR"

declare -A MANUALS=(
  ["pgfmanual.pdf"]="pgfmanual.pdf"
  ["pgfplots.pdf"]="pgfplots.pdf"
  ["circuitikzmanual.pdf"]="circuitikzmanual.pdf"
  ["tikz-cd-doc.pdf"]="tikz-cd-doc.pdf"
  ["chemfig-en.pdf"]="chemfig-en.pdf"
  ["forest-doc.pdf"]="forest-doc.pdf"
  ["pgfgantt.pdf"]="pgfgantt.pdf"
  ["quantikz.pdf"]="quantikz.pdf"
  ["tkz-euclide.pdf"]="tkz-euclide.pdf"
  ["tikz-timing.pdf"]="tikz-timing.pdf"
)

for target in "${!MANUALS[@]}"; do
  src_path="$(kpsewhich --format='TeX system documentation' "${MANUALS[$target]}")"
  cp -f "$src_path" "$OUT_DIR/$target"
done

(cd "$OUT_DIR" && sha256sum *.pdf > ../manuals.sha256)
echo "Собрано $(ls -1 "$OUT_DIR"/*.pdf | wc -l) оригинальных PDF-руководств."