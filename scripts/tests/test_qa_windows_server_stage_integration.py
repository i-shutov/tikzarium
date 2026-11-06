"""Live Windows transfer verifier regression using genuine just-built hosted artifacts.

No privileged TeX, GUI, account/UAC modifications or self-hosted PR execution.
Run only on disposable hosted Windows CI after native build + portable ZIP QA.
"""
from __future__ import annotations

import argparse
import hashlib
import json
from pathlib import Path
import subprocess
import tempfile
import zipfile


def run_stage(script: Path, native: Path, portable: Path, output: Path,
              sha: str, run_id: str) -> tuple[subprocess.CompletedProcess[str], dict]:
    result = subprocess.run(
        ["pwsh", "-NoProfile", "-NonInteractive", "-File", str(script),
         "-NativeRoot", str(native), "-PortableRoot", str(portable),
         "-OutputDir", str(output), "-ExpectedSha", sha,
         "-SourceRunId", run_id, "-VerificationHost", "hosted-ci"],
        capture_output=True, text=True, encoding="utf-8", errors="replace",
        timeout=90, check=False,
    )
    report_path = output / "windows-server-hosted-artifact.json"
    if not report_path.is_file():
        raise AssertionError(f"Transfer verifier did not preserve a report: {result.stderr[-1000:]}")
    return result, json.loads(report_path.read_text(encoding="utf-8-sig"))


def test_original_and_tampered_manifest(native: Path, portable: Path,
                                       sha: str, run_id: str) -> None:
    script = Path(__file__).resolve().parents[1] / "tools" / "qa_windows_server_stage.ps1"
    source_zip = portable / "Tikzarium-Windows-x64-portable-candidate.zip"
    source_audit = portable / "windows-zip-audit.json"
    if not (script.is_file() and source_zip.is_file() and source_audit.is_file()):
        raise AssertionError("Genuine original hosted inputs must exist")
    with tempfile.TemporaryDirectory(prefix="tikzarium-stage-regression-") as tmp:
        root = Path(tmp)
        result, report = run_stage(script, native, portable, root / "positive", sha, run_id)
        if result.returncode or report.get("status") != "PASS_HOSTED_SELFTEST_EXE_ZIP_NOT_PERSONAL_SERVER_NOT_GUI":
            raise AssertionError(f"Original ZIP must pass ordinal manifest check: {result.stderr[-1600:]}, {report}")
        if report.get("verification_host") != "hosted-ci" or report.get("interactive_gui") != "NOT_RUN":
            raise AssertionError("Hosted verifier must never claim personal server or GUI acceptance")

        bad = root / "tampered"
        bad.mkdir()
        bad_zip = bad / source_zip.name
        with zipfile.ZipFile(source_zip, "r") as original, zipfile.ZipFile(bad_zip, "w") as modified:
            for member in original.infolist():
                data = original.read(member.filename)
                if member.filename == "Tikzarium-preview/MANIFEST.sha256":
                    if not data or data[0] not in b"0123456789abcdef":
                        raise AssertionError("Cannot construct negative manifest fixture")
                    data = (b"0" if data[:1] != b"0" else b"1") + data[1:]
                modified.writestr(member, data)
        # Deliberately update the outer audit hash. The inner MANIFEST still
        # MUST fail, even when the enclosing archive hash is self-consistent.
        audit = json.loads(source_audit.read_text(encoding="utf-8-sig"))
        audit["archive_sha256"] = hashlib.sha256(bad_zip.read_bytes()).hexdigest()
        (bad / source_audit.name).write_text(
            json.dumps(audit, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
        )
        denied, denied_report = run_stage(script, native, bad, root / "negative", sha, run_id)
        if denied.returncode == 0 or denied_report.get("status") != "FAIL_CARGO_FREE_ARTIFACT_VERIFICATION":
            raise AssertionError("Tampered member manifest was improperly accepted")
        if "ZIP member manifest SHA is invalid" not in denied_report.get("error", ""):
            raise AssertionError(f"Negative test failed at wrong gate: {denied_report}")
        print("PASS: original producer-sorted ZIP accepted by real PowerShell; "
              "tampered manifest rejected; hosted vs personal Server provenance distinct")


def main() -> None:
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument("--source-sha", required=True)
    p.add_argument("--run-id", required=True)
    p.add_argument("--native-root", type=Path, default=Path("."))
    p.add_argument("--portable-root", type=Path, default=Path(".qa-artifacts/windows-portable"))
    a = p.parse_args()
    if len(a.source_sha) != 40 or not a.run_id.isdecimal():
        p.error("Exact SHA and decimal CI run ID required")
    test_original_and_tampered_manifest(
        a.native_root.resolve(), a.portable_root.resolve(), a.source_sha, a.run_id
    )


if __name__ == "__main__":
    main()
