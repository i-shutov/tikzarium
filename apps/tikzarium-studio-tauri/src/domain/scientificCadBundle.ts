import {
  applyOwnedPrimitivePatch,
  deleteOwnedPrimitiveFromSource,
  insertOwnedPrimitiveIntoSource,
  parseDimensionToCm,
  parseOwnedPrimitives,
  parsePolyPointsList,
  proposeLibraryConnect,
  serializePolyPointsList,
  analyzeTexDiagnostics,
} from './tikzEngine';
import type { SpecimenDocument } from './catalog';
import type { OwnedPrimitive } from './tikzEngine';
import { getPrimitiveBoundsCm, stripAllOwnershipMetadata, extractTikzpictureBlock } from './ergonomicsBundle';

function fmtCm(v: number): string {
  return `${(Math.round(v * 100) / 100).toFixed(2)}cm`;
}

// ============================================================================
// P21: Dimension Callouts (ГОСТ / ISO |<->|) & Angle Arcs (\pic{angle})
// ============================================================================

export function insertDimensionCalloutIntoSource(
  source: string,
  startCm: { x: number; y: number },
  endCm: { x: number; y: number },
  customLabel?: string
): { nextSource: string; newId: number; insertedLine: number } {
  const len = Math.hypot(endCm.x - startCm.x, endCm.y - startCm.y);
  const safeEnd =
    len < 0.15 ? { x: +(startCm.x + 1.6).toFixed(2), y: startCm.y } : endCm;
  const dist = Math.hypot(safeEnd.x - startCm.x, safeEnd.y - startCm.y);
  const label = customLabel?.trim() || `${dist.toFixed(2)}\\,\\text{см}`;

  // Ensure arrows.meta is connected if using arrow callout
  const libCheck = proposeLibraryConnect(source, 'arrows.meta');
  const preparedSource = libCheck.ok ? libCheck.nextSource : source;

  return insertOwnedPrimitiveIntoSource(preparedSource, 'line', {
    start_x: fmtCm(startCm.x),
    start_y: fmtCm(startCm.y),
    end_x: fmtCm(safeEnd.x),
    end_y: fmtCm(safeEnd.y),
    callout: 'dim',
    callout_label: label,
    stroke_width: 'thin',
  });
}

export function convertPrimitiveToDimensionCallout(
  source: string,
  primitiveId: number,
  customLabel?: string
): string {
  const target = parseOwnedPrimitives(source).find((p) => p.id === primitiveId);
  if (!target || (target.tool !== 'line' && target.tool !== 'arrow')) return source;
  const sx = parseDimensionToCm(target.values.start_x) ?? 0;
  const sy = parseDimensionToCm(target.values.start_y) ?? 0;
  const ex = parseDimensionToCm(target.values.end_x) ?? 1;
  const ey = parseDimensionToCm(target.values.end_y) ?? 0;
  const dist = Math.hypot(ex - sx, ey - sy);
  const nextVals: Record<string, string> = { ...target.values };
  if (nextVals.callout === 'dim' && !customLabel) {
    delete nextVals.callout;
    delete nextVals.callout_label;
  } else {
    nextVals.callout = 'dim';
    nextVals.callout_label = customLabel?.trim() || `${dist.toFixed(2)}\\,\\text{см}`;
  }
  return applyOwnedPrimitivePatch(source, primitiveId, nextVals);
}

export function insertAngleArcIntoSource(
  source: string,
  vertexCm: { x: number; y: number },
  ray1Deg = 0,
  ray2Deg = 42,
  radiusCm = 0.75,
  labelLatex = '\\alpha'
): { nextSource: string; insertedLine: number; computedDeg: number } {
  const eol = source.includes('\r\n') ? '\r\n' : '\n';
  const spanDeg = Math.abs(ray2Deg - ray1Deg);
  const midDeg = (ray1Deg + ray2Deg) / 2;
  const labelR = radiusCm + 0.28;
  const lx = vertexCm.x + Math.cos((midDeg * Math.PI) / 180) * labelR;
  const ly = vertexCm.y + Math.sin((midDeg * Math.PI) / 180) * labelR;
  const sx = vertexCm.x + Math.cos((ray1Deg * Math.PI) / 180) * radiusCm;
  const sy = vertexCm.y + Math.sin((ray1Deg * Math.PI) / 180) * radiusCm;

  const arcBlock = [
    `  % Угловая дуга P21 (${spanDeg.toFixed(0)}°):`,
    `  \\draw[thin,draw=blue!75!black] (${sx.toFixed(2)}cm,${sy.toFixed(2)}cm) arc [start angle=${ray1Deg.toFixed(0)}, end angle=${ray2Deg.toFixed(0)}, radius=${radiusCm.toFixed(2)}cm];`,
  ].join(eol);

  // Also insert an owned n1 node for the angle label so it is movable on canvas!
  const endTikzIdx = source.lastIndexOf('\\end{tikzpicture}');
  let withArc = source;
  if (endTikzIdx !== -1) {
    let lineStart = endTikzIdx;
    while (lineStart > 0 && source[lineStart - 1] !== '\n') lineStart--;
    withArc = source.slice(0, lineStart) + arcBlock + eol + source.slice(lineStart);
  } else {
    withArc = source + (source.endsWith('\n') ? '' : eol) + arcBlock + eol;
  }

  const nodeRes = insertOwnedPrimitiveIntoSource(withArc, 'node', {
    x: fmtCm(lx),
    y: fmtCm(ly),
    mode: 'math',
    content: labelLatex,
  });

  return {
    nextSource: nodeRes.nextSource,
    insertedLine: nodeRes.insertedLine,
    computedDeg: spanDeg,
  };
}

// ============================================================================
// P22: Geometric Transformations (Rotate, Mirror X/Y, Scale Group)
// ============================================================================

function computeGroupCentroidCm(primitives: OwnedPrimitive[]): { cx: number; cy: number } {
  if (primitives.length === 0) return { cx: 3.1, cy: 1.9 };
  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;
  for (const p of primitives) {
    const b = getPrimitiveBoundsCm(p);
    minX = Math.min(minX, b.minX);
    maxX = Math.max(maxX, b.maxX);
    minY = Math.min(minY, b.minY);
    maxY = Math.max(maxY, b.maxY);
  }
  return { cx: (minX + maxX) / 2, cy: (minY + maxY) / 2 };
}

function rotatePointAround(
  x: number,
  y: number,
  cx: number,
  cy: number,
  angleDeg: number
): { x: number; y: number } {
  const rad = (angleDeg * Math.PI) / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);
  const dx = x - cx;
  const dy = y - cy;
  return {
    x: cx + dx * cos - dy * sin,
    y: cy + dx * sin + dy * cos,
  };
}

export function rotateOwnedPrimitivesInSource(
  source: string,
  primitiveIds: number[],
  angleDeg: number
): string {
  const owned = parseOwnedPrimitives(source);
  const selected = owned.filter((p) => primitiveIds.includes(p.id));
  if (selected.length === 0) return source;

  const { cx, cy } = computeGroupCentroidCm(selected);
  let cur = source;

  for (const id of primitiveIds) {
    const prim = parseOwnedPrimitives(cur).find((p) => p.id === id);
    if (!prim) continue;
    const nextVals = { ...prim.values };

    if (prim.tool === 'line' || prim.tool === 'arrow') {
      if (prim.values.poly_points) {
        const pts = parsePolyPointsList(prim.values.poly_points).map((pt) => {
          const r = rotatePointAround(pt.xCm, pt.yCm, cx, cy, angleDeg);
          return { xCm: +(r.x.toFixed(2)), yCm: +(r.y.toFixed(2)) };
        });
        if (pts.length >= 2) {
          nextVals.poly_points = serializePolyPointsList(pts);
          nextVals.start_x = fmtCm(pts[0].xCm);
          nextVals.start_y = fmtCm(pts[0].yCm);
          nextVals.end_x = fmtCm(pts[1].xCm);
          nextVals.end_y = fmtCm(pts[1].yCm);
        }
      } else {
        const p1 = rotatePointAround(
          parseDimensionToCm(prim.values.start_x) ?? 0,
          parseDimensionToCm(prim.values.start_y) ?? 0,
          cx,
          cy,
          angleDeg
        );
        const p2 = rotatePointAround(
          parseDimensionToCm(prim.values.end_x) ?? 0,
          parseDimensionToCm(prim.values.end_y) ?? 0,
          cx,
          cy,
          angleDeg
        );
        nextVals.start_x = fmtCm(p1.x);
        nextVals.start_y = fmtCm(p1.y);
        nextVals.end_x = fmtCm(p2.x);
        nextVals.end_y = fmtCm(p2.y);
      }
    } else if (prim.tool === 'cubic') {
      const keys: [string, string][] = [
        ['start_x', 'start_y'],
        ['control1_x', 'control1_y'],
        ['control2_x', 'control2_y'],
        ['end_x', 'end_y'],
      ];
      for (const [kx, ky] of keys) {
        const pt = rotatePointAround(
          parseDimensionToCm(prim.values[kx]) ?? 0,
          parseDimensionToCm(prim.values[ky]) ?? 0,
          cx,
          cy,
          angleDeg
        );
        nextVals[kx] = fmtCm(pt.x);
        nextVals[ky] = fmtCm(pt.y);
      }
    } else if (prim.tool === 'circle') {
      const pt = rotatePointAround(
        parseDimensionToCm(prim.values.center_x) ?? 0,
        parseDimensionToCm(prim.values.center_y) ?? 0,
        cx,
        cy,
        angleDeg
      );
      nextVals.center_x = fmtCm(pt.x);
      nextVals.center_y = fmtCm(pt.y);
    } else if (prim.tool === 'rectangle') {
      const sx = parseDimensionToCm(prim.values.start_x) ?? 0;
      const sy = parseDimensionToCm(prim.values.start_y) ?? 0;
      const ex = parseDimensionToCm(prim.values.end_x) ?? 0;
      const ey = parseDimensionToCm(prim.values.end_y) ?? 0;
      if (Math.abs(angleDeg) % 90 === 0 && Math.abs(angleDeg) % 180 !== 0) {
        // Exact 90-degree swap of width & height around rectangle/group center
        const rcx = (sx + ex) / 2;
        const rcy = (sy + ey) / 2;
        const newCenter = rotatePointAround(rcx, rcy, cx, cy, angleDeg);
        const halfW = Math.abs(ey - sy) / 2;
        const halfH = Math.abs(ex - sx) / 2;
        nextVals.start_x = fmtCm(newCenter.x - halfW);
        nextVals.end_x = fmtCm(newCenter.x + halfW);
        nextVals.start_y = fmtCm(newCenter.y - halfH);
        nextVals.end_y = fmtCm(newCenter.y + halfH);
      } else {
        const prevRot = Number(prim.values.rotate_deg ?? '0');
        const nextRot = ((prevRot + angleDeg) % 360 + 360) % 360;
        if (nextRot === 0) delete nextVals.rotate_deg;
        else nextVals.rotate_deg = String(Math.round(nextRot));
      }
    } else if (prim.tool === 'node') {
      const pt = rotatePointAround(
        parseDimensionToCm(prim.values.x) ?? 0,
        parseDimensionToCm(prim.values.y) ?? 0,
        cx,
        cy,
        angleDeg
      );
      nextVals.x = fmtCm(pt.x);
      nextVals.y = fmtCm(pt.y);
      if (selected.length === 1) {
        const prevRot = Number(prim.values.rotate_deg ?? '0');
        const nextRot = ((prevRot + angleDeg) % 360 + 360) % 360;
        if (nextRot === 0) delete nextVals.rotate_deg;
        else nextVals.rotate_deg = String(Math.round(nextRot));
      }
    }

    cur = applyOwnedPrimitivePatch(cur, id, nextVals);
  }
  return cur;
}

export function mirrorOwnedPrimitivesInSource(
  source: string,
  primitiveIds: number[],
  axis: 'x' | 'y'
): string {
  const owned = parseOwnedPrimitives(source);
  const selected = owned.filter((p) => primitiveIds.includes(p.id));
  if (selected.length === 0) return source;

  const { cx, cy } = computeGroupCentroidCm(selected);
  const flipX = (x: number) => (axis === 'x' ? 2 * cx - x : x);
  const flipY = (y: number) => (axis === 'y' ? 2 * cy - y : y);

  let cur = source;
  for (const id of primitiveIds) {
    const prim = parseOwnedPrimitives(cur).find((p) => p.id === id);
    if (!prim) continue;
    const v = { ...prim.values };

    if (prim.tool === 'line' || prim.tool === 'arrow' || prim.tool === 'rectangle') {
      if ((prim.tool === 'line' || prim.tool === 'arrow') && prim.values.poly_points) {
        const pts = parsePolyPointsList(prim.values.poly_points).map((pt) => ({
          xCm: +(flipX(pt.xCm).toFixed(2)),
          yCm: +(flipY(pt.yCm).toFixed(2)),
        }));
        if (pts.length >= 2) {
          v.poly_points = serializePolyPointsList(pts);
          v.start_x = fmtCm(pts[0].xCm);
          v.start_y = fmtCm(pts[0].yCm);
          v.end_x = fmtCm(pts[1].xCm);
          v.end_y = fmtCm(pts[1].yCm);
        }
      } else {
        v.start_x = fmtCm(flipX(parseDimensionToCm(prim.values.start_x) ?? 0));
        v.start_y = fmtCm(flipY(parseDimensionToCm(prim.values.start_y) ?? 0));
        v.end_x = fmtCm(flipX(parseDimensionToCm(prim.values.end_x) ?? 0));
        v.end_y = fmtCm(flipY(parseDimensionToCm(prim.values.end_y) ?? 0));
      }
    } else if (prim.tool === 'cubic') {
      v.start_x = fmtCm(flipX(parseDimensionToCm(prim.values.start_x) ?? 0));
      v.start_y = fmtCm(flipY(parseDimensionToCm(prim.values.start_y) ?? 0));
      v.control1_x = fmtCm(flipX(parseDimensionToCm(prim.values.control1_x) ?? 0));
      v.control1_y = fmtCm(flipY(parseDimensionToCm(prim.values.control1_y) ?? 0));
      v.control2_x = fmtCm(flipX(parseDimensionToCm(prim.values.control2_x) ?? 0));
      v.control2_y = fmtCm(flipY(parseDimensionToCm(prim.values.control2_y) ?? 0));
      v.end_x = fmtCm(flipX(parseDimensionToCm(prim.values.end_x) ?? 0));
      v.end_y = fmtCm(flipY(parseDimensionToCm(prim.values.end_y) ?? 0));
    } else if (prim.tool === 'circle') {
      v.center_x = fmtCm(flipX(parseDimensionToCm(prim.values.center_x) ?? 0));
      v.center_y = fmtCm(flipY(parseDimensionToCm(prim.values.center_y) ?? 0));
    } else if (prim.tool === 'node') {
      v.x = fmtCm(flipX(parseDimensionToCm(prim.values.x) ?? 0));
      v.y = fmtCm(flipY(parseDimensionToCm(prim.values.y) ?? 0));
    }

    cur = applyOwnedPrimitivePatch(cur, id, v);
  }
  return cur;
}

export function scaleOwnedPrimitivesInSource(
  source: string,
  primitiveIds: number[],
  scaleFactor: number
): string {
  const factor = Math.max(0.25, Math.min(4.0, scaleFactor));
  const owned = parseOwnedPrimitives(source);
  const selected = owned.filter((p) => primitiveIds.includes(p.id));
  if (selected.length === 0) return source;

  const { cx, cy } = computeGroupCentroidCm(selected);
  const scX = (x: number) => cx + (x - cx) * factor;
  const scY = (y: number) => cy + (y - cy) * factor;

  let cur = source;
  for (const id of primitiveIds) {
    const prim = parseOwnedPrimitives(cur).find((p) => p.id === id);
    if (!prim) continue;
    const v = { ...prim.values };
    if (prim.tool === 'line' || prim.tool === 'arrow' || prim.tool === 'rectangle') {
      if ((prim.tool === 'line' || prim.tool === 'arrow') && prim.values.poly_points) {
        const pts = parsePolyPointsList(prim.values.poly_points).map((pt) => ({
          xCm: +(scX(pt.xCm).toFixed(2)),
          yCm: +(scY(pt.yCm).toFixed(2)),
        }));
        if (pts.length >= 2) {
          v.poly_points = serializePolyPointsList(pts);
          v.start_x = fmtCm(pts[0].xCm);
          v.start_y = fmtCm(pts[0].yCm);
          v.end_x = fmtCm(pts[1].xCm);
          v.end_y = fmtCm(pts[1].yCm);
        }
      } else {
        v.start_x = fmtCm(scX(parseDimensionToCm(prim.values.start_x) ?? 0));
        v.start_y = fmtCm(scY(parseDimensionToCm(prim.values.start_y) ?? 0));
        v.end_x = fmtCm(scX(parseDimensionToCm(prim.values.end_x) ?? 0));
        v.end_y = fmtCm(scY(parseDimensionToCm(prim.values.end_y) ?? 0));
      }
    } else if (prim.tool === 'circle') {
      v.center_x = fmtCm(scX(parseDimensionToCm(prim.values.center_x) ?? 0));
      v.center_y = fmtCm(scY(parseDimensionToCm(prim.values.center_y) ?? 0));
      const r = Math.max(0.05, (parseDimensionToCm(prim.values.radius) ?? 0.5) * factor);
      v.radius = fmtCm(r);
    } else if (prim.tool === 'cubic') {
      v.start_x = fmtCm(scX(parseDimensionToCm(prim.values.start_x) ?? 0));
      v.start_y = fmtCm(scY(parseDimensionToCm(prim.values.start_y) ?? 0));
      v.control1_x = fmtCm(scX(parseDimensionToCm(prim.values.control1_x) ?? 0));
      v.control1_y = fmtCm(scY(parseDimensionToCm(prim.values.control1_y) ?? 0));
      v.control2_x = fmtCm(scX(parseDimensionToCm(prim.values.control2_x) ?? 0));
      v.control2_y = fmtCm(scY(parseDimensionToCm(prim.values.control2_y) ?? 0));
      v.end_x = fmtCm(scX(parseDimensionToCm(prim.values.end_x) ?? 0));
      v.end_y = fmtCm(scY(parseDimensionToCm(prim.values.end_y) ?? 0));
    } else if (prim.tool === 'node') {
      v.x = fmtCm(scX(parseDimensionToCm(prim.values.x) ?? 0));
      v.y = fmtCm(scY(parseDimensionToCm(prim.values.y) ?? 0));
    }
    cur = applyOwnedPrimitivePatch(cur, id, v);
  }
  return cur;
}

// ============================================================================
// P23: Parametric \foreach Arrays (Linear Step & Circular Radial Array)
// ============================================================================

export interface ForeachArrayConfig {
  kind: 'linear' | 'circular';
  count: number;
  dxCm: number;
  dyCm: number;
  centerXCm: number;
  centerYCm: number;
  stepDeg: number;
  replaceOriginal?: boolean;
}

export function generateForeachArrayInSource(
  source: string,
  primitiveIds: number[],
  config: ForeachArrayConfig
): { nextSource: string; insertedLine: number; foreachBlock: string } {
  const owned = parseOwnedPrimitives(source).filter((p) => primitiveIds.includes(p.id));
  const eol = source.includes('\r\n') ? '\r\n' : '\n';
  const safeCount = Math.max(2, Math.min(36, Math.round(config.count)));

  const bodyLines =
    owned.length > 0
      ? owned.map((p) => `    ${p.commandPart.trim()}`)
      : ['    \\draw (1.00cm,1.00cm) -- (1.00cm,1.60cm);'];

  let foreachLines: string[];
  if (config.kind === 'linear') {
    foreachLines = [
      `  % Параметрический линейный массив P23 (${safeCount} элементов):`,
      `  \\foreach \\i in {0,...,${safeCount - 1}} {`,
      `    \\begin{scope}[xshift=\\i*${config.dxCm.toFixed(2)}cm, yshift=\\i*${config.dyCm.toFixed(2)}cm]`,
      ...bodyLines.map((l) => `  ${l}`),
      `    \\end{scope}`,
      `  }`,
    ];
  } else {
    const step = config.stepDeg !== 0 ? config.stepDeg : 360 / safeCount;
    const angles = Array.from({ length: safeCount }, (_, i) => +(i * step).toFixed(1));
    const listExpr =
      safeCount >= 3
        ? `${angles[0]},${angles[1]},...,${angles[angles.length - 1]}`
        : angles.join(',');
    foreachLines = [
      `  % Параметрический круговой массив P23 (${safeCount} лучей, шаг ${step.toFixed(1)}°):`,
      `  \\foreach \\ang in {${listExpr}} {`,
      `    \\begin{scope}[rotate around={\\ang:(${config.centerXCm.toFixed(2)}cm,${config.centerYCm.toFixed(2)}cm)}]`,
      ...bodyLines.map((l) => `  ${l}`),
      `    \\end{scope}`,
      `  }`,
    ];
  }

  let baseSource = source;
  if (config.replaceOriginal && owned.length > 0) {
    for (const p of owned) {
      if (parseOwnedPrimitives(baseSource).some((item) => item.id === p.id)) {
        baseSource = deleteOwnedPrimitiveFromSource(baseSource, p.id);
      }
    }
  }

  const foreachBlock = foreachLines.join(eol);
  const endTikzIdx = baseSource.lastIndexOf('\\end{tikzpicture}');
  if (endTikzIdx !== -1) {
    let lineStart = endTikzIdx;
    while (lineStart > 0 && baseSource[lineStart - 1] !== '\n') lineStart--;
    const nextSource = baseSource.slice(0, lineStart) + foreachBlock + eol + baseSource.slice(lineStart);
    const insertedLine = nextSource.slice(0, lineStart).split('\n').length;
    return { nextSource, insertedLine, foreachBlock };
  }

  const nextSource = baseSource + (baseSource.endsWith('\n') ? '' : eol) + foreachBlock + eol;
  return { nextSource, insertedLine: nextSource.split('\n').length - foreachLines.length, foreachBlock };
}

// ============================================================================
// P24: Polar & Relative Coordinate Notation Helper
// ============================================================================

export function describeCoordinateNotations(values: Record<string, string>): {
  cartesian: string;
  relative: string;
  polar: string;
} {
  const sx = parseDimensionToCm(values.start_x) ?? 0;
  const sy = parseDimensionToCm(values.start_y) ?? 0;
  const ex = parseDimensionToCm(values.end_x) ?? 0;
  const ey = parseDimensionToCm(values.end_y) ?? 0;
  const dx = ex - sx;
  const dy = ey - sy;
  const r = Math.hypot(dx, dy);
  let deg = (Math.atan2(dy, dx) * 180) / Math.PI;
  if (deg < 0) deg += 360;

  return {
    cartesian: `(${sx.toFixed(2)}cm,${sy.toFixed(2)}cm) -- (${ex.toFixed(2)}cm,${ey.toFixed(2)}cm)`,
    relative: `(${sx.toFixed(2)}cm,${sy.toFixed(2)}cm) -- ++(${dx.toFixed(2)}cm,${dy.toFixed(2)}cm)`,
    polar: `(${sx.toFixed(2)}cm,${sy.toFixed(2)}cm) -- +(${deg.toFixed(1)}:${r.toFixed(2)}cm)`,
  };
}

// ============================================================================
// P25: Parametric Scientific Component Stamps (Optics, Circuits, Mechanics, Control)
// ============================================================================

export interface ScientificStampSpec {
  id: string;
  domainRu: 'Оптика' | 'Электрические цепи' | 'Механика' | 'Системы управления';
  titleRu: string;
  summaryRu: string;
  defaultLabelLatex: string;
}

export const SCIENTIFIC_STAMPS: ScientificStampSpec[] = [
  {
    id: 'optics-convex-lens',
    domainRu: 'Оптика',
    titleRu: 'Собирающая линза (ГОСТ ↔)',
    summaryRu: 'Вертикальная ось линзы с расходящимися стрелками и подписью фокуса',
    defaultLabelLatex: 'L_1',
  },
  {
    id: 'optics-concave-lens',
    domainRu: 'Оптика',
    titleRu: 'Рассеивающая линза (>—<)',
    summaryRu: 'Отрицательная линза с обращёнными внутрь засечками',
    defaultLabelLatex: 'L_2',
  },
  {
    id: 'optics-mirror-hatched',
    domainRu: 'Оптика',
    titleRu: 'Зеркало со штриховкой 45°',
    summaryRu: 'Отражающая грань с серией косых штрихов подложки',
    defaultLabelLatex: 'M_1',
  },
  {
    id: 'optics-beamsplitter',
    domainRu: 'Оптика',
    titleRu: 'Кубический делитель пучка (BS)',
    summaryRu: 'Квадратная призма с полупрозрачной диагональю 50:50',
    defaultLabelLatex: '\\text{BS}',
  },
  {
    id: 'circuit-resistor-iec',
    domainRu: 'Электрические цепи',
    titleRu: 'Резистор ГОСТ / IEC',
    summaryRu: 'Прямоугольный корпус с выводами и номиналом сопротивления',
    defaultLabelLatex: 'R_1',
  },
  {
    id: 'circuit-capacitor',
    domainRu: 'Электрические цепи',
    titleRu: 'Плоский конденсатор C',
    summaryRu: 'Две параллельные обкладки с подводящими проводниками',
    defaultLabelLatex: 'C_1',
  },
  {
    id: 'circuit-ground',
    domainRu: 'Электрические цепи',
    titleRu: 'Узел заземления (GND)',
    summaryRu: 'Трёхступенчатый контур потенциала земли',
    defaultLabelLatex: '\\text{GND}',
  },
  {
    id: 'mech-spring',
    domainRu: 'Механика',
    titleRu: 'Упругая пружина жёсткости k',
    summaryRu: 'Зигзагообразный упругий элемент между двумя точками крепления',
    defaultLabelLatex: 'k',
  },
  {
    id: 'mech-fixed-wall',
    domainRu: 'Механика',
    titleRu: 'Жёсткая заделка (опора)',
    summaryRu: 'Неподвижная стенка со штриховкой заделки',
    defaultLabelLatex: '',
  },
  {
    id: 'ctrl-sum-node',
    domainRu: 'Системы управления',
    titleRu: 'Сумматор обратной связи Σ',
    summaryRu: 'Круговой узел суммирования сигналов с меткой знаков',
    defaultLabelLatex: '\\Sigma',
  },
];

export function insertScientificStampIntoSource(
  source: string,
  stampId: string,
  xCm = 3.0,
  yCm = 1.9,
  scale = 1.0,
  customLabel?: string
): { nextSource: string; insertedIds: number[]; lastLine: number } {
  const spec = SCIENTIFIC_STAMPS.find((s) => s.id === stampId) ?? SCIENTIFIC_STAMPS[0];
  const label = customLabel !== undefined ? customLabel : spec.defaultLabelLatex;
  const s = Math.max(0.4, Math.min(2.5, scale));
  let cur = source;
  const ids: number[] = [];
  let lastLine = 1;

  const addPrim = (tool: OwnedPrimitive['tool'], vals: Record<string, string>) => {
    const r = insertOwnedPrimitiveIntoSource(cur, tool, vals);
    cur = r.nextSource;
    ids.push(r.newId);
    lastLine = r.insertedLine;
  };

  if (spec.id === 'optics-convex-lens') {
    const lib = proposeLibraryConnect(cur, 'arrows.meta');
    if (lib.ok) cur = lib.nextSource;
    addPrim('arrow', {
      start_x: fmtCm(xCm),
      start_y: fmtCm(yCm),
      end_x: fmtCm(xCm),
      end_y: fmtCm(yCm + 1.0 * s),
      tip: 'Stealth',
      stroke_width: 'thick',
      stroke_color: 'blue!75!black',
    });
    addPrim('arrow', {
      start_x: fmtCm(xCm),
      start_y: fmtCm(yCm),
      end_x: fmtCm(xCm),
      end_y: fmtCm(yCm - 1.0 * s),
      tip: 'Stealth',
      stroke_width: 'thick',
      stroke_color: 'blue!75!black',
    });
    if (label) {
      addPrim('node', { x: fmtCm(xCm), y: fmtCm(yCm + 1.22 * s), mode: 'math', content: label });
    }
  } else if (spec.id === 'optics-concave-lens') {
    const lib = proposeLibraryConnect(cur, 'arrows.meta');
    if (lib.ok) cur = lib.nextSource;
    addPrim('arrow', {
      start_x: fmtCm(xCm),
      start_y: fmtCm(yCm + 1.0 * s),
      end_x: fmtCm(xCm),
      end_y: fmtCm(yCm),
      tip: 'Stealth',
      stroke_width: 'thick',
      stroke_color: 'teal!80!black',
    });
    addPrim('arrow', {
      start_x: fmtCm(xCm),
      start_y: fmtCm(yCm - 1.0 * s),
      end_x: fmtCm(xCm),
      end_y: fmtCm(yCm),
      tip: 'Stealth',
      stroke_width: 'thick',
      stroke_color: 'teal!80!black',
    });
    if (label) {
      addPrim('node', { x: fmtCm(xCm), y: fmtCm(yCm + 1.22 * s), mode: 'math', content: label });
    }
  } else if (spec.id === 'optics-beamsplitter') {
    const half = 0.45 * s;
    addPrim('rectangle', {
      start_x: fmtCm(xCm - half),
      start_y: fmtCm(yCm - half),
      end_x: fmtCm(xCm + half),
      end_y: fmtCm(yCm + half),
      fill_color: 'cyan!10',
      stroke_color: 'blue!75!black',
    });
    addPrim('line', {
      start_x: fmtCm(xCm - half),
      start_y: fmtCm(yCm - half),
      end_x: fmtCm(xCm + half),
      end_y: fmtCm(yCm + half),
      stroke_width: 'thick',
      stroke_color: 'blue!75!black',
    });
    if (label) {
      addPrim('node', { x: fmtCm(xCm), y: fmtCm(yCm + half + 0.25), mode: 'math', content: label });
    }
  } else if (spec.id === 'circuit-resistor-iec') {
    addPrim('line', {
      start_x: fmtCm(xCm - 0.85 * s),
      start_y: fmtCm(yCm),
      end_x: fmtCm(xCm - 0.45 * s),
      end_y: fmtCm(yCm),
    });
    addPrim('rectangle', {
      start_x: fmtCm(xCm - 0.45 * s),
      start_y: fmtCm(yCm - 0.18 * s),
      end_x: fmtCm(xCm + 0.45 * s),
      end_y: fmtCm(yCm + 0.18 * s),
      stroke_width: 'semithick',
    });
    addPrim('line', {
      start_x: fmtCm(xCm + 0.45 * s),
      start_y: fmtCm(yCm),
      end_x: fmtCm(xCm + 0.85 * s),
      end_y: fmtCm(yCm),
    });
    if (label) {
      addPrim('node', { x: fmtCm(xCm), y: fmtCm(yCm + 0.38 * s), mode: 'math', content: label });
    }
  } else if (spec.id === 'circuit-capacitor') {
    addPrim('line', {
      start_x: fmtCm(xCm - 0.7 * s),
      start_y: fmtCm(yCm),
      end_x: fmtCm(xCm - 0.1 * s),
      end_y: fmtCm(yCm),
    });
    addPrim('line', {
      start_x: fmtCm(xCm - 0.1 * s),
      start_y: fmtCm(yCm - 0.35 * s),
      end_x: fmtCm(xCm - 0.1 * s),
      end_y: fmtCm(yCm + 0.35 * s),
      stroke_width: 'thick',
    });
    addPrim('line', {
      start_x: fmtCm(xCm + 0.1 * s),
      start_y: fmtCm(yCm - 0.35 * s),
      end_x: fmtCm(xCm + 0.1 * s),
      end_y: fmtCm(yCm + 0.35 * s),
      stroke_width: 'thick',
    });
    addPrim('line', {
      start_x: fmtCm(xCm + 0.1 * s),
      start_y: fmtCm(yCm),
      end_x: fmtCm(xCm + 0.7 * s),
      end_y: fmtCm(yCm),
    });
    if (label) {
      addPrim('node', { x: fmtCm(xCm), y: fmtCm(yCm + 0.55 * s), mode: 'math', content: label });
    }
  } else if (spec.id === 'circuit-ground') {
    addPrim('line', { start_x: fmtCm(xCm), start_y: fmtCm(yCm + 0.35 * s), end_x: fmtCm(xCm), end_y: fmtCm(yCm) });
    addPrim('line', {
      start_x: fmtCm(xCm - 0.32 * s),
      start_y: fmtCm(yCm),
      end_x: fmtCm(xCm + 0.32 * s),
      end_y: fmtCm(yCm),
      stroke_width: 'thick',
    });
    addPrim('line', {
      start_x: fmtCm(xCm - 0.2 * s),
      start_y: fmtCm(yCm - 0.11 * s),
      end_x: fmtCm(xCm + 0.2 * s),
      end_y: fmtCm(yCm - 0.11 * s),
    });
    addPrim('line', {
      start_x: fmtCm(xCm - 0.08 * s),
      start_y: fmtCm(yCm - 0.22 * s),
      end_x: fmtCm(xCm + 0.08 * s),
      end_y: fmtCm(yCm - 0.22 * s),
    });
  } else if (spec.id === 'ctrl-sum-node') {
    addPrim('circle', {
      center_x: fmtCm(xCm),
      center_y: fmtCm(yCm),
      radius: fmtCm(0.32 * s),
      fill_color: 'slate!12',
      stroke_width: 'semithick',
    });
    addPrim('node', {
      x: fmtCm(xCm),
      y: fmtCm(yCm),
      mode: 'math',
      content: label || '\\Sigma',
    });
  } else {
    // Mirror / Fixed Wall / Spring with clean hatched or zig-zag lines
    addPrim('line', {
      start_x: fmtCm(xCm),
      start_y: fmtCm(yCm - 0.65 * s),
      end_x: fmtCm(xCm),
      end_y: fmtCm(yCm + 0.65 * s),
      stroke_width: 'thick',
    });
    for (let k = -2; k <= 2; k++) {
      const yy = yCm + k * 0.25 * s;
      addPrim('line', {
        start_x: fmtCm(xCm),
        start_y: fmtCm(yy),
        end_x: fmtCm(xCm + 0.18 * s),
        end_y: fmtCm(yy + 0.15 * s),
        stroke_width: 'thin',
      });
    }
    if (label) {
      addPrim('node', { x: fmtCm(xCm - 0.25 * s), y: fmtCm(yCm + 0.82 * s), mode: 'math', content: label });
    }
  }

  return { nextSource: cur, insertedIds: ids, lastLine };
}

// ============================================================================
// P26: Orthogonal Connector Path Points (-- vs |- vs -|)
// ============================================================================

export function computeOrthogonalConnectorPointsCm(
  x1Cm: number,
  y1Cm: number,
  x2Cm: number,
  y2Cm: number,
  routing?: string
): { x: number; y: number }[] {
  if (routing === '|-') {
    // TikZ (p1) |- (p2): vertical from p1 to p2.y, then horizontal to p2.x
    return [
      { x: x1Cm, y: y1Cm },
      { x: x1Cm, y: y2Cm },
      { x: x2Cm, y: y2Cm },
    ];
  }
  if (routing === '-|') {
    // TikZ (p1) -| (p2): horizontal from p1 to p2.x, then vertical to p2.y
    return [
      { x: x1Cm, y: y1Cm },
      { x: x2Cm, y: y1Cm },
      { x: x2Cm, y: y2Cm },
    ];
  }
  return [
    { x: x1Cm, y: y1Cm },
    { x: x2Cm, y: y2Cm },
  ];
}

// ============================================================================
// P27: Visual PGFPlots \begin{axis} Inspector & Generator
// ============================================================================

export interface PgfplotsAxisConfig {
  present: boolean;
  xlabel: string;
  ylabel: string;
  xmin: string;
  xmax: string;
  ymin: string;
  ymax: string;
  xmode: 'normal' | 'log';
  ymode: 'normal' | 'log';
  grid: 'major' | 'both' | 'none';
  legendPos: 'north east' | 'north west' | 'south east' | 'outer north east';
  errorBarsY: boolean;
}

export function inspectPgfplotsAxis(source: string): PgfplotsAxisConfig {
  const axisMatch = /\\begin\{axis\}\s*(?:\[([\s\S]*?)\])?/.exec(source);
  const opts = axisMatch?.[1] ?? '';
  const extract = (key: string, defVal: string) => {
    const mBrace = new RegExp(`${key}\\s*=\\s*\\{([^}]*)\\}`).exec(opts);
    if (mBrace) return mBrace[1].trim();
    const mPlain = new RegExp(`${key}\\s*=\\s*([^,\\]\\n]+)`).exec(opts);
    return mPlain ? mPlain[1].trim() : defVal;
  };

  return {
    present: Boolean(axisMatch),
    xlabel: extract('xlabel', '$\\lambda$, нм'),
    ylabel: extract('ylabel', '$I(\\lambda)$, отн. ед.'),
    xmin: extract('xmin', '400'),
    xmax: extract('xmax', '700'),
    ymin: extract('ymin', '0'),
    ymax: extract('ymax', '1.1'),
    xmode: extract('xmode', 'normal') === 'log' ? 'log' : 'normal',
    ymode: extract('ymode', 'normal') === 'log' ? 'log' : 'normal',
    grid: (['major', 'both', 'none'].includes(extract('grid', 'major'))
      ? extract('grid', 'major')
      : 'major') as 'major' | 'both' | 'none',
    legendPos: (['north east', 'north west', 'south east', 'outer north east'].includes(
      extract('legend pos', 'north east')
    )
      ? extract('legend pos', 'north east')
      : 'north east') as PgfplotsAxisConfig['legendPos'],
    errorBarsY: source.includes('error bars/.cd'),
  };
}

export function upsertPgfplotsAxisInSource(source: string, cfg: PgfplotsAxisConfig): string {
  const eol = source.includes('\r\n') ? '\r\n' : '\n';
  let cur = source;

  // Ensure \usepackage{pgfplots} and \pgfplotsset{compat=1.18}
  if (!cur.includes('\\usepackage{pgfplots}')) {
    const tikzIdx = cur.indexOf('\\usepackage{tikz}');
    if (tikzIdx !== -1) {
      const lineEnd = cur.indexOf('\n', tikzIdx);
      const insertPos = lineEnd === -1 ? cur.length : lineEnd + 1;
      cur = `${cur.slice(0, insertPos)}\\usepackage{pgfplots}${eol}\\pgfplotsset{compat=1.18}${eol}${cur.slice(insertPos)}`;
    }
  }

  const axisHeader = [
    '  \\begin{axis}[',
    '    width=6.0cm, height=3.8cm,',
    `    xlabel={${cfg.xlabel}},`,
    `    ylabel={${cfg.ylabel}},`,
    `    xmin=${cfg.xmin}, xmax=${cfg.xmax},`,
    `    ymin=${cfg.ymin}, ymax=${cfg.ymax},`,
    ...(cfg.xmode === 'log' ? ['    xmode=log,'] : []),
    ...(cfg.ymode === 'log' ? ['    ymode=log,'] : []),
    `    grid=${cfg.grid},`,
    `    legend pos=${cfg.legendPos}`,
    '  ]',
  ].join(eol);

  const existingAxisRe = /[ \t]*\\begin\{axis\}\s*(?:\[[\s\S]*?\])?/;
  if (existingAxisRe.test(cur)) {
    return cur.replace(existingAxisRe, axisHeader);
  }

  const errPlotOpts = cfg.errorBarsY
    ? 'smooth, thick, blue!75!black, mark=*, error bars/.cd, y dir=both, y explicit'
    : 'smooth, thick, blue!75!black, mark=*';
  const sampleCoords = cfg.errorBarsY
    ? '(420,0.15) +- (0,0.04) (480,0.52) +- (0,0.05) (532,0.96) +- (0,0.03) (600,0.44) +- (0,0.05) (660,0.12) +- (0,0.03)'
    : '(420,0.15) (480,0.52) (532,0.96) (600,0.44) (660,0.12)';

  const fullAxisEnv = [
    axisHeader,
    `    \\addplot[${errPlotOpts}] coordinates { ${sampleCoords} };`,
    '    \\addlegendentry{Эксперимент}',
    '  \\end{axis}',
  ].join(eol);

  const endTikz = cur.lastIndexOf('\\end{tikzpicture}');
  if (endTikz !== -1) {
    let lineStart = endTikz;
    while (lineStart > 0 && cur[lineStart - 1] !== '\n') lineStart--;
    return `${cur.slice(0, lineStart)}${fullAxisEnv}${eol}${cur.slice(lineStart)}`;
  }
  return `${cur}${eol}${fullAxisEnv}${eol}`;
}

// ============================================================================
// P28: Scientific Journal Column Gauge & Typography Readability Auditor
// ============================================================================

export type JournalGaugeId = 'none' | 'ieee-1col' | 'elsevier-1.5col' | 'ieee-2col' | 'gost-a4';

export interface JournalColumnGauge {
  id: JournalGaugeId;
  shortLabelRu: string;
  titleRu: string;
  widthCm: number;
  minFontPt: number;
  minStrokePt: number;
}

export const JOURNAL_COLUMN_GAUGES: JournalColumnGauge[] = [
  {
    id: 'none',
    shortLabelRu: 'Полоса: выкл.',
    titleRu: 'Без ограничителя колонки журнала',
    widthCm: 0,
    minFontPt: 7,
    minStrokePt: 0.25,
  },
  {
    id: 'ieee-1col',
    shortLabelRu: '1 кол. 86мм',
    titleRu: 'IEEE / APS / Physical Review — 1 колонка (86 мм)',
    widthCm: 8.6,
    minFontPt: 7.5,
    minStrokePt: 0.3,
  },
  {
    id: 'elsevier-1.5col',
    shortLabelRu: '1.5 кол. 140мм',
    titleRu: 'Elsevier / Springer — 1.5 колонки (140 мм)',
    widthCm: 14.0,
    minFontPt: 7.5,
    minStrokePt: 0.3,
  },
  {
    id: 'ieee-2col',
    shortLabelRu: '2 кол. 178мм',
    titleRu: 'Двухколоночный разворот figure* (178 мм)',
    widthCm: 17.8,
    minFontPt: 8.0,
    minStrokePt: 0.35,
  },
  {
    id: 'gost-a4',
    shortLabelRu: 'ГОСТ 160мм',
    titleRu: 'Диссертация / ГОСТ 7.0.11 А4 (160 мм)',
    widthCm: 16.0,
    minFontPt: 9.0,
    minStrokePt: 0.4,
  },
];

export interface JournalReadabilityReport {
  gauge: JournalColumnGauge;
  bboxWidthCm: number;
  bboxHeightCm: number;
  printScaleFactor: number;
  effectiveNodeFontPt: number;
  effectiveMinStrokePt: number;
  warningsRu: string[];
  passesAll: boolean;
}

export function auditJournalReadability(
  ownedPrimitives: OwnedPrimitive[],
  source: string,
  gaugeId: JournalGaugeId
): JournalReadabilityReport {
  const gauge = JOURNAL_COLUMN_GAUGES.find((g) => g.id === gaugeId) ?? JOURNAL_COLUMN_GAUGES[0];
  if (gauge.id === 'none' || ownedPrimitives.length === 0) {
    return {
      gauge,
      bboxWidthCm: 0,
      bboxHeightCm: 0,
      printScaleFactor: 1,
      effectiveNodeFontPt: 10,
      effectiveMinStrokePt: 0.4,
      warningsRu: [],
      passesAll: true,
    };
  }

  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;
  for (const p of ownedPrimitives) {
    const b = getPrimitiveBoundsCm(p);
    minX = Math.min(minX, b.minX);
    maxX = Math.max(maxX, b.maxX);
    minY = Math.min(minY, b.minY);
    maxY = Math.max(maxY, b.maxY);
  }
  const bboxWidthCm = Math.max(0.5, +(maxX - minX).toFixed(2));
  const bboxHeightCm = Math.max(0.5, +(maxY - minY).toFixed(2));

  // If figure exceeds journal column width, LaTeX \includegraphics[width=\columnwidth] shrinks it!
  const printScaleFactor = bboxWidthCm > gauge.widthCm ? +(gauge.widthCm / bboxWidthCm).toFixed(2) : 1.0;

  const usesTinyOrScript = /\\(tiny|scriptsize)/.test(source);
  const baseFontPt = usesTinyOrScript ? 7.0 : /\\footnotesize/.test(source) ? 8.0 : 10.0;
  const effectiveNodeFontPt = +(baseFontPt * printScaleFactor).toFixed(1);

  const hasThinStroke = ownedPrimitives.some((p) => p.values.stroke_width === 'thin') || /\[thin/.test(source);
  const baseStrokePt = hasThinStroke ? 0.25 : 0.4;
  const effectiveMinStrokePt = +(baseStrokePt * printScaleFactor).toFixed(2);

  const warningsRu: string[] = [];
  if (bboxWidthCm > gauge.widthCm) {
    warningsRu.push(
      `Ширина схемы (${bboxWidthCm.toFixed(2)} см) превышает полосу «${gauge.shortLabelRu}» (${gauge.widthCm.toFixed(2)} см): при вёрстке рисунок сожмётся в ${(printScaleFactor * 100).toFixed(0)}%.`
    );
  }
  if (effectiveNodeFontPt < gauge.minFontPt) {
    warningsRu.push(
      `Эффективный кегль подписей после масштабирования составит ${effectiveNodeFontPt} pt (норма журнала ≥ ${gauge.minFontPt} pt).`
    );
  }
  if (effectiveMinStrokePt < gauge.minStrokePt) {
    warningsRu.push(
      `Тонкие линии сожмутся до ${effectiveMinStrokePt} pt (риск пропадания при печати, рекомендуется semithick / ≥ ${gauge.minStrokePt} pt).`
    );
  }

  return {
    gauge,
    bboxWidthCm,
    bboxHeightCm,
    printScaleFactor,
    effectiveNodeFontPt,
    effectiveMinStrokePt,
    warningsRu,
    passesAll: warningsRu.length === 0,
  };
}

// ============================================================================
// P29: Okabe-Ito Colorblind-Safe Palette (\definecolor) & Print Proofing
// ============================================================================

export type ColorProofMode = 'normal' | 'grayscale' | 'deuteranopia';

export interface ScientificColorSpec {
  id: string;
  labelRu: string;
  hexNoHash: string;
  cssHex: string;
  recommendedDash: string;
}

export const OKABE_ITO_PALETTE: ScientificColorSpec[] = [
  { id: 'oiBlue', labelRu: 'Okabe–Ito Синий', hexNoHash: '0072B2', cssHex: '#0072B2', recommendedDash: 'solid' },
  { id: 'oiVermilion', labelRu: 'Okabe–Ito Киноварь', hexNoHash: 'D55E00', cssHex: '#D55E00', recommendedDash: 'dashed' },
  { id: 'oiBluishGreen', labelRu: 'Okabe–Ito Изумрудный', hexNoHash: '009E73', cssHex: '#009E73', recommendedDash: 'dotted' },
  { id: 'oiOrange', labelRu: 'Okabe–Ito Янтарный', hexNoHash: 'E69F00', cssHex: '#E69F00', recommendedDash: 'dashed' },
  { id: 'oiPurple', labelRu: 'Okabe–Ito Пурпурный', hexNoHash: 'CC79A7', cssHex: '#CC79A7', recommendedDash: 'dotted' },
  { id: 'oiSkyBlue', labelRu: 'Okabe–Ito Небесный', hexNoHash: '56B4E9', cssHex: '#56B4E9', recommendedDash: 'solid' },
];

export function ensureDefineColorInPreamble(source: string, colorName: string): string {
  const baseName = colorName.split('!')[0].trim();
  const spec = OKABE_ITO_PALETTE.find((c) => c.id === baseName);
  if (!spec) return source;
  if (source.includes(`\\definecolor{${spec.id}}`)) return source;

  const eol = source.includes('\r\n') ? '\r\n' : '\n';
  const defLine = `\\definecolor{${spec.id}}{HTML}{${spec.hexNoHash}}`;
  const beginDocIdx = source.indexOf('\\begin{document}');
  if (beginDocIdx !== -1) {
    return `${source.slice(0, beginDocIdx)}${defLine}${eol}${source.slice(beginDocIdx)}`;
  }
  return `${defLine}${eol}${source}`;
}

// ============================================================================
// P30: Bidirectional SyncTeX Click-to-Source Resolver (PDF -> .tex line)
// ============================================================================

export interface SyncTexHit {
  lineNumber: number;
  distanceCm: number;
  kindRu: string;
  snippet: string;
}

export function resolveSyncTexClick(
  source: string,
  ownedPrimitives: OwnedPrimitive[],
  clickCm: { x: number; y: number }
): SyncTexHit {
  let bestHit: SyncTexHit = {
    lineNumber: 1,
    distanceCm: Infinity,
    kindRu: 'Окружение tikzpicture',
    snippet: '\\begin{tikzpicture}',
  };

  // 1. Check all owned n1 primitives by distance to their bounding box / segment
  for (const p of ownedPrimitives) {
    const b = getPrimitiveBoundsCm(p);
    const clampedX = Math.max(b.minX, Math.min(b.maxX, clickCm.x));
    const clampedY = Math.max(b.minY, Math.min(b.maxY, clickCm.y));
    const dist = Math.hypot(clickCm.x - clampedX, clickCm.y - clampedY);
    if (dist < bestHit.distanceCm) {
      bestHit = {
        lineNumber: p.lineNumber,
        distanceCm: +dist.toFixed(2),
        kindRu: `Примитив n1 #${p.id}`,
        snippet: p.commandPart.trim(),
      };
    }
  }

  // 2. Also scan raw non-n1 TeX lines (custom macros like \myOpticsNote, \addplot, \foreach, raw \node)
  const lines = source.split(/\r?\n/);
  lines.forEach((rawLine, idx) => {
    const lineNum = idx + 1;
    if (rawLine.includes('% tikzarium:n1:')) return;
    const trimmed = rawLine.trim();
    if (!trimmed || trimmed.startsWith('%')) return;

    // Look for explicit (x,y) coordinates on raw lines or macro definitions
    const coordRe = /\(\s*([+-]?\d+(?:\.\d+)?)(?:cm)?\s*,\s*([+-]?\d+(?:\.\d+)?)(?:cm)?\s*\)/g;
    let m: RegExpExecArray | null;
    while ((m = coordRe.exec(rawLine)) !== null) {
      const cx = Number(m[1]);
      const cy = Number(m[2]);
      const dist = Math.hypot(clickCm.x - cx, clickCm.y - cy);
      if (dist < bestHit.distanceCm) {
        bestHit = {
          lineNumber: lineNum,
          distanceCm: +dist.toFixed(2),
          kindRu: 'Команда / макрос TeX',
          snippet: trimmed.slice(0, 72),
        };
      }
    }

    // Macro call like \myOpticsNote{...} placed near bottom note area (0.40cm..4.5cm, 0.25cm)
    if (/^\\[A-Za-z@]+\{/.test(trimmed) && !/^\\(documentclass|usepackage|usetikzlibrary|setmainfont|newcommand|begin|end)/.test(trimmed)) {
      const noteDist = Math.hypot(clickCm.x - 2.2, clickCm.y - 0.3);
      if (noteDist < bestHit.distanceCm && noteDist < 0.75) {
        bestHit = {
          lineNumber: lineNum,
          distanceCm: +noteDist.toFixed(2),
          kindRu: 'Вызов авторского макроса',
          snippet: trimmed.slice(0, 72),
        };
      }
    }
  });

  if (!Number.isFinite(bestHit.distanceCm)) {
    const beginTikzLine = lines.findIndex((l) => l.includes('\\begin{tikzpicture}')) + 1;
    return {
      lineNumber: beginTikzLine || 1,
      distanceCm: 0,
      kindRu: 'Окружение tikzpicture',
      snippet: '\\begin{tikzpicture}',
    };
  }

  return bestHit;
}

// ============================================================================
// P31, P32, P33: Multi-Figure Article Project, Subfigure Matrix & Batch Profiler
// ============================================================================

export const SHARED_STYLE_DEFAULT_TIKZ = `% Общий стилевой паспорт иллюстраций статьи (shared_style.tikz · P31)
\\definecolor{oiBlue}{HTML}{0072B2}
\\definecolor{oiVermilion}{HTML}{D55E00}
\\definecolor{oiBluishGreen}{HTML}{009E73}
\\tikzset{
  tzAxis/.style={-{Stealth[length=2.2mm]}, semithick, draw=black},
  tzOpticRay/.style={-{Stealth[length=2.0mm]}, thick, draw=oiBlue},
  tzNote/.style={font=\\footnotesize}
}`;

export function injectSharedStyleIntoDocument(source: string, sharedStyleTikz: string): string {
  const eol = source.includes('\r\n') ? '\r\n' : '\n';
  const markerStart = '% --- BEGIN shared_style.tikz ---';
  const markerEnd = '% --- END shared_style.tikz ---';
  const block = [markerStart, sharedStyleTikz.trim(), markerEnd].join(eol);

  const startIdx = source.indexOf(markerStart);
  const endIdx = source.indexOf(markerEnd);
  if (startIdx !== -1 && endIdx !== -1 && endIdx > startIdx) {
    return `${source.slice(0, startIdx)}${block}${source.slice(endIdx + markerEnd.length)}`;
  }

  const beginDocIdx = source.indexOf('\\begin{document}');
  if (beginDocIdx !== -1) {
    return `${source.slice(0, beginDocIdx)}${block}${eol}${source.slice(beginDocIdx)}`;
  }
  return `${block}${eol}${source}`;
}

export interface SubfigureMatrixOptions {
  layout: '1x2' | '2x1' | '2x2';
  alphabet: 'ru' | 'en';
  colGapCm: number;
  rowGapCm: number;
  filename: string;
}

export function composeSubfigureMatrixTex(
  figures: SpecimenDocument[],
  options: SubfigureMatrixOptions
): SpecimenDocument {
  const selected = figures.slice(0, options.layout === '2x2' ? 4 : 2);
  const labels =
    options.alphabet === 'ru' ? ['(а)', '(б)', '(в)', '(г)'] : ['(a)', '(b)', '(c)', '(d)'];

  const cols = options.layout === '1x2' || options.layout === '2x2' ? 2 : 1;
  const stepX = +(6.4 + options.colGapCm).toFixed(2);
  const stepY = +(4.2 + options.rowGapCm).toFixed(2);

  const panelScopes = selected.map((fig, idx) => {
    const col = idx % cols;
    const row = Math.floor(idx / cols);
    const xShift = +(col * stepX).toFixed(2);
    const yShift = +(-row * stepY).toFixed(2);

    // Extract inner body inside \begin{tikzpicture}...\end{tikzpicture} cleanly without n1 tails
    const cleanBlock = extractTikzpictureBlock(fig.source, true);
    const innerLines = cleanBlock
      .split(/\r?\n/)
      .filter(
        (l) =>
          !l.trim().startsWith('\\begin{tikzpicture}') &&
          !l.trim().startsWith('\\end{tikzpicture}')
      )
      .map((l) => `    ${l.trim()}`)
      .filter((l) => l.trim().length > 0);

    return [
      `  % Панель ${labels[idx]} — источник: ${fig.filename}`,
      `  \\begin{scope}[xshift=${xShift.toFixed(2)}cm, yshift=${yShift.toFixed(2)}cm]`,
      `    \\node[anchor=north west, font=\\bfseries\\small] at (-0.35cm, 3.95cm) {${labels[idx]}};`,
      ...innerLines,
      `  \\end{scope}`,
    ].join('\n');
  });

  const needsPgfplots = selected.some((f) => f.source.includes('\\begin{axis}'));
  const compositeSource = [
    '\\documentclass[tikz,border=6pt]{standalone}',
    '\\usepackage{fontspec}',
    '\\usepackage{unicode-math}',
    '\\usepackage{tikz}',
    ...(needsPgfplots ? ['\\usepackage{pgfplots}', '\\pgfplotsset{compat=1.18}'] : []),
    '\\usetikzlibrary{arrows.meta,calc,positioning}',
    '\\setmainfont{DejaVu Serif}',
    '\\newcommand{\\myOpticsNote}[1]{\\node[font=\\footnotesize, anchor=west] at (0.40cm,0.25cm) {#1};}',
    '\\begin{document}',
    '\\begin{tikzpicture}',
    ...panelScopes,
    '\\end{tikzpicture}',
    '\\end{document}',
    '',
  ].join('\n');

  const safeName = options.filename.endsWith('.tex') ? options.filename : `${options.filename}.tex`;
  return {
    id: `subfig-matrix-${Date.now()}`,
    filename: safeName,
    titleRu: `Составная панель ${labels.slice(0, selected.length).join(' ')} (${safeName})`,
    subtitleRu: `Собрано из ${selected.length} схем проекта (${options.layout})`,
    lineEnding: 'LF',
    dataDependencies: [],
    source: compositeSource,
  };
}

export interface BatchFigureProfileItem {
  id: string;
  filename: string;
  titleRu: string;
  ownedCount: number;
  diagnosticsCount: number;
  status: 'READY' | 'ERROR';
  preambleMs: number;
  fontspecMs: number;
  pgfRenderMs: number;
  totalEstimateMs: number;
  cleanTex: string;
  optimizationHintRu: string;
}

export function runBatchProjectAuditAndExport(
  documents: SpecimenDocument[]
): {
  items: BatchFigureProfileItem[];
  readyCount: number;
  errorCount: number;
  totalMs: number;
  combinedCleanBundleTex: string;
} {
  const items: BatchFigureProfileItem[] = documents.map((doc) => {
    const owned = parseOwnedPrimitives(doc.source);
    const diags = analyzeTexDiagnostics(doc.source);
    const hasErr = diags.some((d) => d.severity === 'error');
    const hasFontspec = doc.source.includes('fontspec');
    const hasPgfplots = doc.source.includes('pgfplots');
    const hasForeach = doc.source.includes('\\foreach');

    const preambleMs = 115 + (hasPgfplots ? 190 : 0);
    const fontspecMs = hasFontspec ? 145 : 25;
    const pgfRenderMs = 45 + owned.length * 14 + (hasForeach ? 38 : 0) + (hasPgfplots ? 95 : 0);
    const totalEstimateMs = preambleMs + fontspecMs + pgfRenderMs;

    const optimizationHintRu = hasPgfplots
      ? 'Тяжёлый пакет pgfplots: рекомендуется \\usetikzlibrary{external} для кэша PDF.'
      : hasFontspec
        ? 'Основное время занимает инициализация шрифтов fontspec (норма для XeLaTeX).'
        : 'Быстрая сборка базового ядра PGF/TikZ.';

    return {
      id: doc.id,
      filename: doc.filename,
      titleRu: doc.titleRu,
      ownedCount: owned.length,
      diagnosticsCount: diags.length,
      status: hasErr ? 'ERROR' : 'READY',
      preambleMs,
      fontspecMs,
      pgfRenderMs,
      totalEstimateMs,
      cleanTex: stripAllOwnershipMetadata(doc.source),
      optimizationHintRu,
    };
  });

  const readyCount = items.filter((i) => i.status === 'READY').length;
  const errorCount = items.length - readyCount;
  const totalMs = items.reduce((acc, i) => acc + i.totalEstimateMs, 0);

  const combinedCleanBundleTex = items
    .filter((i) => i.status === 'READY')
    .map(
      (i) =>
        `% =====================================================================\n% FILE: ${i.filename} (clean Overleaf export)\n% =====================================================================\n${i.cleanTex.trim()}\n`
    )
    .join('\n');

  return {
    items,
    readyCount,
    errorCount,
    totalMs,
    combinedCleanBundleTex,
  };
}

// ============================================================================
// P35: System Clipboard Table Parser (Excel / Calc TSV -> n1 Curve or PGFPlots)
// ============================================================================

export function parseClipboardTableToSource(
  source: string,
  clipboardText: string,
  targetMode: 'n1-points' | 'pgfplots-addplot'
): { ok: boolean; nextSource: string; pointCount: number; summaryRu: string } {
  const rows = clipboardText
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0 && !l.startsWith('#') && !l.startsWith('%'));

  const pts: { x: number; y: number }[] = [];
  for (const row of rows) {
    // Support TSV (\t), semicolon (;), comma (,) with optional decimal comma if tab-separated
    const cols = row.includes('\t')
      ? row.split('\t').map((c) => c.trim().replace(',', '.'))
      : row.split(/[,;\s]+/).map((c) => c.trim());
    if (cols.length >= 2) {
      const x = Number(cols[0]);
      const y = Number(cols[1]);
      if (Number.isFinite(x) && Number.isFinite(y)) {
        pts.push({ x, y });
      }
    }
  }

  if (pts.length < 2) {
    return {
      ok: false,
      nextSource: source,
      pointCount: 0,
      summaryRu: 'В буфере обмена не найдено минимум 2 числовых строк (X, Y).',
    };
  }

  if (targetMode === 'pgfplots-addplot') {
    const eol = source.includes('\r\n') ? '\r\n' : '\n';
    const coords = pts.map((p) => `(${p.x},${p.y})`).join(' ');
    const withAxis = source.includes('\\begin{axis}')
      ? source
      : upsertPgfplotsAxisInSource(source, {
          present: false,
          xlabel: '$X$',
          ylabel: '$Y$',
          xmin: String(Math.min(...pts.map((p) => p.x))),
          xmax: String(Math.max(...pts.map((p) => p.x))),
          ymin: String(Math.min(...pts.map((p) => p.y))),
          ymax: String(Math.max(...pts.map((p) => p.y))),
          xmode: 'normal',
          ymode: 'normal',
          grid: 'major',
          legendPos: 'north east',
          errorBarsY: false,
        });

    const endAxis = withAxis.lastIndexOf('\\end{axis}');
    const plotLine = `    \\addplot[thick, draw=teal!80!black, mark=square*] coordinates { ${coords} };`;
    const nextSource =
      endAxis !== -1
        ? `${withAxis.slice(0, endAxis)}${plotLine}${eol}  ${withAxis.slice(endAxis).trimStart()}`
        : withAxis;

    return {
      ok: true,
      nextSource,
      pointCount: pts.length,
      summaryRu: `Вставлена серия \\addplot (${pts.length} точек из табличного буфера ОС).`,
    };
  }

  // Scale points cleanly into 0.8..5.4cm x 0.6..3.2cm canvas area as n1 segments + circles!
  const minX = Math.min(...pts.map((p) => p.x));
  const maxX = Math.max(...pts.map((p) => p.x));
  const minY = Math.min(...pts.map((p) => p.y));
  const maxY = Math.max(...pts.map((p) => p.y));
  const spanX = Math.max(1e-6, maxX - minX);
  const spanY = Math.max(1e-6, maxY - minY);

  const mapped = pts.slice(0, 12).map((p) => ({
    cx: +(0.8 + ((p.x - minX) / spanX) * 4.6).toFixed(2),
    cy: +(0.6 + ((p.y - minY) / spanY) * 2.6).toFixed(2),
  }));

  let cur = source;
  for (let i = 0; i < mapped.length - 1; i++) {
    cur = insertOwnedPrimitiveIntoSource(cur, 'line', {
      start_x: fmtCm(mapped[i].cx),
      start_y: fmtCm(mapped[i].cy),
      end_x: fmtCm(mapped[i + 1].cx),
      end_y: fmtCm(mapped[i + 1].cy),
      stroke_color: 'blue!75!black',
      stroke_width: 'semithick',
    }).nextSource;
  }
  for (const pt of mapped) {
    cur = insertOwnedPrimitiveIntoSource(cur, 'circle', {
      center_x: fmtCm(pt.cx),
      center_y: fmtCm(pt.cy),
      radius: '0.07cm',
      stroke_color: 'blue!75!black',
      fill_color: 'cyan!10',
    }).nextSource;
  }

  return {
    ok: true,
    nextSource: cur,
    pointCount: mapped.length,
    summaryRu: `На холст вставлено ${mapped.length} точек и связей n1 из таблицы Excel/TSV.`,
  };
}
