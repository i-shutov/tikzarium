import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { TIKZ_LIBRARIES } from './catalog';
import {
  ARCHITECTURAL_INSIGHTS,
  EXECUTION_WAVES,
  buildInsightsAndPlansMarkdownRu,
} from './insightsAndPlans';
import {
  PACKAGE_CANVAS_TOOLS,
  buildFigureStructureTree,
  deletePackageObjectFromSource,
  insertPackageCanvasObjectFromGesture,
  inspectDataFileDependencies,
  parseScenePackageObjects,
  patchPackageObjectInSource,
  translatePackageObjectInSource,
} from './packageCanvasSemantics';
import { compileTikzSceneToPostScript } from './pdfUnderlayRenderer';
import {
  applyCheckedLineRangePatch,
  applyCheckedSourcePatch,
} from './sourcePatchEngine';
import { StudioControlEngine } from './studioControlApi';

const MINIMAL_DOC = [
  '\\documentclass[tikz,border=2pt]{standalone}',
  '\\begin{document}',
  '\\begin{tikzpicture}',
  '\\end{tikzpicture}',
  '\\end{document}',
  '',
].join('\n');

test('SourcePatch engine preserves CRLF/LF, rejects stale digests, and computes exact inversePatch', () => {
  const crlfDoc = MINIMAL_DOC.replace(/\n/g, '\r\n');

  const staleRes = applyCheckedSourcePatch(
    crlfDoc,
    {
      startOffset: 0,
      endOffset: 14,
      replacement: '\\documentclass',
      descriptionRu: 'Stale test',
    },
    'deadbeef'
  );
  assert.equal(staleRes.ok, false);
  assert.equal(staleRes.nextSource, crlfDoc);

  const linePatch = applyCheckedLineRangePatch(
    crlfDoc,
    4,
    4,
    ['  \\draw[thick] (0cm,0cm) -- (2cm,1cm);', '\\end{tikzpicture}'],
    'Вставка чистого отрезка'
  );
  assert.equal(linePatch.ok, true);
  assert.ok(linePatch.nextSource.includes('\r\n'), 'CRLF line endings must be preserved');
  assert.ok(!linePatch.nextSource.includes('tikzarium:n1:'), 'Must stay 100% clean TikZ');
  assert.ok(linePatch.inversePatch, 'Must return exact inversePatch');

  // Apply inversePatch to verify exact byte-for-byte Undo
  const undone = applyCheckedSourcePatch(linePatch.nextSource, linePatch.inversePatch!);
  assert.equal(undone.ok, true);
  assert.equal(undone.nextSource, crlfDoc, 'Inverse patch must restore exact original bytes');
});

test('TIKZ_LIBRARIES covers all 23 normative AI88 libraries', () => {
  assert.ok(TIKZ_LIBRARIES.length >= 23);
  const names = new Set(TIKZ_LIBRARIES.map((l) => l.name));
  for (const required of [
    'angles',
    'arrows.meta',
    'automata',
    'backgrounds',
    'calc',
    'circuits.ee.IEC',
    'decorations.pathmorphing',
    'decorations.pathreplacing',
    'fit',
    'graphdrawing',
    'graphs',
    'intersections',
    'matrix',
    'mindmap',
    'optics',
    'patterns',
    'petri',
    'positioning',
    'quantikz2',
    'quotes',
    'shapes.callouts',
    'shapes.gates.logic.US',
    'shapes.geometric',
  ]) {
    assert.ok(names.has(required), `Missing normative AI88 library: ${required}`);
  }
});

test('Package canvas semantics author, recognize, move, patch, and delete clean package objects without n1 comments', () => {
  assert.equal(PACKAGE_CANVAS_TOOLS.length, 20);

  // 1. Draw PGFPlots axis box
  const s1 = insertPackageCanvasObjectFromGesture(
    MINIMAL_DOC,
    'pkg:pgfplots-axis',
    { x: 0.6, y: 0.5 },
    { x: 5.2, y: 3.3 }
  );
  assert.equal(s1.ok, true);
  assert.ok(s1.nextSource.includes('\\usepackage{pgfplots}'));
  assert.ok(s1.nextSource.includes('\\begin{axis}'));
  assert.ok(!s1.nextSource.includes('tikzarium:n1:'));

  // 2. Draw CircuiTikZ resistor
  const s2 = insertPackageCanvasObjectFromGesture(
    s1.nextSource,
    'pkg:circuit-R',
    { x: 1.0, y: 3.5 },
    { x: 3.4, y: 3.5 }
  );
  assert.equal(s2.ok, true);
  assert.ok(s2.nextSource.includes('circuitikz'));
  assert.ok(s2.nextSource.includes('to[R'));

  // 3. Draw Automata state + ChemFig ring
  const s3 = insertPackageCanvasObjectFromGesture(
    s2.nextSource,
    'pkg:automata-state',
    { x: 4.5, y: 1.2 },
    { x: 5.1, y: 1.2 }
  );
  assert.equal(s3.ok, true);
  assert.ok(s3.nextSource.includes('automata'));

  const s4 = insertPackageCanvasObjectFromGesture(
    s3.nextSource,
    'pkg:chem-ring',
    { x: 4.8, y: 2.8 },
    { x: 5.4, y: 2.8 }
  );
  assert.equal(s4.ok, true);
  assert.ok(s4.nextSource.includes('\\usepackage{chemfig}'));
  assert.ok(!s4.nextSource.includes('tikzarium:n1:'), 'Zero n1 markers across all package gestures');

  const objects = parseScenePackageObjects(s4.nextSource);
  assert.ok(objects.some((o) => o.kind === 'pgfplots-axis'));
  assert.ok(objects.some((o) => o.kind === 'circuit-bipole'));
  assert.ok(objects.some((o) => o.kind === 'automata-state'));
  assert.ok(objects.some((o) => o.kind === 'chemfig-molecule'));

  // Patch PGFPlots axis xlabel/title without clobbering existing axis lines
  const axisObj = objects.find((o) => o.kind === 'pgfplots-axis')!;
  const patchedAxis = patchPackageObjectInSource(s4.nextSource, axisObj.objectId, {
    axisXLabel: '$t,\\,\\text{мс}$',
    axisTitle: 'Отклик контура',
  });
  assert.equal(patchedAxis.ok, true);
  assert.ok(patchedAxis.nextSource.includes('xlabel={$t,\\,\\text{мс}$}'));
  assert.ok(patchedAxis.nextSource.includes('title={Отклик контура}'));

  // Move resistor by (+0.5cm, -0.25cm)
  const afterAxisObjs = parseScenePackageObjects(patchedAxis.nextSource);
  const resObj = afterAxisObjs.find((o) => o.kind === 'circuit-bipole')!;
  const movedRes = translatePackageObjectInSource(patchedAxis.nextSource, resObj.objectId, 0.5, -0.25);
  assert.equal(movedRes.ok, true);
  assert.ok(movedRes.nextSource.includes('(1.50cm,3.25cm)') || movedRes.nextSource.includes('(1.5cm,3.25cm)'));

  // Figure Explorer structure tree & Data dependency containment check
  const afterMoveObjs = parseScenePackageObjects(movedRes.nextSource);
  const tree = buildFigureStructureTree(movedRes.nextSource, [], afterMoveObjs);
  assert.ok(tree.length >= 4);

  const unsafeDoc = movedRes.nextSource.replace(
    '\\end{axis}',
    '    \\addplot table {../outside_secret.dat};\n  \\end{axis}'
  );
  const depAudit = inspectDataFileDependencies(unsafeDoc, ['spectrum.dat']);
  assert.equal(depAudit.length, 1);
  assert.equal(depAudit[0].isRelativeSafe, false);

  // Delete resistor cleanly
  const resToDelete = afterMoveObjs.find((o) => o.kind === 'circuit-bipole')!;
  const deleted = deletePackageObjectFromSource(movedRes.nextSource, resToDelete.objectId);
  assert.equal(deleted.ok, true);
  assert.ok(!deleted.nextSource.includes('to[R'));
});

test('PostScript scene compiler + Ghostscript 9.55 produces real calibrated PDF bytes', () => {
  const richScene = insertPackageCanvasObjectFromGesture(
    MINIMAL_DOC,
    'pkg:pgfplots-axis',
    { x: 0.5, y: 0.5 },
    { x: 5.5, y: 3.3 }
  ).nextSource;

  const fontCandidates = [
    '/usr/share/fonts/truetype/dejavu/DejaVuSerif.ttf',
    '/usr/share/fonts/truetype/liberation/LiberationSerif-Regular.ttf',
  ];
  const fontPath = fontCandidates.find((p) => fs.existsSync(p));
  const compiled = compileTikzSceneToPostScript(
    richScene,
    { minXCm: 0, maxXCm: 6.2, minYCm: 0, maxYCm: 3.8 },
    fontPath
  );
  assert.ok(compiled.postScriptProgram.startsWith('%!PS-Adobe-3.0'));
  assert.ok(compiled.hitboxes.length >= 1);

  if (fs.existsSync('/usr/bin/gs')) {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'tz-gs-test-'));
    try {
      const psFile = path.join(tmpDir, 'scene.ps');
      const pdfFile = path.join(tmpDir, 'scene.pdf');
      fs.writeFileSync(psFile, compiled.postScriptProgram, 'utf8');
      execFileSync(
        '/usr/bin/gs',
        [
          '-dNOSAFER',
          '-dBATCH',
          '-dNOPAUSE',
          '-dQUIET',
          '-sDEVICE=pdfwrite',
          `-dDEVICEWIDTHPOINTS=${Math.round(compiled.pageWidthPt)}`,
          `-dDEVICEHEIGHTPOINTS=${Math.round(compiled.pageHeightPt)}`,
          '-dFIXEDMEDIA',
          `-sOutputFile=${pdfFile}`,
          psFile,
        ],
        { timeout: 6000 }
      );
      const pdfBytes = fs.readFileSync(pdfFile);
      assert.ok(pdfBytes.subarray(0, 5).toString('ascii') === '%PDF-', 'Must emit real PDF header');
      assert.ok(pdfBytes.length > 500, 'Rendered PDF must contain vector page stream');
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  }
});

test('StudioControlEngine v2 exposes package_canvas.* and insights.inspect parity', () => {
  const engine = new StudioControlEngine(MINIMAL_DOC);
  const [catResp] = engine.runJsonl(JSON.stringify({ id: '1', op: 'package_canvas.catalog' }));
  assert.equal(catResp.ok, true);
  const catResult = catResp.result as { tools: unknown[] };
  assert.equal(catResult.tools.length, 20);

  const [insResp] = engine.runJsonl(
    JSON.stringify({
      id: '2',
      op: 'package_canvas.insert',
      tool: 'pkg:circuit-C',
      x1: 1.0,
      y1: 2.0,
      x2: 3.2,
      y2: 2.0,
    })
  );
  assert.equal(insResp.ok, true);
  assert.ok(engine.getSource().includes('to[C'));

  const [insightsResp] = engine.runJsonl(JSON.stringify({ id: '3', op: 'insights.inspect' }));
  assert.equal(insightsResp.ok, true);
  const insResult = insightsResp.result as { insights: unknown[]; waves: unknown[] };
  assert.equal(insResult.insights.length, ARCHITECTURAL_INSIGHTS.length);
  assert.equal(insResult.waves.length, EXECUTION_WAVES.length);
});

test('docs/INSIGHTS_AND_PLANS_RU.md is committed in repository and strictly synced', () => {
  const candidates = [
    path.resolve(process.cwd(), 'docs/INSIGHTS_AND_PLANS_RU.md'),
    path.resolve(process.cwd(), '../../docs/INSIGHTS_AND_PLANS_RU.md'),
  ];
  const mdPath = candidates.find((p) => fs.existsSync(p)) ?? candidates[0];
  assert.ok(fs.existsSync(mdPath), 'docs/INSIGHTS_AND_PLANS_RU.md must exist in repo');
  const actualDiskMd = fs.readFileSync(mdPath, 'utf8');
  const expectedMd = buildInsightsAndPlansMarkdownRu();
  assert.equal(
    actualDiskMd,
    expectedMd,
    'docs/INSIGHTS_AND_PLANS_RU.md must stay 100% in sync with insightsAndPlans.ts'
  );
});
