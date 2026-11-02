#!/usr/bin/env bash
# I56: real external Linux TeX Live XeLaTeX of unchanged C-owned N2 examples.
# Independent from physical Windows 10/MiKTeX and macOS ARM acceptance.
set -euo pipefail
if [[ "$#" -ne 1 || -z "$1" ]]; then
  echo "Usage: qa_n2_four_library_pdf.sh EVIDENCE_DIRECTORY" >&2
  exit 2
fi
root="$1"
mkdir -p "$root"
for name in arrows.meta positioning calc fit; do
  cargo run --quiet --locked -p tikzarium-extensions --bin n2-library-fixture -- "$name" > "$root/$name.tex"
  test "$(grep -Fxc "\\usetikzlibrary{$name}" "$root/$name.tex")" -eq 1
  grep -Fq '\documentclass{standalone}' "$root/$name.tex"
  grep -Fq '\usepackage{tikz}' "$root/$name.tex"
done
(
  cd "$root"
  { xelatex --version; kpsewhich tikz.sty; } > environment-linux-texlive.txt
  sha256sum *.tex > source-before.sha256
  for name in arrows.meta positioning calc fit; do
    xelatex -interaction=nonstopmode -halt-on-error -file-line-error -no-shell-escape -recorder "$name.tex" > "$name.console.log"
    test -s "$name.pdf"
    if grep -Fq 'Missing character:' "$name.log"; then
      echo "Missing XeLaTeX glyph in N2 library $name" >&2
      exit 1
    fi
    pdfinfo "$name.pdf" > "$name.pdfinfo.txt"
    page_count="$(awk '/^Pages:/ {print $2}' "$name.pdfinfo.txt")"
    test "$page_count" = 1
    pdftotext -enc UTF-8 "$name.pdf" "$name.extracted.txt"
    pdffonts "$name.pdf" > "$name.fonts.txt"
    awk 'NR>2 && NF && $(NF-4)!="yes" {bad=1} END {exit bad}' "$name.fonts.txt"
    if [[ "$name" == "positioning" || "$name" == "fit" ]]; then
      grep -Fq A "$name.extracted.txt"
      grep -Fq B "$name.extracted.txt"
      awk 'END {if(NR<=2) exit 1}' "$name.fonts.txt"
    fi
    pdftoppm -f 1 -singlefile -scale-to 1200 -png "$name.pdf" "$name"
    test -s "$name.png"
  done
  sha256sum -c source-before.sha256
  sha256sum *.tex *.pdf *.png > artifacts.sha256
  printf 'Host=Linux TeX Live\nPhysical Win10=NOT_RUN\nPhysical Mac ARM=NOT_RUN\nGUI event=UNIT_EVENT, not real X11\n' > provenance.txt
)
