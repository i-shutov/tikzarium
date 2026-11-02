# B42 — Large ergonomic studio block and Windows Server test bridge

Source of truth: i-shutov/tikzarium main
93db2044b5b91f79c0e774be8806a3693ba7329b;
AGENTS, current source and user's previous interface mockups.

Owner rejects many text buttons and poor compact-window readability.
Deliver native vector icons grouped into popover palettes, short action
toolbar, persistent code beside drawing/PDF, independently scrolling
context tabs and on-demand diagnostics. Keep original TikZ and XeLaTeX.

Tools grouped: geometry 4, connections 1, annotation 1, extensions
explicit NOT_IMPLEMENTED for adapters. No duplicate C catalogue.
Undo/Save/Open and CRLF remain untouched. Legacy GUI temporary fallback.

Windows Server stream: safe manual workflow with own user-installed MiKTeX,
no hidden installer, actual PDF inventory/hash, cargo --locked; self-hosted
runner is not known connected yet. Windows Server != Windows10.
B42 exact-head hosted CI + real X11 screenshots and user-server external
test are release gates, never infer them from source changes alone.
