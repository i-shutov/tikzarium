#!/usr/bin/env python3
"""Advisory semantic cross-check on C-owned TikZ N1 metadata (stdlib only).

Unlike validate_primitives_help.py this is an editorial evidence gate, not an
attempt to interpret TikZ. UNKNOWN and unimplemented GUI actions are not errors.
It never modifies the catalog; --report emits deterministic machine JSON.
"""
from __future__ import annotations

import argparse
import hashlib
import json
from pathlib import Path
import sys
import tomllib

MANUAL = {
    'tikz.line': ('14.2.1', 'https://tikz.dev/tikz-paths'),
    'tikz.bezier-cubic': ('14.3', 'https://tikz.dev/tikz-paths'),
    'tikz.rectangle': ('14.4', 'https://tikz.dev/tikz-paths'),
    'tikz.circle': ('14.6', 'https://tikz.dev/tikz-paths'),
    'tikz.arrow': ('16.2', 'https://tikz.dev/tikz-arrows'),
    'tikz.node': ('17.2', 'https://tikz.dev/tikz-shapes'),
}


def inspect(catalog: dict) -> list[dict[str, str]]:
    findings: list[dict[str, str]] = []

    def add(code: str, locator: str, detail: str, source: str) -> None:
        findings.append({'code': code, 'locator': locator, 'severity': 'REVIEW',
                         'detail': detail, 'source': source})

    for tool in catalog.get('tools', []):
        if not isinstance(tool, dict):
            continue
        tid = tool.get('id', '')
        if tid not in MANUAL:
            continue
        _, url = MANUAL[tid]
        for param in tool.get('parameter', []):
            if not isinstance(param, dict):
                continue
            pid = param.get('id', '')
            locator = f'extensions/primitives/catalog-v1.toml::{tid}.parameter.{pid}'
            text = ' '.join(str(param.get(k, '')) for k in
                            ('help_ru', 'warning_ru', 'interaction_ru'))
            if tid == 'tikz.node' and pid == 'mode':
                # text/math is an editor choice, not a native TikZ key.
                if ('ключ TikZ' in text and 'не ключ TikZ' not in text) or \
                        ('TikZ key' in text and 'not a TikZ key' not in text):
                    add('EDITOR_MODE_MISLABELED_AS_TIKZ_KEY', locator,
                        'text/math is an editor selector, not a native TikZ key; '
                        'describe emitted escaped text versus $...$ math instead.',
                        'https://tikz.dev/tikz-shapes#sec-17.4')
                if not ('text' in text and 'math' in text):
                    add('NODE_MODE_NOT_BOTH_EXPLAINED', locator,
                        'Explain both editor modes text and math explicitly.',
                        'https://tikz.dev/tikz-shapes#sec-17.4')
            if param.get('kind') == 'dimension':
                if 'не выражение TeX' not in text and 'исходник' not in text:
                    add('EDITOR_LITERAL_SCOPE_UNCLEAR', locator,
                        'Dimension controls accept restricted literals only; '
                        'raw TikZ/TeX source accepts a richer expression language.',
                        url)
            if param.get('default_provenance') == 'editor_preset' and \
                    str(param.get('default', '')).upper() == 'UNKNOWN':
                add('UNRESOLVED_EDITOR_PRESET', locator,
                    'UNKNOWN literal must not be presented as an editor preset.', url)
        if tid == 'tikz.arrow':
            tip = next((x for x in tool.get('parameter', [])
                        if isinstance(x, dict) and x.get('id') == 'tip'), None)
            if tip is not None and tip.get('allowed_values') != ['Stealth', 'Latex']:
                add('UNREVIEWED_ARROW_TIPS',
                    'extensions/primitives/catalog-v1.toml::tikz.arrow.parameter.tip',
                    'N1 enumeration changed; independently recheck manual §16.5.',
                    'https://tikz.dev/tikz-arrows')
    return sorted(findings, key=lambda x: (x['locator'], x['code']))


def run(catalog: Path, report: Path | None) -> int:
    try:
        raw = catalog.read_bytes()
        doc = tomllib.loads(raw.decode('utf-8'))
        findings = inspect(doc)
        result = {'status': 'REVIEW' if findings else 'PASS_SEMANTIC_SPOTCHECK',
                  'source_sha256': hashlib.sha256(raw).hexdigest(),
                  'source_path': str(catalog),
                  'tool_count': len(doc.get('tools', [])),
                  'parameter_count': sum(len(t.get('parameter', [])) for t in doc.get('tools', [])),
                  'findings': findings,
                  'scope': 'N1 selected semantic claims; not a proof of all TeX semantics or GUI interaction',
                  'primary_sources': [MANUAL[k][1] for k in sorted(MANUAL)]}
        code = 0  # Editorial findings never mask the structural gate.
    except (OSError, UnicodeError, tomllib.TOMLDecodeError, ValueError) as exc:
        result = {'status': 'ERROR', 'findings': [{'code': 'SOURCE_IO_OR_TOML',
                  'detail': str(exc)}]}
        code = 2
    payload = json.dumps(result, ensure_ascii=False, sort_keys=True, indent=2) + '\n'
    if report:
        report.parent.mkdir(parents=True, exist_ok=True)
        report.write_text(payload, encoding='utf-8')
    print(payload, end='')
    return code


def main() -> int:
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument('--catalog', type=Path, required=True)
    p.add_argument('--report', type=Path)
    args = p.parse_args()
    return run(args.catalog, args.report)


if __name__ == '__main__':
    sys.exit(main())
