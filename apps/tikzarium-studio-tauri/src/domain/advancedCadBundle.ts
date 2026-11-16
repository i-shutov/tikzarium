import {
  OWNERSHIP_MARKER,
  applyOwnedPrimitivePatch,
  insertOwnedPrimitiveIntoSource,
  parseDimensionToCm,
  parseOwnedPrimitives,
  parsePolyPointsList,
  proposeLibraryConnect,
  serializePolyPointsList,
} from './tikzEngine';
import type { OwnedPrimitive } from './tikzEngine';
import { extractTikzpictureBlock } from './ergonomicsBundle';

function fmtCm(v: number): string {
  return `${(Math.round(v * 100) / 100).toFixed(2)}cm`;
}

// ============================================================================
// P36: Closed Polygons (-- cycle) & Multi-Vertex Contours (Prisms, Wedges, Slits)
// ============================================================================

export interface PolygonPresetSpec {
  id: string;
  titleRu: string;
  domainRu: string;
  closed: boolean;
  defaultHatch?: string;
  defaultFill?: string;
  pointsCm: { xCm: number; yCm: number }[];
}

export const POLYGON_PRESETS: PolygonPresetSpec[] = [
  {
    id: 'optics-prism-60',
    titleRu: 'Дисперсионная призма 60°',
    domainRu: 'Оптика',
    closed: true,
    defaultHatch: 'north west lines',
    pointsCm: [
      { xCm: 2.1, yCm: 1.0 },
      { xCm: 3.7, yCm: 1.0 },
      { xCm: 2.9, yCm: 2.39 },
    ],
  },
  {
    id: 'mechanics-wedge',
    titleRu: 'Наклонный клин α = 30°',
    domainRu: 'Механика',
    closed: true,
    defaultHatch: 'north east lines',
    pointsCm: [
      { xCm: 1.2, yCm: 0.9 },
      { xCm: 4.0, yCm: 0.9 },
      { xCm: 1.2, yCm: 2.52 },
    ],
  },
  {
    id: 'optics-beam-cone',
    titleRu: 'Сходящийся конус пучка',
    domainRu: 'Лазеры',
    closed: true,
    defaultFill: 'cyan!10',
    pointsCm: [
      { xCm: 1.4, yCm: 2.55 },
      { xCm: 4.5, yCm: 1.85 },
      { xCm: 1.4, yCm: 1.15 },
    ],
  },
  {
    id: 'crystal-hexagon',
    titleRu: 'Гексагональная ячейка / резонатор',
    domainRu: 'Твёрдое тело',
    closed: true,
    defaultFill: 'blue!8',
    pointsCm: [
      { xCm: 3.1, yCm: 2.7 },
      { xCm: 3.88, yCm: 2.25 },
      { xCm: 3.88, yCm: 1.35 },
      { xCm: 3.1, yCm: 0.9 },
      { xCm: 2.32, yCm: 1.35 },
      { xCm: 2.32, yCm: 2.25 },
    ],
  },
  {
    id: 'waveguide-step',
    titleRu: 'Ступенчатый профиль потенциала U(x)',
    domainRu: 'Квантовая физика',
    closed: false,
    pointsCm: [
      { xCm: 0.9, yCm: 1.1 },
      { xCm: 2.1, yCm: 1.1 },
      { xCm: 2.1, yCm: 2.3 },
      { xCm: 3.5, yCm: 2.3 },
      { xCm: 3.5, yCm: 1.45 },
      { xCm: 4.8, yCm: 1.45 },
    ],
  },
];

export function insertPolygonContourIntoSource(
  source: string,
  pointsCm: { xCm: number; yCm: number }[],
  closed: boolean,
  options?: {
    hatchPattern?: string;
    fillColor?: string;
    strokeColor?: string;
    strokeWidth?: string;
  }
): { nextSource: string; newId: number; insertedLine: number } {
  const safePts =
    pointsCm.length >= 2
      ? pointsCm
      : [
          { xCm: 1.5, yCm: 1.0 },
          { xCm: 3.1, yCm: 1.0 },
          { xCm: 2.3, yCm: 2.2 },
        ];
  let cur = source;
  if (closed && options?.hatchPattern) {
    const lib = proposeLibraryConnect(cur, 'patterns');
    if (lib.ok) cur = lib.nextSource;
  }

  const values: Record<string, string> = {
    start_x: fmtCm(safePts[0].xCm),
    start_y: fmtCm(safePts[0].yCm),
    end_x: fmtCm(safePts[1].xCm),
    end_y: fmtCm(safePts[1].yCm),
    poly_points: serializePolyPointsList(safePts),
    stroke_width: options?.strokeWidth || 'semithick',
  };
  if (closed) values.poly_closed = 'cycle';
  if (closed && options?.hatchPattern) values.hatch_pattern = options.hatchPattern;
  else if (closed && options?.fillColor) values.fill_color = options.fillColor;
  if (options?.strokeColor) values.stroke_color = options.strokeColor;

  return insertOwnedPrimitiveIntoSource(cur, 'line', values);
}

// ============================================================================
// P37: Smart Geometry Solver — Intersections (intersections) & Normals (calc ∟)
// ============================================================================

export interface GeometryConstructResult {
  ok: boolean;
  kindRu: string;
  pointsCm: { x: number; y: number; label: string }[];
  nextSource: string;
  insertedIds: number[];
  summaryRu: string;
}

function lineLineIntersection(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  x3: number,
  y3: number,
  x4: number,
  y4: number
): { x: number; y: number } | null {
  const denom = (x1 - x2) * (y3 - y4) - (y1 - y2) * (x3 - x4);
  if (Math.abs(denom) < 1e-7) return null;
  const px = ((x1 * y2 - y1 * x2) * (x3 - x4) - (x1 - x2) * (x3 * y4 - y3 * x4)) / denom;
  const py = ((x1 * y2 - y1 * x2) * (y3 - y4) - (y1 - y2) * (x3 * y4 - y3 * x4)) / denom;
  if (!Number.isFinite(px) || !Number.isFinite(py) || Math.abs(px) > 40 || Math.abs(py) > 40) {
    return null;
  }
  return { x: +(px.toFixed(2)), y: +(py.toFixed(2)) };
}

function lineCircleIntersections(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  cx: number,
  cy: number,
  r: number
): { x: number; y: number }[] {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const a = dx * dx + dy * dy;
  if (a < 1e-8) return [];
  const fx = x1 - cx;
  const fy = y1 - cy;
  const b = 2 * (fx * dx + fy * dy);
  const c = fx * fx + fy * fy - r * r;
  const disc = b * b - 4 * a * c;
  if (disc < -1e-6) return [];
  if (Math.abs(disc) <= 1e-6) {
    const t = -b / (2 * a);
    return [{ x: +((x1 + t * dx).toFixed(2)), y: +((y1 + t * dy).toFixed(2)) }];
  }
  const sq = Math.sqrt(Math.max(0, disc));
  const t1 = (-b - sq) / (2 * a);
  const t2 = (-b + sq) / (2 * a);
  return [
    { x: +((x1 + t1 * dx).toFixed(2)), y: +((y1 + t1 * dy).toFixed(2)) },
    { x: +((x1 + t2 * dx).toFixed(2)), y: +((y1 + t2 * dy).toFixed(2)) },
  ];
}

function circleCircleIntersections(
  x0: number,
  y0: number,
  r0: number,
  x1: number,
  y1: number,
  r1: number
): { x: number; y: number }[] {
  const dx = x1 - x0;
  const dy = y1 - y0;
  const d = Math.hypot(dx, dy);
  if (d > r0 + r1 + 1e-6 || d < Math.abs(r0 - r1) - 1e-6 || d < 1e-7) return [];
  const a = (r0 * r0 - r1 * r1 + d * d) / (2 * d);
  const hSq = Math.max(0, r0 * r0 - a * a);
  const h = Math.sqrt(hSq);
  const xm = x0 + (a * dx) / d;
  const ym = y0 + (a * dy) / d;
  if (h < 1e-5) {
    return [{ x: +(xm.toFixed(2)), y: +(ym.toFixed(2)) }];
  }
  const rx = (-dy * h) / d;
  const ry = (dx * h) / d;
  return [
    { x: +((xm + rx).toFixed(2)), y: +((ym + ry).toFixed(2)) },
    { x: +((xm - rx).toFixed(2)), y: +((ym - ry).toFixed(2)) },
  ];
}

export function constructIntersectionOrPerpendicularInSource(
  source: string,
  primitiveIds: number[],
  labelPrefix = 'I'
): GeometryConstructResult {
  const all = parseOwnedPrimitives(source);
  const selected = all.filter((p) => primitiveIds.includes(p.id));
  if (selected.length < 2) {
    return {
      ok: false,
      kindRu: 'Недостаточно объектов',
      pointsCm: [],
      nextSource: source,
      insertedIds: [],
      summaryRu: 'Выделите 2 объекта (линии, окружности или узел + линию) для построения пересечения или перпендикуляра.',
    };
  }

  let cur = source;
  const lCalc = proposeLibraryConnect(cur, 'calc');
  if (lCalc.ok) cur = lCalc.nextSource;
  const lInter = proposeLibraryConnect(cur, 'intersections');
  if (lInter.ok) cur = lInter.nextSource;

  const [a, b] = selected;
  const isSeg = (p: OwnedPrimitive) => (p.tool === 'line' || p.tool === 'arrow') && !p.values.poly_points;
  const insertedIds: number[] = [];

  // Case 1: Point/Node + Line/Arrow -> Perpendicular foot ((A)!(P)!(B)) + 90° right-angle mark ∟
  if ((a.tool === 'node' && isSeg(b)) || (b.tool === 'node' && isSeg(a))) {
    const nodeP = a.tool === 'node' ? a : b;
    const segL = a.tool === 'node' ? b : a;
    const px = parseDimensionToCm(nodeP.values.x) ?? 2;
    const py = parseDimensionToCm(nodeP.values.y) ?? 2;
    const x1 = parseDimensionToCm(segL.values.start_x) ?? 0;
    const y1 = parseDimensionToCm(segL.values.start_y) ?? 0;
    const x2 = parseDimensionToCm(segL.values.end_x) ?? 4;
    const y2 = parseDimensionToCm(segL.values.end_y) ?? 0;

    const dx = x2 - x1;
    const dy = y2 - y1;
    const lenSq = Math.max(1e-6, dx * dx + dy * dy);
    const t = ((px - x1) * dx + (py - y1) * dy) / lenSq;
    const hx = +(x1 + t * dx).toFixed(2);
    const hy = +(y1 + t * dy).toFixed(2);

    // Insert dashed perpendicular segment P -> H
    const normSeg = insertOwnedPrimitiveIntoSource(cur, 'line', {
      start_x: fmtCm(px),
      start_y: fmtCm(py),
      end_x: fmtCm(hx),
      end_y: fmtCm(hy),
      line_style: 'dashed',
      stroke_width: 'thin',
      stroke_color: 'teal!80!black',
    });
    cur = normSeg.nextSource;
    insertedIds.push(normSeg.newId);

    // Build ГОСТ 90-degree right-angle corner mark (0.18cm square)
    const segLen = Math.hypot(dx, dy);
    const pLen = Math.hypot(px - hx, py - hy);
    if (segLen > 0.05 && pLen > 0.05) {
      const ux = (dx / segLen) * 0.18;
      const uy = (dy / segLen) * 0.18;
      const vx = ((px - hx) / pLen) * 0.18;
      const vy = ((py - hy) / pLen) * 0.18;
      const sqPts = [
        { xCm: +(hx + ux).toFixed(2), yCm: +(hy + uy).toFixed(2) },
        { xCm: +(hx + ux + vx).toFixed(2), yCm: +(hy + uy + vy).toFixed(2) },
        { xCm: +(hx + vx).toFixed(2), yCm: +(hy + vy).toFixed(2) },
      ];
      const markRes = insertPolygonContourIntoSource(cur, sqPts, false, {
        strokeColor: 'teal!80!black',
        strokeWidth: 'thin',
      });
      cur = markRes.nextSource;
      insertedIds.push(markRes.newId);
    }

    // Foot point marker H
    const footMarker = insertOwnedPrimitiveIntoSource(cur, 'circle', {
      center_x: fmtCm(hx),
      center_y: fmtCm(hy),
      radius: '0.07cm',
      stroke_color: 'teal!80!black',
      fill_color: 'emerald!10',
    });
    cur = footMarker.nextSource;
    insertedIds.push(footMarker.newId);

    const footNode = insertOwnedPrimitiveIntoSource(cur, 'node', {
      x: fmtCm(hx + 0.22),
      y: fmtCm(hy - 0.22),
      mode: 'math',
      content: 'H_\\perp',
      node_id: `H_${footMarker.newId}`,
    });
    cur = footNode.nextSource;
    insertedIds.push(footNode.newId);

    return {
      ok: true,
      kindRu: 'Перпендикуляр calc ((A)!(P)!(B)) + знак 90°',
      pointsCm: [{ x: hx, y: hy, label: 'H_\\perp' }],
      nextSource: cur,
      insertedIds,
      summaryRu: `Опущен перпендикуляр в точку H(${hx.toFixed(2)}, ${hy.toFixed(2)} см) со знаком прямого угла 90° (P37).`,
    };
  }

  // Compute intersections for Line∩Line, Line∩Circle, Circle∩Circle
  let pts: { x: number; y: number }[] = [];
  let kindRu = 'Пересечение intersections';

  if (isSeg(a) && isSeg(b)) {
    const hit = lineLineIntersection(
      parseDimensionToCm(a.values.start_x) ?? 0,
      parseDimensionToCm(a.values.start_y) ?? 0,
      parseDimensionToCm(a.values.end_x) ?? 1,
      parseDimensionToCm(a.values.end_y) ?? 1,
      parseDimensionToCm(b.values.start_x) ?? 0,
      parseDimensionToCm(b.values.start_y) ?? 1,
      parseDimensionToCm(b.values.end_x) ?? 1,
      parseDimensionToCm(b.values.end_y) ?? 0
    );
    if (hit) pts = [hit];
    kindRu = 'Пересечение двух прямых (intersections)';
  } else if ((isSeg(a) && b.tool === 'circle') || (a.tool === 'circle' && isSeg(b))) {
    const seg = isSeg(a) ? a : b;
    const cir = a.tool === 'circle' ? a : b;
    pts = lineCircleIntersections(
      parseDimensionToCm(seg.values.start_x) ?? 0,
      parseDimensionToCm(seg.values.start_y) ?? 0,
      parseDimensionToCm(seg.values.end_x) ?? 1,
      parseDimensionToCm(seg.values.end_y) ?? 1,
      parseDimensionToCm(cir.values.center_x) ?? 2,
      parseDimensionToCm(cir.values.center_y) ?? 1.5,
      parseDimensionToCm(cir.values.radius) ?? 0.6
    );
    kindRu = 'Пересечение луча и окружности';
  } else if (a.tool === 'circle' && b.tool === 'circle') {
    pts = circleCircleIntersections(
      parseDimensionToCm(a.values.center_x) ?? 1.5,
      parseDimensionToCm(a.values.center_y) ?? 1.5,
      parseDimensionToCm(a.values.radius) ?? 0.7,
      parseDimensionToCm(b.values.center_x) ?? 2.3,
      parseDimensionToCm(b.values.center_y) ?? 1.5,
      parseDimensionToCm(b.values.radius) ?? 0.7
    );
    kindRu = 'Пересечение двух окружностей';
  }

  if (pts.length === 0) {
    return {
      ok: false,
      kindRu,
      pointsCm: [],
      nextSource: source,
      insertedIds: [],
      summaryRu: 'Выбранные фигуры не пересекаются (параллельны или разнесены на плоскости).',
    };
  }

  const labeledPts: { x: number; y: number; label: string }[] = [];
  pts.forEach((pt, idx) => {
    const lbl = pts.length > 1 ? `${labelPrefix}_${idx + 1}` : labelPrefix;
    labeledPts.push({ x: pt.x, y: pt.y, label: lbl });

    const dotRes = insertOwnedPrimitiveIntoSource(cur, 'circle', {
      center_x: fmtCm(pt.x),
      center_y: fmtCm(pt.y),
      radius: '0.07cm',
      stroke_color: 'oiVermilion',
      fill_color: 'rose!10',
    });
    cur = dotRes.nextSource;
    insertedIds.push(dotRes.newId);

    const nodeRes = insertOwnedPrimitiveIntoSource(cur, 'node', {
      x: fmtCm(pt.x + 0.18),
      y: fmtCm(pt.y + 0.24),
      mode: 'math',
      content: lbl,
      node_id: `${labelPrefix}${dotRes.newId}`,
    });
    cur = nodeRes.nextSource;
    insertedIds.push(nodeRes.newId);
  });

  return {
    ok: true,
    kindRu,
    pointsCm: labeledPts,
    nextSource: cur,
    insertedIds,
    summaryRu: `Найдено точек пересечения: ${pts.length} (${labeledPts
      .map((p) => `${p.label}(${p.x.toFixed(2)}, ${p.y.toFixed(2)} см)`)
      .join(', ')}) · P37.`,
  };
}

// ============================================================================
// P38 & P39: ГОСТ Vector Hatchings (patterns) & Path Decorations (brace / snake)
// ============================================================================

export interface GostHatchSpec {
  id: string;
  labelRu: string;
  gostMaterialRu: string;
}

export const GOST_HATCH_SPECS: GostHatchSpec[] = [
  { id: '', labelRu: 'Без штриховки', gostMaterialRu: 'Обычная заливка / пусто' },
  { id: 'north east lines', labelRu: 'Штриховка 45° (↗)', gostMaterialRu: 'Металлы и твёрдые тела (ГОСТ 2.306)' },
  { id: 'north west lines', labelRu: 'Контр-штриховка 135° (↖)', gostMaterialRu: 'Смежная деталь / оптическое стекло' },
  { id: 'crosshatch', labelRu: 'Перекрёстная сетка (╳)', gostMaterialRu: 'Диэлектрики, керамика, изоляторы' },
  { id: 'dots', labelRu: 'Точечное заполнение (⋯)', gostMaterialRu: 'Сыпучие среды, кремний, песок' },
  { id: 'horizontal lines', labelRu: 'Горизонтальный штрих (≡)', gostMaterialRu: 'Жидкости и уровни электролита' },
];

export interface PathDecorationSpec {
  id: string;
  labelRu: string;
  tikzLibrary: string;
}

export const PATH_DECORATION_SPECS: PathDecorationSpec[] = [
  { id: '', labelRu: 'Без декорации (прямой путь)', tikzLibrary: '' },
  { id: 'brace', labelRu: 'Фигурная скобка сверху {', tikzLibrary: 'decorations.pathreplacing' },
  { id: 'brace-mirror', labelRu: 'Фигурная скобка снизу }', tikzLibrary: 'decorations.pathreplacing' },
  { id: 'snake', labelRu: 'Фотонная / акустическая волна ~', tikzLibrary: 'decorations.pathmorphing' },
  { id: 'zigzag', labelRu: 'Зигзаг резистора / разряда ⋀⋁', tikzLibrary: 'decorations.pathmorphing' },
  { id: 'coil', labelRu: 'Витая пружина / индуктивность ➿', tikzLibrary: 'decorations.pathmorphing' },
];

export function buildSvgDecorationPath(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  kind: string
): string {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const len = Math.hypot(dx, dy);
  if (len < 4) return `M ${x1} ${y1} L ${x2} ${y2}`;
  const ux = dx / len;
  const uy = dy / len;
  // Normal pointing "above" in screen SVG coords
  const sign = kind === 'brace-mirror' ? -1 : 1;
  const nx = uy * sign;
  const ny = -ux * sign;

  if (kind === 'brace' || kind === 'brace-mirror') {
    const amp = Math.min(10, Math.max(5, len * 0.08));
    const p1x = x1 + nx * amp;
    const p1y = y1 + ny * amp;
    const midX = (x1 + x2) / 2;
    const midY = (y1 + y2) / 2;
    const tipX = midX + nx * (amp * 1.9);
    const tipY = midY + ny * (amp * 1.9);
    const m1x = midX - ux * amp + nx * amp;
    const m1y = midY - uy * amp + ny * amp;
    const m2x = midX + ux * amp + nx * amp;
    const m2y = midY + uy * amp + ny * amp;
    const p2x = x2 + nx * amp;
    const p2y = y2 + ny * amp;
    return [
      `M ${x1.toFixed(1)} ${y1.toFixed(1)}`,
      `Q ${(x1 + nx * amp).toFixed(1)} ${(y1 + ny * amp).toFixed(1)} ${(p1x + ux * amp).toFixed(1)} ${(p1y + uy * amp).toFixed(1)}`,
      `L ${m1x.toFixed(1)} ${m1y.toFixed(1)}`,
      `Q ${midX.toFixed(1)} ${(midY + ny * amp).toFixed(1)} ${tipX.toFixed(1)} ${tipY.toFixed(1)}`,
      `Q ${midX.toFixed(1)} ${(midY + ny * amp).toFixed(1)} ${m2x.toFixed(1)} ${m2y.toFixed(1)}`,
      `L ${(p2x - ux * amp).toFixed(1)} ${(p2y - uy * amp).toFixed(1)}`,
      `Q ${p2x.toFixed(1)} ${p2y.toFixed(1)} ${x2.toFixed(1)} ${y2.toFixed(1)}`,
    ].join(' ');
  }

  // snake, zigzag, or coil along segment
  const stepPx = kind === 'coil' ? 9 : 10;
  const segments = Math.max(4, Math.round(len / stepPx));
  const amp = kind === 'coil' ? 5.5 : 4.2;
  const parts: string[] = [`M ${x1.toFixed(1)} ${y1.toFixed(1)}`];

  if (kind === 'zigzag') {
    for (let i = 1; i < segments; i++) {
      const t = i / segments;
      const side = i % 2 === 1 ? 1 : -1;
      const px = x1 + dx * t + nx * amp * side;
      const py = y1 + dy * t + ny * amp * side;
      parts.push(`L ${px.toFixed(1)} ${py.toFixed(1)}`);
    }
    parts.push(`L ${x2.toFixed(1)} ${y2.toFixed(1)}`);
    return parts.join(' ');
  }

  // Sinusoidal wave for snake / coil
  const samples = segments * 4;
  for (let i = 1; i <= samples; i++) {
    const t = i / samples;
    const phase = t * segments * Math.PI;
    const offset = Math.sin(phase) * amp;
    const loopBack = kind === 'coil' ? Math.cos(phase) * 2.2 : 0;
    const px = x1 + dx * t + ux * loopBack + nx * offset;
    const py = y1 + dy * t + uy * loopBack + ny * offset;
    parts.push(`L ${px.toFixed(1)} ${py.toFixed(1)}`);
  }
  return parts.join(' ');
}

// ============================================================================
// P40: Document Macro Variables (\pgfmathsetmacro) & Live Parametric Sliders
// ============================================================================

export interface PgfMathMacroEntry {
  name: string; // without leading backslash, e.g. "focalCm"
  value: number;
  lineNumber: number;
  commentRu: string;
}

export function extractPgfMathMacros(source: string): PgfMathMacroEntry[] {
  const lines = source.split(/\r?\n/);
  const result: PgfMathMacroEntry[] = [];
  lines.forEach((line, idx) => {
    const m = /\\pgfmathsetmacro\{\\([A-Za-z][A-Za-z0-9]*)\}\{([+-]?\d+(?:\.\d+)?)\}(?:\s*%\s*(.*))?/.exec(
      line
    );
    if (m) {
      const num = Number(m[2]);
      if (Number.isFinite(num)) {
        result.push({
          name: m[1],
          value: num,
          lineNumber: idx + 1,
          commentRu: (m[3] ?? '').trim() || 'Параметр чертежа',
        });
      }
    }
  });
  return result;
}

export function upsertPgfMathMacroInSource(
  source: string,
  name: string,
  value: number,
  commentRu = 'Параметр чертежа',
  linkedPrimitivePatch?: { primitiveId: number; paramKey: string }
): string {
  const cleanName = name.replace(/[^A-Za-z0-9]/g, '') || 'paramA';
  const eol = source.includes('\r\n') ? '\r\n' : '\n';
  const lines = source.split(/\r?\n/);
  const formattedVal = Number(value).toFixed(2);
  const macroLine = `  \\pgfmathsetmacro{\\${cleanName}}{${formattedVal}} % ${commentRu}`;

  const existingIdx = lines.findIndex((l) =>
    new RegExp(`\\\\pgfmathsetmacro\\{\\\\${cleanName}\\}`).test(l)
  );

  let nextSource = source;
  if (existingIdx !== -1) {
    lines[existingIdx] = macroLine;
    nextSource = lines.join(eol);
  } else {
    const tikzIdx = lines.findIndex((l) => l.includes('\\begin{tikzpicture}'));
    if (tikzIdx !== -1) {
      lines.splice(tikzIdx + 1, 0, macroLine);
      nextSource = lines.join(eol);
    } else {
      nextSource = `${source}${source.endsWith('\n') ? '' : eol}${macroLine}${eol}`;
    }
  }

  if (linkedPrimitivePatch) {
    const target = parseOwnedPrimitives(nextSource).find(
      (p) => p.id === linkedPrimitivePatch.primitiveId
    );
    if (target && target.values[linkedPrimitivePatch.paramKey] !== undefined) {
      const safeVal =
        linkedPrimitivePatch.paramKey === 'radius' ? Math.max(0.1, value) : value;
      nextSource = applyOwnedPrimitivePatch(nextSource, target.id, {
        ...target.values,
        [linkedPrimitivePatch.paramKey]: fmtCm(safeVal),
      });
    }
  }
  return nextSource;
}

// ============================================================================
// P41: Direct Number Scrubbing in .tex Source (egui::DragValue mirror)
// ============================================================================

export interface ScrubbableNumericToken {
  lineNumber: number;
  startCol: number;
  endCol: number;
  rawToken: string;
  numericValue: number;
  unit: string;
}

export function findNumericTokenAtColumn(
  source: string,
  lineNumber: number,
  colOffset: number
): ScrubbableNumericToken | null {
  const lines = source.split(/\r?\n/);
  if (lineNumber < 1 || lineNumber > lines.length) return null;
  const line = lines[lineNumber - 1];
  const markerIdx = line.indexOf(OWNERSHIP_MARKER);
  const commentIdx = markerIdx !== -1 ? markerIdx : line.indexOf('%');
  const activeLimit = commentIdx === -1 ? line.length : commentIdx;
  const safeCol = colOffset > activeLimit ? 0 : colOffset;

  const activePart = line.slice(0, activeLimit);
  const numRe = /([+-]?\d+(?:\.\d+)?)(cm|mm|pt|in|deg)?/g;
  let m: RegExpExecArray | null;
  let firstOnLine: ScrubbableNumericToken | null = null;
  let firstDimOnLine: ScrubbableNumericToken | null = null;

  while ((m = numRe.exec(activePart)) !== null) {
    const startCol = m.index;
    const endCol = m.index + m[0].length;
    const val = Number(m[1]);
    if (!Number.isFinite(val)) continue;
    const isColorMixTint = startCol > 0 && activePart[startCol - 1] === '!' && !m[2];
    const tok: ScrubbableNumericToken = {
      lineNumber,
      startCol,
      endCol,
      rawToken: m[0],
      numericValue: val,
      unit: m[2] ?? '',
    };
    if (!isColorMixTint && !firstOnLine) firstOnLine = tok;
    if (tok.unit && !firstDimOnLine) firstDimOnLine = tok;
    if (safeCol > 0 && safeCol >= startCol - 1 && safeCol <= endCol + 1) {
      return tok;
    }
  }
  return firstDimOnLine ?? firstOnLine;
}

export function scrubNumericLiteralInSource(
  source: string,
  lineNumber: number,
  colOffset: number,
  direction: 1 | -1,
  coarse = false
): { ok: boolean; nextSource: string; nextToken: string; nextCol: number } {
  const tok = findNumericTokenAtColumn(source, lineNumber, colOffset);
  if (!tok) {
    return { ok: false, nextSource: source, nextToken: '', nextCol: colOffset };
  }

  const baseStep =
    tok.unit === 'cm'
      ? 0.1
      : tok.unit === 'mm'
        ? 1
        : tok.unit === 'pt'
          ? 1
          : tok.rawToken.includes('.')
            ? 0.1
            : 1;
  const delta = direction * baseStep * (coarse ? 5 : 1);
  let nextNum = tok.numericValue + delta;

  const lines = source.split(/\r?\n/);
  const line = lines[lineNumber - 1];
  // Guard radius=... from going <= 0
  const prefixSlice = line.slice(Math.max(0, tok.startCol - 10), tok.startCol);
  if (prefixSlice.includes('radius=')) {
    nextNum = Math.max(0.05, nextNum);
  }

  const decimals =
    tok.unit === 'cm' || tok.unit === 'in' || tok.rawToken.includes('.') ? 2 : 0;
  const nextLiteral = `${nextNum.toFixed(decimals)}${tok.unit}`;

  // If this line belongs to an owned n1 primitive, sync its draft values too so the canvas updates live!
  const owned = parseOwnedPrimitives(source).find((p) => p.lineNumber === lineNumber);
  if (owned) {
    const oldLit = tok.rawToken;
    const matchingEntries = Object.entries(owned.values).filter(([, v]) => v === oldLit);
    if (matchingEntries.length >= 1) {
      // Pick matching key based on occurrence order on the line
      const beforeOccurrences = line
        .slice(0, tok.startCol)
        .split(oldLit).length - 1;
      const chosenKey =
        matchingEntries[Math.min(beforeOccurrences, matchingEntries.length - 1)][0];
      const nextValues = { ...owned.values, [chosenKey]: nextLiteral };
      if (nextValues.poly_points) {
        const pts = parsePolyPointsList(nextValues.poly_points);
        if (pts.length >= 2) {
          nextValues.poly_points = nextValues.poly_points.replace(oldLit, nextLiteral);
        }
      }
      const patched = applyOwnedPrimitivePatch(source, owned.id, nextValues);
      return {
        ok: true,
        nextSource: patched,
        nextToken: nextLiteral,
        nextCol: tok.startCol,
      };
    }
  }

  const eol = source.includes('\r\n') ? '\r\n' : '\n';
  lines[lineNumber - 1] =
    line.slice(0, tok.startCol) + nextLiteral + line.slice(tok.endCol);
  return {
    ok: true,
    nextSource: lines.join(eol),
    nextToken: nextLiteral,
    nextCol: tok.startCol,
  };
}

// ============================================================================
// P42: ГОСТ / siunitx Physical Quantities & Units Constructor
// ============================================================================

export interface PhysicalUnitPreset {
  id: string;
  unitRu: string;
  siunitxMacro: string;
  domainRu: string;
  sampleVal: string;
}

export const PHYSICAL_UNIT_PRESETS: PhysicalUnitPreset[] = [
  { id: 'nm', unitRu: 'нм', siunitxMacro: '\\nano\\meter', domainRu: 'Оптика (длина волны λ)', sampleVal: '532' },
  { id: 'um', unitRu: 'мкм', siunitxMacro: '\\micro\\meter', domainRu: 'Фотоника / перетяжка w_0', sampleVal: '12.5' },
  { id: 'mm', unitRu: 'мм', siunitxMacro: '\\milli\\meter', domainRu: 'Фокус / апертура', sampleVal: '25' },
  { id: 'ghz', unitRu: 'ГГц', siunitxMacro: '\\giga\\hertz', domainRu: 'Радиофизика / СВЧ', sampleVal: '2.45' },
  { id: 'ev', unitRu: 'эВ', siunitxMacro: '\\electronvolt', domainRu: 'Квантовая физика', sampleVal: '1.96' },
  { id: 'kohm', unitRu: 'кОм', siunitxMacro: '\\kilo\\ohm', domainRu: 'Электроника', sampleVal: '4.7' },
  { id: 'mv', unitRu: 'мВ', siunitxMacro: '\\milli\\volt', domainRu: 'Осциллограммы', sampleVal: '150' },
  { id: 'kelvin', unitRu: 'К', siunitxMacro: '\\kelvin', domainRu: 'Термодинамика', sampleVal: '298' },
];

export function formatPhysicalQuantityLatex(options: {
  symbolLatex: string;
  valueStr: string;
  uncertaintyStr?: string;
  unitPresetId: string;
  notation: 'gost-text' | 'siunitx';
}): string {
  const preset =
    PHYSICAL_UNIT_PRESETS.find((u) => u.id === options.unitPresetId) ?? PHYSICAL_UNIT_PRESETS[0];
  const symPrefix = options.symbolLatex.trim() ? `${options.symbolLatex.trim()} = ` : '';
  const val = options.valueStr.trim() || preset.sampleVal;
  const unc = options.uncertaintyStr?.trim();

  if (options.notation === 'siunitx') {
    const qtyBody = unc ? `${val} +- ${unc}` : val;
    return `${symPrefix}\\qty{${qtyBody}}{${preset.siunitxMacro}}`;
  }

  if (unc) {
    return `${symPrefix}(${val} \\pm ${unc})\\,\\text{${preset.unitRu}}`;
  }
  return `${symPrefix}${val}\\,\\text{${preset.unitRu}}`;
}

// ============================================================================
// P43: Reference Image Plot Digitizer (2-Point Axis Calibration -> Curve)
// ============================================================================

export const DEMO_PLOT_SCAN_DATA_URI =
  'data:image/svg+xml;utf8,' +
  encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 620 380" width="620" height="380">
      <rect width="620" height="380" fill="#f8fafc"/>
      <g stroke="#cbd5e1" stroke-width="1" stroke-dasharray="4 4">
        <line x1="80" y1="60" x2="540" y2="60"/>
        <line x1="80" y1="140" x2="540" y2="140"/>
        <line x1="80" y1="220" x2="540" y2="220"/>
        <line x1="195" y1="50" x2="195" y2="310"/>
        <line x1="310" y1="50" x2="310" y2="310"/>
        <line x1="425" y1="50" x2="425" y2="310"/>
      </g>
      <line x1="80" y1="310" x2="555" y2="310" stroke="#334155" stroke-width="2"/>
      <line x1="80" y1="310" x2="80" y2="40" stroke="#334155" stroke-width="2"/>
      <path d="M 95 295 Q 190 285 255 170 T 310 75 T 365 170 T 525 292" fill="none" stroke="#0f766e" stroke-width="3.2"/>
      <circle cx="80" cy="310" r="5" fill="#dc2626"/>
      <text x="88" y="328" font-family="monospace" font-size="12" fill="#dc2626">Ref1 (400, 0.0)</text>
      <circle cx="540" cy="60" r="5" fill="#2563eb"/>
      <text x="435" y="52" font-family="monospace" font-size="12" fill="#2563eb">Ref2 (700, 1.0)</text>
      <text x="190" y="28" font-family="sans-serif" font-size="13" fill="#475569">Эталонный скан спектра пропускания T(λ)</text>
    </svg>`
  );

export interface DigitizerCalibration {
  ref1CanvasCm: { x: number; y: number };
  ref1Phys: { x: number; y: number };
  ref2CanvasCm: { x: number; y: number };
  ref2Phys: { x: number; y: number };
}

export function mapCanvasPointsToPhysical(
  pickedCm: { x: number; y: number }[],
  cal: DigitizerCalibration
): { xCm: number; yCm: number; xPhys: number; yPhys: number }[] {
  const dxCm = Math.abs(cal.ref2CanvasCm.x - cal.ref1CanvasCm.x) < 1e-4 ? 1 : cal.ref2CanvasCm.x - cal.ref1CanvasCm.x;
  const dyCm = Math.abs(cal.ref2CanvasCm.y - cal.ref1CanvasCm.y) < 1e-4 ? 1 : cal.ref2CanvasCm.y - cal.ref1CanvasCm.y;

  return pickedCm.map((pt) => {
    const tx = (pt.x - cal.ref1CanvasCm.x) / dxCm;
    const ty = (pt.y - cal.ref1CanvasCm.y) / dyCm;
    const xPhys = +(cal.ref1Phys.x + tx * (cal.ref2Phys.x - cal.ref1Phys.x)).toFixed(3);
    const yPhys = +(cal.ref1Phys.y + ty * (cal.ref2Phys.y - cal.ref1Phys.y)).toFixed(3);
    return {
      xCm: +(pt.x.toFixed(2)),
      yCm: +(pt.y.toFixed(2)),
      xPhys,
      yPhys,
    };
  });
}

export function insertDigitizedCurveIntoSource(
  source: string,
  mappedPts: { xCm: number; yCm: number; xPhys: number; yPhys: number }[],
  mode: 'n1-polyline' | 'pgfplots-coordinates'
): { nextSource: string; insertedId: number | null; summaryRu: string } {
  if (mappedPts.length < 2) {
    return {
      nextSource: source,
      insertedId: null,
      summaryRu: 'Отметьте минимум 2 точки на кривой для оцифровки.',
    };
  }

  if (mode === 'n1-polyline') {
    const res = insertPolygonContourIntoSource(
      source,
      mappedPts.map((p) => ({ xCm: p.xCm, yCm: p.yCm })),
      false,
      { strokeColor: 'oiBluishGreen', strokeWidth: 'thick' }
    );
    return {
      nextSource: res.nextSource,
      insertedId: res.newId,
      summaryRu: `Оцифрованная кривая (${mappedPts.length} узлов) добавлена на холст как контур n1 #${res.newId} (P43).`,
    };
  }

  const eol = source.includes('\r\n') ? '\r\n' : '\n';
  const coords = mappedPts.map((p) => `(${p.xPhys},${p.yPhys})`).join(' ');
  const commentTable = `  % Оцифрованные координаты P43 (${mappedPts.length} точек): ${coords}`;
  const polyRes = insertPolygonContourIntoSource(
    source,
    mappedPts.map((p) => ({ xCm: p.xCm, yCm: p.yCm })),
    false,
    { strokeColor: 'oiBlue', strokeWidth: 'thick' }
  );
  const endTikzIdx = polyRes.nextSource.lastIndexOf('\\end{tikzpicture}');
  let nextSource = polyRes.nextSource;
  if (endTikzIdx !== -1) {
    let ls = endTikzIdx;
    while (ls > 0 && nextSource[ls - 1] !== '\n') ls--;
    nextSource = nextSource.slice(0, ls) + commentTable + eol + nextSource.slice(ls);
  }
  return {
    nextSource,
    insertedId: polyRes.newId,
    summaryRu: `Вставлены физические координаты PGFPlots + кривая #${polyRes.newId} (${mappedPts.length} точек, P43).`,
  };
}

// ============================================================================
// P44: Analytical Function Plotter F(x) with PGF Dimension Overflow Guard
// ============================================================================

export type AnalyticalFormulaId =
  | 'damped-cos'
  | 'sinc-diffraction'
  | 'gaussian-beam'
  | 'lorentzian-peak';

export interface AnalyticalFunctionPreset {
  id: AnalyticalFormulaId;
  titleRu: string;
  tikzExpr: string;
  latexLabel: string;
  defaultDomain: [number, number];
  defaultParamA: number;
  paramALabelRu: string;
}

export const ANALYTICAL_FUNCTION_PRESETS: AnalyticalFunctionPreset[] = [
  {
    id: 'damped-cos',
    titleRu: 'Затухающие колебания e^{-γx} cos(ωx)',
    tikzExpr: 'exp(-0.45*\\x)*cos(4*\\x r)',
    latexLabel: 'U(t) = U_0 e^{-\\gamma t}\\cos(\\omega t)',
    defaultDomain: [0, 5],
    defaultParamA: 0.45,
    paramALabelRu: 'Декремент γ',
  },
  {
    id: 'sinc-diffraction',
    titleRu: 'Дифракция Фраунгофера (sin x / x)²',
    tikzExpr: '(sin(3*\\x r)/(3*\\x))^2',
    latexLabel: 'I(\\theta) = I_0 \\,\\mathrm{sinc}^2(\\beta)',
    defaultDomain: [-3.5, 3.5],
    defaultParamA: 3.0,
    paramALabelRu: 'Масштаб щели k',
  },
  {
    id: 'gaussian-beam',
    titleRu: 'Каустика гауссова пучка w(z)',
    tikzExpr: '0.35*sqrt(1+(\\x/1.2)^2)',
    latexLabel: 'w(z) = w_0\\sqrt{1+(z/z_R)^2}',
    defaultDomain: [-2.5, 2.5],
    defaultParamA: 0.35,
    paramALabelRu: 'Перетяжка w_0',
  },
  {
    id: 'lorentzian-peak',
    titleRu: 'Резонансный контур Лоренца L(ω)',
    tikzExpr: '1/(1+((\\x-2.5)/0.55)^2)',
    latexLabel: 'L(\\omega) = \\frac{\\Gamma^2}{(\\omega-\\omega_0)^2+\\Gamma^2}',
    defaultDomain: [0, 5],
    defaultParamA: 0.55,
    paramALabelRu: 'Полуширина Γ',
  },
];

export function sampleAnalyticalFunctionToCanvas(
  formulaId: AnalyticalFormulaId,
  domainMin: number,
  domainMax: number,
  samplesCount: number,
  paramA: number
): {
  ok: boolean;
  reasonRu?: string;
  canvasPoints: { xCm: number; yCm: number }[];
  tikzPlotComment: string;
} {
  if (domainMax <= domainMin) {
    return {
      ok: false,
      reasonRu: 'Правая граница области определения должна быть строго больше левой.',
      canvasPoints: [],
      tikzPlotComment: '',
    };
  }
  const n = Math.max(8, Math.min(64, Math.round(samplesCount)));
  const rawSamples: { x: number; y: number }[] = [];

  for (let i = 0; i < n; i++) {
    const t = i / (n - 1);
    const x = domainMin + t * (domainMax - domainMin);
    let y = 0;
    if (formulaId === 'damped-cos') {
      y = Math.exp(-Math.max(0, paramA) * x) * Math.cos(4 * x);
    } else if (formulaId === 'sinc-diffraction') {
      const u = Math.max(0.2, paramA) * x;
      const sinc = Math.abs(u) < 1e-5 ? 1 : Math.sin(u) / u;
      y = sinc * sinc;
    } else if (formulaId === 'gaussian-beam') {
      y = Math.max(0.08, paramA) * Math.sqrt(1 + (x / 1.2) * (x / 1.2));
    } else {
      const gamma = Math.max(0.1, paramA);
      const mid = (domainMin + domainMax) / 2;
      y = 1 / (1 + ((x - mid) / gamma) * ((x - mid) / gamma));
    }

    // PGF Dimension too large guard (±575 cm / NaN / Infinity)
    if (!Number.isFinite(y) || Math.abs(y) > 575) {
      return {
        ok: false,
        reasonRu:
          'Защита PGF (Dimension too large): функция расходится на выбранном интервале (> 575 см). Сузьте область domain.',
        canvasPoints: [],
        tikzPlotComment: '',
      };
    }
    rawSamples.push({ x, y });
  }

  const minY = Math.min(...rawSamples.map((p) => p.y));
  const maxY = Math.max(...rawSamples.map((p) => p.y));
  const spanY = Math.max(1e-5, maxY - minY);
  const spanX = Math.max(1e-5, domainMax - domainMin);

  // Map cleanly into canvas box [0.85..5.35] x [0.85..3.05] cm
  const canvasPoints = rawSamples.map((pt) => ({
    xCm: +(0.85 + ((pt.x - domainMin) / spanX) * 4.5).toFixed(2),
    yCm: +(0.85 + ((pt.y - minY) / spanY) * 2.2).toFixed(2),
  }));

  const preset =
    ANALYTICAL_FUNCTION_PRESETS.find((p) => p.id === formulaId) ?? ANALYTICAL_FUNCTION_PRESETS[0];
  const tikzPlotComment = `% Аналитическая кривая P44: domain=${domainMin}:${domainMax}, samples=${n}, expr=${preset.tikzExpr}`;

  return {
    ok: true,
    canvasPoints,
    tikzPlotComment,
  };
}

export function insertAnalyticalPlotIntoSource(
  source: string,
  formulaId: AnalyticalFormulaId,
  domainMin: number,
  domainMax: number,
  samplesCount: number,
  paramA: number
): { ok: boolean; nextSource: string; newId: number | null; summaryRu: string } {
  const sampled = sampleAnalyticalFunctionToCanvas(
    formulaId,
    domainMin,
    domainMax,
    samplesCount,
    paramA
  );
  if (!sampled.ok) {
    return {
      ok: false,
      nextSource: source,
      newId: null,
      summaryRu: sampled.reasonRu ?? 'Ошибка построения функции',
    };
  }
  const preset =
    ANALYTICAL_FUNCTION_PRESETS.find((p) => p.id === formulaId) ?? ANALYTICAL_FUNCTION_PRESETS[0];

  const polyRes = insertPolygonContourIntoSource(source, sampled.canvasPoints, false, {
    strokeColor: 'oiBlue',
    strokeWidth: 'thick',
  });
  const labelRes = insertOwnedPrimitiveIntoSource(polyRes.nextSource, 'node', {
    x: '3.10cm',
    y: '3.38cm',
    mode: 'math',
    content: preset.latexLabel,
  });

  const eol = labelRes.nextSource.includes('\r\n') ? '\r\n' : '\n';
  const endTikzIdx = labelRes.nextSource.lastIndexOf('\\end{tikzpicture}');
  let finalSrc = labelRes.nextSource;
  if (endTikzIdx !== -1) {
    let ls = endTikzIdx;
    while (ls > 0 && finalSrc[ls - 1] !== '\n') ls--;
    finalSrc = finalSrc.slice(0, ls) + `  ${sampled.tikzPlotComment}` + eol + finalSrc.slice(ls);
  }

  return {
    ok: true,
    nextSource: finalSrc,
    newId: polyRes.newId,
    summaryRu: `Построена аналитическая кривая «${preset.titleRu}» (${sampled.canvasPoints.length} точек, P44).`,
  };
}

// ============================================================================
// P45: Vector Field / Streamline Quiver Generator (E, B, v)
// ============================================================================

export type VectorFieldPresetId = 'dipole-e' | 'vortex-b' | 'uniform-flow' | 'saddle-phase';

export interface VectorFieldPreset {
  id: VectorFieldPresetId;
  titleRu: string;
  formulaRu: string;
}

export const VECTOR_FIELD_PRESETS: VectorFieldPreset[] = [
  { id: 'dipole-e', titleRu: 'Поле диполя / точечного заряда E(r)', formulaRu: 'E ∝ (x - x₀, y - y₀) / r²' },
  { id: 'vortex-b', titleRu: 'Вихревое магнитное поле B(x,y)', formulaRu: 'B = (−(y − y₀), x − x₀)' },
  { id: 'saddle-phase', titleRu: 'Фазовый портрет: седло (x, −y)', formulaRu: 'v = (x − x₀, −(y − y₀))' },
  { id: 'uniform-flow', titleRu: 'Ламинарный поток с возмущением', formulaRu: 'v = (1, 0.35 cos(x))' },
];

export function insertVectorFieldIntoSource(
  source: string,
  presetId: VectorFieldPresetId,
  cols = 5,
  rows = 4
): { nextSource: string; insertedIds: number[]; summaryRu: string } {
  let cur = source;
  const lib = proposeLibraryConnect(cur, 'arrows.meta');
  if (lib.ok) cur = lib.nextSource;

  const safeCols = Math.max(2, Math.min(7, Math.round(cols)));
  const safeRows = Math.max(2, Math.min(6, Math.round(rows)));
  const cx = 3.1;
  const cy = 1.9;
  const insertedIds: number[] = [];

  for (let r = 0; r < safeRows; r++) {
    for (let c = 0; c < safeCols; c++) {
      const x = 1.0 + (c / Math.max(1, safeCols - 1)) * 4.2;
      const y = 0.75 + (r / Math.max(1, safeRows - 1)) * 2.3;
      const dx0 = x - cx;
      const dy0 = y - cy;

      let vx = 1;
      let vy = 0;
      if (presetId === 'dipole-e') {
        const dist = Math.hypot(dx0, dy0);
        if (dist < 0.25) continue;
        vx = dx0 / (dist * dist);
        vy = dy0 / (dist * dist);
      } else if (presetId === 'vortex-b') {
        const dist = Math.hypot(dx0, dy0);
        if (dist < 0.2) continue;
        vx = -dy0;
        vy = dx0;
      } else if (presetId === 'saddle-phase') {
        vx = dx0;
        vy = -dy0;
      } else {
        vx = 1;
        vy = 0.4 * Math.cos(x * 1.4);
      }

      const norm = Math.hypot(vx, vy);
      if (norm < 1e-4) continue;
      const arrowLen = 0.42;
      const ex = x + (vx / norm) * arrowLen;
      const ey = y + (vy / norm) * arrowLen;

      const res = insertOwnedPrimitiveIntoSource(cur, 'arrow', {
        start_x: fmtCm(x),
        start_y: fmtCm(y),
        end_x: fmtCm(ex),
        end_y: fmtCm(ey),
        tip: 'Stealth',
        stroke_width: 'thin',
        stroke_color: 'oiBlue',
        layer_id: 'main',
      });
      cur = res.nextSource;
      insertedIds.push(res.newId);
    }
  }

  return {
    nextSource: cur,
    insertedIds,
    summaryRu: `Сгенерирована сетка векторного поля quiver (${insertedIds.length} векторов Stealth, P45).`,
  };
}

// ============================================================================
// P46 & P47: Layer / Scope Manager (Lock & Hide) + Beamer Slide Stepper (<n->)
// ============================================================================

export type CadLayerId = 'bg' | 'main' | 'annotations';

export interface CadLayerSpec {
  id: CadLayerId;
  titleRu: string;
  shortRu: string;
  scopeCommentRu: string;
}

export const CAD_LAYERS: CadLayerSpec[] = [
  { id: 'bg', titleRu: 'Фон и оси (bg)', shortRu: 'Фон', scopeCommentRu: 'Слой фона и координатной сетки' },
  { id: 'main', titleRu: 'Основная схема (main)', shortRu: 'Схема', scopeCommentRu: 'Основной физический контур' },
  { id: 'annotations', titleRu: 'Выноски и подписи (annotations)', shortRu: 'Выноски', scopeCommentRu: 'Размерные линии и формулы' },
];

export function resolveEffectiveLayer(prim: OwnedPrimitive): CadLayerId {
  if (prim.values.layer_id === 'bg' || prim.values.layer_id === 'main' || prim.values.layer_id === 'annotations') {
    return prim.values.layer_id;
  }
  if (prim.tool === 'node' || prim.values.callout === 'dim' || prim.values.decoration_kind?.startsWith('brace')) {
    return 'annotations';
  }
  return 'main';
}

export function isBeamerSpecVisibleOnSlide(spec: string | undefined, activeSlide: number | null): boolean {
  if (!activeSlide || !spec || !spec.trim()) return true;
  const s = spec.trim();
  const openRange = /^(\d+)-$/.exec(s);
  if (openRange) {
    return activeSlide >= Number(openRange[1]);
  }
  const closedRange = /^(\d+)-(\d+)$/.exec(s);
  if (closedRange) {
    return activeSlide >= Number(closedRange[1]) && activeSlide <= Number(closedRange[2]);
  }
  const exact = /^(\d+)$/.exec(s);
  if (exact) {
    return activeSlide === Number(exact[1]);
  }
  return true;
}

export function buildScopedTikzPreview(source: string): string {
  const owned = parseOwnedPrimitives(source);
  const byLayer: Record<CadLayerId, string[]> = { bg: [], main: [], annotations: [] };
  for (const p of owned) {
    const lid = resolveEffectiveLayer(p);
    byLayer[lid].push(`    ${p.commandPart.trim()}`);
  }
  const lines: string[] = ['\\begin{tikzpicture}'];
  for (const layer of CAD_LAYERS) {
    if (byLayer[layer.id].length === 0) continue;
    lines.push(`  % ${layer.scopeCommentRu} (P46):`);
    lines.push(`  \\begin{scope}[local bounding box=scope_${layer.id}]`);
    lines.push(...byLayer[layer.id]);
    lines.push('  \\end{scope}');
  }
  lines.push('\\end{tikzpicture}');
  return lines.join('\n');
}

// ============================================================================
// P48: Manuscript \begin{figure}[htbp] Wrapper Generator (IEEE / REVTeX / ГОСТ)
// ============================================================================

export type FigureWrapperFormatId = 'ieee-1col' | 'ieee-2col' | 'revtex' | 'gost-vak';

export interface FigureWrapperOptions {
  formatId: FigureWrapperFormatId;
  captionRu: string;
  labelKey: string;
  useResizebox: boolean;
}

export function buildManuscriptFigureWrapper(source: string, opts: FigureWrapperOptions): {
  figureCode: string;
  refSnippet: string;
} {
  const tikzClean = extractTikzpictureBlock(source, true);
  const cleanLabel = opts.labelKey.replace(/[^A-Za-z0-9:_-]/g, '') || 'fig:optics_setup';
  const cleanCaption = opts.captionRu.trim() || 'Принципиальная схема экспериментальной установки.';

  const envName = opts.formatId === 'ieee-2col' ? 'figure*' : 'figure';
  const placement = opts.formatId === 'gost-vak' ? '[htbp]' : '[!t]';
  const targetWidth =
    opts.formatId === 'ieee-2col'
      ? '\\textwidth'
      : opts.formatId === 'gost-vak'
        ? '0.85\\textwidth'
        : '\\columnwidth';

  const bodyBlock = opts.useResizebox
    ? `  \\resizebox{${targetWidth}}{!}{%\n${tikzClean
        .split('\n')
        .map((l) => `    ${l}`)
        .join('\n')}%\n  }`
    : tikzClean
        .split('\n')
        .map((l) => `  ${l}`)
        .join('\n');

  const captionComment =
    opts.formatId === 'gost-vak'
      ? '  % По ГОСТ Р 7.0.11 подрисуночная подпись располагается под иллюстрацией по центру:'
      : opts.formatId === 'revtex'
        ? '  % Профиль APS Physical Review (revtex4-2):'
        : '  % Профиль IEEEtran:';

  const figureCode = [
    `\\begin{${envName}}${placement}`,
    '  \\centering',
    bodyBlock,
    captionComment,
    `  \\caption{${cleanCaption}}`,
    `  \\label{${cleanLabel}}`,
    `\\end{${envName}}`,
  ].join('\n');

  const refSnippet =
    opts.formatId === 'gost-vak'
      ? `см.~рис.~\\ref{${cleanLabel}}`
      : `Fig.~\\ref{${cleanLabel}}`;

  return { figureCode, refSnippet };
}

// ============================================================================
// P49: Native Draggable Panel Splitters (24-Column Grid) & Workspace Presets
// ============================================================================

export interface WorkspaceSplitPreset {
  id: string;
  labelRu: string;
  cols: { canvas: number; code: number; inspector: number };
  inspectorCollapsed: boolean;
}

export const WORKSPACE_SPLIT_PRESETS: WorkspaceSplitPreset[] = [
  {
    id: 'balanced',
    labelRu: 'Баланс (10:8:6)',
    cols: { canvas: 10, code: 8, inspector: 6 },
    inspectorCollapsed: false,
  },
  {
    id: 'cad-wide',
    labelRu: 'Чертёж CAD (13:6:5)',
    cols: { canvas: 13, code: 6, inspector: 5 },
    inspectorCollapsed: false,
  },
  {
    id: 'tex-author',
    labelRu: 'Код TeX (7:11:6)',
    cols: { canvas: 7, code: 11, inspector: 6 },
    inspectorCollapsed: false,
  },
  {
    id: 'compact-laptop',
    labelRu: 'Ноутбук 13" (14:10:0)',
    cols: { canvas: 14, code: 10, inspector: 6 },
    inspectorCollapsed: true,
  },
];

export function clampSplitterColumns(
  canvasCols: number,
  codeCols: number,
  inspectorCollapsed: boolean
): { canvas: number; code: number; inspector: number } {
  if (inspectorCollapsed) {
    const c = Math.max(6, Math.min(18, Math.round(canvasCols)));
    return { canvas: c, code: 24 - c, inspector: 6 };
  }
  const safeCanvas = Math.max(6, Math.min(13, Math.round(canvasCols)));
  const maxCode = 24 - safeCanvas - 5;
  const safeCode = Math.max(6, Math.min(maxCode, Math.round(codeCols)));
  const safeInsp = Math.max(5, 24 - safeCanvas - safeCode);
  return { canvas: safeCanvas, code: safeCode, inspector: safeInsp };
}
