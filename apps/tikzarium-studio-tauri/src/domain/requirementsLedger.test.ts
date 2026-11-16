import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import {
  MODERNIZATION_TASKS_20,
  REQUIREMENTS_AND_FE_LEDGER,
  buildMarkdownLedgerDocumentRu,
  getRequirementsLedgerSummary,
} from './requirementsLedger';

test('Master Requirements & FE Ledger covers ALL normative and Studio items with unique IDs', () => {
  const seenIds = new Set<string>();
  for (const row of REQUIREMENTS_AND_FE_LEDGER) {
    assert.ok(!seenIds.has(row.id), `Duplicate requirement/FE ID detected: ${row.id}`);
    seenIds.add(row.id);
    assert.ok(row.titleRu.trim().length > 5, `Empty title for ${row.id}`);
    assert.ok(row.noteRu.trim().length > 3, `Empty note for ${row.id}`);
  }

  const summary = getRequirementsLedgerSummary();
  assert.equal(
    summary.total,
    summary.byStudioStatus.implemented +
      summary.byStudioStatus.partial +
      summary.byStudioStatus.proposal
  );

  // Verify exact counts of normative families
  const sci142 = REQUIREMENTS_AND_FE_LEDGER.filter((r) => r.group === 'sci142-reqs');
  assert.equal(sci142.length, 103, 'Must include all 103 Scientific-142 R4 requirements');

  const uxFindings = REQUIREMENTS_AND_FE_LEDGER.filter((r) => r.group === 'ux-audit');
  assert.equal(uxFindings.length, 14, 'Must include all 14 UX-F01..UX-F14 findings');

  const ai88Cases = REQUIREMENTS_AND_FE_LEDGER.filter((r) => r.group === 'ai88-cases');
  assert.equal(ai88Cases.length, 88, 'Must include all 88 AI88 cases');

  const ai88Pkgs = REQUIREMENTS_AND_FE_LEDGER.filter((r) => r.id.startsWith('AI88-PKG-'));
  assert.equal(ai88Pkgs.length, 35, 'Must include all 35 specialized AI88 packages');

  const ai88Libs = REQUIREMENTS_AND_FE_LEDGER.filter((r) => r.id.startsWith('AI88-LIB-'));
  assert.equal(ai88Libs.length, 23, 'Must include all 23 AI88 TikZ libraries');

  const pItems = REQUIREMENTS_AND_FE_LEDGER.filter((r) => /^P\d{2}$/.test(r.id));
  assert.equal(pItems.length, 80, 'Must include all P01..P80 FE items');

  const eItems = REQUIREMENTS_AND_FE_LEDGER.filter((r) => /^E0\d$/.test(r.id));
  assert.equal(eItems.length, 8, 'Must include all E01..E08 workspace ergonomics items');

  const fItems = REQUIREMENTS_AND_FE_LEDGER.filter((r) => /^F\d{2}$/.test(r.id));
  assert.equal(fItems.length, 16, 'Must include all F01..F16 engineering stage items');

  const extItems = REQUIREMENTS_AND_FE_LEDGER.filter((r) => /^EXT-\d{2}$/.test(r.id));
  assert.equal(extItems.length, 12, 'Must include all 12 EXT-01..EXT-12 package studios');

  const blueprints = REQUIREMENTS_AND_FE_LEDGER.filter((r) => r.group === 'egui-blueprints');
  assert.equal(blueprints.length, 25, 'Must include all 25 Rust/egui blueprints');

  assert.equal(MODERNIZATION_TASKS_20.length, 20, 'Must propose exactly 20 modernization tasks');
  const modItems = REQUIREMENTS_AND_FE_LEDGER.filter((r) => r.group === 'modernization-20');
  assert.equal(modItems.length, 20);
  assert.equal(
    modItems.filter((m) => m.studioStatus === 'implemented').length,
    8,
    'Wave 1 must mark 8 modernization tasks as implemented'
  );
  assert.equal(
    modItems.filter((m) => m.studioStatus === 'partial').length,
    5,
    'Wave 1 must mark 5 modernization tasks as partial'
  );
  assert.equal(
    modItems.filter((m) => m.studioStatus === 'proposal').length,
    7,
    'Wave 2/3 must keep 7 remaining modernization tasks honestly marked as proposal'
  );
  assert.ok(
    ai88Libs.every((l) => l.studioStatus === 'implemented'),
    'All 23 AI88 TikZ libraries must be registered in TIKZ_LIBRARIES with 5-status support'
  );
});

test('docs/REQUIREMENTS_AND_FE_LEDGER_RU.md is committed in repository and strictly synced', () => {
  const candidates = [
    path.resolve(process.cwd(), 'docs/REQUIREMENTS_AND_FE_LEDGER_RU.md'),
    path.resolve(process.cwd(), '../../docs/REQUIREMENTS_AND_FE_LEDGER_RU.md'),
  ];
  const mdPath = candidates.find((p) => fs.existsSync(p)) ?? candidates[0];
  assert.ok(fs.existsSync(mdPath), 'docs/REQUIREMENTS_AND_FE_LEDGER_RU.md must exist in repo');
  const actualDiskMd = fs.readFileSync(mdPath, 'utf8');
  const expectedMd = buildMarkdownLedgerDocumentRu();
  assert.equal(
    actualDiskMd,
    expectedMd,
    'docs/REQUIREMENTS_AND_FE_LEDGER_RU.md must stay 100% in sync with requirementsLedger.ts'
  );
});
