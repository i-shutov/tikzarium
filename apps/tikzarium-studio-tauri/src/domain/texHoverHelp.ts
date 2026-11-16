import { PRIMITIVE_TOOLS, TIKZ_LIBRARIES } from './catalog';
import type { ToolId } from './catalog';
import {
  resolveManualAnchorById,
  resolveManualAnchorForTool,
  resolveManualAnchorForToken,
  resolveManualDocumentMeta,
} from './pdfManualAnchors';
import {
  OWNERSHIP_MARKER,
  decodeOwnershipHex,
  inspectPreambleConnections,
  tokenizeTexLine,
} from './tikzEngine';

export interface HoverArgumentDoc {
  name: string;
  typeRu: string;
  constraintRu: string;
  currentValue?: string;
}

export interface TexCommandHoverInfo {
  lineNumber: number;
  tokenStart: number;
  tokenEnd: number;
  hoveredToken: string;
  categoryRu:
    | 'Примитив TikZ'
    | 'Пакет расширения TikZ'
    | 'Преамбула LaTeX'
    | 'Окружение TikZ'
    | 'Макрос автора'
    | 'Неизвестная команда';
  titleRu: string;
  signature: string;
  summaryRu: string;
  arguments: HoverArgumentDoc[];
  dependencyNoteRu: string;
  manualRef?: string;
  manualAnchorId?: string;
  manualDocFile?: string;
  manualPage?: number;
  manualNamedDest?: string;
  ownedId?: number;
  isError?: boolean;
}

interface DeclaredUserMacro {
  name: string;
  argCount: number;
  lineNumber: number;
  bodyPreview: string;
}

const PATH_KEYWORD_REGEX = /\b(circle|rectangle|controls|node|Stealth|Latex)\b/g;

const KNOWN_STANDARD_MACROS = new Set([
  '\\footnotesize',
  '\\scriptsize',
  '\\small',
  '\\normalsize',
  '\\large',
  '\\Large',
  '\\sffamily',
  '\\rmfamily',
  '\\ttfamily',
  '\\bfseries',
  '\\itshape',
  '\\text',
  '\\hbar',
  '\\omega',
  '\\alpha',
  '\\beta',
  '\\gamma',
  '\\lambda',
  '\\mu',
  '\\pi',
  '\\theta',
  '\\phi',
  '\\psi',
  '\\Delta',
  '\\Omega',
  '\\sin',
  '\\cos',
  '\\tan',
  '\\exp',
  '\\ln',
  '\\frac',
  '\\sqrt',
  '\\ket',
  '\\bra',
  '\\SI',
  '\\qty',
  '\\num',
  '\\sisetup',
  '\\verb',
  '\\,',
  '\\;',
  '\\quad',
  '\\%',
  '\\\\',
  '\\+',
]);

function withAnchorMeta(info: TexCommandHoverInfo, anchorId: string | null | undefined): TexCommandHoverInfo {
  if (!anchorId) return info;
  const anchor = resolveManualAnchorById(anchorId);
  const docMeta = resolveManualDocumentMeta(anchor.docId);
  return {
    ...info,
    manualRef: info.manualRef ?? `${docMeta.filename} ${anchor.section} (стр. ${anchor.page})`,
    manualAnchorId: anchor.id,
    manualDocFile: docMeta.filename,
    manualPage: anchor.page,
    manualNamedDest: anchor.namedDest,
  };
}

function scanUserDeclaredMacros(source: string): Map<string, DeclaredUserMacro> {
  const map = new Map<string, DeclaredUserMacro>();
  const lines = source.split(/\r?\n/);
  lines.forEach((raw, idx) => {
    const m = /\\newcommand\{\\(\w+)\}(?:\[(\d+)\])?\{(.+)\}/.exec(raw);
    if (m) {
      const macroName = `\\${m[1]}`;
      map.set(macroName, {
        name: macroName,
        argCount: m[2] ? parseInt(m[2], 10) : 0,
        lineNumber: idx + 1,
        bodyPreview: m[3].length > 56 ? `${m[3].slice(0, 56)}…` : m[3],
      });
    }
  });
  return map;
}

function parseOwnedPayloadOnLine(line: string): { id: number; tool: ToolId; values: Record<string, string> } | null {
  const markerIdx = line.indexOf(OWNERSHIP_MARKER);
  if (markerIdx === -1) return null;
  const hex = line.slice(markerIdx + OWNERSHIP_MARKER.length).trim();
  const decoded = decodeOwnershipHex(hex);
  if (!decoded) return null;
  return {
    id: decoded.id,
    tool: decoded.tool,
    values: decoded.draft.values,
  };
}

function detectPrimitiveToolFromLine(activeCode: string, ownedTool?: ToolId): ToolId | null {
  if (ownedTool) return ownedTool;
  const trimmed = activeCode.trim();
  if (trimmed.startsWith('\\node')) return 'node';
  if (!trimmed.startsWith('\\draw')) return null;
  if (/\.\.\s*controls\b/.test(trimmed)) return 'cubic';
  if (/\bcircle\b/.test(trimmed)) return 'circle';
  if (/\brectangle\b/.test(trimmed)) return 'rectangle';
  if (/\\draw\s*\[[^\]]*(->|<->|-\{|Stealth|Latex)/.test(trimmed)) return 'arrow';
  if (/--/.test(trimmed)) return 'line';
  return 'line';
}

function extractFirstBraceArg(line: string, afterIdx = 0): string | undefined {
  const open = line.indexOf('{', afterIdx);
  if (open === -1) return undefined;
  let depth = 0;
  for (let i = open; i < line.length; i++) {
    if (line[i] === '{' && line[i - 1] !== '\\') depth++;
    if (line[i] === '}' && line[i - 1] !== '\\') {
      depth--;
      if (depth === 0) {
        return line.slice(open + 1, i);
      }
    }
  }
  return undefined;
}

function extractFirstBracketOpt(line: string, afterIdx = 0): string | undefined {
  const open = line.indexOf('[', afterIdx);
  const brace = line.indexOf('{', afterIdx);
  if (open === -1 || (brace !== -1 && open > brace)) return undefined;
  const close = line.indexOf(']', open + 1);
  if (close === -1) return undefined;
  return line.slice(open + 1, close);
}

function buildPrimitiveHover(
  toolId: ToolId,
  lineNumber: number,
  tokenStart: number,
  tokenEnd: number,
  hoveredToken: string,
  activeCode: string,
  owned: { id: number; tool: ToolId; values: Record<string, string> } | null,
  arrowsMetaLoaded: boolean
): TexCommandHoverInfo {
  const spec = PRIMITIVE_TOOLS.find((t) => t.id === toolId)!;
  const vals = owned?.values;
  const toolAnchor = resolveManualAnchorForTool(toolId);
  const finish = (card: TexCommandHoverInfo) => withAnchorMeta(card, toolAnchor.id);

  if (toolId === 'circle') {
    const coordMatch = /\(([^,()]+),([^,()]+)\)/.exec(activeCode);
    const radMatch = /radius\s*=\s*([^\],\s]+)/.exec(activeCode);
    return finish({
      lineNumber,
      tokenStart,
      tokenEnd,
      hoveredToken,
      categoryRu: 'Примитив TikZ',
      titleRu: `${spec.titleRu} (${spec.catalogId})`,
      signature: '\\draw (<center_x>,<center_y>) circle [radius=<radius>];',
      summaryRu: spec.helpRu,
      ownedId: owned?.id,
      dependencyNoteRu: 'Пакет: tikz (базовое ядро PGF, доп. библиотеки не требуются)',
      arguments: [
        {
          name: 'center_x, center_y',
          typeRu: 'длина (cm | mm | pt | in)',
          constraintRu: 'Буквальные координаты центра в системе TikZ',
          currentValue: vals
            ? `${vals.center_x}, ${vals.center_y}`
            : coordMatch
              ? `${coordMatch[1].trim()}, ${coordMatch[2].trim()}`
              : undefined,
        },
        {
          name: 'radius',
          typeRu: 'длина > 0 (cm | mm | pt | in)',
          constraintRu: 'Строго больше нуля (0cm отклоняется валидатором)',
          currentValue: vals?.radius ?? radMatch?.[1],
        },
      ],
    });
  }

  if (toolId === 'rectangle') {
    const coords = Array.from(activeCode.matchAll(/\(([^,()]+),([^,()]+)\)/g));
    return finish({
      lineNumber,
      tokenStart,
      tokenEnd,
      hoveredToken,
      categoryRu: 'Примитив TikZ',
      titleRu: `${spec.titleRu} (${spec.catalogId})`,
      signature: '\\draw (<start_x>,<start_y>) rectangle (<end_x>,<end_y>);',
      summaryRu: spec.helpRu,
      ownedId: owned?.id,
      dependencyNoteRu: 'Пакет: tikz (базовое ядро PGF)',
      arguments: [
        {
          name: 'start_x, start_y',
          typeRu: 'длина (cm | mm | pt | in)',
          constraintRu: 'Первая вершина прямоугольника',
          currentValue: vals
            ? `${vals.start_x}, ${vals.start_y}`
            : coords[0]
              ? `${coords[0][1].trim()}, ${coords[0][2].trim()}`
              : undefined,
        },
        {
          name: 'end_x, end_y',
          typeRu: 'длина (cm | mm | pt | in)',
          constraintRu: 'Противоположная диагональная вершина',
          currentValue: vals
            ? `${vals.end_x}, ${vals.end_y}`
            : coords[1]
              ? `${coords[1][1].trim()}, ${coords[1][2].trim()}`
              : undefined,
        },
      ],
    });
  }

  if (toolId === 'arrow') {
    const coords = Array.from(activeCode.matchAll(/\(([^()]+)\)/g));
    const opt = extractFirstBracketOpt(activeCode);
    const needsArrowsMeta = /Stealth|Latex/.test(activeCode) && !arrowsMetaLoaded;
    return finish({
      lineNumber,
      tokenStart,
      tokenEnd,
      hoveredToken,
      categoryRu: 'Примитив TikZ',
      titleRu: `${spec.titleRu} (${spec.catalogId})`,
      signature: '\\draw[-{<tip>}] (<start_x>,<start_y>) -- (<end_x>,<end_y>);',
      summaryRu: spec.helpRu,
      ownedId: owned?.id,
      isError: needsArrowsMeta,
      dependencyNoteRu: needsArrowsMeta
        ? 'Внимание: отсутствует \\usetikzlibrary{arrows.meta} в преамбуле!'
        : 'Пакет: tikz · Библиотека: arrows.meta (подключена)',
      arguments: [
        {
          name: 'tip',
          typeRu: 'Stealth | Latex | to',
          constraintRu: 'Тип наконечника в опции [-{<tip>}] (требует arrows.meta)',
          currentValue: vals?.tip ?? opt,
        },
        {
          name: 'start_x, start_y',
          typeRu: 'координата / узел',
          constraintRu: 'Начальная точка вектора',
          currentValue: vals ? `${vals.start_x}, ${vals.start_y}` : coords[0]?.[1],
        },
        {
          name: 'end_x, end_y',
          typeRu: 'координата / узел',
          constraintRu: 'Конечная точка с наконечником',
          currentValue: vals ? `${vals.end_x}, ${vals.end_y}` : coords[coords.length - 1]?.[1],
        },
      ],
    });
  }

  if (toolId === 'cubic') {
    return finish({
      lineNumber,
      tokenStart,
      tokenEnd,
      hoveredToken,
      categoryRu: 'Примитив TikZ',
      titleRu: `${spec.titleRu} (${spec.catalogId})`,
      signature: '\\draw (<start>) .. controls (<c1>) and (<c2>) .. (<end>);',
      summaryRu: spec.helpRu,
      ownedId: owned?.id,
      dependencyNoteRu: 'Пакет: tikz (кубический сплайн ядра PGF)',
      arguments: [
        {
          name: 'start_x, start_y',
          typeRu: 'длина (cm | mm | pt | in)',
          constraintRu: 'Начальная опорная точка кривой',
          currentValue: vals ? `${vals.start_x}, ${vals.start_y}` : undefined,
        },
        {
          name: 'control1, control2',
          typeRu: '2 контрольные точки',
          constraintRu: 'Касательные рычаги Безье после ключевого слова controls',
          currentValue: vals
            ? `(${vals.control1_x},${vals.control1_y}) и (${vals.control2_x},${vals.control2_y})`
            : undefined,
        },
        {
          name: 'end_x, end_y',
          typeRu: 'длина (cm | mm | pt | in)',
          constraintRu: 'Конечная опорная точка кривой',
          currentValue: vals ? `${vals.end_x}, ${vals.end_y}` : undefined,
        },
      ],
    });
  }

  if (toolId === 'node') {
    const opt = extractFirstBracketOpt(activeCode);
    const idMatch = /\\node(?:\[[^\]]*\])?\s*\(([^()]+)\)/.exec(activeCode);
    const atMatch = /\bat\s*\(([^()]+)\)/.exec(activeCode);
    const braceBody = extractFirstBraceArg(activeCode, activeCode.indexOf('}'));
    const directBody = extractFirstBraceArg(activeCode, 0);
    return finish({
      lineNumber,
      tokenStart,
      tokenEnd,
      hoveredToken,
      categoryRu: 'Примитив TikZ',
      titleRu: `${spec.titleRu} (${spec.catalogId})`,
      signature: '\\node[<стили>] (<имя>) at (<x>,<y>) {<содержимое>};',
      summaryRu: spec.helpRu,
      ownedId: owned?.id,
      dependencyNoteRu: 'Пакет: tikz (при right=... of A требуется библиотека positioning)',
      arguments: [
        {
          name: 'x, y / позиционирование',
          typeRu: 'длина (cm | mm | pt | in)',
          constraintRu: 'Координаты после at (x,y) или ключ positioning',
          currentValue: vals ? `${vals.x}, ${vals.y}` : atMatch?.[1] ?? idMatch?.[1],
        },
        {
          name: 'mode / стили [...]',
          typeRu: 'text | math ($...$)',
          constraintRu: 'Режим текста или математики и рамка узла',
          currentValue: vals?.mode ?? opt,
        },
        {
          name: '{content}',
          typeRu: 'текст LaTeX без %',
          constraintRu: 'Сбалансированные скобки { }, символ % обязан быть экранирован \\%',
          currentValue: vals?.content ?? directBody ?? braceBody,
        },
      ],
    });
  }

  // Default: 'line'
  const coords = Array.from(activeCode.matchAll(/\(([^()]+)\)/g));
  return finish({
    lineNumber,
    tokenStart,
    tokenEnd,
    hoveredToken,
    categoryRu: 'Примитив TikZ',
    titleRu: `${spec.titleRu} (${spec.catalogId})`,
    signature: '\\draw (<start_x>,<start_y>) -- (<end_x>,<end_y>);',
    summaryRu: spec.helpRu,
    ownedId: owned?.id,
    dependencyNoteRu: 'Пакет: tikz (базовый оператор прямой линии --)',
    arguments: [
      {
        name: 'start_x, start_y',
        typeRu: 'длина (cm | mm | pt | in)',
        constraintRu: 'Первая точка сегмента пути',
        currentValue: vals ? `${vals.start_x}, ${vals.start_y}` : coords[0]?.[1],
      },
      {
        name: 'end_x, end_y',
        typeRu: 'длина (cm | mm | pt | in)',
        constraintRu: 'Конечная точка сегмента после оператора --',
        currentValue: vals ? `${vals.end_x}, ${vals.end_y}` : coords[1]?.[1],
      },
    ],
  });
}

/**
 * Pure hit-test resolver mapping (source, physicalLine 1-based, colIndex 0-based)
 * to structured LaTeX / TikZ primitive argument reference.
 * Mirrors native egui 0.33 `Galley::cursor_from_pos` -> `source_highlight::Span` lookup.
 */
export function resolveTexCommandHover(
  source: string,
  lineNumber: number,
  colIndex: number
): TexCommandHoverInfo | null {
  const rawLines = source.split(/\r?\n/);
  if (lineNumber < 1 || lineNumber > rawLines.length) return null;
  const line = rawLines[lineNumber - 1];
  if (colIndex < 0 || colIndex >= line.length) return null;

  const spans = tokenizeTexLine(line);
  const hitSpan = spans.find((sp) => colIndex >= sp.start && colIndex < sp.end);
  if (!hitSpan) return null;

  // Never show tooltips on comments or % tikzarium:n1: hex metadata
  if (hitSpan.kind === 'comment' || hitSpan.kind === 'metadata') {
    return null;
  }

  const markerIdx = line.indexOf(OWNERSHIP_MARKER);
  const activeCode = markerIdx !== -1 ? line.slice(0, markerIdx) : line;
  const owned = parseOwnedPayloadOnLine(line);
  const preamble = inspectPreambleConnections(source);
  const arrowsMetaLoaded = preamble.tikzLibraries.some((l) => l.name === 'arrows.meta');

  // 1. Check if cursor is on \begin{env} or \end{env}
  if (
    hitSpan.kind === 'environment' ||
    (hitSpan.kind === 'command' && (hitSpan.text === '\\begin' || hitSpan.text === '\\end'))
  ) {
    const envMatch = /\\(begin|end)\{([^}]+)\}/.exec(activeCode);
    const envName = envMatch?.[2] ?? hitSpan.text;
    const opt = extractFirstBracketOpt(activeCode, activeCode.indexOf('}') + 1);
    if (envName === 'tikzpicture') {
      return withAnchorMeta(
        {
          lineNumber,
          tokenStart: hitSpan.start,
          tokenEnd: hitSpan.end,
          hoveredToken: `\\${envMatch?.[1] ?? 'begin'}{tikzpicture}`,
          categoryRu: 'Окружение TikZ',
          titleRu: 'Холст рисунка tikzpicture',
          signature: '\\begin{tikzpicture}[<опции_схемы>] … \\end{tikzpicture}',
          summaryRu: 'Создаёт локальную координатную систему PGF/TikZ для команд \\draw, \\node и макросов.',
          dependencyNoteRu: 'Требует \\usepackage{tikz} в преамбуле документа',
          arguments: [
            {
              name: '{tikzpicture}',
              typeRu: 'имя окружения',
              constraintRu: 'Обязано закрываться парным \\end{tikzpicture}',
              currentValue: 'tikzpicture',
            },
            {
              name: '[<опции_схемы>]',
              typeRu: 'ключи PGFKeys (необяз.)',
              constraintRu: 'Глобальные стили стрелок, узлов и масштаба (например >=Stealth, scale=1.2)',
              currentValue: opt ?? 'по умолчанию (1 ед. = 1cm)',
            },
          ],
        },
        'pgf.env.tikzpicture'
      );
    }

    if (envName === 'scope') {
      return withAnchorMeta(
        {
          lineNumber,
          tokenStart: hitSpan.start,
          tokenEnd: hitSpan.end,
          hoveredToken: `\\${envMatch?.[1] ?? 'begin'}{scope}`,
          categoryRu: 'Окружение TikZ',
          titleRu: 'Локальная группа трансформаций и отсечения (scope)',
          signature: '\\begin{scope}[shift={(dx,dy)}, rotate=<deg>, scale=<k>] … \\end{scope}',
          summaryRu: 'Изолирует локальные стили, сдвиги координат и области отсечения \\clip внутри группы.',
          dependencyNoteRu: 'Ядро PGF/TikZ (§12.3.1)',
          arguments: [
            {
              name: '[<трансформации>]',
              typeRu: 'shift | rotate | scale | opacity',
              constraintRu: 'Применяются только до закрывающего \\end{scope}',
              currentValue: opt ?? 'локальная область (например для \\clip)',
            },
          ],
        },
        'pgf.scope.transforms'
      );
    }

    const envAnchor = resolveManualAnchorForToken(envName);
    if (envAnchor) {
      const docMeta = resolveManualDocumentMeta(envAnchor.docId);
      return withAnchorMeta(
        {
          lineNumber,
          tokenStart: hitSpan.start,
          tokenEnd: hitSpan.end,
          hoveredToken: `\\${envMatch?.[1] ?? 'begin'}{${envName}}`,
          categoryRu: 'Пакет расширения TikZ',
          titleRu: envAnchor.titleRu,
          signature: envAnchor.originalDeclarationEn,
          summaryRu: envAnchor.russianCommentaryRu,
          dependencyNoteRu: `Руководство: ${docMeta.filename} · проверьте \\usepackage в преамбуле рисунка`,
          arguments: [
            {
              name: `[<опции ${envName}>]`,
              typeRu: 'ключи окружения расширения',
              constraintRu: `См. прямую точку ${envAnchor.section} (стр. ${envAnchor.page})`,
              currentValue: opt ?? 'базовые настройки пакета',
            },
          ],
        },
        envAnchor.id
      );
    }

    return {
      lineNumber,
      tokenStart: hitSpan.start,
      tokenEnd: hitSpan.end,
      hoveredToken: `\\${envMatch?.[1] ?? 'begin'}{${envName}}`,
      categoryRu: 'Преамбула LaTeX',
      titleRu: `Тело документа (${envName})`,
      signature: '\\begin{document} … \\end{document}',
      summaryRu: 'Отделяет преамбулу пакетов (\\usepackage, \\usetikzlibrary) от печатного содержимого.',
      dependencyNoteRu: 'Граница вставки деклараций преамбулы TikZarium (N2)',
      arguments: [
        {
          name: '{document}',
          typeRu: 'корневое окружение',
          constraintRu: 'Автоподключение библиотек вставляет \\usetikzlibrary строго выше этой строки',
          currentValue: envName,
        },
      ],
    };
  }

  // 2. Check TikZ path keywords/operators (`circle`, `rectangle`, `controls`, `--`, `..`, `Stealth`) on \draw/\node lines
  const lineTool = detectPrimitiveToolFromLine(activeCode, owned?.tool);
  if (lineTool && hitSpan.kind !== 'command') {
    if (hitSpan.kind === 'operator' && (hitSpan.text === '--' || hitSpan.text === '..' || hitSpan.text === '->')) {
      return buildPrimitiveHover(
        lineTool,
        lineNumber,
        hitSpan.start,
        hitSpan.end,
        hitSpan.text,
        activeCode,
        owned,
        arrowsMetaLoaded
      );
    }
    if (hitSpan.kind === 'plain' || hitSpan.kind === 'option') {
      PATH_KEYWORD_REGEX.lastIndex = 0;
      let kwMatch: RegExpExecArray | null;
      while ((kwMatch = PATH_KEYWORD_REGEX.exec(hitSpan.text)) !== null) {
        const kwStart = hitSpan.start + kwMatch.index;
        const kwEnd = kwStart + kwMatch[0].length;
        if (colIndex >= kwStart && colIndex < kwEnd) {
          return buildPrimitiveHover(
            lineTool,
            lineNumber,
            kwStart,
            kwEnd,
            kwMatch[0],
            activeCode,
            owned,
            arrowsMetaLoaded
          );
        }
      }
    }
    return null;
  }

  // 3. Handle \command tokens
  if (hitSpan.kind !== 'command') return null;
  const cmd = hitSpan.text;

  if (cmd === '\\draw' || cmd === '\\node') {
    const resolvedTool = lineTool ?? (cmd === '\\node' ? 'node' : 'line');
    return buildPrimitiveHover(
      resolvedTool,
      lineNumber,
      hitSpan.start,
      hitSpan.end,
      cmd,
      activeCode,
      owned,
      arrowsMetaLoaded
    );
  }

  if (cmd === '\\documentclass') {
    const opt = extractFirstBracketOpt(activeCode);
    const cls = extractFirstBraceArg(activeCode);
    return {
      lineNumber,
      tokenStart: hitSpan.start,
      tokenEnd: hitSpan.end,
      hoveredToken: cmd,
      categoryRu: 'Преамбула LaTeX',
      titleRu: 'Класс документа LaTeX',
      signature: '\\documentclass[<опции>]{<класс>}',
      summaryRu: 'Задаёт формат листа. Для одиночных научных схем TikZ рекомендуется класс standalone.',
      dependencyNoteRu: 'Базовая команда ядра LaTeX2e',
      arguments: [
        {
          name: '[<опции>]',
          typeRu: 'параметры класса',
          constraintRu: 'Например border=6pt, tikz (отступ вокруг фигуры в PDF)',
          currentValue: opt ?? 'без опций',
        },
        {
          name: '{<класс>}',
          typeRu: 'standalone | article',
          constraintRu: 'Обязательный аргумент имени файла .cls',
          currentValue: cls,
        },
      ],
    };
  }

  if (cmd === '\\usepackage') {
    const opt = extractFirstBracketOpt(activeCode);
    const pkg = extractFirstBraceArg(activeCode);
    return {
      lineNumber,
      tokenStart: hitSpan.start,
      tokenEnd: hitSpan.end,
      hoveredToken: cmd,
      categoryRu: 'Преамбула LaTeX',
      titleRu: 'Подключение пакета LaTeX',
      signature: '\\usepackage[<опции>]{<пакет>}',
      summaryRu: 'Загружает стилевой пакет (.sty) из дистрибутива TeX Live / MiKTeX до \\begin{document}.',
      dependencyNoteRu: 'Проверяется утилитой kpsewhich в профиле подключений',
      arguments: [
        {
          name: '[<опции>]',
          typeRu: 'опции пакета (необяз.)',
          constraintRu: 'Передаются пакету при инициализации',
          currentValue: opt ?? '—',
        },
        {
          name: '{<пакет>}',
          typeRu: 'имя или список .sty',
          constraintRu: 'Например tikz, fontspec, unicode-math, pgfplots',
          currentValue: pkg,
        },
      ],
    };
  }

  if (cmd === '\\usetikzlibrary') {
    const libsRaw = extractFirstBraceArg(activeCode) ?? '';
    const libList = libsRaw
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    const knownCount = libList.filter((n) => TIKZ_LIBRARIES.some((k) => k.name === n)).length;
    const firstLibAnchor = libList.map((lib) => resolveManualAnchorForToken(lib)).find(Boolean);
    return withAnchorMeta(
      {
        lineNumber,
        tokenStart: hitSpan.start,
        tokenEnd: hitSpan.end,
        hoveredToken: cmd,
        categoryRu: 'Преамбула LaTeX',
        titleRu: 'Подключение библиотек PGF/TikZ',
        signature: '\\usetikzlibrary{<библиотека_1>,<библиотека_2>}',
        summaryRu: 'Активирует расширения синтаксиса TikZ (наконечники стрелок, вычисления координат, позиционирование).',
        dependencyNoteRu: `Распознано в каталоге TikZarium: ${knownCount} из ${libList.length || 1}`,
        arguments: [
          {
            name: '{<список_библиотек>}',
            typeRu: 'имена через запятую',
            constraintRu: 'Например arrows.meta, calc, positioning, fit, shapes.geometric',
            currentValue: libsRaw || undefined,
          },
        ],
      },
      firstLibAnchor?.id ?? 'pgf.lib.arrows.meta'
    );
  }

  if (
    cmd === '\\setmainfont' ||
    cmd === '\\setsansfont' ||
    cmd === '\\setmonofont' ||
    cmd === '\\setmathfont'
  ) {
    const fontName = extractFirstBraceArg(activeCode);
    const isMath = cmd === '\\setmathfont';
    return {
      lineNumber,
      tokenStart: hitSpan.start,
      tokenEnd: hitSpan.end,
      hoveredToken: cmd,
      categoryRu: 'Преамбула LaTeX',
      titleRu: isMath ? 'Математический OpenType-шрифт' : 'Основной OpenType/TTF шрифт текста',
      signature: `${cmd}[<опции>]{<имя_шрифта_или_файла>}`,
      summaryRu: isMath
        ? 'Назначает шрифт формул Unicode-математики (например latinmodern-math.otf) в движке XeLaTeX.'
        : 'Назначает системный шрифт с поддержкой кириллицы UTF-8 через пакет fontspec.',
      dependencyNoteRu: isMath ? 'Требует \\usepackage{unicode-math}' : 'Требует \\usepackage{fontspec} (движок XeLaTeX)',
      arguments: [
        {
          name: '{<шрифт>}',
          typeRu: 'системное имя / .otf',
          constraintRu: 'Шрифт должен содержать кириллические глифы (например DejaVu Serif)',
          currentValue: fontName,
        },
      ],
    };
  }

  if (cmd === '\\pgfplotsset') {
    const cfg = extractFirstBraceArg(activeCode);
    return withAnchorMeta(
      {
        lineNumber,
        tokenStart: hitSpan.start,
        tokenEnd: hitSpan.end,
        hoveredToken: cmd,
        categoryRu: 'Преамбула LaTeX',
        titleRu: 'Конфигурация пакета PGFPlots',
        signature: '\\pgfplotsset{compat=<версия>, <ключи>}',
        summaryRu: 'Фиксирует режим совместимости осей и масштабов научных графиков PGFPlots.',
        dependencyNoteRu: 'Требует \\usepackage{pgfplots}',
        arguments: [
          {
            name: '{compat=...}',
            typeRu: 'ключи PGFPlots',
            constraintRu: 'Рекомендуется явно указывать compat=1.18 для воспроизводимого PDF',
            currentValue: cfg,
          },
        ],
      },
      'ext.pgfplots.axis'
    );
  }

  // Core TikZ structural commands (\tikzset, \foreach, \coordinate, \clip, \fill, \filldraw, \path)
  if (
    cmd === '\\tikzset' ||
    cmd === '\\foreach' ||
    cmd === '\\coordinate' ||
    cmd === '\\clip' ||
    cmd === '\\fill' ||
    cmd === '\\filldraw' ||
    cmd === '\\path'
  ) {
    const coreAnchor =
      resolveManualAnchorForToken(cmd) ??
      (cmd === '\\clip' ? resolveManualAnchorById('pgf.scope.transforms') : resolveManualAnchorById('pgf.draw.line'));
    return withAnchorMeta(
      {
        lineNumber,
        tokenStart: hitSpan.start,
        tokenEnd: hitSpan.end,
        hoveredToken: cmd,
        categoryRu: cmd === '\\tikzset' ? 'Преамбула LaTeX' : 'Примитив TikZ',
        titleRu: coreAnchor.titleRu,
        signature: coreAnchor.originalDeclarationEn,
        summaryRu: coreAnchor.russianCommentaryRu,
        dependencyNoteRu: 'Базовое ядро PGF/TikZ',
        arguments: [
          {
            name: 'параметры строки',
            typeRu: 'выражение TikZ',
            constraintRu: `Прямая точка в руководстве: ${coreAnchor.section} (стр. ${coreAnchor.page})`,
            currentValue: activeCode.trim().slice(0, 64),
          },
        ],
      },
      coreAnchor.id
    );
  }

  // Extension package commands (\addplot, \chemfig, \arrow, \gate, \tkzDefPoint, \tdplotsetmaincoords, \ganttbar, etc.)
  const extAnchor = resolveManualAnchorForToken(cmd);
  if (extAnchor) {
    const docMeta = resolveManualDocumentMeta(extAnchor.docId);
    const opt = extractFirstBracketOpt(activeCode, hitSpan.end);
    const brace = extractFirstBraceArg(activeCode, hitSpan.end);
    return withAnchorMeta(
      {
        lineNumber,
        tokenStart: hitSpan.start,
        tokenEnd: hitSpan.end,
        hoveredToken: cmd,
        categoryRu: 'Пакет расширения TikZ',
        titleRu: extAnchor.titleRu,
        signature: extAnchor.originalDeclarationEn,
        summaryRu: extAnchor.russianCommentaryRu,
        dependencyNoteRu: `Оригинальный мануал: ${docMeta.filename} (${docMeta.version})`,
        arguments: [
          ...(opt
            ? [
                {
                  name: '[<опции>]',
                  typeRu: 'ключи PGFKeys',
                  constraintRu: 'Модификаторы стиля / направления / осей',
                  currentValue: opt,
                },
              ]
            : []),
          ...(brace
            ? [
                {
                  name: '{<аргумент>}',
                  typeRu: 'параметр макроса',
                  constraintRu: `См. спецификацию в ${docMeta.filename} ${extAnchor.section}`,
                  currentValue: brace.length > 52 ? `${brace.slice(0, 52)}…` : brace,
                },
              ]
            : []),
        ],
      },
      extAnchor.id
    );
  }

  if (cmd === '\\newcommand') {
    const m = /\\newcommand\{\\(\w+)\}(?:\[(\d+)\])?/.exec(activeCode);
    return {
      lineNumber,
      tokenStart: hitSpan.start,
      tokenEnd: hitSpan.end,
      hoveredToken: cmd,
      categoryRu: 'Макрос автора',
      titleRu: 'Объявление пользовательского макроса LaTeX',
      signature: '\\newcommand{\\<имя>}[<число_арг>]{<тело_макроса>}',
      summaryRu: 'Создаёт собственную команду автора. Патчер TikZarium гарантированно не изменяет эту строку.',
      dependencyNoteRu: 'Вычисляется внешним компилятором XeLaTeX (контракт U-G1)',
      arguments: [
        {
          name: '{\\<имя>}',
          typeRu: 'идентификатор макроса',
          constraintRu: 'Новое имя управляющей последовательности',
          currentValue: m ? `\\${m[1]}` : undefined,
        },
        {
          name: '[<число_арг>]',
          typeRu: '0..9 (необяз.)',
          constraintRu: 'Количество параметров #1, #2… внутри определения',
          currentValue: m?.[2] ?? '0 (без аргументов)',
        },
      ],
    };
  }

  // 4. Check user-declared macros in the current buffer (e.g. \myOpticsNote)
  const userMacros = scanUserDeclaredMacros(source);
  const declared = userMacros.get(cmd);
  if (declared) {
    const callArg = extractFirstBraceArg(activeCode, hitSpan.end);
    return {
      lineNumber,
      tokenStart: hitSpan.start,
      tokenEnd: hitSpan.end,
      hoveredToken: cmd,
      categoryRu: 'Макрос автора',
      titleRu: `Макрос документа ${declared.name}`,
      signature:
        declared.argCount > 0
          ? `${declared.name}${Array.from({ length: declared.argCount }, (_, i) => `{<#${i + 1}>}`).join('')}`
          : declared.name,
      summaryRu: `Пользовательский макрос, объявленный в строке ${declared.lineNumber}: ${declared.bodyPreview}`,
      dependencyNoteRu: `Локальное объявление \\newcommand (строка ${declared.lineNumber})`,
      arguments:
        declared.argCount > 0
          ? [
              {
                name: `#1..#${declared.argCount}`,
                typeRu: `${declared.argCount} обязат. арг.`,
                constraintRu: 'Передаётся в фигурных скобках {…} при вызове макроса',
                currentValue: callArg,
              },
            ]
          : [
              {
                name: '(без аргументов)',
                typeRu: 'макрос-константа',
                constraintRu: 'Подставляется как есть при компиляции XeLaTeX',
              },
            ],
    };
  }

  // Ignore harmless standard formatting macros inside nodes/math unless genuinely unknown
  if (KNOWN_STANDARD_MACROS.has(cmd)) {
    return {
      lineNumber,
      tokenStart: hitSpan.start,
      tokenEnd: hitSpan.end,
      hoveredToken: cmd,
      categoryRu: 'Преамбула LaTeX',
      titleRu: `Стандартная команда TeX ${cmd}`,
      signature: cmd === '\\text' ? '\\text{<прямой_текст_в_формуле>}' : `${cmd}`,
      summaryRu:
        cmd === '\\text'
          ? 'Переключает текстовый шрифт кириллицы внутри математического режима $...$.'
          : 'Стандартная типографская или математическая команда TeX/LaTeX.',
      dependencyNoteRu: 'Встроено в LaTeX / unicode-math',
      arguments:
        cmd === '\\text'
          ? [
              {
                name: '{<текст>}',
                typeRu: 'строка UTF-8',
                constraintRu: 'Корректно рендерит русские единицы измерения (например \\text{мм})',
                currentValue: extractFirstBraceArg(activeCode, hitSpan.end),
              },
            ]
          : [],
    };
  }

  // 5. Unknown / potentially broken control sequence (e.g. \undefinedTikzCommand)
  return {
    lineNumber,
    tokenStart: hitSpan.start,
    tokenEnd: hitSpan.end,
    hoveredToken: cmd,
    categoryRu: 'Неизвестная команда',
    titleRu: `Нераспознанная команда ${cmd}`,
    signature: `${cmd} …`,
    summaryRu:
      'Команда не входит в каталог базовых примитивов/расширений TikZarium и не объявлена через \\newcommand в этом файле.',
    dependencyNoteRu: 'Если макрос не определён во внешнем пакете, XeLaTeX остановится с Undefined control sequence',
    isError: true,
    arguments: [],
  };
}

/**
 * Resolves contextual help + direct PDF manual anchor for a textarea caret offset (`selectionStart`),
 * checking the exact character under the caret first, then falling back to the primary command/environment
 * on the active line so the live Caret Syntax Bar stays informative while editing coordinates or options.
 */
export function resolveCaretTexHelp(
  source: string,
  caretOffset: number,
  fullDocumentForContext?: string
): TexCommandHoverInfo | null {
  if (!source) return null;
  const clamped = Math.max(0, Math.min(caretOffset, source.length));
  const before = source.slice(0, clamped);
  const linesBefore = before.split(/\r?\n/);
  const lineNumber = linesBefore.length;
  const colIndex = linesBefore[linesBefore.length - 1].length;

  const rawLines = source.split(/\r?\n/);
  const activeLine = rawLines[lineNumber - 1] ?? '';
  if (!activeLine.trim() || activeLine.trim().startsWith('%')) {
    return null;
  }

  // If fullDocumentForContext is passed (e.g. when editing split Figure Body while preamble lives in Window 1),
  // prepend preamble lines conceptually or check direct line in contextual document.
  const lookupDoc = fullDocumentForContext
    ? `${fullDocumentForContext.split('\\begin{document}')[0] ?? ''}\\begin{document}\n${source}\n\\end{document}`
    : source;
  const prefixLinesCount = fullDocumentForContext
    ? (fullDocumentForContext.split('\\begin{document}')[0] ?? '').split(/\r?\n/).length
    : 0;
  const targetLineInLookup = fullDocumentForContext ? prefixLinesCount + lineNumber : lineNumber;

  // 1. Try exact colIndex or colIndex - 1 (when caret sits right at end of \draw|)
  for (const probeCol of [colIndex, Math.max(0, colIndex - 1)]) {
    const exact = resolveTexCommandHover(lookupDoc, targetLineInLookup, probeCol);
    if (exact) {
      return { ...exact, lineNumber };
    }
  }

  // 2. Fallback: find the primary command or environment token on the current line
  const spans = tokenizeTexLine(activeLine);
  for (const sp of spans) {
    if (sp.kind === 'command' || sp.kind === 'environment') {
      const fallback = resolveTexCommandHover(lookupDoc, targetLineInLookup, sp.start);
      if (fallback) {
        return { ...fallback, lineNumber };
      }
    }
  }

  return null;
}

