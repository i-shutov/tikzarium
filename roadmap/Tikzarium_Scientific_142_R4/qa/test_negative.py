"""Independent negative test: deliberate fixture corruption must fail SHA audit."""
import json,pathlib,tempfile,shutil
from validate_corpus import validate
root=pathlib.Path(__file__).resolve().parents[1]
assert validate(root)['ok']
with tempfile.TemporaryDirectory() as temp:
    copy=pathlib.Path(temp)
    shutil.copyfile(root/'QA_MANIFEST.json',copy/'QA_MANIFEST.json')
    # A bounded synthetic manifest case is enough; it must reject modified bytes.
    m=json.loads((copy/'QA_MANIFEST.json').read_text())
    m['figures']=[m['figures'][0]]
    item=m['figures'][0]
    for key in ('source_path','reference_pdf'):
        src=root/item[key];dst=copy/item[key];dst.parent.mkdir(parents=True,exist_ok=True);shutil.copyfile(src,dst)
    for dep in item['dependencies']:
        src=(root/item['source_path']).parent/dep;dst=(copy/item['source_path']).parent/dep;dst.parent.mkdir(parents=True,exist_ok=True);shutil.copyfile(src,dst)
    (copy/'QA_MANIFEST.json').write_text(json.dumps(m))
    before=validate(copy)
    assert any('cardinality' in e for e in before['errors'])
    src=copy/item['source_path']
    src.write_bytes(src.read_bytes()+b'\n% deliberate tamper\n')
    after=validate(copy)
    assert any('digest mismatch source' in e for e in after['errors'])
print('PASS: source tamper detected; wrong corpus count rejected')
