/**
 * Physical-Unit PostScript / PDF Scene Compiler & Hitbox Mapper for Live PDF Underlay
 * (`MOD-11` & `MOD-13`).
 *
 * Used by `server.ts` (`POST /api/render/pdf-underlay`) when `xelatex` is absent in the container:
 * compiles both `N1` primitives and clean idiomatic package objects (`pgfplots`, `circuitikz`,
 * `automata`, `decorations.pathmorphing`, `optics`, `patterns`, `chemfig`, clean `tikz`) into
 * a deterministic PostScript program in exact PostScript points (`1 cm = 28.3464567 pt`),
 * which `/usr/bin/gs` (`Ghostscript 9.55`) turns into a REAL `.pdf` binary + 144 DPI `.png` underlay.
 * When `xelatex` IS installed on the host OS, `server.ts` runs `xelatex -no-shell-escape` first!
 */

import { parseDimensionToCm, parseOwnedPrimitives, parsePolyPointsList } from './tikzEngine';
import type { OwnedPrimitive } from './tikzEngine';
import { parseScenePackageObjects } from './packageCanvasSemantics';
import type { RecognizedPackageObject } from './packageCanvasSemantics';
import type { PdfUnderlayHitbox } from './sourcePatchEngine';

export const PT_PER_CM = 28.3464567;

const CYRILLIC_TO_AGL: Record<number, string> = (() => {
  const map: Record<number, string> = {
    0x0401: 'afii10023', // Ё
    0x0451: 'afii10071', // ё
  };
  // А..Я (0x0410..0x042F) -> afii10017..afii10048 (with gap at 10023 for Ё!)
  // Standard Adobe Glyph List for Cyrillic:
  const upperAgl = [
    'afii10017', 'afii10018', 'afii10019', 'afii10020', 'afii10021', 'afii10022',
    'afii10024', 'afii10025', 'afii10026', 'afii10027', 'afii10028', 'afii10029',
    'afii10030', 'afii10031', 'afii10032', 'afii10033', 'afii10034', 'afii10035',
    'afii10036', 'afii10037', 'afii10038', 'afii10039', 'afii10040', 'afii10041',
    'afii10042', 'afii10043', 'afii10044', 'afii10045', 'afii10046', 'afii10047',
    'afii10048', 'afii10049',
  ];
  const lowerAgl = [
    'afii10065', 'afii10066', 'afii10067', 'afii10068', 'afii10069', 'afii10070',
    'afii10072', 'afii10073', 'afii10074', 'afii10075', 'afii10076', 'afii10077',
    'afii10078', 'afii10079', 'afii10080', 'afii10081', 'afii10082', 'afii10083',
    'afii10084', 'afii10085', 'afii10086', 'afii10087', 'afii10088', 'afii10089',
    'afii10090', 'afii10091', 'afii10092', 'afii10093', 'afii10094', 'afii10095',
    'afii10096', 'afii10097',
  ];
  for (let i = 0; i < 32; i++) {
    map[0x0410 + i] = upperAgl[i];
    map[0x0430 + i] = lowerAgl[i];
  }
  return map;
})();

const ASCII_TO_GLYPH: Record<string, string> = {
  ' ': 'space',
  '!': 'exclam',
  '"': 'quotedbl',
  '#': 'numbersign',
  '%': 'percent',
  '&': 'ampersand',
  "'": 'quotesingle',
  '(': 'parenleft',
  ')': 'parenright',
  '*': 'asterisk',
  '+': 'plus',
  ',': 'comma',
  '-': 'hyphen',
  '.': 'period',
  '/': 'slash',
  '0': 'zero',
  '1': 'one',
  '2': 'two',
  '3': 'three',
  '4': 'four',
  '5': 'five',
  '6': 'six',
  '7': 'seven',
  '8': 'eight',
  '9': 'nine',
  ':': 'colon',
  ';': 'semicolon',
  '<': 'less',
  '=': 'equal',
  '>': 'greater',
  '?': 'question',
  '@': 'at',
  '[': 'bracketleft',
  ']': 'bracketright',
  '_': 'underscore',
  '^': 'asciicircum',
  '~': 'asciitilde',
};

const GREEK_CODE_TO_GLYPH: Record<number, string> = {
  0x03b1: 'alpha',
  0x03b2: 'beta',
  0x03b3: 'gamma',
  0x03b4: 'delta',
  0x03b5: 'epsilon',
  0x03bb: 'lambda',
  0x03bc: 'mu',
  0x03c0: 'pi',
  0x03c3: 'sigma',
  0x03c6: 'phi',
  0x03c8: 'psi',
  0x03c9: 'omega',
  0x0394: 'Delta',
  0x03a9: 'Omega',
};

function cleanLatexToUnicodeDisplay(raw: string): string {
  return raw
    .replace(/\\textbf\{([^}]*)\}/g, '$1')
    .replace(/\\textit\{([^}]*)\}/g, '$1')
    .replace(/\\mathrm\{([^}]*)\}/g, '$1')
    .replace(/\\text\{([^}]*)\}/g, '$1')
    .replace(/\\alpha\b/g, 'α')
    .replace(/\\beta\b/g, 'β')
    .replace(/\\gamma\b/g, 'γ')
    .replace(/\\delta\b/g, 'δ')
    .replace(/\\epsilon\b/g, 'ε')
    .replace(/\\lambda\b/g, 'λ')
    .replace(/\\mu\b/g, 'μ')
    .replace(/\\pi\b/g, 'π')
    .replace(/\\sigma\b/g, 'σ')
    .replace(/\\phi\b/g, 'φ')
    .replace(/\\psi\b/g, 'ψ')
    .replace(/\\omega\b/g, 'ω')
    .replace(/\\Delta\b/g, 'Δ')
    .replace(/\\Omega\b/g, 'Ω')
    .replace(/\\frac\{([^}]*)\}\{([^}]*)\}/g, '($1)/($2)')
    .replace(/\\qty\{([^}]*)\}\{([^}]*)\}/g, '$1 $2')
    .replace(/[\${}]/g, '')
    .replace(/\\,/g, ' ')
    .replace(/\\/g, '')
    .trim()
    .slice(0, 48);
}

function emitPostScriptGlyphString(xPt: number, yPt: number, rawLabel: string, center = true): string {
  const clean = cleanLatexToUnicodeDisplay(rawLabel);
  if (!clean) return '';
  const glyphs: string[] = [];
  for (const ch of clean) {
    const code = ch.codePointAt(0) ?? 0x20;
    if ((code >= 0x41 && code <= 0x5a) || (code >= 0x61 && code <= 0x7a)) {
      glyphs.push(`/${ch} glyphshow`);
    } else if (ASCII_TO_GLYPH[ch]) {
      glyphs.push(`/${ASCII_TO_GLYPH[ch]} glyphshow`);
    } else if (CYRILLIC_TO_AGL[code]) {
      glyphs.push(`/${CYRILLIC_TO_AGL[code]} glyphshow`);
    } else if (GREEK_CODE_TO_GLYPH[code]) {
      glyphs.push(`/${GREEK_CODE_TO_GLYPH[code]} glyphshow`);
    } else {
      glyphs.push('/space glyphshow');
    }
  }
  const approxWidthPt = clean.length * 4.7;
  const startX = center ? xPt - approxWidthPt / 2 : xPt;
  return `${startX.toFixed(2)} ${yPt.toFixed(2)} moveto ${glyphs.join(' ')}`;
}

function colorToRgb01(rawColor: string | undefined): [number, number, number] {
  if (!rawColor) return [0.06, 0.09, 0.16];
  if (rawColor.includes('blue') || rawColor === 'oiBlue') return [0.11, 0.31, 0.85];
  if (rawColor.includes('red') || rawColor === 'oiVermilion') return [0.73, 0.11, 0.11];
  if (rawColor.includes('teal') || rawColor.includes('emerald') || rawColor === 'oiBluishGreen')
    return [0.06, 0.46, 0.43];
  if (rawColor.includes('orange') || rawColor.includes('amber') || rawColor === 'oiOrange')
    return [0.76, 0.25, 0.05];
  if (rawColor.includes('violet') || rawColor.includes('purple') || rawColor === 'oiPurple')
    return [0.43, 0.16, 0.85];
  if (rawColor.includes('cyan') || rawColor === 'oiSkyBlue') return [0.03, 0.56, 0.78];
  return [0.06, 0.09, 0.16];
}

function fillColorToRgb01(rawFill: string | undefined): [number, number, number] | null {
  if (!rawFill || rawFill === 'none') return null;
  if (rawFill.includes('cyan') || rawFill.includes('Sky')) return [0.89, 0.96, 0.99];
  if (rawFill.includes('blue')) return [0.91, 0.94, 0.99];
  if (rawFill.includes('emerald') || rawFill.includes('Green')) return [0.9, 0.98, 0.94];
  if (rawFill.includes('amber') || rawFill.includes('Orange')) return [0.99, 0.96, 0.87];
  if (rawFill.includes('rose') || rawFill.includes('red')) return [0.99, 0.91, 0.93];
  if (rawFill.includes('slate') || rawFill.includes('black')) return [0.93, 0.95, 0.97];
  return [0.94, 0.96, 0.99];
}

function emitArrowHeadPs(x1Pt: number, y1Pt: number, x2Pt: number, y2Pt: number, sizePt = 5.5): string {
  const ang = Math.atan2(y2Pt - y1Pt, x2Pt - x1Pt);
  const spread = 0.44;
  const ax = x2Pt - sizePt * Math.cos(ang - spread);
  const ay = y2Pt - sizePt * Math.sin(ang - spread);
  const bx = x2Pt - sizePt * Math.cos(ang + spread);
  const by = y2Pt - sizePt * Math.sin(ang + spread);
  return `newpath ${x2Pt.toFixed(2)} ${y2Pt.toFixed(2)} moveto ${ax.toFixed(2)} ${ay.toFixed(2)} lineto ${bx.toFixed(2)} ${by.toFixed(2)} lineto closepath fill`;
}

export interface CompiledScenePostScript {
  postScriptProgram: string;
  pageWidthPt: number;
  pageHeightPt: number;
  objectsRendered: number;
  hitboxes: PdfUnderlayHitbox[];
}

export function compileTikzSceneToPostScript(
  source: string,
  bounds: { minXCm: number; maxXCm: number; minYCm: number; maxYCm: number },
  serifFontPath = '/usr/share/fonts/truetype/dejavu/DejaVuSerif.ttf'
): CompiledScenePostScript {
  const widthCm = Math.max(2, bounds.maxXCm - bounds.minXCm);
  const heightCm = Math.max(1.5, bounds.maxYCm - bounds.minYCm);
  const pageWidthPt = +(widthCm * PT_PER_CM).toFixed(2);
  const pageHeightPt = +(heightCm * PT_PER_CM).toFixed(2);

  const toX = (cm: number) => +((cm - bounds.minXCm) * PT_PER_CM).toFixed(2);
  const toY = (cm: number) => +((cm - bounds.minYCm) * PT_PER_CM).toFixed(2);

  const owned = parseOwnedPrimitives(source);
  const pkgObjs = parseScenePackageObjects(source);
  const hitboxes: PdfUnderlayHitbox[] = [];

  const ps: string[] = [
    '%!PS-Adobe-3.0',
    `<< /PageSize [${pageWidthPt} ${pageHeightPt}] >> setpagedevice`,
    '1 setlinecap 1 setlinejoin',
    `(${serifFontPath}) findfont 8.6 scalefont setfont`,
    // Subtle paper margin hairlines inside the PDF so the rendered sheet boundary is unmistakable
    '0.96 0.97 0.99 setrgbcolor',
    `newpath 0 0 moveto ${pageWidthPt} 0 lineto ${pageWidthPt} ${pageHeightPt} lineto 0 ${pageHeightPt} lineto closepath`,
    '0.85 setlinewidth stroke',
  ];

  // 1. Render N1 Owned Primitives
  for (const p of owned) {
    const [r, g, b] = colorToRgb01(p.values.stroke_color);
    const fillRgb = fillColorToRgb01(p.values.fill_color);
    const lw =
      p.values.stroke_width === 'very thick'
        ? 1.8
        : p.values.stroke_width === 'thick'
          ? 1.25
          : p.values.stroke_width === 'thin'
            ? 0.55
            : 0.85;
    const dash =
      p.values.line_style === 'dashed'
        ? '[4 2.5] 0 setdash'
        : p.values.line_style === 'dotted'
          ? '[1.2 2] 0 setdash'
          : '[] 0 setdash';

    ps.push(`${lw} setlinewidth ${dash}`);

    if (p.tool === 'line' || p.tool === 'arrow') {
      const polyPts = p.values.poly_points ? parsePolyPointsList(p.values.poly_points) : [];
      if (polyPts.length >= 2) {
        ps.push('newpath');
        polyPts.forEach((pt, idx) => {
          ps.push(`${toX(pt.xCm)} ${toY(pt.yCm)} ${idx === 0 ? 'moveto' : 'lineto'}`);
        });
        if (p.values.closed_cycle === 'true') ps.push('closepath');
        if (fillRgb && p.values.closed_cycle === 'true') {
          ps.push(`gsave ${fillRgb[0]} ${fillRgb[1]} ${fillRgb[2]} setrgbcolor fill grestore`);
        }
        ps.push(`${r} ${g} ${b} setrgbcolor stroke`);
        const xs = polyPts.map((q) => q.xCm);
        const ys = polyPts.map((q) => q.yCm);
        hitboxes.push({
          objectId: `n1-${p.id}`,
          lineNumber: p.lineNumber,
          packageOwner: 'tikz',
          labelRu: `Контур #${p.id}`,
          minXCm: Math.min(...xs),
          minYCm: Math.min(...ys),
          maxXCm: Math.max(...xs),
          maxYCm: Math.max(...ys),
        });
      } else {
        const dimCm = (raw: string | undefined, fallback: number): number =>
          (raw ? parseDimensionToCm(raw) : null) ?? fallback;
        const x1 = dimCm(p.values.start_x ?? p.values.x1, 1);
        const y1 = dimCm(p.values.start_y ?? p.values.y1, 1);
        const x2 = dimCm(p.values.end_x ?? p.values.x2, 3);
        const y2 = dimCm(p.values.end_y ?? p.values.y2, 2);
        ps.push(`${r} ${g} ${b} setrgbcolor newpath ${toX(x1)} ${toY(y1)} moveto ${toX(x2)} ${toY(y2)} lineto stroke`);
        if (p.tool === 'arrow' || p.values.callout_dim === 'true') {
          ps.push('[] 0 setdash');
          ps.push(emitArrowHeadPs(toX(x1), toY(y1), toX(x2), toY(y2)));
          if (p.values.callout_dim === 'true') {
            ps.push(emitArrowHeadPs(toX(x2), toY(y2), toX(x1), toY(y1)));
          }
        }
        hitboxes.push({
          objectId: `n1-${p.id}`,
          lineNumber: p.lineNumber,
          packageOwner: p.tool === 'arrow' ? 'arrows.meta' : 'tikz',
          labelRu: `${p.tool} #${p.id}`,
          minXCm: Math.min(x1, x2) - 0.12,
          minYCm: Math.min(y1, y2) - 0.12,
          maxXCm: Math.max(x1, x2) + 0.12,
          maxYCm: Math.max(y1, y2) + 0.12,
        });
      }
    } else if (p.tool === 'rectangle') {
      const dimCm = (raw: string | undefined, fallback: number): number =>
        (raw ? parseDimensionToCm(raw) : null) ?? fallback;
      const x1 = dimCm(p.values.min_x ?? p.values.x1, 1);
      const y1 = dimCm(p.values.min_y ?? p.values.y1, 1);
      const x2 = dimCm(p.values.max_x ?? p.values.x2, 3);
      const y2 = dimCm(p.values.max_y ?? p.values.y2, 2);
      const rx = toX(Math.min(x1, x2));
      const ry = toY(Math.min(y1, y2));
      const rw = Math.abs(toX(x2) - toX(x1));
      const rh = Math.abs(toY(y2) - toY(y1));
      ps.push(`newpath ${rx} ${ry} moveto ${rx + rw} ${ry} lineto ${rx + rw} ${ry + rh} lineto ${rx} ${ry + rh} lineto closepath`);
      if (fillRgb) {
        ps.push(`gsave ${fillRgb[0]} ${fillRgb[1]} ${fillRgb[2]} setrgbcolor fill grestore`);
      }
      ps.push(`${r} ${g} ${b} setrgbcolor stroke`);
      hitboxes.push({
        objectId: `n1-${p.id}`,
        lineNumber: p.lineNumber,
        packageOwner: 'tikz',
        labelRu: `Прямоугольник #${p.id}`,
        minXCm: Math.min(x1, x2),
        minYCm: Math.min(y1, y2),
        maxXCm: Math.max(x1, x2),
        maxYCm: Math.max(y1, y2),
      });
    } else if (p.tool === 'circle') {
      const dimCm = (raw: string | undefined, fallback: number): number =>
        (raw ? parseDimensionToCm(raw) : null) ?? fallback;
      const cx = dimCm(p.values.center_x ?? p.values.cx, 2);
      const cy = dimCm(p.values.center_y ?? p.values.cy, 2);
      const rad = dimCm(p.values.radius ?? p.values.r, 0.7);
      ps.push(`newpath ${toX(cx)} ${toY(cy)} ${(rad * PT_PER_CM).toFixed(2)} 0 360 arc closepath`);
      if (fillRgb) {
        ps.push(`gsave ${fillRgb[0]} ${fillRgb[1]} ${fillRgb[2]} setrgbcolor fill grestore`);
      }
      ps.push(`${r} ${g} ${b} setrgbcolor stroke`);
      hitboxes.push({
        objectId: `n1-${p.id}`,
        lineNumber: p.lineNumber,
        packageOwner: 'tikz',
        labelRu: `Окружность #${p.id}`,
        minXCm: cx - rad,
        minYCm: cy - rad,
        maxXCm: cx + rad,
        maxYCm: cy + rad,
      });
    } else if (p.tool === 'cubic') {
      const dimCm = (raw: string | undefined, fallback: number): number =>
        (raw ? parseDimensionToCm(raw) : null) ?? fallback;
      const sx = dimCm(p.values.start_x, 0.8);
      const sy = dimCm(p.values.start_y, 0.8);
      const c1x = dimCm(p.values.control1_x, 1.8);
      const c1y = dimCm(p.values.control1_y, 2.4);
      const c2x = dimCm(p.values.control2_x, 3.2);
      const c2y = dimCm(p.values.control2_y, 2.4);
      const ex = dimCm(p.values.end_x, 4.2);
      const ey = dimCm(p.values.end_y, 1.0);
      ps.push(
        `${r} ${g} ${b} setrgbcolor newpath ${toX(sx)} ${toY(sy)} moveto ${toX(c1x)} ${toY(c1y)} ${toX(c2x)} ${toY(c2y)} ${toX(ex)} ${toY(ey)} curveto stroke`
      );
      hitboxes.push({
        objectId: `n1-${p.id}`,
        lineNumber: p.lineNumber,
        packageOwner: 'tikz',
        labelRu: `Безье #${p.id}`,
        minXCm: Math.min(sx, c1x, c2x, ex),
        minYCm: Math.min(sy, c1y, c2y, ey),
        maxXCm: Math.max(sx, c1x, c2x, ex),
        maxYCm: Math.max(sy, c1y, c2y, ey),
      });
    } else if (p.tool === 'node') {
      const dimCm = (raw: string | undefined, fallback: number): number =>
        (raw ? parseDimensionToCm(raw) : null) ?? fallback;
      const nx = dimCm(p.values.x, 2);
      const ny = dimCm(p.values.y, 2);
      const txt = p.values.text ?? p.values.content ?? 'Node';
      ps.push(`[] 0 setdash ${r} ${g} ${b} setrgbcolor`);
      ps.push(emitPostScriptGlyphString(toX(nx), toY(ny) - 3, txt, true));
      hitboxes.push({
        objectId: `n1-${p.id}`,
        lineNumber: p.lineNumber,
        packageOwner: 'tikz',
        labelRu: `Узел #${p.id}`,
        minXCm: nx - 0.45,
        minYCm: ny - 0.25,
        maxXCm: nx + 0.45,
        maxYCm: ny + 0.25,
      });
    }
  }

  // 2. Render Clean Idiomatic TikZ & Package-Semantic Objects (`pgfplots`, `circuitikz`, `automata`, `chemfig`, etc.)
  ps.push('[] 0 setdash 0.9 setlinewidth');
  for (const obj of pkgObjs) {
    hitboxes.push({
      objectId: obj.objectId,
      lineNumber: obj.startLine,
      packageOwner: obj.packageOwner,
      labelRu: `${obj.packageOwner}: ${obj.kind}`,
      minXCm: Math.min(obj.x1Cm, obj.x2Cm) - 0.18,
      minYCm: Math.min(obj.y1Cm, obj.y2Cm) - 0.18,
      maxXCm: Math.max(obj.x1Cm, obj.x2Cm) + 0.18,
      maxYCm: Math.max(obj.y1Cm, obj.y2Cm) + 0.18,
    });

    if (obj.kind === 'pgfplots-axis') {
      const ax1 = toX(obj.x1Cm);
      const ay1 = toY(obj.y1Cm);
      const aw = Math.max(36, toX(obj.x2Cm) - ax1);
      const ah = Math.max(28, toY(obj.y2Cm) - ay1);
      // Grid lines
      if (obj.axisGrid) {
        ps.push('0.88 0.91 0.95 setrgbcolor 0.45 setlinewidth');
        for (let k = 1; k <= 3; k++) {
          const gx = ax1 + (aw * k) / 4;
          const gy = ay1 + (ah * k) / 4;
          ps.push(`newpath ${gx.toFixed(2)} ${ay1} moveto ${gx.toFixed(2)} ${(ay1 + ah).toFixed(2)} lineto stroke`);
          ps.push(`newpath ${ax1} ${gy.toFixed(2)} moveto ${(ax1 + aw).toFixed(2)} ${gy.toFixed(2)} lineto stroke`);
        }
      }
      // Axis frame + ticks
      ps.push('0.10 0.14 0.22 setrgbcolor 0.85 setlinewidth');
      ps.push(`newpath ${ax1} ${ay1} moveto ${ax1 + aw} ${ay1} lineto ${ax1 + aw} ${ay1 + ah} lineto ${ax1} ${ay1 + ah} lineto closepath stroke`);
      for (let k = 0; k <= 4; k++) {
        const tx = ax1 + (aw * k) / 4;
        const ty = ay1 + (ah * k) / 4;
        ps.push(`newpath ${tx.toFixed(2)} ${ay1} moveto ${tx.toFixed(2)} ${(ay1 + 3.2).toFixed(2)} lineto stroke`);
        ps.push(`newpath ${ax1} ${ty.toFixed(2)} moveto ${(ax1 + 3.2).toFixed(2)} ${ty.toFixed(2)} lineto stroke`);
      }
      // Plotted series
      for (const s of obj.axisSeries ?? []) {
        const [sr, sg, sb] = colorToRgb01(s.color === '#b91c1c' ? 'red' : s.color === '#0f766e' ? 'teal' : 'blue');
        ps.push(`${sr} ${sg} ${sb} setrgbcolor 1.25 setlinewidth newpath`);
        s.pointsNorm.forEach((pt, idx) => {
          const px = ax1 + pt.u * aw;
          const py = ay1 + pt.v * ah;
          ps.push(`${px.toFixed(2)} ${py.toFixed(2)} ${idx === 0 ? 'moveto' : 'lineto'}`);
        });
        ps.push('stroke');
      }
      // Labels
      ps.push('0.08 0.11 0.18 setrgbcolor');
      if (obj.axisXLabel) {
        ps.push(emitPostScriptGlyphString(ax1 + aw / 2, Math.max(2, ay1 - 9), obj.axisXLabel, true));
      }
      if (obj.axisYLabel) {
        ps.push(emitPostScriptGlyphString(Math.max(4, ax1 - 12), ay1 + ah / 2, obj.axisYLabel, true));
      }
      if (obj.axisTitle) {
        ps.push(emitPostScriptGlyphString(ax1 + aw / 2, ay1 + ah + 4, obj.axisTitle, true));
      }
    } else if (obj.kind === 'circuit-bipole') {
      const x1 = toX(obj.x1Cm);
      const y1 = toY(obj.y1Cm);
      const x2 = toX(obj.x2Cm);
      const y2 = toY(obj.y2Cm);
      const mx = (x1 + x2) / 2;
      const my = (y1 + y2) / 2;
      const dx = x2 - x1;
      const dy = y2 - y1;
      const len = Math.max(1, Math.hypot(dx, dy));
      const ux = dx / len;
      const uy = dy / len;
      const nx = -uy;
      const ny = ux;
      const halfSym = Math.min(13, len * 0.28);

      ps.push('0.07 0.10 0.16 setrgbcolor 0.95 setlinewidth');
      // Lead wires + terminal solder dots
      ps.push(`newpath ${x1} ${y1} moveto ${(mx - ux * halfSym).toFixed(2)} ${(my - uy * halfSym).toFixed(2)} lineto stroke`);
      ps.push(`newpath ${(mx + ux * halfSym).toFixed(2)} ${(my + uy * halfSym).toFixed(2)} moveto ${x2} ${y2} lineto stroke`);
      ps.push(`newpath ${x1} ${y1} 1.6 0 360 arc fill newpath ${x2} ${y2} 1.6 0 360 arc fill`);

      if (obj.circuitKind === 'R') {
        const w = 4.2;
        const pA = [mx - ux * halfSym + nx * w, my - uy * halfSym + ny * w];
        const pB = [mx + ux * halfSym + nx * w, my + uy * halfSym + ny * w];
        const pC = [mx + ux * halfSym - nx * w, my + uy * halfSym - ny * w];
        const pD = [mx - ux * halfSym - nx * w, my - uy * halfSym - ny * w];
        ps.push(
          `newpath ${pA[0].toFixed(2)} ${pA[1].toFixed(2)} moveto ${pB[0].toFixed(2)} ${pB[1].toFixed(2)} lineto ${pC[0].toFixed(2)} ${pC[1].toFixed(2)} lineto ${pD[0].toFixed(2)} ${pD[1].toFixed(2)} lineto closepath stroke`
        );
      } else if (obj.circuitKind === 'C') {
        const gap = 2.6;
        const h = 7.2;
        // Re-bridge wires closer to plates
        ps.push(`newpath ${(mx - ux * halfSym).toFixed(2)} ${(my - uy * halfSym).toFixed(2)} moveto ${(mx - ux * gap).toFixed(2)} ${(my - uy * gap).toFixed(2)} lineto stroke`);
        ps.push(`newpath ${(mx + ux * gap).toFixed(2)} ${(my + uy * gap).toFixed(2)} moveto ${(mx + ux * halfSym).toFixed(2)} ${(my + uy * halfSym).toFixed(2)} lineto stroke`);
        ps.push(`1.3 setlinewidth newpath ${(mx - ux * gap + nx * h).toFixed(2)} ${(my - uy * gap + ny * h).toFixed(2)} moveto ${(mx - ux * gap - nx * h).toFixed(2)} ${(my - uy * gap - ny * h).toFixed(2)} lineto stroke`);
        ps.push(`newpath ${(mx + ux * gap + nx * h).toFixed(2)} ${(my + uy * gap + ny * h).toFixed(2)} moveto ${(mx + ux * gap - nx * h).toFixed(2)} ${(my + uy * gap - ny * h).toFixed(2)} lineto stroke 0.95 setlinewidth`);
      } else if (obj.circuitKind === 'L') {
        ps.push('newpath');
        const bumps = 4;
        for (let s = 0; s <= 24; s++) {
          const t = s / 24;
          const along = -halfSym + 2 * halfSym * t;
          const arch = Math.abs(Math.sin(t * Math.PI * bumps)) * 5.2;
          const px = mx + ux * along + nx * arch;
          const py = my + uy * along + ny * arch;
          ps.push(`${px.toFixed(2)} ${py.toFixed(2)} ${s === 0 ? 'moveto' : 'lineto'}`);
        }
        ps.push('stroke');
      } else if (obj.circuitKind === 'V') {
        ps.push(`newpath ${mx.toFixed(2)} ${my.toFixed(2)} ${halfSym.toFixed(2)} 0 360 arc stroke`);
      } else {
        // Diode triangle + cathode bar
        const h = 5.5;
        ps.push(
          `newpath ${(mx - ux * 5 + nx * h).toFixed(2)} ${(my - uy * 5 + ny * h).toFixed(2)} moveto ${(mx - ux * 5 - nx * h).toFixed(2)} ${(my - uy * 5 - ny * h).toFixed(2)} lineto ${(mx + ux * 5).toFixed(2)} ${(my + uy * 5).toFixed(2)} lineto closepath stroke`
        );
        ps.push(
          `newpath ${(mx + ux * 5 + nx * h).toFixed(2)} ${(my + uy * 5 + ny * h).toFixed(2)} moveto ${(mx + ux * 5 - nx * h).toFixed(2)} ${(my + uy * 5 - ny * h).toFixed(2)} lineto stroke`
        );
      }

      if (obj.labelLatex) {
        ps.push(emitPostScriptGlyphString(mx + nx * 10, my + ny * 10, obj.labelLatex, true));
      }
    } else if (obj.kind === 'circuit-ground') {
      const gx = toX(obj.x1Cm);
      const gy = toY(obj.y1Cm);
      ps.push('0.07 0.10 0.16 setrgbcolor 0.95 setlinewidth');
      ps.push(`newpath ${gx} ${gy} moveto ${gx} ${(gy - 6).toFixed(2)} lineto stroke`);
      ps.push(`newpath ${(gx - 7).toFixed(2)} ${(gy - 6).toFixed(2)} moveto ${(gx + 7).toFixed(2)} ${(gy - 6).toFixed(2)} lineto stroke`);
      ps.push(`newpath ${(gx - 4.5).toFixed(2)} ${(gy - 9).toFixed(2)} moveto ${(gx + 4.5).toFixed(2)} ${(gy - 9).toFixed(2)} lineto stroke`);
      ps.push(`newpath ${(gx - 2).toFixed(2)} ${(gy - 12).toFixed(2)} moveto ${(gx + 2).toFixed(2)} ${(gy - 12).toFixed(2)} lineto stroke`);
    } else if (obj.kind === 'automata-state') {
      const cx = toX(obj.x1Cm);
      const cy = toY(obj.y1Cm);
      const rad = (obj.radiusCm ?? 0.42) * PT_PER_CM;
      ps.push('0.96 0.98 1.0 setrgbcolor');
      ps.push(`newpath ${cx} ${cy} ${rad.toFixed(2)} 0 360 arc fill`);
      ps.push('0.08 0.12 0.22 setrgbcolor 0.95 setlinewidth');
      ps.push(`newpath ${cx} ${cy} ${rad.toFixed(2)} 0 360 arc stroke`);
      if (obj.stateAccepting) {
        ps.push(`newpath ${cx} ${cy} ${(rad - 2.6).toFixed(2)} 0 360 arc stroke`);
      }
      if (obj.stateInitial) {
        ps.push(`newpath ${(cx - rad - 14).toFixed(2)} ${cy} moveto ${(cx - rad).toFixed(2)} ${cy} lineto stroke`);
        ps.push(emitArrowHeadPs(cx - rad - 14, cy, cx - rad, cy, 4.8));
      }
      if (obj.labelLatex) {
        ps.push(emitPostScriptGlyphString(cx, cy - 3, obj.labelLatex, true));
      }
    } else if (obj.kind === 'automata-edge') {
      const x1 = toX(obj.x1Cm);
      const y1 = toY(obj.y1Cm);
      const x2 = toX(obj.x2Cm);
      const y2 = toY(obj.y2Cm);
      ps.push('0.08 0.12 0.22 setrgbcolor 0.9 setlinewidth');
      if (obj.isSelfLoop) {
        ps.push(`newpath ${(x1 - 5).toFixed(2)} ${(y1 + 11).toFixed(2)} moveto ${(x1 - 14).toFixed(2)} ${(y1 + 28).toFixed(2)} ${(x1 + 14).toFixed(2)} ${(y1 + 28).toFixed(2)} ${(x1 + 5).toFixed(2)} ${(y1 + 11).toFixed(2)} curveto stroke`);
        if (obj.labelLatex) ps.push(emitPostScriptGlyphString(x1, y1 + 26, obj.labelLatex, true));
      } else {
        const mx = (x1 + x2) / 2;
        const my = (y1 + y2) / 2;
        const dx = x2 - x1;
        const dy = y2 - y1;
        const len = Math.max(1, Math.hypot(dx, dy));
        const nx = -dy / len;
        const ny = dx / len;
        const off = ((obj.bendDeg ?? 0) / 20) * 12;
        const cx = mx + nx * off;
        const cy = my + ny * off;
        const rPad = 12;
        const sx = x1 + (dx / len) * rPad;
        const sy = y1 + (dy / len) * rPad;
        const ex = x2 - (dx / len) * rPad;
        const ey = y2 - (dy / len) * rPad;
        ps.push(`newpath ${sx.toFixed(2)} ${sy.toFixed(2)} moveto ${cx.toFixed(2)} ${cy.toFixed(2)} ${cx.toFixed(2)} ${cy.toFixed(2)} ${ex.toFixed(2)} ${ey.toFixed(2)} curveto stroke`);
        ps.push(emitArrowHeadPs(cx, cy, ex, ey, 5));
        if (obj.labelLatex) {
          ps.push(emitPostScriptGlyphString(cx, cy + 4, obj.labelLatex, true));
        }
      }
    } else if (obj.kind === 'physics-spring' || obj.kind === 'physics-wave') {
      const x1 = toX(obj.x1Cm);
      const y1 = toY(obj.y1Cm);
      const x2 = toX(obj.x2Cm);
      const y2 = toY(obj.y2Cm);
      const [sr, sg, sb] = colorToRgb01(obj.strokeColor);
      ps.push(`${sr} ${sg} ${sb} setrgbcolor 0.95 setlinewidth newpath`);
      const dx = x2 - x1;
      const dy = y2 - y1;
      const len = Math.max(1, Math.hypot(dx, dy));
      const ux = dx / len;
      const uy = dy / len;
      const nx = -uy;
      const ny = ux;
      const cycles = Math.max(4, Math.round(len / 9));
      const steps = cycles * 8;
      for (let k = 0; k <= steps; k++) {
        const t = k / steps;
        const amp = obj.kind === 'physics-spring' ? 4.2 : 2.8;
        const wave = Math.sin(t * Math.PI * 2 * cycles) * amp;
        const loopBack = obj.kind === 'physics-spring' ? Math.cos(t * Math.PI * 2 * cycles) * 1.6 : 0;
        const px = x1 + ux * (t * len + loopBack) + nx * wave;
        const py = y1 + uy * (t * len + loopBack) + ny * wave;
        ps.push(`${px.toFixed(2)} ${py.toFixed(2)} ${k === 0 ? 'moveto' : 'lineto'}`);
      }
      ps.push('stroke');
      if (obj.kind === 'physics-wave') {
        ps.push(emitArrowHeadPs(x1, y1, x2, y2, 5.2));
      }
    } else if (obj.kind === 'optics-lens') {
      const x1 = toX(obj.x1Cm);
      const y1 = toY(obj.y1Cm);
      const x2 = toX(obj.x2Cm);
      const y2 = toY(obj.y2Cm);
      ps.push('0.11 0.31 0.85 setrgbcolor 1.4 setlinewidth');
      ps.push(`newpath ${x1} ${y1} moveto ${x2} ${y2} lineto stroke`);
      ps.push(emitArrowHeadPs(x1, y1, x2, y2, 6));
      ps.push(emitArrowHeadPs(x2, y2, x1, y1, 6));
      if (obj.labelLatex) {
        ps.push(emitPostScriptGlyphString(x2, Math.max(y1, y2) + 5, obj.labelLatex, true));
      }
    } else if (obj.kind === 'mech-support') {
      const tx = toX(obj.x1Cm);
      const ty = toY(obj.y1Cm);
      ps.push('0.10 0.14 0.22 setrgbcolor 0.95 setlinewidth');
      ps.push(`newpath ${tx} ${ty} moveto ${(tx - 7.5).toFixed(2)} ${(ty - 11).toFixed(2)} lineto ${(tx + 7.5).toFixed(2)} ${(ty - 11).toFixed(2)} lineto closepath stroke`);
      for (let h = -7; h <= 7; h += 3.5) {
        ps.push(`newpath ${(tx + h).toFixed(2)} ${(ty - 11).toFixed(2)} moveto ${(tx + h - 3).toFixed(2)} ${(ty - 15).toFixed(2)} lineto stroke`);
      }
    } else if (obj.kind === 'chemfig-molecule') {
      const cx = toX((obj.x1Cm + obj.x2Cm) / 2);
      const cy = toY((obj.y1Cm + obj.y2Cm) / 2);
      const r = 13.5;
      const sides = obj.chemFormula?.includes('*5') ? 5 : 6;
      ps.push('0.08 0.12 0.20 setrgbcolor 1.0 setlinewidth newpath');
      for (let k = 0; k < sides; k++) {
        const ang = (Math.PI / 2) + (k * 2 * Math.PI) / sides;
        const vx = cx + r * Math.cos(ang);
        const vy = cy + r * Math.sin(ang);
        ps.push(`${vx.toFixed(2)} ${vy.toFixed(2)} ${k === 0 ? 'moveto' : 'lineto'}`);
      }
      ps.push('closepath stroke');
      // Aromatic inner circle / double bonds indicator
      if (sides === 6 && obj.chemFormula?.includes('=')) {
        ps.push(`0.7 setlinewidth newpath ${cx} ${cy} ${(r * 0.62).toFixed(2)} 0 360 arc stroke`);
      }
    } else if (obj.kind === 'clean-rect') {
      const rx = toX(Math.min(obj.x1Cm, obj.x2Cm));
      const ry = toY(Math.min(obj.y1Cm, obj.y2Cm));
      const rw = Math.abs(toX(obj.x2Cm) - toX(obj.x1Cm));
      const rh = Math.abs(toY(obj.y2Cm) - toY(obj.y1Cm));
      const fRgb = fillColorToRgb01(obj.fillColor);
      ps.push(`newpath ${rx} ${ry} moveto ${rx + rw} ${ry} lineto ${rx + rw} ${ry + rh} lineto ${rx} ${ry + rh} lineto closepath`);
      if (fRgb) ps.push(`gsave ${fRgb[0]} ${fRgb[1]} ${fRgb[2]} setrgbcolor fill grestore`);
      ps.push('0.08 0.12 0.20 setrgbcolor 0.95 setlinewidth stroke');
    } else if (obj.kind === 'clean-circle') {
      const cx = toX(obj.x1Cm);
      const cy = toY(obj.y1Cm);
      const rad = (obj.radiusCm ?? 0.5) * PT_PER_CM;
      ps.push(`0.08 0.12 0.20 setrgbcolor 0.95 setlinewidth newpath ${cx} ${cy} ${rad.toFixed(2)} 0 360 arc stroke`);
    } else if (obj.kind === 'clean-node') {
      ps.push('0.08 0.12 0.20 setrgbcolor');
      ps.push(emitPostScriptGlyphString(toX(obj.x1Cm), toY(obj.y1Cm) - 3, obj.labelLatex ?? 'Node', true));
    } else if (obj.kind === 'clean-line' || obj.kind === 'clean-arrow') {
      const x1 = toX(obj.x1Cm);
      const y1 = toY(obj.y1Cm);
      const x2 = toX(obj.x2Cm);
      const y2 = toY(obj.y2Cm);
      ps.push(`0.08 0.12 0.20 setrgbcolor 0.95 setlinewidth newpath ${x1} ${y1} moveto ${x2} ${y2} lineto stroke`);
      if (obj.kind === 'clean-arrow') {
        ps.push(emitArrowHeadPs(x1, y1, x2, y2, 5.4));
      }
    }
  }

  ps.push('showpage');

  return {
    postScriptProgram: ps.join('\n'),
    pageWidthPt,
    pageHeightPt,
    objectsRendered: owned.length + pkgObjs.length,
    hitboxes,
  };
}
