# Visual Guide from original native interface evidence

The PGFPlots hosted workflow builds the guide after its AT4 and attributed-clean
matrix jobs succeed. The collector also requires successful I61 and compact
interface runs from the exact same source commit. The retained original V2
warning failures are reported independently and remain failures.

`screens.json` selects original PNGs and describes the visible actions. The
generator checks each PNG against the producer report, source commit and screen
geometry, then copies its bytes unchanged into `assets/`. Recorded input events
provide a separately labelled automated replay summary. These counts include QA
overhead and are not measurements of human performance or physical hand travel.

To regenerate the guide from downloaded, verified workflow artifacts:

```sh
python3 scripts/visual_guide/build_guide.py \
  --evidence-root "$EVIDENCE_ROOT" \
  --evidence-index evidence-index.json \
  --source-sha "$SOURCE_SHA" \
  --run-url "$RUN_URL" \
  --output-dir "$GUIDE_OUTPUT"
```

The produced `guide.tex` and `assets/` are portable. Compile twice in their
directory using an independently installed XeLaTeX with the explicitly selected
DejaVu Sans and DejaVu Sans Mono fonts:

```sh
xelatex -interaction=nonstopmode -halt-on-error -file-line-error -no-shell-escape -recorder guide.tex
xelatex -interaction=nonstopmode -halt-on-error -file-line-error -no-shell-escape -recorder guide.tex
```

`resolved_manifest.json` retains full PNG/report/archive hashes and producer run
identities. A successful compile is only a build result: every final PDF page
must still be rendered and independently inspected for readability, overflow
and faithful captions. The guide describes the recorded Linux/Xvfb interfaces;
it does not establish physical Windows 10, macOS or full scientific acceptance.
