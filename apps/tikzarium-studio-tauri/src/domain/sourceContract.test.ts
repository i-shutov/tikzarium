import assert from 'node:assert/strict';
import test from 'node:test';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { computeSourceDigest } from './sourceDigest';
import { applyCheckedSourcePatch, applyCheckedLineRangePatch } from './sourcePatchEngine';
import type { SourcePatchSpan } from './sourcePatchEngine';

test('SHA-256 UTF-8 agrees with independent node:crypto, including block boundaries', () => {
  const samples = ['', 'abc', 'Кириллица 😀 e\u0301\r\n', '\ufeffпроект'];
  for (let n = 0; n <= 256; n++) samples.push('a'.repeat(n));
  for (const n of [511, 512, 513, 1024, 8192]) samples.push('Я😀e\u0301'.repeat(n));
  for (const source of samples) assert.equal(computeSourceDigest(source), createHash('sha256').update(source, 'utf8').digest('hex'));
});

const cases = JSON.parse(readFileSync('tests/source-patch-contract-v1.json', 'utf8')) as {
 id: string; source: string; patch: SourcePatchSpan; expectedDigest: string | null;
 accepted: boolean; nextSource: string; beforeSha256: string; afterSha256: string;
}[];
for (const c of cases) test(`Shared source contract: ${c.id}`, () => {
  const actual = applyCheckedSourcePatch(c.source, c.patch, c.expectedDigest ?? undefined);
  assert.equal(actual.ok, c.accepted, actual.errorRu);
  assert.equal(actual.nextSource, c.nextSource);
  assert.equal(actual.beforeDigest, c.beforeSha256);
  assert.equal(actual.afterDigest, c.afterSha256);
  if (actual.ok) {
    assert.equal(actual.inversePatch?.lineEndingPolicy, 'exact');
    const undo = applyCheckedSourcePatch(actual.nextSource, actual.inversePatch!, actual.afterDigest);
    assert.equal(undo.ok, true, undo.errorRu);
    assert.deepEqual(Buffer.from(undo.nextSource), Buffer.from(c.source));
  } else assert.equal(actual.inversePatch, undefined);
});

test('Mixed-EOL line ranges use actual offsets; neighbor bytes are immutable', () => {
  const s = 'a\nb\r\nc';
  const p = applyCheckedLineRangePatch(s, 2, 2, ['Ю'], 'line');
  assert.equal(p.nextSource, 'a\nЮ\r\nc');
  assert.equal(applyCheckedSourcePatch(p.nextSource, p.inversePatch!, p.afterDigest).nextSource, s);
  assert.equal(applyCheckedLineRangePatch(s, 2, 2, [], 'delete').nextSource, 'a\nc');
  assert.equal(applyCheckedLineRangePatch(s, 3, 3, [], 'delete final').nextSource, 'a\nb');
  for (const line of [NaN, 1.5, Infinity, 0]) assert.equal(applyCheckedLineRangePatch(s, line, line, ['X'], 'bad').ok, false);
});

test('Malformed Unicode and unsafe offsets fail closed in the JS boundary', () => {
  for (const text of ['\ud800', '\udfff', 'x\ud800y']) {
    assert.equal(applyCheckedSourcePatch('abc', {startOffset:0,endOffset:0,replacement:text,descriptionRu:'bad'}).ok, false);
  }
  for (const n of [NaN, Infinity, -1, 1.5, Number.MAX_SAFE_INTEGER+1]) {
    assert.equal(applyCheckedSourcePatch('abc', {startOffset:n,endOffset:n,replacement:'',descriptionRu:'bad'}).ok, false);
  }
});
