import test from 'node:test';
import assert from 'node:assert/strict';
import {
  insertOwnedPrimitiveIntoSource,
  parseDimensionToCm,
  parseOwnedPrimitives,
} from './tikzEngine';
import {
  DEMO_OPTICS_BENCH_SVG,
  alignAmpersandColumnsInSource,
  buildBooktabsTableLatex,
  buildSelfContainedTexBundle,
  buildTexDocumentOutline,
  cleanPreambleAndUnusedLibraries,
  convertDocumentUnitsInSource,
  detectRepeatedTikzStyles,
  extractRepeatedStyleToTikzset,
  findMatchingDelimiterOrEnvAtOffset,
  formatTikzDocumentSource,
  importExternalSvgIntoSource,
  insertBooktabsTableIntoDocument,
  insertCatmullRomSplineIntoSource,
  insertGostSupportCombHatchIntoSource,
  insertParallelOffsetContourIntoSource,
  moveLineInSource,
  organizePreambleAndDetectUnusedLibraries,
  replaceAllInTexPreservingN1,
  toggleLineCommentsInSource,
  trimOrExtendSegmentToBoundaryInSource,
} from './formatterRefactorAndCadBundle';

const BASE_DOC = [
  '\\documentclass[tikz,border=4pt]{standalone}',
  '\\usepackage{tikz}',
  '\\usetikzlibrary{arrows.meta}',
  '\\usetikzlibrary{spy, fit}',
  '\\newcommand{\\myLens}{100\\% КПД}',
  '\\begin{document}',
  '\\begin{tikzpicture}',
  '\\draw[fill=blue!8, thick, draw=blue!75!black] ( 0.0cm , 0.0cm )--( 2.0cm , 0.0cm ) ; % ось',
  '\\end{tikzpicture}',
  '\\end{document}',
].join('\r\n');

test('P66: formatTikzDocumentSource indents nested environments, sorts options, and preserves CRLF, \\newcommand, \\% and n1', () => {
  const ins = insertOwnedPrimitiveIntoSource(BASE_DOC, 'circle', {
    center_x: '1.50cm',
    center_y: '2.00cm',
    radius: '0.60cm',
    stroke_color: 'blue!75!black',
    fill_color: 'blue!8',
    stroke_width: 'thick',
  });

  const formatted = formatTikzDocumentSource(ins.nextSource, { indentSpaces: 2 });
  assert.equal(formatted.lineEnding, 'CRLF');
  assert.ok(formatted.nextSource.includes('\r\n'));
  assert.ok(formatted.nextSource.includes('\\newcommand{\\myLens}{100\\% КПД}'));
  // Canonical option order: thick (10) -> draw=blue!75!black (30) -> fill=blue!8 (40)
  assert.ok(
    formatted.nextSource.includes(
      '    \\draw[thick, draw=blue!75!black, fill=blue!8] (0.0cm, 0.0cm) -- (2.0cm, 0.0cm);  % ось'
    )
  );

  const ownedAfter = parseOwnedPrimitives(formatted.nextSource);
  assert.equal(ownedAfter.length, 1);
  assert.equal(ownedAfter[0].values.radius, '0.60cm');
  assert.ok(ownedAfter[0].commandPart.startsWith('    \\draw'));
});

test('P67: convertDocumentUnitsInSource converts owned n1 and raw coordinates cm -> mm while preserving physical geometry', () => {
  const ins = insertOwnedPrimitiveIntoSource(BASE_DOC, 'rectangle', {
    start_x: '1.25cm',
    start_y: '0.50cm',
    end_x: '3.00cm',
    end_y: '2.00cm',
    stroke_color: 'black',
    stroke_width: 'semithick',
  });

  const res = convertDocumentUnitsInSource(ins.nextSource, 'mm');
  assert.equal(res.convertedPrimitivesCount, 1);
  const owned = parseOwnedPrimitives(res.nextSource);
  assert.equal(owned[0].values.start_x, '12.5mm');
  assert.equal(owned[0].values.end_x, '30.0mm');
  assert.ok(Math.abs((parseDimensionToCm(owned[0].values.start_x) ?? 0) - 1.25) < 1e-6);
  assert.ok(res.nextSource.includes('20.0mm'));
});

test('P68 & P69: DRY style extraction and preamble unused library cleanup', () => {
  let src = BASE_DOC;
  for (let i = 0; i < 3; i++) {
    src = insertOwnedPrimitiveIntoSource(src, 'rectangle', {
      start_x: `${i.toFixed(2)}cm`,
      start_y: '0.00cm',
      end_x: `${(i + 0.8).toFixed(2)}cm`,
      end_y: '0.80cm',
      stroke_width: 'thick',
      stroke_color: 'teal!80!black',
      fill_color: 'emerald!10',
    }).nextSource;
  }

  const candidates = detectRepeatedTikzStyles(parseOwnedPrimitives(src));
  assert.equal(candidates.length, 1);
  assert.equal(candidates[0].occurrences, 3);

  const extracted = extractRepeatedStyleToTikzset(
    src,
    candidates[0].suggestedStyleName,
    candidates[0].tikzOptionsBody
  );
  assert.ok(extracted.nextSource.includes('\\tikzset{tzStyle1/.style={'));

  const audit = organizePreambleAndDetectUnusedLibraries(extracted.nextSource);
  assert.deepEqual(
    audit.unusedLibraries.map((u) => u.name).sort(),
    ['arrows.meta', 'fit', 'spy']
  );

  // Add an arrow so arrows.meta becomes used, while fit and spy stay unused
  const withArrow = insertOwnedPrimitiveIntoSource(extracted.nextSource, 'arrow', {
    start_x: '0.00cm',
    start_y: '0.00cm',
    end_x: '1.00cm',
    end_y: '1.00cm',
    tip: 'Stealth',
    stroke_width: 'thick',
  }).nextSource;

  const cleaned = cleanPreambleAndUnusedLibraries(withArrow, { removeUnusedLibraries: true });
  assert.deepEqual(cleaned.keptLibraries, ['arrows.meta']);
  assert.deepEqual(cleaned.removedLibraries, ['fit', 'spy']);
  assert.ok(cleaned.nextSource.includes('\\usetikzlibrary{arrows.meta}'));
});

test('P70–P73: n1-safe replaceAll, bracket/env matching, document outline, comment toggle, line move, and & alignment', () => {
  const withNode = insertOwnedPrimitiveIntoSource(BASE_DOC, 'node', {
    x: '1.00cm',
    y: '1.00cm',
    content: 'Лазер alpha',
    mode: 'text',
    node_id: 'LaserA',
  }).nextSource;

  const rep = replaceAllInTexPreservingN1(withNode, 'alpha', 'beta');
  assert.equal(rep.replacementsCount, 1);
  const owned = parseOwnedPrimitives(rep.nextSource);
  assert.equal(owned[0].values.content, 'Лазер beta');

  // Matching \begin{tikzpicture} -> \end{tikzpicture}
  const beginIdx = rep.nextSource.indexOf('\\begin{tikzpicture}') + 3;
  const match = findMatchingDelimiterOrEnvAtOffset(rep.nextSource, beginIdx);
  assert.ok(match);
  assert.equal(match.kind, 'environment');
  assert.equal(match.closeLabel, '\\end{tikzpicture}');

  // Outline contains preamble, macro, tikzpicture, and named node (LaserA)
  const outline = buildTexDocumentOutline(rep.nextSource);
  assert.ok(outline.some((item) => item.kind === 'macro' && item.label === '\\myLens'));
  assert.ok(outline.some((item) => item.kind === 'node' && item.label === '(LaserA)'));

  // Toggle % comment and toggle back
  const commented = toggleLineCommentsInSource(rep.nextSource, 5, 5);
  assert.ok(commented.split(/\r?\n/)[4].startsWith('% '));
  const uncommented = toggleLineCommentsInSource(commented, 5, 5);
  assert.equal(uncommented.split(/\r?\n/)[4], '\\newcommand{\\myLens}{100\\% КПД}');

  // Move line down & up
  const moved = moveLineInSource('A\r\nB\r\nC', 1, 1);
  assert.equal(moved.nextSource, 'B\r\nA\r\nC');
  assert.equal(moved.nextLineNumber, 2);

  // Align & columns
  const messyTable = '  λ & P_мВт & КПД \\\\\n  1064.5 & 42.1 & 0.89 \\\\';
  const aligned = alignAmpersandColumnsInSource(messyTable);
  assert.equal(aligned.alignedRowsCount, 2);
  const alignedLines = aligned.nextSource.split('\n');
  assert.equal(alignedLines[0].indexOf('&'), alignedLines[1].indexOf('&'));
});

test('P74–P77: Parallel contour offset, Catmull–Rom spline, Trim/Extend, and ГОСТ support comb', () => {
  let src = insertOwnedPrimitiveIntoSource(BASE_DOC, 'line', {
    start_x: '0.00cm',
    start_y: '1.00cm',
    end_x: '4.00cm',
    end_y: '1.00cm',
    stroke_width: 'thick',
  }).nextSource;
  const firstId = parseOwnedPrimitives(src)[0].id;

  // P74: Offset +0.50cm along Y
  const off = insertParallelOffsetContourIntoSource(src, firstId, 0.5);
  assert.ok(off.newId !== null);
  const afterOffset = parseOwnedPrimitives(off.nextSource);
  const offsetLine = afterOffset.find((p) => p.id === off.newId)!;
  assert.equal(offsetLine.values.start_y, '1.50cm');
  assert.equal(offsetLine.values.end_y, '1.50cm');

  // P75: Catmull–Rom Spline through 4 anchor points
  const spline = insertCatmullRomSplineIntoSource(
    off.nextSource,
    [
      { x: 0, y: 0 },
      { x: 1.2, y: 1.1 },
      { x: 2.6, y: 0.7 },
      { x: 4.0, y: 1.8 },
    ],
    { arrowTipOnLast: true }
  );
  assert.equal(spline.insertedIds.length, 4); // 3 cubic segments + 1 Stealth arrow

  // P76: Trim horizontal ray (0,1)->(4,1) against vertical boundary x=2.50cm
  const withBoundary = insertOwnedPrimitiveIntoSource(off.nextSource, 'line', {
    start_x: '2.50cm',
    start_y: '0.00cm',
    end_x: '2.50cm',
    end_y: '3.00cm',
  });
  const trimmed = trimOrExtendSegmentToBoundaryInSource(
    withBoundary.nextSource,
    firstId,
    withBoundary.newId,
    'trim'
  );
  assert.equal(trimmed.ok, true);
  const trimmedPrim = parseOwnedPrimitives(trimmed.nextSource).find((p) => p.id === firstId)!;
  assert.equal(trimmedPrim.values.end_x, '2.50cm');
  assert.equal(trimmedPrim.values.end_y, '1.00cm');

  // P77: ГОСТ support comb along boundary segment
  const comb = insertGostSupportCombHatchIntoSource(trimmed.nextSource, withBoundary.newId, {
    stepCm: 0.5,
    toothLenCm: 0.25,
    angleDeg: 45,
  });
  assert.ok(comb.insertedIds.length >= 6);
});

test('P78–P80: External SVG importer, booktabs + siunitx table builder, and single-file filecontents* bundle', () => {
  // P78: Import demo SVG
  const svgRes = importExternalSvgIntoSource(BASE_DOC, DEMO_OPTICS_BENCH_SVG, {
    targetWidthCm: 8.0,
  });
  assert.equal(svgRes.insertedIds.length, 5);
  assert.equal(parseOwnedPrimitives(svgRes.nextSource).length, 5);

  // P79: Booktabs + siunitx table
  const csv = 'Режим,Длина волны нм,Мощность мВт\nИмпульсный,532.0,125.4\nНепрерывный,1064.0,84.2';
  const tbl = buildBooktabsTableLatex(csv, {
    captionRu: 'Режимы генерации лазера',
    label: 'tab:laser',
    useSiunitxSColumn: true,
  });
  assert.equal(tbl.rowCount, 3);
  assert.equal(tbl.colCount, 3);
  assert.ok(tbl.latexBlock.includes('\\toprule'));
  assert.ok(tbl.latexBlock.includes('\\midrule'));
  assert.ok(tbl.latexBlock.includes('\\bottomrule'));
  assert.ok(tbl.latexBlock.includes('{@{ }lSS@{}}'.replace('@{ }', '@{}')));

  const withTable = insertBooktabsTableIntoDocument(svgRes.nextSource, tbl.latexBlock, true);
  assert.ok(withTable.includes('\\usepackage{booktabs}'));
  assert.ok(withTable.includes('\\usepackage{siunitx}'));

  // P80: Self-contained single-file bundle with filecontents* and clean n1 strip
  const bundle = buildSelfContainedTexBundle(withTable, {
    stripN1Metadata: true,
    formatCode: true,
    embeddedFiles: [{ filename: 'spectrum.csv', content: 'x,y\n0,1\n1,2' }],
  });
  assert.equal(bundle.embeddedCount, 1);
  assert.equal(bundle.strippedOwnedCount, 5);
  assert.ok(bundle.bundledSource.includes('\\begin{filecontents*}[overwrite]{spectrum.csv}'));
  assert.ok(!bundle.bundledSource.includes('% tikzarium:n1:'));
});
