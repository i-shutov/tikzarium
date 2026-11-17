import assert from 'node:assert/strict';
import test from 'node:test';
import { NativeBuildGate, LiveBuildAdmission, requestAuthoritativePdf, assertAuthoritativePdf, saveThenContinue } from './nativeBuildGate';
import { computeSourceDigest } from './sourceDigest';
import { tauriApplyCheckedSourcePatch } from './tauriNativeBridge';
import type { EngineAdapter, PdfUnderlayRenderResponse } from './sourcePatchEngine';
import { applyCheckedSourcePatch } from './sourcePatchEngine';
const req = { source: 'Я😀\r\n', revision: 7, minXCm:0, maxXCm:1, minYCm:0, maxYCm:1 };
const valid = (): PdfUnderlayRenderResponse => ({ok:true, revision:7, sourceDigest:computeSourceDigest(req.source),engine:'xelatex',engineLabelRu:'test only',pngDataUrl:'data:image/png;base64,',pdfBase64:btoa('%PDF-1.7\nfixture'),pageWidthPt:1,pageHeightPt:1,renderMs:1,objectsRendered:0,hitboxes:[]});

test('Build response requires XeLaTeX, exact source SHA-256/revision and actual PDF signature', () => {
  assert.doesNotThrow(() => assertAuthoritativePdf(req, valid()));
  for (const patch of [{ok:false},{engine:'svg-vector-fallback'},{revision:6},{sourceDigest:'0'.repeat(64)},
    {sourceDigest:computeSourceDigest(req.source).slice(0,16)},{pdfBase64:null},{pdfBase64:'%%%%'}, {pdfBase64:btoa('not a pdf')}]) {
    assert.throws(() => assertAuthoritativePdf(req, {...valid(),...patch} as PdfUnderlayRenderResponse));
  }
});

test('Preview adapter cannot issue a native PASS; no rendering call is made', async () => {
  let calls=0;
  const adapter = {adapterId:'web-express-gs-xelatex',applyPatch:applyCheckedSourcePatch,renderPdfUnderlay:async()=>{calls++;return valid();}} as EngineAdapter;
  await assert.rejects(requestAuthoritativePdf(adapter,req)); assert.equal(calls,0);
});

test('Native adapter response is awaited and validated, with IPC errors preserved', async () => {
  const adapter={adapterId:'rust-tauri-v2-ipc',applyPatch:applyCheckedSourcePatch,renderPdfUnderlay:async()=>valid()} as EngineAdapter;
  assert.equal((await requestAuthoritativePdf(adapter,req)).engine,'xelatex');
  adapter.renderPdfUnderlay=async()=>{throw new Error('IPC rejected');};
  await assert.rejects(requestAuthoritativePdf(adapter,req),/IPC rejected/);
});

test('New requests, cancel, source changes and document switches reject late results', () => {
  const gate=new NativeBuildGate(); const t=gate.begin('a',1,0);
  assert.equal(gate.isCurrent(t,'a',1,0),true);
  for(const args of [['b',1,0],['a',2,0],['a',1,1]] as const) assert.equal(gate.isCurrent(t,args[0],args[1],args[2]),false);
  gate.invalidate(); assert.equal(gate.isCurrent(t,'a',1,0),false);
  const a=gate.begin('a',1,0),b=gate.begin('a',1,0);
  assert.equal(gate.isCurrent(a,'a',1,0),false); assert.equal(gate.isCurrent(b,'a',1,0),true);
});

test('Cancelled, rejected, superseded and mismatched saves never trigger Build', async () => {
  let savedCalls=0,buildCalls=0;
  const saved={ok:true,sha256Short:computeSourceDigest(req.source).slice(0,16)};
  const onSaved=()=>{savedCalls++;},build=async()=>{buildCalls++;};
  assert.equal(await saveThenContinue(req.source,async()=>null,()=>true,onSaved,build),'cancelled');
  await assert.rejects(saveThenContinue(req.source,async()=>{throw new Error('disk');},()=>true,onSaved,build));
  await assert.rejects(saveThenContinue(req.source,async()=>({...saved,sha256Short:'wrong'}),()=>true,onSaved,build));
  assert.equal(await saveThenContinue(req.source,async()=>saved,()=>false,onSaved,build),'superseded');
  assert.equal(savedCalls,0);assert.equal(buildCalls,0);
  assert.equal(await saveThenContinue(req.source,async()=>saved,()=>true,onSaved,build),'continued');
  assert.equal(savedCalls,1);assert.equal(buildCalls,1);
});

test('Save must settle before publication and render; deferred errors do not race a timer', async () => {
  const calls:string[]=[];
  let release!: (v:{ok:boolean;sha256Short:string})=>void;
  const pending=new Promise<{ok:boolean;sha256Short:string}>(resolve=>{release=resolve;});
  const run=saveThenContinue(req.source,()=>pending,()=>true,()=>calls.push('saved'),async()=>{calls.push('build');});
  await Promise.resolve();assert.deepEqual(calls,[]);
  release({ok:true,sha256Short:computeSourceDigest(req.source).slice(0,16)});
  await run;assert.deepEqual(calls,['saved','build']);
});

test('Async SourcePatch bridge invokes actual command contract, not synchronous preview', async () => {
  const calls: unknown[]=[];
  const patch={startOffset:0,endOffset:1,replacement:'Z',descriptionRu:'test'};
  const digest=computeSourceDigest('abc');
  const env={__TAURI_INTERNALS__:{invoke:async(cmd:string,args:unknown)=>{calls.push({cmd,args});return {ok:false,errorRu:'expected rejection'};}}};
  const result=await tauriApplyCheckedSourcePatch('abc',patch,digest,env);
  assert.equal(result.ok,false);
  assert.deepEqual(calls,[{cmd:'tz_apply_checked_patch',args:{source:'abc',patch,expectedDigest:digest}}]);
  await assert.rejects(tauriApplyCheckedSourcePatch('abc',patch,digest,{}));
});

test('Live build does not retry the same failed or cancelled revision in a loop', () => {
  const gate = new LiveBuildAdmission();
  assert.equal(gate.shouldSchedule('a', 1, 0), true);
  gate.remember('a', 1, 0);
  assert.equal(gate.shouldSchedule('a', 1, 0), false);
  assert.equal(gate.shouldSchedule('b', 1, 0), true);
  assert.equal(gate.shouldSchedule('a', 2, 0), true);
  assert.equal(gate.shouldSchedule('a', 1, 1), true);
  gate.reset();
  assert.equal(gate.shouldSchedule('a', 1, 0), true);
});
