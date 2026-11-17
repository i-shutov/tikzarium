/**
 * Unified Checked SourcePatch Engine (MOD-04) & EngineAdapter Contract (MOD-18).
 *
 * Enforces TikZarium's core byte-integrity invariants across every source mutation:
 * - Exact preservation of LF vs CRLF line endings;
 * - Refusal to mutate out-of-range offsets or stale document revisions;
 * - UTF-8 byte-length accounting and minimal line-span diff reporting;
 * - Clean EngineAdapter boundary between UI views and backend execution (TypeScript / Express / Rust).
 */

import { computeHexDigest, utf8ByteLength } from './tikzEngine';

export interface SourcePatchSpan {
  startOffset: number;
  endOffset: number;
  replacement: string;
  descriptionRu: string;
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

  if (expectedDigest && expectedDigest !== beforeDigest) {
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
    !Number.isInteger(patch.startOffset) ||
    !Number.isInteger(patch.endOffset) ||
    patch.startOffset < 0 ||
    patch.endOffset < patch.startOffset ||
    patch.endOffset > source.length
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
  const normalizedReplacement = normalizeFragmentEol(patch.replacement, lineEnding);
  const nextSource =
    source.slice(0, patch.startOffset) + normalizedReplacement + source.slice(patch.endOffset);
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
  const lines = source.split(/\r?\n/);

  if (
    startLine1 < 1 ||
    endLine1 < startLine1 ||
    endLine1 > lines.length
  ) {
    const digest = computeHexDigest(source);
    return {
      ok: false,
      nextSource: source,
      lineEnding,
      beforeDigest: digest,
      afterDigest: digest,
      byteDelta: 0,
      changedStartLine: 1,
      changedEndLine: 1,
      descriptionRu,
      errorRu: `Диапазон строк [${startLine1}..${endLine1}] выходит за границы документа (1..${lines.length}).`,
    };
  }

  let startOffset = 0;
  for (let i = 0; i < startLine1 - 1; i++) {
    startOffset += lines[i].length + lineEnding.length;
  }

  let endOffset = startOffset;
  for (let i = startLine1 - 1; i <= endLine1 - 1; i++) {
    endOffset += lines[i].length;
    if (i < endLine1 - 1) {
      endOffset += lineEnding.length;
    }
  }

  // If deleting lines completely (`replacementLines.length === 0`), also consume trailing newline if present
  let effectiveStart = startOffset;
  let effectiveEnd = endOffset;
  if (replacementLines.length === 0) {
    if (effectiveEnd + lineEnding.length <= source.length) {
      effectiveEnd += lineEnding.length;
    } else if (effectiveStart >= lineEnding.length) {
      effectiveStart -= lineEnding.length;
    }
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
