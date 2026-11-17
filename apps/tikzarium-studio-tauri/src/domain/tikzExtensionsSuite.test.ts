import test from 'node:test';
import assert from 'node:assert/strict';
import {
  TIKZ_EXTENSION_PACKAGES,
  buildTikzExtensionBundle,
  detectActiveExtensionsInSource,
  insertTikzExtensionIntoSource,
} from './tikzExtensionsSuite';
import { analyzeTexDiagnostics, parseOwnedPrimitives } from './tikzEngine';
import { formatTikzDocumentSource } from './formatterRefactorAndCadBundle';
import { applyDiagnosticQuickFix } from './ergonomicsBundle';
import {
  joinPreambleAndBodyToSource,
  splitTexDocumentIntoPreambleAndBody,
} from './workspaceAndEngineeringStageBundle';

const BASE_STANDALONE_TEX = `\\documentclass[tikz,border=6pt]{standalone}
\\usepackage{fontspec}
\\setmainfont{DejaVu Serif}
\\begin{document}
\\begin{tikzpicture}
  \\draw (0cm,0cm) -- (1cm,0cm);
\\end{tikzpicture}
\\end{document}
`;

test('TIKZ_EXTENSION_PACKAGES covers all 12 extension studios and generates error-free LaTeX + n1 primitives for every preset', () => {
  assert.equal(TIKZ_EXTENSION_PACKAGES.length, 12);

  for (const pkg of TIKZ_EXTENSION_PACKAGES) {
    assert.ok(pkg.presets.length >= 2, `Expected >=2 presets for ${pkg.id}`);

    for (const preset of pkg.presets) {
      const hybridRes = insertTikzExtensionIntoSource(BASE_STANDALONE_TEX, {
        extensionId: pkg.id,
        presetId: preset.id,
        outputMode: 'hybrid',
      });
      assert.equal(hybridRes.ok, true, `Failed hybrid insert for ${pkg.id}/${preset.id}`);
      assert.ok(
        hybridRes.insertedIds.length >= 3 &&
          hybridRes.insertedIds.every((id) => Number.isInteger(id) && id > 0),
        `Expected valid numeric canvas primitive IDs for ${pkg.id}/${preset.id}`
      );

      const diags = analyzeTexDiagnostics(hybridRes.nextSource);
      const errors = diags.filter((d) => d.severity === 'error');
      assert.deepEqual(
        errors,
        [],
        `Unexpected diagnostic errors for ${pkg.id}/${preset.id}: ${JSON.stringify(errors)}`
      );

      // Formatter round-trip preserves all owned primitives and produces zero errors
      const formatted = formatTikzDocumentSource(hybridRes.nextSource);
      assert.equal(formatted.preservedOwnedCount, hybridRes.insertedIds.length);
      const postFormatErrors = analyzeTexDiagnostics(formatted.nextSource).filter(
        (d) => d.severity === 'error'
      );
      assert.deepEqual(postFormatErrors, []);
    }
  }
});

test('insertTikzExtensionIntoSource supports pure native-tex and pure canvas-n1 modes and preserves CRLF + preamble splitter invariant', () => {
  const crlfSource = BASE_STANDALONE_TEX.replace(/\n/g, '\r\n');

  const pureNative = insertTikzExtensionIntoSource(crlfSource, {
    extensionId: 'chemfig',
    presetId: 'chem-scheme',
    outputMode: 'native-tex',
    params: { substituent: 'NO_2', catalyst: '\\ce{H2SO4}', byproduct: '\\ce{-H2O}' },
  });
  assert.equal(pureNative.ok, true);
  assert.equal(pureNative.insertedIds.length, 0);
  assert.equal(parseOwnedPrimitives(pureNative.nextSource).length, 0);
  assert.ok(pureNative.nextSource.includes('\\usepackage{chemfig}'));
  assert.ok(pureNative.nextSource.includes('\\usepackage[version=4]{mhchem}'));
  assert.ok(pureNative.nextSource.includes('\\schemestart'));
  assert.ok(pureNative.nextSource.includes('\r\n'));

  const split = splitTexDocumentIntoPreambleAndBody(pureNative.nextSource);
  assert.equal(split.hasPreamble, true);
  assert.equal(
    joinPreambleAndBodyToSource(split.preambleText, split.bodyText, split.lineEnding),
    pureNative.nextSource
  );

  const pureCanvas = insertTikzExtensionIntoSource(BASE_STANDALONE_TEX, {
    extensionId: 'circuitikz',
    presetId: 'ctikz-opamp',
    outputMode: 'canvas-n1',
  });
  assert.equal(pureCanvas.ok, true);
  assert.ok(pureCanvas.insertedIds.length > 0);
  assert.ok(!pureCanvas.nextSource.includes('\\usepackage[european'));
  assert.ok(!pureCanvas.nextSource.includes('\\node[op amp]'));
});

test('feynman-qed preset provides honest XeLaTeX compatibility warning while compiling with explicit vertex coordinates', () => {
  const bundle = buildTikzExtensionBundle({
    extensionId: 'quantikz',
    presetId: 'feynman-qed',
    outputMode: 'hybrid',
  });
  assert.ok(bundle.engineWarningRu && bundle.engineWarningRu.includes('LuaLaTeX'));
  assert.ok(bundle.nativeTexLines.some((l) => l.includes('\\vertex')));
});

test('analyzeTexDiagnostics flags missing extension package and applyDiagnosticQuickFix connects it in 1 click', () => {
  const brokenForestTex = `\\documentclass[tikz,border=6pt]{standalone}
\\begin{document}
\\begin{tikzpicture}
  \\node[inner sep=0pt] at (2cm,2cm) {
    \\begin{forest}
      [Root [A] [B]]
    \\end{forest}
  };
\\end{tikzpicture}
\\end{document}
`;
  const diags = analyzeTexDiagnostics(brokenForestTex);
  const missingForest = diags.find((d) => d.code === 'TEX-MISSING-EXT-PKG');
  assert.ok(missingForest, 'Expected TEX-MISSING-EXT-PKG for \\begin{forest} without \\usepackage{forest}');

  const fixed = applyDiagnosticQuickFix(brokenForestTex, missingForest);
  assert.equal(fixed.ok, true);
  assert.ok(fixed.nextSource.includes('\\usepackage[edges]{forest}'));
  const remainingErrors = analyzeTexDiagnostics(fixed.nextSource).filter(
    (d) => d.severity === 'error'
  );
  assert.deepEqual(remainingErrors, []);
});

test('detectActiveExtensionsInSource identifies loaded preamble packages and pure native-tex extension environments', () => {
  assert.deepEqual(detectActiveExtensionsInSource(BASE_STANDALONE_TEX), []);

  const nativePgfplotsAndChem = insertTikzExtensionIntoSource(BASE_STANDALONE_TEX, {
    extensionId: 'pgfplots',
    presetId: 'pgf-fillbetween',
    outputMode: 'native-tex',
  });
  const detectedIds = detectActiveExtensionsInSource(nativePgfplotsAndChem.nextSource).map(
    (s) => s.id
  );
  assert.ok(detectedIds.includes('pgfplots'));
});

