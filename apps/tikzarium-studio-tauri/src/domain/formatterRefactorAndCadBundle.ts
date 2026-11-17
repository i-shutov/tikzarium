import {
  OWNERSHIP_MARKER,
  applyOwnedPrimitivePatch,
  generateOwnedLine,
  insertOwnedPrimitiveIntoSource,
  parseDimensionToCm,
  parseOwnedPrimitives,
  parsePolyPointsList,
  proposeLibraryConnect,
} from './tikzEngine';
import type { OwnedPrimitive, TexDiagnostic } from './tikzEngine';

// ============================================================================
// BLOCK 1 (P66–P69): AST-SAFE AUTO-FORMATTING & .TEX REFACTORING
// ============================================================================

export interface AutoFormatOptions {
  indentSpaces?: 2 | 4;
  sortBracketOptions?: boolean;
  normalizePathOperators?: boolean;
  alignTrailingComments?: boolean;
}

export interface AutoFormatResult {
  nextSource: string;
  changedLinesCount: number;
  preservedOwnedCount: number;
  lineEnding: 'LF' | 'CRLF';
}

const INDENT_ENVIRONMENTS = new Set([
  'document',
  'tikzpicture',
  'scope',
  'axis',
  'polaraxis',
  'groupplot',
  'semilogxaxis',
  'semilogyaxis',
  'loglogaxis',
  'circuitikz',
  'tikzcd',
  'forest',
  'ganttchart',
  'quantikz',
  'tikztimingtable',
  'feynman',
  'tabular',
  'table',
  'figure',
  'subfigure',
  'minipage',
  'itemize',
  'enumerate',
  'align',
  'align*',
  'equation',
  'equation*',
]);

/**
 * Splits a comma-separated option list inside [...] while respecting nested {...} and (...).
 */
function splitBracketOptionsSafe(inner: string): string[] {
  const parts: string[] = [];
  let depthBrace = 0;
  let depthParen = 0;
  let cur = '';
  for (let i = 0; i < inner.length; i++) {
    const ch = inner[i];
    if (ch === '\\' && i + 1 < inner.length) {
      cur += ch + inner[i + 1];
      i++;
      continue;
    }
    if (ch === '{') depthBrace++;
    else if (ch === '}') depthBrace = Math.max(0, depthBrace - 1);
    else if (ch === '(') depthParen++;
    else if (ch === ')') depthParen = Math.max(0, depthParen - 1);

    if (ch === ',' && depthBrace === 0 && depthParen === 0) {
      const trimmed = cur.trim();
      if (trimmed) parts.push(trimmed);
      cur = '';
    } else {
      cur += ch;
    }
  }
  const tail = cur.trim();
  if (tail) parts.push(tail);
  return parts;
}

function optionCanonicalRank(opt: string): number {
  const clean = opt.trim();
  if (/^(ultra thin|very thin|thin|semithick|thick|very thick|ultra thick|line width\s*=)/.test(clean)) {
    return 10;
  }
  if (/^(solid|dashed|dotted|densely dashed|loosely dashed|densely dotted|loosely dotted|dash pattern\s*=)/.test(clean)) {
    return 20;
  }
  if (/^(draw(\s*=|$))/.test(clean)) return 30;
  if (/^(fill(\s*=|$))/.test(clean)) return 40;
  if (/^(pattern(\s*=|$)|pattern color\s*=)/.test(clean)) return 50;
  if (/^(rounded corners)/.test(clean)) return 60;
  if (/^(rotate\s*=|scale\s*=|shift\s*=|xshift\s*=|yshift\s*=)/.test(clean)) return 70;
  if (/^(-|>|<|\|)/.test(clean) || /(Stealth|Latex)/.test(clean)) return 80;
  if (/^(decorate|decoration\s*=|postaction\s*=)/.test(clean)) return 90;
  return 100;
}

function canonicalizeFirstOptionBracket(codeNoComment: string): string {
  // Only canonicalize raw TikZ path/node/scope commands so \usepackage[...], \documentclass[...] stay untouched
  const cmdMatch = /^(\s*(?:\\onslide<[^>]+>)?\\(?:draw|fill|filldraw|path|node|coordinate)\s*)\[/.exec(
    codeNoComment
  );
  if (!cmdMatch) return codeNoComment;
  const openIdx = cmdMatch[0].length - 1;
  let depthBrace = 0;
  let depthBracket = 0;
  let closeIdx = -1;
  for (let i = openIdx; i < codeNoComment.length; i++) {
    const ch = codeNoComment[i];
    if (ch === '\\' && i + 1 < codeNoComment.length) {
      i++;
      continue;
    }
    if (ch === '{') depthBrace++;
    else if (ch === '}') depthBrace = Math.max(0, depthBrace - 1);
    else if (ch === '[' && depthBrace === 0) depthBracket++;
    else if (ch === ']' && depthBrace === 0) {
      depthBracket--;
      if (depthBracket === 0) {
        closeIdx = i;
        break;
      }
    }
  }
  if (closeIdx === -1) return codeNoComment;
  const inner = codeNoComment.slice(openIdx + 1, closeIdx);
  const opts = splitBracketOptionsSafe(inner);
  if (opts.length <= 1) return codeNoComment;

  const indexed = opts.map((opt, idx) => ({ opt, idx, rank: optionCanonicalRank(opt) }));
  indexed.sort((a, b) => (a.rank !== b.rank ? a.rank - b.rank : a.idx - b.idx));
  const sortedInner = indexed.map((item) => item.opt).join(', ');
  return (
    codeNoComment.slice(0, openIdx + 1) +
    sortedInner +
    codeNoComment.slice(closeIdx)
  );
}

/**
 * Splits a single line into code part and unescaped trailing % comment (excluding \%).
 */
export function splitCodeAndUnescapedComment(line: string): {
  codePart: string;
  commentPart: string | null;
} {
  for (let i = 0; i < line.length; i++) {
    if (line[i] === '%' && (i === 0 || line[i - 1] !== '\\')) {
      return {
        codePart: line.slice(0, i),
        commentPart: line.slice(i),
      };
    }
  }
  return { codePart: line, commentPart: null };
}

function normalizeRawTikzPathSpacing(code: string): string {
  const trimmed = code.trim();
  if (!/^(?:\\onslide<[^>]+>)?\\(?:draw|fill|filldraw|path|node|coordinate)\b/.test(trimmed)) {
    return trimmed;
  }
  // Protect {...} blocks (such as math or Cyrillic node labels) from path spacing normalization
  const protectedBlocks: string[] = [];
  let masked = '';
  let braceDepth = 0;
  let blockStart = -1;
  for (let i = 0; i < trimmed.length; i++) {
    const ch = trimmed[i];
    if (ch === '\\' && i + 1 < trimmed.length) {
      if (braceDepth === 0) masked += ch + trimmed[i + 1];
      i++;
      continue;
    }
    if (ch === '{') {
      if (braceDepth === 0) blockStart = i;
      braceDepth++;
    } else if (ch === '}') {
      braceDepth = Math.max(0, braceDepth - 1);
      if (braceDepth === 0 && blockStart !== -1) {
        const token = `__TZ_BRACE_${protectedBlocks.length}__`;
        protectedBlocks.push(trimmed.slice(blockStart, i + 1));
        masked += token;
        blockStart = -1;
        continue;
      }
    }
    if (braceDepth === 0) masked += ch;
  }
  if (braceDepth > 0 && blockStart !== -1) {
    return trimmed;
  }

  let norm = masked
    // Normalize coordinate inner whitespace: ( 1.0cm , 2.0cm ) -> (1.0cm, 2.0cm)
    .replace(/\(\s*([^(),]+?)\s*,\s*([^(),]+?)\s*\)/g, '($1, $2)')
    // Normalize path connectors --, |-, -| when between ) and ( or cycle
    .replace(/\)\s*--\s*\(/g, ') -- (')
    .replace(/\)\s*--\s*cycle\b/g, ') -- cycle')
    .replace(/\)\s*\|-\s*\(/g, ') |- (')
    .replace(/\)\s*-\|\s*\(/g, ') -| (')
    .replace(/\)\s*\.\.\s*controls\s*\(/g, ') .. controls (')
    .replace(/\)\s+and\s+\(/g, ') and (')
    .replace(/\)\s*\.\.\s*\(/g, ') .. (')
    .replace(/\)\s*rectangle\s*\(/g, ') rectangle (')
    .replace(/\)\s*circle\s*\[/g, ') circle [')
    .replace(/\s+;/g, ';');

  norm = norm.replace(/__TZ_BRACE_(\d+)__/g, (_, idxStr) => protectedBlocks[Number(idxStr)] ?? '');
  return norm;
}

/**
 * P66: AST-Safe TikZ/LaTeX Auto-Formatter.
 * Preserves LF/CRLF, \newcommand, \%, Cyrillic UTF-8, filecontents*, and 100% of % tikzarium:n1:<hex> markers.
 */
export function formatTikzDocumentSource(
  source: string,
  options: AutoFormatOptions = {}
): AutoFormatResult {
  const indentSpaces = options.indentSpaces ?? 2;
  const sortBracketOptions = options.sortBracketOptions ?? true;
  const normalizePathOperators = options.normalizePathOperators ?? true;
  const alignTrailingComments = options.alignTrailingComments ?? true;

  const lineEnding: 'LF' | 'CRLF' = source.includes('\r\n') ? 'CRLF' : 'LF';
  const eol = lineEnding === 'CRLF' ? '\r\n' : '\n';
  const rawLines = source.split(/\r?\n/);
  const ownedPrimitives = parseOwnedPrimitives(source);
  const ownedByLine = new Map<number, OwnedPrimitive>();
  for (const p of ownedPrimitives) {
    ownedByLine.set(p.lineNumber, p);
  }

  const unitIndent = ' '.repeat(indentSpaces);
  let envDepth = 0;
  let foreachBraceDepth = 0;
  let inVerbatimLike = false;

  interface FormattedRow {
    indent: string;
    codeBody: string;
    trailingComment: string | null;
    isOwnedLine: boolean;
    rawOriginal: string;
    passthrough: boolean;
  }

  const rows: FormattedRow[] = [];

  for (let idx = 0; idx < rawLines.length; idx++) {
    const ln = idx + 1;
    const rawLine = rawLines[idx];
    const trimmed = rawLine.trim();

    if (trimmed === '') {
      rows.push({
        indent: '',
        codeBody: '',
        trailingComment: null,
        isOwnedLine: false,
        rawOriginal: rawLine,
        passthrough: true,
      });
      continue;
    }

    // Verbatim / filecontents* blocks must never have internal lines mutated
    if (/^\\begin\{(filecontents\*?|verbatim|lstlisting)\}/.test(trimmed)) {
      const indent = unitIndent.repeat(Math.max(0, envDepth + foreachBraceDepth));
      rows.push({
        indent,
        codeBody: trimmed,
        trailingComment: null,
        isOwnedLine: false,
        rawOriginal: rawLine,
        passthrough: false,
      });
      inVerbatimLike = true;
      continue;
    }
    if (inVerbatimLike) {
      if (/^\\end\{(filecontents\*?|verbatim|lstlisting)\}/.test(trimmed)) {
        inVerbatimLike = false;
        const indent = unitIndent.repeat(Math.max(0, envDepth + foreachBraceDepth));
        rows.push({
          indent,
          codeBody: trimmed,
          trailingComment: null,
          isOwnedLine: false,
          rawOriginal: rawLine,
          passthrough: false,
        });
      } else {
        rows.push({
          indent: '',
          codeBody: rawLine,
          trailingComment: null,
          isOwnedLine: false,
          rawOriginal: rawLine,
          passthrough: true,
        });
      }
      continue;
    }

    // Check closing \end{env} or closing } of \foreach before computing this line's indent
    const endEnvMatch = /^\\end\{([^}]+)\}/.exec(trimmed);
    const closesEnv = Boolean(endEnvMatch && INDENT_ENVIRONMENTS.has(endEnvMatch[1]));
    const closesForeachBrace = foreachBraceDepth > 0 && /^}/.test(trimmed);

    const effectiveDepth = Math.max(
      0,
      envDepth + foreachBraceDepth - (closesEnv ? 1 : 0) - (closesForeachBrace ? 1 : 0)
    );
    const indent = unitIndent.repeat(effectiveDepth);

    // Owned n1 line: regenerate canonically with exact indent & lossless hex payload
    const owned = ownedByLine.get(ln);
    if (owned) {
      const rebuiltOwned = generateOwnedLine(owned.id, owned.tool, owned.values, indent);
      rows.push({
        indent: '',
        codeBody: rebuiltOwned,
        trailingComment: null,
        isOwnedLine: true,
        rawOriginal: rawLine,
        passthrough: true,
      });
    } else {
      const { codePart, commentPart } = splitCodeAndUnescapedComment(rawLine);
      const codeTrimmed = codePart.trim();

      if (codeTrimmed === '' && commentPart !== null) {
        // Pure comment line
        rows.push({
          indent,
          codeBody: '',
          trailingComment: commentPart.trim(),
          isOwnedLine: false,
          rawOriginal: rawLine,
          passthrough: false,
        });
      } else {
        // Keep \newcommand / \tikzset and specialized extension DSL commands safe from path spacing rewrites
        const isMacroDef =
          /^\\(?:newcommand|renewcommand|providecommand|def|tikzset|pgfplotsset|usepgfplotslibrary|ctikzset|chemfig|schemestart|schemestop|arrow|tdplotsetmaincoords|tdplotsetrotatedcoords|tdplotsetcoord|tdplotdrawarc|tkzDefPoint|tkzDefPointBy|tkzDefCircle|tkzDrawPolygon|tkzDrawCircle|tkzDrawSegment|tkzMarkRightAngle|tkzDrawPoints|tkzLabelPoint|Vertex|Edge|gantttitle|ganttbar|ganttmilestone|ganttlink|diagram)\b/.test(
            codeTrimmed
          );
        let formattedCode = codeTrimmed;
        if (!isMacroDef) {
          if (sortBracketOptions) {
            formattedCode = canonicalizeFirstOptionBracket(formattedCode);
          }
          if (normalizePathOperators) {
            formattedCode = normalizeRawTikzPathSpacing(formattedCode);
          }
        }
        rows.push({
          indent,
          codeBody: formattedCode,
          trailingComment: commentPart ? commentPart.trim() : null,
          isOwnedLine: false,
          rawOriginal: rawLine,
          passthrough: false,
        });
      }
    }

    // Advance depth after current line if \begin{env} (not closed on same line) or \foreach ... {
    if (closesEnv) {
      envDepth = Math.max(0, envDepth - 1);
    }
    if (closesForeachBrace) {
      foreachBraceDepth = Math.max(0, foreachBraceDepth - 1);
    }

    const { codePart: cleanForDepth } = splitCodeAndUnescapedComment(rawLine);
    const beginEnvMatch = /^\\begin\{([^}]+)\}/.exec(cleanForDepth.trim());
    if (
      beginEnvMatch &&
      INDENT_ENVIRONMENTS.has(beginEnvMatch[1]) &&
      !cleanForDepth.includes(`\\end{${beginEnvMatch[1]}}`)
    ) {
      envDepth++;
    } else if (/^\\foreach\b/.test(cleanForDepth.trim()) && /\{\s*$/.test(cleanForDepth.trim())) {
      foreachBraceDepth++;
    }
  }

  // Optional alignment of inline trailing comments within contiguous blocks of code+comment lines
  let targetCommentCol = 0;
  if (alignTrailingComments) {
    const codeLengths = rows
      .filter((r) => !r.passthrough && r.codeBody.length > 0 && r.trailingComment !== null)
      .map((r) => r.indent.length + r.codeBody.length);
    if (codeLengths.length >= 2) {
      const maxLen = Math.min(76, Math.max(...codeLengths));
      targetCommentCol = maxLen + 2;
    }
  }

  let changedLinesCount = 0;
  const outLines = rows.map((row) => {
    let built: string;
    if (row.passthrough) {
      built = row.codeBody;
    } else if (row.codeBody === '' && row.trailingComment !== null) {
      built = `${row.indent}${row.trailingComment}`;
    } else if (row.trailingComment !== null) {
      const base = `${row.indent}${row.codeBody}`;
      const pad =
        alignTrailingComments && targetCommentCol > base.length
          ? ' '.repeat(targetCommentCol - base.length)
          : '  ';
      built = `${base}${pad}${row.trailingComment}`;
    } else {
      built = `${row.indent}${row.codeBody}`;
    }
    if (built !== row.rawOriginal) changedLinesCount++;
    return built;
  });

  // Collapse 3+ consecutive empty lines down to at most 1 blank line outside verbatim
  const collapsedLines: string[] = [];
  let blankStreak = 0;
  for (const l of outLines) {
    if (l === '') {
      blankStreak++;
      if (blankStreak <= 1) collapsedLines.push(l);
      else changedLinesCount++;
    } else {
      blankStreak = 0;
      collapsedLines.push(l);
    }
  }

  const nextSource = collapsedLines.join(eol);
  const afterOwned = parseOwnedPrimitives(nextSource);

  return {
    nextSource,
    changedLinesCount,
    preservedOwnedCount: afterOwned.length,
    lineEnding,
  };
}

// ============================================================================
// P67: BATCH UNIT CONVERTER & COORDINATE NORMALIZER (cm <-> mm <-> pt)
// ============================================================================

export type TikzLengthUnit = 'cm' | 'mm' | 'pt';

const CM_TO_UNIT_FACTOR: Record<TikzLengthUnit, number> = {
  cm: 1,
  mm: 10,
  pt: 28.4527559,
};

const OWNED_DIMENSION_KEYS = [
  'start_x',
  'start_y',
  'end_x',
  'end_y',
  'center_x',
  'center_y',
  'radius',
  'x',
  'y',
  'control1_x',
  'control1_y',
  'control2_x',
  'control2_y',
  'rounded_corners',
] as const;

export function formatCmInTargetUnit(
  valueCm: number,
  targetUnit: TikzLengthUnit,
  decimals?: number
): string {
  const defaultDecimals = targetUnit === 'cm' ? 2 : targetUnit === 'mm' ? 1 : 1;
  const prec = decimals ?? defaultDecimals;
  const raw = valueCm * CM_TO_UNIT_FACTOR[targetUnit];
  const clean = Math.abs(raw) < 1e-9 ? 0 : raw;
  return `${clean.toFixed(prec)}${targetUnit}`;
}

export interface UnitConversionResult {
  nextSource: string;
  convertedPrimitivesCount: number;
  convertedRawLiteralsCount: number;
}

/**
 * P67: Converts dimensional coordinates across owned n1 primitives (updating hex metadata!)
 * and optionally raw TikZ coordinates without changing physical geometry.
 */
export function convertDocumentUnitsInSource(
  source: string,
  targetUnit: TikzLengthUnit,
  options: {
    decimals?: number;
    onlyPrimitiveIds?: number[];
    convertRawCoordinates?: boolean;
  } = {}
): UnitConversionResult {
  const { decimals, onlyPrimitiveIds, convertRawCoordinates = true } = options;
  let cur = source;
  const owned = parseOwnedPrimitives(cur);
  const idFilter = onlyPrimitiveIds && onlyPrimitiveIds.length > 0 ? new Set(onlyPrimitiveIds) : null;

  let convertedPrimitivesCount = 0;
  for (const p of owned) {
    if (idFilter && !idFilter.has(p.id)) continue;
    const nextValues: Record<string, string> = { ...p.values };
    let changed = false;

    for (const key of OWNED_DIMENSION_KEYS) {
      const rawVal = nextValues[key];
      if (!rawVal) continue;
      const cm = parseDimensionToCm(rawVal);
      if (cm === null) continue;
      const formatted = formatCmInTargetUnit(cm, targetUnit, decimals);
      if (formatted !== rawVal) {
        nextValues[key] = formatted;
        changed = true;
      }
    }

    if (nextValues.poly_points) {
      const pts = parsePolyPointsList(nextValues.poly_points);
      if (pts.length > 0) {
        const serialized = pts
          .map(
            (pt) =>
              `${formatCmInTargetUnit(pt.xCm, targetUnit, decimals)},${formatCmInTargetUnit(
                pt.yCm,
                targetUnit,
                decimals
              )}`
          )
          .join(';');
        if (serialized !== nextValues.poly_points) {
          nextValues.poly_points = serialized;
          changed = true;
        }
      }
    }

    if (changed) {
      cur = applyOwnedPrimitivePatch(cur, p.id, nextValues);
      convertedPrimitivesCount++;
    }
  }

  let convertedRawLiteralsCount = 0;
  if (convertRawCoordinates && !idFilter) {
    const eol = cur.includes('\r\n') ? '\r\n' : '\n';
    const lines = cur.split(/\r?\n/);
    let insideTikz = false;
    const nextLines = lines.map((line) => {
      const trimmed = line.trim();
      if (/^\\begin\{tikzpicture\}/.test(trimmed)) insideTikz = true;
      if (/^\\end\{tikzpicture\}/.test(trimmed)) insideTikz = false;
      if (!insideTikz || line.includes(OWNERSHIP_MARKER)) return line;

      const { codePart, commentPart } = splitCodeAndUnescapedComment(line);
      const replacedCode = codePart.replace(
        /(-?\d+(?:\.\d+)?)\s*(cm|mm|pt)\b/g,
        (full, numStr: string, unitStr: string) => {
          const cm = parseDimensionToCm(`${numStr}${unitStr}`);
          if (cm === null) return full;
          convertedRawLiteralsCount++;
          return formatCmInTargetUnit(cm, targetUnit, decimals);
        }
      );
      return commentPart !== null ? `${replacedCode}${commentPart}` : replacedCode;
    });
    cur = nextLines.join(eol);
  }

  return {
    nextSource: cur,
    convertedPrimitivesCount,
    convertedRawLiteralsCount,
  };
}

// ============================================================================
// P68: DRY STYLE EXTRACTOR (\tikzset{...})
// ============================================================================

export interface RepeatedStyleCandidate {
  id: string;
  suggestedStyleName: string;
  tikzOptionsBody: string;
  primitiveIds: number[];
  occurrences: number;
  summaryRu: string;
}

export function detectRepeatedTikzStyles(ownedPrimitives: OwnedPrimitive[]): RepeatedStyleCandidate[] {
  const groups = new Map<
    string,
    { optsBody: string; ids: number[]; strokeColor: string; fillColor: string }
  >();

  for (const p of ownedPrimitives) {
    if (p.tool === 'node') continue;
    const parts: string[] = [];
    if (p.values.stroke_width) parts.push(p.values.stroke_width);
    if (p.values.line_style && p.values.line_style !== 'solid') parts.push(p.values.line_style);
    if (p.values.rounded_corners) parts.push(`rounded corners=${p.values.rounded_corners}`);
    if (p.values.stroke_color && p.values.stroke_color !== 'black') {
      parts.push(`draw=${p.values.stroke_color}`);
    }
    if (p.values.fill_color && p.values.fill_color !== 'none') {
      parts.push(`fill=${p.values.fill_color}`);
    }
    if (p.values.pattern) parts.push(`pattern=${p.values.pattern}`);
    if (parts.length < 2) continue;

    const key = parts.join(', ');
    const existing = groups.get(key);
    if (existing) {
      existing.ids.push(p.id);
    } else {
      groups.set(key, {
        optsBody: key,
        ids: [p.id],
        strokeColor: p.values.stroke_color || 'black',
        fillColor: p.values.fill_color || 'none',
      });
    }
  }

  const out: RepeatedStyleCandidate[] = [];
  let idx = 1;
  for (const [, entry] of groups) {
    if (entry.ids.length < 2) continue;
    const suggestedStyleName = `tzStyle${idx}`;
    out.push({
      id: `dry-${idx}`,
      suggestedStyleName,
      tikzOptionsBody: entry.optsBody,
      primitiveIds: entry.ids,
      occurrences: entry.ids.length,
      summaryRu: `[${entry.optsBody}] · повторяется в ${entry.ids.length} объектах (#${entry.ids.join(', #')})`,
    });
    idx++;
  }
  return out.sort((a, b) => b.occurrences - a.occurrences);
}

/**
 * Injects or updates a named \tikzset{styleName/.style={...}} rule in the preamble before \begin{document}.
 */
export function extractRepeatedStyleToTikzset(
  source: string,
  styleName: string,
  tikzOptionsBody: string
): { nextSource: string; ruleLine: string } {
  const cleanName = styleName.replace(/[^A-Za-z0-9_]/g, '') || 'tzSharedStyle';
  const eol = source.includes('\r\n') ? '\r\n' : '\n';
  const ruleLine = `\\tikzset{${cleanName}/.style={${tikzOptionsBody}}}`;

  if (source.includes(`${cleanName}/.style=`)) {
    const escaped = cleanName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const re = new RegExp(`\\\\tikzset\\{${escaped}/\\.style=\\{[^}]*\\}\\}`);
    return {
      nextSource: source.replace(re, ruleLine),
      ruleLine,
    };
  }

  const beginDocIdx = source.indexOf('\\begin{document}');
  if (beginDocIdx !== -1) {
    const nextSource =
      source.slice(0, beginDocIdx) + ruleLine + eol + source.slice(beginDocIdx);
    return { nextSource, ruleLine };
  }

  return {
    nextSource: ruleLine + eol + source,
    ruleLine,
  };
}

// ============================================================================
// P69: PREAMBLE ORGANIZER & UNUSED TIKZ LIBRARY DETECTOR / CLEANER
// ============================================================================

export interface PreambleAuditReport {
  declaredLibraries: string[];
  unusedLibraries: Array<{ name: string; reasonRu: string }>;
  fragmentedUsetikzlibraryLines: number;
  duplicatePackages: string[];
}

const LIBRARY_USAGE_PATTERNS: Record<string, { regex: RegExp; reasonRu: string }> = {
  'arrows.meta': {
    regex: /\b(Stealth|Latex|Triangle|Bar|Bracket|Rays)\b|->|<->|\|<->\|/,
    reasonRu: 'Нет стрелок Stealth / Latex / -> в теле документа',
  },
  calc: {
    regex: /\(\$\s*\(/,
    reasonRu: 'Нет вычислительных координат ($ (A)!t!(B) $)',
  },
  patterns: {
    regex: /\bpattern\s*=|\bpattern color\s*=/,
    reasonRu: 'Нет штриховок pattern= (north east lines и др.)',
  },
  'decorations.pathmorphing': {
    regex: /\b(snake|coil|zigzag|bumps|random steps)\b/,
    reasonRu: 'Нет волнообразных декораций snake / coil / zigzag',
  },
  'decorations.pathreplacing': {
    regex: /\b(brace|expanding waves|border)\b/,
    reasonRu: 'Нет фигурных скобок decoration={brace}',
  },
  'decorations.markings': {
    regex: /\bmarkings\b|\bmark\s*=\s*at\s+position\b/,
    reasonRu: 'Нет маркеров вдоль траектории markings',
  },
  positioning: {
    regex: /\b(right|left|above|below)\s*=\s*[^,\]]*\bof\b|\bnode distance\b/,
    reasonRu: 'Нет относительного позиционирования right=... of ...',
  },
  'shapes.geometric': {
    regex: /\b(diamond|ellipse|trapezium|regular polygon|cylinder|star)\b/,
    reasonRu: 'Нет геометрических узлов diamond / ellipse / trapezium',
  },
  fit: {
    regex: /\bfit\s*=\s*\(/,
    reasonRu: 'Нет охватывающих рамок fit=(A)(B)',
  },
  backgrounds: {
    regex: /\\begin\{pgfonlayer\}|\bon background layer\b/,
    reasonRu: 'Нет фоновых слоёв on background layer',
  },
  spy: {
    regex: /\\spy\b|\bspy using outlines\b/,
    reasonRu: 'Нет выносной лупы \\spy',
  },
  angles: {
    regex: /\bpic\b[^;]*\bangle\b/,
    reasonRu: 'Нет угловых дуг pic {angle=...}',
  },
  quotes: {
    regex: /\bpic\s*\[[^\]]*"/,
    reasonRu: 'Нет кавычек-подписей углов pic ["..."]',
  },
  automata: {
    regex: /\b(state|accepting|initial)\b/,
    reasonRu: 'Нет состояний конечных автоматов [state, accepting]',
  },
  '3d': {
    regex: /\bcanvas is (xy|xz|yz) plane\b/,
    reasonRu: 'Нет 3D-плоскостей canvas is xy plane',
  },
};

export function organizePreambleAndDetectUnusedLibraries(source: string): PreambleAuditReport {
  const beginDocIdx = source.indexOf('\\begin{document}');
  const preamble = beginDocIdx !== -1 ? source.slice(0, beginDocIdx) : source;
  const body = beginDocIdx !== -1 ? source.slice(beginDocIdx) : source;

  const lines = preamble.split(/\r?\n/);
  let fragmentedUsetikzlibraryLines = 0;
  const declaredSet = new Set<string>();
  const pkgCounts = new Map<string, number>();

  for (const rawLine of lines) {
    const { codePart } = splitCodeAndUnescapedComment(rawLine);
    const trimmed = codePart.trim();
    if (!trimmed) continue;

    const libMatches = [...trimmed.matchAll(/\\usetikzlibrary\{([^}]*)\}/g)];
    if (libMatches.length > 0) {
      fragmentedUsetikzlibraryLines += libMatches.length;
      for (const m of libMatches) {
        for (const lib of m[1].split(',')) {
          const clean = lib.trim();
          if (clean) declaredSet.add(clean);
        }
      }
    }

    const pkgMatches = [...trimmed.matchAll(/\\usepackage(?:\[[^\]]*\])?\{([^}]*)\}/g)];
    for (const m of pkgMatches) {
      for (const pkg of m[1].split(',')) {
        const clean = pkg.trim();
        if (clean) pkgCounts.set(clean, (pkgCounts.get(clean) ?? 0) + 1);
      }
    }
  }

  const declaredLibraries = [...declaredSet].sort((a, b) => a.localeCompare(b));
  const unusedLibraries: Array<{ name: string; reasonRu: string }> = [];

  for (const lib of declaredLibraries) {
    const rule = LIBRARY_USAGE_PATTERNS[lib];
    if (rule && !rule.regex.test(body) && !rule.regex.test(preamble.replace(/\\usetikzlibrary\{[^}]*\}/g, ''))) {
      unusedLibraries.push({ name: lib, reasonRu: rule.reasonRu });
    }
  }

  const duplicatePackages = [...pkgCounts.entries()]
    .filter(([, count]) => count > 1)
    .map(([name]) => name);

  return {
    declaredLibraries,
    unusedLibraries,
    fragmentedUsetikzlibraryLines,
    duplicatePackages,
  };
}

/**
 * P69: Consolidates fragmented \usetikzlibrary{...} declarations into a single sorted declaration,
 * deduplicates identical \usepackage lines, and optionally removes unused TikZ libraries.
 */
export function cleanPreambleAndUnusedLibraries(
  source: string,
  options: { removeUnusedLibraries?: boolean } = {}
): { nextSource: string; keptLibraries: string[]; removedLibraries: string[] } {
  const removeUnused = options.removeUnusedLibraries ?? true;
  const beginDocIdx = source.indexOf('\\begin{document}');
  if (beginDocIdx === -1) {
    return { nextSource: source, keptLibraries: [], removedLibraries: [] };
  }

  const eol = source.includes('\r\n') ? '\r\n' : '\n';
  const report = organizePreambleAndDetectUnusedLibraries(source);
  const unusedSet = new Set(
    removeUnused ? report.unusedLibraries.map((u) => u.name) : []
  );

  const keptLibraries = report.declaredLibraries.filter((lib) => !unusedSet.has(lib));
  const removedLibraries = report.declaredLibraries.filter((lib) => unusedSet.has(lib));

  const preamble = source.slice(0, beginDocIdx);
  const rest = source.slice(beginDocIdx);
  const preambleLines = preamble.split(/\r?\n/);

  let insertedConsolidatedLibs = false;
  const seenExactPackageLine = new Set<string>();
  const nextPreambleLines: string[] = [];

  for (const line of preambleLines) {
    const { codePart } = splitCodeAndUnescapedComment(line);
    const trimmedCode = codePart.trim();

    if (/^\\usetikzlibrary\{[^}]*\}\s*$/.test(trimmedCode)) {
      if (!insertedConsolidatedLibs) {
        insertedConsolidatedLibs = true;
        if (keptLibraries.length > 0) {
          nextPreambleLines.push(`\\usetikzlibrary{${keptLibraries.join(', ')}}`);
        }
      }
      continue;
    }

    if (/^\\usepackage(?:\[[^\]]*\])?\{[^}]+\}\s*$/.test(trimmedCode)) {
      if (seenExactPackageLine.has(trimmedCode)) {
        continue;
      }
      seenExactPackageLine.add(trimmedCode);
    }

    nextPreambleLines.push(line);
  }

  return {
    nextSource: nextPreambleLines.join(eol) + rest,
    keptLibraries,
    removedLibraries,
  };
}

// ============================================================================
// BLOCK 2 (P70–P73): DESKTOP IDE ERGONOMICS IN TEXSOURCEEDITOR
// ============================================================================

export interface SafeReplaceOptions {
  caseSensitive?: boolean;
  useRegex?: boolean;
}

/**
 * P70: n1-Safe Batch Find & Replace.
 * Never corrupts % tikzarium:n1:<hex> tails! Also updates owned node text/math content cleanly via applyOwnedPrimitivePatch.
 */
export function replaceAllInTexPreservingN1(
  source: string,
  query: string,
  replacement: string,
  options: SafeReplaceOptions = {}
): { nextSource: string; replacementsCount: number } {
  if (!query) return { nextSource: source, replacementsCount: 0 };
  const caseSensitive = options.caseSensitive ?? true;
  const useRegex = options.useRegex ?? false;

  let regex: RegExp;
  try {
    const flags = caseSensitive ? 'g' : 'gi';
    const pattern = useRegex ? query : query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    regex = new RegExp(pattern, flags);
  } catch {
    return { nextSource: source, replacementsCount: 0 };
  }

  let cur = source;
  let replacementsCount = 0;

  // 1. Safely update owned `node` primitives' content / node_id so commandPart and hex stay in 1:1 sync
  const owned = parseOwnedPrimitives(cur);
  for (const p of owned) {
    if (p.tool === 'node' && p.values.content) {
      let localHits = 0;
      const nextContent = p.values.content.replace(regex, (m) => {
        localHits++;
        return m === '' ? '' : replacement;
      });
      if (localHits > 0 && nextContent !== p.values.content) {
        replacementsCount += localHits;
        cur = applyOwnedPrimitivePatch(cur, p.id, {
          ...p.values,
          content: nextContent,
        });
      }
    }
  }

  // 2. Replace in all non-owned lines (strictly skipping any % tikzarium:n1:<hex> lines)
  const eol = cur.includes('\r\n') ? '\r\n' : '\n';
  const lines = cur.split(/\r?\n/);
  const updatedLines = lines.map((line) => {
    if (line.includes(OWNERSHIP_MARKER)) {
      return line;
    }
    let lineHits = 0;
    const replaced = line.replace(regex, () => {
      lineHits++;
      return replacement;
    });
    replacementsCount += lineHits;
    return replaced;
  });

  return {
    nextSource: updatedLines.join(eol),
    replacementsCount,
  };
}

export interface DelimiterOrEnvMatch {
  kind: 'bracket' | 'environment';
  openLabel: string;
  closeLabel: string;
  openOffset: number;
  closeOffset: number;
  openLine: number;
  closeLine: number;
  jumpTargetOffset: number;
  jumpTargetLine: number;
}

function offsetToLineNumber(source: string, offset: number): number {
  let ln = 1;
  const lim = Math.min(source.length, Math.max(0, offset));
  for (let i = 0; i < lim; i++) {
    if (source[i] === '\n') ln++;
  }
  return ln;
}

/**
 * P71: Matching Bracket {} [] () & \begin{env}...\end{env} Pair Finder at Caret Offset.
 * Ignores escaped \{ \} and unescaped % comments.
 */
export function findMatchingDelimiterOrEnvAtOffset(
  source: string,
  caretOffset: number
): DelimiterOrEnvMatch | null {
  const clamped = Math.max(0, Math.min(source.length, caretOffset));

  // Build mask of comment characters so % comments don't trigger false delimiter matches
  const inComment = new Uint8Array(source.length);
  let commentActive = false;
  for (let i = 0; i < source.length; i++) {
    const ch = source[i];
    if (ch === '\n') {
      commentActive = false;
      continue;
    }
    if (!commentActive && ch === '%' && (i === 0 || source[i - 1] !== '\\')) {
      commentActive = true;
    }
    if (commentActive) inComment[i] = 1;
  }

  const isEscapedAt = (idx: number): boolean => {
    let backslashes = 0;
    let k = idx - 1;
    while (k >= 0 && source[k] === '\\') {
      backslashes++;
      k--;
    }
    return backslashes % 2 === 1;
  };

  // 1. Check if caret is inside \begin{...} or \end{...} on current line
  const lineStart = source.lastIndexOf('\n', Math.max(0, clamped - 1)) + 1;
  const lineEndNl = source.indexOf('\n', clamped);
  const lineEnd = lineEndNl === -1 ? source.length : lineEndNl;
  const lineSlice = source.slice(lineStart, lineEnd);
  const colInLine = clamped - lineStart;

  const envTokens = [...source.matchAll(/\\(begin|end)\{([^}]+)\}/g)].filter(
    (m) => m.index !== undefined && inComment[m.index] === 0
  );
  for (let idx = 0; idx < envTokens.length; idx++) {
    const tok = envTokens[idx];
    const start = tok.index ?? 0;
    const end = start + tok[0].length;
    if (clamped >= start && clamped <= end) {
      const isBegin = tok[1] === 'begin';
      const envName = tok[2];
      if (isBegin) {
        let depth = 1;
        for (let j = idx + 1; j < envTokens.length; j++) {
          if (envTokens[j][2] !== envName) continue;
          depth += envTokens[j][1] === 'begin' ? 1 : -1;
          if (depth === 0) {
            const closeOff = envTokens[j].index ?? 0;
            const openLn = offsetToLineNumber(source, start);
            const closeLn = offsetToLineNumber(source, closeOff);
            return {
              kind: 'environment',
              openLabel: `\\begin{${envName}}`,
              closeLabel: `\\end{${envName}}`,
              openOffset: start,
              closeOffset: closeOff,
              openLine: openLn,
              closeLine: closeLn,
              jumpTargetOffset: closeOff,
              jumpTargetLine: closeLn,
            };
          }
        }
      } else {
        let depth = 1;
        for (let j = idx - 1; j >= 0; j--) {
          if (envTokens[j][2] !== envName) continue;
          depth += envTokens[j][1] === 'end' ? 1 : -1;
          if (depth === 0) {
            const openOff = envTokens[j].index ?? 0;
            const openLn = offsetToLineNumber(source, openOff);
            const closeLn = offsetToLineNumber(source, start);
            return {
              kind: 'environment',
              openLabel: `\\begin{${envName}}`,
              closeLabel: `\\end{${envName}}`,
              openOffset: openOff,
              closeOffset: start,
              openLine: openLn,
              closeLine: closeLn,
              jumpTargetOffset: openOff,
              jumpTargetLine: openLn,
            };
          }
        }
      }
    }
  }

  // Suppress unused variable lint if colInLine/lineSlice not needed further
  void lineSlice;
  void colInLine;

  // 2. Check bracket delimiters at caretOffset or caretOffset - 1
  const OPEN_TO_CLOSE: Record<string, string> = { '{': '}', '[': ']', '(': ')' };
  const CLOSE_TO_OPEN: Record<string, string> = { '}': '{', ']': '[', ')': '(' };

  const candidateIndices = [clamped, clamped - 1].filter(
    (i) => i >= 0 && i < source.length && inComment[i] === 0 && !isEscapedAt(i)
  );

  for (const pos of candidateIndices) {
    const ch = source[pos];
    if (OPEN_TO_CLOSE[ch]) {
      const targetClose = OPEN_TO_CLOSE[ch];
      let depth = 1;
      for (let i = pos + 1; i < source.length; i++) {
        if (inComment[i] || isEscapedAt(i)) continue;
        if (source[i] === ch) depth++;
        else if (source[i] === targetClose) {
          depth--;
          if (depth === 0) {
            const openLn = offsetToLineNumber(source, pos);
            const closeLn = offsetToLineNumber(source, i);
            return {
              kind: 'bracket',
              openLabel: ch,
              closeLabel: targetClose,
              openOffset: pos,
              closeOffset: i,
              openLine: openLn,
              closeLine: closeLn,
              jumpTargetOffset: i,
              jumpTargetLine: closeLn,
            };
          }
        }
      }
    } else if (CLOSE_TO_OPEN[ch]) {
      const targetOpen = CLOSE_TO_OPEN[ch];
      let depth = 1;
      for (let i = pos - 1; i >= 0; i--) {
        if (inComment[i] || isEscapedAt(i)) continue;
        if (source[i] === ch) depth++;
        else if (source[i] === targetOpen) {
          depth--;
          if (depth === 0) {
            const openLn = offsetToLineNumber(source, i);
            const closeLn = offsetToLineNumber(source, pos);
            return {
              kind: 'bracket',
              openLabel: targetOpen,
              closeLabel: ch,
              openOffset: i,
              closeOffset: pos,
              openLine: openLn,
              closeLine: closeLn,
              jumpTargetOffset: i,
              jumpTargetLine: openLn,
            };
          }
        }
      }
    }
  }

  return null;
}

// ============================================================================
// P72: DOCUMENT OUTLINE (Структура .tex)
// ============================================================================

export type OutlineItemKind =
  | 'preamble'
  | 'macro'
  | 'style'
  | 'tikzpicture'
  | 'scope'
  | 'axis'
  | 'node';

export interface TexDocumentOutlineItem {
  id: string;
  kind: OutlineItemKind;
  badgeRu: string;
  label: string;
  lineNumber: number;
  endLineNumber?: number;
  hasError: boolean;
}

export function buildTexDocumentOutline(
  source: string,
  diagnostics: TexDiagnostic[] = []
): TexDocumentOutlineItem[] {
  const lines = source.split(/\r?\n/);
  const errorLineSet = new Set(diagnostics.map((d) => d.lineNumber));
  const items: TexDocumentOutlineItem[] = [];

  const docClassIdx = lines.findIndex((l) => /^\s*\\documentclass\b/.test(l));
  const beginDocIdx = lines.findIndex((l) => /^\s*\\begin\{document\}/.test(l));
  if (docClassIdx !== -1 && beginDocIdx > docClassIdx) {
    let hasErr = false;
    for (let ln = docClassIdx + 1; ln <= beginDocIdx; ln++) {
      if (errorLineSet.has(ln)) hasErr = true;
    }
    items.push({
      id: `outline-preamble-${docClassIdx + 1}`,
      kind: 'preamble',
      badgeRu: 'Преамбула',
      label: `Стр. ${docClassIdx + 1}–${beginDocIdx}`,
      lineNumber: docClassIdx + 1,
      endLineNumber: beginDocIdx,
      hasError: hasErr,
    });
  }

  for (let i = 0; i < lines.length; i++) {
    const ln = i + 1;
    const { codePart } = splitCodeAndUnescapedComment(lines[i]);
    const trimmed = codePart.trim();
    if (!trimmed) continue;

    const macroMatch = /\\(?:newcommand|renewcommand)\{\\([A-Za-z@]+)\}/.exec(trimmed);
    if (macroMatch) {
      items.push({
        id: `outline-macro-${ln}`,
        kind: 'macro',
        badgeRu: 'Макрос',
        label: `\\${macroMatch[1]}`,
        lineNumber: ln,
        hasError: errorLineSet.has(ln),
      });
      continue;
    }

    const styleMatch = /\\tikzset\{([^/]+)\/\.style/.exec(trimmed);
    if (styleMatch) {
      items.push({
        id: `outline-style-${ln}`,
        kind: 'style',
        badgeRu: 'Стиль',
        label: styleMatch[1].trim(),
        lineNumber: ln,
        hasError: errorLineSet.has(ln),
      });
      continue;
    }

    if (/^\\begin\{tikzpicture\}/.test(trimmed)) {
      items.push({
        id: `outline-tikz-${ln}`,
        kind: 'tikzpicture',
        badgeRu: 'Холст',
        label: 'tikzpicture',
        lineNumber: ln,
        hasError: errorLineSet.has(ln),
      });
      continue;
    }

    const scopeMatch = /^\\begin\{scope\}(?:\[([^\]]*)\])?/.exec(trimmed);
    if (scopeMatch) {
      items.push({
        id: `outline-scope-${ln}`,
        kind: 'scope',
        badgeRu: 'Слой',
        label: scopeMatch[1] ? `scope [${scopeMatch[1].slice(0, 24)}]` : 'scope',
        lineNumber: ln,
        hasError: errorLineSet.has(ln),
      });
      continue;
    }

    const axisMatch = /^\\begin\{(axis|semilogxaxis|semilogyaxis|loglogaxis)\}/.exec(trimmed);
    if (axisMatch) {
      items.push({
        id: `outline-axis-${ln}`,
        kind: 'axis',
        badgeRu: 'Оси',
        label: axisMatch[1],
        lineNumber: ln,
        hasError: errorLineSet.has(ln),
      });
      continue;
    }

    const namedNodeMatch = /\\node(?:\[[^\]]*\])?\s*\(([^)]+)\)\s*at\s*\(/.exec(trimmed);
    if (namedNodeMatch) {
      items.push({
        id: `outline-node-${ln}`,
        kind: 'node',
        badgeRu: 'Узел',
        label: `(${namedNodeMatch[1].trim()})`,
        lineNumber: ln,
        hasError: errorLineSet.has(ln),
      });
    }
  }

  return items;
}

// ============================================================================
// P73: MULTI-LINE EDITOR OPERATIONS (% Comment, Alt+Up/Down, & Column Align)
// ============================================================================

export function toggleLineCommentsInSource(
  source: string,
  startLine: number,
  endLine: number = startLine
): string {
  const eol = source.includes('\r\n') ? '\r\n' : '\n';
  const lines = source.split(/\r?\n/);
  const lo = Math.max(1, Math.min(lines.length, Math.min(startLine, endLine)));
  const hi = Math.max(1, Math.min(lines.length, Math.max(startLine, endLine)));

  const slice = lines.slice(lo - 1, hi).filter((l) => l.trim().length > 0);
  const allCommented = slice.length > 0 && slice.every((l) => /^\s*%/.test(l));

  for (let idx = lo - 1; idx <= hi - 1; idx++) {
    const line = lines[idx];
    if (line.trim().length === 0) continue;
    if (allCommented) {
      lines[idx] = line.replace(/^(\s*)%\s?/, '$1');
    } else {
      lines[idx] = line.replace(/^(\s*)/, '$1% ');
    }
  }
  return lines.join(eol);
}

export function moveLineInSource(
  source: string,
  lineNumber: number,
  direction: -1 | 1
): { nextSource: string; nextLineNumber: number } {
  const eol = source.includes('\r\n') ? '\r\n' : '\n';
  const lines = source.split(/\r?\n/);
  const idx = lineNumber - 1;
  const targetIdx = idx + direction;
  if (idx < 0 || idx >= lines.length || targetIdx < 0 || targetIdx >= lines.length) {
    return { nextSource: source, nextLineNumber: lineNumber };
  }
  const tmp = lines[idx];
  lines[idx] = lines[targetIdx];
  lines[targetIdx] = tmp;
  return {
    nextSource: lines.join(eol),
    nextLineNumber: targetIdx + 1,
  };
}

/**
 * Aligns `&` columns across contiguous tabular/matrix rows ending with `\\` (or containing unescaped `&`).
 */
export function alignAmpersandColumnsInSource(source: string): {
  nextSource: string;
  alignedRowsCount: number;
} {
  const eol = source.includes('\r\n') ? '\r\n' : '\n';
  const lines = source.split(/\r?\n/);
  let alignedRowsCount = 0;

  const isTableRow = (line: string): boolean => {
    if (line.includes(OWNERSHIP_MARKER)) return false;
    const { codePart } = splitCodeAndUnescapedComment(line);
    const trimmed = codePart.trim();
    if (!trimmed || /^\\(toprule|midrule|bottomrule|hline|cline)\b/.test(trimmed)) return false;
    // Must contain at least one unescaped &
    for (let i = 0; i < trimmed.length; i++) {
      if (trimmed[i] === '&' && (i === 0 || trimmed[i - 1] !== '\\')) return true;
    }
    return false;
  };

  const splitCells = (code: string): { indent: string; cells: string[]; rowEnd: string } => {
    const indent = (/^(\s*)/.exec(code)?.[1]) ?? '';
    let body = code.trim();
    let rowEnd = '';
    const slashMatch = /(\\\\(?:\[[^\]]*\])?\s*)$/.exec(body);
    if (slashMatch) {
      rowEnd = slashMatch[1].trim();
      body = body.slice(0, body.length - slashMatch[1].length).trimEnd();
    }
    const cells: string[] = [];
    let cur = '';
    for (let i = 0; i < body.length; i++) {
      if (body[i] === '&' && (i === 0 || body[i - 1] !== '\\')) {
        cells.push(cur.trim());
        cur = '';
      } else {
        cur += body[i];
      }
    }
    cells.push(cur.trim());
    return { indent, cells, rowEnd };
  };

  let idx = 0;
  while (idx < lines.length) {
    if (!isTableRow(lines[idx])) {
      idx++;
      continue;
    }
    let end = idx;
    while (end < lines.length && isTableRow(lines[end])) {
      end++;
    }
    if (end - idx >= 2) {
      const parsedBlock = [];
      let maxCols = 0;
      for (let k = idx; k < end; k++) {
        const { codePart, commentPart } = splitCodeAndUnescapedComment(lines[k]);
        const row = splitCells(codePart);
        maxCols = Math.max(maxCols, row.cells.length);
        parsedBlock.push({ k, ...row, commentPart });
      }
      const colWidths = new Array<number>(maxCols).fill(0);
      for (const row of parsedBlock) {
        row.cells.forEach((c, cIdx) => {
          colWidths[cIdx] = Math.max(colWidths[cIdx], c.length);
        });
      }
      for (const row of parsedBlock) {
        const padded = row.cells.map((c, cIdx) =>
          cIdx < row.cells.length - 1 ? c.padEnd(colWidths[cIdx], ' ') : c
        );
        const joined = `${row.indent}${padded.join(' & ')}${row.rowEnd ? ` ${row.rowEnd}` : ''}`;
        const rebuilt = row.commentPart ? `${joined} ${row.commentPart.trim()}` : joined;
        if (rebuilt !== lines[row.k]) {
          lines[row.k] = rebuilt;
        }
        alignedRowsCount++;
      }
    }
    idx = end;
  }

  return {
    nextSource: lines.join(eol),
    alignedRowsCount,
  };
}

// ============================================================================
// BLOCK 3 (P74–P77): PRECISION CAD GEOMETRY (OFFSET, SPLINE, TRIM, ГОСТ COMB)
// ============================================================================

function fmtCm(val: number): string {
  const clean = Math.abs(val) < 1e-9 ? 0 : val;
  return `${clean.toFixed(2)}cm`;
}

function serializePtsCm(pts: Array<{ x: number; y: number }>): string {
  return pts.map((p) => `${fmtCm(p.x)},${fmtCm(p.y)}`).join(';');
}

function parsePtPair(p: OwnedPrimitive): {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
} | null {
  if (p.tool !== 'line' && p.tool !== 'arrow' && p.tool !== 'rectangle') return null;
  const x1 = parseDimensionToCm(p.values.start_x ?? '');
  const y1 = parseDimensionToCm(p.values.start_y ?? '');
  const x2 = parseDimensionToCm(p.values.end_x ?? '');
  const y2 = parseDimensionToCm(p.values.end_y ?? '');
  if (x1 === null || y1 === null || x2 === null || y2 === null) return null;
  return { x1, y1, x2, y2 };
}

/**
 * P74: Parallel Contour Offset (Offset ±Δd cm) for line/arrow, rectangle, circle, and polygon/polyline.
 */
export function insertParallelOffsetContourIntoSource(
  source: string,
  primitiveId: number,
  offsetCm: number
): { nextSource: string; newId: number | null; summaryRu: string } {
  const owned = parseOwnedPrimitives(source);
  const target = owned.find((p) => p.id === primitiveId);
  if (!target || Math.abs(offsetCm) < 1e-6) {
    return {
      nextSource: source,
      newId: null,
      summaryRu: 'Выберите отрезок, прямоугольник, окружность или многоугольник и задайте смещение Δd ≠ 0.',
    };
  }

  if (target.tool === 'line' && target.values.poly_points) {
    const rawPts = parsePolyPointsList(target.values.poly_points);
    const pts = rawPts.map((pt) => ({ x: pt.xCm, y: pt.yCm }));
    const isClosed = target.values.poly_closed === 'cycle';
    if (pts.length < 2) {
      return { nextSource: source, newId: null, summaryRu: 'Недостаточно вершин контура для эквидистанты.' };
    }

    const edgeNormal = (a: { x: number; y: number }, b: { x: number; y: number }) => {
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const len = Math.hypot(dx, dy) || 1;
      return { nx: -dy / len, ny: dx / len };
    };

    const n = pts.length;
    const offsetPts: Array<{ x: number; y: number }> = [];
    for (let i = 0; i < n; i++) {
      if (!isClosed && (i === 0 || i === n - 1)) {
        const norm = i === 0 ? edgeNormal(pts[0], pts[1]) : edgeNormal(pts[n - 2], pts[n - 1]);
        offsetPts.push({
          x: pts[i].x + norm.nx * offsetCm,
          y: pts[i].y + norm.ny * offsetCm,
        });
      } else {
        const prev = pts[(i - 1 + n) % n];
        const curr = pts[i];
        const next = pts[(i + 1) % n];
        const n1 = edgeNormal(prev, curr);
        const n2 = edgeNormal(curr, next);
        let bx = n1.nx + n2.nx;
        let by = n1.ny + n2.ny;
        const bLen = Math.hypot(bx, by);
        if (bLen < 1e-5) {
          offsetPts.push({ x: curr.x + n1.nx * offsetCm, y: curr.y + n1.ny * offsetCm });
        } else {
          bx /= bLen;
          by /= bLen;
          const dot = bx * n1.nx + by * n1.ny;
          const miter = Math.max(-2.5, Math.min(2.5, dot !== 0 ? offsetCm / dot : offsetCm));
          offsetPts.push({ x: curr.x + bx * miter, y: curr.y + by * miter });
        }
      }
    }

    const ins = insertOwnedPrimitiveIntoSource(source, 'line', {
      ...target.values,
      start_x: fmtCm(offsetPts[0].x),
      start_y: fmtCm(offsetPts[0].y),
      end_x: fmtCm(offsetPts[offsetPts.length - 1].x),
      end_y: fmtCm(offsetPts[offsetPts.length - 1].y),
      poly_points: serializePtsCm(offsetPts),
    });
    return {
      nextSource: ins.nextSource,
      newId: ins.newId,
      summaryRu: `Построена эквидистанта многозвенного контура Δd = ${offsetCm.toFixed(2)} см (#${ins.newId}).`,
    };
  }

  if (target.tool === 'line' || target.tool === 'arrow') {
    const seg = parsePtPair(target);
    if (!seg) return { nextSource: source, newId: null, summaryRu: 'Не удалось прочитать координаты отрезка.' };
    const dx = seg.x2 - seg.x1;
    const dy = seg.y2 - seg.y1;
    const len = Math.hypot(dx, dy);
    if (len < 1e-6) return { nextSource: source, newId: null, summaryRu: 'Нулевая длина отрезка.' };
    const nx = -dy / len;
    const ny = dx / len;
    const nextValues: Record<string, string> = {
      ...target.values,
      start_x: fmtCm(seg.x1 + nx * offsetCm),
      start_y: fmtCm(seg.y1 + ny * offsetCm),
      end_x: fmtCm(seg.x2 + nx * offsetCm),
      end_y: fmtCm(seg.y2 + ny * offsetCm),
    };
    if (target.tool === 'arrow' && !nextValues.tip) nextValues.tip = 'Stealth';
    const ins = insertOwnedPrimitiveIntoSource(source, target.tool, nextValues);
    return {
      nextSource: ins.nextSource,
      newId: ins.newId,
      summaryRu: `Построена эквидистанта Δd = ${offsetCm >= 0 ? '+' : ''}${offsetCm.toFixed(2)} см (#${ins.newId}).`,
    };
  }

  if (target.tool === 'rectangle') {
    const rect = parsePtPair(target);
    if (!rect) return { nextSource: source, newId: null, summaryRu: 'Не удалось прочитать прямоугольник.' };
    const minX = Math.min(rect.x1, rect.x2) - offsetCm;
    const maxX = Math.max(rect.x1, rect.x2) + offsetCm;
    const minY = Math.min(rect.y1, rect.y2) - offsetCm;
    const maxY = Math.max(rect.y1, rect.y2) + offsetCm;
    if (maxX - minX <= 0.02 || maxY - minY <= 0.02) {
      return { nextSource: source, newId: null, summaryRu: 'Внутренний отступ превышает полуширину прямоугольника.' };
    }
    const ins = insertOwnedPrimitiveIntoSource(source, 'rectangle', {
      ...target.values,
      start_x: fmtCm(minX),
      start_y: fmtCm(minY),
      end_x: fmtCm(maxX),
      end_y: fmtCm(maxY),
    });
    return {
      nextSource: ins.nextSource,
      newId: ins.newId,
      summaryRu: `Построен концентрический прямоугольник стенки Δd = ${offsetCm.toFixed(2)} см (#${ins.newId}).`,
    };
  }

  if (target.tool === 'circle') {
    const cx = parseDimensionToCm(target.values.center_x ?? '');
    const cy = parseDimensionToCm(target.values.center_y ?? '');
    const r = parseDimensionToCm(target.values.radius ?? '');
    if (cx === null || cy === null || r === null || r + offsetCm <= 0.02) {
      return { nextSource: source, newId: null, summaryRu: 'Результирующий радиус окружности должен быть > 0.02 см.' };
    }
    const ins = insertOwnedPrimitiveIntoSource(source, 'circle', {
      ...target.values,
      center_x: fmtCm(cx),
      center_y: fmtCm(cy),
      radius: fmtCm(r + offsetCm),
    });
    return {
      nextSource: ins.nextSource,
      newId: ins.newId,
      summaryRu: `Построена концентрическая окружность R = ${(r + offsetCm).toFixed(2)} см (#${ins.newId}).`,
    };
  }

  return { nextSource: source, newId: null, summaryRu: 'Для данного типа объекта эквидистанта не применима.' };
}

/**
 * P75: Smooth Interpolating Catmull–Rom Spline -> C1 Tangent Cubic Bezier Segments in n1.
 * Strictly passes through all anchor points (unlike raw single cubic Bezier).
 */
export function insertCatmullRomSplineIntoSource(
  source: string,
  pointsCm: Array<{ x: number; y: number }>,
  options: {
    closed?: boolean;
    tension?: number;
    strokeColor?: string;
    strokeWidth?: string;
    arrowTipOnLast?: boolean;
  } = {}
): { nextSource: string; insertedIds: number[]; summaryRu: string } {
  if (pointsCm.length < 2) {
    return {
      nextSource: source,
      insertedIds: [],
      summaryRu: 'Укажите минимум 2 узловые точки для интерполяционного сплайна.',
    };
  }

  const closed = options.closed ?? false;
  const tension = Math.max(0.1, Math.min(1.5, options.tension ?? 1.0));
  const strokeColor = options.strokeColor ?? 'blue!75!black';
  const strokeWidth = options.strokeWidth ?? 'thick';
  const arrowTipOnLast = options.arrowTipOnLast ?? false;

  let cur = source;
  if (arrowTipOnLast) {
    const libPlan = proposeLibraryConnect(cur, 'arrows.meta');
    if (libPlan.ok) cur = libPlan.nextSource;
  }

  const pts = pointsCm;
  const n = pts.length;
  const segCount = closed ? n : n - 1;
  const insertedIds: number[] = [];

  const getPt = (idx: number): { x: number; y: number } => {
    if (closed) return pts[((idx % n) + n) % n];
    if (idx < 0) {
      return { x: 2 * pts[0].x - pts[1].x, y: 2 * pts[0].y - pts[1].y };
    }
    if (idx >= n) {
      return { x: 2 * pts[n - 1].x - pts[n - 2].x, y: 2 * pts[n - 1].y - pts[n - 2].y };
    }
    return pts[idx];
  };

  for (let i = 0; i < segCount; i++) {
    const p0 = getPt(i - 1);
    const p1 = getPt(i);
    const p2 = getPt(i + 1);
    const p3 = getPt(i + 2);

    const c1x = p1.x + ((p2.x - p0.x) / 6) * tension;
    const c1y = p1.y + ((p2.y - p0.y) / 6) * tension;
    const c2x = p2.x - ((p3.x - p1.x) / 6) * tension;
    const c2y = p2.y - ((p3.y - p1.y) / 6) * tension;

    const vals: Record<string, string> = {
      start_x: fmtCm(p1.x),
      start_y: fmtCm(p1.y),
      control1_x: fmtCm(c1x),
      control1_y: fmtCm(c1y),
      control2_x: fmtCm(c2x),
      control2_y: fmtCm(c2y),
      end_x: fmtCm(p2.x),
      end_y: fmtCm(p2.y),
      stroke_color: strokeColor,
      stroke_width: strokeWidth,
      line_style: 'solid',
    };

    const ins = insertOwnedPrimitiveIntoSource(cur, 'cubic', vals);
    cur = ins.nextSource;
    insertedIds.push(ins.newId);
  }

  // Optional Stealth tangent arrow at the end of the spline
  if (arrowTipOnLast && !closed && n >= 2) {
    const pPrev = getPt(n - 2);
    const pEnd = getPt(n - 1);
    const dx = pEnd.x - pPrev.x;
    const dy = pEnd.y - pPrev.y;
    const len = Math.hypot(dx, dy) || 1;
    const tailLen = Math.min(0.35, len * 0.45);
    const insArrow = insertOwnedPrimitiveIntoSource(cur, 'arrow', {
      start_x: fmtCm(pEnd.x - (dx / len) * tailLen),
      start_y: fmtCm(pEnd.y - (dy / len) * tailLen),
      end_x: fmtCm(pEnd.x),
      end_y: fmtCm(pEnd.y),
      tip: 'Stealth',
      stroke_color: strokeColor,
      stroke_width: strokeWidth,
    });
    cur = insArrow.nextSource;
    insertedIds.push(insArrow.newId);
  }

  return {
    nextSource: cur,
    insertedIds,
    summaryRu: `Построен гладкий интерполяционный сплайн через ${n} точек (${insertedIds.length} звеньев Безье C¹).`,
  };
}

/**
 * Extracts anchor coordinates (x, y) in cm from selected circle/node/line primitives to feed Catmull–Rom spline.
 */
export function extractAnchorPointsFromPrimitives(
  primitives: OwnedPrimitive[]
): Array<{ x: number; y: number }> {
  const pts: Array<{ x: number; y: number }> = [];
  for (const p of primitives) {
    if (p.tool === 'node') {
      const x = parseDimensionToCm(p.values.x ?? '');
      const y = parseDimensionToCm(p.values.y ?? '');
      if (x !== null && y !== null) pts.push({ x, y });
    } else if (p.tool === 'circle') {
      const x = parseDimensionToCm(p.values.center_x ?? '');
      const y = parseDimensionToCm(p.values.center_y ?? '');
      if (x !== null && y !== null) pts.push({ x, y });
    } else if (p.tool === 'line' || p.tool === 'arrow') {
      const seg = parsePtPair(p);
      if (seg) {
        if (pts.length === 0) pts.push({ x: seg.x1, y: seg.y1 });
        pts.push({ x: seg.x2, y: seg.y2 });
      }
    }
  }
  return pts;
}

/**
 * P76: Ray Trim (Scissors) & Extend to Boundary Segment.
 */
export function trimOrExtendSegmentToBoundaryInSource(
  source: string,
  targetSegmentId: number,
  boundarySegmentId: number,
  mode: 'trim' | 'extend'
): { nextSource: string; ok: boolean; intersectionCm: { x: number; y: number } | null; summaryRu: string } {
  const owned = parseOwnedPrimitives(source);
  const target = owned.find((p) => p.id === targetSegmentId);
  const boundary = owned.find((p) => p.id === boundarySegmentId);
  if (!target || !boundary) {
    return {
      nextSource: source,
      ok: false,
      intersectionCm: null,
      summaryRu: 'Выберите два отрезка/луча: первый — изменяемый луч, второй — секущая граница.',
    };
  }
  const s1 = parsePtPair(target);
  const s2 = parsePtPair(boundary);
  if (!s1 || !s2 || target.tool === 'rectangle' || boundary.tool === 'rectangle') {
    return {
      nextSource: source,
      ok: false,
      intersectionCm: null,
      summaryRu: 'Операции Trim / Extend работают для пар примитивов line или arrow.',
    };
  }

  const rX = s1.x2 - s1.x1;
  const rY = s1.y2 - s1.y1;
  const qX = s2.x2 - s2.x1;
  const qY = s2.y2 - s2.y1;
  const denom = rX * qY - rY * qX;
  if (Math.abs(denom) < 1e-7) {
    return {
      nextSource: source,
      ok: false,
      intersectionCm: null,
      summaryRu: 'Отрезки параллельны или коллинеарны — пересечение отсутствует.',
    };
  }

  // s1(t) = P + t*r, s2(u) = Q + u*q
  const dx = s2.x1 - s1.x1;
  const dy = s2.y1 - s1.y1;
  const t = (dx * qY - dy * qX) / denom;
  const ix = s1.x1 + t * rX;
  const iy = s1.y1 + t * rY;

  const nextValues: Record<string, string> = { ...target.values };
  if (mode === 'trim') {
    // Keep the longer side [start -> intersection] unless t < 0.5 and intersection is near start
    if (t >= 0.5 || t > 1) {
      nextValues.end_x = fmtCm(ix);
      nextValues.end_y = fmtCm(iy);
    } else if (t > 0) {
      // Keep start -> intersection (standard optical ray hitting mirror and stopping!)
      nextValues.end_x = fmtCm(ix);
      nextValues.end_y = fmtCm(iy);
    } else {
      nextValues.start_x = fmtCm(ix);
      nextValues.start_y = fmtCm(iy);
    }
  } else {
    // Extend nearest endpoint of target segment to (ix, iy)
    const d1 = Math.hypot(ix - s1.x1, iy - s1.y1);
    const d2 = Math.hypot(ix - s1.x2, iy - s1.y2);
    if (d2 <= d1) {
      nextValues.end_x = fmtCm(ix);
      nextValues.end_y = fmtCm(iy);
    } else {
      nextValues.start_x = fmtCm(ix);
      nextValues.start_y = fmtCm(iy);
    }
  }

  if (target.tool === 'arrow' && !nextValues.tip) {
    nextValues.tip = 'Stealth';
  }

  const nextSource = applyOwnedPrimitivePatch(source, target.id, nextValues);
  return {
    nextSource,
    ok: true,
    intersectionCm: { x: ix, y: iy },
    summaryRu:
      mode === 'trim'
        ? `Луч #${target.id} подрезан (Trim) по границе #${boundary.id} в точке (${ix.toFixed(2)}, ${iy.toFixed(2)}) см.`
        : `Луч #${target.id} дотянут (Extend) до границы #${boundary.id} в точку (${ix.toFixed(2)}, ${iy.toFixed(2)}) см.`,
  };
}

/**
 * P77: ГОСТ Mirror / Ground / Fixed-Support Comb Hatching along an inclined segment.
 */
export function insertGostSupportCombHatchIntoSource(
  source: string,
  segmentId: number,
  options: {
    stepCm?: number;
    toothLenCm?: number;
    angleDeg?: number;
    flipSide?: boolean;
  } = {}
): { nextSource: string; insertedIds: number[]; summaryRu: string } {
  const owned = parseOwnedPrimitives(source);
  const segPrim = owned.find((p) => p.id === segmentId);
  const seg = segPrim ? parsePtPair(segPrim) : null;
  if (!segPrim || !seg || (segPrim.tool !== 'line' && segPrim.tool !== 'arrow')) {
    return {
      nextSource: source,
      insertedIds: [],
      summaryRu: 'Выберите базовый отрезок (зеркало, стенку или заделку балки) для гребёнки ГОСТ.',
    };
  }

  const stepCm = Math.max(0.12, options.stepCm ?? 0.25);
  const toothLenCm = Math.max(0.1, options.toothLenCm ?? 0.22);
  const angleDeg = options.angleDeg ?? 45;
  const sideSign = options.flipSide ? -1 : 1;

  const dx = seg.x2 - seg.x1;
  const dy = seg.y2 - seg.y1;
  const totalLen = Math.hypot(dx, dy);
  if (totalLen < 0.08) {
    return { nextSource: source, insertedIds: [], summaryRu: 'Отрезок слишком мал для гребёнки.' };
  }

  const baseAngle = Math.atan2(dy, dx);
  const toothAngle = baseAngle + sideSign * ((angleDeg * Math.PI) / 180);
  const tx = Math.cos(toothAngle) * toothLenCm;
  const ty = Math.sin(toothAngle) * toothLenCm;

  const count = Math.min(48, Math.max(2, Math.floor(totalLen / stepCm) + 1));
  let cur = source;
  const insertedIds: number[] = [];

  for (let i = 0; i < count; i++) {
    const frac = count === 1 ? 0.5 : i / (count - 1);
    const ax = seg.x1 + dx * frac;
    const ay = seg.y1 + dy * frac;
    const ins = insertOwnedPrimitiveIntoSource(cur, 'line', {
      start_x: fmtCm(ax),
      start_y: fmtCm(ay),
      end_x: fmtCm(ax + tx),
      end_y: fmtCm(ay + ty),
      stroke_color: segPrim.values.stroke_color || 'black',
      stroke_width: 'thin',
      line_style: 'solid',
    });
    cur = ins.nextSource;
    insertedIds.push(ins.newId);
  }

  return {
    nextSource: cur,
    insertedIds,
    summaryRu: `Построена гребёнка опоры/зеркала ГОСТ вдоль #${segmentId}: ${insertedIds.length} штрихов под ${angleDeg}°.`,
  };
}

// ============================================================================
// BLOCK 4 (P78–P80): VECTOR SVG IMPORT, BOOKTABS TABLES & SINGLE-FILE ARCHIVE
// ============================================================================

function parseAttrMap(tagBody: string): Record<string, string> {
  const attrs: Record<string, string> = {};
  const re = /([A-Za-z_:][-A-Za-z0-9_:.]*)\s*=\s*(?:"([^"]*)"|'([^']*)')/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(tagBody)) !== null) {
    attrs[m[1].toLowerCase()] = m[2] ?? m[3] ?? '';
  }
  return attrs;
}

function parseSvgPointsAttr(raw: string): Array<{ x: number; y: number }> {
  const nums = (raw.match(/-?\d+(?:\.\d+)?(?:e[-+]?\d+)?/gi) ?? []).map(Number);
  const pts: Array<{ x: number; y: number }> = [];
  for (let i = 0; i + 1 < nums.length; i += 2) {
    if (Number.isFinite(nums[i]) && Number.isFinite(nums[i + 1])) {
      pts.push({ x: nums[i], y: nums[i + 1] });
    }
  }
  return pts;
}

function parseSimpleSvgPathToPoints(d: string): {
  pts: Array<{ x: number; y: number }>;
  closed: boolean;
} {
  const tokens = d.match(/[MLHVZmlhvz]|-?\d+(?:\.\d+)?(?:e[-+]?\d+)?/g) ?? [];
  const pts: Array<{ x: number; y: number }> = [];
  let cx = 0;
  let cy = 0;
  let cmd = 'M';
  let closed = false;
  let i = 0;

  while (i < tokens.length) {
    const tok = tokens[i];
    if (/^[MLHVZmlhvz]$/.test(tok)) {
      cmd = tok;
      i++;
      if (cmd === 'Z' || cmd === 'z') {
        closed = true;
      }
      continue;
    }
    const readNum = () => Number(tokens[i++] ?? 0);
    if (cmd === 'M' || cmd === 'L') {
      cx = readNum();
      cy = readNum();
      pts.push({ x: cx, y: cy });
      if (cmd === 'M') cmd = 'L';
    } else if (cmd === 'm' || cmd === 'l') {
      cx += readNum();
      cy += readNum();
      pts.push({ x: cx, y: cy });
      if (cmd === 'm') cmd = 'l';
    } else if (cmd === 'H') {
      cx = readNum();
      pts.push({ x: cx, y: cy });
    } else if (cmd === 'h') {
      cx += readNum();
      pts.push({ x: cx, y: cy });
    } else if (cmd === 'V') {
      cy = readNum();
      pts.push({ x: cx, y: cy });
    } else if (cmd === 'v') {
      cy += readNum();
      pts.push({ x: cx, y: cy });
    } else {
      i++;
    }
  }

  return { pts, closed };
}

/**
 * P78: External Vector SVG Importer (<line>, <rect>, <circle>, <polyline>, <polygon>, <path>)
 * Scales SVG viewBox/px coordinates to TikZ cm and flips SVG Y-down axis to TikZ Y-up!
 */
export function importExternalSvgIntoSource(
  source: string,
  svgMarkup: string,
  options: { targetWidthCm?: number; offsetXCm?: number; offsetYCm?: number } = {}
): { nextSource: string; insertedIds: number[]; summaryRu: string } {
  const targetWidthCm = Math.max(1.0, Math.min(18.0, options.targetWidthCm ?? 6.0));
  const offsetXCm = options.offsetXCm ?? 0.5;
  const offsetYCm = options.offsetYCm ?? 0.5;

  const svgHeaderMatch = /<svg\b([^>]*)>/i.exec(svgMarkup);
  let vbMinX = 0;
  let vbMinY = 0;
  let vbW = 200;
  let vbH = 120;

  if (svgHeaderMatch) {
    const svgAttrs = parseAttrMap(svgHeaderMatch[1]);
    if (svgAttrs.viewbox) {
      const nums = svgAttrs.viewbox.trim().split(/[\s,]+/).map(Number);
      if (nums.length === 4 && nums[2] > 0 && nums[3] > 0) {
        [vbMinX, vbMinY, vbW, vbH] = nums;
      }
    } else {
      const w = parseFloat(svgAttrs.width ?? '');
      const h = parseFloat(svgAttrs.height ?? '');
      if (w > 0) vbW = w;
      if (h > 0) vbH = h;
    }
  }

  const scale = targetWidthCm / Math.max(1e-3, vbW);
  const mapX = (svgX: number) => offsetXCm + (svgX - vbMinX) * scale;
  const mapY = (svgY: number) => offsetYCm + (vbH - (svgY - vbMinY)) * scale;

  let cur = source;
  const insertedIds: number[] = [];

  const elementRe = /<(line|rect|circle|polyline|polygon|path)\b([^>]*?)\/?>/gi;
  let match: RegExpExecArray | null;

  while ((match = elementRe.exec(svgMarkup)) !== null) {
    const tag = match[1].toLowerCase();
    const attrs = parseAttrMap(match[2]);
    const isDashed = Boolean(attrs['stroke-dasharray']);
    const hasFill = attrs.fill && attrs.fill !== 'none' && attrs.fill !== 'transparent';
    const baseStyle: Record<string, string> = {
      stroke_color: 'black',
      stroke_width: 'semithick',
      line_style: isDashed ? 'dashed' : 'solid',
    };

    if (tag === 'line') {
      const x1 = parseFloat(attrs.x1 ?? '0');
      const y1 = parseFloat(attrs.y1 ?? '0');
      const x2 = parseFloat(attrs.x2 ?? '0');
      const y2 = parseFloat(attrs.y2 ?? '0');
      const ins = insertOwnedPrimitiveIntoSource(cur, 'line', {
        ...baseStyle,
        start_x: fmtCm(mapX(x1)),
        start_y: fmtCm(mapY(y1)),
        end_x: fmtCm(mapX(x2)),
        end_y: fmtCm(mapY(y2)),
      });
      cur = ins.nextSource;
      insertedIds.push(ins.newId);
    } else if (tag === 'rect') {
      const x = parseFloat(attrs.x ?? '0');
      const y = parseFloat(attrs.y ?? '0');
      const w = parseFloat(attrs.width ?? '0');
      const h = parseFloat(attrs.height ?? '0');
      if (w > 0 && h > 0) {
        const rx = parseFloat(attrs.rx ?? '0');
        const ins = insertOwnedPrimitiveIntoSource(cur, 'rectangle', {
          ...baseStyle,
          start_x: fmtCm(mapX(x)),
          start_y: fmtCm(mapY(y + h)),
          end_x: fmtCm(mapX(x + w)),
          end_y: fmtCm(mapY(y)),
          fill_color: hasFill ? 'slate!12' : 'none',
          ...(rx > 0 ? { rounded_corners: fmtCm(rx * scale) } : {}),
        });
        cur = ins.nextSource;
        insertedIds.push(ins.newId);
      }
    } else if (tag === 'circle') {
      const cx = parseFloat(attrs.cx ?? '0');
      const cy = parseFloat(attrs.cy ?? '0');
      const r = parseFloat(attrs.r ?? '0');
      if (r > 0) {
        const ins = insertOwnedPrimitiveIntoSource(cur, 'circle', {
          ...baseStyle,
          center_x: fmtCm(mapX(cx)),
          center_y: fmtCm(mapY(cy)),
          radius: fmtCm(r * scale),
          fill_color: hasFill ? 'blue!8' : 'none',
        });
        cur = ins.nextSource;
        insertedIds.push(ins.newId);
      }
    } else if (tag === 'polyline' || tag === 'polygon') {
      const pts = parseSvgPointsAttr(attrs.points ?? '');
      if (pts.length >= 2) {
        const mapped = pts.map((p) => ({ x: mapX(p.x), y: mapY(p.y) }));
        const isClosed = tag === 'polygon';
        const ins = insertOwnedPrimitiveIntoSource(cur, 'line', {
          ...baseStyle,
          start_x: fmtCm(mapped[0].x),
          start_y: fmtCm(mapped[0].y),
          end_x: fmtCm(mapped[mapped.length - 1].x),
          end_y: fmtCm(mapped[mapped.length - 1].y),
          poly_points: serializePtsCm(mapped),
          ...(isClosed ? { poly_closed: 'cycle' } : {}),
          fill_color: isClosed && hasFill ? 'cyan!10' : 'none',
        });
        cur = ins.nextSource;
        insertedIds.push(ins.newId);
      }
    } else if (tag === 'path' && attrs.d) {
      const { pts, closed } = parseSimpleSvgPathToPoints(attrs.d);
      if (pts.length >= 2) {
        const mapped = pts.map((p) => ({ x: mapX(p.x), y: mapY(p.y) }));
        const isSimpleSegment = !closed && mapped.length === 2;
        const ins = isSimpleSegment
          ? insertOwnedPrimitiveIntoSource(cur, 'line', {
              ...baseStyle,
              start_x: fmtCm(mapped[0].x),
              start_y: fmtCm(mapped[0].y),
              end_x: fmtCm(mapped[1].x),
              end_y: fmtCm(mapped[1].y),
            })
          : insertOwnedPrimitiveIntoSource(cur, 'line', {
              ...baseStyle,
              start_x: fmtCm(mapped[0].x),
              start_y: fmtCm(mapped[0].y),
              end_x: fmtCm(mapped[mapped.length - 1].x),
              end_y: fmtCm(mapped[mapped.length - 1].y),
              poly_points: serializePtsCm(mapped),
              ...(closed ? { poly_closed: 'cycle' } : {}),
              fill_color: closed && hasFill ? 'slate!12' : 'none',
            });
        cur = ins.nextSource;
        insertedIds.push(ins.newId);
      }
    }
  }

  return {
    nextSource: cur,
    insertedIds,
    summaryRu:
      insertedIds.length > 0
        ? `Импортировано из SVG: ${insertedIds.length} векторных примитивов n1 (ширина ${targetWidthCm.toFixed(1)} см).`
        : 'В SVG не найдено базовых примитивов <line>, <rect>, <circle>, <polyline>, <polygon> или <path>.',
  };
}

export const DEMO_OPTICS_BENCH_SVG = `<svg viewBox="0 0 240 110" xmlns="http://www.w3.org/2000/svg">
  <line x1="12" y1="55" x2="228" y2="55" stroke="#0f172a" stroke-dasharray="4 3" />
  <rect x="24" y="37" width="34" height="36" rx="3" fill="#e2e8f0" stroke="#0f172a" />
  <polygon points="105,20 125,55 105,90" fill="#e0f2fe" stroke="#0284c7" />
  <circle cx="188" cy="55" r="18" fill="#dbeafe" stroke="#1e40af" />
  <polyline points="58,45 112,45 188,55" fill="none" stroke="#dc2626" />
</svg>`;

/**
 * P79: Academic booktabs + siunitx Table Builder from CSV/TSV with aligned `&` columns.
 */
export function buildBooktabsTableLatex(
  rawCsvOrTsv: string,
  options: {
    captionRu?: string;
    label?: string;
    useSiunitxSColumn?: boolean;
    wrapInTableEnv?: boolean;
  } = {}
): { latexBlock: string; rowCount: number; colCount: number } {
  const captionRu = options.captionRu ?? 'Экспериментальные параметры установки';
  const label = options.label ?? 'tab:measurements';
  const useSiunitx = options.useSiunitxSColumn ?? true;
  const wrapInTableEnv = options.wrapInTableEnv ?? true;

  const nonEmptyLines = rawCsvOrTsv
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  if (nonEmptyLines.length === 0) {
    return { latexBlock: '', rowCount: 0, colCount: 0 };
  }

  const delimiter = nonEmptyLines[0].includes('\t')
    ? '\t'
    : nonEmptyLines[0].includes(';')
      ? ';'
      : ',';

  const grid = nonEmptyLines.map((row) => row.split(delimiter).map((cell) => cell.trim()));
  const colCount = Math.max(...grid.map((r) => r.length));
  const normalizedGrid = grid.map((r) => {
    const copy = [...r];
    while (copy.length < colCount) copy.push('');
    return copy;
  });

  const dataRows = normalizedGrid.slice(1);
  const colSpecs: string[] = [];
  for (let c = 0; c < colCount; c++) {
    const numericColumn =
      useSiunitx &&
      dataRows.length > 0 &&
      dataRows.every((r) => r[c] === '' || /^-?\d+(?:[.,]\d+)?(?:e[-+]?\d+)?$/i.test(r[c]));
    colSpecs.push(numericColumn ? 'S' : c === 0 ? 'l' : 'c');
  }

  // Wrap header cells in {...} for siunitx `S` columns so text headers don't break `S` parsing
  const formattedRows = normalizedGrid.map((row, rIdx) =>
    row.map((cell, cIdx) => {
      if (rIdx === 0 && colSpecs[cIdx] === 'S') {
        return `{${cell}}`;
      }
      if (colSpecs[cIdx] === 'S') {
        return cell.replace(',', '.');
      }
      return cell;
    })
  );

  const colWidths = new Array<number>(colCount).fill(0);
  for (const row of formattedRows) {
    row.forEach((cell, cIdx) => {
      colWidths[cIdx] = Math.max(colWidths[cIdx], cell.length);
    });
  }

  const renderRow = (row: string[], indent: string) =>
    `${indent}${row
      .map((c, idx) => (idx < colCount - 1 ? c.padEnd(colWidths[idx], ' ') : c))
      .join(' & ')} \\\\`;

  const innerIndent = wrapInTableEnv ? '  ' : '';
  const cellIndent = wrapInTableEnv ? '    ' : '  ';
  const lines: string[] = [];

  if (wrapInTableEnv) {
    lines.push('\\begin{table}[htbp]');
    lines.push('  \\centering');
    lines.push(`  \\caption{${captionRu}}`);
    lines.push(`  \\label{${label}}`);
  }
  lines.push(`${innerIndent}\\begin{tabular}{@{}${colSpecs.join('') }@{}}`);
  lines.push(`${cellIndent}\\toprule`);
  lines.push(renderRow(formattedRows[0], cellIndent));
  if (formattedRows.length > 1) {
    lines.push(`${cellIndent}\\midrule`);
    for (let r = 1; r < formattedRows.length; r++) {
      lines.push(renderRow(formattedRows[r], cellIndent));
    }
  }
  lines.push(`${cellIndent}\\bottomrule`);
  lines.push(`${innerIndent}\\end{tabular}`);
  if (wrapInTableEnv) {
    lines.push('\\end{table}');
  }

  return {
    latexBlock: lines.join('\n'),
    rowCount: formattedRows.length,
    colCount,
  };
}

/**
 * Inserts a generated booktabs table into a .tex document (ensuring \usepackage{booktabs} and \usepackage{siunitx}).
 */
export function insertBooktabsTableIntoDocument(
  source: string,
  latexBlock: string,
  needsSiunitx: boolean
): string {
  const eol = source.includes('\r\n') ? '\r\n' : '\n';
  let cur = source;

  const ensurePkg = (pkg: string) => {
    const re = new RegExp(`\\\\usepackage(?:\\[[^\\]]*\\])?\\{[^}]*\\b${pkg}\\b[^}]*\\}`);
    if (!re.test(cur)) {
      const beginDocIdx = cur.indexOf('\\begin{document}');
      if (beginDocIdx !== -1) {
        cur = cur.slice(0, beginDocIdx) + `\\usepackage{${pkg}}` + eol + cur.slice(beginDocIdx);
      }
    }
  };

  ensurePkg('booktabs');
  if (needsSiunitx) ensurePkg('siunitx');

  const endDocIdx = cur.lastIndexOf('\\end{document}');
  const normalizedTable = latexBlock.replace(/\r?\n/g, eol);
  if (endDocIdx !== -1) {
    return (
      cur.slice(0, endDocIdx) +
      eol +
      normalizedTable +
      eol +
      cur.slice(endDocIdx)
    );
  }
  return cur + eol + normalizedTable + eol;
}

/**
 * P80: Self-Contained Single-File Archive Builder (\begin{filecontents*}{...} + P66 Auto-Format + optional clean n1 strip).
 */
export function buildSelfContainedTexBundle(
  source: string,
  options: {
    stripN1Metadata?: boolean;
    formatCode?: boolean;
    indentSpaces?: 2 | 4;
    embeddedFiles?: Array<{ filename: string; content: string }>;
  } = {}
): { bundledSource: string; embeddedCount: number; strippedOwnedCount: number } {
  const stripN1Metadata = options.stripN1Metadata ?? true;
  const formatCode = options.formatCode ?? true;
  const indentSpaces = options.indentSpaces ?? 2;
  const embeddedFiles = options.embeddedFiles ?? [];

  const eol = source.includes('\r\n') ? '\r\n' : '\n';
  let cur = source;

  // 1. Prepend \begin{filecontents*}[overwrite]{...} blocks right before \documentclass
  let embeddedCount = 0;
  if (embeddedFiles.length > 0) {
    const blocks: string[] = [];
    for (const file of embeddedFiles) {
      const safeName = file.filename.trim() || 'data.csv';
      if (cur.includes(`{${safeName}}`) && cur.includes('filecontents')) continue;
      blocks.push(
        [
          `\\begin{filecontents*}[overwrite]{${safeName}}`,
          file.content.replace(/\r?\n/g, eol).trimEnd(),
          '\\end{filecontents*}',
        ].join(eol)
      );
      embeddedCount++;
    }
    if (blocks.length > 0) {
      cur = blocks.join(eol) + eol + eol + cur;
    }
  }

  // 2. Run AST-safe P66 formatter prior to optional n1 strip
  if (formatCode) {
    cur = formatTikzDocumentSource(cur, { indentSpaces }).nextSource;
  }

  // 3. Optionally strip % tikzarium:n1:<hex> comments for clean journal / co-author handoff
  let strippedOwnedCount = 0;
  if (stripN1Metadata) {
    const lines = cur.split(/\r?\n/);
    const cleanLines = lines.map((line) => {
      const idx = line.indexOf(OWNERSHIP_MARKER);
      if (idx === -1) return line;
      strippedOwnedCount++;
      return line.slice(0, idx).trimEnd();
    });
    cur = cleanLines.join(eol);
  }

  return {
    bundledSource: cur,
    embeddedCount,
    strippedOwnedCount,
  };
}
