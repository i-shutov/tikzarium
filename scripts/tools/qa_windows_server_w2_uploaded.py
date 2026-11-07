#!/usr/bin/env python3
"""Check original uploaded server GUI evidence without claiming full W2 acceptance."""
from __future__ import annotations
import argparse
import hashlib
import json
from pathlib import Path
import struct

PARTIAL = 'PARTIAL_W2_REAL_VISIBLE_WINDOW_EVIDENCE_NOT_FULL_ACCEPTANCE'

def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()

def png_size(path: Path) -> tuple[int, int]:
    data = path.read_bytes()
    if len(data) < 33 or data[:8] != b'\x89PNG\r\n\x1a\n' or data[12:16] != b'IHDR':
        raise ValueError('Invalid original PNG header')
    w, h = struct.unpack('>II', data[16:24])
    if w < 800 or h < 450 or w > 10000 or h > 10000:
        raise ValueError('Unexpected GUI screenshot geometry')
    return w, h

def validate(root: Path, expected_sha: str) -> dict:
    report = json.loads((root / 'windows-server-w2-interactive.json').read_text(encoding='utf-8-sig'))
    assert report['source_sha'] == expected_sha, 'Exact source SHA mismatch'
    assert report['environment'] == 'PERSONAL_WINDOWS_SERVER'
    assert report['physical_windows10'] == 'NOT_RUN'
    assert report['full_w2_qualification'] == 'NOT_RUN'
    for field in ('gesture_six','source_patch','save_open','native_dialogs','ime','dpi_200','gui_xelatex_pdf'):
        assert report[field] == 'NOT_RUN', 'False full desktop qualification: ' + field
    status = report['status']
    if status == PARTIAL:
        assert report['preflight'] == 'ELIGIBLE_FOR_WINDOW_PROBE_NOT_W2_PASS'
        assert report['window_screenshot'] == 'CAPTURED_OWN_GUI_NOT_MANUALLY_REVIEWED'
        assert report['window']['visible'] is True
        assert report['window']['owner_pid'] == report['pid']
        assert 'TikZarium' in report['window']['title']
        assert report['window_station'] == 'WinSta0' and report['desktop'] == 'Default'
        assert report['input_desktop'] == 'Default', 'Input desktop locked or inaccessible'
        assert report['wts_connection_state'] == 0, 'WTS session disconnected'
        assert report['session_id'] > 0
        first = root / 'w2-interactive/real-window-before-f1.png'
        assert first.is_file()
        assert sha256(first) == report['first_png_sha256']
        assert png_size(first) == (report['window']['width'], report['window']['height'])
        if report['f1'] == 'KEY_SENT_REAL_WINDOW_SCREENSHOTS_REQUIRE_VISUAL_REVIEW':
            second = root / 'w2-interactive/real-window-after-f1.png'
            assert second.is_file()
            assert sha256(second) == report['second_png_sha256']
            assert png_size(second) == png_size(first)
        assert report.get('child_terminated') is True
    elif status.startswith('BLOCKED_'):
        assert report.get('error'), 'Blocked state must include reason'
    else:
        raise ValueError(f'Unrecognized W2 status: {status}')
    return {'status':status,'source_sha':expected_sha,
            'window_png_sha256':report.get('first_png_sha256'),
            'f1_png_sha256':report.get('second_png_sha256'),
            'full_w2_qualification':'NOT_RUN','physical_windows10':'NOT_RUN'}

def main():
    p = argparse.ArgumentParser()
    p.add_argument('--root', type=Path, required=True)
    p.add_argument('--source-sha', required=True)
    a = p.parse_args()
    result = validate(a.root, a.source_sha)
    (a.root / 'independent-w2-window-audit.json').write_text(
        json.dumps(result, indent=2, ensure_ascii=False) + '\n', encoding='utf-8')
    print('W2_ORIGINAL_EVIDENCE=' + result['status'] + '_NOT_FULL_W2_PASS')

if __name__ == '__main__':
    main()
