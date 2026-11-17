import test from 'node:test';
import assert from 'node:assert/strict';
import {
  insertOwnedPrimitiveIntoSource,
  parseOwnedPrimitives,
  serializePolyPointsList,
} from './tikzEngine';
import {
  WORKSPACE_ROLE_PROFILES,
  WORKSHOP_CATALOG_ITEMS,
  calibratePrimitivesByTwoPointsInSource,
  computeBooleanContourInSource,
  computeSampleStatistics,
  computeSelectionGeometryMetrics,
  computeThreePointArcGeometry,
  computeVisualPrimitiveDiff,
  constructCircleTangentsInSource,
  deletePolyVertexAtIndexInSource,
  detectRepeatedMagicNumbers,
  expandSelectionWithGroups,
  extractTikzsetStylesFromPreamble,
  getPolyEdgeMidpoints,
  groupPrimitivesInSource,
  insertCentroidMarkerIntoSource,
  insertElectricalCircuitElementIntoSource,
  insertGostFlowchartAutoLayoutIntoSource,
  insertLeastSquaresFitIntoSource,
  insertMechanicsBeamWithDiagramsIntoSource,
  insertOpticalBenchRayTraceIntoSource,
  insertParametricEllipseIntoSource,
  insertPolyVertexAtEdgeInSource,
  insertScientificGanttChartIntoSource,
  insertStatisticalPlotIntoSource,
  insertThreePointArcIntoSource,
  joinPreambleAndBodyToSource,
  parameterizeMagicNumberIntoPreamble,
  rerouteBoundConnectorsInSource,
  revertSinglePrimitiveFromRevision,
  snapPointByGridMode,
  splitTexDocumentIntoPreambleAndBody,
  togglePolyClosedInSource,
  ungroupPrimitivesInSource,
  upsertQuickTikzsetStyleInPreamble,
} from './workspaceAndEngineeringStageBundle';

const BASE_DOC_LF = [
  '\\documentclass[tikz,border=2pt]{standalone}',
  '\\usetikzlibrary{arrows.meta}',
  '\\begin{document}',
  '\\begin{tikzpicture}',
  '\\end{tikzpicture}',
  '\\end{document}',
  '',
].join('\n');

const BASE_DOC_CRLF = BASE_DOC_LF.replace(/\n/g, '\r\n');

test('E01: splitTexDocumentIntoPreambleAndBody & joinPreambleAndBodyToSource preserve exact LF and CRLF bytes', () => {
  const resLf = splitTexDocumentIntoPreambleAndBody(BASE_DOC_LF);
  assert.equal(resLf.hasPreamble, true);
  assert.equal(resLf.lineEnding, '\n');
  assert.equal(resLf.preambleLineCount, 2);
  assert.equal(resLf.bodyStartLine, 3);
  assert.equal(
    joinPreambleAndBodyToSource(resLf.preambleText, resLf.bodyText, resLf.lineEnding),
    BASE_DOC_LF
  );

  const resCrlf = splitTexDocumentIntoPreambleAndBody(BASE_DOC_CRLF);
  assert.equal(resCrlf.hasPreamble, true);
  assert.equal(resCrlf.lineEnding, '\r\n');
  assert.equal(resCrlf.preambleLineCount, 2);
  assert.equal(resCrlf.bodyStartLine, 3);
  assert.equal(
    joinPreambleAndBodyToSource(resCrlf.preambleText, resCrlf.bodyText, resCrlf.lineEnding),
    BASE_DOC_CRLF
  );
});

test('E02 & E07: workspace role profiles and workshop catalog metadata are complete', () => {
  assert.equal(WORKSPACE_ROLE_PROFILES.length, 4);
  assert.ok(WORKSHOP_CATALOG_ITEMS.length >= 16);
});

test('F01: polygon vertex midpoint handles, insertion, deletion, and cycle toggle', () => {
  const tri = [
    { xCm: 1, yCm: 1 },
    { xCm: 3, yCm: 1 },
    { xCm: 2, yCm: 3 },
  ];
  const created = insertOwnedPrimitiveIntoSource(BASE_DOC_LF, 'line', {
    start_x: '1.00cm',
    start_y: '1.00cm',
    end_x: '3.00cm',
    end_y: '1.00cm',
    poly_points: serializePolyPointsList(tri),
  });
  const prim0 = parseOwnedPrimitives(created.nextSource)[0];
  const midsOpen = getPolyEdgeMidpoints(prim0);
  assert.equal(midsOpen.length, 2);

  const closedRes = togglePolyClosedInSource(created.nextSource, created.newId);
  assert.equal(closedRes.ok, true);
  assert.equal(closedRes.isClosed, true);
  const primClosed = parseOwnedPrimitives(closedRes.nextSource)[0];
  assert.equal(getPolyEdgeMidpoints(primClosed).length, 3);

  const insRes = insertPolyVertexAtEdgeInSource(closedRes.nextSource, created.newId, 0);
  assert.equal(insRes.ok, true);
  assert.equal(insRes.vertexCount, 4);

  const delRes = deletePolyVertexAtIndexInSource(insRes.nextSource, created.newId, 1);
  assert.equal(delRes.ok, true);
  assert.equal(delRes.vertexCount, 3);
});

test('F02: 3-point circular arc & rotated parametric ellipse emit valid n1 primitives', () => {
  const geom = computeThreePointArcGeometry({ x: 1, y: 2 }, { x: 2, y: 3 }, { x: 3, y: 2 });
  assert.equal(geom.isCollinear, false);
  assert.ok(Math.abs(geom.radiusCm - 1.0) < 0.05);

  const arcRes = insertThreePointArcIntoSource(
    BASE_DOC_LF,
    { x: 1, y: 2 },
    { x: 2, y: 3 },
    { x: 3, y: 2 }
  );
  assert.ok(arcRes.insertedIds.length >= 1);
  assert.equal(parseOwnedPrimitives(arcRes.nextSource).length, arcRes.insertedIds.length);

  const ellRes = insertParametricEllipseIntoSource(BASE_DOC_LF, { x: 3, y: 2 }, 1.4, 0.8, 30, {
    fillColor: 'cyan!10',
  });
  const ellPrim = parseOwnedPrimitives(ellRes.nextSource)[0];
  assert.equal(ellPrim.values.poly_closed, 'cycle');
});

test('F03 & F04: topological connector rerouting and primitive group/ungroup', () => {
  let src = BASE_DOC_LF;
  const nA = insertOwnedPrimitiveIntoSource(src, 'node', {
    x: '1.00cm',
    y: '2.00cm',
    mode: 'text',
    content: 'A',
    node_id: 'NodeA',
  });
  src = nA.nextSource;
  const nB = insertOwnedPrimitiveIntoSource(src, 'node', {
    x: '4.50cm',
    y: '2.50cm',
    mode: 'text',
    content: 'B',
    node_id: 'NodeB',
  });
  src = nB.nextSource;
  const conn = insertOwnedPrimitiveIntoSource(src, 'arrow', {
    start_x: '0.50cm',
    start_y: '0.50cm',
    end_x: '1.50cm',
    end_y: '1.50cm',
    tip: 'Stealth',
    from_node: 'NodeA',
    to_node: 'NodeB',
  });
  src = conn.nextSource;

  const rerouted = rerouteBoundConnectorsInSource(src);
  assert.equal(rerouted.reroutedCount, 1);
  const updatedConn = parseOwnedPrimitives(rerouted.nextSource).find((p) => p.id === conn.newId);
  assert.equal(updatedConn?.values.start_x, '1.00cm');
  assert.equal(updatedConn?.values.end_x, '4.50cm');

  const grp = groupPrimitivesInSource(rerouted.nextSource, [nA.newId, nB.newId]);
  assert.equal(grp.ok, true);
  const allGrouped = parseOwnedPrimitives(grp.nextSource);
  const expanded = expandSelectionWithGroups(allGrouped, [nA.newId]);
  assert.ok(expanded.includes(nB.newId));

  const ungrp = ungroupPrimitivesInSource(grp.nextSource, [nA.newId]);
  assert.equal(ungrp.ok, true);
  assert.equal(ungrp.ungroupedCount, 2);
});

test('F05 & F06: polar/isometric snapping and Shoelace contour area/centroid calculator', () => {
  const polarSnap = snapPointByGridMode({ x: 4.1, y: 1.9 }, 'polar', 0.5, { x: 3.1, y: 1.9 });
  assert.equal(polarSnap.polarRadiusCm, 1);
  assert.equal(polarSnap.polarAngleDeg, 0);

  const isoSnap = snapPointByGridMode({ x: 3.97, y: 2.4 }, 'isometric', 0.5, { x: 3.1, y: 1.9 });
  assert.ok(Number.isFinite(isoSnap.x) && Number.isFinite(isoSnap.y));

  const rectDoc = insertOwnedPrimitiveIntoSource(BASE_DOC_LF, 'rectangle', {
    start_x: '1.00cm',
    start_y: '1.00cm',
    end_x: '3.00cm',
    end_y: '2.50cm',
  });
  const metrics = computeSelectionGeometryMetrics(parseOwnedPrimitives(rectDoc.nextSource));
  assert.ok(metrics);
  assert.equal(metrics.areaCm2, 3);
  assert.equal(metrics.perimeterCm, 7);
  assert.deepEqual(metrics.centroidCm, { x: 2, y: 1.75 });

  const centDoc = insertCentroidMarkerIntoSource(rectDoc.nextSource, metrics.centroidCm);
  assert.equal(centDoc.insertedIds.length, 3);
});

test('F07, F08 & F09: preamble tikzset styles, magic number parameterizer, and 2-point scale calibration', () => {
  const withStyle = upsertQuickTikzsetStyleInPreamble(
    BASE_DOC_LF,
    'sensorBox',
    'thick,draw=blue!75!black,fill=blue!8'
  );
  const styles = extractTikzsetStylesFromPreamble(withStyle.nextSource);
  assert.equal(styles.length, 1);
  assert.equal(styles[0].name, 'sensorBox');

  // Emit owned primitive using custom_style
  const styledRect = insertOwnedPrimitiveIntoSource(withStyle.nextSource, 'rectangle', {
    start_x: '1.50cm',
    start_y: '1.50cm',
    end_x: '3.20cm',
    end_y: '2.80cm',
    custom_style: 'sensorBox',
  });
  assert.ok(styledRect.nextSource.includes('\\draw[sensorBox'));

  const magicCandidates = detectRepeatedMagicNumbers(styledRect.nextSource);
  assert.ok(magicCandidates.length >= 1);
  const paramRes = parameterizeMagicNumberIntoPreamble(styledRect.nextSource, magicCandidates[0], 'OffsetBase');
  assert.ok(paramRes.nextSource.includes('\\pgfmathsetmacro{\\OffsetBase}{1.50}'));

  const calRes = calibratePrimitivesByTwoPointsInSource(
    paramRes.nextSource,
    { x: 0, y: 0 },
    { x: 1, y: 0 },
    2.0
  );
  assert.equal(calRes.ok, true);
  assert.equal(calRes.scaleFactor, 2);
});

test('F10 & F11: 2D boolean operations, circle tangents, and selective single-primitive revert', () => {
  let src = BASE_DOC_LF;
  const r1 = insertOwnedPrimitiveIntoSource(src, 'rectangle', {
    start_x: '1.00cm',
    start_y: '1.00cm',
    end_x: '3.00cm',
    end_y: '3.00cm',
  });
  src = r1.nextSource;
  const r2 = insertOwnedPrimitiveIntoSource(src, 'rectangle', {
    start_x: '2.00cm',
    start_y: '1.50cm',
    end_x: '4.00cm',
    end_y: '2.50cm',
  });
  src = r2.nextSource;

  for (const op of ['union', 'difference', 'intersection', 'xor'] as const) {
    const bRes = computeBooleanContourInSource(src, [r1.newId, r2.newId], op);
    assert.equal(bRes.ok, true, `boolean ${op} failed`);
    assert.ok(bRes.insertedIds.length >= 1);
  }

  // Circle tangents
  let cSrc = BASE_DOC_LF;
  const c1 = insertOwnedPrimitiveIntoSource(cSrc, 'circle', {
    center_x: '1.50cm',
    center_y: '2.00cm',
    radius: '0.60cm',
  });
  cSrc = c1.nextSource;
  const c2 = insertOwnedPrimitiveIntoSource(cSrc, 'circle', {
    center_x: '4.20cm',
    center_y: '2.00cm',
    radius: '0.35cm',
  });
  cSrc = c2.nextSource;
  const tanRes = constructCircleTangentsInSource(cSrc, [c1.newId, c2.newId], 'both');
  assert.equal(tanRes.ok, true);
  assert.equal(tanRes.insertedIds.length, 4);

  // Selective revert (F11)
  const diff = computeVisualPrimitiveDiff(BASE_DOC_LF, cSrc);
  assert.equal(diff.added.length, 2);
  const revOne = revertSinglePrimitiveFromRevision(cSrc, BASE_DOC_LF, c1.newId);
  assert.equal(revOne.ok, true);
  const remaining = parseOwnedPrimitives(revOne.nextSource);
  assert.equal(remaining.length, 1);
  assert.equal(remaining[0].id, c2.newId);
});

test('F12–F16: electrical circuits, thin-lens ray tracing, beam Q/M diagrams, ГОСТ 19.701, OLS & BoxPlot', () => {
  const ckt = insertElectricalCircuitElementIntoSource(BASE_DOC_LF, 'resistor-gost');
  assert.ok(ckt.insertedIds.length >= 4);
  assert.ok(ckt.nextSource.includes('\\usepackage{siunitx}'));

  const opt = insertOpticalBenchRayTraceIntoSource(BASE_DOC_LF, {
    focalLengthCm: 1.0,
    objectDistanceCm: 1.8,
    objectHeightCm: 0.7,
  });
  assert.equal(opt.isVirtual, false);
  assert.ok(opt.insertedIds.length >= 6);

  const beam = insertMechanicsBeamWithDiagramsIntoSource(BASE_DOC_LF, {
    supportKind: 'simply-supported',
    spanLengthKnM: 4,
    pointLoadKn: 10,
    distributedLoadKnPerM: 2,
  });
  assert.ok(beam.maxShearKn > 0);
  assert.ok(beam.maxMomentKnM > 0);

  const flow = insertGostFlowchartAutoLayoutIntoSource(
    BASE_DOC_LF,
    'Старт -> Ввод -> Сходимость? -> Выход'
  );
  assert.ok(flow.insertedIds.length >= 7);

  const gantt = insertScientificGanttChartIntoSource(BASE_DOC_LF, 'Теория;1;2\nЭксперимент;2;5');
  assert.ok(gantt.insertedIds.length >= 6);

  const ols = insertLeastSquaresFitIntoSource(
    BASE_DOC_LF,
    '1 2.1\n2 3.9\n3 6.1\n4 8.0\n5 10.1',
    'linear'
  );
  assert.ok(ols.rSquared > 0.99);
  assert.ok(ols.insertedIds.length >= 8);

  const stats = computeSampleStatistics('10 12 13 14 15 16 42');
  assert.equal(stats.n, 7);
  assert.equal(stats.outliers.length, 1);

  const box = insertStatisticalPlotIntoSource(BASE_DOC_LF, '10 12 13 14 15 16 42', 'boxplot');
  assert.ok(box.insertedIds.length >= 7);
});
