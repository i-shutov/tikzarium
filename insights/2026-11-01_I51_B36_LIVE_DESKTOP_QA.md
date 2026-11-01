# I51 — why B36 needs independent X11 evidence

Observed previous B35 physical X11 screenshot: compact 1180×680 PDF short strip, fit about 7%. B36 #79 added an explicit center focus switch and UNIT_EVENT assertion about taller PDF area; that validates a Rust egui event frame, **not** a user-visible native window.

On B36 HEAD `af75b0402bdf9c99dd18999fc5a4f6eb4c974e23`, existing I46/I47 CI reported failure in the old **B35 source-tree preflight** `46aced2...`, so neither launched the B36 GUI. The new B36 tree is `276ad1525db4ef3d3aab4624808453a897ad5b6a`. I51 pins that source tree in both workflows and profiles, adds candidate real X11 focus/return events, source-byte guards, and visual frames. The new click positions are **not yet calibrated**; their frame difference must not be called proof of hitting the correct control. Past six-gesture and dirty-Open gates remain, even if they expose shifted coordinates.

Evidence until fresh CI and independent artifacts: B36 real GUI **NOT_RUN**; B36 focus visual acceptance **NOT_RUN**; physical Windows 10 MiKTeX and Mac M1/M4 **NOT_RUN**. No release.

## First actual X11 I51 result and calibrated correction

- [I46 #41329108921](https://github.com/i-shutov/tikzarium/actions/runs/41329108921) **automated SUCCESS** on QA `e6389d6a`; independently downloaded artifact `13092083442`, 21/21 SHA, genuine B36 modal red foreground error, victim/occupied CRLF untouched, scratch saved separately, Undo fenced, real GUI XeLaTeX PDF with extractable Cyrillic and embedded DejaVuSerif. Manual screenshots 06/12 reviewed. This is hosted Linux/X11, not Win10/Mac.
- [I47 #41329108813](https://github.com/i-shutov/tikzarium/actions/runs/41329108813) **FAILED at compact Fit Page**, after all six distinct native GUI pointer gestures, held-click and held-drag XTest Ctrl+Z, source save, F1 frame toggles, GUI PDF, zoom/fit frames. Downloaded artifact `13092567737`: actual B36 screenshots 04d/04e2 prove the earlier **B35 coordinate profile hit different controls**. In particular [882,72] clicked **PDF крупно**, not Zoom Out, and [680,98] was no longer compact Fit Page. This is **QA calibration failure**, not demonstrated B36 application failure.
- Recalibrated first-row vs wrapped second/third-row at 1366×740 and 1180×680 using actual B36 screenshots. Fixed all Fit width/Zoom Out/Fit Page clicks and PDF-focus/return clicks. Added explicit pixel-selected-button guard at real X11 coordinates, while **whole-page PDF visual remains NOT_RUN until a new exact-head screenshot review**.
