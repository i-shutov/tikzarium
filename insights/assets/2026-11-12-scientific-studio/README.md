# Scientific Studio evidence, 2026-11-12

[Implementation checkpoint](../../2026-11-12_SCIENTIFIC_STUDIO_IMPLEMENTATION_RU.md) · [PR #189](https://github.com/i-shutov/tikzarium/pull/189).

`evidence.zip` preserves original local test/build/TeX logs, headless API JSON reports, two modified SC3 sources, generated PDFs and rendered PNGs, QA environment/package provenance, and retrieved hosted gate logs. `manifest.json` records the archive hash and the hash/size of every member. The archive was read back and every member checked against this manifest.

Tested local commit `a434d2669d21124944a581197a6214a4782ad9c0` and published code commit `1784a48246cbdfd260fb80ce4731c7f165ad52c5` have identical tree `3bb17ee38e0f77d6d06a125d4076c70f1f707bf1`. The manifest also stores individual crate/lock Git objects so an evidence-only follow-up commit does not imply a new code test. The AK/F14_3 CLI result retains its earlier a865797/476d2c source identity.

512 workspace tests passed; 4 were intentionally ignored in that command. The two SC3 export tests were then invoked explicitly and passed. Headless production egui checks are UNIT_EVENT. PNG files here are rendered scientific PDFs, not desktop screenshots. Native GUI and physical Windows10/IME/DPI remain unaccepted.

No runtime fonts or TeX packages are redistributed in this archive. Paths in QA logs identify the actual disposable environment. `qa-env.sh` documents that environment, not a portable installer or permission to change a user's TeX setup.
