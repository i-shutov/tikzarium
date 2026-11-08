#!/usr/bin/env python3
"""Independently audit ORIGINAL physical W2b stage1 input+GUI Save, never full W2b.

No Python assert: optimization -O/-OO cannot promote a failure.
No source/PDF is synthesized as a GUI output by this auditor.
"""
from __future__ import annotations
import argparse
import hashlib
import json
from pathlib import Path
import sys

from qa_windows_capture_evidence import EvidenceError, PngEvidence, inspect_png, require
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
from qa_n1_desktop import owners, original_preserved

STAGE1 = 'STAGE1_REAL_LINE_GUI_SOURCE_PASS_NOT_FULL_W2B'
W2A = 'PARTIAL_W2_REAL_VISIBLE_WINDOW_EVIDENCE_NOT_FULL_ACCEPTANCE'


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def read_json(path: Path) -> dict:
    return json.loads(path.read_text(encoding='utf-8-sig'))


def validate(root: Path, expected_sha: str) -> dict:
    require(len(expected_sha) == 40 and all(c in '0123456789abcdef' for c in expected_sha),
            'W2b needs exact lower-case full Git SHA')
    w2a = read_json(root / 'windows-server-w2-interactive.json')
    require(w2a.get('source_sha') == expected_sha and w2a.get('environment') == 'PERSONAL_WINDOWS_SERVER',
            'Wrong W2a original physical source or host')
    require(w2a.get('status') == W2A and w2a.get('physical_windows10') == 'NOT_RUN',
            'Original W2a must be an independently accepted partial GUI result')
    require(w2a.get('full_w2_qualification') == 'NOT_RUN',
            'W2a must not masquerade as whole W2b acceptance')
    require(w2a.get('f1') == 'KEY_SENT_REAL_WINDOW_SCREENSHOTS_REQUIRE_VISUAL_REVIEW',
            'Original independent W2a F1 evidence is missing')
    folder = root / 'w2-interactive' / 'w2b-stage1'
    stage = read_json(folder / 'w2b-stage1-original.json')
    require(stage.get('source_sha') == expected_sha and
            stage.get('environment') == 'PERSONAL_WINDOWS_SERVER',
            'W2b real stage has wrong source or host')
    require(stage.get('full_w2b_qualification') == 'NOT_RUN' and
            stage.get('physical_windows10') == 'NOT_RUN',
            'Stage1 cannot claim whole W2b or physical Windows10')
    for field in ('gui_open', 'ime', 'gui_xelatex_pdf'):
        require(stage.get(field) == 'NOT_RUN', 'Stage1 forged untested ' + field)
    status = stage.get('status')
    if status == 'BLOCKED_STAGE1':
        require(bool(stage.get('error')), 'Blocked W2b stage requires original reason')
        require(stage.get('gui_save') == 'NOT_RUN' and stage.get('source_patch') == 'NOT_RUN',
                'Blocked W2b cannot forge saved native source')
        return dict(status=status, source_sha=expected_sha,
                    w2b_full='NOT_RUN', win10_w3='NOT_RUN',
                    reason=stage['error'])
    require(status == STAGE1, 'W2b stage1 must be explicit PASS-stage-only or BLOCKED')
    require(stage.get('exact_additive_patch') == 'PASS_ADDITIVE_DRAW_EXACT_SOURCE_PRESERVATION',
            'Stage1 did not record live strict UTF-8 and byte-exact additive source check')
    require(stage.get('preflight') == 'ELIGIBLE_ONE_LINE_NOT_W2B_PASS',
            'W2b preflight was not own active RDP at reviewed 125% viewport')
    require(stage.get('input_method') == 'WIN32_REAL_MOUSE_EVENTS_OWNED_HWND_PMV2',
            'No native OS-owned pointer gestures')
    require(stage.get('gui_save') == 'PASS_REAL_GUI_SOURCE_SAVE' and
            stage.get('source_patch') == 'PASS_ONE_C_OWNED_LINE_PREAMBLE_PRESERVED',
            'Stage did not verify original GUI Save and source patch')
    require(stage.get('six_gestures') == 'NOT_RUN_FIVE_MORE_TO_TEST',
            'One line cannot prove six true tools')
    g = stage.get('geometry') or {}
    require(g.get('owner_pid') == w2a.get('pid') and int(g.get('owner_pid',0)) > 0,
            'W2b input geometry does not belong to same W2a native process')
    require(g.get('window_dpi') == 120 and
            g.get('coordinate_space') == 'PHYSICAL_PIXELS_PER_MONITOR_V2' and
            g.get('dpi_context_restored') is True,
            'W2b input lacks restored, physical 125% geometry')
    require(1450 <= g.get('width',0) <= 1510 and 825 <= g.get('height',0) <= 880,
            'W2b input used wrong/reflowed client viewport')
    # Real Windows Save As must be an app-owned modal and supply original pixels.
    native = stage.get('native_save_dialog') or {}
    require(native.get('status') == 'PASS_OWNED_NATIVE_SAVE_DIALOG' and
            native.get('class') == '#32770' and
            native.get('process_id') == w2a.get('pid') and
            native.get('dpi_context_restored') is True,
            'Same-PID native Save As proof is required')
    require(str(native.get('chosen_source_path', '')).replace('\\', '/').endswith('/w2-interactive/figure.tex'),
            'GUI Save As path was not the isolated physical stage target')
    dialog_png = folder / '00-real-owned-save-dialog.png'
    require(native.get('original_dialog_png') == dialog_png.name and dialog_png.is_file(),
            'Original native Save As client screenshot missing')
    require(sha256(dialog_png) == native.get('original_dialog_png_sha256'),
            'Tampered native Save As PNG')
    dialog_pixels = inspect_png(dialog_png)
    require(400 <= dialog_pixels.width <= 2500 and
            250 <= dialog_pixels.height <= 1600 and dialog_pixels.sampled_colors >= 8,
            'Blank/implausible native Save As client frame')
    before = folder / 'stage1-original-before.tex'
    after = folder / 'stage1-original-gui-saved.tex'
    require(stage.get('baseline_source_copy') == before.name and
            stage.get('saved_source_copy') == after.name and
            before.is_file() and after.is_file(),
            'Original before/after GUI-saved .tex bytes missing')
    require(sha256(before) == stage.get('baseline_sha256') and
            sha256(after) == stage.get('source_sha256'),
            'Original source file hash mismatch')
    require(native.get('saved_source_sha256') == stage.get('baseline_sha256'),
            'Native Windows Save As did not create exact baseline source bytes')
    final_original = root / 'w2-interactive' / 'figure.tex'
    require(final_original.is_file() and sha256(final_original) == stage.get('source_sha256'),
            'Actual full GUI-saved figure.tex file missing or changed from evidence')
    before_bytes, after_bytes = before.read_bytes(), after.read_bytes()
    require(before_bytes != after_bytes, 'GUI gesture did not change source bytes')
    try:
        parsed = owners(after_bytes)
    except (ValueError, UnicodeError) as exc:
        raise EvidenceError('Malformed/duplicate native C-owned TikZ metadata') from exc
    require(len(parsed) == 1 and parsed[0]['tool'] == 'line' and
            stage.get('owner_count') == 1,
            'Source was not one valid C-catalogue native TikZ line')
    require(original_preserved(before_bytes, after_bytes),
            'Original TeX/macro/comments/line endings changed outside owned command')
    pngs = (
        folder / '00-before-palette.png',
        folder / '01-real-geometry-palette.png',
        folder / '02-real-line-saved.png',
    )
    require(all(p.is_file() for p in pngs), 'Missing original client-only PNG stage')
    frames = [inspect_png(p) for p in pngs]
    require(all((p.width,p.height) == (g['width'],g['height']) for p in frames),
            'W2b client pixels changed dimensions after OS input')
    require(len({p.pixel_sha256 for p in frames}) == 3,
            'Original palette/line frames did not change rendered pixels')
    return dict(status=STAGE1, source_sha=expected_sha,
                baseline_source_sha256=sha256(before),
                gui_source_sha256=sha256(after),
                native_save_dialog_sha256=sha256(dialog_png),
                native_save_dialog_pixel_sha256=dialog_pixels.pixel_sha256,
                images_sha256={p.name:sha256(p) for p in pngs},
                images_pixel_sha256={p.name:frame.pixel_sha256 for p,frame in zip(pngs,frames)},
                actual_native_line_id=parsed[0]['id'],
                w2b_full='NOT_RUN', win10_w3='NOT_RUN',
                manual_palette_review='REQUIRED_NOT_AUTO_PASS')


def main() -> None:
    p=argparse.ArgumentParser()
    p.add_argument('--root',type=Path,required=True)
    p.add_argument('--source-sha',required=True)
    a=p.parse_args()
    result=validate(a.root,a.source_sha)
    (a.root/'independent-w2b-stage1-audit.json').write_text(
        json.dumps(result,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
    print('W2B_ORIGINAL_STAGE1='+result['status']+'_NOT_FULL_W2B_NOT_WIN10')


if __name__=='__main__':
    main()
