# B42 forensic UX review and QA honesty

Observed B41 real X11 images in UI album:
- long text Open/Save/Build/Export/Discovery menus occupy two rows;
- six full-word tool buttons occupy another row above provisional guide;
- combined Help + Library + Inspector + Package inventory is a long
  inaccessible scroll; bottom log uses 145px even without an error;
- compact Fit Page had to shrink PDF to 7%.

Selected revised architecture: only 4 group icons remain in rail; grouped
floating palettes avoid permanently taking PDF/source width. 4 command
icons on top; File/View only as secondary menus; context right dock tabs.
Existing source-patch and external compiler contracts unchanged.

QA status at authoring: source code created; no local Rust binary
in integrated container, NOT_RUN local; CI on exact PR HEAD pending;
new real egui X11 NOT_RUN until artifacts reviewed. User-installed MiKTeX
reported by owner but GitHub runner connectivity NOT_VERIFIED;
persistent Windows Server test NOT_RUN; physical Win10/M1/M4 NOT_RUN.

Risk: old coordinate-pinned desktop drivers must be recalibrated for
new layout, not marked PASS from historical B41. Keep existing CI gates.
