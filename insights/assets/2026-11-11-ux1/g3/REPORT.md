# UX1: large-document CPU diagnosis, scratch experiment

The measured stall is not confined to syntax tokenization. In the same optimized,
headless egui 0.33.3 stack, a one-color 8 MB document still required 2.8–3.8 seconds
for the first edit after idle in the two comparison runs. Disabling syntax coloring
is not a complete solution. Production files were not changed by this experiment.
G3 remains **NOT_ACCEPTED**. Native event-to-visible-frame latency, physical
Windows performance, and p95 remain **NOT_RUN**.

## Reproduction and provenance

Directory: `/workspace/scratch/c934e9a9f24a/ux1_g3_compare`.

The harness links the already compiled optimized release dependencies. Its syntax
path uses a scratch snapshot of the actual `SourceHighlightCache::galley` and
palette/tokenizer/layout code. Only test visibility gates/module and the visibility
of the pure layout builder are changed in that copy. The four-variant UiTheme
wrapper does not change palette values. An ownership stub panics if reached;
fixtures explicitly contain no ownership marker. Ownership was already measured
separately and is not part of this comparison.

Source runtime is e8a3410cb65f3bda2fd20b4050de3e169454c100. GitHub compare to
92c7c6877613b4f4e07ee9fc705e808436cae708 contains five insights/scripts changes,
with no app runtime changes. Exact snapshot, dependency input, binary, fixture and
log hashes are recorded in `metadata-and-results.json`.

```bash
cd /workspace/scratch/c934e9a9f24a/tikzarium
export RUSTUP_HOME=/workspace/scratch/c934e9a9f24a/rustup
export CARGO_HOME=/workspace/scratch/c934e9a9f24a/cargo
export PATH=/workspace/scratch/c934e9a9f24a/cargo/bin:$PATH
rustc --edition=2024 -C opt-level=3 -C debuginfo=0 \
  -L dependency=target/release/deps \
  --extern eframe=target/release/deps/libeframe-d04273f22ae6115f.rlib \
  /workspace/scratch/c934e9a9f24a/ux1_g3_compare/benchmark.rs \
  -o /workspace/scratch/c934e9a9f24a/ux1_g3_compare/benchmark
/workspace/scratch/c934e9a9f24a/ux1_g3_compare/benchmark > /workspace/scratch/c934e9a9f24a/ux1_g3_compare/results-reproduced.log
UX1_UNIQUE=1 /workspace/scratch/c934e9a9f24a/ux1_g3_compare/benchmark > /workspace/scratch/c934e9a9f24a/ux1_g3_compare/unique-reproduced.log
UX1_ROW_CLONE=1 UX1_LINES=100000 UX1_UNIQUE=1 \
  /workspace/scratch/c934e9a9f24a/ux1_g3_compare/benchmark > /workspace/scratch/c934e9a9f24a/ux1_g3_compare/row-clone-reproduced.log
```

Machine: managed Linux x86_64, AMD EPYC 9V74, nine CPUs in affinity, Rust 1.91.0,
`-C opt-level=3`, optimized eframe/egui/epaint dependencies, debug assertions false.
`Instant` measures elapsed wall time around CPU work; CPU frequency/load are not
pinned. No window, GPU, native input delivery, TextEdit interaction, gutter, search,
IME, or compositor is included. There are three samples for medians and one for
cold/after-idle operations; no p95 estimate is justified. Raw outliers are retained.

Each physical source line is exactly 80 UTF-8 bytes, ending in Greek alpha and
CRLF. Unique fixtures differ by a six-digit line number in the TeX comment. The
last alpha is changed to beta/gamma/delta without changing byte length or line
boundaries. The same text is passed to syntax and one-color formatting. Both
modes reconstruct the exact original source from galley glyphs and newline flags.

## Measured comparison

First complete comparison, milliseconds. Sequential edits are medians of three;
first edit after five idle frames is a single sample.

| Lines / bytes | Fixture | Mono sequential | Syntax sequential | Mono after idle | Syntax after idle |
|---|---|---:|---:|---:|---:|
| 10,000 / 800,000 | repeated | 16.2 | 36.4 | 345.8 | 289.6 |
| 10,000 / 800,000 | unique | 29.1 | 48.7 | 410.8 | 332.8 |
| 100,000 / 8,000,000 | repeated | 169.7 | 489.3 | 3700.5 | 1694.2 |
| 100,000 / 8,000,000 | unique | 295.9 | 506.9 | 2777.1 | 2241.6 |

A second unique-only run confirmed the pattern, with meaningful allocator/cache
variation: 100k sequential mono 318.7 ms versus syntax 534.1 ms; first edit after
idle mono 3840.1 ms versus syntax 2520.0 ms. Single initial-layout samples varied
widely (including 1.4–7.6 seconds for unique 100k across runs). These are local
microbenchmark data, not a bounded native latency claim.

Component measurements from that second unique-only run:

| Component | 10k, mono | 10k, syntax | 100k, mono | 100k, syntax |
|---|---:|---:|---:|---:|
| Hash full LayoutJob, median | 0.063 ms | 6.586 ms | 0.771 ms | 64.720 ms |
| Clone/drop full LayoutJob, median | 0.018 ms | 2.097 ms | 0.397 ms | 23.302 ms |
| Tokenize, median | n/a | 2.800 ms | n/a | 22.083 ms |
| Build syntax LayoutJob from cached spans, median | n/a | 6.826 ms | n/a | 88.042 ms |
| Fonts only, exact full-job cache hit | 0.435 ms | 6.911 ms | 2.939 ms | 86.970 ms |
| Fonts only, changed last paragraph | 29.090 ms | 49.871 ms | 288.315 ms | 430.330 ms |
| Fonts only, changed last paragraph after idle | 90.051 ms | 589.772 ms | 831.120 ms | 1671.407 ms |

The fonts-only measurements prepare the job before timing. A hit still hashes and
drops the owned job and refreshes child-cache use; it is not a fresh glyph layout.
Sequential totals and component medians are separate measurements and must not be
added as though they were a single traced frame.

The 100k unique galley is identical in size in both formatting modes:
100,001 placed rows, 7,800,000 glyphs, 28,800,000 vertices and 43,200,000 indices.
At the standard 20-byte vertex / 4-byte index representation, mesh vectors alone
account for about 749 MB before row/glyph/job/token/cache overhead. The colored job
has 1,900,000 sections; the mono job has one. This large geometry exists even when
the renderer later clips painting to the viewport.

In a targeted follow-up on the same 100k unique syntax galley, cloning only the
placed-row vector and its Arc references took **1.231 ms median**. Deep-cloning
Rows including their glyph/mesh vectors took **603.377 ms median** (591–824 ms).
This is a diagnostic comparison, not an implementation of incremental layout.

## Mechanism in the installed egui source

The primary source is the installed epaint 0.33.3 code in:

- `epaint-0.33.3/src/text/text_layout_types.rs`: `LayoutJob::hash` hashes all text and
  every section; `Galley::concat` clones the Arc for each placed row and calls
  `Arc::make_mut` on the last row of each non-last paragraph to set its newline
  flag. When the child row is still shared, this copies the Row glyph/mesh data.
- `epaint-0.33.3/src/text/fonts.rs`: `layout_internal` hashes the full owned job;
  `layout_each_paragraph_individually` copies paragraph text and overlapping
  formats, hashes/looks up every paragraph, then concatenates all galleys.
  `flush_cache` retains only entries used in the preceding generation.

The application keeps the complete rendered galley alive on idle. That correctly
avoids a large job clone/hash on most idle frames, but does not mark egui's internal
paragraph-cache entries as used. After idle those entries expire. The next edit
must reconstruct them. On the unique 100k fixture the first cache-eviction idle
frame itself had 185–253 ms mono / 209–219 ms syntax outliers, while subsequent
syntax idle medians were 0.37–0.46 ms. Cache destruction, cold regeneration and
full geometry recomposition therefore require separate treatment; a low idle
median is not evidence that every idle transition is cheap.

These code paths and measurements explain the practical problem. The deep-row
clone experiment supports the geometry-copy cost, but does not individually trace
every internal allocation or attribute the complete edit time to `concat`.

## Practical decision

There is no demonstrated small, generally correct application fix that closes
100k editing performance within the frozen implementation.

| Candidate | What it can improve | Why it is not the complete fix |
|---|---|---|
| Incremental tokenization alone | About 22–40 ms tokenizer work at 100k in these runs | The fonts-only path still takes hundreds of milliseconds warm and more than a second after idle. |
| Fewer formatting sections / mono fallback | Cuts job memory, hash and format splitting | Mono still has second-scale after-idle stalls, and loses required syntax presentation. |
| Call full `fonts.layout_job` on every idle frame | Keeps internal paragraph entries warm | Reintroduces complete job clone/hash/cache traversal each idle; the measured colored exact-job fonts hit is about 87 ms at 100k. |
| Keep immutable paragraph geometry and splice affected paragraphs into the full galley | Can avoid cold paragraph reconstruction and deep cloning untouched rows; shallow-row measurement shows a useful target | Requires a deliberate incremental-layout stage with source/byte/character/row mapping and correct invalidation. It is not a tested one-line cache change. |
| Upstream egui cache handle / retained paragraph lifetime API | Could remove repeated full-job hashing and generation eviction without duplicating application logic | Needs an explicit dependency/upstream change, memory policy and integration acceptance; current public font API has no such handle. |

A separate, bounded editor-performance stage is the recommended next implementation
slice. Keep the single editable source buffer and native TextEdit input/history.
Cache only derived immutable paragraph geometry. Reuse untouched rows by Arc,
reflow the changed region and update later row positions, while retaining a full
source-authoritative Galley for caret/selection. Explicit invalidation must cover
source revisions/document changes, multiline lexer state (catcode and verbatim),
wrap width, font/palette, font atlas and physical DPI. Bound cache memory.

That stage must be checked against UTF-8, CRLF, trailing empty rows, wraps, edits
that insert/delete line breaks, diagnostic and Find navigation, IME preedit/commit,
selection and mixed native/visual Undo. The scratch row-clone result is promising
for choosing the work, but does not satisfy these contracts or justify shipping a
partial-row splice today.

Full row-list/offset work remains O(number of rows) in the current complete-Galley
TextEdit interface. Full source/section hashing, cloning all glyph meshes and
cold-rebuilding all unchanged paragraphs are costs of the present layout path,
not fundamental requirements of editing TeX. Clipping painting or suppressing
syntax colors does not remove those costs.

## Repository copy

This folder preserves the exact harness/snapshot/raw logs used above; the compiled
local executable is not redistributed. `metadata-and-results.json` retains its
hash for provenance. To run from another checkout after `cargo build --release
--locked -p tikzarium-app`, select the release eframe rlib built by that checkout
and pass this folder's `benchmark.rs` to the same rustc invocation. Dependency
artifact filenames and absolute scratch paths above identify the original run;
they are not portable installation paths. New runs must retain their own machine,
compiler/dependency, source and timing metadata.
