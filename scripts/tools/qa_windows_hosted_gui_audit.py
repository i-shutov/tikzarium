#!/usr/bin/env python3
"""Check original native GitHub-hosted Windows HWND/F1 evidence, not physical W2/W3."""
from __future__ import annotations
import argparse
import hashlib
import json
from pathlib import Path

from qa_windows_capture_geometry import validate_capture_geometry
from qa_windows_capture_evidence import inspect_png, require, validate_identity

PARTIAL = 'HOSTED_REAL_NATIVE_WINDOW_PARTIAL_NOT_PHYSICAL'

def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()

def png_size(path: Path) -> tuple[int, int]:
    """Validate decoded original pixels, not merely PNG metadata and CRC."""
    frame = inspect_png(path)
    return frame.width, frame.height


def validate(root: Path, expected_sha: str) -> dict:
    report = json.loads((root / 'hosted-windows-native-gui.json').read_text(encoding='utf-8-sig'))
    validate_identity(report, expected_sha)
    require(report['source_sha'] == expected_sha, 'Exact source SHA mismatch')
    require(report['environment'] == 'GITHUB_HOSTED_WINDOWS_2022', "Original evidence contract failed: report['environment'] == 'GITHUB_HOSTED_WINDOWS_2022'")
    require(report['physical_windows10'] == 'NOT_RUN', "Original evidence contract failed: report['physical_windows10'] == 'NOT_RUN'")
    require(report['full_w2_qualification'] == 'NOT_RUN', "Original evidence contract failed: report['full_w2_qualification'] == 'NOT_RUN'")
    for field in ('gesture_six','source_patch','save_open','native_dialogs','ime','dpi_200','gui_xelatex_pdf'):
        require(report[field] == 'NOT_RUN', 'False full desktop qualification: ' + field)
    status = report['status']
    if status == PARTIAL:
        require(report['preflight'] == 'ELIGIBLE_FOR_WINDOW_PROBE_NOT_W2_PASS', "Original evidence contract failed: report['preflight'] == 'ELIGIBLE_FOR_WINDOW_PROBE_NOT_W2_PASS'")
        require(report['window_screenshot'] == 'CAPTURED_CLIENT_PRINTWINDOW_NO_SCREEN_READ_NOT_MANUALLY_REVIEWED', "Original evidence contract failed: report['window_screenshot'] == 'CAPTURED_CLIENT_PRINTWINDOW_NO_SCREEN_READ_NOT_MANUALLY_REVIEWED'")
        require(report['capture_method'] == 'WIN32_PRINTWINDOW_PW_CLIENTONLY_RENDERFULLCONTENT_NO_SCREEN_READ', "Original evidence contract failed: report['capture_method'] == 'WIN32_PRINTWINDOW_PW_CLIENTONLY_RENDERFULLCONTENT_NO_SCREEN_READ'")
        validate_capture_geometry(report)
        client = report['client_area']
        window = report['window']
        require(640 <= client['width'] <= window['width'] <= 10000, "Original evidence contract failed: 640 <= client['width'] <= window['width'] <= 10000")
        require(360 <= client['height'] <= window['height'] <= 10000, "Original evidence contract failed: 360 <= client['height'] <= window['height'] <= 10000")
        require(client['left'] >= window['left'] and client['top'] >= window['top'], "Original evidence contract failed: client['left'] >= window['left'] and client['top'] >= window['top']")
        require(report['client_sample_colors'] >= 8, "Original evidence contract failed: report['client_sample_colors'] >= 8")
        require(report['client_unpainted_samples'] == 0, "Original evidence contract failed: report['client_unpainted_samples'] == 0")
        require(report['window']['visible'] is True, "Original evidence contract failed: report['window']['visible'] is True")
        require(report['window']['owner_pid'] == report['pid'], "Original evidence contract failed: report['window']['owner_pid'] == report['pid']")
        require('TikZarium' in report['window']['title'], "Original evidence contract failed: 'TikZarium' in report['window']['title']")
        require(report['window_station'] == 'WinSta0' and report['desktop'] == 'Default', "Original evidence contract failed: report['window_station'] == 'WinSta0' and report['desktop'] == 'Default'")
        require(report['input_desktop'] == 'Default', 'Input desktop locked or inaccessible')
        require(report['wts_connection_state'] == 0, 'WTS session disconnected')
        require(report['session_id'] > 0, "Original evidence contract failed: report['session_id'] > 0")
        first = root / 'hosted-window/real-window-before-f1.png'
        require(first.is_file(), 'Original evidence contract failed: first.is_file()')
        require(sha256(first) == report['first_png_sha256'], "Original evidence contract failed: sha256(first) == report['first_png_sha256']")
        first_pixels = inspect_png(first)
        require((first_pixels.width, first_pixels.height) == (client['width'], client['height']), 'Original PNG/client geometry mismatch')
        require(report['f1'] in ('KEY_SENT_REAL_WINDOW_SCREENSHOTS_REQUIRE_VISUAL_REVIEW', 'BLOCKED_FOCUS_LOST_AFTER_KEY'), 'Unknown F1 evidence state')
        if report['f1'] == 'KEY_SENT_REAL_WINDOW_SCREENSHOTS_REQUIRE_VISUAL_REVIEW':
            second = root / 'hosted-window/real-window-after-f1.png'
            require(second.is_file(), 'Original evidence contract failed: second.is_file()')
            require(sha256(second) == report['second_png_sha256'], "Original evidence contract failed: sha256(second) == report['second_png_sha256']")
            second_pixels = inspect_png(second)
            require((second_pixels.width, second_pixels.height) == (first_pixels.width, first_pixels.height), 'F1 PNG/client geometry changed')
            require(second_pixels.pixel_sha256 != first_pixels.pixel_sha256, 'F1 changed only PNG encoding/metadata, not rendered pixels')
            require(sha256(second) != sha256(first), 'F1 screenshot did not change visually')
        require(report.get('child_terminated') is True, "Original evidence contract failed: report.get('child_terminated') is True")
    elif status.startswith('BLOCKED_'):
        require(report.get('error'), 'Blocked state must include reason')
        require(report['window_screenshot'] == 'NOT_RUN', 'Blocked report must not claim screenshot')
        if status == 'BLOCKED_NO_VISIBLE_OWNED_WINDOW':
            raise ValueError('Native GUI failed to show an owned window on an otherwise eligible desktop')
    else:
        raise ValueError(f'Unrecognized W2 status: {status}')
    return {'status':status,'source_sha':expected_sha,
            'window_png_sha256':report.get('first_png_sha256'),
            'f1_png_sha256':report.get('second_png_sha256'),
            'full_w2_qualification':'NOT_RUN','physical_windows10':'NOT_RUN',
            'f1_evidence':report.get('f1'), 'visual_review':'REQUIRED_NOT_AUTOMATED'}

def main():
    p = argparse.ArgumentParser()
    p.add_argument('--root', type=Path, required=True)
    p.add_argument('--source-sha', required=True)
    a = p.parse_args()
    result = validate(a.root, a.source_sha)
    (a.root / 'independent-hosted-window-audit.json').write_text(
        json.dumps(result, indent=2, ensure_ascii=False) + '\n', encoding='utf-8')
    print('HOSTED_NATIVE_WINDOW_EVIDENCE=' + result['status'] + '_NOT_FULL_W2_PASS')

if __name__ == '__main__':
    main()
