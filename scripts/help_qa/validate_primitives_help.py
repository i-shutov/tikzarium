#!/usr/bin/env python3
"""Offline, stdlib-only, source-linked N1 TikZ primitive/help catalogue audit.

Use `--catalog PATH` for the C-owned production catalogue; do not copy or edit it.
This checks metadata consistency, not TeX expansion or live HTTP availability.
Python 3.11+ (tomllib). Exits 0 on PASS, 1 on catalog defects, 2 on I/O/TOML errors.
"""
from __future__ import annotations

import argparse
from decimal import Decimal, InvalidOperation
import hashlib
import json
from pathlib import Path
import re
import sys
import tomllib
from urllib.parse import urlsplit

EXPECTED = {
    'tikz.line': ('start_x', 'start_y', 'end_x', 'end_y'),
    'tikz.arrow': ('start_x', 'start_y', 'end_x', 'end_y', 'tip'),
    'tikz.rectangle': ('start_x', 'start_y', 'end_x', 'end_y'),
    'tikz.circle': ('center_x', 'center_y', 'radius'),
    'tikz.node': ('x', 'y', 'mode', 'content'),
    'tikz.bezier-cubic': ('start_x', 'start_y', 'control1_x', 'control1_y',
                          'control2_x', 'control2_y', 'end_x', 'end_y'),
}
MANUAL = {
    '/tikz-paths': frozenset({'14.2.1', '14.3', '14.4', '14.6'}),
    '/tikz-arrows': frozenset({'16.2', '16.5'}),
    '/tikz-shapes': frozenset({'17.2', '17.4'}),
}
SECTION_RE = re.compile(r'\d+(?:\.\d+){1,3}\Z')
PLACEHOLDER_RE = re.compile(r'\$\{([a-z][a-z0-9_]*)\}')
DIMENSION_RE = re.compile(r'(-?(?:\d+(?:\.\d*)?|\.\d+))(pt|mm|cm|in)\Z')
CYRILLIC_RE = re.compile(r'[А-Яа-яЁё]')
IDENT_RE = re.compile(r'[a-z][a-z0-9_-]*\Z')


def audit(catalog: dict, *, n1: bool = True) -> dict:
    """Pure audit (no external commands); messages include stable machine-readable codes."""
    problems: list[dict] = []
    observed_tools: list[str] = []
    param_total = 0
    references_checked = 0

    def error(code: str, where: str, detail: str) -> None:
        problems.append({'code': code, 'path': where, 'detail': detail})

    def required(obj: dict, name: str, where: str, *, russian: bool = False) -> str:
        value = obj.get(name)
        if not isinstance(value, str) or not value.strip():
            error('MISSING_HELP_FIELD', where + '.' + name, 'required nonempty string')
            return ''
        if russian and not CYRILLIC_RE.search(value):
            error('NO_RUSSIAN_HELP', where + '.' + name, 'Russian explanation is required')
        if '\x00' in value:
            error('INVALID_CONTROL', where + '.' + name, 'NUL is not allowed')
        return value

    def manual(obj: dict, where: str) -> None:
        nonlocal references_checked
        section = required(obj, 'manual_section', where)
        url = required(obj, 'manual_url', where)
        if not section or not url:
            return
        try:
            parts = urlsplit(url)
        except ValueError:
            error('UNTRUSTED_MANUAL_URL', where, f'malformed manual URL: {url}')
            return
        if parts.scheme != 'https' or parts.netloc != 'tikz.dev' or parts.query or parts.fragment or parts.username:
            error('UNTRUSTED_MANUAL_URL', where, f'not a pinned TikZ manual chapter: {url}')
            return
        allowed = MANUAL.get(parts.path)
        if allowed is None:
            error('UNKNOWN_MANUAL_CHAPTER', where, f'unknown N1 PGF chapter URL: {url}')
            return
        sections = [s.strip() for s in section.split(';')]
        if not sections or any(not SECTION_RE.fullmatch(s) or s not in allowed for s in sections):
            error('MANUAL_SECTION_MISMATCH', where, f'{section!r} is not anchored in {parts.path}')
            return
        references_checked += len(sections)

    if not isinstance(catalog, dict):
        return {'status': 'FAIL', 'tools': 0, 'parameters': 0, 'manual_references': 0,
                'errors': [{'code': 'ROOT_NOT_TABLE', 'path': '$', 'detail': 'expected TOML table'}]}
    if catalog.get('schema_version') != 1 or catalog.get('id') != 'org.tikzarium.primitives':
        error('SCHEMA_ID', '$', 'schema_version=1 and id=org.tikzarium.primitives required')
    tools = catalog.get('tools')
    if not isinstance(tools, list) or not tools:
        error('NO_TOOLS', '$.tools', 'expected nonempty array of tool tables')
        tools = []
    for i, tool in enumerate(tools):
        where = f'$.tools[{i}]'
        if not isinstance(tool, dict):
            error('TOOL_NOT_TABLE', where, 'expected tool table')
            continue
        tid = required(tool, 'id', where)
        if tid in observed_tools:
            error('DUPLICATE_TOOL', where, tid)
        if tid:
            observed_tools.append(tid)
        if not tid.startswith('tikz.') or not IDENT_RE.fullmatch(tid.removeprefix('tikz.')):
            error('BAD_TOOL_ID', where, tid)
        for field in ('title_ru', 'help_ru', 'warning_ru', 'interaction_ru'):
            required(tool, field, where, russian=True)
        for field in ('syntax', 'example'):
            required(tool, field, where)
        manual(tool, where)
        requirements = tool.get('requirements')
        if not isinstance(requirements, dict):
            error('MISSING_REQUIREMENTS', where, 'tool must declare package/library/engine')
            requirements = {}
        if requirements.get('packages') != ['tikz']:
            error('PACKAGE_REQUIREMENT', where, 'N1 uses package tikz (no inferred global install)')
        expected_libraries = ['arrows.meta'] if tid == 'tikz.arrow' else []
        if requirements.get('libraries') != expected_libraries:
            error('LIBRARY_REQUIREMENT', where, f'expected {expected_libraries}')
        if requirements.get('engine') != 'xelatex':
            error('ENGINE_REQUIREMENT', where, 'external XeLaTeX target')
        if requirements.get('pgf_version_min') != 'UNKNOWN':
            error('UNVERIFIED_MIN_VERSION', where, 'do not invent an upstream minimum PGF version')
        if requirements.get('documented_against') != '3.1.12':
            error('MANUAL_VERSION', where, 'N1 source crosswalk is PGF manual 3.1.12')

        parameters = tool.get('parameter')
        if not isinstance(parameters, list) or not parameters:
            error('NO_PARAMETERS', where, 'expected nonempty [[tools.parameter]] array')
            parameters = []
        param_total += len(parameters)
        seen: set[str] = set()
        for j, param in enumerate(parameters):
            pwhere = f'{where}.parameter[{j}]'
            if not isinstance(param, dict):
                error('PARAM_NOT_TABLE', pwhere, 'expected parameter table')
                continue
            pid = required(param, 'id', pwhere)
            if pid in seen:
                error('DUPLICATE_PARAMETER', pwhere, pid)
            seen.add(pid)
            if not IDENT_RE.fullmatch(pid):
                error('BAD_PARAMETER_ID', pwhere, pid)
            syntax = required(param, 'syntax', pwhere)
            if set(PLACEHOLDER_RE.findall(syntax)) != {pid}:
                error('PARAM_SYNTAX_REF', pwhere, f'syntax must reference its own ${{{pid}}}')
            for field in ('help_ru', 'warning_ru', 'interaction_ru'):
                required(param, field, pwhere, russian=True)
            required(param, 'example', pwhere)
            manual(param, pwhere)
            if param.get('requirements_inherit') != 'tool':
                error('REQUIREMENTS_INHERIT', pwhere, 'requirements must inherit from tool')
            kind = param.get('kind')
            units = param.get('units')
            allowed_values = param.get('allowed_values')
            default = required(param, 'default', pwhere)
            provenance = param.get('default_provenance')
            if provenance not in ('editor_preset', 'UNKNOWN'):
                error('DEFAULT_PROVENANCE', pwhere, 'editor preset is not a TikZ default')
            if (default == 'UNKNOWN') != (provenance == 'UNKNOWN'):
                error('DEFAULT_UNKNOWN_PAIR', pwhere, 'UNKNOWN default/provenance must be paired')
            bound = param.get('max_abs')
            bound_ok = type(bound) in (int, float) and bound == bound and abs(bound) != float('inf')
            if not isinstance(param.get('positive'), bool) or not bound_ok:
                error('PARAM_BOUNDS_TYPE', pwhere, 'positive=bool and finite max_abs=number required')
            if kind == 'dimension':
                if units != ['pt', 'mm', 'cm', 'in'] or allowed_values != []:
                    error('DIMENSION_ALLOWED_UNITS', pwhere, 'literal editor supports pt, mm, cm, in')
                if bound_ok and not (0 < bound <= 10000):
                    error('DIMENSION_EDITOR_LIMIT', pwhere, 'editor max_abs must be positive <=10000')
                if default != 'UNKNOWN':
                    m = DIMENSION_RE.fullmatch(default)
                    if not m:
                        error('INVALID_DIMENSION_PRESET', pwhere, f'{default!r} is not a numeric dimension')
                    else:
                        try:
                            number = Decimal(m.group(1))
                            if (bound_ok and abs(number) > Decimal(str(bound))) or (param.get('positive') is True and number <= 0):
                                error('INVALID_DIMENSION_PRESET', pwhere, f'{default!r} outside editor limits')
                        except (InvalidOperation, KeyError, ValueError):
                            error('INVALID_DIMENSION_PRESET', pwhere, f'{default!r} invalid')
            elif kind == 'choice':
                if units != [] or not isinstance(allowed_values, list) or not allowed_values or any(
                    not isinstance(v, str) or not v for v in allowed_values
                ) or len(set(map(str, allowed_values))) != len(allowed_values):
                    error('INVALID_CHOICES', pwhere, 'nonempty distinct values, no dimension units')
                if default != 'UNKNOWN' and default not in (allowed_values if isinstance(allowed_values, list) else []):
                    error('CHOICE_PRESET_NOT_ALLOWED', pwhere, f'{default!r} not in options')
                if param.get('positive') is not False or param.get('max_abs') != 0:
                    error('CHOICE_HAS_BOUNDS', pwhere, 'choice must have no numeric bound')
            elif kind == 'node_content':
                if units != [] or allowed_values != [] or param.get('positive') is not False or param.get('max_abs') != 0:
                    error('NODE_CONTENT_SCHEMA', pwhere, 'raw string is not a dimension/enum')
            else:
                error('UNKNOWN_KIND', pwhere, f'{kind!r}')

        template = tool.get('syntax', '')
        referenced = set(PLACEHOLDER_RE.findall(template)) if isinstance(template, str) else set()
        extra = referenced - seen
        if extra:
            error('UNRESOLVED_TEMPLATE_REF', where, ', '.join(sorted(extra)))
        unused = seen - referenced
        if unused != ({'mode'} if tid == 'tikz.node' else set()):
            error('UNUSED_PARAMETER', where, ', '.join(sorted(unused)))
        if tid == 'tikz.node':
            indexed = {p.get('id'): p for p in parameters if isinstance(p, dict)}
            if indexed.get('mode', {}).get('allowed_values') != ['text', 'math']:
                error('NODE_MODE_ENUM', where, 'explicit text vs math modes required')
            if indexed.get('content', {}).get('kind') != 'node_content':
                error('NODE_CONTENT_KIND', where, 'node content is plain text / raw math')
            semantics = str(indexed.get('content', {}).get('interaction_ru', '')) + str(tool.get('warning_ru', ''))
            if 'экранирует' not in semantics or 'TeX' not in semantics:
                error('NODE_MODE_HELP', where, 'explain escaped text and raw math TeX')
        if tid == 'tikz.arrow':
            tips = next((p.get('allowed_values') for p in parameters if isinstance(p, dict) and p.get('id') == 'tip'), None)
            if tips != ['Stealth', 'Latex']:
                error('ARROW_TIPS', where, 'N1 arrows.meta tip choices must be explicit')
        if n1 and tid in EXPECTED and set(seen) != set(EXPECTED[tid]):
            error('N1_PARAMETER_SET', where, 'missing/extra first-vertical parameter IDs')

    if n1:
        if set(observed_tools) != set(EXPECTED) or len(tools) != len(EXPECTED):
            error('N1_TOOL_SET', '$.tools', 'exactly six N1 primitive IDs required')
        if param_total != 28:
            error('N1_PARAMETER_COUNT', '$.tools', f'28 expected; observed {param_total}')
    return {'status': 'FAIL' if problems else 'PASS', 'tools': len(observed_tools),
            'parameters': param_total, 'manual_references': references_checked,
            'errors': sorted(problems, key=lambda e: (e['path'], e['code']))}


def run(catalog_file: Path, *, report_file: Path | None = None, n1: bool = True) -> int:
    try:
        raw = catalog_file.read_bytes()
        parsed = tomllib.loads(raw.decode('utf-8'))
        result = audit(parsed, n1=n1)
    except (OSError, UnicodeError, tomllib.TOMLDecodeError) as exc:
        result = {'status': 'ERROR', 'tools': 0, 'parameters': 0,
                  'manual_references': 0,
                  'errors': [{'code': 'CATALOG_IO_OR_TOML', 'path': '$', 'detail': str(exc)}]}
        raw = b''
    result.update({'catalog_path': str(catalog_file),
                   'catalog_sha256': hashlib.sha256(raw).hexdigest() if raw else None,
                   'validator': 'tikzarium-help-qa/v1',
                   'manual_inventory': 'PGF/TikZ 3.1.12 (offline verified chapter/section map)',
                   'scope': 'N1-six-tools' if n1 else 'minimal-fixture',
                   'limits': 'No network fetch, XeLaTeX execution, UI inspection, or proof of real PGF defaults'})
    serial = json.dumps(result, indent=2, sort_keys=True, ensure_ascii=False) + '\n'
    print(serial, end='')
    if report_file is not None:
        try:
            report_file.parent.mkdir(parents=True, exist_ok=True)
            report_file.write_text(serial, encoding='utf-8')
        except OSError as exc:
            print(f'report write error: {exc}', file=sys.stderr)
            return 2
    return 0 if result['status'] == 'PASS' else (2 if result['status'] == 'ERROR' else 1)


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--catalog', required=True, type=Path, help='Path to C-owned catalog-v1.toml')
    parser.add_argument('--report', type=Path, help='Optional deterministic JSON report destination')
    parser.add_argument('--minimal-fixture', action='store_true', help='Skip six-tool N1 count/identity gate for small test fixtures')
    args = parser.parse_args(argv)
    return run(args.catalog, report_file=args.report, n1=not args.minimal_fixture)


if __name__ == '__main__':
    raise SystemExit(main())
