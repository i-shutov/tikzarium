# I12 — exact-head B15 artifact review and independent GUI blockers

On 2026-10-31 merged PR #50 through GitHub API with expected_head_sha `6a1f3f9c5d7ed060e53c072b6ee36bb115dd23d7`, after checking base main `c7afeb0a17a639e3a578ed916ecd0cd0a7cf5beb`; merge SHA `8c77976ec6c5698904cdd15a2d45a310a34dca33`. PR delta: three B app Rust sources plus B-owned plans/insights, no core/catalog/D source edits.

Five exact B-head workflow families confirmed completed/success (41210626857, 41210626845, 41210626866, 41210626859, 41210626838). Downloaded Linux N1 artifact `13045923420`: ZIP SHA-256 `235d6b1cc02bdbf82dca719c911528c4c66dc8942bd3b94b75395de12e81a807`; 34 CRC-valid files, 9/9 source/PDF hashes, JSON source_head_sha exact; six source markers/commands, opaque macro retained, three real PDFs. Visually inspected `authoring.png`, showing native line/arrow/rectangle/circle/Bézier, Cyrillic node. This is app-state-generated TeX/PDF, not physical gestures.

Downloaded actual hosted Windows Server 2022 MiKTeX artifact `13045828904`: SHA-256 `8a67516a6b828b4d4483685fdf56b200aef38c29ef3ad08844208ace192d35fd`; CRC valid; JSON source_head_sha exact; six positive PDF outputs, two strict negative failures without PDF, source SHA unchanged. Private MiKTeX 25.12, AutoInstall=0, `--disable-installer`, 9130 package rows before/after byte-identical (SHA-256 `d212f1bc5bcb93bd2fec0e06911e3a7d5a40373c3186eb0f27f3c31e9beda469`). Hosted Server != user Windows10.

Main post-merge workflows 41212000216, 41212000320, 41212000199 were not yet completed at checkpoint; DO NOT record overall PASS.

Independently reviewed #48 exact HEAD `91d5798f9ba04a7b23e26bd6919a74e0e99477fa` workflow 41193713529 FAIL, artifact 13040181801 SHA-256 `ed6ce7a3aeff2ad6a28b65785038426a1a980aecdcdc06d40bbd074c2abc869c`. Real X11 source Save and five real pointer tool gestures PASS, sixth cubic fails after 21 attempts. Visual `selected-cubic.png` still Node; observed cubic toolbar near x600,y230 versus fixture click x798,y204. Build/Export not reached. Comment on #48: https://github.com/i-shutov/tikzarium/pull/48#issuecomment-6544972716.

At #58 head `0ad8978a0b094c35a81d3cbc756e128b7e29585b`, Ubuntu D QA 41211862002 FAIL due to unrelated but required Poppler timeout unit assertion (`pdf_navigation.rs:246`, 35/36 app tests passed). No test weakening, no merge; feedback https://github.com/i-shutov/tikzarium/pull/58#issuecomment-6544983089. #59 MiKTeX log-identity still pending artifact upload. Physical Windows10/M1/M4 NOT_RUN, Lua-only XeLaTeX incompatible, no release.
