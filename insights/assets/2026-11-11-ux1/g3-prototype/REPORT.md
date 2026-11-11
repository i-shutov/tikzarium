# G3 feasibility spike: derived paragraph/Row cache, egui 0.33.3

## Decision

**Public-API feasibility demonstrated; not ready for production and not G3 accepted.**
A derived paragraph/Row cache can retain the original complete editable source and
produce a Galley exactly matching native egui on the tested source/geometry cases,
without deep cloning unchanged glyph/mesh Rows. It avoids cold rebuilding every
paragraph after idle. However, the simple prototype still takes hundreds of
milliseconds on 100k edits, has a slow unique-document initial layout, and retains
about 1.72 GB of counted glyph/mesh/job capacities on the 100k unique fixture.
A hard memory bound and native paired input tests remain unresolved.

No tracked production file, dependency or CI file was changed. The prototype is
scratch-only and must not be included automatically in PR167 or main.

## Mechanism and private intrinsic metadata

The prototype uses real public egui/epaint 0.33.3 APIs:

1. The complete real source is tokenized with the existing presentation lexer on
   every source change. Full-source formatting is retained in the composite
   `LayoutJob`. There is no second editable text buffer or TeX transformation.
2. Derived physical-paragraph jobs exclude only the separating LF; CR remains a
   literal glyph. Each key includes exact paragraph text, all local formatting,
   wrap settings and its newline flag. Hash collisions are resolved with full
   job equality. No pointer/hash-only source comparison is used.
3. `epaint::text::layout(fonts.fonts, ppp, Arc<LayoutJob>)` bypasses the internal
   short-lived Galley cache. Newly laid out Rows have unique Arc ownership.
   Before sharing them, their last-row newline flag is set with `Arc::get_mut`.
   This mutates derived geometry only and does not clone a mesh or change source.
4. Unchanged paragraphs reuse immutable `Arc<Galley>` / `Arc<Row>` allocations.
   New keys trigger native reflow only for the affected paragraphs. Full lexing
   means catcode/verbatim changes can correctly invalidate following styles.
5. `Galley::intrinsic_size` is private in epaint. To preserve it correctly,
   shallow metadata-only native paragraph skeletons retain that private field
   but have their Row vectors cleared. Public `Galley::concat` sums these native
   metadata values without any Rows to deep-clone. Public geometry fields are
   then filled using the retained Arc Rows and native concat placement rules.
   The result's intrinsic size is tested exactly against the native oracle.

The cache holds only keys present in the current source. It does not intentionally
retain a history of old documents/paragraph versions. The composite shares its
Rows with those cache entries; it does not own a second mesh set.

The implementation is intentionally simple: it still allocates candidate local
jobs, compares/hashes every paragraph, rebuilds the full formatted job and does
O(rows) composition/reposition on each edit. This is not an incremental lexer or
an optimized changed-range index.

## Correctness evidence

Final executable output:

```text
TEXTEDIT_SELECTION_COW_PASS frames=3 source_bytes_unchanged=true
ORACLE_PASS cases=168 unicode_crlf_insert_delete_newline_wrap_dpi=true
  source_and_intrinsic_and_all_cursor_positions=true
```

The final test adapter compares complete formatted jobs, exact intrinsic size,
rect/mesh bounds, vertex/index counts, placed-row positions and complete Rows
(including glyphs, colors and UV data). It checks every source character cursor
with both `prefer_next_row` values and pointer hit testing around row/caret edges.
Source reconstruction from glyph characters plus newline flags must be byte
identical, including CRLF, Unicode, emoji and combining marks.

Cases include empty source, LF/CRLF empty lines, trailing empty rows, inserts,
deletes, newline changes, opaque/catcode/verbatim examples, a 1001-short-line
fractional-DPI case, wrap widths infinity/8/70/180 and DPI 1/1.25/2. The final
adapter additionally checks selection copy-on-write for every case. A real
headless TextEdit three-frame paint workflow checks expanded selection followed
by collapsed selection, unchanged source bytes and pristine retained cached
geometry. This is not native keyboard/mouse, OS IME, Undo or physical evidence.

Prototype scope is the current uniform 14-point monospace font and fixed Midnight
palette. Style changes caused by source changes and wrap/DPI invalidation are
exercised. The tiny native font-cache sentinel invalidates on font atlas/cache
replacement. General font/palette parameter plumbing and explicit document
lifecycle integration are proposed production work, not tested implementation.
Ownership markers are excluded from this spike's fixtures: the scratch ownership
stub panics if reached rather than substituting ownership semantics.

## CPU results

AMD EPYC 9V74 managed Linux host; Rust 1.91.0, rustc opt-level3, existing optimized
release eframe/egui/epaint dependencies, no renderer. `Instant` wall time includes
CPU scheduling/allocation effects. Native TextEdit event processing, source editor
navigation/authoring sync, GPU/compositor and event-to-visible-frame are excluded.
No p95 estimate is made. Baseline and prototype runs are separate experiments,
not statistically paired samples.

Each source line is exactly 80 UTF-8 bytes with CRLF. Unique fixtures differ only
by a six-digit line number in the comment. A same-length Greek character is
changed on the last physical content line. Sequential values are medians of
three; initial and first edit after five idle frames are single samples.

Initial prototype, before capacity trimming (complete 4-case run):

| Fixture | Native syntax baseline initial | Prototype initial | Baseline warm edit | Prototype warm edit | Baseline after idle | Prototype after idle |
|---|---:|---:|---:|---:|---:|---:|
| 10k repeated / 0.8 MB | 36.6 ms | 67.7 ms | 36.4 ms | 27.6 ms | 289.6 ms | 61.0 ms |
| 10k unique / 0.8 MB | 125.6 ms | 595.0 ms | 48.7 ms | 36.4 ms | 332.8 ms | 95.0 ms |
| 100k repeated / 8 MB | 399.0 ms | 737.9 ms | 489.3 ms | 247.1 ms | 1694.2 ms | 789.1 ms |
| 100k unique / 8 MB | 1403.5 ms | 5280.3 ms | 506.9 ms | 507.0 ms | 2241.6 ms | 980.0 ms |

Every changed unique fixture reflowed one paragraph and reused all other
paragraphs. Repeated fixtures sometimes needed zero new reflows because the
edited content was already present elsewhere with exactly equal formatting.

Final targeted 100k unique run after shrinking capacities on newly created Rows
and local jobs:

| Initial | Warm edit median / min / max | First edit after idle | New reflows / reused paragraphs |
|---:|---:|---:|---:|
| 5580.1 ms | 618.6 / 564.3 / 1071.9 ms | 1164.4 ms | 1 / 100000 |

Capacity trimming reduced retained allocations, but this sample did not improve
latency. Both raw series are preserved; no faster sample was substituted.

No new stage-by-stage trace was added within the timebox. Existing baseline
component measurements (in copied baseline logs) put 100k unique full tokenization
around 22–40 ms, full formatted-job construction around 79–88 ms, and full colored
job hashing around 62–65 ms. The prototype still does full-job construction and
per-paragraph candidate allocation/hash/scan. Those older component medians must
not be added or subtracted to manufacture a prototype frame trace.

## Retained memory: unique allocations, not Arc double counting

The memory routine deduplicates Rows by `Arc::as_ptr` across all retained cache
entries. Every composite Row is asserted to point to that same retained set.
Paragraph job allocations are deduplicated separately by their Arc identity, and
the distinct full composite job is counted once. Mesh/glyph vector capacities
and text/section capacities are used, not just live lengths.

| 100k unique component | Before trim | Final trimmed |
|---|---:|---:|
| Unique retained Rows | 100001 | 100001 |
| Mesh vertex/index vector capacities | 811.2 MB | 748.8 MB |
| Glyph vector capacities | 870.4 MB | 530.4 MB |
| Paragraph + full-job text/section capacities | 567.1 MB | 442.3 MB |
| Counted component sum | 2248.7 MB | **1721.5 MB** |

This is **not total RSS or a measured peak**. HashMap buckets/Entry/Galley/row
containers, fonts/glyph atlas, executable/allocator overhead, transient full token
spans/new formatted jobs, and outstanding old frame outputs are excluded. Peak
is NOT_MEASURED. Shared Arcs are not counted twice in the component sum.

Before trimming, repeated 100k retained only three unique Rows (matching first
paragraph/other paragraphs/final empty formatting variants): 16,224 bytes mesh
capacity and 17,408 bytes glyph capacity. Full-job formatting still cost 226.4 MB.
This demonstrates deduplication, but unique documents remain the realistic memory
constraint. No hard MB budget is implemented in the prototype.

An LRU on paragraph entries alone cannot bound the dominant allocation while the
complete current Galley itself still retains every Row. A production memory policy
must address full-document glyph/mesh retention, potentially viewport-limited
meshes or a deliberately bounded editor layout design, with precise cursor and
selection contracts. That is separate work; hiding/changing source or switching
to plaintext is not a complete answer.

## Invalidation and remaining integration work

Exact source equality protects idle reuse. Full-source tokens/styles and exact
local-job comparison invalidate affected paragraph layouts after lexical changes.
Width belongs to job keys; DPI and the native font-cache sentinel clear retained
entries. Old active keys are dropped after each rebuild; external owners of an
old frame may still legitimately retain its Galley until that frame is released.

Before production: implement and measure a hard memory bound, explicit font/theme
and document lifecycle inputs, efficient changed-range indexing that avoids full
job/format key churn, and native paired-input tests. Verify native IME preedit and
commit, selection, scrolling, Find/diagnostic navigation and mixed Undo history.
The actual source-editor/authoring/gutter costs belong in event-to-frame evidence.

This spike establishes a correct public-API path for derived geometry reuse under
the tested constraints. It does not close G3, justify a native p95 claim, or remove
the measured 100k memory/latency blockers.

## Reproduce

```bash
/workspace/scratch/c934e9a9f24a/ux1_g3_prototype/build.sh
/workspace/scratch/c934e9a9f24a/ux1_g3_prototype/prototype
UX1_LINES=100000 UX1_UNIQUE=1 \
  /workspace/scratch/c934e9a9f24a/ux1_g3_prototype/prototype --bench
```

The final source always trims new allocations. `results-before-capacity-trim.log`
records the earlier complete run; its old binary was overwritten during this
scratch iteration and was not separately hashed. Final source/binary, raw logs,
oracle adapter, snapshot and release dependency hashes are in `metadata.json`.
