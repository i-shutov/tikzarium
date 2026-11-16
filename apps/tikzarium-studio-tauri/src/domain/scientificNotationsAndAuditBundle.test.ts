import test from 'node:test';
import assert from 'node:assert/strict';
import { insertOwnedPrimitiveIntoSource, parseOwnedPrimitives } from './tikzEngine';
import {
  applySpreadsheetCellEditInSource,
  applyStylePassportToPrimitivesInSource,
  applyVisualLintAutoFix,
  buildAnnularSectorSvgPath,
  buildSpreadsheetRows,
  constructFilletOrChamferInSource,
  extractStylePassport,
  formatPositionalLegendCaptionRu,
  insert3dProjectedSceneIntoSource,
  insertFillBetweenCurvesIntoSource,
  insertNotationPresetIntoSource,
  insertPositionalLeaderShelfIntoSource,
  insertSpyMagnifierInsetIntoSource,
  parseLatexToDisplayRuns,
  parseTikzprojSession,
  project3dPointTo2dCm,
  runVisualPreSubmissionAudit,
  serializeTikzprojSession,
} from './scientificNotationsAndAuditBundle';

const BASE_DOC = [
  '\\documentclass[tikz,border=4pt]{standalone}',
  '\\usepackage{tikz}',
  '\\begin{document}',
  '\\begin{tikzpicture}',
  '\\end{tikzpicture}',
  '\\end{document}',
].join('\r\n');

test('P51-P55: insertNotationPresetIntoSource inserts Quantum, Jablonski, TAU, and Automata presets preserving CRLF', () => {
  const qRes = insertNotationPresetIntoSource(BASE_DOC, 'feynman-qed-vertex', { x: 1.0, y: 1.0 });
  assert.ok(qRes.insertedIds.length >= 6);
  assert.ok(qRes.nextSource.includes('\r\n'));
  assert.ok(qRes.nextSource.includes('decorations.pathmorphing'));
  assert.ok(qRes.nextSource.includes('snake'));

  const jRes = insertNotationPresetIntoSource(BASE_DOC, 'jablonski-s0-s1-t1', { x: 0.8, y: 0.6 });
  assert.ok(jRes.insertedIds.length >= 8);
  assert.ok(jRes.nextSource.includes('S_0'));

  const tauRes = insertNotationPresetIntoSource(BASE_DOC, 'tau-closed-loop-pid', { x: 0.6, y: 0.8 });
  assert.ok(tauRes.insertedIds.length >= 12);
  assert.ok(tauRes.nextSource.includes('W_p(s)'));

  const chemRes = insertNotationPresetIntoSource(BASE_DOC, 'chem-benzene-aromatic', { x: 0.5, y: 0.5 });
  assert.equal(chemRes.insertedIds.length, 4);

  const cdRes = insertNotationPresetIntoSource(BASE_DOC, 'commutative-square-2x2', { x: 1.0, y: 0.8 });
  assert.ok(cdRes.insertedIds.length >= 8);
  assert.ok(cdRes.nextSource.includes('(CDA)'));
});

test('P54: project3dPointTo2dCm and insert3dProjectedSceneIntoSource project isometric basis onto n1', () => {
  const origin = { x: 3.0, y: 1.5 };
  const zTop = project3dPointTo2dCm(0, 0, 1, 45, 35, origin, 1.0);
  assert.equal(zTop.x, 3.0);
  assert.ok(zTop.y > origin.y);

  const scene = insert3dProjectedSceneIntoSource(BASE_DOC, 'crystal-unit-cell', 45, 35, origin, 1.1);
  assert.ok(scene.insertedIds.length >= 10);
  const owned = parseOwnedPrimitives(scene.nextSource);
  assert.equal(owned.length, scene.insertedIds.length);
});

test('P56: constructFilletOrChamferInSource trims orthogonal segments and inserts tangent fillet cubic', () => {
  const s1 = insertOwnedPrimitiveIntoSource(BASE_DOC, 'line', {
    start_x: '1.00cm',
    start_y: '1.00cm',
    end_x: '4.00cm',
    end_y: '1.00cm',
  });
  const s2 = insertOwnedPrimitiveIntoSource(s1.nextSource, 'line', {
    start_x: '1.00cm',
    start_y: '1.00cm',
    end_x: '1.00cm',
    end_y: '3.50cm',
  });

  const filleted = constructFilletOrChamferInSource(s2.nextSource, [s1.newId, s2.newId], 0.5, 'fillet');
  assert.notEqual(filleted.newId, null);
  const owned = parseOwnedPrimitives(filleted.nextSource);
  assert.equal(owned.length, 3);
  const cubic = owned.find((p) => p.tool === 'cubic');
  assert.ok(cubic);
  assert.equal(cubic.values.start_x, '1.50cm');
  assert.equal(cubic.values.end_y, '1.50cm');
});

test('P57-P59: fillbetween polygon, spy magnifier inset, and positional leader shelf with legend', () => {
  const c1 = insertOwnedPrimitiveIntoSource(BASE_DOC, 'line', {
    start_x: '1.00cm',
    start_y: '2.20cm',
    end_x: '4.00cm',
    end_y: '2.80cm',
  });

  const fb = insertFillBetweenCurvesIntoSource(c1.nextSource, [c1.newId], 0.6, { fillColor: 'emerald!10' });
  assert.notEqual(fb.newId, null);
  const fbOwned = parseOwnedPrimitives(fb.nextSource);
  assert.equal(fbOwned[0].values.poly_closed, 'cycle');
  assert.equal(fbOwned[0].values.layer_id, 'bg');

  const spy = insertSpyMagnifierInsetIntoSource(
    fb.nextSource,
    { x: 2.5, y: 2.5 },
    0.45,
    { x: 4.9, y: 2.7 },
    4
  );
  assert.ok(spy.insertedIds.length >= 4);
  assert.ok(spy.nextSource.includes('\\times 4'));

  const pos = insertPositionalLeaderShelfIntoSource(
    spy.nextSource,
    1,
    { x: 2.0, y: 2.2 },
    { x: 2.8, y: 3.1 }
  );
  assert.equal(pos.insertedIds.length, 3);
  const legend = formatPositionalLegendCaptionRu([
    { posNumber: 2, labelRu: 'делитель пучка' },
    { posNumber: 1, labelRu: 'лазер накачки' },
  ]);
  assert.equal(legend, '\\textit{1} — лазер накачки; \\textit{2} — делитель пучка');
});

test('P60-P62: radial pie sector SVG path, style passport copy/apply, and spreadsheet cell edits', () => {
  const sector = buildAnnularSectorSvgPath(200, 150, 26, 78, -22.5, 22.5);
  assert.ok(sector.pathD.startsWith('M '));
  assert.ok(sector.labelX > 200);

  const r1 = insertOwnedPrimitiveIntoSource(BASE_DOC, 'rectangle', {
    start_x: '0.80cm',
    start_y: '0.60cm',
    end_x: '2.20cm',
    end_y: '1.60cm',
    stroke_width: 'very thick',
    stroke_color: 'blue!75!black',
    fill_color: 'blue!8',
    rounded_corners: '4pt',
  });
  const r2 = insertOwnedPrimitiveIntoSource(r1.nextSource, 'rectangle', {
    start_x: '3.00cm',
    start_y: '0.60cm',
    end_x: '4.40cm',
    end_y: '1.60cm',
  });

  const prims = parseOwnedPrimitives(r2.nextSource);
  const passport = extractStylePassport(prims[0]);
  const applied = applyStylePassportToPrimitivesInSource(r2.nextSource, [r2.newId], passport);
  assert.equal(applied.updatedCount, 1);
  const afterStyle = parseOwnedPrimitives(applied.nextSource);
  assert.equal(afterStyle[1].values.stroke_color, 'blue!75!black');
  assert.equal(afterStyle[1].values.rounded_corners, '4pt');

  const rows = buildSpreadsheetRows(afterStyle, [], []);
  assert.equal(rows.length, 2);
  const edited = applySpreadsheetCellEditInSource(applied.nextSource, r2.newId, 'x1Cm', '3.35');
  assert.equal(edited.ok, true);
  assert.equal(parseOwnedPrimitives(edited.nextSource)[1].values.start_x, '3.35cm');
});

test('P63-P65: live math display shaper, visual pre-submission audit + autofix, and .tikzproj roundtrip', () => {
  const runs = parseLatexToDisplayRuns('\\lambda_{0} = 532 \\pm 0.5\\,\\text{нм}^2');
  assert.ok(runs.some((r) => r.text.includes('λ')));
  assert.ok(runs.some((r) => r.script === 'sub' && r.text === '0'));
  assert.ok(runs.some((r) => r.upright && r.text === 'нм'));
  assert.ok(runs.some((r) => r.script === 'sup' && r.text === '2'));

  // Cyrillic 'с' (\u0441) inside math $E = m\u0441^2 \\text{Дж}$ + thin stroke + overlapping nodes
  const cyrC = '\u0441';
  const a1 = insertOwnedPrimitiveIntoSource(BASE_DOC, 'line', {
    start_x: '0.50cm',
    start_y: '0.50cm',
    end_x: '3.50cm',
    end_y: '0.50cm',
    stroke_width: 'thin',
  });
  const a2 = insertOwnedPrimitiveIntoSource(a1.nextSource, 'node', {
    x: '2.00cm',
    y: '1.50cm',
    mode: 'math',
    content: `E = m${cyrC}^2\\,\\text{Дж}`,
  });
  const a3 = insertOwnedPrimitiveIntoSource(a2.nextSource, 'node', {
    x: '2.05cm',
    y: '1.52cm',
    mode: 'math',
    content: 'F_1',
  });
  const auditDoc = a3.nextSource;

  const findings = runVisualPreSubmissionAudit(auditDoc, parseOwnedPrimitives(auditDoc), 8.8);
  assert.ok(findings.some((f) => f.code === 'BBOX-OVERLAP'));
  assert.ok(findings.some((f) => f.code === 'THIN-STROKE-PRINT'));
  const homoFinding = findings.find((f) => f.code === 'MATH-HOMOGLYPH');
  assert.ok(homoFinding);

  const fixedSrc = applyVisualLintAutoFix(auditDoc, homoFinding!);
  assert.ok(fixedSrc.includes('$E = mc^2\\,\\text{Дж}$'));

  const bundleJson = serializeTikzprojSession({
    activeSpecimenId: 'diagram-arch',
    activeFilename: 'optics.tex',
    activeSource: fixedSrc,
    createdDocs: [],
    customSnippets: [],
    sharedStyleTikz: '',
    digitizerCalibration: {
      ref1CanvasCm: { x: 0.8, y: 0.6 },
      ref1Phys: { x: 400, y: 0 },
      ref2CanvasCm: { x: 5.2, y: 3.2 },
      ref2Phys: { x: 800, y: 1 },
    },
    digitizerPointsCm: [{ x: 1.5, y: 2.1 }],
    hiddenLayers: [],
    lockedLayers: ['bg'],
    panelCols: { canvas: 5, code: 4, inspector: 3 },
  });
  const parsed = parseTikzprojSession(bundleJson);
  assert.equal(parsed.ok, true);
  if (parsed.ok) {
    assert.equal(parsed.session.activeFilename, 'optics.tex');
    assert.deepEqual(parsed.session.lockedLayers, ['bg']);
  }
});
