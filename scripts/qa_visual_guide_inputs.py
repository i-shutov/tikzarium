#!/usr/bin/env python3
"""Collect exact-head hosted GUI artifacts for the Visual Guide job.

The collector intentionally does not accept historical artifacts. The PGFPlots
matrix's original-v2 job can fail on retained source warnings; only its AT4 and v2-clean jobs are
required to succeed. No artifact bytes or signed download URLs are printed.
"""
from __future__ import annotations

import argparse
import hashlib
import json
import os
from pathlib import Path, PurePosixPath
import re
import shutil
import stat
import sys
import tempfile
import time
from typing import Any, Callable
import urllib.error
import urllib.parse
import urllib.request
import zipfile

API = "https://api.github.com"
MAX_ARTIFACT_BYTES = 512 * 1024 * 1024
MAX_MEMBER_BYTES = 512 * 1024 * 1024
MAX_TOTAL_UNCOMPRESSED = 1536 * 1024 * 1024
MAX_ZIP_MEMBERS = 20_000
MAX_COMPRESSION_RATIO = 1000
MAX_REDIRECTS = 5
POLL_DEADLINE_SECONDS = 300
POLL_INTERVAL_SECONDS = 5


class CollectionError(RuntimeError):
    """A required fresh CI input is missing or fails its provenance checks."""


WORKFLOWS = {
    "i61": {"file": "i61-b42-studio-x11.yml", "prefix": "i61-b42-source-pdf", "archive_root": "i61-evidence",
            "root": "i61/i61-evidence", "report": "report.json"},
    "compact": {"file": "sci-compact-native.yml", "prefix": "sci-compact-native", "archive_root": "sci-compact-native",
                "root": "compact/sci-compact-native", "report": "audit-report.json"},
}


def _sha(value: Any, label: str) -> str:
    if not isinstance(value, str) or not re.fullmatch(r"[0-9a-fA-F]{40}", value):
        raise CollectionError(f"{label} must be a 40-character hexadecimal SHA")
    return value.lower()


def _digest(value: Any, label: str) -> str:
    if not isinstance(value, str):
        raise CollectionError(f"{label} must be sha256:<64 hex>")
    match = re.fullmatch(r"sha256:([0-9a-fA-F]{64})", value)
    if not match:
        raise CollectionError(f"{label} must be sha256:<64 hex>")
    return match.group(1).lower()


def _safe_relative(value: str, label: str) -> PurePosixPath:
    if not isinstance(value, str) or not value or "\x00" in value or "\\" in value:
        raise CollectionError(f"unsafe {label}")
    if any(part in {"", ".", ".."} for part in value.split("/")):
        raise CollectionError(f"unsafe {label}")
    path = PurePosixPath(value)
    if path.is_absolute() or any(part in {"", ".", ".."} for part in path.parts) or re.match(r"^[A-Za-z]:", value):
        raise CollectionError(f"unsafe {label}")
    return path


def _safe_archive_members(zf: zipfile.ZipFile, expected_root: str,
                         allowed_roots: set[str] | None = None) -> list[tuple[zipfile.ZipInfo, PurePosixPath]]:
    infos = zf.infolist()
    if not infos or len(infos) > MAX_ZIP_MEMBERS:
        raise CollectionError("archive has an empty or excessive member inventory")
    expected_root_path = PurePosixPath(expected_root)
    allowed_roots = allowed_roots or {expected_root_path.name}
    seen: set[str] = set()
    files: set[str] = set()
    dirs: set[str] = set()
    total = 0
    safe: list[tuple[zipfile.ZipInfo, PurePosixPath]] = []
    for info in infos:
        name = info.filename
        if name.endswith("/"):
            name = name[:-1]
        rel = _safe_relative(name, "ZIP member path")
        if not rel.parts or rel.parts[0] not in allowed_roots:
            raise CollectionError("archive member does not match an observed producer prefix")
        canonical = rel.as_posix()
        if canonical in seen:
            raise CollectionError("archive contains duplicate member paths")
        seen.add(canonical)
        mode = (info.external_attr >> 16) & 0xFFFF
        file_type = stat.S_IFMT(mode)
        if file_type == stat.S_IFLNK or file_type not in {0, stat.S_IFREG, stat.S_IFDIR}:
            raise CollectionError("archive contains a link or special file")
        if info.file_size < 0 or info.file_size > MAX_MEMBER_BYTES:
            raise CollectionError("archive member exceeds the uncompressed size limit")
        if info.compress_size == 0 and info.file_size > 0:
            raise CollectionError("archive member has an impossible compression ratio")
        if info.compress_size > 0 and info.file_size / info.compress_size > MAX_COMPRESSION_RATIO:
            raise CollectionError("archive member exceeds the compression-ratio limit")
        total += info.file_size
        if total > MAX_TOTAL_UNCOMPRESSED:
            raise CollectionError("archive exceeds the total uncompressed size limit")
        (dirs if info.is_dir() else files).add(canonical)
        safe.append((info, rel))
    for name in files:
        parts = PurePosixPath(name).parts
        for i in range(1, len(parts)):
            parent = PurePosixPath(*parts[:i]).as_posix()
            if parent in files:
                raise CollectionError("archive file path conflicts with a parent directory")
    if not any(path.parts[0] == expected_root_path.name for _, path in safe):
        raise CollectionError("archive does not contain the required producer root")
    return safe


def _report_path_and_validate(root: Path, report_name: str, source_sha: str) -> tuple[dict[str, Any], str]:
    report_path = root / report_name
    if not report_path.is_file() or report_path.is_symlink():
        raise CollectionError(f"required artifact report is missing: {report_name}")
    try:
        report = json.loads(report_path.read_text(encoding="utf-8"))
    except (OSError, UnicodeError, json.JSONDecodeError):
        raise CollectionError(f"artifact report is not valid UTF-8 JSON: {report_name}") from None
    if not isinstance(report, dict):
        raise CollectionError(f"artifact report is not a JSON object: {report_name}")
    try:
        report_sha = _sha(report.get("source_head_sha"), f"{report_name} source_head_sha")
    except CollectionError:
        raise CollectionError(f"artifact report source_head_sha is invalid: {report_name}") from None
    if report_sha != source_sha:
        raise CollectionError(f"artifact report source_head_sha does not match the requested source head: {report_name}")
    app_tree_sha = _sha(report.get("app_tree_sha"), f"{report_name} app_tree_sha")
    files = report.get("files")
    if not isinstance(files, dict) or not files:
        raise CollectionError(f"artifact report has no files hash inventory: {report_name}")
    expected = set()
    for rel_text, expected_hash in files.items():
        rel = _safe_relative(rel_text, "report files path")
        if not re.fullmatch(r"[0-9a-fA-F]{64}", expected_hash if isinstance(expected_hash, str) else ""):
            raise CollectionError(f"artifact report contains an invalid file SHA-256: {report_name}")
        file_path = root.joinpath(*rel.parts)
        if not file_path.is_file() or file_path.is_symlink():
            raise CollectionError(f"artifact report lists a missing or unsafe file: {rel_text}")
        digest = hashlib.sha256()
        with file_path.open("rb") as stream:
            for block in iter(lambda: stream.read(1024 * 1024), b""):
                digest.update(block)
        if digest.hexdigest() != expected_hash.lower():
            raise CollectionError(f"artifact file hash mismatch: {rel_text}")
        expected.add(rel.as_posix())
    actual = {p.relative_to(root).as_posix() for p in root.rglob("*") if p.is_file() and p != report_path}
    if actual != expected:
        raise CollectionError(f"artifact files inventory disagrees with report: {report_name}")
    return report, app_tree_sha


class _NoRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, req: urllib.request.Request, fp: Any, code: int, msg: str,
                         headers: Any, newurl: str) -> None:
        return None


class GitHubClient:
    """Small stdlib REST client; signed artifact URLs never receive the token."""

    def __init__(self, token: str, timeout: float = 30.0):
        self._token = token
        self._timeout = timeout
        self._api_opener = urllib.request.build_opener(_NoRedirect)
        self._plain_opener = urllib.request.build_opener(_NoRedirect)

    def get_json(self, path: str) -> dict[str, Any]:
        url = API + path
        request = urllib.request.Request(url, headers={
            "Authorization": f"Bearer {self._token}",
            "Accept": "application/vnd.github+json",
            "X-GitHub-Api-Version": "2022-11-28",
            "User-Agent": "tikzarium-visual-guide-input-collector",
        })
        try:
            with self._api_opener.open(request, timeout=self._timeout) as response:
                data = json.load(response)
        except urllib.error.HTTPError as error:
            raise CollectionError(f"GitHub API request failed with HTTP {error.code} for {path}") from None
        except (urllib.error.URLError, TimeoutError, OSError, json.JSONDecodeError):
            raise CollectionError(f"GitHub API request failed for {path}") from None
        if not isinstance(data, dict):
            raise CollectionError(f"GitHub API response was not an object for {path}")
        return data

    def get_bytes(self, url: str, limit: int) -> bytes:
        parsed = urllib.parse.urlparse(url)
        if parsed.scheme != "https" or parsed.netloc != "api.github.com" or not re.fullmatch(r"/repos/[A-Za-z0-9_.-]+/[A-Za-z0-9_.-]+/actions/artifacts/[0-9]+/zip", parsed.path):
            raise CollectionError("artifact API download URL is invalid")
        api_request = urllib.request.Request(url, headers={
            "Authorization": f"Bearer {self._token}",
            "Accept": "application/vnd.github+json",
            "X-GitHub-Api-Version": "2022-11-28",
            "User-Agent": "tikzarium-visual-guide-input-collector",
        })
        try:
            api_response = self._api_opener.open(api_request, timeout=self._timeout)
        except urllib.error.HTTPError as error:
            if error.code not in {301, 302, 303, 307, 308} or not error.headers.get("Location"):
                raise CollectionError(f"artifact API download failed with HTTP {error.code}") from None
            current = urllib.parse.urljoin(url, error.headers["Location"])
        except (urllib.error.URLError, TimeoutError, OSError):
            raise CollectionError("artifact API download request failed") from None
        else:
            with api_response:
                return self._read_bounded(api_response, limit)
        first_location = urllib.parse.urlparse(current)
        if first_location.scheme != "https" or not first_location.netloc:
            raise CollectionError("artifact redirect target is not HTTPS")
        return self._get_unauthenticated_bytes(current, limit)

    @staticmethod
    def _read_bounded(response: Any, limit: int) -> bytes:
        chunks = []
        size = 0
        while True:
            block = response.read(min(1024 * 1024, limit + 1 - size))
            if not block:
                break
            size += len(block)
            if size > limit:
                raise CollectionError("artifact download exceeds the byte limit")
            chunks.append(block)
        return b"".join(chunks)

    def _get_unauthenticated_bytes(self, url: str, limit: int) -> bytes:
        current = url
        for redirect_count in range(MAX_REDIRECTS + 1):
            # No Authorization header is set on any archive URL request.
            request = urllib.request.Request(current, headers={"User-Agent": "tikzarium-visual-guide-input-collector"})
            try:
                response = self._plain_opener.open(request, timeout=self._timeout)
            except urllib.error.HTTPError as error:
                if error.code in {301, 302, 303, 307, 308} and error.headers.get("Location"):
                    if redirect_count >= MAX_REDIRECTS:
                        raise CollectionError("artifact download exceeded redirect limit") from None
                    current = urllib.parse.urljoin(current, error.headers["Location"])
                    next_url = urllib.parse.urlparse(current)
                    if next_url.scheme != "https" or not next_url.netloc:
                        raise CollectionError("artifact redirect target is not HTTPS") from None
                    continue
                raise CollectionError(f"artifact download failed with HTTP {error.code}") from None
            except (urllib.error.URLError, TimeoutError, OSError):
                raise CollectionError("artifact download failed") from None
            with response:
                return self._read_bounded(response, limit)
        raise CollectionError("artifact download exceeded redirect limit")


def _api_repo(owner: str, repo: str) -> str:
    if not re.fullmatch(r"[A-Za-z0-9_.-]+", owner) or not re.fullmatch(r"[A-Za-z0-9_.-]+", repo):
        raise CollectionError("owner and repository must be simple GitHub path components")
    return f"/repos/{owner}/{repo}"


def _check_run_path(run: dict[str, Any], expected_file: str, source_sha: str) -> None:
    try:
        run_sha = _sha(run.get("head_sha"), "workflow run head_sha")
    except CollectionError:
        raise CollectionError("workflow run has an invalid head SHA") from None
    if run_sha != source_sha:
        raise CollectionError("workflow run does not target the requested source head")
    path = run.get("path")
    if not isinstance(path, str) or PurePosixPath(path).name != expected_file:
        raise CollectionError(f"workflow run is not from the expected workflow file: {expected_file}")


def _latest_workflow_run(client: GitHubClient, repo_api: str, workflow_file: str, source_sha: str,
                         monotonic: Callable[[], float], sleep: Callable[[float], None],
                         poll_deadline: float) -> dict[str, Any]:
    quoted = urllib.parse.quote(workflow_file, safe="")
    response = client.get_json(f"{repo_api}/actions/workflows/{quoted}/runs?head_sha={source_sha}&per_page=100")
    runs = response.get("workflow_runs")
    if not isinstance(runs, list):
        raise CollectionError(f"workflow run listing is malformed for {workflow_file}")
    matching = [run for run in runs if isinstance(run, dict) and run.get("head_sha", "").lower() == source_sha]
    if not matching:
        raise CollectionError(f"no workflow run exists at the requested head for {workflow_file}")
    matching.sort(key=lambda r: (r.get("run_number", 0), r.get("run_attempt", 0), r.get("created_at", "")), reverse=True)
    run = matching[0]
    run_id = run.get("id")
    if not isinstance(run_id, int) or run_id <= 0:
        raise CollectionError("workflow run id is invalid")
    deadline = monotonic() + poll_deadline
    while run.get("status") != "completed":
        if run.get("status") not in {"queued", "in_progress", "waiting", "requested", "pending"}:
            raise CollectionError(f"workflow run entered unexpected status for {workflow_file}")
        if monotonic() >= deadline:
            raise CollectionError(f"workflow did not finish before the bounded deadline: {workflow_file}")
        sleep(min(POLL_INTERVAL_SECONDS, max(0.0, deadline - monotonic())))
        run = client.get_json(f"{repo_api}/actions/runs/{run_id}")
        _check_run_path(run, workflow_file, source_sha)
    _check_run_path(run, workflow_file, source_sha)
    if run.get("conclusion") != "success":
        raise CollectionError(f"workflow run did not conclude success: {workflow_file}")
    return run


def _artifact_for(client: GitHubClient, repo_api: str, run: dict[str, Any], name_prefix: str,
                  source_sha: str, attempt_suffix: bool = True) -> dict[str, Any]:
    run_id = run["id"]
    result = client.get_json(f"{repo_api}/actions/runs/{run_id}/artifacts?per_page=100")
    artifacts = result.get("artifacts")
    if not isinstance(artifacts, list):
        raise CollectionError("artifact listing is malformed")
    expected_name = f"{name_prefix}-{run_id}"
    if attempt_suffix:
        attempt = run.get("run_attempt")
        if not isinstance(attempt, int) or attempt <= 0:
            raise CollectionError("workflow run attempt is invalid")
        expected_name += f"-{attempt}"
    matches = [a for a in artifacts if isinstance(a, dict) and a.get("name") == expected_name]
    if len(matches) != 1:
        raise CollectionError(f"expected exactly one artifact named {expected_name}; found {len(matches)}")
    artifact = matches[0]
    if artifact.get("expired") is not False:
        raise CollectionError(f"artifact is expired or has unknown expiry for run {run_id}")
    if not isinstance(artifact.get("id"), int) or artifact.get("id") <= 0:
        raise CollectionError("artifact id is invalid")
    size = artifact.get("size_in_bytes")
    if not isinstance(size, int) or size <= 0 or size >= MAX_ARTIFACT_BYTES:
        raise CollectionError("artifact size must be positive and below 512 MiB")
    digest = _digest(artifact.get("digest"), "artifact digest")
    workflow_run = artifact.get("workflow_run")
    try:
        artifact_head_sha = _sha(workflow_run.get("head_sha"), "artifact head_sha") if isinstance(workflow_run, dict) else ""
    except CollectionError:
        artifact_head_sha = ""
    if not isinstance(workflow_run, dict) or workflow_run.get("id") != run_id or artifact_head_sha != source_sha:
        raise CollectionError("artifact metadata is not bound to the expected run and source head")
    url = artifact.get("archive_download_url")
    expected_url = f"{API}{repo_api}/actions/artifacts/{artifact['id']}/zip"
    if not isinstance(url, str) or url != expected_url:
        raise CollectionError("artifact API download URL is invalid")
    return {"id": artifact["id"], "name": artifact["name"], "size": size,
            "digest": digest, "download_url": url}


def _download_and_extract(client: GitHubClient, artifact: dict[str, Any], destination: Path,
                          expected_archive_root: str, report_name: str, source_sha: str,
                          allowed_roots: set[str]) -> tuple[dict[str, Any], str, int, str]:
    data = client.get_bytes(artifact["download_url"], MAX_ARTIFACT_BYTES)
    if len(data) != artifact["size"]:
        raise CollectionError("downloaded artifact size does not match GitHub metadata")
    archive_sha = hashlib.sha256(data).hexdigest()
    if archive_sha != artifact["digest"]:
        raise CollectionError("downloaded artifact SHA-256 does not match GitHub digest")
    destination.mkdir(parents=True, exist_ok=False)
    try:
        with tempfile.SpooledTemporaryFile(max_size=16 * 1024 * 1024) as archive_file:
            archive_file.write(data)
            archive_file.seek(0)
            with zipfile.ZipFile(archive_file, "r") as zf:
                safe_members = _safe_archive_members(zf, expected_archive_root, allowed_roots)
                bad_member = zf.testzip()
                if bad_member is not None:
                    raise CollectionError("artifact ZIP member CRC validation failed")
                extracted_paths: set[str] = set()
                for info, rel in safe_members:
                    target = destination.joinpath(*rel.parts)
                    if info.is_dir():
                        target.mkdir(parents=True, exist_ok=True)
                        continue
                    target.parent.mkdir(parents=True, exist_ok=True)
                    with zf.open(info, "r") as src, target.open("xb") as dst:
                        shutil.copyfileobj(src, dst, 1024 * 1024)
                    extracted_paths.add(rel.as_posix())
                root = destination / expected_archive_root
                report, app_tree_sha = _report_path_and_validate(root, report_name, source_sha)
                expected_paths = {f"{expected_archive_root}/{p}" for p in report["files"]}
                expected_paths.add(f"{expected_archive_root}/{report_name}")
                required_actual = {p for p in extracted_paths if p.startswith(expected_archive_root + "/")}
                if required_actual != expected_paths:
                    raise CollectionError("ZIP member inventory does not match producer report.files inventory")
    except (zipfile.BadZipFile, RuntimeError, OSError) as error:
        shutil.rmtree(destination, ignore_errors=True)
        if isinstance(error, CollectionError):
            raise
        raise CollectionError("artifact ZIP could not be safely verified and extracted") from None
    except CollectionError:
        shutil.rmtree(destination, ignore_errors=True)
        raise
    return report, app_tree_sha, len(safe_members), archive_sha


def _require_pgf_matrix(client: GitHubClient, repo_api: str, pgf_run_id: int, source_sha: str) -> dict[str, Any]:
    run = client.get_json(f"{repo_api}/actions/runs/{pgf_run_id}")
    _check_run_path(run, "pgfplots-native.yml", source_sha)
    if run.get("status") not in {"in_progress", "completed"}:
        raise CollectionError("PGFPlots run is not active or completed")
    jobs_data = client.get_json(f"{repo_api}/actions/runs/{pgf_run_id}/jobs?per_page=100")
    jobs = jobs_data.get("jobs")
    if not isinstance(jobs, list):
        raise CollectionError("PGFPlots jobs response is malformed")
    for expected in ("PGFPlots native at4", "PGFPlots native v2-clean"):
        matching = [job for job in jobs if isinstance(job, dict) and job.get("name") == expected]
        if len(matching) != 1 or matching[0].get("status") != "completed" or matching[0].get("conclusion") != "success":
            raise CollectionError(f"required PGFPlots matrix job is not completed successfully: {expected}")
    return run


def _write_json(path: Path, value: dict[str, Any]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    temp = path.with_suffix(path.suffix + ".tmp")
    temp.write_text(json.dumps(value, indent=2, sort_keys=True) + "\n", encoding="utf-8")
    os.replace(temp, path)


def collect_inputs(owner: str, repo: str, source_sha: str, pgf_run_id: int, out: Path,
                   client: Any | None = None, monotonic: Callable[[], float] = time.monotonic,
                   sleep: Callable[[float], None] = time.sleep, poll_deadline: float = POLL_DEADLINE_SECONDS) -> dict[str, Any]:
    source_sha = _sha(source_sha, "source SHA")
    if not isinstance(pgf_run_id, int) or pgf_run_id <= 0:
        raise CollectionError("PGFPlots run id must be a positive integer")
    if not isinstance(poll_deadline, (int, float)) or not 0 <= poll_deadline <= POLL_DEADLINE_SECONDS:
        raise CollectionError("poll deadline must be between 0 and 300 seconds")
    out = Path(out)
    if not out.is_absolute():
        raise CollectionError("--out must be an absolute path")
    if out.is_symlink() or (out.exists() and (not out.is_dir() or any(out.iterdir()))):
        raise CollectionError("--out must be a nonexistent path or an empty directory")
    out.parent.mkdir(parents=True, exist_ok=True)
    repo_api = _api_repo(owner, repo)
    if client is None:
        token = os.environ.get("GITHUB_TOKEN", "")
        if not token:
            raise CollectionError("GITHUB_TOKEN environment variable is required")
        client = GitHubClient(token)

    stage = Path(tempfile.mkdtemp(prefix=f".{out.name}.stage-", dir=out.parent))
    try:
        pgf_run = _require_pgf_matrix(client, repo_api, pgf_run_id, source_sha)
        pgf_run_url = pgf_run.get("html_url")
        if not isinstance(pgf_run_url, str):
            raise CollectionError("PGFPlots run has no HTML URL")
        other_runs = {}
        for key, config in WORKFLOWS.items():
            other_runs[key] = _latest_workflow_run(client, repo_api, config["file"], source_sha, monotonic, sleep, poll_deadline)

        specs = {
            "at4": {"run": pgf_run, "name_prefix": "pgfplots-native-at4", "archive_root": "pgfplots-native",
                    "allowed_roots": {"pgfplots-native", "pgfplots-native-logs", "pgfplots-build-provenance.json", "at4-original-references"},
                    "root": "at4/pgfplots-native", "report": "report.json", "run_url": pgf_run_url},
            "v2-clean": {"run": pgf_run, "name_prefix": "pgfplots-native-v2-clean", "archive_root": "pgfplots-native",
                         "allowed_roots": {"pgfplots-native", "pgfplots-native-logs", "pgfplots-build-provenance.json", "pgfplots-clean-isolation"},
                         "root": "v2-clean/pgfplots-native", "report": "report.json", "run_url": pgf_run_url},
            "compact": {"run": other_runs["compact"], "name_prefix": "sci-compact-native", "archive_root": "sci-compact-native",
                        "allowed_roots": {"sci-compact-native", "sci-compact-native-logs", "sci-build-provenance.json"},
                        "root": "compact/sci-compact-native", "report": "audit-report.json", "run_url": other_runs["compact"]["html_url"]},
            "i61": {"run": other_runs["i61"], "name_prefix": "i61-b42-source-pdf", "archive_root": "i61-evidence",
                    "allowed_roots": {"i61-evidence", "i61-build", "n2-evidence"},
                    "root": "i61/i61-evidence", "report": "report.json", "run_url": other_runs["i61"]["html_url"]},
        }
        sets: dict[str, Any] = {}
        app_tree_shas: set[str] = set()
        for key in ("at4", "v2-clean", "compact", "i61"):
            spec = specs[key]
            run = spec["run"]
            _check_run_path(run, "pgfplots-native.yml" if key in {"at4", "v2-clean"} else WORKFLOWS["i61" if key == "i61" else "compact"]["file"], source_sha)
            artifact = _artifact_for(client, repo_api, run, spec["name_prefix"], source_sha,
                                     attempt_suffix=(key != "i61"))
            destination = stage.joinpath(*PurePosixPath(spec["root"]).parts[:-1])
            report, app_tree_sha, member_count, archive_sha = _download_and_extract(
                client, artifact, destination, spec["archive_root"], spec["report"], source_sha, spec["allowed_roots"])
            app_tree_shas.add(app_tree_sha)
            artifact_run_url = spec["run_url"]
            host = report.get("host")
            host_record = spec["report"]
            if not host and key == "compact" and "driver-report.json" in report["files"]:
                # The compact audit hashes the original driver's report; that
                # source-bound report owns the actual platform description.
                driver = json.loads((destination / spec["archive_root"] / "driver-report.json").read_text())
                if driver.get("source_head_sha") != source_sha or driver.get("app_tree_sha") != app_tree_sha:
                    raise CollectionError("compact host metadata belongs to a different source")
                host = driver.get("host")
                host_record = "driver-report.json"
            sets[key] = {"root": spec["root"], "report": spec["report"], "source_head_sha": source_sha,
                         "app_tree_sha": app_tree_sha, "run_id": run["id"], "run_url": artifact_run_url,
                         "artifact_id": artifact["id"], "artifact_sha256": archive_sha,
                         "host": host or "NOT_RECORDED", "host_record": host_record,
                         "checkpoint": f"HOSTED_GUI / {key}"}
            receipt = {"set": key, "source_head_sha": source_sha, "run_id": run["id"],
                       "run_url": artifact_run_url, "artifact_id": artifact["id"],
                       "artifact_name": artifact["name"], "artifact_size": artifact["size"],
                       "artifact_sha256": archive_sha, "zip_crc": "PASS", "zip_member_count": member_count,
                       "files_inventory": len(report["files"]), "app_tree_sha": app_tree_sha}
            _write_json(stage / "receipts" / f"{key}.json", receipt)
        if len(app_tree_shas) != 1:
            raise CollectionError("source-bound artifacts disagree on app_tree_sha")
        index = {"schema_version": 1, "source_head_sha": source_sha, "sets": sets}
        _write_json(stage / "evidence-index.json", index)
        if out.exists():
            out.rmdir()
        os.replace(stage, out)
        return index
    except Exception:
        shutil.rmtree(stage, ignore_errors=True)
        raise


def _parse_args(argv: list[str] | None = None) -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--repository", required=True, help="GitHub owner/repository")
    parser.add_argument("--source-sha", required=True, help="exact 40-character source commit SHA")
    parser.add_argument("--pgf-run-id", required=True, type=int, help="current PGFPlots workflow run id")
    parser.add_argument("--out", required=True, help="absolute output directory")
    args = parser.parse_args(argv)
    if args.repository.count("/") != 1:
        parser.error("--repository must be owner/repository")
    args.owner, args.repo = args.repository.split("/", 1)
    if not Path(args.out).is_absolute():
        parser.error("--out must be an absolute path")
    return args


def main(argv: list[str] | None = None) -> int:
    args = _parse_args(argv)
    try:
        index = collect_inputs(args.owner, args.repo, args.source_sha, args.pgf_run_id, Path(args.out))
    except CollectionError as error:
        print(f"visual guide input collection failed: {error}", file=sys.stderr)
        return 2
    print(json.dumps({"status": "PASS_INPUTS_COLLECTED", "evidence_index": str(Path(args.out) / "evidence-index.json"),
                      "source_head_sha": index["source_head_sha"], "sets": sorted(index["sets"])}))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
