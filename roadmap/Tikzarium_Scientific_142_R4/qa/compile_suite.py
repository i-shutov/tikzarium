#!/usr/bin/env python3
"""Run external XeLaTeX for independent Scientific-142 fixtures.

The runner does not modify inputs, invoke shells, install packages or need
Tikzarium's GUI. A TeX PASS never implies a visual/GUI-edit PASS.
"""
from __future__ import annotations
import argparse,csv,hashlib,json,os,pathlib,re,subprocess,sys,time
from concurrent.futures import ThreadPoolExecutor,as_completed
from validate_corpus import sha256,validate

def first_page_count(pdf):
    try:
        p=subprocess.run(['pdfinfo',str(pdf)],capture_output=True,text=True,timeout=15,check=False)
        m=re.search(r'^Pages:\s*(\d+)',p.stdout,re.M)
        return int(m.group(1)) if m else -1
    except (OSError,subprocess.TimeoutExpired):return -1

def tex_version(engine):
    try:
        p=subprocess.run([engine,'--version'],capture_output=True,text=True,timeout=12,check=False)
        return ((p.stdout or p.stderr).splitlines() or ['UNKNOWN'])[0][:200]
    except Exception as e:return 'UNAVAILABLE '+str(e)

def safe_run(item,root,out_dir,args,engine_version):
    src=root/item['source_path'];ref=root/item['reference_pdf'];figure_dir=src.parent
    dest=out_dir/item['id'];dest.mkdir(parents=True,exist_ok=True)
    source_before=sha256(src)
    dep_before={x:sha256((figure_dir/x).resolve()) for x in item['dependencies']}
    cmd=[args.engine,'-no-shell-escape','-interaction=nonstopmode','-halt-on-error','-file-line-error','-recorder',f'-output-directory={dest}']
    if 'MiKTeX' in engine_version:cmd.insert(1,'--disable-installer')
    cmd.append('figure.tex')
    start=time.monotonic();timed_out=False
    try:
        p=subprocess.run(cmd,cwd=figure_dir,capture_output=True,timeout=args.timeout,check=False)
        code=p.returncode;console=(p.stdout+p.stderr).decode('utf-8','replace')
    except subprocess.TimeoutExpired as err:
        timed_out=True;code=124;console=((err.stdout or b'')+(err.stderr or b'')).decode('utf-8','replace')+'\nTIMED_OUT\n'
    except Exception as err:code=125;console='EXECUTION_ERROR '+repr(err)
    elapsed=round(time.monotonic()-start,3)
    (dest/'console.txt').write_text(console[:2_000_000],encoding='utf8')
    pdf=dest/'figure.pdf';lg=dest/'figure.log';page_count=first_page_count(pdf) if pdf.exists() else 0
    source_unchanged=source_before==sha256(src)
    deps_unchanged=all(sha256((figure_dir/x).resolve())==digest for x,digest in dep_before.items())
    warn_count=len(re.findall('Missing character: There is no', (lg.read_text(errors='replace') if lg.exists() else console)))
    ok=code==0 and page_count==1 and source_unchanged and deps_unchanged
    return dict(id=item['id'],corpus=item['corpus'],status='PASS' if ok else 'FAIL',engine_version=engine_version,exit_code=code,seconds=elapsed,pdf_pages=page_count,timed_out=timed_out,source_preserved=source_unchanged,dependencies_preserved=deps_unchanged,nullfont_warnings=warn_count,source_sha256=source_before,reference_pdf_sha256=item['reference_pdf_sha256'],compiled_pdf_sha256=sha256(pdf) if pdf.exists() else '',tex_log_sha256=sha256(lg) if lg.exists() else '',console_sha256=sha256(dest/'console.txt'),build_folder=str(dest.relative_to(out_dir)))

def main():
    p=argparse.ArgumentParser();p.add_argument('--root',type=pathlib.Path,default=pathlib.Path(__file__).resolve().parents[1]);p.add_argument('--output',type=pathlib.Path,default=pathlib.Path.cwd()/'scientific-142-build');p.add_argument('--jobs',type=int,default=3);p.add_argument('--timeout',type=int,default=100);p.add_argument('--corpus',choices=['all','AK','SR'],default='all');p.add_argument('--id',action='append',help='one exact fixture id; may repeat');p.add_argument('--engine',default='xelatex');a=p.parse_args()
    root=a.root.resolve();out_dir=a.output.resolve();out_dir.mkdir(parents=True,exist_ok=True)
    checked=validate(root)
    if not checked['ok']:
        print('Integrity failure: '+repr(checked['errors'][:15]),file=sys.stderr);return 3
    items=json.loads((root/'QA_MANIFEST.json').read_text(encoding='utf8'))['figures']
    items=[x for x in items if (a.corpus=='all' or x['corpus']==a.corpus) and (not a.id or x['id'] in a.id)]
    version=tex_version(a.engine)
    if version.startswith('UNAVAILABLE'):print(version,file=sys.stderr);return 4
    results=[]
    with ThreadPoolExecutor(max_workers=max(1,min(6,a.jobs))) as pool:
        futures={pool.submit(safe_run,x,root,out_dir,a,version):x['id'] for x in items}
        for f in as_completed(futures):
            x=f.result();results.append(x)
            print(f"{x['id']:10} {x['status']:4} {x['seconds']:7.2f}s pages={x['pdf_pages']} warnings={x['nullfont_warnings']}",flush=True)
    results.sort(key=lambda x:x['id'])
    fields=list(results[0].keys()) if results else []
    with (out_dir/'compile-evidence.csv').open('w',encoding='utf-8-sig',newline='') as handle:
        w=csv.DictWriter(handle,fieldnames=fields);w.writeheader();w.writerows(results)
    summary={'schema':'tikzarium.external-compile.v1','engine_version':version,'source_git_sha':json.loads((root/'QA_MANIFEST.json').read_text(encoding='utf8'))['source_git_sha'],'count':len(results),'pass':sum(x['status']=='PASS' for x in results),'fail':sum(x['status']=='FAIL' for x in results),'warnings':sum(x['nullfont_warnings'] for x in results),'limit_per_figure_seconds':a.timeout,'parallel_jobs':a.jobs,'gui_evidence':'NOT_RUN','visual_content_evidence':'NOT_RUN'}
    (out_dir/'summary.json').write_text(json.dumps(summary,ensure_ascii=False,indent=2)+'\n',encoding='utf8')
    print(json.dumps(summary,ensure_ascii=False,indent=2));return 0 if summary['fail']==0 else 2
if __name__=='__main__':sys.exit(main())
