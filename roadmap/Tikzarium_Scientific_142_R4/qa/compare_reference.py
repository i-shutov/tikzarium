#!/usr/bin/env python3
"""Optional exact same-renderer raster check. Requires PyMuPDF. No TeX work."""
from __future__ import annotations
import argparse,csv,hashlib,json,pathlib,sys
try:import fitz
except ImportError:print('PyMuPDF is required for raster comparison',file=sys.stderr);sys.exit(4)

def check(item,root,build):
    a=root/item['reference_pdf'];b=build/item['id']/'figure.pdf'
    if not b.is_file():return {'id':item['id'],'status':'MISSING_BUILD_PDF','reason':'no compile PDF'}
    try:
        with fitz.open(a) as ref, fitz.open(b) as actual:
            if len(ref)!=1 or len(actual)!=1:return {'id':item['id'],'status':'PAGE_COUNT_DIFF','reason':'expected one page'}
            if abs(ref[0].rect.width-actual[0].rect.width)>0.02 or abs(ref[0].rect.height-actual[0].rect.height)>0.02:
                return {'id':item['id'],'status':'PAGE_SIZE_DIFF','reason':'page dimensions differ'}
            x=ref[0].get_pixmap(matrix=fitz.Matrix(1,1),alpha=False)
            y=actual[0].get_pixmap(matrix=fitz.Matrix(1,1),alpha=False)
            if (x.width,x.height)!=(y.width,y.height):return {'id':item['id'],'status':'RASTER_BOUNDS_DIFF','reason':'raster dimensions differ'}
            a0=hashlib.sha256(x.samples).hexdigest();b0=hashlib.sha256(y.samples).hexdigest()
            pixel_same=(a0==b0)
            # Count non-white pixels without Python-level per-pixel iteration.
            import numpy as np
            buf=np.frombuffer(y.samples,dtype=np.uint8).reshape((-1,3))
            nonblank=float(np.mean(np.min(buf,axis=1)<238))
            return {'id':item['id'],'status':'PASS' if pixel_same and nonblank>0.0005 else 'DIFFERENT_OR_BLANK','reason':'','reference_raster_sha256':a0,'actual_raster_sha256':b0,'nonwhite_pixel_fraction':round(nonblank,7),'width':x.width,'height':x.height}
    except Exception as e:return {'id':item['id'],'status':'ERROR','reason':str(e)}

def main():
    p=argparse.ArgumentParser();p.add_argument('--root',type=pathlib.Path,default=pathlib.Path(__file__).resolve().parents[1]);p.add_argument('--build',type=pathlib.Path,required=True);p.add_argument('--out',type=pathlib.Path,required=True);a=p.parse_args()
    root=a.root.resolve();build=a.build.resolve();a.out.mkdir(parents=True,exist_ok=True)
    items=json.loads((root/'QA_MANIFEST.json').read_text(encoding='utf8'))['figures'];r=[check(item,root,build) for item in items]
    with (a.out/'raster-evidence.csv').open('w',encoding='utf-8-sig',newline='') as f:
        cols=['id','status','reason','reference_raster_sha256','actual_raster_sha256','nonwhite_pixel_fraction','width','height'];w=csv.DictWriter(f,fieldnames=cols);w.writeheader();w.writerows(r)
    summary={'schema':'tikzarium.raster-audit.v1','renderer':'PyMuPDF '+fitz.VersionBind,'dpi':72,'color':'RGB','algorithm':'exact raster SHA-256 and nonblank threshold','count':len(r),'pass':sum(x['status']=='PASS' for x in r),'failures':[(x['id'],x['status']) for x in r if x['status']!='PASS'],'glyph_science_gui_status':'NOT_PROVED_BY_RASTER_EQUIVALENCE'}
    (a.out/'raster-summary.json').write_text(json.dumps(summary,ensure_ascii=False,indent=2)+'\n',encoding='utf8')
    print(json.dumps(summary,ensure_ascii=False,indent=2));return 0 if summary['pass']==len(r) else 2
if __name__=='__main__':sys.exit(main())
