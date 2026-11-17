"""Offline contract tests for the Visual Guide CI artifact collector."""
from __future__ import annotations

import hashlib
import importlib.util
import io
import json
from email.message import Message
from pathlib import Path
import tempfile
import unittest
import urllib.error
import zipfile

HERE = Path(__file__).resolve().parent
SPEC = importlib.util.spec_from_file_location("qa_visual_guide_inputs", HERE / "qa_visual_guide_inputs.py")
qa = importlib.util.module_from_spec(SPEC)
assert SPEC.loader is not None
SPEC.loader.exec_module(qa)

HEAD = "1234567890abcdef1234567890abcdef12345678"
TREE = "abcdef1234567890abcdef1234567890abcdef12"
APP = "i-shutov/tikzarium"


def make_zip(root: str, report_name: str, source_sha: str = HEAD, *, traversal: bool = False,
             siblings: tuple[str, ...] = ()) -> bytes:
    payload = b"evidence bytes for verification\n"
    report = {"source_head_sha": source_sha, "app_tree_sha": TREE, "files": {"proof.txt": hashlib.sha256(payload).hexdigest()}}
    stream = io.BytesIO()
    with zipfile.ZipFile(stream, "w", zipfile.ZIP_DEFLATED) as zf:
        zf.writestr(f"{root}/{report_name}", json.dumps(report))
        zf.writestr(f"{root}/proof.txt", payload)
        for sibling in siblings:
            if sibling.endswith(".json"):
                zf.writestr(sibling, json.dumps({"producer": "fixture"}))
            else:
                zf.writestr(f"{sibling}/producer.log", b"sidecar evidence\n")
        if traversal:
            zf.writestr(f"{root}/../escape.txt", b"escape")
    return stream.getvalue()


class FakeGitHub:
    def __init__(self, *, wrong_report_head: bool = False, bad_digest: bool = False,
                 traversal: bool = False, duplicate_artifact: bool = False, latest_i61_failure: bool = False):
        self.pgf_id, self.i61_id, self.compact_id = 101, 201, 301
        self.runs = {
            self.pgf_id: self._run(self.pgf_id, "pgfplots-native.yml", "in_progress"),
            self.i61_id: self._run(self.i61_id, "i61-b42-studio-x11.yml", "completed", "success"),
            self.compact_id: self._run(self.compact_id, "sci-compact-native.yml", "completed", "success"),
        }
        if latest_i61_failure:
            self.runs[self.i61_id] = self._run(self.i61_id, "i61-b42-studio-x11.yml", "completed", "failure")
        self.runs[self.i61_id]["run_number"] = 9
        self.runs[self.i61_id]["run_attempt"] = 1
        self.runs[self.i61_id]["created_at"] = "2026-11-17T12:00:00Z"
        self.payloads: dict[int, bytes] = {}
        self.artifacts: dict[int, list[dict]] = {}
        specs = [
            (self.pgf_id, "pgfplots-native-at4", "pgfplots-native", "report.json"),
            (self.pgf_id, "pgfplots-native-v2-clean", "pgfplots-native", "report.json"),
            (self.i61_id, "i61-b42-source-pdf", "i61-evidence", "report.json"),
            (self.compact_id, "sci-compact-native", "sci-compact-native", "audit-report.json"),
        ]
        next_id = 700
        for run_id, prefix, root, report in specs:
            source = "0" * 40 if wrong_report_head and prefix == "pgfplots-native-at4" else HEAD
            sidecars = {
                "pgfplots-native-at4": ("pgfplots-native-logs", "pgfplots-build-provenance.json", "at4-original-references"),
                "pgfplots-native-v2-clean": ("pgfplots-native-logs", "pgfplots-build-provenance.json", "pgfplots-clean-isolation"),
                "i61-b42-source-pdf": ("i61-build", "n2-evidence"),
                "sci-compact-native": ("sci-compact-native-logs", "sci-build-provenance.json"),
            }[prefix]
            data = make_zip(root, report, source, traversal=traversal and prefix == "pgfplots-native-at4", siblings=sidecars)
            artifact_id = next_id
            next_id += 1
            digest = "0" * 64 if bad_digest and prefix == "pgfplots-native-at4" else hashlib.sha256(data).hexdigest()
            artifact_name = f"{prefix}-{run_id}" if prefix == "i61-b42-source-pdf" else f"{prefix}-{run_id}-1"
            artifact = {"id": artifact_id, "name": artifact_name, "size_in_bytes": len(data),
                        "digest": f"sha256:{digest}", "expired": False,
                        "archive_download_url": f"https://api.github.com/repos/{APP}/actions/artifacts/{artifact_id}/zip",
                        "workflow_run": {"id": run_id, "head_sha": HEAD}}
            self.payloads[artifact_id] = data
            self.artifacts.setdefault(run_id, []).append(artifact)
        if duplicate_artifact:
            self.artifacts[self.pgf_id].append(dict(self.artifacts[self.pgf_id][0], id=999, name=f"pgfplots-native-at4-{self.pgf_id}-1"))
            self.payloads[999] = self.payloads[self.artifacts[self.pgf_id][0]["id"]]

    @staticmethod
    def _run(run_id, filename, status, conclusion=None):
        result = {"id": run_id, "run_number": run_id, "run_attempt": 1, "created_at": "2026-11-17T10:00:00Z",
                  "path": f".github/workflows/{filename}", "head_sha": HEAD, "status": status,
                  "html_url": f"https://github.com/{APP}/actions/runs/{run_id}"}
        if conclusion is not None:
            result["conclusion"] = conclusion
        return result

    def get_json(self, path):
        base = f"/repos/{APP}"
        if path.startswith(base + "/actions/workflows/"):
            filename = path.split("/actions/workflows/", 1)[1].split("/runs?", 1)[0]
            run_id = self.i61_id if filename == "i61-b42-studio-x11.yml" else self.compact_id
            return {"workflow_runs": [self.runs[run_id]]}
        if path == f"{base}/actions/runs/{self.pgf_id}":
            return self.runs[self.pgf_id]
        if path == f"{base}/actions/runs/{self.i61_id}":
            return self.runs[self.i61_id]
        if path == f"{base}/actions/runs/{self.compact_id}":
            return self.runs[self.compact_id]
        if path == f"{base}/actions/runs/{self.pgf_id}/jobs?per_page=100":
            return {"jobs": [{"name": "PGFPlots native at4", "status": "completed", "conclusion": "success"},
                              {"name": "PGFPlots native v2-clean", "status": "completed", "conclusion": "success"},
                              {"name": "PGFPlots native v2", "status": "completed", "conclusion": "failure"}]}
        for run_id, artifacts in self.artifacts.items():
            if path == f"{base}/actions/runs/{run_id}/artifacts?per_page=100":
                return {"artifacts": artifacts}
        if path.startswith(base + "/actions/runs/") and path.endswith("/artifacts?per_page=100"):
            return {"artifacts": []}
        raise AssertionError(f"unexpected API path {path}")

    def get_bytes(self, url, limit):
        artifact_id = int(url.split("/artifacts/")[1].split("/")[0])
        return self.payloads[artifact_id]


class RedirectThenBytes:
    def __init__(self, redirect_location, payload):
        self.redirect_location = redirect_location
        self.payload = payload
        self.calls = []

    def open(self, request, timeout):
        self.calls.append(request)
        if len(self.calls) == 1 and self.redirect_location is not None:
            headers = Message()
            headers["Location"] = self.redirect_location
            raise urllib.error.HTTPError(request.full_url, 302, "Found", headers, io.BytesIO())
        return io.BytesIO(self.payload)


class VisualGuideInputCollectorTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.out = Path(self.temp.name) / "guide-inputs"

    def tearDown(self):
        self.temp.cleanup()

    def collect(self, client):
        return qa.collect_inputs("i-shutov", "tikzarium", HEAD, 101, self.out, client=client)

    def test_collects_four_exact_head_verified_sets_and_receipts(self):
        index = self.collect(FakeGitHub())
        self.assertEqual(index["schema_version"], 1)
        self.assertEqual(index["source_head_sha"], HEAD)
        self.assertEqual(set(index["sets"]), {"at4", "v2-clean", "compact", "i61"})
        self.assertEqual(index["sets"]["at4"]["root"], "at4/pgfplots-native")
        self.assertEqual(index["sets"]["v2-clean"]["root"], "v2-clean/pgfplots-native")
        self.assertEqual(index["sets"]["compact"]["report"], "audit-report.json")
        self.assertEqual({v["app_tree_sha"] for v in index["sets"].values()}, {TREE})
        self.assertTrue((self.out / "evidence-index.json").is_file())
        self.assertTrue((self.out / "receipts/at4.json").is_file())
        self.assertTrue((self.out / "at4/pgfplots-native/proof.txt").is_file())
        self.assertFalse(any(p.suffix == ".zip" for p in self.out.rglob("*")))

    def test_rejects_wrong_report_head_and_cleans_staging_output(self):
        with self.assertRaisesRegex(qa.CollectionError, "source_head_sha"):
            self.collect(FakeGitHub(wrong_report_head=True))
        self.assertFalse(self.out.exists())

    def test_rejects_artifact_digest_mismatch(self):
        with self.assertRaisesRegex(qa.CollectionError, "SHA-256"):
            self.collect(FakeGitHub(bad_digest=True))
        self.assertFalse(self.out.exists())

    def test_rejects_zip_path_traversal_before_extract(self):
        with self.assertRaisesRegex(qa.CollectionError, "unsafe ZIP member path"):
            self.collect(FakeGitHub(traversal=True))
        self.assertFalse((Path(self.temp.name) / "escape.txt").exists())
        self.assertFalse(self.out.exists())

    def test_rejects_duplicate_matching_artifacts(self):
        with self.assertRaisesRegex(qa.CollectionError, "exactly one artifact"):
            self.collect(FakeGitHub(duplicate_artifact=True))
        self.assertFalse(self.out.exists())

    def test_rejects_failed_latest_workflow_without_historical_fallback(self):
        client = FakeGitHub(latest_i61_failure=True)
        # A successful older run at the same SHA must not become a fallback.
        client.runs[199] = FakeGitHub._run(199, "i61-b42-studio-x11.yml", "completed", "success")
        client.runs[199]["run_number"] = 1
        client.runs[199]["created_at"] = "2026-11-16T10:00:00Z"
        original_get_json = client.get_json
        def listing_with_old_and_failed(path):
            if "/actions/workflows/i61-b42-studio-x11.yml/runs?" in path:
                return {"workflow_runs": [client.runs[201], client.runs[199]]}
            return original_get_json(path)
        client.get_json = listing_with_old_and_failed
        with self.assertRaisesRegex(qa.CollectionError, "did not conclude success"):
            self.collect(client)

    def test_rejects_invalid_sha_and_relative_output(self):
        with self.assertRaises(qa.CollectionError):
            qa.collect_inputs("i-shutov", "tikzarium", "not-a-sha", 101, self.out, client=FakeGitHub())
        with self.assertRaisesRegex(qa.CollectionError, "absolute"):
            qa.collect_inputs("i-shutov", "tikzarium", HEAD, 101, Path("relative"), client=FakeGitHub())

    def test_safe_zip_paths_reject_duplicate_members_and_symlinks(self):
        stream = io.BytesIO()
        with zipfile.ZipFile(stream, "w") as zf:
            zf.writestr("pgfplots-native/a.txt", b"a")
            zf.writestr("pgfplots-native/a.txt", b"b")
        with zipfile.ZipFile(io.BytesIO(stream.getvalue())) as zf:
            with self.assertRaisesRegex(qa.CollectionError, "duplicate"):
                qa._safe_archive_members(zf, "pgfplots-native")
        symlink_stream = io.BytesIO()
        with zipfile.ZipFile(symlink_stream, "w") as zf:
            info = zipfile.ZipInfo("pgfplots-native/link")
            info.create_system = 3
            info.external_attr = (0o120777 << 16)
            zf.writestr(info, "../../outside")
        with zipfile.ZipFile(io.BytesIO(symlink_stream.getvalue())) as zf:
            with self.assertRaisesRegex(qa.CollectionError, "link or special"):
                qa._safe_archive_members(zf, "pgfplots-native")
        with self.assertRaisesRegex(qa.CollectionError, "unsafe"):
            qa._safe_relative("pgfplots-native/./hidden", "test path")

    def test_artifact_selection_ignores_stale_run_attempts(self):
        client = FakeGitHub()
        run = client.runs[client.pgf_id]
        client.artifacts[client.pgf_id][0]["name"] = f"pgfplots-native-at4-{client.pgf_id}-0"
        with self.assertRaisesRegex(qa.CollectionError, "expected exactly one artifact named"):
            qa._artifact_for(client, "/repos/i-shutov/tikzarium", run, "pgfplots-native-at4", HEAD)

    def test_download_authenticates_only_exact_github_api_request(self):
        client = qa.GitHubClient("secret-token")
        api = RedirectThenBytes("https://signed.example/archive?sig=hidden", b"")
        storage = RedirectThenBytes("https://cdn.example/final.zip", b"archive")
        client._api_opener = api
        client._plain_opener = storage
        result = client.get_bytes(f"https://api.github.com/repos/{APP}/actions/artifacts/77/zip", 100)
        self.assertEqual(result, b"archive")
        self.assertEqual(api.calls[0].get_header("Authorization"), "Bearer secret-token")
        self.assertEqual(len(storage.calls), 2)
        self.assertTrue(all(request.get_header("Authorization") is None for request in storage.calls))

    def test_rejects_insecure_artifact_redirect_without_forwarding_token(self):
        client = qa.GitHubClient("secret-token")
        api = RedirectThenBytes("http://unsafe.example/archive", b"")
        storage = RedirectThenBytes(None, b"not-used")
        client._api_opener = api
        client._plain_opener = storage
        with self.assertRaisesRegex(qa.CollectionError, "not HTTPS"):
            client.get_bytes(f"https://api.github.com/repos/{APP}/actions/artifacts/77/zip", 100)
        self.assertEqual(api.calls[0].get_header("Authorization"), "Bearer secret-token")
        self.assertEqual(storage.calls, [])


if __name__ == "__main__":
    unittest.main(verbosity=2)
