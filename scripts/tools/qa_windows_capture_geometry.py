"""Reject DPI-virtualized/cropped HWND evidence; never infer physical GUI PASS."""
from __future__ import annotations

from qa_windows_capture_evidence import require

SPACE = 'PHYSICAL_PIXELS_PER_MONITOR_V2'


def validate_capture_geometry(report: dict) -> None:
    window = report['window']
    client = report['client_area']
    require(client['left'] >= window['left'] and client['top'] >= window['top'], "Original evidence contract failed: client['left'] >= window['left'] and client['top'] >= window['top']")
    require(client['left'] + client['width'] <= window['left'] + window['width'], "Original evidence contract failed: client['left'] + client['width'] <= window['left'] + window['width']")
    require(client['top'] + client['height'] <= window['top'] + window['height'], "Original evidence contract failed: client['top'] + client['height'] <= window['top'] + window['height']")
    version = report.get('schema_version', 1)
    # Old reports cannot establish complete pixels at non-100% scaling. This
    # explicitly rejects the original cropped 125% personal run #42450616810.
    if version < 3:
        require(window.get('dpi', 96) == 96, 'Legacy non-100%-DPI capture lacks physical-pixel proof')
        return
    require(report['coordinate_space'] == SPACE, "Original evidence contract failed: report['coordinate_space'] == SPACE")
    require(96 <= window['dpi'] <= 768, 'Unexpected or missing native window DPI')
    screen = report['screen']
    require(screen['left'] <= window['left'] and screen['top'] <= window['top'], "Original evidence contract failed: screen['left'] <= window['left'] and screen['top'] <= window['top']")
    require(window['left'] + window['width'] <= screen['left'] + screen['width'], "Original evidence contract failed: window['left'] + window['width'] <= screen['left'] + screen['width']")
    require(window['top'] + window['height'] <= screen['top'] + screen['height'], "Original evidence contract failed: window['top'] + window['height'] <= screen['top'] + screen['height']")
    fields = ['geometry_preflight', 'capture_geometry_before']
    if report['f1'] == 'KEY_SENT_REAL_WINDOW_SCREENSHOTS_REQUIRE_VISUAL_REVIEW':
        fields.append('capture_geometry_after')
    for field in fields:
        proof = report[field]
        require(proof['coordinate_space'] == SPACE, 'Mixed virtual and physical coordinates')
        require(proof['capture_dpi_context'] == 'PER_MONITOR_AWARE_V2', "Original evidence contract failed: proof['capture_dpi_context'] == 'PER_MONITOR_AWARE_V2'")
        require(proof['dpi_context_restored'] is True, 'Capture leaked helper-thread DPI context')
        require(isinstance(proof['caller_dpi_context'], str) and proof['caller_dpi_context'] not in ('', '0'), "Original evidence contract failed: isinstance(proof['caller_dpi_context'], str) and proof['caller_dpi_context'] not in ('', '0')")
        require(proof['window_dpi'] == window['dpi'], "Original evidence contract failed: proof['window_dpi'] == window['dpi']")
        require(proof['owner_pid'] == report['pid'], "Original evidence contract failed: proof['owner_pid'] == report['pid']")
        require(isinstance(proof['hwnd'], str) and proof['hwnd'].isdigit() and int(proof['hwnd']) > 0, "Original evidence contract failed: isinstance(proof['hwnd'], str) and proof['hwnd'].isdigit() and int(proof['hwnd']) > 0")
        for key in ('left', 'top', 'width', 'height'):
            require(proof[key] == client[key], 'Measured physical client and PNG report disagree')
            require(proof['window_' + key] == window[key], "Original evidence contract failed: proof['window_' + key] == window[key]")
            require(proof['screen_' + key] == screen[key], "Original evidence contract failed: proof['screen_' + key] == screen[key]")
        require(proof['hwnd'] == report['capture_geometry_before']['hwnd'], "Original evidence contract failed: proof['hwnd'] == report['capture_geometry_before']['hwnd']")
