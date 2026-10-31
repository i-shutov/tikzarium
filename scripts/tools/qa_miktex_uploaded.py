#!/usr/bin/env python3
"""Independent Linux audit of the *uploaded* Windows Server MiKTeX/N1 artifact.

Run only after the real Windows CI job has uploaded its evidence. No TeX setup,
no newly authored fixture, and no inference about physical Windows 10 or GUI.
"""
from __future__ import annotations

import argparse
import hashlib
import json
from pathlib import Path
import re
import subprocess
import sys

PINNED_INSTALLER_SHA256 = '14b42dd9f4b4a7813a8bfd69c8f99316c2888cc4ee26f631f397e163d85d6c62'
BANNER = re.compile(r'^This is XeTeX, Version [^()\r\n]+ \(MiKTeX 25\.12\)(?:\s|$)')
EXPECTED = (
    ('proof with spaces Кириллица/main.pdf', ['Примитивы TikZ', 'Кривая Безье'], ['DejaVuSerif', 'LatinModernMath']),
    ('proof with spaces Кириллица/direct/main.pdf', ['Примитивы TikZ', 'Кривая Безье'], ['DejaVuSerif', 'LatinModernMath']),
    ('N1 project Кириллица with spaces/PDF text/text.pdf', ['Геометрия', 'оптика'], ['DejaVuSerif']),
    ('N1 project Кириллица with spaces/PDF text/direct/authoring.pdf', ['Геометрия', 'оптика'], ['DejaVuSerif']),
    ('N1 project Кириллица with spaces/PDF math/math.pdf', ['𝛼', '𝛽'], ['LatinModernMath']),
    ('N1 project Кириллица with spaces/PDF math/direct/math-authoring.pdf', ['𝛼', '𝛽'], ['LatinModernMath']),
)


def require(ok: bool, message: str) -> None:
    if not ok:
        raise ValueError(message)


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def json_file(path: Path) -> dict:
    result = json.loads(path.read_text(encoding='utf-8-sig'))
    require(isinstance(result, dict), f'Not an object: {path}')
    return result


def banner(path: Path) -> bool:
    try:
        return bool(BANNER.match(path.read_text(encoding='utf-8-sig', errors='replace').splitlines()[0]))
    except (FileNotFoundError, IndexError):
        return False


def pdf_fonts_embedded(output: str, names: list[str]) -> bool:
    rows = [line.split() for line in output.splitlines()[2:] if line.strip()]
    return (bool(rows) and all(len(row) >= 6 and row[-5] == 'yes' for row in rows)
            and all(any(font in ' '.join(row[:-5]) and row[-5] == 'yes'
                        for row in rows) for font in names))


def cmd(*args: str) -> str:
    p = subprocess.run(args, stdout=subprocess.PIPE, stderr=subprocess.PIPE, check=False, timeout=30)
    require(p.returncode == 0, f'{args[0]} failed: {p.stderr.decode(errors="replace")[:300]}')
    return p.stdout.decode('utf-8', errors='strict')


def actual_pdf(path: Path, text: list[str], fonts: list[str]) -> dict:
    require(path.is_file() and path.stat().st_size > 500, f'Missing/too short PDF: {path}')
    b = path.read_bytes()
    require(b.startswith(b'%PDF-') and b.rstrip().endswith(b'%%EOF'), f'Invalid PDF framing: {path}')
    info = cmd('pdfinfo', str(path))
    require(re.search(r'(?m)^Pages:\s*1\s*$', info) is not None, f'Page count != 1: {path}')
    extracted = cmd('pdftotext', '-enc', 'UTF-8', str(path), '-')
    require(all(fragment in extracted for fragment in text), f'Missing extracted Unicode glyphs: {path}')
    fonts_text = cmd('pdffonts', str(path))
    require(pdf_fonts_embedded(fonts_text, fonts), f'Missing/nonembedded fonts: {path}')
    return {'sha256': hashlib.sha256(b).hexdigest(), 'text': text, 'embedded_fonts': fonts}


def same_hash(path: Path, expected: str | None, label: str) -> None:
    require(isinstance(expected, str) and re.fullmatch(r'[0-9a-f]{64}', expected) is not None,
            f'Invalid declared SHA for {label}')
    require(path.is_file() and sha256(path) == expected, f'Bytes differ: {label}')


def audit(root: Path, source_sha: str, checkout_sha: str) -> dict:
    require(re.fullmatch(r'[0-9a-f]{40}', source_sha) is not None, 'Invalid source commit SHA')
    require(re.fullmatch(r'[0-9a-f]{40}', checkout_sha) is not None, 'Invalid checkout commit SHA')
    setup, stage, q = (json_file(root / f) for f in ('setup.json', 'setup-stage.json', 'miktex-qa.json'))
    require(q.get('accepted') is True and q.get('commit_sha') == checkout_sha
            and q.get('source_head_sha') == source_sha, 'Unexpected report status/commit binding')
    require(q.get('physical_win10') == 'NOT_RUN' and q.get('physical_mac_m1_m4') == 'NOT_RUN'
            and q.get('mouse_authoring') == 'NOT_RUN', 'False target-host acceptance')
    require(q.get('runner') == 'Windows' and q.get('runner_arch') == 'X64'
            and 'Windows-2022Server-' in q.get('host', ''), 'Wrong hosted runner')
    require(setup.get('installer_sha256') == PINNED_INSTALLER_SHA256
            and setup.get('private_install') is True and setup.get('no_registry') is True
            and setup.get('auto_install_config_readback') == '0'
            and setup.get('target_windows10') == 'NOT_RUN', 'Unverified private installer/offline policy')
    require(stage.get('status') == 'SETUP_COMPLETE' and stage.get('stage') == 'setup-complete'
            and stage.get('installer_sha256') == PINNED_INSTALLER_SHA256
            and stage.get('xelatex_path') == setup.get('xelatex_path')
            and stage.get('auto_install_config_readback') == '0', 'Incomplete/mismatched setup stage')
    require('MiKTeX 25.12' in str(q.get('xelatex_version'))
            and str(q.get('xelatex_path')) == setup.get('xelatex_path'), 'Wrong compiler identity')
    for root_key, report_key in [('user_install','UserInstall'),('user_config','UserConfig'),('user_data','UserData')]:
        expected = setup.get(root_key)
        require(isinstance(expected, str) and 'tikzarium-miktex-private' in expected.lower(), 'Non-private TEXMF root')
        for name in ('texmf-roots-preflight.log', 'texmf-roots-post-provision.log'):
            lines = (root / name).read_text(errors='replace').splitlines()
            actual = [line.split(': ',1)[1] for line in lines if line.startswith(report_key + ': ')]
            require(actual == [expected], f'Effective {report_key} root escaped in {name}')
    before = (root / 'packages-before.txt').read_bytes()
    after = (root / 'packages-after.txt').read_bytes()
    require(before == after and len(before.splitlines()) >= 100, 'Package inventory mutated or missing')
    results = q.get('results')
    require(isinstance(results, list) and len(results) == 4, 'Missing or extra result')
    byid = {x.get('id'): x for x in results}
    require(set(byid) == {'native-primitives', 'n1-app-session-generated', 'missing-library', 'lua-only'}
            and all(x.get('status') == 'PASS' for x in byid.values()), 'Reported test failure/missing ID')
    base = byid['native-primitives']
    require(base.get('source_unchanged') is True and base.get('cli_tex_identity') is True
            and base.get('direct_tex_identity') is True and not base.get('cli_missing_character')
            and not base.get('direct_missing_character')
            and len(base.get('primitive_tokens', {})) == 6
            and all(base['primitive_tokens'].values()), 'Baseline primitive/engine proof incomplete')
    same_hash(root / 'proof with spaces Кириллица/main.tex', base.get('source_sha256'), 'baseline TeX')
    n1 = byid['n1-app-session-generated']
    state = json_file(root / 'N1 project Кириллица with spaces/session output/authoring-state.json')
    require(state == n1.get('session_state') and state.get('source_head_sha') == source_sha
            and state.get('status') == 'PASS_AUTHORING_STATE_ONLY'
            and state.get('gui_pointer_clicks') == 'NOT_RUN' and state.get('command_count') == 6,
            'N1 Session generator/authoring provenance failed')
    variants = {v['name']: v for v in n1.get('variants', [])}
    require(set(variants) == {'text', 'math'}, 'Missing N1 text/math variant')
    for kind, source in [('text','authoring.tex'),('math','math-authoring.tex')]:
        v = variants[kind]
        tex = root / 'N1 project Кириллица with spaces/session output' / source
        require(v.get('status') == 'PASS' and v.get('source_sha256_before') == v.get('source_sha256_after')
                and v.get('cli_tex_identity') is True and v.get('direct_tex_identity') is True
                and v.get('missing_character') is False, f'N1 {kind} source/engine failed')
        same_hash(tex, v.get('source_sha256_before'), f'N1 {kind} TeX')
        require(r'\newcommand{\UserPath}{\path (0,0);}' in tex.read_text(encoding='utf-8'), 'Opaque user macro lost')
    paths = [
        ('proof with spaces Кириллица/main.pdf', base, 'cli_pdf_sha256', 'proof with spaces Кириллица/cli-main.log', 'cli_log_sha256'),
        ('proof with spaces Кириллица/direct/main.pdf', base, 'direct_pdf_sha256', 'proof with spaces Кириллица/direct/main.log', 'direct_log_sha256'),
    ]
    for name, v in variants.items():
        sub = 'PDF ' + name
        stem = 'authoring' if name == 'text' else 'math-authoring'
        paths.extend([
            (f'N1 project Кириллица with spaces/{sub}/{name}.pdf', v, 'cli_pdf_sha256', f'N1 project Кириллица with spaces/{sub}/{name}.log', 'cli_log_sha256'),
            (f'N1 project Кириллица with spaces/{sub}/direct/{stem}.pdf', v, 'direct_pdf_sha256', f'N1 project Кириллица with spaces/{sub}/direct/{stem}.log', 'direct_log_sha256')
        ])
    checked = {}
    for pdf, record, pdf_hash_key, texlog, log_hash_key in paths:
        spec = next(((text,fonts) for path,text,fonts in EXPECTED if path == pdf), None)
        require(spec is not None, f'No independent PDF spec: {pdf}')
        evidence = actual_pdf(root / pdf, *spec)
        same_hash(root / pdf, record.get(pdf_hash_key), pdf)
        same_hash(root / texlog, record.get(log_hash_key), texlog)
        require(banner(root / texlog), f'Wrong actual MiKTeX log: {texlog}')
        require('Missing character:' not in (root / texlog).read_text(errors='replace'), f'Lost glyph warning: {texlog}')
        checked[pdf] = evidence
    for case, logfile, error in [
        ('missing-library', 'missing-library.log', 'tikzarium_qa_nonexistent_8f7d41'),
        ('lua-only', 'graphdrawing-lua.log', 'needtorunluatextousethegraphdrawinglibrary')]:
        rec = byid[case]
        dest = root / case
        log = dest / logfile
        same_hash(log, rec.get('log_sha256'), case + ' log')
        require(banner(log) and rec.get('tex_identity') is True and rec.get('exit_code') != 0
                and rec.get('pdf_exists') is False and rec.get('source_sha256_before') == rec.get('source_sha256_after')
                and not list(dest.rglob('*.pdf')), 'Invalid negative engine/outcome')
        contents = re.sub(r'\s+', '', log.read_text(errors='replace')).lower()
        require(error in contents, f'Incomplete error in {case}')
        if case == 'missing-library':
            require('notfound' in contents or 'didnotfind' in contents or "can'tfindfile" in contents,
                    'Missing library error lacks file-not-found context')
    return {'status': 'PASS', 'scope': 'hosted Windows Server MiKTeX only', 'source_sha': source_sha, 'checkout_sha': checkout_sha,
            'pdfs': checked, 'negative_cases': 2, 'n1_session_sources': 2,
            'package_rows': len(before.splitlines()), 'private_roots': 3}


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument('--artifact-dir', type=Path, required=True)
    parser.add_argument('--expected-source-sha', required=True)
    parser.add_argument('--expected-checkout-sha', required=True)
    parser.add_argument('--report', type=Path, required=True)
    args = parser.parse_args()
    try:
        result = audit(args.artifact_dir, args.expected_source_sha, args.expected_checkout_sha)
    except (ValueError, OSError, subprocess.SubprocessError, UnicodeError, KeyError, TypeError) as exc:
        result = {'status': 'FAIL', 'source_sha': args.expected_source_sha,
                  'error': str(exc)}
    args.report.parent.mkdir(parents=True, exist_ok=True)
    args.report.write_text(json.dumps(result, ensure_ascii=False, sort_keys=True, indent=2) + '\n', encoding='utf-8')
    print(json.dumps(result, ensure_ascii=False))
    return 0 if result['status'] == 'PASS' else 1


if __name__ == '__main__':
    sys.exit(main())
