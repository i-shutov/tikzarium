#!/bin/sh
# Real local XeLaTeX smoke; preserves output directory and full logs.
set -eu
HERE=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
FIXTURES=$HERE/../fixtures
if [ "$#" -ge 1 ]; then OUT=$1; else OUT=$(mktemp -d); fi
mkdir -p "$OUT"
OUT=$(CDPATH= cd -- "$OUT" && pwd)
command -v xelatex >/dev/null 2>&1 || { echo "xelatex not found" >&2; exit 2; }
command -v pdfinfo >/dev/null 2>&1 || { echo "pdfinfo not found" >&2; exit 2; }
printf 'TeX: '
xelatex --version | head -n 1
echo "Preserving logs and PDFs in $OUT"

for name in core pgfplots circuitikz tikz-cd; do
    mkdir -p "$OUT/$name"
    if ! (cd "$FIXTURES" && xelatex \
        -interaction=nonstopmode -halt-on-error -file-line-error \
        -recorder -no-shell-escape -output-directory="$OUT/$name" \
        "$name.tex" >"$OUT/$name/console.log" 2>&1); then
        echo "FAIL $name: inspect $OUT/$name/console.log" >&2
        exit 1
    fi
    pdf="$OUT/$name/$name.pdf"
    test -s "$pdf" || { echo "FAIL $name: no PDF" >&2; exit 1; }
    pages=$(pdfinfo "$pdf" | awk '/^Pages:/ {print $2}')
    test "$pages" = 1 || { echo "FAIL $name: expected 1 page; got $pages" >&2; exit 1; }
    echo "PASS $name: XeLaTeX produced one-page PDF"
done

name=graphdrawing-lua
mkdir -p "$OUT/$name"
if (cd "$FIXTURES" && xelatex \
    -interaction=nonstopmode -halt-on-error -file-line-error \
    -recorder -no-shell-escape -output-directory="$OUT/$name" \
    "$name.tex" >"$OUT/$name/console.log" 2>&1); then
    echo "FAIL $name: unexpected XeLaTeX success for Lua-only algorithm" >&2
    exit 1
fi
if ! grep -qi 'need to run LuaTeX' "$OUT/$name/console.log"; then
    echo "FAIL $name: different failure, inspect log" >&2
    exit 1
fi
echo "EXPECTED-INCOMPATIBLE $name: TeX explicitly requires LuaTeX"
