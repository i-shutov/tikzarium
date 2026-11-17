import test from 'node:test';
import assert from 'node:assert/strict';
import {
  tokenizeTexSource,
  validateParameterLiteral,
  generateOwnedLine,
  parseOwnedPrimitives,
  applyOwnedPrimitivePatch,
  proposeLibraryConnect,
  proposeLibraryDisconnect,
  analyzeTexDiagnostics,
  buildSpecimenDocuments,
  measureMetadataShare,
  snapCoordinateCm,
  stepDimensionLiteral,
  translateOwnedPrimitiveCm,
  duplicateOwnedPrimitiveInSource,
  deleteOwnedPrimitiveFromSource,
  computeGestureDraftPreview,
  validateToolDraft,
  generateTikzCommand,
} from './tikzEngine';
import { resolveTexCommandHover } from './texHoverHelp';
import {
  DOCUMENT_TEMPLATES,
  buildDocumentFromTemplate,
  validateTemplateFilename,
} from './documentTemplates';
import {
  getPrimitiveHandles,
  applyHandleDragToValues,
  computeSmartSnap,
  findPrimitivesInMarquee,
  alignOwnedPrimitivesInSource,
  reorderOwnedPrimitiveInSource,
  resolveSmartConnectorEndpoints,
  detectPreambleFoldRange,
  getTexAutocompleteSuggestions,
  detectAdoptableTikzLines,
  adoptRawTikzLineIntoN1,
  detachOwnedPrimitiveToCleanTikz,
  stripAllOwnershipMetadata,
  extractTikzpictureBlock,
  computeStructuredLineDiff,
  applyDiagnosticQuickFix,
  convertCsvToPgfplotsDocument,
  BUILTIN_AUTHOR_SNIPPETS,
  createSnippetFromPrimitives,
  insertSnippetIntoSource,
} from './ergonomicsBundle';

test('U-G1 source integrity: tokenizeTexSource preserves exact bytes including Cyrillic, escaped %, and CRLF', () => {
  const specimens = buildSpecimenDocuments();
  for (const doc of specimens) {
    const spans = tokenizeTexSource(doc.source);
    const reconstructed = spans.map((s) => s.text).join('');
    assert.equal(reconstructed, doc.source, `Byte mismatch in ${doc.filename}`);
  }
});

test('UX-F02 metadata measurement: 6 owned primitives carry >60% hex ownership metadata without corrupting code', () => {
  const optical = buildSpecimenDocuments().find((d) => d.id === 'cubic-owned')!;
  const stats = measureMetadataShare(optical.source);
  assert.equal(stats.ownedCount, 6);
  assert.ok(stats.metadataPercent > 60, `Expected >60% metadata share, got ${stats.metadataPercent}%`);
});

test('C negative-cases guard: validateParameterLiteral blocks TeX injection, missing units, exponents, and zero radius', () => {
  assert.equal(validateParameterLiteral('line', 'start_x', '1cm] \\input{evil}').valid, false);
  assert.equal(validateParameterLiteral('line', 'start_x', '1').valid, false);
  assert.equal(validateParameterLiteral('line', 'start_y', '1e9cm').valid, false);
  assert.equal(validateParameterLiteral('circle', 'radius', '0cm').valid, false);
  assert.equal(validateParameterLiteral('arrow', 'tip', 'shell').valid, false);
  assert.equal(validateParameterLiteral('node', 'mode', 'exec').valid, false);

  assert.equal(validateParameterLiteral('circle', 'radius', '0.85cm').valid, true);
  assert.equal(validateParameterLiteral('arrow', 'tip', 'Stealth').valid, true);
});

test('N1 ownership roundtrip & minimal patch preserve CRLF and unknown macros', () => {
  const crlfSource = [
    '\\documentclass{standalone}',
    '\\usepackage{tikz}',
    '\\begin{document}',
    '\\begin{tikzpicture}',
    generateOwnedLine(1, 'circle', { center_x: '1.00cm', center_y: '1.00cm', radius: '0.50cm' }),
    '  \\myCustomMacro{Привет \\% мир}',
    '\\end{tikzpicture}',
    '\\end{document}',
  ].join('\r\n');

  const parsed = parseOwnedPrimitives(crlfSource);
  assert.equal(parsed.length, 1);
  assert.equal(parsed[0].lineNumber, 5);
  assert.equal(parsed[0].values.radius, '0.50cm');

  const patched = applyOwnedPrimitivePatch(crlfSource, 1, {
    center_x: '1.00cm',
    center_y: '1.00cm',
    radius: '1.25cm',
  });
  assert.ok(patched.includes('\r\n  \\myCustomMacro{Привет \\% мир}\r\n'));
  const reparsed = parseOwnedPrimitives(patched);
  assert.equal(reparsed[0].values.radius, '1.25cm');
});

test('N2 preamble connections: connect, comma-list disconnect, and inline-comment refusal', () => {
  const base = [
    '\\documentclass{standalone}',
    '\\usepackage{tikz}',
    '\\usetikzlibrary{arrows.meta,positioning}',
    '\\begin{document}',
    '\\end{document}',
  ].join('\n');

  const conn = proposeLibraryConnect(base, 'calc');
  assert.equal(conn.ok, true);
  assert.ok(conn.nextSource.includes('\\usetikzlibrary{calc}\n\\begin{document}'));

  const disc = proposeLibraryDisconnect(conn.nextSource, 'arrows.meta');
  assert.equal(disc.ok, true);
  assert.ok(disc.nextSource.includes('\\usetikzlibrary{positioning}'));
  assert.ok(!disc.nextSource.includes('arrows.meta'));

  const commented = base.replace(
    '\\usetikzlibrary{arrows.meta,positioning}',
    '\\usetikzlibrary{arrows.meta,positioning} % важно для главы 2'
  );
  const refused = proposeLibraryDisconnect(commented, 'arrows.meta');
  assert.equal(refused.ok, false);
});

test('Diagnostics engine detects missing arrows.meta and undefined control sequence with exact physical lines', () => {
  const errDoc = buildSpecimenDocuments().find((d) => d.id === 'error-demo')!;
  const diags = analyzeTexDiagnostics(errDoc.source);
  assert.ok(diags.some((d) => d.code === 'PGF-ARROW-TIP'));
  assert.ok(diags.some((d) => d.code === 'TEX-UNDEF-CS'));
});

test('Ergonomic dimension stepping, grid snap, translation, duplication, and CRLF-safe deletion', () => {
  assert.equal(stepDimensionLiteral('0.85cm', 1, false, true), '0.95cm');
  assert.equal(stepDimensionLiteral('0.85cm', 1, true, true), '1.35cm');
  assert.equal(stepDimensionLiteral('0.08cm', -1, false, true), '0.05cm');
  assert.equal(stepDimensionLiteral('12pt', 1, false, false), '14pt');

  assert.equal(snapCoordinateCm(1.37, 0.25), 1.25);
  assert.equal(snapCoordinateCm(1.38, 0.25), 1.5);
  assert.equal(snapCoordinateCm(1.374, 0), 1.37);

  const moved = translateOwnedPrimitiveCm(
    'circle',
    { center_x: '2.70cm', center_y: '1.80cm', radius: '0.85cm' },
    0.3,
    -0.2
  );
  assert.equal(moved.center_x, '3.00cm');
  assert.equal(moved.center_y, '1.60cm');
  assert.equal(moved.radius, '0.85cm');

  const crlfDoc = buildSpecimenDocuments().find((d) => d.id === 'cyrillic-crlf')!;
  const dup = duplicateOwnedPrimitiveInSource(crlfDoc.source, 1);
  assert.equal(dup.newId, 2);
  assert.equal(parseOwnedPrimitives(dup.nextSource).length, 2);
  assert.ok(!dup.nextSource.replace(/\r\n/g, '').includes('\n'), 'CRLF line endings must remain pure CRLF');

  const afterDel = deleteOwnedPrimitiveFromSource(dup.nextSource, 2);
  assert.equal(parseOwnedPrimitives(afterDel).length, 1);
  assert.equal(afterDel, crlfDoc.source);
});

test('LaTeX hover tooltip resolver extracts primitive arguments, preamble commands, user macros, and ignores comments/hex metadata', () => {
  const docs = buildSpecimenDocuments();
  const optical = docs.find((d) => d.id === 'cubic-owned')!;
  const opticalLines = optical.source.split(/\r?\n/);

  const circleLineIdx = opticalLines.findIndex((l) => l.includes('circle') && l.includes('tikzarium:n1:'));
  assert.ok(circleLineIdx >= 0, 'Expected owned circle line in optical specimen');
  const circleLine = opticalLines[circleLineIdx];
  const circleLineNum = circleLineIdx + 1;

  const drawCol = circleLine.indexOf('\\draw') + 2;
  const hoverDraw = resolveTexCommandHover(optical.source, circleLineNum, drawCol);
  assert.ok(hoverDraw, 'Expected hover info on \\draw');
  assert.equal(hoverDraw.ownedId, 3);
  assert.ok(hoverDraw.titleRu.includes('tikz.circle'));
  assert.equal(hoverDraw.arguments[0].currentValue, '2.70cm, 1.80cm');
  assert.equal(hoverDraw.arguments[1].currentValue, '0.85cm');

  const kwCol = circleLine.indexOf('circle') + 2;
  const hoverCircleKw = resolveTexCommandHover(optical.source, circleLineNum, kwCol);
  assert.ok(hoverCircleKw, 'Expected hover info on circle keyword');
  assert.equal(hoverCircleKw.hoveredToken, 'circle');
  assert.equal(hoverCircleKw.arguments[1].currentValue, '0.85cm');

  const hexCol = circleLine.indexOf('% tikzarium:n1:') + 4;
  assert.equal(resolveTexCommandHover(optical.source, circleLineNum, hexCol), null);

  const libLineIdx = opticalLines.findIndex((l) => l.startsWith('\\usetikzlibrary'));
  const hoverLib = resolveTexCommandHover(optical.source, libLineIdx + 1, 4);
  assert.ok(hoverLib);
  assert.equal(hoverLib.categoryRu, 'Преамбула LaTeX');
  assert.ok(hoverLib.arguments[0].currentValue?.includes('arrows.meta'));

  const macroCallIdx = opticalLines.findIndex((l, idx) => idx > 10 && l.includes('\\myOpticsNote'));
  const macroCol = opticalLines[macroCallIdx].indexOf('\\myOpticsNote') + 3;
  const hoverMacro = resolveTexCommandHover(optical.source, macroCallIdx + 1, macroCol);
  assert.ok(hoverMacro);
  assert.equal(hoverMacro.categoryRu, 'Макрос автора');
  assert.ok(hoverMacro.arguments[0].currentValue?.includes('Оптическая ось'));

  const errDoc = docs.find((d) => d.id === 'error-demo')!;
  const errLines = errDoc.source.split(/\r?\n/);
  const undefIdx = errLines.findIndex((l) => l.includes('\\undefinedTikzCommand'));
  const undefCol = errLines[undefIdx].indexOf('\\undefinedTikzCommand') + 3;
  const hoverUndef = resolveTexCommandHover(errDoc.source, undefIdx + 1, undefCol);
  assert.ok(hoverUndef);
  assert.equal(hoverUndef.categoryRu, 'Неизвестная команда');
  assert.equal(hoverUndef.isError, true);
});

test('Document templates generate valid, zero-diagnostic TeX buffers with exact n1 primitive counts and LF/CRLF endings', () => {
  assert.equal(validateTemplateFilename('').valid, false);
  assert.equal(validateTemplateFilename('bad/path.tex').valid, false);
  assert.equal(validateTemplateFilename('.tex').valid, false);
  const autoTex = validateTemplateFilename('my_diagram');
  assert.equal(autoTex.valid, true);
  assert.equal(autoTex.normalized, 'my_diagram.tex');

  assert.ok(DOCUMENT_TEMPLATES.some((t) => t.titleRu === 'Диаграмма'));
  assert.ok(DOCUMENT_TEMPLATES.some((t) => t.titleRu === 'График'));
  assert.ok(DOCUMENT_TEMPLATES.some((t) => t.titleRu === 'Схема оптики'));

  for (const tpl of DOCUMENT_TEMPLATES) {
    const lfDoc = buildDocumentFromTemplate(tpl.id, {
      filename: tpl.defaultFilename,
      includeCyrillicFontspec: true,
      borderPt: 6,
      lineEnding: 'LF',
    });
    const parsedOwned = parseOwnedPrimitives(lfDoc.source);
    assert.equal(
      parsedOwned.length,
      tpl.primitiveCount,
      `Template ${tpl.id} expected ${tpl.primitiveCount} n1 primitives, got ${parsedOwned.length}`
    );
    const diags = analyzeTexDiagnostics(lfDoc.source);
    assert.equal(diags.length, 0, `Template ${tpl.id} must have 0 diagnostics, got ${diags.length}`);
    assert.ok(!lfDoc.source.includes('\r\n'), 'LF mode must not contain CRLF');

    const crlfDoc = buildDocumentFromTemplate(tpl.id, {
      filename: 'win10_doc',
      includeCyrillicFontspec: false,
      borderPt: 10,
      lineEnding: 'CRLF',
    });
    assert.equal(crlfDoc.filename, 'win10_doc.tex');
    assert.ok(crlfDoc.source.includes('\r\n'), 'CRLF mode must use CRLF line endings');
    assert.ok(!crlfDoc.source.includes('\\usepackage{fontspec}'));
    assert.equal(analyzeTexDiagnostics(crlfDoc.source).length, 0);
  }
});

test('Ghost draft preview matches final committed TikZ geometry across all 6 tools and Shift constraints', () => {
  const tools = ['line', 'arrow', 'rectangle', 'circle', 'node', 'cubic'] as const;
  for (const tool of tools) {
    const draft = computeGestureDraftPreview(tool, { x: 1.2, y: 1.1 }, { x: 3.4, y: 2.5 }, { forCommit: false });
    assert.equal(Object.keys(validateToolDraft(tool, draft.values)).length, 0, `Invalid draft values for ${tool}`);
    assert.equal(draft.tikzCommand, generateTikzCommand(tool, draft.values));
    assert.ok(draft.metricsLabelRu.length > 0);
  }

  const sq = computeGestureDraftPreview(
    'rectangle',
    { x: 1.0, y: 1.0 },
    { x: 2.8, y: 1.6 },
    { constrainShift: true }
  );
  assert.equal(sq.values.end_x, '2.80cm');
  assert.equal(sq.values.end_y, '2.80cm');
  assert.ok(sq.metricsLabelRu.includes('1.80 × 1.80'));

  const orthoArrow = computeGestureDraftPreview(
    'arrow',
    { x: 1.0, y: 1.5 },
    { x: 3.5, y: 1.62 },
    { constrainShift: true }
  );
  assert.equal(orthoArrow.values.end_y, '1.50cm');
  assert.ok(orthoArrow.metricsLabelRu.includes('∠ 0°'));
});

test('P01 + P02 + P03 + P06: Handle resize, Smart Snap guides, Marquee multi-align, and Z-order reordering', () => {
  const optical = buildSpecimenDocuments().find((d) => d.id === 'cubic-owned')!;
  const owned = parseOwnedPrimitives(optical.source);
  const cubic = owned.find((p) => p.tool === 'cubic')!;
  const circle = owned.find((p) => p.tool === 'circle')!;

  // P01: Bezier handles & circle radius handle
  const handles = getPrimitiveHandles(cubic);
  assert.equal(handles.length, 4);
  const updatedCubic = applyHandleDragToValues(cubic, 'c1', { x: 2.15, y: 3.05 }, 0.05);
  assert.equal(updatedCubic.control1_x, '2.15cm');
  assert.equal(updatedCubic.control1_y, '3.05cm');

  const updatedCircle = applyHandleDragToValues(circle, 'radius_e', { x: 3.9, y: 1.8 }, 0.1);
  assert.equal(updatedCircle.radius, '1.20cm');

  // P02: Smart snap aligns to circle center (2.70, 1.80)
  const snap = computeSmartSnap({ x: 2.74, y: 1.76 }, owned, [cubic.id], 0.12);
  assert.equal(snap.snappedCm.x, 2.7);
  assert.equal(snap.snappedCm.y, 1.8);
  assert.ok(snap.guides.length >= 2);

  // P03: Marquee selection & center-y alignment
  const hitIds = findPrimitivesInMarquee(owned, { x: 2.0, y: 0.5 }, { x: 3.6, y: 3.2 });
  assert.ok(hitIds.includes(2) && hitIds.includes(3));
  const alignedSrc = alignOwnedPrimitivesInSource(optical.source, [5, 6], 'center-y');
  const afterAlign = parseOwnedPrimitives(alignedSrc);
  const n6 = afterAlign.find((p) => p.id === 6)!;
  assert.notEqual(n6.values.y, '2.25cm');

  // P06: Z-order reorder moves line #1 to front
  const reordered = reorderOwnedPrimitiveInSource(optical.source, 1, 'front');
  const reorderedOwned = parseOwnedPrimitives(reordered.nextSource);
  assert.equal(reorderedOwned[reorderedOwned.length - 1].id, 1);
});

test('P07 + P08 + P09: Optional TikZ visual styles, node anchors, and dynamic smart connectors', () => {
  const cmdStyled = generateTikzCommand('rectangle', {
    start_x: '1.00cm',
    start_y: '1.00cm',
    end_x: '3.00cm',
    end_y: '2.00cm',
    stroke_width: 'thick',
    line_style: 'dashed',
    stroke_color: 'blue!75!black',
    fill_color: 'cyan!10',
  });
  assert.equal(
    cmdStyled,
    '\\draw[thick,dashed,draw=blue!75!black,fill=cyan!10] (1.00cm,1.00cm) rectangle (3.00cm,2.00cm);'
  );

  const nodeA = generateOwnedLine(1, 'node', {
    x: '1.00cm',
    y: '2.00cm',
    mode: 'text',
    content: 'Input',
    node_id: 'A',
    anchor: 'above',
  });
  const nodeB = generateOwnedLine(2, 'node', {
    x: '4.50cm',
    y: '2.00cm',
    mode: 'text',
    content: 'Output',
    node_id: 'B',
  });
  const connArrow = generateOwnedLine(3, 'arrow', {
    start_x: '1.00cm',
    start_y: '2.00cm',
    end_x: '4.50cm',
    end_y: '2.00cm',
    tip: 'Stealth',
    from_node: 'A',
    to_node: 'B',
  });
  assert.ok(connArrow.includes('(A) -- (B);'));

  const docSrc = `\\begin{tikzpicture}\n${nodeA}\n${nodeB}\n${connArrow}\n\\end{tikzpicture}`;
  const parsed = parseOwnedPrimitives(docSrc);
  const resolved = resolveSmartConnectorEndpoints(parsed[2], parsed);
  assert.equal(resolved.isBound, true);
  assert.ok(resolved.x1Cm > 1.0 && resolved.x2Cm < 4.5);
});

test('P10 + P11 + P12 + P13 + P16: Folding, Autocomplete, Raw TikZ Adopt/Detach, Clean Overleaf Export & Line Diff', () => {
  const optical = buildSpecimenDocuments().find((d) => d.id === 'cubic-owned')!;
  const fold = detectPreambleFoldRange(optical.source);
  assert.equal(fold.canFold, true);
  assert.ok(fold.endLine >= 8);

  // P11: Autocomplete detects both \draw and custom \myOpticsNote macro
  const ac = getTexAutocompleteSuggestions(optical.source + '\\myOp', optical.source.length + 5);
  assert.ok(ac);
  assert.ok(ac.items.some((i) => i.trigger === '\\myOpticsNote'));

  // P12: Adopt raw TikZ line into n1 and detach back
  const rawDoc = [
    '\\documentclass{standalone}',
    '\\usepackage{tikz}',
    '\\begin{document}',
    '\\begin{tikzpicture}',
    '  \\draw (1.0cm,1.2cm) circle [radius=0.6cm];',
    '\\end{tikzpicture}',
    '\\end{document}',
  ].join('\n');
  const candidates = detectAdoptableTikzLines(rawDoc);
  assert.equal(candidates.length, 1);
  assert.equal(candidates[0].tool, 'circle');

  const adopted = adoptRawTikzLineIntoN1(rawDoc, 5);
  assert.equal(adopted.ok, true);
  assert.equal(parseOwnedPrimitives(adopted.nextSource).length, 1);

  const detached = detachOwnedPrimitiveToCleanTikz(adopted.nextSource, adopted.newId);
  assert.equal(parseOwnedPrimitives(detached).length, 0);
  assert.ok(detached.includes('\\draw (1.0cm,1.2cm) circle [radius=0.6cm];'));

  // P16: Clean Overleaf export strips % tikzarium:n1: completely
  const cleanExport = stripAllOwnershipMetadata(optical.source);
  assert.ok(!cleanExport.includes('tikzarium:n1:'));
  assert.ok(extractTikzpictureBlock(optical.source, true).startsWith('\\begin{tikzpicture}'));

  // P13: Structured diff counts exact changed lines
  const diff = computeStructuredLineDiff(rawDoc, adopted.nextSource);
  assert.equal(diff.addedCount, 1);
  assert.equal(diff.removedCount, 1);
});

test('P17 + P19 + P20: Quick-Fix resolution to 0 errors, CSV->PGFPlots conversion, and Snippet shelf roundtrip', () => {
  // P17: Fix both errors in error-demo plus missing semicolon & unclosed math
  let broken = [
    '\\documentclass{standalone}',
    '\\usepackage{tikz}',
    '\\begin{document}',
    '\\begin{tikzpicture}',
    '  \\draw[-{Stealth}] (0cm,0cm) -- (2cm,0cm)',
    '  \\undefinedTikzCommand (0cm,1cm) -- (2cm,1cm);',
    '  \\node at (1cm,2cm) {$E = mc^2};',
    '\\end{tikzpicture}',
    '\\end{document}',
  ].join('\n');

  for (let pass = 0; pass < 6; pass++) {
    const diags = analyzeTexDiagnostics(broken);
    const fixable = diags.find((d) => d.quickFixId);
    if (!fixable) break;
    const res = applyDiagnosticQuickFix(broken, fixable);
    assert.equal(res.ok, true);
    broken = res.nextSource;
  }
  assert.equal(analyzeTexDiagnostics(broken).length, 0);

  // P19: CSV import produces valid 0-diagnostic PGFPlots + n1 document
  const csvDoc = convertCsvToPgfplotsDocument(
    'laser_spectrum.csv',
    'wavelength,intensity\n400,0.15\n500,0.82\n600,0.95\n700,0.34\n'
  );
  assert.equal(analyzeTexDiagnostics(csvDoc.source).length, 0);
  assert.ok(parseOwnedPrimitives(csvDoc.source).length >= 8);

  // P20: Save & insert author snippet
  const snippetInserted = insertSnippetIntoSource(csvDoc.source, BUILTIN_AUTHOR_SNIPPETS[0]);
  assert.equal(snippetInserted.insertedIds.length, 3);
  const custom = createSnippetFromPrimitives('Моя группа', parseOwnedPrimitives(csvDoc.source).slice(0, 2));
  assert.ok(custom);
  assert.equal(custom.primitives.length, 2);
});


