# W2 startup: original GUI review and renewed X11 source-tree lease

Date: 2026-11-08. PR #132 first head: `948d702649f379f3ad7c44ad7023d9e6c6d48154`. App source tree: `085e9d28cbc2edcc209110f330f0365fd6147111`.

## Original X11 bootstrap review, not full acceptance

Original run #42448755132, artifact #13605170231, archive SHA256 `ab1d99dca1216e06767b3165b2ac08fc043523a292c5227674e7a6ffc85026ff`. Downloaded original ZIP, checked all report-listed files and inspected the original 1920x1080 PNG with the 1366x768 application window. Native editable TeX source, adjacent canvas, right Properties/Libraries/Help and the floating Geometry palette remain in their previous layout. The original 02-group-palette-candidate.png SHA256 is `3dba6986745e89d6a238f8fa8ab02cd0e9870e51302cb3af6e135219af068594`. Geometry palette starts at root x500, and its four icon centers remain x532/585/639/693, y169. Source/inspector layout unchanged by the asynchronous discovery worker. No new layout code was introduced.

The two initial I61/N5 failures occurred before GUI execution because their explicit old source-tree lease still referenced `623d32ff21a756c30e827fe43943f75cf8ecf305`. After the actual screenshot review above, renew only the two exact tree constants to `085e9d28cbc2edcc209110f330f0365fd6147111`; keep all pointer/source/PDF/Undo/CRLF assertions and fail-closed tree matching unchanged. This is authorization to run the existing acceptance against the reviewed new source tree, NOT a substitute for that acceptance.

The bootstrap's clipboard round-trip checks reported exact bytes; full six-gesture/GUI→XeLaTeX acceptance remains pending until I61/N5 rerun succeeds and original artifacts are reviewed.

## Actual hosted Windows experiment

Run #42448755044 on the same PR head completed both original native Win32 HWND/F1 and the deliberate slow-read-only-discovery GUI experiment successfully. Windows PowerShell 5.1 guards and actual Windows core tests also passed in #42448755161. Original Windows ZIP/PNGs/timing records still require independent inspection. These are hosted Windows2022 facts, never physical personal Server W2 or Windows10 W3.

## Release boundary

No stable tag, no installer, no full W2/W3 PASS. Existing Administrator support, no automatic TeX/package installation, current-main personal runner isolation, original PID/desktop/foreground/client-capture requirements are unchanged.
