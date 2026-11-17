import assert from 'node:assert/strict';
import test from 'node:test';
import {
  BUILD_TIME_PDF_INDEXING_GUIDE,
  PDF_MANUAL_ANCHORS,
  PDF_MANUAL_DOCUMENTS,
  exportManualAnchorIndexJson,
  resolveManualAnchorById,
  resolveManualAnchorForDiagnosticCode,
  resolveManualAnchorForExtension,
  resolveManualAnchorForToken,
  resolveManualAnchorForTool,
  searchPdfManualAnchors,
} from './pdfManualAnchors';
import { TIKZ_EXTENSION_PACKAGES } from './tikzExtensionsSuite';
import { PRIMITIVE_TOOLS } from './catalog';
import { resolveCaretTexHelp, resolveTexCommandHover } from './texHoverHelp';

test('PDF manual corpus covers PGF/TikZ and extension manuals with normalized [0..1] bbox anchors', () => {
  assert.ok(PDF_MANUAL_DOCUMENTS.length >= 11, 'Expected at least 11 CTAN/TeX Live PDF manuals');
  assert.ok(PDF_MANUAL_ANCHORS.length >= 20, 'Expected at least 20 pre-indexed direct PDF anchors');

  const docIds = new Set(PDF_MANUAL_DOCUMENTS.map((d) => d.id));

  for (const anchor of PDF_MANUAL_ANCHORS) {
    assert.ok(docIds.has(anchor.docId), `Unknown docId ${anchor.docId} on anchor ${anchor.id}`);
    assert.ok(anchor.page >= 1, `Invalid page ${anchor.page} on anchor ${anchor.id}`);
    assert.ok(anchor.namedDest.length > 0, `Missing namedDest on anchor ${anchor.id}`);
    const { x0, y0, x1, y1 } = anchor.bboxNorm;
    assert.ok(x0 >= 0 && x0 < x1 && x1 <= 1, `Invalid horizontal bboxNorm on ${anchor.id}`);
    assert.ok(y0 >= 0 && y0 < y1 && y1 <= 1, `Invalid vertical bboxNorm on ${anchor.id}`);
    assert.ok(anchor.matchedTokens.length > 0, `Anchor ${anchor.id} must have matchedTokens`);
  }
});

test('Every core N1 tool and every TikZ extension package resolves to a valid direct PDF manual anchor', () => {
  for (const tool of PRIMITIVE_TOOLS) {
    const anchor = resolveManualAnchorForTool(tool.id);
    assert.ok(anchor && anchor.id.length > 0);
    assert.equal(resolveManualAnchorById(anchor.id).id, anchor.id);
  }

  for (const ext of TIKZ_EXTENSION_PACKAGES) {
    const anchor = resolveManualAnchorForExtension(ext.id);
    assert.ok(anchor && anchor.id.length > 0, `Missing PDF anchor for extension ${ext.id}`);
    assert.equal(resolveManualAnchorById(anchor.id).id, anchor.id);
  }
});

test('Token, hover, caret, and diagnostic resolvers map complex TikZ & extension commands to exact PDF pages', () => {
  const addplotAnchor = resolveManualAnchorForToken('\\addplot');
  assert.ok(addplotAnchor);
  assert.equal(addplotAnchor.docId, 'pgfplots');

  const chemfigAnchor = resolveManualAnchorForToken('\\chemfig');
  assert.ok(chemfigAnchor);
  assert.equal(chemfigAnchor.docId, 'chemfig');

  const circuitAnchor = resolveManualAnchorForToken('circuitikz');
  assert.ok(circuitAnchor);
  assert.equal(circuitAnchor.docId, 'circuitikz');

  const sampleDoc = [
    '\\documentclass[border=4pt]{standalone}',
    '\\usepackage{tikz}',
    '\\usepackage{pgfplots}',
    '\\begin{document}',
    '\\begin{tikzpicture}',
    '  \\begin{axis}[xlabel={$t$}]',
    '    \\addplot+[smooth] coordinates {(0,0) (1,2)};',
    '  \\end{axis}',
    '\\end{tikzpicture}',
    '\\end{document}',
  ].join('\n');

  const hoverOnAddplot = resolveTexCommandHover(sampleDoc, 7, 7);
  assert.ok(hoverOnAddplot, 'Expected hover card on \\addplot');
  assert.equal(hoverOnAddplot.manualAnchorId, 'ext.pgfplots.axis');
  assert.equal(hoverOnAddplot.manualDocFile, 'pgfplots.pdf');

  const caretOffset = sampleDoc.indexOf('\\addplot') + 3;
  const caretCard = resolveCaretTexHelp(sampleDoc, caretOffset);
  assert.ok(caretCard);
  assert.equal(caretCard.manualAnchorId, 'ext.pgfplots.axis');

  const diagAnchor = resolveManualAnchorForDiagnosticCode('PGF-ARROW-TIP');
  assert.ok(diagAnchor);
  assert.equal(diagAnchor.id, 'pgf.lib.arrows.meta');
});

test('Build-time indexing guide and exported JSON index obey AGENTS.md Rule #5 (no bulk PDF redistribution)', () => {
  assert.equal(BUILD_TIME_PDF_INDEXING_GUIDE.length, 3);
  assert.ok(BUILD_TIME_PDF_INDEXING_GUIDE[0].code.includes('kpsewhich'));
  assert.ok(BUILD_TIME_PDF_INDEXING_GUIDE[1].code.includes('fitz'));

  const exportedRaw = exportManualAnchorIndexJson();
  const parsed = JSON.parse(exportedRaw) as {
    schema: string;
    redistributionPolicy: string;
    documents: unknown[];
    anchors: unknown[];
  };
  assert.equal(parsed.schema, 'tikzarium.pdf_manual_index.v1');
  assert.equal(parsed.redistributionPolicy, 'index-only-local-texlive-kpsewhich');
  assert.equal(parsed.documents.length, PDF_MANUAL_DOCUMENTS.length);
  assert.equal(parsed.anchors.length, PDF_MANUAL_ANCHORS.length);

  const searchHits = searchPdfManualAnchors('Stealth', 'pgfmanual');
  assert.ok(searchHits.some((h) => h.id === 'pgf.lib.arrows.meta'));
});
