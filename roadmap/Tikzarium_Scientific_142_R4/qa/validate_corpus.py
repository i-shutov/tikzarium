#!/usr/bin/env python3
"""Scientific-142 corpus integrity check. No network, no compiler, no writes to fixtures."""
from __future__ import annotations
import argparse, hashlib, json, os, pathlib, sys

def sha256(p):
    h=hashlib.sha256()
    with p.open('rb') as stream:
        for block in iter(lambda:stream.read(1024*1024),b''):h.update(block)
    return h.hexdigest()

def validate(root):
    m=json.loads((root/'QA_MANIFEST.json').read_text(encoding='utf-8'))
    errors=[];ids=set();n={'AK':0,'SR':0}
    for asset,digest in m.get('assets_sha256',{}).items():
        p=(root/asset)
        if not p.is_file() or p.is_symlink() or not p.resolve().is_relative_to(root.resolve()):errors.append('missing or unsafe asset '+asset)
        elif sha256(p)!=digest:errors.append('asset digest mismatch '+asset)
    for item in m['figures']:
        ident=item['id']; corpus=item['corpus']
        if ident in ids:errors.append(ident+' duplicate id')
        ids.add(ident);n[corpus]=n.get(corpus,0)+1
        for label,key,digest in [('source','source_path','source_sha256'),('reference','reference_pdf','reference_pdf_sha256')]:
            path=root/item[key]
            if not path.resolve().is_relative_to(root.resolve()) or path.is_symlink():errors.append(f'{ident}:unsafe {label} path');continue
            if not path.is_file():errors.append(f'{ident}:missing {label}: {path}');continue
            if sha256(path)!=item[digest]:errors.append(f'{ident}:digest mismatch {label}')
        base=(root/item['source_path']).parent
        for dep in item['dependencies']:
            d=(base/dep).resolve()
            if not d.is_relative_to(root.resolve()):errors.append(f'{ident}:out of root dependency {dep}');continue
            if not d.is_file():errors.append(f'{ident}:missing dependency {dep}')
            elif item.get('dependency_sha256',{}).get(dep) != sha256(d):errors.append(f'{ident}:dependency digest mismatch {dep}')
        src=(root/item['source_path'])
        if src.exists():
            t=src.read_text(encoding='utf-8')
            if t.count(r'\begin{tikzpicture}')!=1 or t.count(r'\end{tikzpicture}')!=1:errors.append(f'{ident}:must contain exactly one TikZ picture')
            if r'\write18' in t:errors.append(f'{ident}:requires shell execution')
            if corpus=='SR' and ('gnuplot' in t.lower() or 'plot function' in t.lower()):errors.append(f'{ident}:unwanted Gnuplot dependency')
    if len(m['figures'])!=142 or n['AK']!=100 or n['SR']!=42:errors.append(f'cardinality invalid: {n}')
    return {'schema':'tikzarium.fixture-audit.v1','ok':not errors,'total':len(ids),'count':n,'errors':errors}

def main():
    p=argparse.ArgumentParser();p.add_argument('--root',type=pathlib.Path,default=pathlib.Path(__file__).resolve().parents[1]);p.add_argument('--json',action='store_true');a=p.parse_args();out=validate(a.root)
    print(json.dumps(out,ensure_ascii=False,indent=2) if a.json else ('PASS' if out['ok'] else 'FAIL')+f' {out["count"]} '+('; '.join(out['errors'][:12]) if out['errors'] else 'all files and SHA-256 matched'))
    return 0 if out['ok'] else 2

if __name__=='__main__':sys.exit(main())
