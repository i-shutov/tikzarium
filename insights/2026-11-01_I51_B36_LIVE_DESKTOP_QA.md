# I51 — why B36 needs independent X11 evidence

Observed previous B35 physical X11 screenshot: compact 1180×680 PDF short strip, fit about 7%. B36 #79 added an explicit center focus switch and UNIT_EVENT assertion about taller PDF area; that validates a Rust egui event frame, **not** a user-visible native window.

On B36 HEAD `af75b0402bdf9c99dd18999fc5a4f6eb4c974e23`, existing I46/I47 CI reported failure in the old **B35 source-tree preflight** `46aced2...`, so neither launched the B36 GUI. The new B36 tree is `276ad1525db4ef3d3aab4624808453a897ad5b6a`. I51 pins that source tree in both workflows and profiles, adds candidate real X11 focus/return events, source-byte guards, and visual frames. The new click positions are **not yet calibrated**; their frame difference must not be called proof of hitting the correct control. Past six-gesture and dirty-Open gates remain, even if they expose shifted coordinates.

Evidence until fresh CI and independent artifacts: B36 real GUI **NOT_RUN**; B36 focus visual acceptance **NOT_RUN**; physical Windows 10 MiKTeX and Mac M1/M4 **NOT_RUN**. No release.
