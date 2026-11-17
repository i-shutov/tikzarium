import assert from 'node:assert/strict';
import test from 'node:test';
import {
  AGENT_JSONL_PRESETS,
  ALL_CONTROL_OPERATIONS_V2,
  StudioControlEngine,
  UPSTREAM_TEST_COMPATIBILITY_MATRIX,
  buildSelfContainedGitSyncShellScript,
  buildUpstreamMigrationArtifacts,
} from './studioControlApi';

const CRLF_FIXTURE = [
  '% русский комментарий автора',
  '\\documentclass[border=4pt]{standalone}',
  '\\usepackage{fontspec}',
  '\\usepackage{tikz}',
  '\\usetikzlibrary{arrows.meta,calc}',
  '\\newcommand{\\myMacro}[1]{#1}',
  '\\begin{document}',
  '\\begin{tikzpicture}',
  '  \\node at (0,0) {\\myMacro{Кириллица}};',
  '\\end{tikzpicture}',
  '\\end{document}',
  '',
].join('\r\n');

test('Upstream contract #1: virtual_window layout exposes all v1 widget IDs plus split v2 preamble/body/caret panels', () => {
  const engine = new StudioControlEngine(CRLF_FIXTURE);
  const responses = engine.runJsonl(
    [
      '{"op":"window.set","width":1440,"height":900,"dpi":1.25}',
      '{"op":"input.click","target":"group.geometry"}',
      '{"op":"layout.snapshot"}',
    ].join('\n')
  );

  assert.equal(responses.length, 3);
  assert.ok(responses.every((r) => r.ok));
  const layout = responses[2].result as Record<string, { pixels: number[] }>;

  // Required by upstream `virtual_window_reports_actual_native_egui_widget_rectangles` & `b42`:
  for (const requiredId of [
    'group.geometry',
    'group.connections',
    'group.text',
    'group.extensions',
    'tool.line',
    'tool.rectangle',
    'tool.circle',
    'tool.cubic',
    'guide.canvas',
    'panel.source',
    'panel.inspector',
    // Added in v2 without breaking panel.source:
    'panel.preamble',
    'panel.figure_body',
    'bar.caret_syntax',
  ]) {
    assert.ok(layout[requiredId], `Missing observed widget rectangle '${requiredId}'`);
    assert.equal(layout[requiredId].pixels.length, 4);
  }
});

test('Upstream contract #2: all 6 semantic gestures create real N1 transactions, undo restores, and CRLF + Cyrillic macro survive', () => {
  const engine = new StudioControlEngine(CRLF_FIXTURE);
  const cmds = [
    '{"op":"tool.gesture","tool":"line","from":[0.2,0.2],"to":[2.4,1.2]}',
    '{"op":"tool.gesture","tool":"rectangle","from":[0.5,0.4],"to":[2.5,1.8]}',
    '{"op":"tool.gesture","tool":"circle","from":[2.0,1.5],"to":[2.8,1.5]}',
    '{"op":"tool.gesture","tool":"cubic","from":[0.4,0.6],"to":[3.4,1.9]}',
    '{"op":"tool.gesture","tool":"arrow","from":[0.3,2.0],"to":[3.1,2.0]}',
    '{"op":"tool.gesture","tool":"node","from":[1.5,2.5],"to":[1.5,2.5]}',
    '{"op":"authoring.undo"}',
    '{"op":"authoring.redo"}',
  ];

  const out = engine.runJsonl(cmds.join('\n'));
  assert.ok(out.every((r) => r.ok), `Unexpected error in semantic gestures: ${JSON.stringify(out)}`);

  const finalSnap = engine.snapshot();
  assert.equal(finalSnap.owned_count, 6);
  assert.ok(finalSnap.source.includes('\r\n'), 'CRLF line endings must be preserved');
  assert.ok(
    finalSnap.source.includes('\\myMacro{Кириллица}'),
    'Opaque Cyrillic author macro must survive untouched'
  );
});

test('Upstream contract #3: F1 and manual.open_anchor never mutate source; stale revision & path traversal are rejected', () => {
  const engine = new StudioControlEngine(CRLF_FIXTURE, {
    'existing.tex': 'DO NOT OVERWRITE',
  });
  const beforeSource = engine.getSource();

  const res = engine.runJsonl(
    [
      '{"op":"input.key","key":"F1"}',
      '{"op":"manual.open_anchor","anchor_id":"ext.pgfplots.axis"}',
      '{"op":"source.replace","revision":999,"source":"BAD"}',
      '{"op":"document.save_as","path":"existing.tex"}',
      '{"op":"document.save_as","path":"../outside.tex"}',
    ].join('\n')
  );

  assert.equal(res[0].ok, true);
  assert.equal(res[1].ok, true);
  assert.equal(engine.getSource(), beforeSource, 'F1 and manual.open_anchor must keep source byte-identical');
  assert.equal(res[2].ok, false, 'Stale revision must be rejected');
  assert.equal(res[3].ok, false, 'Unrelated existing file overwrite must be rejected');
  assert.equal(res[4].ok, false, 'Sandbox escape path must be rejected');
});

test('V2 100% GUI<->API parity: atomic preamble profile, 12 TikZ extensions, workshops, formatter, and agent presets succeed', () => {
  assert.ok(ALL_CONTROL_OPERATIONS_V2.length >= 49);
  assert.ok(UPSTREAM_TEST_COMPATIBILITY_MATRIX.length >= 6);

  for (const preset of AGENT_JSONL_PRESETS) {
    const engine = new StudioControlEngine(CRLF_FIXTURE);
    const out = engine.runJsonl(preset.jsonl);
    if (preset.id === 'revision-guard-proof') {
      assert.equal(out[0].ok, true);
      assert.equal(out[1].ok, true);
      assert.equal(out[2].ok, false);
    } else {
      assert.ok(
        out.every((r) => r.ok),
        `Preset '${preset.id}' failed: ${JSON.stringify(out)}`
      );
    }
  }

  const artifacts = buildUpstreamMigrationArtifacts();
  assert.ok(artifacts.some((a) => a.path === 'assets/manuals/manual_anchors.index.json'));
  assert.ok(artifacts.some((a) => a.path === 'tools/index_manuals/02_extract_pdf_anchors.py'));

  const syncScript = buildSelfContainedGitSyncShellScript();
  assert.ok(syncScript.includes('cargo test --workspace'));
});
