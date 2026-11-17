import { PRIMITIVE_TOOLS, TIKZ_LIBRARIES, EXTENSION_MANIFESTS } from './catalog';
import type { SpecimenDocument, ToolId } from './catalog';

export const OWNERSHIP_MARKER = ' % tikzarium:n1:';

export type TokenKind =
  | 'plain'
  | 'command'
  | 'comment'
  | 'metadata'
  | 'option'
  | 'number'
  | 'delimiter'
  | 'math'
  | 'operator'
  | 'environment';

export interface LexSpan {
  start: number;
  end: number;
  kind: TokenKind;
  text: string;
}

export interface OwnershipPayload {
  schema: number;
  id: number;
  tool: ToolId;
  draft: {
    values: Record<string, string>;
  };
}

export interface OwnedPrimitive {
  id: number;
  tool: ToolId;
  values: Record<string, string>;
  lineNumber: number; // 1-based physical line
  lineStartOffset: number;
  lineEndOffset: number; // excludes \r\n or \n
  commandPart: string;
  metadataPart: string;
}

export interface ValidationResult {
  valid: boolean;
  reasonRu?: string;
}

export interface PreambleInspection {
  hasBeginDocument: boolean;
  beginDocumentOffset: number;
  lineEnding: '\r\n' | '\n';
  packages: { name: string; lineNumber: number; hasInlineComment: boolean }[];
  tikzLibraries: { name: string; lineNumber: number; hasInlineComment: boolean; sharedWith: string[] }[];
}

export interface SourcePatchPreview {
  ok: boolean;
  action: 'connect' | 'disconnect';
  libraryName: string;
  reasonRu?: string;
  beforeLine: string;
  afterLine: string;
  nextSource: string;
}

export type QuickFixKind =
  | 'connect-arrows-meta'
  | 'connect-patterns'
  | 'connect-decorations'
  | 'fix-undef-draw'
  | 'append-semicolon'
  | 'close-math-dollar'
  | 'add-fontspec-cyrillic'
  | 'fix-italic-unit'
  | `connect-ext-pkg:${string}`;

export interface TexDiagnostic {
  severity: 'error' | 'warning';
  lineNumber: number;
  code: string;
  messageRu: string;
  hintRu: string;
  quickFixId?: QuickFixKind;
  quickFixLabelRu?: string;
}

export function utf8ByteLength(text: string): number {
  return new TextEncoder().encode(text).byteLength;
}

export function computeHexDigest(text: string): string {
  // Deterministic 64-bit FNV-1a dual-lane hash rendered as 16-hex-char fingerprint for synchronous UI updates
  const bytes = new TextEncoder().encode(text);
  let h1 = 0x811c9dc5 >>> 0;
  let h2 = 0x9e3779b9 >>> 0;
  for (let i = 0; i < bytes.length; i++) {
    h1 ^= bytes[i];
    h1 = Math.imul(h1, 0x01000193) >>> 0;
    h2 ^= bytes[i] ^ (i & 0xff);
    h2 = Math.imul(h2, 0x85ebca6b) >>> 0;
  }
  return h1.toString(16).padStart(8, '0') + h2.toString(16).padStart(8, '0');
}

export function encodeOwnershipHex(payload: OwnershipPayload): string {
  const json = JSON.stringify(payload);
  const bytes = new TextEncoder().encode(json);
  let hex = '';
  for (let i = 0; i < bytes.length; i++) {
    hex += bytes[i].toString(16).padStart(2, '0');
  }
  return hex;
}

export function decodeOwnershipHex(hex: string): OwnershipPayload | null {
  if (!hex || hex.length > 24000 || hex.length % 2 !== 0 || !/^[0-9a-fA-F]+$/.test(hex)) {
    return null;
  }
  try {
    const bytes = new Uint8Array(hex.length / 2);
    for (let i = 0; i < hex.length; i += 2) {
      bytes[i / 2] = parseInt(hex.slice(i, i + 2), 16);
    }
    const text = new TextDecoder('utf-8', { fatal: true }).decode(bytes);
    const parsed = JSON.parse(text) as OwnershipPayload;
    if (
      parsed &&
      parsed.schema === 1 &&
      typeof parsed.id === 'number' &&
      typeof parsed.tool === 'string' &&
      parsed.draft &&
      typeof parsed.draft.values === 'object'
    ) {
      return parsed;
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Source-safe TeX/TikZ tokenizer mirroring crates/tikzarium-app/src/source_highlight.rs.
 * Never mutates characters, line endings, escaped %, or unknown macros.
 */
export function tokenizeTexLine(line: string): LexSpan[] {
  const spans: LexSpan[] = [];
  const push = (start: number, end: number, kind: TokenKind) => {
    if (start >= end) return;
    const text = line.slice(start, end);
    const last = spans[spans.length - 1];
    if (last && last.kind === kind && last.end === start) {
      last.end = end;
      last.text += text;
    } else {
      spans.push({ start, end, kind, text });
    }
  };

  let i = 0;
  let bracketDepth = 0;
  let inMath = false;

  while (i < line.length) {
    // Check unescaped % comment or % tikzarium:n1: ownership metadata
    if (line[i] === '%') {
      let backslashes = 0;
      let k = i - 1;
      while (k >= 0 && line[k] === '\\') {
        backslashes++;
        k--;
      }
      if (backslashes % 2 === 0) {
        const isMeta =
          line.slice(i).startsWith('% tikzarium:n1:') ||
          (i > 0 && line[i - 1] === ' ' && line.slice(i - 1).startsWith(OWNERSHIP_MARKER));
        push(i, line.length, isMeta ? 'metadata' : 'comment');
        break;
      }
    }

    // Check space + % tikzarium:n1: so the leading marker space dims cleanly too
    if (line[i] === ' ' && line.slice(i).startsWith(OWNERSHIP_MARKER)) {
      let backslashes = 0;
      let k = i - 1;
      while (k >= 0 && line[k] === '\\') {
        backslashes++;
        k--;
      }
      if (backslashes % 2 === 0) {
        push(i, line.length, 'metadata');
        break;
      }
    }

    const ch = line[i];

    // Math toggle $
    if (ch === '$') {
      if (line[i + 1] === '$') {
        push(i, i + 2, 'math');
        inMath = !inMath;
        i += 2;
        continue;
      }
      push(i, i + 1, 'math');
      inMath = !inMath;
      i++;
      continue;
    }

    if (inMath) {
      push(i, i + 1, 'math');
      i++;
      continue;
    }

    // Control sequence \command or \begin{env}
    if (ch === '\\') {
      if (i + 1 >= line.length) {
        push(i, i + 1, 'command');
        i++;
        continue;
      }
      const next = line[i + 1];
      if (!/[a-zA-Z@]/.test(next)) {
        push(i, i + 2, 'command');
        i += 2;
        continue;
      }
      let end = i + 1;
      while (end < line.length && /[a-zA-Z@]/.test(line[end])) {
        end++;
      }
      if (line[end] === '*') end++;
      const cmdName = line.slice(i, end);

      // Handle \verb|...| safely without interpreting inner %
      if (cmdName === '\\verb' && end < line.length && line[end] !== ' ') {
        const delim = line[end];
        const closeIdx = line.indexOf(delim, end + 1);
        const verbEnd = closeIdx === -1 ? line.length : closeIdx + 1;
        push(i, verbEnd, 'plain');
        i = verbEnd;
        continue;
      }

      push(i, end, 'command');
      i = end;

      if ((cmdName === '\\begin' || cmdName === '\\end') && line[i] === '{') {
        const closeBrace = line.indexOf('}', i + 1);
        if (closeBrace !== -1) {
          push(i, i + 1, 'delimiter');
          push(i + 1, closeBrace, 'environment');
          push(closeBrace, closeBrace + 1, 'delimiter');
          i = closeBrace + 1;
        }
      }
      continue;
    }

    if (ch === '[') {
      bracketDepth++;
      push(i, i + 1, 'delimiter');
      i++;
      continue;
    }
    if (ch === ']') {
      bracketDepth = Math.max(0, bracketDepth - 1);
      push(i, i + 1, 'delimiter');
      i++;
      continue;
    }
    if (ch === '{' || ch === '}' || ch === '(' || ch === ')') {
      push(i, i + 1, 'delimiter');
      i++;
      continue;
    }

    // TikZ path operators: --, .., |-, -|, ->, <->
    if (
      line.slice(i, i + 3) === '<->' ||
      line.slice(i, i + 2) === '--' ||
      line.slice(i, i + 2) === '..' ||
      line.slice(i, i + 2) === '|-' ||
      line.slice(i, i + 2) === '-|' ||
      line.slice(i, i + 2) === '->' ||
      line.slice(i, i + 2) === '<-'
    ) {
      const len = line.slice(i, i + 3) === '<->' ? 3 : 2;
      push(i, i + len, 'operator');
      i += len;
      continue;
    }

    // Numbers + literal dimensions (e.g., 2.40cm, -0.5pt, 12)
    if (
      /[0-9]/.test(ch) ||
      ((ch === '+' || ch === '-') && i + 1 < line.length && /[0-9]/.test(line[i + 1]))
    ) {
      let end = i + (ch === '+' || ch === '-' ? 1 : 0);
      while (end < line.length && /[0-9]/.test(line[end])) end++;
      if (line[end] === '.' && line[end + 1] !== '.') {
        end++;
        while (end < line.length && /[0-9]/.test(line[end])) end++;
      }
      while (end < line.length && /[a-zA-Z]/.test(line[end])) end++;
      push(i, end, 'number');
      i = end;
      continue;
    }

    push(i, i + 1, bracketDepth > 0 ? 'option' : 'plain');
    i++;
  }

  return spans;
}

export function tokenizeTexSource(source: string): LexSpan[] {
  // Tokenizes full buffer preserving exact `\r\n` and `\n` characters
  const out: LexSpan[] = [];
  let offset = 0;
  while (offset < source.length) {
    const nlIdx = source.indexOf('\n', offset);
    const lineEnd = nlIdx === -1 ? source.length : nlIdx;
    const hasCr = lineEnd > offset && source[lineEnd - 1] === '\r';
    const contentEnd = hasCr ? lineEnd - 1 : lineEnd;
    const lineContent = source.slice(offset, contentEnd);
    const lineSpans = tokenizeTexLine(lineContent);
    for (const sp of lineSpans) {
      out.push({
        start: offset + sp.start,
        end: offset + sp.end,
        kind: sp.kind,
        text: sp.text,
      });
    }
    if (nlIdx !== -1) {
      const termStart = contentEnd;
      const termEnd = nlIdx + 1;
      out.push({
        start: termStart,
        end: termEnd,
        kind: 'plain',
        text: source.slice(termStart, termEnd),
      });
      offset = termEnd;
    } else {
      break;
    }
  }
  return out;
}

/**
 * Strict literal validation matching extensions/primitives/fixtures/negative-cases.toml
 */
export function validateParameterLiteral(toolId: ToolId, paramId: string, rawValue: string): ValidationResult {
  const tool = PRIMITIVE_TOOLS.find((t) => t.id === toolId);
  if (!tool) return { valid: false, reasonRu: `Неизвестный инструмент: ${toolId}` };
  const param = tool.parameters.find((p) => p.id === paramId);
  if (!param) return { valid: false, reasonRu: `Неизвестный параметр: ${paramId}` };

  if (/[\r\n]/.test(rawValue)) {
    return { valid: false, reasonRu: 'Переводы строк внутри параметра запрещены.' };
  }

  if (param.kind === 'dimension') {
    if (/[\\{}\[\]%$]/.test(rawValue)) {
      return { valid: false, reasonRu: 'Инъекция команд или скобок TeX в размерности запрещена.' };
    }
    if (/[eE]/.test(rawValue.replace(/(pt|mm|cm|in)$/, ''))) {
      return { valid: false, reasonRu: 'Экспоненциальная запись (1e9cm) не поддерживается в буквальных длинах.' };
    }
    const match = /^([+-]?\d+(?:\.\d+)?)(pt|mm|cm|in)$/.exec(rawValue.trim());
    if (!match) {
      return {
        valid: false,
        reasonRu: `Укажите число и единицу измерения (${param.units.join(', ')}), например ${param.defaultValue}.`,
      };
    }
    const numeric = Number(match[1]);
    if (!Number.isFinite(numeric) || Math.abs(numeric) > param.maxAbs) {
      return { valid: false, reasonRu: `Значение выходит за допустимый предел ±${param.maxAbs}.` };
    }
    if (param.positive && numeric <= 0) {
      return { valid: false, reasonRu: 'Параметр обязан быть строго больше нуля (0cm недопустимо).' };
    }
    return { valid: true };
  }

  if (param.kind === 'choice') {
    if (!param.allowedValues.includes(rawValue)) {
      return {
        valid: false,
        reasonRu: `Допустимые значения: ${param.allowedValues.join(', ')}.`,
      };
    }
    return { valid: true };
  }

  // kind === 'text' (node content)
  if (!rawValue.trim()) {
    return { valid: false, reasonRu: 'Содержимое узла не может быть пустым.' };
  }
  if (rawValue.includes('%')) {
    return { valid: false, reasonRu: 'Неэкранированный символ % в узле разорвёт команду TikZ.' };
  }
  // Check balanced braces
  let depth = 0;
  for (let i = 0; i < rawValue.length; i++) {
    if (rawValue[i] === '{' && rawValue[i - 1] !== '\\') depth++;
    if (rawValue[i] === '}' && rawValue[i - 1] !== '\\') depth--;
    if (depth < 0) {
      return { valid: false, reasonRu: 'Несбалансированная закрывающая скобка } в тексте узла.' };
    }
  }
  if (depth !== 0) {
    return { valid: false, reasonRu: 'Несбалансированные фигурные скобки { } в тексте узла.' };
  }
  return { valid: true };
}

export const ALLOWED_STROKE_WIDTHS = ['', 'thin', 'semithick', 'thick', 'very thick'] as const;
export const ALLOWED_LINE_STYLES = ['', 'solid', 'dashed', 'dotted'] as const;
export const ALLOWED_STROKE_COLORS = [
  '',
  'black',
  'blue!75!black',
  'red!75!black',
  'teal!80!black',
  'orange!85!black',
  'violet!80!black',
  'oiBlue',
  'oiVermilion',
  'oiBluishGreen',
  'oiOrange',
  'oiPurple',
  'oiSkyBlue',
] as const;
export const ALLOWED_FILL_COLORS = [
  '',
  'none',
  'cyan!10',
  'blue!8',
  'emerald!10',
  'amber!14',
  'rose!10',
  'slate!12',
  'oiBlue!12',
  'oiVermilion!12',
  'oiBluishGreen!12',
  'oiOrange!14',
] as const;
export const ALLOWED_NODE_ANCHORS = [
  '',
  'center',
  'above',
  'below',
  'left',
  'right',
  'above right',
  'above left',
  'below right',
  'below left',
] as const;
export const ALLOWED_ROUTING_MODES = ['', '--', '|-', '-|'] as const;
export const ALLOWED_COORD_MODES = ['', 'cartesian', 'relative', 'polar'] as const;
export const ALLOWED_HATCH_PATTERNS = [
  '',
  'north east lines',
  'north west lines',
  'crosshatch',
  'dots',
  'horizontal lines',
] as const;
export const ALLOWED_DECORATION_KINDS = [
  '',
  'brace',
  'brace-mirror',
  'snake',
  'zigzag',
  'coil',
] as const;
export const ALLOWED_LAYER_IDS = ['', 'bg', 'main', 'annotations'] as const;
export const ALLOWED_BEAMER_SPECS = ['', '1-', '2-', '3-', '4-', '1-2', '2-3', '3-4'] as const;

const SAFE_NODE_ID_RE = /^[A-Za-z][A-Za-z0-9_-]{0,23}$/;
const SAFE_CALLOUT_LABEL_RE = /^[^%\r\n]{0,64}$/;
const SAFE_GROUP_ID_RE = /^[A-Za-z0-9_-]{1,24}$/;
const SAFE_CUSTOM_STYLE_RE = /^[A-Za-z][A-Za-z0-9_-]{0,24}$/;

export function parsePolyPointsList(raw: string | undefined): { xCm: number; yCm: number }[] {
  if (!raw || !raw.trim()) return [];
  const pairs = raw
    .split(';')
    .map((s) => s.trim())
    .filter(Boolean);
  const out: { xCm: number; yCm: number }[] = [];
  for (const pair of pairs) {
    const parts = pair.split(',').map((s) => s.trim());
    if (parts.length !== 2) return [];
    const xCm = parseDimensionToCm(parts[0]);
    const yCm = parseDimensionToCm(parts[1]);
    if (xCm === null || yCm === null) return [];
    out.push({ xCm, yCm });
  }
  return out;
}

export function serializePolyPointsList(pts: { xCm: number; yCm: number }[]): string {
  return pts.map((p) => `${p.xCm.toFixed(2)}cm,${p.yCm.toFixed(2)}cm`).join(';');
}

export function validateToolDraft(toolId: ToolId, values: Record<string, string>): Record<string, string> {
  const errors: Record<string, string> = {};
  const tool = PRIMITIVE_TOOLS.find((t) => t.id === toolId);
  if (!tool) return { _tool: 'Неизвестный инструмент' };
  for (const param of tool.parameters) {
    const val = values[param.id] ?? '';
    const check = validateParameterLiteral(toolId, param.id, val);
    if (!check.valid && check.reasonRu) {
      errors[param.id] = check.reasonRu;
    }
  }

  // Validate optional P07/P08/P09/P21–P47 style, polygon, hatch, decoration, layer & Beamer fields
  if (values.stroke_width && !(ALLOWED_STROKE_WIDTHS as readonly string[]).includes(values.stroke_width)) {
    errors.stroke_width = 'Недопустимая толщина штриха TikZ.';
  }
  if (values.line_style && !(ALLOWED_LINE_STYLES as readonly string[]).includes(values.line_style)) {
    errors.line_style = 'Недопустимый стиль линии TikZ.';
  }
  if (values.stroke_color && !(ALLOWED_STROKE_COLORS as readonly string[]).includes(values.stroke_color)) {
    errors.stroke_color = 'Недопустимый цвет контура TikZ.';
  }
  if (values.fill_color && !(ALLOWED_FILL_COLORS as readonly string[]).includes(values.fill_color)) {
    errors.fill_color = 'Недопустимый цвет заливки TikZ.';
  }
  if (values.anchor && !(ALLOWED_NODE_ANCHORS as readonly string[]).includes(values.anchor)) {
    errors.anchor = 'Недопустимый якорь узла TikZ.';
  }
  if (values.node_id && !SAFE_NODE_ID_RE.test(values.node_id)) {
    errors.node_id = 'Имя узла: латиница, цифры, _ или - (начиная с буквы).';
  }
  if (values.from_node && !SAFE_NODE_ID_RE.test(values.from_node)) {
    errors.from_node = 'Некорректное имя начального узла.';
  }
  if (values.to_node && !SAFE_NODE_ID_RE.test(values.to_node)) {
    errors.to_node = 'Некорректное имя конечного узла.';
  }
  if (values.routing && !(ALLOWED_ROUTING_MODES as readonly string[]).includes(values.routing)) {
    errors.routing = 'Недопустимый режим трассировки.';
  }
  if (values.coord_mode && !(ALLOWED_COORD_MODES as readonly string[]).includes(values.coord_mode)) {
    errors.coord_mode = 'Недопустимая система записи координат.';
  }
  if (values.rounded_corners && !/^\d+(?:\.\d+)?(pt|mm|cm)$/.test(values.rounded_corners)) {
    errors.rounded_corners = 'Радиус скругления требует единицу pt/mm/cm.';
  }
  if (values.rotate_deg && !/^[+-]?\d+(?:\.\d+)?$/.test(values.rotate_deg)) {
    errors.rotate_deg = 'Угол поворота должен быть числом в градусах.';
  }
  if (values.callout && values.callout !== 'dim') {
    errors.callout = 'Недопустимый тип размерной выноски.';
  }
  if (values.callout_label && !SAFE_CALLOUT_LABEL_RE.test(values.callout_label)) {
    errors.callout_label = 'Недопустимые символы в подписи выноски.';
  }
  if (values.poly_points) {
    const parsed = parsePolyPointsList(values.poly_points);
    if (parsed.length < 2) {
      errors.poly_points = 'Контур должен содержать минимум 2 вершины (x,y).';
    }
  }
  if (values.poly_closed && values.poly_closed !== 'cycle') {
    errors.poly_closed = 'Допустимое замыкание контура: cycle.';
  }
  if (values.hatch_pattern && !(ALLOWED_HATCH_PATTERNS as readonly string[]).includes(values.hatch_pattern)) {
    errors.hatch_pattern = 'Недопустимый тип штриховки ГОСТ / PGF patterns.';
  }
  if (
    values.decoration_kind &&
    !(ALLOWED_DECORATION_KINDS as readonly string[]).includes(values.decoration_kind)
  ) {
    errors.decoration_kind = 'Недопустимый тип декорации пути TikZ.';
  }
  if (values.decoration_label && !SAFE_CALLOUT_LABEL_RE.test(values.decoration_label)) {
    errors.decoration_label = 'Недопустимые символы в подписи фигурной скобки.';
  }
  if (values.layer_id && !(ALLOWED_LAYER_IDS as readonly string[]).includes(values.layer_id)) {
    errors.layer_id = 'Недопустимый идентификатор слоя.';
  }
  if (values.beamer_spec && !(ALLOWED_BEAMER_SPECS as readonly string[]).includes(values.beamer_spec)) {
    errors.beamer_spec = 'Недопустимая спецификация слайда Beamer.';
  }
  if (values.group_id && !SAFE_GROUP_ID_RE.test(values.group_id)) {
    errors.group_id = 'Некорректный идентификатор группы объектов.';
  }
  if (values.custom_style && !SAFE_CUSTOM_STYLE_RE.test(values.custom_style)) {
    errors.custom_style = 'Имя пользовательского стиля \\tikzset должно быть латинским идентификатором.';
  }
  return errors;
}

function formatSecondEndpoint(values: Record<string, string>): string {
  if (values.to_node) return `(${values.to_node})`;
  const mode = values.coord_mode || 'cartesian';
  if (mode === 'cartesian' || values.from_node) {
    return `(${values.end_x},${values.end_y})`;
  }
  const sx = parseDimensionToCm(values.start_x) ?? 0;
  const sy = parseDimensionToCm(values.start_y) ?? 0;
  const ex = parseDimensionToCm(values.end_x) ?? 0;
  const ey = parseDimensionToCm(values.end_y) ?? 0;
  const dx = ex - sx;
  const dy = ey - sy;
  if (mode === 'relative') {
    return `++(${dx.toFixed(2)}cm,${dy.toFixed(2)}cm)`;
  }
  // polar relative +(angle:radius)
  const r = Math.hypot(dx, dy);
  let deg = (Math.atan2(dy, dx) * 180) / Math.PI;
  if (deg < 0) deg += 360;
  return `+(${deg.toFixed(1)}:${r.toFixed(2)}cm)`;
}

function buildDecorationOptionStrings(values: Record<string, string>): string[] {
  switch (values.decoration_kind) {
    case 'brace':
      return ['decorate', 'decoration={brace,amplitude=5pt}'];
    case 'brace-mirror':
      return ['decorate', 'decoration={brace,mirror,amplitude=5pt}'];
    case 'snake':
      return ['decorate', 'decoration={snake,amplitude=2pt,segment length=7pt}'];
    case 'zigzag':
      return ['decorate', 'decoration={zigzag,amplitude=2.2pt,segment length=6pt}'];
    case 'coil':
      return ['decorate', 'decoration={coil,aspect=0.45,amplitude=2.8pt,segment length=6pt}'];
    default:
      return [];
  }
}

function buildDrawOptionsBracket(baseOpts: string[], values: Record<string, string>, allowFill: boolean): string {
  const opts = [...baseOpts];
  if (values.custom_style) opts.push(values.custom_style);
  if (values.stroke_width) opts.push(values.stroke_width);
  if (values.line_style && values.line_style !== 'solid') opts.push(values.line_style);
  if (values.rounded_corners) opts.push(`rounded corners=${values.rounded_corners}`);
  if (values.rotate_deg && Number(values.rotate_deg) !== 0) opts.push(`rotate=${values.rotate_deg}`);
  if (values.stroke_color && values.stroke_color !== 'black') opts.push(`draw=${values.stroke_color}`);
  if (allowFill && values.hatch_pattern) {
    opts.push(`pattern=${values.hatch_pattern}`);
    if (values.stroke_color && values.stroke_color !== 'black') {
      opts.push(`pattern color=${values.stroke_color}`);
    } else {
      opts.push('pattern color=black!65');
    }
  } else if (allowFill && values.fill_color && values.fill_color !== 'none') {
    const tikzFill = values.fill_color
      .replace(/^emerald!/, 'green!70!black!')
      .replace(/^rose!/, 'red!80!black!')
      .replace(/^amber!/, 'orange!85!yellow!')
      .replace(/^slate!/, 'black!');
    opts.push(`fill=${tikzFill}`);
  }
  opts.push(...buildDecorationOptionStrings(values));
  return opts.length > 0 ? `[${opts.join(',')}]` : '';
}

export function generateTikzCommand(toolId: ToolId, values: Record<string, string>): string {
  const errs = validateToolDraft(toolId, values);
  const firstErr = Object.values(errs)[0];
  if (firstErr) {
    throw new Error(firstErr);
  }
  const beamerPrefix = values.beamer_spec ? `\\onslide<${values.beamer_spec}>` : '';

  switch (toolId) {
    case 'line': {
      // P36: Multi-vertex polyline or closed polygon (-- cycle)
      if (values.poly_points) {
        const pts = parsePolyPointsList(values.poly_points);
        const isClosed = values.poly_closed === 'cycle';
        const optStr = buildDrawOptionsBracket([], values, isClosed);
        const chain = pts.map((p) => `(${p.xCm.toFixed(2)}cm,${p.yCm.toFixed(2)}cm)`).join(' -- ');
        const tail = isClosed ? ' -- cycle' : '';
        return `${beamerPrefix}\\draw${optStr} ${chain}${tail};`;
      }
      const baseOpts = values.callout === 'dim' ? ['|<->|'] : [];
      const optStr = buildDrawOptionsBracket(baseOpts, values, false);
      const startRef = values.from_node ? `(${values.from_node})` : `(${values.start_x},${values.start_y})`;
      const endRef = formatSecondEndpoint(values);
      const conn = values.routing && values.routing !== '--' ? values.routing : '--';
      if (
        (values.decoration_kind === 'brace' || values.decoration_kind === 'brace-mirror') &&
        values.decoration_label?.trim()
      ) {
        const posOpt = values.decoration_kind === 'brace-mirror' ? 'below=6pt' : 'above=6pt';
        return `${beamerPrefix}\\draw${optStr} ${startRef} -- node[midway,${posOpt},font=\\scriptsize] {$${values.decoration_label.trim()}$} ${endRef};`;
      }
      if (values.callout === 'dim') {
        const sx = parseDimensionToCm(values.start_x) ?? 0;
        const sy = parseDimensionToCm(values.start_y) ?? 0;
        const ex = parseDimensionToCm(values.end_x) ?? 0;
        const ey = parseDimensionToCm(values.end_y) ?? 0;
        const lenCm = Math.hypot(ex - sx, ey - sy).toFixed(2);
        const lbl = values.callout_label?.trim() || `${lenCm}\\,\\text{см}`;
        return `${beamerPrefix}\\draw${optStr} ${startRef} ${conn} node[above,sloped,font=\\scriptsize] {$${lbl}$} ${endRef};`;
      }
      return `${beamerPrefix}\\draw${optStr} ${startRef} ${conn} ${endRef};`;
    }
    case 'arrow': {
      const arrowSpec = values.callout === 'dim' ? `{Bar[]}-{Bar[]},<->` : `-{${values.tip}}`;
      const optStr = buildDrawOptionsBracket([arrowSpec], values, false);
      const startRef = values.from_node ? `(${values.from_node})` : `(${values.start_x},${values.start_y})`;
      const endRef = formatSecondEndpoint(values);
      const conn = values.routing && values.routing !== '--' ? values.routing : '--';
      if (values.callout === 'dim') {
        const sx = parseDimensionToCm(values.start_x) ?? 0;
        const sy = parseDimensionToCm(values.start_y) ?? 0;
        const ex = parseDimensionToCm(values.end_x) ?? 0;
        const ey = parseDimensionToCm(values.end_y) ?? 0;
        const lenCm = Math.hypot(ex - sx, ey - sy).toFixed(2);
        const lbl = values.callout_label?.trim() || `${lenCm}\\,\\text{см}`;
        return `${beamerPrefix}\\draw${optStr} ${startRef} ${conn} node[above,sloped,font=\\scriptsize] {$${lbl}$} ${endRef};`;
      }
      return `${beamerPrefix}\\draw${optStr} ${startRef} ${conn} ${endRef};`;
    }
    case 'rectangle': {
      const optStr = buildDrawOptionsBracket([], values, true);
      return `${beamerPrefix}\\draw${optStr} (${values.start_x},${values.start_y}) rectangle (${values.end_x},${values.end_y});`;
    }
    case 'circle': {
      const optStr = buildDrawOptionsBracket([], values, true);
      return `${beamerPrefix}\\draw${optStr} (${values.center_x},${values.center_y}) circle [radius=${values.radius}];`;
    }
    case 'node': {
      const nodeOpts: string[] = [];
      if (values.custom_style) nodeOpts.push(values.custom_style);
      if (values.anchor && values.anchor !== 'center') nodeOpts.push(values.anchor);
      if (values.rotate_deg && Number(values.rotate_deg) !== 0) nodeOpts.push(`rotate=${values.rotate_deg}`);
      if (values.stroke_color && values.stroke_color !== 'black') nodeOpts.push(`text=${values.stroke_color}`);
      if (values.fill_color && values.fill_color !== 'none') {
        const tikzFill = values.fill_color
          .replace(/^emerald!/, 'green!70!black!')
          .replace(/^rose!/, 'red!80!black!')
          .replace(/^amber!/, 'orange!85!yellow!')
          .replace(/^slate!/, 'black!');
        nodeOpts.push('draw', 'rounded corners=2pt', `fill=${tikzFill}`);
      }
      const optStr = nodeOpts.length > 0 ? `[${nodeOpts.join(',')}]` : '';
      const idStr = values.node_id ? ` (${values.node_id})` : '';
      const body = values.mode === 'math' ? `$${values.content}$` : values.content;
      return `${beamerPrefix}\\node${optStr}${idStr} at (${values.x},${values.y}) {${body}};`;
    }
    case 'cubic': {
      const optStr = buildDrawOptionsBracket([], values, false);
      return `${beamerPrefix}\\draw${optStr} (${values.start_x},${values.start_y}) .. controls (${values.control1_x},${values.control1_y}) and (${values.control2_x},${values.control2_y}) .. (${values.end_x},${values.end_y});`;
    }
  }
}

export function generateOwnedLine(id: number, toolId: ToolId, values: Record<string, string>, indent = '  '): string {
  const cmd = generateTikzCommand(toolId, values);
  const hex = encodeOwnershipHex({
    schema: 1,
    id,
    tool: toolId,
    draft: { values: { ...values } },
  });
  return `${indent}${cmd}${OWNERSHIP_MARKER}${hex}`;
}

export function parseOwnedPrimitives(source: string): OwnedPrimitive[] {
  const result: OwnedPrimitive[] = [];
  let offset = 0;
  let lineNum = 1;

  while (offset <= source.length) {
    const nlIdx = source.indexOf('\n', offset);
    const rawEnd = nlIdx === -1 ? source.length : nlIdx;
    const cleanEnd = rawEnd > offset && source[rawEnd - 1] === '\r' ? rawEnd - 1 : rawEnd;
    const line = source.slice(offset, cleanEnd);

    const markerIdx = line.indexOf(OWNERSHIP_MARKER);
    if (markerIdx !== -1) {
      // Ensure marker % is not escaped and not preceded by an earlier unescaped %
      const before = line.slice(0, markerIdx);
      let hasEarlierComment = false;
      for (let i = 0; i < before.length; i++) {
        if (before[i] === '%' && before[i - 1] !== '\\') {
          hasEarlierComment = true;
          break;
        }
      }
      if (!hasEarlierComment) {
        const hex = line.slice(markerIdx + OWNERSHIP_MARKER.length).trim();
        const payload = decodeOwnershipHex(hex);
        if (payload) {
          result.push({
            id: payload.id,
            tool: payload.tool,
            values: payload.draft.values,
            lineNumber: lineNum,
            lineStartOffset: offset,
            lineEndOffset: cleanEnd,
            commandPart: before,
            metadataPart: line.slice(markerIdx),
          });
        }
      }
    }

    if (nlIdx === -1) break;
    offset = nlIdx + 1;
    lineNum++;
  }

  return result;
}

export function measureMetadataShare(source: string): {
  ownedCount: number;
  codeChars: number;
  metadataChars: number;
  metadataPercent: number;
} {
  const owned = parseOwnedPrimitives(source);
  if (owned.length === 0) {
    return { ownedCount: 0, codeChars: 0, metadataChars: 0, metadataPercent: 0 };
  }
  let codeChars = 0;
  let metadataChars = 0;
  for (const item of owned) {
    codeChars += item.commandPart.length;
    metadataChars += item.metadataPart.length;
  }
  const total = codeChars + metadataChars;
  return {
    ownedCount: owned.length,
    codeChars,
    metadataChars,
    metadataPercent: total > 0 ? Math.round((metadataChars / total) * 1000) / 10 : 0,
  };
}

export function applyOwnedPrimitivePatch(
  source: string,
  primitiveId: number,
  nextValues: Record<string, string>
): string {
  const owned = parseOwnedPrimitives(source);
  const target = owned.find((item) => item.id === primitiveId);
  if (!target) {
    throw new Error(`Примитив #${primitiveId} не найден в исходнике (возможно, удалён вручную).`);
  }
  const leadingIndentMatch = /^(\s*)/.exec(target.commandPart);
  const indent = leadingIndentMatch ? leadingIndentMatch[1] : '  ';
  const replacementLine = generateOwnedLine(target.id, target.tool, nextValues, indent);
  return source.slice(0, target.lineStartOffset) + replacementLine + source.slice(target.lineEndOffset);
}

export function insertOwnedPrimitiveIntoSource(
  source: string,
  toolId: ToolId,
  values: Record<string, string>
): { nextSource: string; newId: number; insertedLine: number } {
  const existing = parseOwnedPrimitives(source);
  const newId = existing.reduce((max, item) => Math.max(max, item.id), 0) + 1;
  const eol = source.includes('\r\n') ? '\r\n' : '\n';
  const newLine = generateOwnedLine(newId, toolId, values, '  ');

  const endTikzIdx = source.lastIndexOf('\\end{tikzpicture}');
  if (endTikzIdx !== -1) {
    // Insert cleanly right before the line containing \end{tikzpicture}
    let lineStart = endTikzIdx;
    while (lineStart > 0 && source[lineStart - 1] !== '\n') {
      lineStart--;
    }
    const nextSource = source.slice(0, lineStart) + newLine + eol + source.slice(lineStart);
    const insertedLine = nextSource.slice(0, lineStart).split('\n').length;
    return { nextSource, newId, insertedLine };
  }

  const nextSource = source + (source.endsWith('\n') ? '' : eol) + newLine + eol;
  const insertedLine = nextSource.split('\n').length - 1;
  return { nextSource, newId, insertedLine };
}

export function parseDimensionToCm(raw: string | undefined): number | null {
  if (!raw) return null;
  const m = /^([+-]?\d+(?:\.\d+)?)(cm|mm|pt|in)$/.exec(raw.trim());
  if (!m) return null;
  const v = Number(m[1]);
  if (!Number.isFinite(v)) return null;
  switch (m[2]) {
    case 'cm':
      return v;
    case 'mm':
      return v / 10;
    case 'in':
      return v * 2.54;
    case 'pt':
      return (v * 2.54) / 72.27;
    default:
      return null;
  }
}

export function snapCoordinateCm(valueCm: number, gridStepCm: number): number {
  if (gridStepCm <= 0) return Math.round(valueCm * 100) / 100;
  return Math.round(valueCm / gridStepCm) * gridStepCm;
}

export interface GestureDraftPreview {
  tool: ToolId;
  values: Record<string, string>;
  effectiveEndCm: { x: number; y: number };
  metricsLabelRu: string;
  tikzCommand: string;
}

export function computeGestureDraftPreview(
  tool: ToolId,
  startCm: { x: number; y: number },
  currentCm: { x: number; y: number },
  options?: {
    constrainShift?: boolean;
    forCommit?: boolean;
    stageWidthCm?: number;
    stageHeightCm?: number;
  }
): GestureDraftPreview {
  const constrainShift = options?.constrainShift ?? false;
  const forCommit = options?.forCommit ?? false;
  const stageW = options?.stageWidthCm ?? 6.2;
  const stageH = options?.stageHeightCm ?? 3.8;

  let endX = currentCm.x;
  let endY = currentCm.y;
  const rawDx = endX - startCm.x;
  const rawDy = endY - startCm.y;

  if (forCommit && tool !== 'node' && Math.abs(rawDx) < 0.1 && Math.abs(rawDy) < 0.1) {
    endX = Math.min(stageW - 0.3, +(startCm.x + 1.4).toFixed(2));
    endY = Math.min(stageH - 0.3, +(startCm.y + 0.6).toFixed(2));
  } else if (constrainShift && (tool === 'line' || tool === 'arrow')) {
    const dist = Math.hypot(rawDx, rawDy);
    const angleRad = Math.atan2(rawDy, rawDx);
    const snappedAngle = Math.round(angleRad / (Math.PI / 4)) * (Math.PI / 4);
    endX = Math.max(0, Math.min(stageW, +(startCm.x + Math.cos(snappedAngle) * dist).toFixed(2)));
    endY = Math.max(0, Math.min(stageH, +(startCm.y + Math.sin(snappedAngle) * dist).toFixed(2)));
  } else if (constrainShift && tool === 'rectangle') {
    const side = Math.max(Math.abs(rawDx), Math.abs(rawDy));
    endX = Math.max(0, Math.min(stageW, +(startCm.x + Math.sign(rawDx || 1) * side).toFixed(2)));
    endY = Math.max(0, Math.min(stageH, +(startCm.y + Math.sign(rawDy || 1) * side).toFixed(2)));
  }

  const fmt = (n: number) => `${n.toFixed(2)}cm`;
  const dx = endX - startCm.x;
  const dy = endY - startCm.y;

  let values: Record<string, string> = {};
  let metricsLabelRu = '';

  switch (tool) {
    case 'line':
    case 'arrow': {
      // Ensure non-zero segment preview even on initial mouse-down pixel
      const safeEndX = Math.abs(dx) < 0.01 && Math.abs(dy) < 0.01 ? Math.min(stageW, +(startCm.x + 0.25).toFixed(2)) : endX;
      const safeEndY = endY;
      values =
        tool === 'arrow'
          ? {
              start_x: fmt(startCm.x),
              start_y: fmt(startCm.y),
              end_x: fmt(safeEndX),
              end_y: fmt(safeEndY),
              tip: 'Stealth',
            }
          : {
              start_x: fmt(startCm.x),
              start_y: fmt(startCm.y),
              end_x: fmt(safeEndX),
              end_y: fmt(safeEndY),
            };
      const len = Math.hypot(safeEndX - startCm.x, safeEndY - startCm.y);
      const deg = Math.round((Math.atan2(safeEndY - startCm.y, safeEndX - startCm.x) * 180) / Math.PI);
      metricsLabelRu = `L = ${len.toFixed(2)} см · ∠ ${deg}°`;
      endX = safeEndX;
      endY = safeEndY;
      break;
    }
    case 'rectangle': {
      const safeEndX = Math.abs(dx) < 0.05 ? Math.min(stageW, +(startCm.x + 0.2).toFixed(2)) : endX;
      const safeEndY = Math.abs(dy) < 0.05 ? Math.min(stageH, +(startCm.y + 0.2).toFixed(2)) : endY;
      values = {
        start_x: fmt(startCm.x),
        start_y: fmt(startCm.y),
        end_x: fmt(safeEndX),
        end_y: fmt(safeEndY),
      };
      const w = Math.abs(safeEndX - startCm.x);
      const h = Math.abs(safeEndY - startCm.y);
      metricsLabelRu = `${w.toFixed(2)} × ${h.toFixed(2)} см`;
      endX = safeEndX;
      endY = safeEndY;
      break;
    }
    case 'circle': {
      const r = Math.max(0.2, +(Math.hypot(dx, dy) || 0.25).toFixed(2));
      values = {
        center_x: fmt(startCm.x),
        center_y: fmt(startCm.y),
        radius: fmt(r),
      };
      metricsLabelRu = `R = ${r.toFixed(2)} см (Ø ${(r * 2).toFixed(2)} см)`;
      break;
    }
    case 'node': {
      values = {
        x: fmt(endX),
        y: fmt(endY),
        mode: 'math',
        content: 'P_n',
      };
      metricsLabelRu = `x = ${endX.toFixed(2)} см, y = ${endY.toFixed(2)} см`;
      break;
    }
    case 'cubic': {
      const safeEndX = Math.abs(dx) < 0.05 && Math.abs(dy) < 0.05 ? Math.min(stageW, +(startCm.x + 0.6).toFixed(2)) : endX;
      const spanX = (safeEndX - startCm.x) / 3;
      const liftCm = Math.max(0.45, Math.min(0.85, Math.abs(safeEndX - startCm.x) * 0.28 + 0.35));
      const c1x = +(startCm.x + spanX).toFixed(2);
      const c1y = +Math.min(stageH - 0.15, startCm.y + liftCm).toFixed(2);
      const c2x = +(safeEndX - spanX).toFixed(2);
      const c2y = +Math.min(stageH - 0.15, endY + liftCm).toFixed(2);
      values = {
        start_x: fmt(startCm.x),
        start_y: fmt(startCm.y),
        control1_x: fmt(c1x),
        control1_y: fmt(c1y),
        control2_x: fmt(c2x),
        control2_y: fmt(c2y),
        end_x: fmt(safeEndX),
        end_y: fmt(endY),
      };
      metricsLabelRu = `Безье ΔX ${Math.abs(safeEndX - startCm.x).toFixed(2)} · ΔY ${Math.abs(endY - startCm.y).toFixed(2)} см`;
      endX = safeEndX;
      break;
    }
  }

  return {
    tool,
    values,
    effectiveEndCm: { x: endX, y: endY },
    metricsLabelRu,
    tikzCommand: generateTikzCommand(tool, values),
  };
}

export function stepDimensionLiteral(
  raw: string,
  direction: 1 | -1,
  coarse = false,
  positiveOnly = false
): string {
  const m = /^([+-]?\d+(?:\.\d+)?)(cm|mm|pt|in)$/.exec(raw.trim());
  if (!m) return raw;
  const current = Number(m[1]);
  const unit = m[2];
  if (!Number.isFinite(current)) return raw;

  const baseStep = unit === 'cm' ? 0.1 : unit === 'mm' ? 1 : unit === 'pt' ? 2 : 0.05;
  const delta = direction * baseStep * (coarse ? 5 : 1);
  let next = current + delta;
  if (positiveOnly) {
    const minVal = unit === 'cm' ? 0.05 : unit === 'mm' ? 0.5 : unit === 'pt' ? 1 : 0.02;
    next = Math.max(minVal, next);
  }
  const decimals = unit === 'mm' || unit === 'pt' ? (Number.isInteger(next) ? 0 : 1) : 2;
  return `${next.toFixed(decimals)}${unit}`;
}

export function translateOwnedPrimitiveCm(
  tool: ToolId,
  values: Record<string, string>,
  dxCm: number,
  dyCm: number
): Record<string, string> {
  const next = { ...values };
  const shiftKey = (key: string, deltaCm: number) => {
    const curCm = parseDimensionToCm(next[key]);
    if (curCm === null) return;
    const shifted = Math.max(-50, Math.min(50, curCm + deltaCm));
    next[key] = `${shifted.toFixed(2)}cm`;
  };

  switch (tool) {
    case 'line':
    case 'arrow':
    case 'rectangle':
      shiftKey('start_x', dxCm);
      shiftKey('start_y', dyCm);
      shiftKey('end_x', dxCm);
      shiftKey('end_y', dyCm);
      if (next.poly_points) {
        const pts = parsePolyPointsList(next.poly_points).map((p) => ({
          xCm: Math.max(-50, Math.min(50, +(p.xCm + dxCm).toFixed(2))),
          yCm: Math.max(-50, Math.min(50, +(p.yCm + dyCm).toFixed(2))),
        }));
        if (pts.length >= 2) {
          next.poly_points = serializePolyPointsList(pts);
          next.start_x = `${pts[0].xCm.toFixed(2)}cm`;
          next.start_y = `${pts[0].yCm.toFixed(2)}cm`;
          next.end_x = `${pts[1].xCm.toFixed(2)}cm`;
          next.end_y = `${pts[1].yCm.toFixed(2)}cm`;
        }
      }
      break;
    case 'circle':
      shiftKey('center_x', dxCm);
      shiftKey('center_y', dyCm);
      break;
    case 'node':
      shiftKey('x', dxCm);
      shiftKey('y', dyCm);
      break;
    case 'cubic':
      shiftKey('start_x', dxCm);
      shiftKey('start_y', dyCm);
      shiftKey('control1_x', dxCm);
      shiftKey('control1_y', dyCm);
      shiftKey('control2_x', dxCm);
      shiftKey('control2_y', dyCm);
      shiftKey('end_x', dxCm);
      shiftKey('end_y', dyCm);
      break;
  }
  return next;
}

export function deleteOwnedPrimitiveFromSource(source: string, primitiveId: number): string {
  const owned = parseOwnedPrimitives(source);
  const target = owned.find((item) => item.id === primitiveId);
  if (!target) {
    throw new Error(`Примитив #${primitiveId} не найден в исходнике.`);
  }
  let cutEnd = target.lineEndOffset;
  if (source.slice(cutEnd, cutEnd + 2) === '\r\n') {
    cutEnd += 2;
  } else if (source[cutEnd] === '\n') {
    cutEnd += 1;
  }
  return source.slice(0, target.lineStartOffset) + source.slice(cutEnd);
}

export function duplicateOwnedPrimitiveInSource(
  source: string,
  primitiveId: number
): { nextSource: string; newId: number; insertedLine: number } {
  const owned = parseOwnedPrimitives(source);
  const target = owned.find((item) => item.id === primitiveId);
  if (!target) {
    throw new Error(`Примитив #${primitiveId} не найден для дублирования.`);
  }
  const shiftedValues = translateOwnedPrimitiveCm(target.tool, target.values, 0.3, -0.25);
  return insertOwnedPrimitiveIntoSource(source, target.tool, shiftedValues);
}

function stripUnescapedComment(line: string): { active: string; hasComment: boolean } {
  for (let i = 0; i < line.length; i++) {
    if (line[i] === '%') {
      let bs = 0;
      let k = i - 1;
      while (k >= 0 && line[k] === '\\') {
        bs++;
        k--;
      }
      if (bs % 2 === 0) {
        return { active: line.slice(0, i), hasComment: true };
      }
    }
  }
  return { active: line, hasComment: false };
}

export function inspectPreambleConnections(source: string): PreambleInspection {
  const lineEnding: '\r\n' | '\n' = source.includes('\r\n') ? '\r\n' : '\n';
  const beginDocIdx = source.indexOf('\\begin{document}');
  const hasBeginDocument = beginDocIdx !== -1;
  const preambleSlice = hasBeginDocument ? source.slice(0, beginDocIdx) : source;
  const rawLines = preambleSlice.split(/\r?\n/);

  const packages: PreambleInspection['packages'] = [];
  const tikzLibraries: PreambleInspection['tikzLibraries'] = [];

  rawLines.forEach((rawLine, idx) => {
    const lineNumber = idx + 1;
    const { active, hasComment } = stripUnescapedComment(rawLine);
    const trimmed = active.trim();

    const pkgMatch = /^\\usepackage(?:\[[^\]]*\])?\{([^}]+)\}$/.exec(trimmed);
    if (pkgMatch) {
      const names = pkgMatch[1].split(',').map((s) => s.trim()).filter(Boolean);
      for (const name of names) {
        packages.push({ name, lineNumber, hasInlineComment: hasComment });
      }
    }

    const libMatch = /^\\usetikzlibrary\{([^}]+)\}$/.exec(trimmed);
    if (libMatch) {
      const names = libMatch[1].split(',').map((s) => s.trim()).filter(Boolean);
      for (const name of names) {
        tikzLibraries.push({
          name,
          lineNumber,
          hasInlineComment: hasComment,
          sharedWith: names.filter((n) => n !== name),
        });
      }
    }
  });

  return {
    hasBeginDocument,
    beginDocumentOffset: beginDocIdx,
    lineEnding,
    packages,
    tikzLibraries,
  };
}

export function proposeLibraryConnect(source: string, libraryName: string): SourcePatchPreview {
  const inspection = inspectPreambleConnections(source);
  if (!inspection.hasBeginDocument) {
    return {
      ok: false,
      action: 'connect',
      libraryName,
      reasonRu: 'В документе отсутствует явная граница \\begin{document} — автоматическая вставка отклонена.',
      beforeLine: '',
      afterLine: '',
      nextSource: source,
    };
  }
  if (inspection.tikzLibraries.some((l) => l.name === libraryName)) {
    return {
      ok: false,
      action: 'connect',
      libraryName,
      reasonRu: `Библиотека ${libraryName} уже подключена в преамбуле.`,
      beforeLine: '',
      afterLine: '',
      nextSource: source,
    };
  }

  const eol = inspection.lineEnding;
  const decl = `\\usetikzlibrary{${libraryName}}`;
  const idx = inspection.beginDocumentOffset;
  const nextSource = source.slice(0, idx) + decl + eol + source.slice(idx);

  return {
    ok: true,
    action: 'connect',
    libraryName,
    beforeLine: '(перед \\begin{document})',
    afterLine: decl,
    nextSource,
  };
}

export function proposeLibraryDisconnect(source: string, libraryName: string): SourcePatchPreview {
  const inspection = inspectPreambleConnections(source);
  if (!inspection.hasBeginDocument) {
    return {
      ok: false,
      action: 'disconnect',
      libraryName,
      reasonRu: 'Отсутствует \\begin{document} — автоматическое отключение запрещено.',
      beforeLine: '',
      afterLine: '',
      nextSource: source,
    };
  }

  const eol = inspection.lineEnding;
  let offset = 0;
  let lineNum = 1;

  while (offset < inspection.beginDocumentOffset) {
    const nlIdx = source.indexOf('\n', offset);
    const rawEnd = nlIdx === -1 ? source.length : nlIdx;
    const termEnd = nlIdx === -1 ? source.length : nlIdx + 1;
    const cleanEnd = rawEnd > offset && source[rawEnd - 1] === '\r' ? rawEnd - 1 : rawEnd;
    const line = source.slice(offset, cleanEnd);

    const { active, hasComment } = stripUnescapedComment(line);
    const libMatch = /^(\s*)\\usetikzlibrary\{([^}]+)\}\s*$/.exec(active);
    if (libMatch) {
      const indent = libMatch[1];
      const names = libMatch[2].split(',').map((s) => s.trim()).filter(Boolean);
      if (names.includes(libraryName)) {
        if (hasComment) {
          return {
            ok: false,
            action: 'disconnect',
            libraryName,
            reasonRu: `Строка ${lineNum} содержит строчный комментарий — отредактируйте исходник вручную (защита комментария автора).`,
            beforeLine: line,
            afterLine: line,
            nextSource: source,
          };
        }
        const remaining = names.filter((n) => n !== libraryName);
        if (remaining.length === 0) {
          const nextSource = source.slice(0, offset) + source.slice(termEnd);
          return {
            ok: true,
            action: 'disconnect',
            libraryName,
            beforeLine: line,
            afterLine: '(строка декларации удалена целиком)',
            nextSource,
          };
        } else {
          const afterLine = `${indent}\\usetikzlibrary{${remaining.join(',')}}`;
          const nextSource = source.slice(0, offset) + afterLine + eol + source.slice(termEnd);
          return {
            ok: true,
            action: 'disconnect',
            libraryName,
            beforeLine: line,
            afterLine,
            nextSource,
          };
        }
      }
    }

    if (nlIdx === -1) break;
    offset = termEnd;
    lineNum++;
  }

  return {
    ok: false,
    action: 'disconnect',
    libraryName,
    reasonRu: `Библиотека ${libraryName} не найдена в буквальных декларациях \\usetikzlibrary.`,
    beforeLine: '',
    afterLine: '',
    nextSource: source,
  };
}

export function analyzeTexDiagnostics(source: string): TexDiagnostic[] {
  const diagnostics: TexDiagnostic[] = [];
  const inspection = inspectPreambleConnections(source);
  const loadedLibs = new Set(inspection.tikzLibraries.map((l) => l.name));
  const loadedPkgs = new Set(inspection.packages.map((p) => p.name));
  const lines = source.split(/\r?\n/);

  let openTikzLine = -1;
  let closeTikzLine = -1;
  let inDocumentBody = false;
  let inTikzpicture = false;
  let cyrillicWarned = false;
  let globalBraceDepth = 0;
  let lastUnclosedBraceLine = 1;

  lines.forEach((rawLine, idx) => {
    const lineNumber = idx + 1;
    const { active } = stripUnescapedComment(rawLine);
    const trimmed = active.trim();

    if (active.includes('\\begin{document}')) inDocumentBody = true;
    if (active.includes('\\end{document}')) inDocumentBody = false;
    if (active.includes('\\begin{tikzpicture}')) {
      openTikzLine = lineNumber;
      inTikzpicture = true;
    }
    if (active.includes('\\end{tikzpicture}')) {
      closeTikzLine = lineNumber;
      inTikzpicture = false;
    }

    // Check missing arrows.meta when Stealth or Latex arrow tip is used
    if ((active.includes('Stealth') || active.includes('-{Latex}')) && !loadedLibs.has('arrows.meta')) {
      diagnostics.push({
        severity: 'error',
        lineNumber,
        code: 'PGF-ARROW-TIP',
        messageRu: 'Package pgfkeys Error: Наконечник Stealth/Latex требует подключения библиотеки arrows.meta.',
        hintRu: 'Подключите \\usetikzlibrary{arrows.meta} во вкладке «Библиотеки» или кнопкой автоисправления ниже.',
        quickFixId: 'connect-arrows-meta',
        quickFixLabelRu: 'Подключить \\usetikzlibrary{arrows.meta}',
      });
    }

    // Check intentional undefined macro for error-demo workflow (T5)
    const badMacro = /\\undefinedTikzCommand\b|\\drawbroken\b/.exec(active);
    if (badMacro) {
      diagnostics.push({
        severity: 'error',
        lineNumber,
        code: 'TEX-UNDEF-CS',
        messageRu: `Undefined control sequence ${badMacro[0]} при обработке XeLaTeX.`,
        hintRu: `Перейдите к строке ${lineNumber} или замените ${badMacro[0]} на корректную команду \\draw.`,
        quickFixId: 'fix-undef-draw',
        quickFixLabelRu: `Заменить ${badMacro[0]} → \\draw`,
      });
    }

    // Check brace balance across both single-line commands and multi-line \foreach / \tikzset blocks
    let braceBalance = 0;
    for (let i = 0; i < active.length; i++) {
      if (active[i] === '{' && active[i - 1] !== '\\') {
        if (globalBraceDepth === 0) lastUnclosedBraceLine = lineNumber;
        braceBalance++;
        globalBraceDepth++;
      }
      if (active[i] === '}' && active[i - 1] !== '\\') {
        braceBalance--;
        globalBraceDepth--;
      }
    }
    const isSingleCommandLine = /^\\(?:draw|node|filldraw|fill|path)\b/.test(trimmed) && trimmed.endsWith(';');
    if (globalBraceDepth < 0 || (isSingleCommandLine && braceBalance !== 0)) {
      diagnostics.push({
        severity: 'error',
        lineNumber,
        code: 'TEX-BRACE-EOF',
        messageRu: 'Несбалансированные фигурные скобки { } в строке исходника.',
        hintRu: `Проверьте парность скобок в строке ${lineNumber}.`,
      });
      if (globalBraceDepth < 0) globalBraceDepth = 0;
    }

    // P17: Check unclosed inline math $...$
    let dollarCount = 0;
    for (let i = 0; i < active.length; i++) {
      if (active[i] === '$' && active[i - 1] !== '\\') {
        if (active[i + 1] === '$') {
          i++;
        } else {
          dollarCount++;
        }
      }
    }
    if (dollarCount % 2 === 1) {
      diagnostics.push({
        severity: 'error',
        lineNumber,
        code: 'TEX-UNCLOSED-MATH',
        messageRu: 'Missing $ inserted: нечётное число знаков $ в математическом выражении.',
        hintRu: `Закройте формулу знаком $ в строке ${lineNumber}.`,
        quickFixId: 'close-math-dollar',
        quickFixLabelRu: 'Закрыть формулу $ автоматически',
      });
    }

    // P17: Check missing semicolon at end of single-line \draw / \node / \filldraw inside tikzpicture
    if (
      inTikzpicture &&
      braceBalance === 0 &&
      /^\\(?:draw|node|filldraw|fill|path)\b/.test(trimmed) &&
      !trimmed.endsWith(';')
    ) {
      diagnostics.push({
        severity: 'error',
        lineNumber,
        code: 'TIKZ-MISSING-SEMI',
        messageRu: 'Package tikz Error: Пропущена точка с запятой «;» в конце команды пути TikZ.',
        hintRu: `Каждая команда \\draw / \\node внутри tikzpicture должна завершаться символом «;».`,
        quickFixId: 'append-semicolon',
        quickFixLabelRu: 'Поставить «;» в конце команды',
      });
    }

    // P17: Check Cyrillic text in document body without fontspec
    if (inDocumentBody && !cyrillicWarned && /[А-Яа-яЁё]/.test(active) && !loadedPkgs.has('fontspec')) {
      cyrillicWarned = true;
      diagnostics.push({
        severity: 'warning',
        lineNumber,
        code: 'TEX-CYRILLIC-FONTSPEC',
        messageRu: 'Кириллица в теле документа без пакета fontspec и шрифта с поддержкой кириллицы.',
        hintRu: 'В профиле XeLaTeX подключите \\usepackage{fontspec} и \\setmainfont{DejaVu Serif}.',
        quickFixId: 'add-fontspec-cyrillic',
        quickFixLabelRu: 'Добавить fontspec + DejaVu Serif',
      });
    }

    // P38: Check missing patterns library when pattern= is used
    if (active.includes('pattern=') && !loadedLibs.has('patterns') && !loadedLibs.has('patterns.meta')) {
      diagnostics.push({
        severity: 'error',
        lineNumber,
        code: 'PGF-PATTERNS-LIB',
        messageRu: 'Штриховка pattern=... требует подключения библиотеки patterns в преамбуле.',
        hintRu: 'Подключите \\usetikzlibrary{patterns} кнопкой автоисправления.',
        quickFixId: 'connect-patterns',
        quickFixLabelRu: 'Подключить \\usetikzlibrary{patterns}',
      });
    }

    // P39: Check missing decorations library when decorate / decoration={...} is used
    if (
      active.includes('decoration={brace') &&
      !loadedLibs.has('decorations.pathreplacing')
    ) {
      diagnostics.push({
        severity: 'error',
        lineNumber,
        code: 'PGF-DECOR-BRACE',
        messageRu: 'Фигурная скобка decoration={brace} требует \\usetikzlibrary{decorations.pathreplacing}.',
        hintRu: 'Подключите библиотеку декораций одной кнопкой ниже.',
        quickFixId: 'connect-decorations',
        quickFixLabelRu: 'Подключить decorations.pathreplacing / pathmorphing',
      });
    } else if (
      /decoration=\{(?:snake|zigzag|coil)/.test(active) &&
      !loadedLibs.has('decorations.pathmorphing')
    ) {
      diagnostics.push({
        severity: 'error',
        lineNumber,
        code: 'PGF-DECOR-WAVE',
        messageRu: 'Волновая декорация snake/zigzag/coil требует \\usetikzlibrary{decorations.pathmorphing}.',
        hintRu: 'Подключите библиотеку декораций одной кнопкой ниже.',
        quickFixId: 'connect-decorations',
        quickFixLabelRu: 'Подключить decorations.pathreplacing / pathmorphing',
      });
    }

    // P42: Check bare physical units inside inline math $...$ without \text{} or \mathrm{}
    const mathSegRe = /\$([^$]+)\$/g;
    let mathMatch: RegExpExecArray | null;
    while ((mathMatch = mathSegRe.exec(active)) !== null) {
      const expr = mathMatch[1];
      if (!expr.includes('\\text{') && !expr.includes('\\mathrm{') && !expr.includes('\\qty{')) {
        if (/(?:^|[\d\s])(?:нм|мкм|мм|см|Гц|кГц|МГц|ГГц|мА|Ом|эВ|дБ)(?=$|[\s,.)\]}])/.test(expr)) {
          diagnostics.push({
            severity: 'warning',
            lineNumber,
            code: 'TEX-ITALIC-UNIT',
            messageRu: 'Физическая единица набрана внутри $...$ без \\text{} — по ГОСТ единицы СИ печатаются прямым шрифтом.',
            hintRu: 'Оберните размерность в \\,\\text{...} с тонкой шпацией (например, 20\\,\\text{мм}).',
            quickFixId: 'fix-italic-unit',
            quickFixLabelRu: 'Оформить единицу прямо по ГОСТ (\\,\\text{...})',
          });
          break;
        }
      }
    }

    // Warning if LuaLaTeX graphdrawing is imported in XeLaTeX profile
    if (active.includes('graphdrawing')) {
      diagnostics.push({
        severity: 'warning',
        lineNumber,
        code: 'ENGINE-LUA-ONLY',
        messageRu: 'Библиотека graphdrawing требует движок LuaLaTeX (текущий профиль: XeLaTeX).',
        hintRu: 'Используйте позиционирование positioning/calc, пакет forest или переключите внешний профиль сборки.',
      });
    }

    // Check missing extension \usepackage{...} when document has a preamble
    if (inDocumentBody && inspection.hasBeginDocument) {
      const extChecks: { pkg: string; pattern: RegExp; label: string }[] = [
        { pkg: 'pgfplots', pattern: /\\begin\{(?:axis|polaraxis|groupplot)\}|\\addplot3?\b/, label: 'pgfplots' },
        { pkg: 'circuitikz', pattern: /\\begin\{circuitikz\}|\bnode\[(?:op amp|nmos|pmos)\]/, label: 'circuitikz' },
        { pkg: 'tikz-cd', pattern: /\\begin\{tikzcd\}/, label: 'tikz-cd' },
        { pkg: 'chemfig', pattern: /\\chemfig\{|\\schemestart\b/, label: 'chemfig' },
        { pkg: 'tikz-3dplot', pattern: /\\tdplotsetmaincoords\b/, label: 'tikz-3dplot' },
        { pkg: 'forest', pattern: /\\begin\{forest\}/, label: 'forest' },
        { pkg: 'pgfgantt', pattern: /\\begin\{ganttchart\}/, label: 'pgfgantt' },
        { pkg: 'quantikz', pattern: /\\begin\{quantikz\}/, label: 'quantikz' },
        { pkg: 'tkz-euclide', pattern: /\\tkzDefPoint\b/, label: 'tkz-euclide' },
        { pkg: 'tikz-timing', pattern: /\\begin\{tikztimingtable\}/, label: 'tikz-timing' },
      ];
      for (const chk of extChecks) {
        if (chk.pattern.test(active) && !loadedPkgs.has(chk.pkg)) {
          diagnostics.push({
            severity: 'error',
            lineNumber,
            code: 'TEX-MISSING-EXT-PKG',
            messageRu: `Команда пакета расширения требует \\usepackage{${chk.pkg}} в преамбуле рисунка.`,
            hintRu: `Подключите пакет ${chk.label} кнопкой автоисправления или через Мастерские → «Пакеты расширений TikZ».`,
            quickFixId: `connect-ext-pkg:${chk.pkg}`,
            quickFixLabelRu: `Подключить \\usepackage{${chk.pkg}}`,
          });
          break;
        }
      }
    }
  });

  if (openTikzLine !== -1 && closeTikzLine === -1) {
    diagnostics.push({
      severity: 'error',
      lineNumber: openTikzLine,
      code: 'TEX-ENV-UNCLOSED',
      messageRu: '\\begin{tikzpicture} не закрыт соответствующим \\end{tikzpicture}.',
      hintRu: 'Добавьте \\end{tikzpicture} перед \\end{document}.',
    });
  }

  if (globalBraceDepth > 0) {
    diagnostics.push({
      severity: 'error',
      lineNumber: lastUnclosedBraceLine,
      code: 'TEX-BRACE-EOF',
      messageRu: 'Несбалансированные фигурные скобки { } в исходнике (незакрытый блок).',
      hintRu: `Проверьте закрывающую скобку «}» для блока, начатого в строке ${lastUnclosedBraceLine}.`,
    });
  }

  return diagnostics;
}

export function buildSpecimenDocuments(): SpecimenDocument[] {
  const opticalLines = [
    generateOwnedLine(1, 'line', { start_x: '0.40cm', start_y: '1.80cm', end_x: '5.80cm', end_y: '1.80cm' }),
    generateOwnedLine(2, 'rectangle', { start_x: '2.30cm', start_y: '0.70cm', end_x: '3.10cm', end_y: '2.90cm' }),
    generateOwnedLine(3, 'circle', { center_x: '2.70cm', center_y: '1.80cm', radius: '0.85cm' }),
    generateOwnedLine(4, 'cubic', {
      start_x: '0.60cm',
      start_y: '2.45cm',
      control1_x: '1.80cm',
      control1_y: '2.45cm',
      control2_x: '3.40cm',
      control2_y: '2.25cm',
      end_x: '4.70cm',
      end_y: '1.80cm',
    }),
    generateOwnedLine(5, 'arrow', {
      start_x: '0.60cm',
      start_y: '1.15cm',
      end_x: '4.70cm',
      end_y: '1.80cm',
      tip: 'Stealth',
    }),
    generateOwnedLine(6, 'node', { x: '4.85cm', y: '2.25cm', mode: 'math', content: 'F_1 (f = 20\\,\\text{мм})' }),
  ].join('\n');

  const cubicOwnedSource = `\\documentclass[tikz,border=6pt]{standalone}
\\usepackage{fontspec}
\\usepackage{unicode-math}
\\usepackage{tikz}
\\usetikzlibrary{arrows.meta,calc,positioning}
\\setmainfont{DejaVu Serif}
% Авторский макрос сохраняется без изменений при любых GUI-патчах:
\\newcommand{\\myOpticsNote}[1]{\\node[font=\\footnotesize, anchor=west] at (0.40cm,0.25cm) {#1};}
\\begin{document}
\\begin{tikzpicture}
${opticalLines}
  \\myOpticsNote{Оптическая ось и фокус собирающей линзы (\\% точность PGF)}
\\end{tikzpicture}
\\end{document}
`;

  const quickstartSource = `\\documentclass{standalone}
\\usepackage{fontspec}
\\usepackage{tikz}
\\usetikzlibrary{arrows.meta,calc,positioning}
\\begin{document}
\\begin{tikzpicture}[>=Stealth, every node/.style={font=\\sffamily}]
  \\node[draw,rounded corners,fill=blue!8,minimum width=3cm,minimum height=1cm] (A) {TikZarium};
  \\node[draw,rounded corners,fill=green!8,right=2cm of A] (B) {XeLaTeX};
  \\draw[->,very thick,blue!70!black] (A) -- node[above] {exact PDF} (B);
${generateOwnedLine(1, 'arrow', { start_x: '0.20cm', start_y: '-1.10cm', end_x: '4.60cm', end_y: '-1.10cm', tip: 'Stealth' })}
${generateOwnedLine(2, 'node', { x: '2.40cm', y: '-0.75cm', mode: 'text', content: 'Авторитетный исходник .tex' })}
\\end{tikzpicture}
\\end{document}
`;

  const cyrillicMathSource = [
    '\\documentclass{standalone}',
    '\\usepackage{fontspec}',
    '\\usepackage{unicode-math}',
    '\\usepackage{tikz}',
    '\\usetikzlibrary{arrows.meta,positioning}',
    '\\setmainfont{DejaVu Serif}',
    '\\setsansfont{DejaVu Sans}',
    '\\setmonofont{DejaVu Sans Mono}',
    '\\setmathfont{latinmodern-math.otf}',
    '\\begin{document}',
    '\\begin{tikzpicture}[>=Stealth,every node/.style={align=center}]',
    '  \\node[draw,rounded corners,fill=blue!8,text width=4.5cm] (a) at (0,0) {Привет, мир!\\\\Геометрия и оптика};',
    '  \\node[draw,rounded corners,fill=green!8,right=1.2cm of a] (b) {\\sffamily Научный рисунок\\\\\\(E=\\hbar\\omega,\\ \\alpha+\\beta=\\gamma\\)};',
    '  \\draw[->,line width=1pt] (a) -- (b);',
    generateOwnedLine(1, 'circle', { center_x: '2.80cm', center_y: '1.65cm', radius: '0.55cm' }),
    '\\end{tikzpicture}',
    '\\end{document}',
    '',
  ].join('\r\n');

  const pgfplotsSource = `\\documentclass[border=6pt]{standalone}
\\usepackage{fontspec}
\\usepackage{tikz}
\\usepackage{pgfplots}
\\usetikzlibrary{arrows.meta,calc}
\\pgfplotsset{compat=1.18}
% Ресурс данных ST-SCI: внешний файл spectrum_ak14.dat (SHA проверен)
\\begin{document}
\\begin{tikzpicture}
${generateOwnedLine(1, 'rectangle', { start_x: '0.40cm', start_y: '0.40cm', end_x: '5.40cm', end_y: '3.10cm' })}
${generateOwnedLine(2, 'cubic', {
  start_x: '0.60cm',
  start_y: '0.75cm',
  control1_x: '1.80cm',
  control1_y: '3.05cm',
  control2_x: '3.10cm',
  control2_y: '0.95cm',
  end_x: '5.10cm',
  end_y: '2.55cm',
})}
${generateOwnedLine(3, 'node', { x: '2.90cm', y: '3.40cm', mode: 'math', content: 'I(\\lambda) = I_0 e^{-\\alpha \\lambda}' })}
\\end{tikzpicture}
\\end{document}
`;

  const errorDemoSource = `\\documentclass[tikz,border=6pt]{standalone}
\\usepackage{fontspec}
\\usepackage{tikz}
% Намеренно отключена arrows.meta и добавлена ошибочная команда для сценария T5:
\\begin{document}
\\begin{tikzpicture}
${generateOwnedLine(1, 'arrow', { start_x: '0.50cm', start_y: '1.50cm', end_x: '3.80cm', end_y: '1.50cm', tip: 'Stealth' })}
  \\undefinedTikzCommand (1cm,0.5cm) -- (3cm,0.5cm);
\\end{tikzpicture}
\\end{document}
`;

  return [
    {
      id: 'cubic-owned',
      filename: 'optics_lens_n1.tex',
      titleRu: 'Оптическая схема: тонкая линза',
      subtitleRu: 'Собирающая линза, оптическая ось, лучи и фокус F1 (6 интерактивных объектов)',
      lineEnding: 'LF',
      dataDependencies: [],
      source: cubicOwnedSource,
    },
    {
      id: 'quickstart',
      filename: 'quickstart.tex',
      titleRu: 'Быстрый старт (quickstart.tex)',
      subtitleRu: 'Базовый образец из репозитория i-shutov/tikzarium',
      lineEnding: 'LF',
      dataDependencies: [],
      source: quickstartSource,
    },
    {
      id: 'cyrillic-crlf',
      filename: 'fontspec-cyrillic-math.tex',
      titleRu: 'Кириллица и ГОСТ (Windows CRLF)',
      subtitleRu: 'Проверка сохранности байтов UTF-8 и окончаний строк CRLF',
      lineEnding: 'CRLF',
      dataDependencies: [],
      source: cyrillicMathSource,
    },
    {
      id: 'pgfplots-sci',
      filename: 'scientific_142_spectrum.tex',
      titleRu: 'Спектральный график PGFPlots',
      subtitleRu: 'Научный профиль с внешней зависимостью данных spectrum_ak14.dat',
      lineEnding: 'LF',
      dataDependencies: ['data/spectrum_ak14.dat'],
      source: pgfplotsSource,
    },
    {
      id: 'error-demo',
      filename: 'diagnostics_t5_demo.tex',
      titleRu: 'Пример диагностики ошибок TeX',
      subtitleRu: 'Проверка перехода к строке ошибки и статуса «Устаревший PDF»',
      lineEnding: 'LF',
      dataDependencies: [],
      source: errorDemoSource,
    },
  ];
}

export function getLibraryFiveStatuses(
  libName: string,
  source: string,
  toolchainReady: boolean
): {
  packageInstalled: 'CONFIRMED' | 'UNKNOWN';
  projectLoaded: boolean;
  engineCompatible: boolean;
  toolImplemented: boolean;
  helpAvailable: boolean;
} {
  const inspection = inspectPreambleConnections(source);
  const libEntry = TIKZ_LIBRARIES.find((l) => l.name === libName);
  const extEntry = EXTENSION_MANIFESTS.find((e) => e.name === libName);

  const projectLoaded =
    inspection.tikzLibraries.some((l) => l.name === libName) ||
    inspection.packages.some((p) => p.name === libName);

  const engineCompatible = extEntry ? extEntry.engine === 'xelatex' : true;
  const toolImplemented = libEntry ? libEntry.toolImplemented : libName === 'tikz';
  const helpAvailable = Boolean(libEntry || extEntry);

  return {
    packageInstalled: toolchainReady ? 'CONFIRMED' : 'UNKNOWN',
    projectLoaded,
    engineCompatible,
    toolImplemented,
    helpAvailable,
  };
}

export { TIKZ_LIBRARIES, EXTENSION_MANIFESTS, PRIMITIVE_TOOLS };
