import test from 'node:test';
import assert from 'node:assert/strict';
import {
  analyzeTexDiagnostics,
  buildSpecimenDocuments,
  generateTikzCommand,
  parseOwnedPrimitives,
} from './tikzEngine';
import {
  auditJournalReadability,
  composeSubfigureMatrixTex,
  computeOrthogonalConnectorPointsCm,
  convertPrimitiveToDimensionCallout,
  describeCoordinateNotations,
  ensureDefineColorInPreamble,
  generateForeachArrayInSource,
  injectSharedStyleIntoDocument,
  insertAngleArcIntoSource,
  insertDimensionCalloutIntoSource,
  insertScientificStampIntoSource,
  inspectPgfplotsAxis,
  mirrorOwnedPrimitivesInSource,
  parseClipboardTableToSource,
  resolveSyncTexClick,
  rotateOwnedPrimitivesInSource,
  runBatchProjectAuditAndExport,
  scaleOwnedPrimitivesInSource,
  SHARED_STYLE_DEFAULT_TIKZ,
  upsertPgfplotsAxisInSource,
} from './scientificCadBundle';

test('P21 + P24 + P26: Dimension callouts, angle arcs, polar/relative coords, and orthogonal routing', () => {
  const specimens = buildSpecimenDocuments();
  const base = specimens[0].source;

  // P21: Insert dimension callout (0,0) -> (3,4) => 5.00 cm
  const calloutRes = insertDimensionCalloutIntoSource(base, { x: 0.5, y: 0.5 }, { x: 3.5, y: 4.5 });
  assert.ok(calloutRes.nextSource.includes('|<->|'));
  assert.ok(calloutRes.nextSource.includes('5.00\\,\\text{см}'));
  assert.equal(analyzeTexDiagnostics(calloutRes.nextSource).length, 0);

  // Convert existing line #1 to callout and back
  const converted = convertPrimitiveToDimensionCallout(base, 1, 'f = 20\\,\\text{мм}');
  assert.ok(converted.includes('f = 20\\,\\text{мм}'));
  const reverted = convertPrimitiveToDimensionCallout(converted, 1);
  assert.ok(!reverted.includes('|<->|'));

  // Angle arc
  const arcRes = insertAngleArcIntoSource(base, { x: 1.5, y: 1.5 }, 0, 45, 0.7, '\\theta');
  assert.equal(arcRes.computedDeg, 45);
  assert.ok(arcRes.nextSource.includes('start angle=0, end angle=45'));
  assert.equal(analyzeTexDiagnostics(arcRes.nextSource).length, 0);

  // P24: Coordinate representations (relative ++ and polar +)
  const relCmd = generateTikzCommand('line', {
    start_x: '1.00cm',
    start_y: '1.00cm',
    end_x: '4.00cm',
    end_y: '1.00cm',
    coord_mode: 'relative',
  });
  assert.equal(relCmd, '\\draw (1.00cm,1.00cm) -- ++(3.00cm,0.00cm);');

  const polCmd = generateTikzCommand('arrow', {
    start_x: '1.00cm',
    start_y: '1.00cm',
    end_x: '1.00cm',
    end_y: '3.00cm',
    tip: 'Stealth',
    coord_mode: 'polar',
  });
  assert.equal(polCmd, '\\draw[-{Stealth}] (1.00cm,1.00cm) -- +(90.0:2.00cm);');

  const desc = describeCoordinateNotations({
    start_x: '0.00cm',
    start_y: '0.00cm',
    end_x: '2.00cm',
    end_y: '2.00cm',
  });
  assert.ok(desc.polar.includes('45.0:2.83cm'));

  // P26: Orthogonal routing |- and -|
  const orthoCmd = generateTikzCommand('arrow', {
    start_x: '1.00cm',
    start_y: '1.00cm',
    end_x: '4.00cm',
    end_y: '2.50cm',
    tip: 'Stealth',
    routing: '|-',
    rounded_corners: '3pt',
  });
  assert.equal(orthoCmd, '\\draw[-{Stealth},rounded corners=3pt] (1.00cm,1.00cm) |- (4.00cm,2.50cm);');

  const ptsVh = computeOrthogonalConnectorPointsCm(1, 1, 4, 2.5, '|-');
  assert.equal(ptsVh.length, 3);
  assert.deepEqual(ptsVh[1], { x: 1, y: 2.5 });
});

test('P22 + P23: Rotate, Mirror, Scale group & Parametric \\foreach arrays preserve CRLF', () => {
  const crlfSpecimen = buildSpecimenDocuments()[2]; // CRLF specimen
  assert.ok(crlfSpecimen.source.includes('\r\n'));

  // Rotate 90 deg, Mirror X, Scale 1.5x
  const rotated = rotateOwnedPrimitivesInSource(crlfSpecimen.source, [1], 90);
  assert.ok(rotated.includes('\r\n'));
  const mirrored = mirrorOwnedPrimitivesInSource(rotated, [1], 'x');
  assert.ok(mirrored.includes('\r\n'));
  const scaled = scaleOwnedPrimitivesInSource(mirrored, [1], 1.5);
  const circleAfter = parseOwnedPrimitives(scaled).find((p) => p.id === 1);
  assert.equal(circleAfter?.values.radius, '0.83cm'); // 0.55 * 1.5 = 0.825 -> 0.83cm

  // P23: Linear & Circular \foreach array
  const linArr = generateForeachArrayInSource(crlfSpecimen.source, [1], {
    kind: 'linear',
    count: 5,
    dxCm: 0.65,
    dyCm: 0,
    centerXCm: 2.8,
    centerYCm: 1.65,
    stepDeg: 45,
    replaceOriginal: false,
  });
  assert.ok(linArr.foreachBlock.includes('\\foreach \\i in {0,...,4}'));
  assert.ok(linArr.nextSource.includes('\r\n'));
  assert.equal(analyzeTexDiagnostics(linArr.nextSource).length, 0);

  const circArr = generateForeachArrayInSource(crlfSpecimen.source, [1], {
    kind: 'circular',
    count: 8,
    dxCm: 0,
    dyCm: 0,
    centerXCm: 3.0,
    centerYCm: 2.0,
    stepDeg: 45,
    replaceOriginal: true,
  });
  assert.ok(circArr.foreachBlock.includes('rotate around='));
  assert.equal(parseOwnedPrimitives(circArr.nextSource).length, 0);
});

test('P25 + P27 + P28 + P29 + P30: Stamps, PGFPlots Axis, Journal Gauge, Okabe-Ito & SyncTeX', () => {
  const base = buildSpecimenDocuments()[0].source;

  // P25: Insert parametric stamps
  const lensStamp = insertScientificStampIntoSource(base, 'optics-convex-lens', 3.2, 1.8, 1.0, 'L_{main}');
  assert.ok(lensStamp.insertedIds.length >= 2);
  assert.equal(analyzeTexDiagnostics(lensStamp.nextSource).length, 0);

  // P27: PGFPlots Axis inspect & upsert
  const axisAdded = upsertPgfplotsAxisInSource(base, {
    present: false,
    xlabel: '$f$, Гц',
    ylabel: '$|H(f)|$, дБ',
    xmin: '10',
    xmax: '10000',
    ymin: '-40',
    ymax: '5',
    xmode: 'log',
    ymode: 'normal',
    grid: 'both',
    legendPos: 'north east',
    errorBarsY: true,
  });
  assert.ok(axisAdded.includes('\\usepackage{pgfplots}'));
  assert.ok(axisAdded.includes('xmode=log'));
  assert.ok(axisAdded.includes('error bars/.cd'));
  const inspected = inspectPgfplotsAxis(axisAdded);
  assert.equal(inspected.present, true);
  assert.equal(inspected.xmode, 'log');
  assert.equal(inspected.grid, 'both');

  // P28: Journal Column Readability Gauge
  const wideLine = insertDimensionCalloutIntoSource(base, { x: 0, y: 1 }, { x: 14.5, y: 1 }).nextSource;
  const report = auditJournalReadability(parseOwnedPrimitives(wideLine), wideLine, 'ieee-1col');
  assert.equal(report.passesAll, false);
  assert.ok(report.printScaleFactor < 0.7);
  assert.ok(report.warningsRu.length >= 1);

  // P29: Ensure \definecolor{oiBlue}{HTML}{0072B2} in preamble
  const withOi = ensureDefineColorInPreamble(base, 'oiBlue!12');
  assert.ok(withOi.includes('\\definecolor{oiBlue}{HTML}{0072B2}'));

  // P30: SyncTeX click resolution on both n1 primitive AND custom user macro \myOpticsNote
  const owned = parseOwnedPrimitives(base);
  const hitNode = resolveSyncTexClick(base, owned, { x: 4.85, y: 2.25 });
  assert.equal(hitNode.lineNumber, 16); // #6 node at (4.85cm, 2.25cm)
  const hitMacro = resolveSyncTexClick(base, owned, { x: 2.1, y: 0.28 });
  assert.equal(hitMacro.lineNumber, 17); // \myOpticsNote{...}
});

test('P31 + P32 + P33 + P35: Shared Style, Subfigure (a)(b) Composer, Batch Profiler & TSV Clipboard', () => {
  const specimens = buildSpecimenDocuments();

  // P31: Shared style injection is idempotent
  const styledOnce = injectSharedStyleIntoDocument(specimens[0].source, SHARED_STYLE_DEFAULT_TIKZ);
  const styledTwice = injectSharedStyleIntoDocument(styledOnce, SHARED_STYLE_DEFAULT_TIKZ);
  assert.equal(styledOnce, styledTwice);
  assert.ok(styledOnce.includes('tzOpticRay/.style'));

  // P32: Subfigure (а) (б) composer strips % tikzarium:n1: and builds clean composite .tex
  const matrixDoc = composeSubfigureMatrixTex([specimens[0], specimens[1]], {
    layout: '1x2',
    alphabet: 'ru',
    colGapCm: 0.8,
    rowGapCm: 0.6,
    filename: 'fig_composite_ab.tex',
  });
  assert.ok(matrixDoc.source.includes('{(а)}'));
  assert.ok(matrixDoc.source.includes('{(б)}'));
  assert.ok(!matrixDoc.source.includes('tikzarium:n1:'));
  assert.equal(analyzeTexDiagnostics(matrixDoc.source).length, 0);

  // P33: Batch project audit & profiler
  const batch = runBatchProjectAuditAndExport(specimens);
  assert.equal(batch.items.length, specimens.length);
  assert.equal(batch.errorCount, 1); // error-demo has intentional error
  assert.ok(batch.totalMs > 500);
  assert.ok(!batch.combinedCleanBundleTex.includes('tikzarium:n1:'));

  // P35: Paste Excel TSV clipboard table -> n1 points AND pgfplots \addplot
  const excelTsv = '0,0\t0,15\n1,0\t0,52\n2,0\t0,94\n3,0\t0,41';
  const pastedN1 = parseClipboardTableToSource(specimens[0].source, excelTsv, 'n1-points');
  assert.equal(pastedN1.ok, true);
  assert.equal(pastedN1.pointCount, 4);
  assert.ok(parseOwnedPrimitives(pastedN1.nextSource).length > parseOwnedPrimitives(specimens[0].source).length);

  const pastedPlot = parseClipboardTableToSource(specimens[0].source, excelTsv, 'pgfplots-addplot');
  assert.equal(pastedPlot.ok, true);
  assert.ok(pastedPlot.nextSource.includes('\\addplot'));
});
