import { PRIMITIVE_TOOLS, TIKZ_LIBRARIES } from './catalog';
import type { SpecimenDocument, ToolId, UiThemeId } from './catalog';
import {
  OWNERSHIP_MARKER,
  applyOwnedPrimitivePatch,
  encodeOwnershipHex,
  generateOwnedLine,
  parseDimensionToCm,
  parseOwnedPrimitives,
  parsePolyPointsList,
  proposeLibraryConnect,
  serializePolyPointsList,
  snapCoordinateCm,
  translateOwnedPrimitiveCm,
} from './tikzEngine';
import type { OwnedPrimitive, TexDiagnostic } from './tikzEngine';

// ============================================================================
// P01: Interactive On-Canvas Resize & Bezier Control Handles
// ============================================================================

export type HandleKind = 'endpoint' | 'corner' | 'radius' | 'bezier-control' | 'anchor';

export interface CanvasControlHandle {
  handleId: string;
  primitiveId: number;
  kind: HandleKind;
  xCm: number;
  yCm: number;
  labelRu: string;
}

export function getPrimitiveHandles(prim: OwnedPrimitive): CanvasControlHandle[] {
  const v = prim.values;
  switch (prim.tool) {
    case 'line':
    case 'arrow': {
      if (v.poly_points) {
        const pts = parsePolyPointsList(v.poly_points);
        if (pts.length >= 2) {
          return pts.map((pt, idx) => ({
            handleId: `poly_${idx}`,
            primitiveId: prim.id,
            kind: 'corner' as const,
            xCm: pt.xCm,
            yCm: pt.yCm,
            labelRu: `Вершина ${idx + 1}`,
          }));
        }
      }
      const sx = parseDimensionToCm(v.start_x) ?? 0.5;
      const sy = parseDimensionToCm(v.start_y) ?? 0.5;
      const ex = parseDimensionToCm(v.end_x) ?? 2.5;
      const ey = parseDimensionToCm(v.end_y) ?? 1.5;
      return [
        { handleId: 'start', primitiveId: prim.id, kind: 'endpoint', xCm: sx, yCm: sy, labelRu: 'Начало' },
        { handleId: 'end', primitiveId: prim.id, kind: 'endpoint', xCm: ex, yCm: ey, labelRu: 'Конец' },
      ];
    }
    case 'rectangle': {
      const x1 = parseDimensionToCm(v.start_x) ?? 0.8;
      const y1 = parseDimensionToCm(v.start_y) ?? 0.6;
      const x2 = parseDimensionToCm(v.end_x) ?? 3.0;
      const y2 = parseDimensionToCm(v.end_y) ?? 2.0;
      return [
        { handleId: 'p1', primitiveId: prim.id, kind: 'corner', xCm: x1, yCm: y1, labelRu: 'Угол 1' },
        { handleId: 'p2', primitiveId: prim.id, kind: 'corner', xCm: x2, yCm: y2, labelRu: 'Угол 2' },
        { handleId: 'p12', primitiveId: prim.id, kind: 'corner', xCm: x1, yCm: y2, labelRu: 'Угол СЗ' },
        { handleId: 'p21', primitiveId: prim.id, kind: 'corner', xCm: x2, yCm: y1, labelRu: 'Угол ЮВ' },
      ];
    }
    case 'circle': {
      const cx = parseDimensionToCm(v.center_x) ?? 2.0;
      const cy = parseDimensionToCm(v.center_y) ?? 1.5;
      const r = Math.max(0.08, parseDimensionToCm(v.radius) ?? 0.6);
      return [
        { handleId: 'center', primitiveId: prim.id, kind: 'anchor', xCm: cx, yCm: cy, labelRu: 'Центр' },
        { handleId: 'radius_e', primitiveId: prim.id, kind: 'radius', xCm: +(cx + r).toFixed(2), yCm: cy, labelRu: 'Радиус' },
        { handleId: 'radius_n', primitiveId: prim.id, kind: 'radius', xCm: cx, yCm: +(cy + r).toFixed(2), labelRu: 'Радиус' },
      ];
    }
    case 'cubic': {
      const sx = parseDimensionToCm(v.start_x) ?? 0.6;
      const sy = parseDimensionToCm(v.start_y) ?? 0.8;
      const c1x = parseDimensionToCm(v.control1_x) ?? 1.6;
      const c1y = parseDimensionToCm(v.control1_y) ?? 2.4;
      const c2x = parseDimensionToCm(v.control2_x) ?? 3.2;
      const c2y = parseDimensionToCm(v.control2_y) ?? 2.4;
      const ex = parseDimensionToCm(v.end_x) ?? 4.4;
      const ey = parseDimensionToCm(v.end_y) ?? 1.1;
      return [
        { handleId: 'start', primitiveId: prim.id, kind: 'endpoint', xCm: sx, yCm: sy, labelRu: 'Начало Безье' },
        { handleId: 'c1', primitiveId: prim.id, kind: 'bezier-control', xCm: c1x, yCm: c1y, labelRu: 'Касательная c1' },
        { handleId: 'c2', primitiveId: prim.id, kind: 'bezier-control', xCm: c2x, yCm: c2y, labelRu: 'Касательная c2' },
        { handleId: 'end', primitiveId: prim.id, kind: 'endpoint', xCm: ex, yCm: ey, labelRu: 'Конец Безье' },
      ];
    }
    case 'node': {
      const nx = parseDimensionToCm(v.x) ?? 2.4;
      const ny = parseDimensionToCm(v.y) ?? 2.0;
      return [
        { handleId: 'pos', primitiveId: prim.id, kind: 'anchor', xCm: nx, yCm: ny, labelRu: 'Точка узла' },
      ];
    }
  }
}

export function applyHandleDragToValues(
  prim: OwnedPrimitive,
  handleId: string,
  targetCm: { x: number; y: number },
  gridSnap = 0
): Record<string, string> {
  const x = snapCoordinateCm(targetCm.x, gridSnap);
  const y = snapCoordinateCm(targetCm.y, gridSnap);
  const fmt = (n: number) => `${n.toFixed(2)}cm`;
  const next = { ...prim.values };

  switch (prim.tool) {
    case 'line':
    case 'arrow':
      if (handleId.startsWith('poly_') && next.poly_points) {
        const idx = Number(handleId.slice(5));
        const pts = parsePolyPointsList(next.poly_points);
        if (Number.isFinite(idx) && idx >= 0 && idx < pts.length) {
          pts[idx] = { xCm: x, yCm: y };
          next.poly_points = serializePolyPointsList(pts);
          if (pts[0]) {
            next.start_x = fmt(pts[0].xCm);
            next.start_y = fmt(pts[0].yCm);
          }
          if (pts[1]) {
            next.end_x = fmt(pts[1].xCm);
            next.end_y = fmt(pts[1].yCm);
          }
        }
        return next;
      }
      if (handleId === 'start') {
        next.start_x = fmt(x);
        next.start_y = fmt(y);
        delete next.from_node;
      } else if (handleId === 'end') {
        next.end_x = fmt(x);
        next.end_y = fmt(y);
        delete next.to_node;
      }
      return next;

    case 'rectangle':
      if (handleId === 'p1') {
        next.start_x = fmt(x);
        next.start_y = fmt(y);
      } else if (handleId === 'p2') {
        next.end_x = fmt(x);
        next.end_y = fmt(y);
      } else if (handleId === 'p12') {
        next.start_x = fmt(x);
        next.end_y = fmt(y);
      } else if (handleId === 'p21') {
        next.end_x = fmt(x);
        next.start_y = fmt(y);
      }
      return next;

    case 'circle': {
      if (handleId === 'center') {
        next.center_x = fmt(x);
        next.center_y = fmt(y);
      } else {
        const cx = parseDimensionToCm(next.center_x) ?? 2.0;
        const cy = parseDimensionToCm(next.center_y) ?? 1.5;
        const r = Math.max(0.1, +(Math.hypot(x - cx, y - cy)).toFixed(2));
        next.radius = fmt(r);
      }
      return next;
    }

    case 'cubic':
      if (handleId === 'start') {
        next.start_x = fmt(x);
        next.start_y = fmt(y);
      } else if (handleId === 'c1') {
        next.control1_x = fmt(x);
        next.control1_y = fmt(y);
      } else if (handleId === 'c2') {
        next.control2_x = fmt(x);
        next.control2_y = fmt(y);
      } else if (handleId === 'end') {
        next.end_x = fmt(x);
        next.end_y = fmt(y);
      }
      return next;

    case 'node':
      next.x = fmt(x);
      next.y = fmt(y);
      return next;
  }
}

// ============================================================================
// P02: Smart Snap Guides & Object Alignment Snapping
// ============================================================================

export interface SnapGuide {
  axis: 'x' | 'y';
  coordCm: number;
  fromCm: number;
  toCm: number;
  sourcePrimitiveId: number;
  labelRu: string;
}

export interface SmartSnapResult {
  snappedCm: { x: number; y: number };
  guides: SnapGuide[];
  snappedNodeId?: string;
}

export function getPrimitiveBoundsCm(prim: OwnedPrimitive): {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
  centerX: number;
  centerY: number;
} {
  const v = prim.values;
  switch (prim.tool) {
    case 'line':
    case 'arrow':
    case 'rectangle': {
      if ((prim.tool === 'line' || prim.tool === 'arrow') && v.poly_points) {
        const pts = parsePolyPointsList(v.poly_points);
        if (pts.length >= 2) {
          const xs = pts.map((p) => p.xCm);
          const ys = pts.map((p) => p.yCm);
          const minX = Math.min(...xs);
          const maxX = Math.max(...xs);
          const minY = Math.min(...ys);
          const maxY = Math.max(...ys);
          return {
            minX,
            maxX,
            minY,
            maxY,
            centerX: +((minX + maxX) / 2).toFixed(2),
            centerY: +((minY + maxY) / 2).toFixed(2),
          };
        }
      }
      const x1 = parseDimensionToCm(v.start_x) ?? 0;
      const y1 = parseDimensionToCm(v.start_y) ?? 0;
      const x2 = parseDimensionToCm(v.end_x) ?? 1;
      const y2 = parseDimensionToCm(v.end_y) ?? 1;
      const minX = Math.min(x1, x2);
      const maxX = Math.max(x1, x2);
      const minY = Math.min(y1, y2);
      const maxY = Math.max(y1, y2);
      return { minX, maxX, minY, maxY, centerX: +((minX + maxX) / 2).toFixed(2), centerY: +((minY + maxY) / 2).toFixed(2) };
    }
    case 'circle': {
      const cx = parseDimensionToCm(v.center_x) ?? 2;
      const cy = parseDimensionToCm(v.center_y) ?? 1.5;
      const r = parseDimensionToCm(v.radius) ?? 0.5;
      return { minX: cx - r, maxX: cx + r, minY: cy - r, maxY: cy + r, centerX: cx, centerY: cy };
    }
    case 'node': {
      const nx = parseDimensionToCm(v.x) ?? 2;
      const ny = parseDimensionToCm(v.y) ?? 2;
      return { minX: nx - 0.45, maxX: nx + 0.45, minY: ny - 0.22, maxY: ny + 0.22, centerX: nx, centerY: ny };
    }
    case 'cubic': {
      const xs = [
        parseDimensionToCm(v.start_x) ?? 0,
        parseDimensionToCm(v.control1_x) ?? 1,
        parseDimensionToCm(v.control2_x) ?? 2,
        parseDimensionToCm(v.end_x) ?? 3,
      ];
      const ys = [
        parseDimensionToCm(v.start_y) ?? 0,
        parseDimensionToCm(v.control1_y) ?? 1,
        parseDimensionToCm(v.control2_y) ?? 1,
        parseDimensionToCm(v.end_y) ?? 0,
      ];
      const minX = Math.min(...xs);
      const maxX = Math.max(...xs);
      const minY = Math.min(...ys);
      const maxY = Math.max(...ys);
      return { minX, maxX, minY, maxY, centerX: +((minX + maxX) / 2).toFixed(2), centerY: +((minY + maxY) / 2).toFixed(2) };
    }
  }
}

export function computeSmartSnap(
  rawPtCm: { x: number; y: number },
  primitives: OwnedPrimitive[],
  excludeIds: number[] = [],
  thresholdCm = 0.14
): SmartSnapResult {
  const excluded = new Set(excludeIds);
  let bestX: { val: number; dist: number; guide: SnapGuide } | null = null;
  let bestY: { val: number; dist: number; guide: SnapGuide } | null = null;
  let snappedNodeId: string | undefined;

  for (const p of primitives) {
    if (excluded.has(p.id)) continue;
    const b = getPrimitiveBoundsCm(p);
    const xCandidates = [b.centerX, b.minX, b.maxX];
    const yCandidates = [b.centerY, b.minY, b.maxY];

    if (p.tool === 'node' && p.values.node_id) {
      const distToNode = Math.hypot(rawPtCm.x - b.centerX, rawPtCm.y - b.centerY);
      if (distToNode <= thresholdCm * 1.8) {
        snappedNodeId = p.values.node_id;
      }
    }

    for (const cx of xCandidates) {
      const d = Math.abs(rawPtCm.x - cx);
      if (d <= thresholdCm && (!bestX || d < bestX.dist)) {
        bestX = {
          val: +cx.toFixed(2),
          dist: d,
          guide: {
            axis: 'x',
            coordCm: +cx.toFixed(2),
            fromCm: Math.min(rawPtCm.y, b.minY) - 0.25,
            toCm: Math.max(rawPtCm.y, b.maxY) + 0.25,
            sourcePrimitiveId: p.id,
            labelRu: `X=${cx.toFixed(2)}см (#${p.id})`,
          },
        };
      }
    }

    for (const cy of yCandidates) {
      const d = Math.abs(rawPtCm.y - cy);
      if (d <= thresholdCm && (!bestY || d < bestY.dist)) {
        bestY = {
          val: +cy.toFixed(2),
          dist: d,
          guide: {
            axis: 'y',
            coordCm: +cy.toFixed(2),
            fromCm: Math.min(rawPtCm.x, b.minX) - 0.25,
            toCm: Math.max(rawPtCm.x, b.maxX) + 0.25,
            sourcePrimitiveId: p.id,
            labelRu: `Y=${cy.toFixed(2)}см (#${p.id})`,
          },
        };
      }
    }
  }

  const guides: SnapGuide[] = [];
  if (bestX) guides.push(bestX.guide);
  if (bestY) guides.push(bestY.guide);

  return {
    snappedCm: {
      x: bestX ? bestX.val : rawPtCm.x,
      y: bestY ? bestY.val : rawPtCm.y,
    },
    guides,
    snappedNodeId,
  };
}

// ============================================================================
// P03: Marquee Multi-Selection & Batch Alignment / Distribution
// ============================================================================

export type AlignmentMode =
  | 'left'
  | 'center-x'
  | 'right'
  | 'bottom'
  | 'center-y'
  | 'top'
  | 'distribute-x'
  | 'distribute-y';

export function findPrimitivesInMarquee(
  primitives: OwnedPrimitive[],
  aCm: { x: number; y: number },
  bCm: { x: number; y: number }
): number[] {
  const minX = Math.min(aCm.x, bCm.x);
  const maxX = Math.max(aCm.x, bCm.x);
  const minY = Math.min(aCm.y, bCm.y);
  const maxY = Math.max(aCm.y, bCm.y);

  return primitives
    .filter((p) => {
      const bounds = getPrimitiveBoundsCm(p);
      // Intersects or contained inside marquee rectangle
      return bounds.maxX >= minX && bounds.minX <= maxX && bounds.maxY >= minY && bounds.minY <= maxY;
    })
    .map((p) => p.id);
}

export function alignOwnedPrimitivesInSource(
  source: string,
  targetIds: number[],
  mode: AlignmentMode
): string {
  if (targetIds.length < 2) return source;
  const all = parseOwnedPrimitives(source);
  const items = all.filter((p) => targetIds.includes(p.id));
  if (items.length < 2) return source;

  const boxes = items.map((item) => ({ item, box: getPrimitiveBoundsCm(item) }));
  let nextSource = source;

  if (mode === 'distribute-x' && boxes.length >= 3) {
    const sorted = [...boxes].sort((a, b) => a.box.centerX - b.box.centerX);
    const firstX = sorted[0].box.centerX;
    const lastX = sorted[sorted.length - 1].box.centerX;
    const step = (lastX - firstX) / (sorted.length - 1);
    sorted.forEach((entry, idx) => {
      const desiredCenter = +(firstX + step * idx).toFixed(2);
      const dx = +(desiredCenter - entry.box.centerX).toFixed(2);
      if (Math.abs(dx) >= 0.01) {
        const currentOwned = parseOwnedPrimitives(nextSource).find((p) => p.id === entry.item.id);
        if (currentOwned) {
          nextSource = applyOwnedPrimitivePatch(
            nextSource,
            currentOwned.id,
            translateOwnedPrimitiveCm(currentOwned.tool, currentOwned.values, dx, 0)
          );
        }
      }
    });
    return nextSource;
  }

  if (mode === 'distribute-y' && boxes.length >= 3) {
    const sorted = [...boxes].sort((a, b) => a.box.centerY - b.box.centerY);
    const firstY = sorted[0].box.centerY;
    const lastY = sorted[sorted.length - 1].box.centerY;
    const step = (lastY - firstY) / (sorted.length - 1);
    sorted.forEach((entry, idx) => {
      const desiredCenter = +(firstY + step * idx).toFixed(2);
      const dy = +(desiredCenter - entry.box.centerY).toFixed(2);
      if (Math.abs(dy) >= 0.01) {
        const currentOwned = parseOwnedPrimitives(nextSource).find((p) => p.id === entry.item.id);
        if (currentOwned) {
          nextSource = applyOwnedPrimitivePatch(
            nextSource,
            currentOwned.id,
            translateOwnedPrimitiveCm(currentOwned.tool, currentOwned.values, 0, dy)
          );
        }
      }
    });
    return nextSource;
  }

  const globalMinX = Math.min(...boxes.map((b) => b.box.minX));
  const globalMaxX = Math.max(...boxes.map((b) => b.box.maxX));
  const globalCenterX = +((globalMinX + globalMaxX) / 2).toFixed(2);
  const globalMinY = Math.min(...boxes.map((b) => b.box.minY));
  const globalMaxY = Math.max(...boxes.map((b) => b.box.maxY));
  const globalCenterY = +((globalMinY + globalMaxY) / 2).toFixed(2);

  for (const entry of boxes) {
    let dx = 0;
    let dy = 0;
    if (mode === 'left') dx = +(globalMinX - entry.box.minX).toFixed(2);
    if (mode === 'right') dx = +(globalMaxX - entry.box.maxX).toFixed(2);
    if (mode === 'center-x') dx = +(globalCenterX - entry.box.centerX).toFixed(2);
    if (mode === 'bottom') dy = +(globalMinY - entry.box.minY).toFixed(2);
    if (mode === 'top') dy = +(globalMaxY - entry.box.maxY).toFixed(2);
    if (mode === 'center-y') dy = +(globalCenterY - entry.box.centerY).toFixed(2);

    if (Math.abs(dx) >= 0.01 || Math.abs(dy) >= 0.01) {
      const currentOwned = parseOwnedPrimitives(nextSource).find((p) => p.id === entry.item.id);
      if (currentOwned) {
        nextSource = applyOwnedPrimitivePatch(
          nextSource,
          currentOwned.id,
          translateOwnedPrimitiveCm(currentOwned.tool, currentOwned.values, dx, dy)
        );
      }
    }
  }
  return nextSource;
}

// ============================================================================
// P06: Z-Order Layer Reordering inside \begin{tikzpicture}
// ============================================================================

export type ZOrderDirection = 'backward' | 'forward' | 'back' | 'front';

export function reorderOwnedPrimitiveInSource(
  source: string,
  primitiveId: number,
  direction: ZOrderDirection
): { nextSource: string; newLineNumber: number } {
  const eol = source.includes('\r\n') ? '\r\n' : '\n';
  const lines = source.split(/\r?\n/);
  const owned = parseOwnedPrimitives(source);
  const idxInOwned = owned.findIndex((p) => p.id === primitiveId);
  if (idxInOwned === -1 || owned.length < 2) {
    return { nextSource: source, newLineNumber: owned[idxInOwned]?.lineNumber ?? 1 };
  }

  let targetOwnedIdx = idxInOwned;
  if (direction === 'backward') targetOwnedIdx = Math.max(0, idxInOwned - 1);
  if (direction === 'forward') targetOwnedIdx = Math.min(owned.length - 1, idxInOwned + 1);
  if (direction === 'back') targetOwnedIdx = 0;
  if (direction === 'front') targetOwnedIdx = owned.length - 1;

  if (targetOwnedIdx === idxInOwned) {
    return { nextSource: source, newLineNumber: owned[idxInOwned].lineNumber };
  }

  const fromLineIdx = owned[idxInOwned].lineNumber - 1;
  const toLineIdx = owned[targetOwnedIdx].lineNumber - 1;
  const [movedLine] = lines.splice(fromLineIdx, 1);
  lines.splice(toLineIdx, 0, movedLine);
  const nextSource = lines.join(eol);
  const updated = parseOwnedPrimitives(nextSource).find((p) => p.id === primitiveId);
  return {
    nextSource,
    newLineNumber: updated?.lineNumber ?? toLineIdx + 1,
  };
}

// ============================================================================
// P09: Smart Node Connectors (Logical (A) -- (B) Binding)
// ============================================================================

export function resolveSmartConnectorEndpoints(
  prim: OwnedPrimitive,
  allPrimitives: OwnedPrimitive[]
): { x1Cm: number; y1Cm: number; x2Cm: number; y2Cm: number; isBound: boolean } {
  let x1Cm = parseDimensionToCm(prim.values.start_x) ?? 0.5;
  let y1Cm = parseDimensionToCm(prim.values.start_y) ?? 0.5;
  let x2Cm = parseDimensionToCm(prim.values.end_x) ?? 2.5;
  let y2Cm = parseDimensionToCm(prim.values.end_y) ?? 1.5;
  let isBound = false;

  if (prim.values.from_node) {
    const srcNode = allPrimitives.find((p) => p.tool === 'node' && p.values.node_id === prim.values.from_node);
    if (srcNode) {
      x1Cm = parseDimensionToCm(srcNode.values.x) ?? x1Cm;
      y1Cm = parseDimensionToCm(srcNode.values.y) ?? y1Cm;
      isBound = true;
    }
  }
  if (prim.values.to_node) {
    const dstNode = allPrimitives.find((p) => p.tool === 'node' && p.values.node_id === prim.values.to_node);
    if (dstNode) {
      x2Cm = parseDimensionToCm(dstNode.values.x) ?? x2Cm;
      y2Cm = parseDimensionToCm(dstNode.values.y) ?? y2Cm;
      isBound = true;
    }
  }

  // Trim endpoints slightly away from node label center when connected to a node
  if (isBound) {
    const dx = x2Cm - x1Cm;
    const dy = y2Cm - y1Cm;
    const len = Math.hypot(dx, dy);
    if (len > 0.7) {
      const pad = 0.28;
      if (prim.values.from_node) {
        x1Cm = +(x1Cm + (dx / len) * pad).toFixed(2);
        y1Cm = +(y1Cm + (dy / len) * pad).toFixed(2);
      }
      if (prim.values.to_node) {
        x2Cm = +(x2Cm - (dx / len) * pad).toFixed(2);
        y2Cm = +(y2Cm - (dy / len) * pad).toFixed(2);
      }
    }
  }

  return { x1Cm, y1Cm, x2Cm, y2Cm, isBound };
}

// ============================================================================
// P10: Preamble Code Folding Range Detection
// ============================================================================

export function detectPreambleFoldRange(source: string): {
  canFold: boolean;
  startLine: number;
  endLine: number;
  summaryRu: string;
} {
  const lines = source.split(/\r?\n/);
  const beginDocIdx = lines.findIndex((l) => l.includes('\\begin{document}'));
  if (beginDocIdx <= 1) {
    return { canFold: false, startLine: 1, endLine: 1, summaryRu: '' };
  }
  return {
    canFold: true,
    startLine: 1,
    endLine: beginDocIdx, // folds lines 1..beginDocIdx (right before \begin{document})
    summaryRu: `Преамбула LaTeX свёрнута (строки 1–${beginDocIdx})`,
  };
}

// ============================================================================
// P11: Caret-Aware LaTeX / TikZ Autocomplete Engine
// ============================================================================

export interface AutocompleteSuggestion {
  id: string;
  trigger: string;
  insertText: string;
  categoryRu: string;
  detailRu: string;
}

const BUILTIN_AUTOCOMPLETE_ITEMS: AutocompleteSuggestion[] = [
  {
    id: 'ac-draw-line',
    trigger: '\\draw',
    insertText: '\\draw (0.50cm,0.50cm) -- (2.50cm,1.50cm);',
    categoryRu: 'Примитив TikZ',
    detailRu: 'Отрезок между двумя координатами',
  },
  {
    id: 'ac-draw-arrow',
    trigger: '\\draw[-{Stealth}]',
    insertText: '\\draw[-{Stealth}] (0.50cm,1.20cm) -- (3.20cm,1.20cm);',
    categoryRu: 'Стрелка arrows.meta',
    detailRu: 'Вектор со стрелочным наконечником Stealth',
  },
  {
    id: 'ac-draw-circle',
    trigger: '\\draw circle',
    insertText: '\\draw (2.00cm,1.80cm) circle [radius=0.75cm];',
    categoryRu: 'Окружность TikZ',
    detailRu: 'Окружность с центром и радиусом',
  },
  {
    id: 'ac-draw-rect',
    trigger: '\\draw rectangle',
    insertText: '\\draw (1.00cm,0.80cm) rectangle (3.00cm,2.20cm);',
    categoryRu: 'Прямоугольник TikZ',
    detailRu: 'Прямоугольный контур по двум углам',
  },
  {
    id: 'ac-node-math',
    trigger: '\\node',
    insertText: '\\node at (2.40cm,2.20cm) {$F_1$};',
    categoryRu: 'Узел TikZ',
    detailRu: 'Подпись или математическая формула в точке',
  },
  {
    id: 'ac-usetikzlibrary',
    trigger: '\\usetikzlibrary',
    insertText: '\\usetikzlibrary{arrows.meta,calc,positioning}',
    categoryRu: 'Преамбула',
    detailRu: 'Подключение библиотек PGF/TikZ',
  },
  {
    id: 'ac-usepackage',
    trigger: '\\usepackage',
    insertText: '\\usepackage{pgfplots}',
    categoryRu: 'Преамбула',
    detailRu: 'Подключение пакета LaTeX',
  },
  {
    id: 'ac-setmainfont',
    trigger: '\\setmainfont',
    insertText: '\\setmainfont{DejaVu Serif}',
    categoryRu: 'Кириллица XeLaTeX',
    detailRu: 'Основной системный шрифт OpenType',
  },
  {
    id: 'ac-newcommand',
    trigger: '\\newcommand',
    insertText: '\\newcommand{\\myMacro}[1]{#1}',
    categoryRu: 'Макрос автора',
    detailRu: 'Пользовательская команда LaTeX',
  },
  ...TIKZ_LIBRARIES.map((lib) => ({
    id: `ac-lib-${lib.name}`,
    trigger: `\\usetikzlibrary{${lib.name}}`,
    insertText: `\\usetikzlibrary{${lib.name}}`,
    categoryRu: 'Библиотека PGF',
    detailRu: lib.titleRu,
  })),
];

export function getTexAutocompleteSuggestions(
  source: string,
  caretOffset: number,
  forceOpen = false
): {
  prefix: string;
  replaceStart: number;
  replaceEnd: number;
  items: AutocompleteSuggestion[];
} | null {
  const safeCaret = Math.max(0, Math.min(source.length, caretOffset));
  let start = safeCaret;
  while (start > 0 && /[A-Za-z@\\]/.test(source[start - 1])) {
    start--;
    if (source[start] === '\\') break;
  }

  const prefix = source.slice(start, safeCaret);
  if (!forceOpen && (!prefix.startsWith('\\') || prefix.length < 2)) {
    return null;
  }

  // Extract author \newcommand{\foo} macros from the current document
  const customItems: AutocompleteSuggestion[] = [];
  const macroRe = /\\newcommand\{\\([A-Za-z@]+)\}(?:\[(\d+)\])?/g;
  let m: RegExpExecArray | null;
  while ((m = macroRe.exec(source)) !== null) {
    const name = `\\${m[1]}`;
    const argc = m[2] ? Number(m[2]) : 0;
    const argsPlaceholder = Array.from({ length: argc }, (_, i) => `{arg${i + 1}}`).join('');
    customItems.push({
      id: `ac-user-${m[1]}`,
      trigger: name,
      insertText: `${name}${argsPlaceholder}`,
      categoryRu: 'Макрос документа',
      detailRu: `Авторский макрос (${argc} арг.)`,
    });
  }

  const all = [...customItems, ...BUILTIN_AUTOCOMPLETE_ITEMS];
  const needle = prefix.toLowerCase();
  const filtered = prefix.startsWith('\\')
    ? all.filter((item) => item.trigger.toLowerCase().includes(needle))
    : all;

  if (filtered.length === 0) return null;
  return {
    prefix,
    replaceStart: prefix.startsWith('\\') ? start : safeCaret,
    replaceEnd: safeCaret,
    items: filtered.slice(0, 8),
  };
}

// ============================================================================
// P12 & P16: Adopt Raw TikZ Line into n1 / Detach n1 / Strip Clean Export
// ============================================================================

export interface AdoptableTikzLine {
  lineNumber: number;
  tool: ToolId;
  values: Record<string, string>;
  previewLabelRu: string;
}

function normDim(rawCoord: string): string {
  const t = rawCoord.trim();
  if (/^[+-]?\d+(?:\.\d+)?(cm|mm|pt|in)$/.test(t)) return t;
  if (/^[+-]?\d+(?:\.\d+)?$/.test(t)) return `${Number(t).toFixed(2)}cm`;
  return '1.00cm';
}

export function detectAdoptableTikzLines(source: string): AdoptableTikzLine[] {
  const lines = source.split(/\r?\n/);
  const result: AdoptableTikzLine[] = [];

  lines.forEach((rawLine, idx) => {
    if (rawLine.includes(OWNERSHIP_MARKER) || rawLine.includes('% tikzarium:n1:')) return;
    const commentIdx = rawLine.indexOf('%');
    const active = (commentIdx === -1 ? rawLine : rawLine.slice(0, commentIdx)).trim();
    if (!active.endsWith(';')) return;
    const lineNumber = idx + 1;

    // 1. Circle: \draw ... (x,y) circle [radius=r]; or circle (r);
    const circleMatch =
      /^\\draw(?:\[[^\]]*\])?\s*\(\s*([^,()]+)\s*,\s*([^,()]+)\s*\)\s*circle\s*(?:\[\s*radius\s*=\s*([^\]]+)\s*\]|\(\s*([^)]+)\s*\))\s*;$/.exec(
        active
      );
    if (circleMatch) {
      const rVal = normDim(circleMatch[3] || circleMatch[4] || '0.50cm');
      result.push({
        lineNumber,
        tool: 'circle',
        values: {
          center_x: normDim(circleMatch[1]),
          center_y: normDim(circleMatch[2]),
          radius: rVal.startsWith('-') || rVal.startsWith('0.00') ? '0.50cm' : rVal,
        },
        previewLabelRu: 'Окружность → n1',
      });
      return;
    }

    // 2. Rectangle: \draw ... (x1,y1) rectangle (x2,y2);
    const rectMatch =
      /^\\draw(?:\[[^\]]*\])?\s*\(\s*([^,()]+)\s*,\s*([^,()]+)\s*\)\s*rectangle\s*\(\s*([^,()]+)\s*,\s*([^,()]+)\s*\)\s*;$/.exec(
        active
      );
    if (rectMatch) {
      result.push({
        lineNumber,
        tool: 'rectangle',
        values: {
          start_x: normDim(rectMatch[1]),
          start_y: normDim(rectMatch[2]),
          end_x: normDim(rectMatch[3]),
          end_y: normDim(rectMatch[4]),
        },
        previewLabelRu: 'Прямоугольник → n1',
      });
      return;
    }

    // 3. Cubic Bezier
    const cubicMatch =
      /^\\draw(?:\[[^\]]*\])?\s*\(\s*([^,()]+)\s*,\s*([^,()]+)\s*\)\s*\.\.\s*controls\s*\(\s*([^,()]+)\s*,\s*([^,()]+)\s*\)\s*and\s*\(\s*([^,()]+)\s*,\s*([^,()]+)\s*\)\s*\.\.\s*\(\s*([^,()]+)\s*,\s*([^,()]+)\s*\)\s*;$/.exec(
        active
      );
    if (cubicMatch) {
      result.push({
        lineNumber,
        tool: 'cubic',
        values: {
          start_x: normDim(cubicMatch[1]),
          start_y: normDim(cubicMatch[2]),
          control1_x: normDim(cubicMatch[3]),
          control1_y: normDim(cubicMatch[4]),
          control2_x: normDim(cubicMatch[5]),
          control2_y: normDim(cubicMatch[6]),
          end_x: normDim(cubicMatch[7]),
          end_y: normDim(cubicMatch[8]),
        },
        previewLabelRu: 'Кривая Безье → n1',
      });
      return;
    }

    // 4. Arrow or Line: \draw[...] (x1,y1) -- (x2,y2);
    const segMatch =
      /^\\draw(\[[^\]]*\])?\s*\(\s*([^,()]+)\s*,\s*([^,()]+)\s*\)\s*--\s*\(\s*([^,()]+)\s*,\s*([^,()]+)\s*\)\s*;$/.exec(
        active
      );
    if (segMatch) {
      const opt = segMatch[1] || '';
      const isArrow = opt.includes('->') || opt.includes('Stealth') || opt.includes('Latex');
      const tip = opt.includes('Latex') ? 'Latex' : 'Stealth';
      result.push({
        lineNumber,
        tool: isArrow ? 'arrow' : 'line',
        values: isArrow
          ? {
              start_x: normDim(segMatch[2]),
              start_y: normDim(segMatch[3]),
              end_x: normDim(segMatch[4]),
              end_y: normDim(segMatch[5]),
              tip,
            }
          : {
              start_x: normDim(segMatch[2]),
              start_y: normDim(segMatch[3]),
              end_x: normDim(segMatch[4]),
              end_y: normDim(segMatch[5]),
            },
        previewLabelRu: isArrow ? 'Стрелка → n1' : 'Отрезок → n1',
      });
      return;
    }

    // 5. Node with explicit coordinates: \node[...] (id)? at (x,y) {content};
    const nodeAtMatch =
      /^\\node(?:\[[^\]]*\])?(?:\s*\(([A-Za-z][A-Za-z0-9_-]*)\))?\s+at\s*\(\s*([^,()]+)\s*,\s*([^,()]+)\s*\)\s*\{(.+)\}\s*;$/.exec(
        active
      );
    if (nodeAtMatch) {
      let body = nodeAtMatch[4].trim();
      let mode: 'text' | 'math' = 'text';
      if (body.startsWith('$') && body.endsWith('$') && body.length >= 2) {
        mode = 'math';
        body = body.slice(1, -1);
      }
      const values: Record<string, string> = {
        x: normDim(nodeAtMatch[2]),
        y: normDim(nodeAtMatch[3]),
        mode,
        content: body || 'A',
      };
      if (nodeAtMatch[1]) values.node_id = nodeAtMatch[1];
      result.push({
        lineNumber,
        tool: 'node',
        values,
        previewLabelRu: 'Узел → n1',
      });
    }
  });

  return result;
}

export function adoptRawTikzLineIntoN1(
  source: string,
  lineNumber: number
): { ok: boolean; nextSource: string; newId: number } {
  const candidates = detectAdoptableTikzLines(source);
  const found = candidates.find((c) => c.lineNumber === lineNumber);
  if (!found) return { ok: false, nextSource: source, newId: -1 };

  const existing = parseOwnedPrimitives(source);
  const newId = existing.reduce((max, p) => Math.max(max, p.id), 0) + 1;
  const eol = source.includes('\r\n') ? '\r\n' : '\n';
  const lines = source.split(/\r?\n/);
  const rawLine = lines[lineNumber - 1] ?? '';
  const indentMatch = /^(\s*)/.exec(rawLine);
  const indent = indentMatch ? indentMatch[1] : '  ';

  // Preserve original author command or normalize into valid owned line
  const hex = encodeOwnershipHex({
    schema: 1,
    id: newId,
    tool: found.tool,
    draft: { values: found.values },
  });
  const commentIdx = rawLine.indexOf('%');
  const cleanCmd = (commentIdx === -1 ? rawLine : rawLine.slice(0, commentIdx)).trim();
  lines[lineNumber - 1] = `${indent}${cleanCmd}${OWNERSHIP_MARKER}${hex}`;
  return {
    ok: true,
    nextSource: lines.join(eol),
    newId,
  };
}

export function detachOwnedPrimitiveToCleanTikz(source: string, primitiveId: number): string {
  const owned = parseOwnedPrimitives(source);
  const target = owned.find((p) => p.id === primitiveId);
  if (!target) return source;
  return source.slice(0, target.lineStartOffset) + target.commandPart + source.slice(target.lineEndOffset);
}

export function stripAllOwnershipMetadata(source: string): string {
  const eol = source.includes('\r\n') ? '\r\n' : '\n';
  return source
    .split(/\r?\n/)
    .map((line) => {
      const idx = line.indexOf(OWNERSHIP_MARKER);
      if (idx !== -1) return line.slice(0, idx).replace(/\s+$/, '');
      const fallbackIdx = line.indexOf('% tikzarium:n1:');
      if (fallbackIdx !== -1) return line.slice(0, fallbackIdx).replace(/\s+$/, '');
      return line;
    })
    .join(eol);
}

export function extractTikzpictureBlock(source: string, stripMetadata = true): string {
  const cleaned = stripMetadata ? stripAllOwnershipMetadata(source) : source;
  const startIdx = cleaned.indexOf('\\begin{tikzpicture}');
  const endToken = '\\end{tikzpicture}';
  const endIdx = cleaned.lastIndexOf(endToken);
  if (startIdx === -1 || endIdx === -1 || endIdx < startIdx) {
    return cleaned.trim();
  }
  return cleaned.slice(startIdx, endIdx + endToken.length);
}

// ============================================================================
// P13: Structured Line-by-Line Diff Preview
// ============================================================================

export interface StructuredDiffRow {
  kind: 'same' | 'added' | 'removed';
  oldLineNum: number | null;
  newLineNum: number | null;
  text: string;
}

export function computeStructuredLineDiff(beforeSource: string, afterSource: string): {
  rows: StructuredDiffRow[];
  addedCount: number;
  removedCount: number;
} {
  const a = beforeSource.split(/\r?\n/);
  const b = afterSource.split(/\r?\n/);
  // Compact LCS table bounded for interactive .tex documents
  const n = a.length;
  const m = b.length;
  const dp: number[][] = Array.from({ length: n + 1 }, () => new Array<number>(m + 1).fill(0));
  for (let i = n - 1; i >= 0; i--) {
    for (let j = m - 1; j >= 0; j--) {
      dp[i][j] = a[i] === b[j] ? 1 + dp[i + 1][j + 1] : Math.max(dp[i + 1][j], dp[i][j + 1]);
    }
  }

  const rows: StructuredDiffRow[] = [];
  let addedCount = 0;
  let removedCount = 0;
  let i = 0;
  let j = 0;
  while (i < n && j < m) {
    if (a[i] === b[j]) {
      rows.push({ kind: 'same', oldLineNum: i + 1, newLineNum: j + 1, text: a[i] });
      i++;
      j++;
    } else if (dp[i + 1][j] >= dp[i][j + 1]) {
      rows.push({ kind: 'removed', oldLineNum: i + 1, newLineNum: null, text: a[i] });
      removedCount++;
      i++;
    } else {
      rows.push({ kind: 'added', oldLineNum: null, newLineNum: j + 1, text: b[j] });
      addedCount++;
      j++;
    }
  }
  while (i < n) {
    rows.push({ kind: 'removed', oldLineNum: i + 1, newLineNum: null, text: a[i] });
    removedCount++;
    i++;
  }
  while (j < m) {
    rows.push({ kind: 'added', oldLineNum: null, newLineNum: j + 1, text: b[j] });
    addedCount++;
    j++;
  }

  return { rows, addedCount, removedCount };
}

// ============================================================================
// P17: One-Click Quick Fix Engine for XeLaTeX Diagnostics
// ============================================================================

export function applyDiagnosticQuickFix(
  source: string,
  diag: TexDiagnostic
): { ok: boolean; nextSource: string; summaryRu: string } {
  const eol = source.includes('\r\n') ? '\r\n' : '\n';

  if (diag.quickFixId === 'connect-arrows-meta') {
    const plan = proposeLibraryConnect(source, 'arrows.meta');
    return {
      ok: plan.ok,
      nextSource: plan.nextSource,
      summaryRu: 'Подключена библиотека \\usetikzlibrary{arrows.meta}',
    };
  }

  if (diag.quickFixId === 'add-fontspec-cyrillic') {
    const beginDocIdx = source.indexOf('\\begin{document}');
    if (beginDocIdx === -1) return { ok: false, nextSource: source, summaryRu: 'Не найден \\begin{document}' };
    const inject = `\\usepackage{fontspec}${eol}\\setmainfont{DejaVu Serif}${eol}`;
    return {
      ok: true,
      nextSource: source.slice(0, beginDocIdx) + inject + source.slice(beginDocIdx),
      summaryRu: 'В преамбулу добавлены fontspec и шрифт DejaVu Serif',
    };
  }

  if (diag.quickFixId && diag.quickFixId.startsWith('connect-ext-pkg:')) {
    const pkgName = diag.quickFixId.slice('connect-ext-pkg:'.length).trim();
    const beginDocIdx = source.indexOf('\\begin{document}');
    if (beginDocIdx === -1 || !pkgName) {
      return { ok: false, nextSource: source, summaryRu: 'Не найден \\begin{document} для подключения пакета' };
    }
    const extra = pkgName === 'pgfplots' && !source.includes('\\pgfplotsset') ? `${eol}\\pgfplotsset{compat=1.18}` : '';
    const pkgLine =
      pkgName === 'forest'
        ? `\\usepackage[edges]{forest}`
        : `\\usepackage{${pkgName}}`;
    const inject = `${pkgLine}${extra}${eol}`;
    return {
      ok: true,
      nextSource: source.slice(0, beginDocIdx) + inject + source.slice(beginDocIdx),
      summaryRu: `В преамбулу подключён пакет расширения ${pkgLine}`,
    };
  }

  const lines = source.split(/\r?\n/);
  const idx = diag.lineNumber - 1;
  if (idx < 0 || idx >= lines.length) {
    return { ok: false, nextSource: source, summaryRu: 'Строка не найдена' };
  }
  const line = lines[idx];

  if (diag.quickFixId === 'fix-undef-draw') {
    lines[idx] = line.replace(/\\undefinedTikzCommand\b|\\drawbroken\b/g, '\\draw');
    return {
      ok: true,
      nextSource: lines.join(eol),
      summaryRu: `Исправлена неизвестная команда в строке ${diag.lineNumber} → \\draw`,
    };
  }

  if (diag.quickFixId === 'append-semicolon') {
    const markerIdx = line.indexOf(OWNERSHIP_MARKER);
    const commentIdx = markerIdx !== -1 ? markerIdx : line.indexOf('%');
    if (commentIdx === -1) {
      lines[idx] = `${line.replace(/\s+$/, '')};`;
    } else {
      const before = line.slice(0, commentIdx).replace(/\s+$/, '');
      lines[idx] = `${before};${line.slice(commentIdx)}`;
    }
    return {
      ok: true,
      nextSource: lines.join(eol),
      summaryRu: `Добавлена «;» в конце команды (строка ${diag.lineNumber})`,
    };
  }

  if (diag.quickFixId === 'connect-patterns') {
    const plan = proposeLibraryConnect(source, 'patterns');
    return {
      ok: plan.ok,
      nextSource: plan.nextSource,
      summaryRu: 'Подключена библиотека \\usetikzlibrary{patterns} (P38)',
    };
  }

  if (diag.quickFixId === 'connect-decorations') {
    let cur = source;
    const p1 = proposeLibraryConnect(cur, 'decorations.pathreplacing');
    if (p1.ok) cur = p1.nextSource;
    const p2 = proposeLibraryConnect(cur, 'decorations.pathmorphing');
    if (p2.ok) cur = p2.nextSource;
    return {
      ok: cur !== source,
      nextSource: cur,
      summaryRu: 'Подключены библиотеки decorations.pathreplacing и decorations.pathmorphing (P39)',
    };
  }

  if (diag.quickFixId === 'fix-italic-unit') {
    const fixedLine = line.replace(/\$([^$]+)\$/g, (_full, expr: string) => {
      if (expr.includes('\\text{') || expr.includes('\\mathrm{') || expr.includes('\\qty{')) {
        return `$${expr}$`;
      }
      const nextExpr = expr.replace(
        /(\d+(?:\.\d+)?)\s*(нм|мкм|мм|см|Гц|кГц|МГц|ГГц|мА|Ом|эВ|дБ)(?=$|[\s,.)\]}])/g,
        '$1\\,\\text{$2}'
      );
      return `$${nextExpr}$`;
    });
    lines[idx] = fixedLine;
    // If line is an owned n1 primitive, sync its draft content too!
    const ownedOnLine = parseOwnedPrimitives(source).find((p) => p.lineNumber === diag.lineNumber);
    let nextSrc = lines.join(eol);
    if (ownedOnLine && ownedOnLine.tool === 'node' && ownedOnLine.values.mode === 'math') {
      const fixedContent = (ownedOnLine.values.content ?? '').replace(
        /(\d+(?:\.\d+)?)\s*(нм|мкм|мм|см|Гц|кГц|МГц|ГГц|мА|Ом|эВ|дБ)(?=$|[\s,.)\]}])/g,
        '$1\\,\\text{$2}'
      );
      nextSrc = applyOwnedPrimitivePatch(source, ownedOnLine.id, {
        ...ownedOnLine.values,
        content: fixedContent,
      });
    }
    return {
      ok: nextSrc !== source,
      nextSource: nextSrc,
      summaryRu: `Оформлена физическая единица прямым шрифтом ГОСТ в строке ${diag.lineNumber} (P42)`,
    };
  }

  if (diag.quickFixId === 'close-math-dollar') {
    const closeBraceIdx = line.lastIndexOf('}');
    if (closeBraceIdx !== -1) {
      lines[idx] = `${line.slice(0, closeBraceIdx)}$${line.slice(closeBraceIdx)}`;
    } else {
      lines[idx] = `${line}$`;
    }
    return {
      ok: true,
      nextSource: lines.join(eol),
      summaryRu: `Закрыта математическая формула $ в строке ${diag.lineNumber}`,
    };
  }

  return { ok: false, nextSource: source, summaryRu: 'Автоисправление недоступно' };
}

// ============================================================================
// P19: Scientific CSV / TSV -> PGFPlots + n1 Document Generator
// ============================================================================

export function convertCsvToPgfplotsDocument(
  rawFilename: string,
  csvContent: string,
  serial = 1
): SpecimenDocument {
  const cleanLines = csvContent
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0 && !l.startsWith('#'));

  const pts: { x: number; y: number }[] = [];
  let xHeader = 'x';
  let yHeader = 'y';

  cleanLines.forEach((row, idx) => {
    const cols = row.split(/[;,\t]+/).map((c) => c.trim());
    if (cols.length < 2) return;
    const vx = Number(cols[0]);
    const vy = Number(cols[1]);
    if (idx === 0 && (!Number.isFinite(vx) || !Number.isFinite(vy))) {
      xHeader = cols[0].replace(/[^A-Za-zА-Яа-я0-9_]/g, '') || 'x';
      yHeader = cols[1].replace(/[^A-Za-zА-Яа-я0-9_]/g, '') || 'y';
      return;
    }
    if (Number.isFinite(vx) && Number.isFinite(vy)) {
      pts.push({ x: vx, y: vy });
    }
  });

  if (pts.length < 2) {
    pts.push({ x: 0, y: 0.2 }, { x: 1, y: 1.4 }, { x: 2, y: 2.3 }, { x: 3, y: 2.7 }, { x: 4, y: 2.9 });
  }

  const minX = Math.min(...pts.map((p) => p.x));
  const maxX = Math.max(...pts.map((p) => p.x));
  const minY = Math.min(...pts.map((p) => p.y));
  const maxY = Math.max(...pts.map((p) => p.y));
  const spanX = Math.max(1e-6, maxX - minX);
  const spanY = Math.max(1e-6, maxY - minY);

  // Map data points into TikZ canvas [0.80..5.40] x [0.75..3.15] cm for immediate interactive n1 preview + PGFPlots table comment
  const mapX = (x: number) => +(0.8 + ((x - minX) / spanX) * 4.6).toFixed(2);
  const mapY = (y: number) => +(0.75 + ((y - minY) / spanY) * 2.4).toFixed(2);

  const ownedLines: string[] = [];
  let nextId = 1;
  // X and Y axes
  ownedLines.push(
    generateOwnedLine(nextId++, 'arrow', {
      start_x: '0.65cm',
      start_y: '0.65cm',
      end_x: '5.75cm',
      end_y: '0.65cm',
      tip: 'Stealth',
      stroke_width: 'semithick',
    })
  );
  ownedLines.push(
    generateOwnedLine(nextId++, 'arrow', {
      start_x: '0.65cm',
      start_y: '0.65cm',
      end_x: '0.65cm',
      end_y: '3.40cm',
      tip: 'Stealth',
      stroke_width: 'semithick',
    })
  );

  // Polyline segments & data markers
  const limitedPts = pts.slice(0, 10);
  for (let i = 0; i < limitedPts.length - 1; i++) {
    ownedLines.push(
      generateOwnedLine(nextId++, 'line', {
        start_x: `${mapX(limitedPts[i].x).toFixed(2)}cm`,
        start_y: `${mapY(limitedPts[i].y).toFixed(2)}cm`,
        end_x: `${mapX(limitedPts[i + 1].x).toFixed(2)}cm`,
        end_y: `${mapY(limitedPts[i + 1].y).toFixed(2)}cm`,
        stroke_width: 'thick',
        stroke_color: 'blue!75!black',
      })
    );
  }
  for (const pt of limitedPts) {
    ownedLines.push(
      generateOwnedLine(nextId++, 'circle', {
        center_x: `${mapX(pt.x).toFixed(2)}cm`,
        center_y: `${mapY(pt.y).toFixed(2)}cm`,
        radius: '0.09cm',
        stroke_color: 'red!75!black',
        fill_color: 'rose!10',
      })
    );
  }

  ownedLines.push(
    generateOwnedLine(nextId++, 'node', {
      x: '5.35cm',
      y: '0.32cm',
      mode: 'math',
      content: xHeader,
    })
  );
  ownedLines.push(
    generateOwnedLine(nextId++, 'node', {
      x: '1.35cm',
      y: '3.42cm',
      mode: 'math',
      content: `${yHeader}(${xHeader})`,
    })
  );

  const baseStem = rawFilename.replace(/\.(csv|tsv|dat|txt)$/i, '').replace(/[^A-Za-z0-9_-]/g, '_') || 'dataset_plot';
  const texFilename = `${baseStem}.tex`;

  const source = [
    '\\documentclass[border=6pt]{standalone}',
    '\\usepackage{fontspec}',
    '\\usepackage{unicode-math}',
    '\\usepackage{tikz}',
    '\\usepackage{pgfplots}',
    '\\usetikzlibrary{arrows.meta,calc}',
    '\\setmainfont{DejaVu Serif}',
    '\\pgfplotsset{compat=1.18}',
    `% Импортировано из файла данных ОС: ${rawFilename} (${pts.length} точек)`,
    '\\begin{document}',
    '\\begin{tikzpicture}',
    ...ownedLines,
    '\\end{tikzpicture}',
    '\\end{document}',
    '',
  ].join('\n');

  return {
    id: `csv-import-${serial}`,
    filename: texFilename,
    titleRu: `${texFilename} (из ${rawFilename})`,
    subtitleRu: `Импорт CSV/DAT (${pts.length} точек) · PGFPlots + n1`,
    lineEnding: 'LF',
    dataDependencies: [rawFilename],
    source,
  };
}

// ============================================================================
// P20: Persistent Workspace Storage (eframe::Storage mirror) & Author Snippets
// ============================================================================

export interface UserSnippetItem {
  id: string;
  titleRu: string;
  categoryRu: string;
  primitives: { tool: ToolId; values: Record<string, string> }[];
}

export interface PersistedEframeWorkspace {
  theme: UiThemeId;
  fontSizePt: 12 | 14 | 16 | 18 | 20 | 24;
  softWrap: boolean;
  inspectorCollapsed: boolean;
  liveAutoBuild: boolean;
  recentFiles: { filename: string; titleRu: string; openedAt: string }[];
  customSnippets: UserSnippetItem[];
  panelCols?: { canvas: number; code: number; inspector: number };
}

export const BUILTIN_AUTHOR_SNIPPETS: UserSnippetItem[] = [
  {
    id: 'snip-biconvex-lens',
    titleRu: 'Собирающая линза с фокусом',
    categoryRu: 'Оптика',
    primitives: [
      { tool: 'line', values: { start_x: '1.20cm', start_y: '1.90cm', end_x: '4.80cm', end_y: '1.90cm', line_style: 'dashed' } },
      { tool: 'circle', values: { center_x: '2.80cm', center_y: '1.90cm', radius: '0.65cm', stroke_color: 'blue!75!black', fill_color: 'cyan!10' } },
      { tool: 'node', values: { x: '4.20cm', y: '2.25cm', mode: 'math', content: 'F', node_id: 'F_snip' } },
    ],
  },
  {
    id: 'snip-feedback-block',
    titleRu: 'Звено управления (Блок + Вход/Выход)',
    categoryRu: 'Блок-схемы',
    primitives: [
      { tool: 'rectangle', values: { start_x: '2.10cm', start_y: '1.40cm', end_x: '3.90cm', end_y: '2.30cm', fill_color: 'blue!8', stroke_width: 'semithick' } },
      { tool: 'node', values: { x: '3.00cm', y: '1.85cm', mode: 'math', content: 'W(s)', node_id: 'Ws1' } },
      { tool: 'arrow', values: { start_x: '1.10cm', start_y: '1.85cm', end_x: '2.10cm', end_y: '1.85cm', tip: 'Stealth' } },
      { tool: 'arrow', values: { start_x: '3.90cm', start_y: '1.85cm', end_x: '4.90cm', end_y: '1.85cm', tip: 'Stealth' } },
    ],
  },
];

const STORAGE_KEY = 'tikzarium_eframe_workspace_v1';

export function createSnippetFromPrimitives(
  titleRu: string,
  selectedPrimitives: OwnedPrimitive[]
): UserSnippetItem | null {
  const cleanTitle = titleRu.trim();
  if (!cleanTitle || selectedPrimitives.length === 0) return null;
  return {
    id: `user-snip-${Date.now()}`,
    titleRu: cleanTitle,
    categoryRu: 'Мои заготовки',
    primitives: selectedPrimitives.map((p) => ({
      tool: p.tool,
      values: { ...p.values },
    })),
  };
}

export function insertSnippetIntoSource(
  source: string,
  snippet: UserSnippetItem
): { nextSource: string; insertedIds: number[]; lastLine: number } {
  let current = source;
  const existing = parseOwnedPrimitives(current);
  let nextId = existing.reduce((max, p) => Math.max(max, p.id), 0) + 1;
  const eol = current.includes('\r\n') ? '\r\n' : '\n';
  const insertedIds: number[] = [];
  const generatedLines: string[] = [];

  for (const item of snippet.primitives) {
    // Avoid duplicate node_id collisions when inserting snippet multiple times
    const clonedValues = { ...item.values };
    if (clonedValues.node_id) {
      clonedValues.node_id = `${clonedValues.node_id}_${nextId}`;
    }
    generatedLines.push(generateOwnedLine(nextId, item.tool, clonedValues, '  '));
    insertedIds.push(nextId);
    nextId++;
  }

  const block = generatedLines.join(eol);
  const endTikzIdx = current.lastIndexOf('\\end{tikzpicture}');
  if (endTikzIdx !== -1) {
    let lineStart = endTikzIdx;
    while (lineStart > 0 && current[lineStart - 1] !== '\n') lineStart--;
    current = current.slice(0, lineStart) + block + eol + current.slice(lineStart);
    const lastLine = current.slice(0, lineStart).split('\n').length + generatedLines.length - 1;
    return { nextSource: current, insertedIds, lastLine };
  }

  current = current + (current.endsWith('\n') ? '' : eol) + block + eol;
  return { nextSource: current, insertedIds, lastLine: current.split('\n').length - 1 };
}

export function loadEframeStorage(): Partial<PersistedEframeWorkspace> {
  if (typeof window === 'undefined' || !window.localStorage) return {};
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    return JSON.parse(raw) as Partial<PersistedEframeWorkspace>;
  } catch {
    return {};
  }
}

export function saveEframeStorage(state: PersistedEframeWorkspace): void {
  if (typeof window === 'undefined' || !window.localStorage) return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Ignore quota errors in restricted sandboxes
  }
}

export function getPrimitiveDisplaySummary(prim: OwnedPrimitive): string {
  const spec = PRIMITIVE_TOOLS.find((t) => t.id === prim.tool);
  return `#${prim.id} ${spec?.shortLabelRu ?? prim.tool} (стр. ${prim.lineNumber})`;
}
