# B36 QA — compact PDF area and view-state safety

Date 2026-11-01. Base main: `95b9ecb0f7183de7eb3864468a35b474b49042b8` (merged B35). Previously accepted real Linux/X11 compact window screenshot is evidence of **poor space allocation**, not of an incorrect PDF renderer: a fixed provisional guide consumes the center height and exact PDF whole-page zoom truthfully falls near 7%. Source macro bytes are not relevant to the display-only focus switch and must remain untouched.

B-only implementation: explicit Split-center toggle chooses C-backed provisional drawing guide versus enlarged read-only external XeLaTeX PDF. Shared code editor and property inspector remain visible in both; active guide input is cancelled on entering PDF. New real egui UNIT_EVENT regression drives the production toggle with pointer press/release, checks height/fit, then toggles back, with unchanged opaque Unicode/CRLF source and empty Undo history. No own TeX/CAS/solver or PDF-to-source coordinate inversion.

**Evidence at authoring:** source-level fix + event test authored; exact branch CI is PENDING until checked. This event test alone is UNIT_EVENT, **not** a physical Win10/M1/M4 result. Follow-up independent X11 must photograph both modes at 1180×680 and ensure PDF page is readable with the code still present. Windows 10 with separate MiKTeX and Apple Silicon M1/M4 GUI remain NOT_RUN.
