"""Fail-closed contract for MiKTeX artifacts across GitHub Actions retries.

A workflow rerun preserves github.run_id but increments github.run_attempt.
Windows reuploads the latest evidence under one unique-to-run name with
overwrite: true; the independent Linux auditor must fetch the same name.
This also supports a Linux-only 'rerun failed jobs' without a Windows rerun.
"""
from __future__ import annotations

import re
import unittest
from pathlib import Path

WORKFLOW = Path(__file__).resolve().parents[2] / ".github/workflows/qa-miktex-windows.yml"
RUN_ID = "${{ github.run_id }}"
WINDOWS_ARTIFACT = f"qa-miktex-windows-server-{RUN_ID}"
LOCK_ARTIFACT = f"qa-lock-miktex-windows-server-{RUN_ID}"
AUDIT_ARTIFACT = f"qa-miktex-independent-postupload-{RUN_ID}"


def artifact_steps(source: str, action: str) -> list[tuple[str, str | None]]:
    """Extract exact action 'with' names, without importing YAML libraries."""
    lines = source.splitlines()
    steps: list[tuple[str, str | None]] = []
    pattern = re.compile(rf"actions/{action}-artifact@[0-9a-f]+")
    for index, line in enumerate(lines):
        if not pattern.search(line):
            continue
        body: list[str] = []
        for candidate in lines[index + 1 :]:
            if candidate.startswith("      - ") or re.match(r"^  [a-zA-Z][a-zA-Z0-9_-]*:\s*$", candidate):
                break
            body.append(candidate)
        block = "\n".join(body)
        name = re.search(r"(?m)^          name:\s*(\S.*?)\s*$", block)
        if name is None:
            raise AssertionError(f"{action}-artifact step has no explicit name")
        overwrite = re.search(r"(?m)^          overwrite:\s*(\S+)\s*$", block)
        steps.append((name.group(1), overwrite.group(1) if overwrite else None))
    return steps


def verify_artifact_lease(source: str) -> None:
    uploads = artifact_steps(source, "upload")
    downloads = artifact_steps(source, "download")
    expected_uploads = [
        (WINDOWS_ARTIFACT, "true"),
        (LOCK_ARTIFACT, "true"),
        (AUDIT_ARTIFACT, "true"),
    ]
    expected_downloads = [(WINDOWS_ARTIFACT, None)]
    if uploads != expected_uploads:
        raise AssertionError(
            f"Upload must replace exactly the same-run Windows/lock/audit artifacts: {uploads!r}"
        )
    if downloads != expected_downloads:
        raise AssertionError(
            f"Independent auditor must fetch exactly the same-run Windows artifact: {downloads!r}"
        )
    if "github.run_attempt" in source:
        raise AssertionError(
            "Do not lease artifacts by run_attempt: an audit-only failed-job rerun "
            "has no producer for that attempt"
        )
    if source.count("test_qa_miktex_artifact_lease.py -v") != 2:
        raise AssertionError("Both hosted Windows producer and independent Linux auditor must test this lease")


class MiKTeXArtifactLeaseContract(unittest.TestCase):
    @classmethod
    def setUpClass(cls) -> None:
        cls.source = WORKFLOW.read_text(encoding="utf-8")

    def test_live_workflow_lease(self) -> None:
        verify_artifact_lease(self.source)

    def test_reject_non_overwriting_producer_on_retry(self) -> None:
        mutant = self.source.replace("overwrite: true", "overwrite: false", 1)
        self.assertNotEqual(mutant, self.source)
        with self.assertRaises(AssertionError):
            verify_artifact_lease(mutant)

    def test_reject_repeated_non_unique_name(self) -> None:
        mutant = self.source.replace(WINDOWS_ARTIFACT, "qa-miktex-windows-server", 1)
        self.assertNotEqual(mutant, self.source)
        with self.assertRaises(AssertionError):
            verify_artifact_lease(mutant)

    def test_reject_attempt_scoped_name_even_if_producer_and_consumer_match(self) -> None:
        mutant = self.source.replace(RUN_ID, "${{ github.run_attempt }}")
        self.assertNotEqual(mutant, self.source)
        with self.assertRaises(AssertionError):
            verify_artifact_lease(mutant)

    def test_reject_consumer_pointing_at_a_different_artifact(self) -> None:
        needle = f"name: {WINDOWS_ARTIFACT}\n          path: .qa-artifacts/miktex-uploaded"
        mutant = self.source.replace(needle, "name: qa-miktex-windows-server-stale\n          path: .qa-artifacts/miktex-uploaded")
        self.assertNotEqual(mutant, self.source)
        with self.assertRaises(AssertionError):
            verify_artifact_lease(mutant)


if __name__ == "__main__":
    unittest.main()
