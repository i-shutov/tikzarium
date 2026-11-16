import test from 'node:test';
import assert from 'node:assert/strict';
import {
  analyzeTexDiagnostics,
  buildSpecimenDocuments,
  parseOwnedPrimitives,
} from './tikzEngine';
import { applyDiagnosticQuickFix, getPrimitiveHandles } from './ergonomicsBundle';
import {
  buildManuscriptFigureWrapper,
  buildScopedTikzPreview,
  clampSplitterColumns,
  constructIntersectionOrPerpendicularInSource,
  extractPgfMathMacros,
  formatPhysicalQuantityLatex,
  insertAnalyticalPlotIntoSource,
  insertDigitizedCurveIntoSource,
  insertPolygonContourIntoSource,
  insertVectorFieldIntoSource,
  isBeamerSpecVisibleOnSlide,
  mapCanvasPointsToPhysical,
  sampleAnalyticalFunctionToCanvas,
  scrubNumericLiteralInSource,
  upsertPgfMathMacroInSource,
} from './advancedCadBundle';

test('P36 + P38: closed polygon (-- cycle) with ГОСТ hatch pattern roundtrips n1 and vertex handles', () => {
  const doc = buildSpecimenDocuments()[0].source;
  const res = insertPolygonContourIntoSource(
    doc,
    [
      { xCm: 1.5, yCm: 1.0 },
      { xCm: 3.3, yCm: 1.0 },
      { xCm: 2.4, yCm: 2.4 },
    ],
    true,
    { hatchPattern: 'north east lines', strokeColor: 'oiBlue' }
  );
  assert.ok(res.nextSource.includes('\\usetikzlibrary{patterns}'));
  assert.ok(res.nextSource.includes('pattern=north east lines'));
  assert.ok(res.nextSource.includes('-- cycle;'));

  const owned = parseOwnedPrimitives(res.nextSource).find((p) => p.id === res.newId);
  assert.ok(owned);
  const handles = getPrimitiveHandles(owned);
  assert.equal(handles.length, 3);
  assert.equal(handles[0].handleId, 'poly_0');
});

test('P37: constructs exact Line-Line intersection and Node-Line perpendicular foot with 90° square', () => {
  const doc = buildSpecimenDocuments()[0].source;
  // Specimen 0 has #1 horizontal optical axis (0.4,1.8)--(5.8,1.8) and #6 node F_1 at (4.85,2.25)
  const perp = constructIntersectionOrPerpendicularInSource(doc, [1, 6]);
  assert.equal(perp.ok, true);
  assert.equal(perp.pointsCm.length, 1);
  assert.equal(perp.pointsCm[0].x, 4.85);
  assert.equal(perp.pointsCm[0].y, 1.8);
  assert.ok(perp.nextSource.includes('H_\\perp'));

  // Line #1 (y=1.80) and Circle #3 (center 2.70, 1.80, r=0.85) -> two intersections at x = 1.85 and 3.55
  const lineCirc = constructIntersectionOrPerpendicularInSource(doc, [1, 3], 'P');
  assert.equal(lineCirc.ok, true);
  assert.equal(lineCirc.pointsCm.length, 2);
  assert.equal(lineCirc.pointsCm[0].x, 1.85);
  assert.equal(lineCirc.pointsCm[1].x, 3.55);
});

test('P40 + P41: pgfmathsetmacro live variable upsert and .tex numeric literal scrubbing syncs n1', () => {
  const doc = buildSpecimenDocuments()[0].source;
  const withMacro = upsertPgfMathMacroInSource(doc, 'focalLen', 2.4, 'Фокус линзы', {
    primitiveId: 3,
    paramKey: 'radius',
  });
  const macros = extractPgfMathMacros(withMacro);
  assert.equal(macros.length, 1);
  assert.equal(macros[0].name, 'focalLen');
  assert.equal(macros[0].value, 2.4);

  const circleAfterMacro = parseOwnedPrimitives(withMacro).find((p) => p.id === 3);
  assert.equal(circleAfterMacro?.values.radius, '2.40cm');

  // Scrub circle line radius literal +0.10cm
  const scrub = scrubNumericLiteralInSource(
    withMacro,
    circleAfterMacro!.lineNumber,
    circleAfterMacro!.commandPart.indexOf('2.40cm') + 1,
    1,
    false
  );
  assert.equal(scrub.ok, true);
  assert.equal(scrub.nextToken, '2.50cm');
  const circleAfterScrub = parseOwnedPrimitives(scrub.nextSource).find((p) => p.id === 3);
  assert.equal(circleAfterScrub?.values.radius, '2.50cm');
});

test('P42: detects bare Cyrillic SI units inside inline math and fixes to ГОСТ upright \\,\\text{...}', () => {
  const raw = [
    '\\documentclass{standalone}',
    '\\usepackage{fontspec}',
    '\\usepackage{tikz}',
    '\\begin{document}',
    '\\begin{tikzpicture}',
    '  \\node at (2cm,2cm) {$f = 25 мм$};',
    '\\end{tikzpicture}',
    '\\end{document}',
  ].join('\n');

  const diags = analyzeTexDiagnostics(raw);
  const unitDiag = diags.find((d) => d.code === 'TEX-ITALIC-UNIT');
  assert.ok(unitDiag);
  const fixed = applyDiagnosticQuickFix(raw, unitDiag);
  assert.equal(fixed.ok, true);
  assert.ok(fixed.nextSource.includes('$f = 25\\,\\text{мм}$'));

  const siStr = formatPhysicalQuantityLatex({
    symbolLatex: '\\lambda',
    valueStr: '532',
    uncertaintyStr: '0.5',
    unitPresetId: 'nm',
    notation: 'gost-text',
  });
  assert.equal(siStr, '\\lambda = (532 \\pm 0.5)\\,\\text{нм}');
});

test('P43 + P44 + P45: plot digitizer calibration, analytical curve sampler & vector field generator', () => {
  const mapped = mapCanvasPointsToPhysical(
    [
      { x: 1.0, y: 1.0 },
      { x: 3.0, y: 2.0 },
      { x: 5.0, y: 3.0 },
    ],
    {
      ref1CanvasCm: { x: 1.0, y: 1.0 },
      ref1Phys: { x: 400, y: 0 },
      ref2CanvasCm: { x: 5.0, y: 3.0 },
      ref2Phys: { x: 800, y: 1 },
    }
  );
  assert.equal(mapped[1].xPhys, 600);
  assert.equal(mapped[1].yPhys, 0.5);

  const doc = buildSpecimenDocuments()[0].source;
  const dig = insertDigitizedCurveIntoSource(doc, mapped, 'pgfplots-coordinates');
  assert.ok(dig.insertedId !== null);
  assert.ok(dig.nextSource.includes('(600,0.5)'));

  const sampled = sampleAnalyticalFunctionToCanvas('sinc-diffraction', -3, 3, 25, 3.0);
  assert.equal(sampled.ok, true);
  assert.equal(sampled.canvasPoints.length, 25);

  const plotIns = insertAnalyticalPlotIntoSource(doc, 'damped-cos', 0, 4, 20, 0.4);
  assert.equal(plotIns.ok, true);

  const vf = insertVectorFieldIntoSource(doc, 'vortex-b', 3, 3);
  assert.ok(vf.insertedIds.length >= 8);
});

test('P46 + P47 + P48 + P49: scope preview, Beamer slide visibility, figure wrapper & splitter clamping', () => {
  assert.equal(isBeamerSpecVisibleOnSlide('2-', 1), false);
  assert.equal(isBeamerSpecVisibleOnSlide('2-', 2), true);
  assert.equal(isBeamerSpecVisibleOnSlide('2-3', 4), false);

  const doc = buildSpecimenDocuments()[0].source;
  const scoped = buildScopedTikzPreview(doc);
  assert.ok(scoped.includes('\\begin{scope}[local bounding box=scope_main]'));

  const fig = buildManuscriptFigureWrapper(doc, {
    formatId: 'gost-vak',
    captionRu: 'Оптическая схема фокусировки пучка',
    labelKey: 'fig:beam',
    useResizebox: true,
  });
  assert.ok(fig.figureCode.includes('\\begin{figure}[htbp]'));
  assert.ok(fig.figureCode.includes('\\resizebox{0.85\\textwidth}{!}'));
  assert.equal(fig.refSnippet, 'см.~рис.~\\ref{fig:beam}');

  const cols = clampSplitterColumns(15, 10, false);
  assert.equal(cols.canvas + cols.code + cols.inspector, 24);
});
