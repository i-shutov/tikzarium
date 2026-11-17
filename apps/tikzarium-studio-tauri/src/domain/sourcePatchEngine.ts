/**
 * Unified Checked SourcePatch Engine (MOD-04) & EngineAdapter Contract (MOD-18).
 *
 * Enforces TikZarium's core byte-integrity invariants across every source mutation:
 * - Exact preservation of LF vs CRLF line endings;
 * - Refusal to mutate out-of-range offsets or stale document revisions;
 * - UTF-8 byte-length accounting and minimal line-span diff reporting;
 * - Clean EngineAdapter boundary between UI views and backend execution (TypeScript / Express / Rust).
 */

import { utf8ByteLength } from './tikzEngine';
import { computeSourceDigest as computeHexDigest, isSourceBoundary, isWellFormedUnicode } from './sourceDigest';

export interface SourcePatchSpan {
  startOffset: number;
  endOffset: number;
  replacement: string;
  descriptionRu: string;
  /** Forward editor input follows the document EOL; inverse patches restore exact bytes. */
  lineEndingPolicy?: 'document' | 'exact';
  expectedText?: string;
}

export interface CheckedSourcePatchResult {
  ok: boolean;
  nextSource: string;
  lineEnding: '\r\n' | '\n';
  beforeDigest: string;
  afterDigest: string;
  byteDelta: number;
  changedStartLine: number;
  changedEndLine: number;
  descriptionRu: string;
  inversePatch?: SourcePatchSpan;
  errorRu?: string;
}

export function detectDocumentLineEnding(source: string): '\r\n' | '\n' {
  return source.includes('\r\n') ? '\r\n' : '\n';
}

export function normalizeFragmentEol(fragment: string, targetEol: '\r\n' | '\n'): string {
  const lf = fragment.replace(/\r\n/g, '\n');
  return targetEol === '\r\n' ? lf.replace(/\n/g, '\r\n') : lf;
}

function offsetToLine1(source: string, offset: number): number {
  const clamped = Math.max(0, Math.min(source.length, offset));
  let line = 1;
  for (let i = 0; i < clamped; i++) {
    if (source[i] === '\n') line++;
  }
  return line;
}

/**
 * Applies a minimal character/byte-span patch while preserving LF/CRLF invariants
 * and computing exact revision digests.
 */
export function applyCheckedSourcePatch(
  source: string,
  patch: SourcePatchSpan,
  expectedDigest?: string
): CheckedSourcePatchResult {
  const lineEnding = detectDocumentLineEnding(source);
  const beforeDigest = computeHexDigest(source);

  if (expectedDigest !== undefined && expectedDigest !== beforeDigest) {
    return {
      ok: false,
      nextSource: source,
      lineEnding,
      beforeDigest,
      afterDigest: beforeDigest,
      byteDelta: 0,
      changedStartLine: 1,
      changedEndLine: 1,
      descriptionRu: patch.descriptionRu,
      errorRu: 'Отклонён патч устаревшей ревизии исходника (несовпадение дайджеста).',
    };
  }

  if (
    !isSourceBoundary(source, patch.startOffset) ||
    !isSourceBoundary(source, patch.endOffset) ||
    patch.endOffset < patch.startOffset ||
    !isWellFormedUnicode(source) || !isWellFormedUnicode(patch.replacement) ||
    (patch.lineEndingPolicy !== undefined && patch.lineEndingPolicy !== 'document' && patch.lineEndingPolicy !== 'exact') ||
    (patch.expectedText !== undefined && source.slice(patch.startOffset, patch.endOffset) !== patch.expectedText)
  ) {
    return {
      ok: false,
      nextSource: source,
      lineEnding,
      beforeDigest,
      afterDigest: beforeDigest,
      byteDelta: 0,
      changedStartLine: 1,
      changedEndLine: 1,
      descriptionRu: patch.descriptionRu,
      errorRu: `Некорректный диапазон SourcePatch [${patch.startOffset}..${patch.endOffset}] для буфера длины ${source.length}.`,
    };
  }

  const oldSlice = source.slice(patch.startOffset, patch.endOffset);
  const normalizedReplacement = patch.lineEndingPolicy === 'exact' || patch.replacement === oldSlice
    ? patch.replacement : normalizeFragmentEol(patch.replacement, lineEnding);
  const nextSource =
    source.slice(0, patch.startOffset) + normalizedReplacement + source.slice(patch.endOffset);
  if (!isSourceBoundary(nextSource, patch.startOffset) ||
      !isSourceBoundary(nextSource, patch.startOffset + normalizedReplacement.length)) {
    return { ok: false, nextSource: source, lineEnding, beforeDigest, afterDigest: beforeDigest,
      byteDelta: 0, changedStartLine: 1, changedEndLine: 1, descriptionRu: patch.descriptionRu,
      errorRu: 'Правка образует CRLF на границе обратного патча.' };
  }
  const afterDigest = computeHexDigest(nextSource);
  const changedStartLine = offsetToLine1(source, patch.startOffset);
  const changedEndLine = offsetToLine1(
    nextSource,
    patch.startOffset + normalizedReplacement.length
  );

  return {
    ok: true,
    nextSource,
    lineEnding,
    beforeDigest,
    afterDigest,
    byteDelta: utf8ByteLength(nextSource) - utf8ByteLength(source),
    changedStartLine,
    changedEndLine,
    descriptionRu: patch.descriptionRu,
    inversePatch: {
      startOffset: patch.startOffset,
      endOffset: patch.startOffset + normalizedReplacement.length,
      replacement: oldSlice,
      lineEndingPolicy: 'exact',
      expectedText: normalizedReplacement,
      descriptionRu: `Отмена: ${patch.descriptionRu}`,
    },
  };
}

/**
 * Applies a minimal 1-based physical line-range replacement (`[startLine1..endLine1]` inclusive)
 * without touching neighboring lines, macros, or line-ending conventions.
 */
export function applyCheckedLineRangePatch(
  source: string,
  startLine1: number,
  endLine1: number,
  replacementLines: string[],
  descriptionRu: string
): CheckedSourcePatchResult {
  const lineEnding = detectDocumentLineEnding(source);
  // Offsets come from actual terminators, never from a document-wide EOL guess.
  const starts = [0];
  for (let i = 0; i < source.length; i++) if (source[i] === '\n') starts.push(i + 1);
  const contentEnd = (line: number) => {
    const next = starts[line + 1];
    if (next === undefined) return source.length;
    return source[next - 2] === '\r' ? next - 2 : next - 1;
  };
  if (!Number.isSafeInteger(startLine1) || !Number.isSafeInteger(endLine1) ||
      startLine1 < 1 || endLine1 < startLine1 || endLine1 > starts.length) {
    const digest = computeHexDigest(source);
    return { ok: false, nextSource: source, lineEnding, beforeDigest: digest, afterDigest: digest,
      byteDelta: 0, changedStartLine: 1, changedEndLine: 1, descriptionRu,
      errorRu: `Диапазон строк [${startLine1}..${endLine1}] вне документа.` };
  }
  let effectiveStart = starts[startLine1 - 1];
  let effectiveEnd = contentEnd(endLine1 - 1);
  if (replacementLines.length === 0) {
    if (starts[endLine1] !== undefined) effectiveEnd = starts[endLine1];
    else if (effectiveStart > 0) effectiveStart = contentEnd(startLine1 - 2);
  }

  const replacement = replacementLines.join(lineEnding);
  return applyCheckedSourcePatch(source, {
    startOffset: effectiveStart,
    endOffset: effectiveEnd,
    replacement,
    descriptionRu,
  });
}

// ============================================================================
// MOD-18: Abstract EngineAdapter Contract (TypeScript Web Stand <-> Native Rust)
// ============================================================================

export interface PdfUnderlayHitbox {
  objectId: string;
  lineNumber: number;
  packageOwner: string;
  labelRu: string;
  minXCm: number;
  minYCm: number;
  maxXCm: number;
  maxYCm: number;
}

export interface PdfUnderlayRenderRequest {
  source: string;
  revision: number;
  minXCm: number;
  maxXCm: number;
  minYCm: number;
  maxYCm: number;
  dpi?: number;
}

export interface PdfUnderlayRenderResponse {
  ok: boolean;
  revision: number;
  sourceDigest: string;
  engine: 'xelatex' | 'gs-pdfwrite-9.55' | 'svg-vector-fallback';
  engineLabelRu: string;
  pngDataUrl: string | null;
  pdfBase64: string | null;
  pageWidthPt: number;
  pageHeightPt: number;
  renderMs: number;
  objectsRendered: number;
  hitboxes: PdfUnderlayHitbox[];
  errorRu?: string;
}

export interface EngineAdapter {
  readonly adapterId: 'web-express-gs-xelatex' | 'rust-tauri-v2-ipc' | 'rust-native-bridge';
  applyPatch(
    source: string,
    patch: SourcePatchSpan,
    expectedDigest?: string
  ): CheckedSourcePatchResult;
  renderPdfUnderlay(req: PdfUnderlayRenderRequest): Promise<PdfUnderlayRenderResponse>;
}

export function createBrowserEngineAdapter(apiBaseUrl = ''): EngineAdapter {
  return {
    adapterId: 'web-express-gs-xelatex',
    applyPatch(source, patch, expectedDigest) {
      return applyCheckedSourcePatch(source, patch, expectedDigest);
    },
    async renderPdfUnderlay(req) {
      const response = await fetch(`${apiBaseUrl}/api/render/pdf-underlay`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(req),
      });
      if (!response.ok) {
        return {
          ok: false,
          revision: req.revision,
          sourceDigest: computeHexDigest(req.source),
          engine: 'svg-vector-fallback',
          engineLabelRu: 'Ошибка запроса рендера PDF-подложки',
          pngDataUrl: null,
          pdfBase64: null,
          pageWidthPt: 0,
          pageHeightPt: 0,
          renderMs: 0,
          objectsRendered: 0,
          hitboxes: [],
          errorRu: `HTTP ${response.status}`,
        };
      }
      return (await response.json()) as PdfUnderlayRenderResponse;
    },
  };
}
