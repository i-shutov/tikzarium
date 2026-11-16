import test from 'node:test';
import assert from 'node:assert/strict';
import {
  applyAtomicFigureProfileToPreamble,
  ensureRequiredLibsForInspectorPatch,
  inferAtomicFigureProfile,
  inspectFigurePackagePassport,
  togglePackageInPreamble,
  toggleTikzLibraryInPreamble,
} from './atomicFigureProfile';
import { buildSpecimenDocuments, insertOwnedPrimitiveIntoSource } from './tikzEngine';

test('inferAtomicFigureProfile detects optics, pgfplots, circuits, and beamer figures accurately', () => {
  const specimens = buildSpecimenDocuments();
  assert.equal(inferAtomicFigureProfile(specimens[0].source), 'optics-mechanics');

  const plotTex = `\\documentclass[border=6pt]{standalone}
\\usepackage{tikz}
\\usepackage{pgfplots}
\\pgfplotsset{compat=1.18}
\\begin{document}
\\begin{tikzpicture}
\\begin{axis}\\addplot coordinates {(0,0) (1,1)};\\end{axis}
\\end{tikzpicture}
\\end{document}
`;
  assert.equal(inferAtomicFigureProfile(plotTex), 'plots-stats');

  const circuitTex = `\\documentclass{standalone}
\\usepackage{circuitikz}
\\begin{document}
\\begin{circuitikz}\\draw (0,0) to[R] (2,0);\\end{circuitikz}
\\end{document}
`;
  assert.equal(inferAtomicFigureProfile(circuitTex), 'circuits-control');

  const beamerTex = `\\documentclass{beamer}
\\usepackage{tikz}
\\begin{document}
\\begin{tikzpicture}\\draw (0,0) -- (1,1);\\end{tikzpicture}
\\end{document}
`;
  assert.equal(inferAtomicFigureProfile(beamerTex), 'beamer-slides');
});

test('inspectFigurePackagePassport identifies unused and missing libraries and standalone non-Beamer mode', () => {
  const base = `\\documentclass[tikz,border=6pt]{standalone}
\\usetikzlibrary{calc,spy}
\\begin{document}
\\begin{tikzpicture}
\\draw[pattern=north east lines] (0,0) rectangle (2,1);
\\end{tikzpicture}
\\end{document}
`;
  const passport = inspectFigurePackagePassport(base);
  assert.equal(passport.docClass, 'standalone');
  assert.equal(passport.isBeamerActive, false);
  assert.ok(passport.unusedLibraries.includes('spy'));
  assert.ok(passport.missingRequiredLibraries.some((m) => m.name === 'patterns'));
});

test('toggleTikzLibraryInPreamble blocks LuaLaTeX-only graphdrawing and protects libraries in active n1 use', () => {
  const base = `\\documentclass[tikz,border=6pt]{standalone}
\\usetikzlibrary{arrows.meta,spy}
\\begin{document}
\\begin{tikzpicture}
\\end{tikzpicture}
\\end{document}
`;
  const withArrow = insertOwnedPrimitiveIntoSource(base, 'arrow', {
    start_x: '0cm',
    start_y: '0cm',
    end_x: '2cm',
    end_y: '1cm',
    tip: 'Stealth',
  }).nextSource;

  const luaBlocked = toggleTikzLibraryInPreamble(withArrow, 'graphdrawing', true);
  assert.equal(luaBlocked.ok, false);

  const protectedArrow = toggleTikzLibraryInPreamble(withArrow, 'arrows.meta', false);
  assert.equal(protectedArrow.ok, false);

  const removeUnusedSpy = toggleTikzLibraryInPreamble(withArrow, 'spy', false);
  assert.equal(removeUnusedSpy.ok, true);
  assert.ok(!removeUnusedSpy.nextSource.includes('spy'));
});

test('togglePackageInPreamble and applyAtomicFigureProfileToPreamble inject pgfplots + compat=1.18 cleanly', () => {
  const minimal = `\\documentclass[border=6pt]{standalone}
\\usepackage{tikz}
\\begin{document}
\\begin{tikzpicture}
  \\draw (0,0) -- (1,1);
\\end{tikzpicture}
\\end{document}
`;
  const profiled = applyAtomicFigureProfileToPreamble(minimal, 'plots-stats');
  assert.equal(profiled.ok, true);
  assert.ok(profiled.nextSource.includes('\\usepackage{pgfplots}'));
  assert.ok(profiled.nextSource.includes('\\pgfplotsset{compat=1.18}'));
  assert.ok(profiled.nextSource.includes('\\usepackage{siunitx}'));

  const disconnected = togglePackageInPreamble(profiled.nextSource, 'pgfplots', false);
  assert.equal(disconnected.ok, true);
  assert.ok(!disconnected.nextSource.includes('\\usepackage{pgfplots}'));
  assert.ok(!disconnected.nextSource.includes('\\pgfplotsset{compat=1.18}'));
});

test('ensureRequiredLibsForInspectorPatch auto-connects patterns and decorations when chosen in Inspector', () => {
  const minimal = `\\documentclass[border=6pt]{standalone}
\\usepackage{tikz}
\\begin{document}
\\begin{tikzpicture}
\\end{tikzpicture}
\\end{document}
`;
  const res1 = ensureRequiredLibsForInspectorPatch(minimal, 'rectangle', {
    start_x: '0cm',
    start_y: '0cm',
    end_x: '2cm',
    end_y: '1cm',
    hatch_pattern: 'north east lines',
  });
  assert.deepEqual(res1.autoConnectedLibs, ['patterns']);
  assert.ok(res1.nextSource.includes('\\usetikzlibrary{patterns}'));

  const res2 = ensureRequiredLibsForInspectorPatch(res1.nextSource, 'line', {
    start_x: '0cm',
    start_y: '0cm',
    end_x: '2cm',
    end_y: '0cm',
    decoration_kind: 'brace',
  });
  assert.deepEqual(res2.autoConnectedLibs, ['decorations.pathreplacing']);
  assert.ok(res2.nextSource.includes('decorations.pathreplacing'));
});
