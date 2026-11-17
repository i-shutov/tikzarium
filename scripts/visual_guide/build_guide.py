#!/usr/bin/env python3
"""Generate a source-linked XeLaTeX visual guide from a declarative screenshot manifest.

Evidence PNGs are copied byte-for-byte. No screenshot pixels are altered. The TeX
source may use PDF clipping for optional details; this initial template uses full
screens only. Example: python build_guide.py --evidence-root /tmp/artifacts \
  --map cp08=validation/cp08/native-extracted --source-sha <sha> --run-url <url>
"""
from __future__ import annotations

import argparse
import hashlib
import html
import json
import math
import re
import struct
import shutil
from pathlib import Path


def tex_text(value: str) -> str:
    replacements = {"\\": r"\textbackslash{}", "&": r"\&", "%": r"\%", "$": r"\$",
                    "#": r"\#", "_": r"\_", "{": r"\{", "}": r"\}",
                    "~": r"\textasciitilde{}", "^": r"\textasciicircum{}"}
    return "".join(replacements.get(ch, ch) for ch in value)


def confined(base: Path, relative: str, context: str) -> Path:
    candidate = Path(relative)
    if candidate.is_absolute():
        raise ValueError(f"Absolute path forbidden for {context}: {relative}")
    result = (base / candidate).resolve()
    if not result.is_relative_to(base.resolve()):
        raise ValueError(f"Path escapes its evidence root for {context}: {relative}")
    return result


def file_sha(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as stream:
        for block in iter(lambda: stream.read(1024 * 1024), b""):
            digest.update(block)
    return digest.hexdigest()


def png_dimensions(path: Path) -> tuple[int, int] | None:
    with path.open("rb") as stream:
        header = stream.read(24)
    if header[:8] != b"\x89PNG\r\n\x1a\n" or header[12:16] != b"IHDR":
        return None
    return struct.unpack(">II", header[16:24])


def png_has_phys_chunk(path: Path) -> bool:
    """Return whether a PNG declares physical pixel density."""
    with path.open("rb") as stream:
        if stream.read(8) != b"\x89PNG\r\n\x1a\n":
            return False
        while True:
            size_bytes = stream.read(4)
            if len(size_bytes) != 4:
                return False
            size = struct.unpack(">I", size_bytes)[0]
            chunk_type = stream.read(4)
            if chunk_type == b"pHYs":
                return True
            if chunk_type == b"IEND" or len(chunk_type) != 4:
                return False
            stream.seek(size + 4, 1)  # chunk payload and CRC


def metadata_line(screen: dict, args: argparse.Namespace) -> str:
    provenance = screen.get("provenance", {})
    source_sha = provenance.get("source_sha") or args.source_sha or "не указан"
    run_id = provenance.get("run_id")
    return " · ".join(filter(None, [
        f"Источник: {provenance.get('checkpoint', 'не указан')}",
        f"commit {source_sha[:12]}",
        f"host: {provenance.get('host', 'не указан')}",
        f"экран: {provenance.get('geometry', 'не указан')}",
        f"активный файл: {screen.get('active_file', 'не указан')}",
        f"run #{run_id}" if run_id else "",
    ]))


def html_document(manifest: dict, resolved: list[dict], args: argparse.Namespace,
                  replay: dict | None) -> str:
    toc = "\n".join(
        f'<li><a href="#screen-{html.escape(s["id"])}">{html.escape(s["title"])}</a></li>'
        for s in resolved
    )
    blocks = []
    for screen in resolved:
        width, height = screen.get("png_dimensions") or (0, 0)
        crop = screen.get("display_crop")
        if crop:
            rect = crop["rectangle_px_from_top_left"]
            frame_style = f"aspect-ratio:{rect['width']}/{rect['height']}"
            image_style = f"width:{width / rect['width'] * 100:.5f}%;max-width:none"
            image_markup = (f'<div class="app-frame" style="{frame_style}"><img '
                            f'style="{image_style}" src="{html.escape(screen["resolved_path"])}" '
                            f'alt="{html.escape(screen["caption"])}"></div>')
        else:
            image_markup = (f'<img src="{html.escape(screen["resolved_path"])}" '
                            f'alt="{html.escape(screen["caption"])}">')
        blocks.append(f'''<section id="screen-{html.escape(screen['id'])}">
  <p class="eyebrow">{html.escape(screen.get('chapter', 'Наблюдение'))}</p>
  <h2>{html.escape(screen['title'])}</h2>
  <figure>{image_markup}
    <figcaption>{html.escape(screen['caption'])}</figcaption></figure>
  <p>{html.escape(screen.get('observed', ''))}</p>
  <p class="limit">{html.escape(screen.get('limitation', ''))}</p>
  <p class="meta">{html.escape(metadata_line(screen, args))}<br>
    Original SHA-256: <code>{html.escape(screen['original_sha256'])}</code>; PNG {width}×{height}</p>
</section>''')
    run = args.run_url or manifest.get("run_url", "")
    replay_html = ""
    if replay:
        replay_html = (f'<section id="ergonomics"><p class="eyebrow">Эргономика · записанный QA replay</p>'
                       f'<p>{replay["click_count"]} automated X11 clicks; {replay["key_count"]} key events; '
                       f'{replay["pointer_sample_count"]} recorded pointer positions. Sum between consecutive '
                       f'coordinates: {replay["pointer_segment_sum_px"]:.1f} px. Includes QA checks/repeats; '
                       'not a continuous path, physical hand movement, or human study.</p>'
                       f'<p class="meta">native-actions.log SHA-256: <code>{html.escape(replay["sha256"])}</code></p></section>')
    return f'''<!doctype html>
<html lang="ru"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>{html.escape(manifest.get('title','TikZarium — визуальный гид'))}</title>
<style>
:root{{--ink:#263238;--muted:#65747a;--teal:#007c83;--line:#d5dee0;--panel:#f3f7f7}}
*{{box-sizing:border-box}}body{{margin:0;background:#fff;color:var(--ink);font:16px/1.48 "DejaVu Sans",Arial,sans-serif}}
header,main{{max-width:1180px;margin:auto;padding:24px}}header{{border-bottom:2px solid var(--teal)}}
.eyebrow{{margin:0;color:var(--teal);font-size:.76rem;font-weight:700;letter-spacing:.09em;text-transform:uppercase}}
h1{{font-size:2rem;line-height:1.15;margin:.4rem 0}}h2{{font-size:1.45rem;margin:.3rem 0 .8rem}}
nav{{padding:12px 18px;background:var(--panel);border:1px solid var(--line);border-radius:8px}}
nav a,a{{color:var(--teal)}}nav ol{{columns:2;padding-left:1.3rem}}section{{padding:28px 0;border-bottom:1px solid var(--line)}}
figure{{margin:8px 0 14px}}img{{display:block;width:100%;height:auto;border:1px solid var(--line)}}.app-frame{{width:100%;overflow:hidden;border:1px solid var(--line)}}.app-frame img{{height:auto;border:0}}figcaption{{font-size:.9rem;color:var(--muted);padding-top:5px}}
.limit,.meta{{color:var(--muted)}}.meta{{font-size:.78rem}}code{{overflow-wrap:anywhere}}
@media(max-width:700px){{body{{font-size:14px}}header,main{{padding:16px}}nav ol{{columns:1}}}}
@media print{{body{{font-size:11pt}}header,main{{max-width:none;padding:10mm}}section{{break-after:page}}}}
</style></head><body>
<header><p class="eyebrow">TikZarium · CP09 · Visual Guide</p><h1>Реальный интерфейс и путь от исходника до графика</h1>
<p>Практический гид по наблюдаемым экранам, действиям редактора и границам подтверждённого поведения.</p>
<p><strong>Исходный commit:</strong> {html.escape(args.source_sha or manifest.get('source_sha','не указан'))} · <strong>Run:</strong> <a href="{html.escape(run)}">{html.escape(run or 'не указан')}</a></p>
<p>В HTML и PDF видно окно приложения; исходный полноэкранный PNG остаётся целиком в `assets`. Linux/Xvfb не является платформенной проверкой Windows 10 или macOS.</p></header>
<main><nav><strong>Содержание</strong><ol>{toc}</ol></nav>{replay_html}{''.join(blocks)}</main></body></html>'''


def load_evidence_index(index_path: Path, evidence_root: Path, expected_sha: str) -> tuple[dict, dict]:
    index = json.loads(index_path.read_text(encoding="utf-8"))
    if index.get("source_head_sha") and index["source_head_sha"] != expected_sha:
        raise ValueError(f"Evidence index belongs to {index['source_head_sha']}, expected {expected_sha}")
    sets = index.get("sets")
    if not isinstance(sets, dict) or not sets:
        raise ValueError("Evidence index must contain a non-empty 'sets' object")
    loaded: dict[str, dict] = {}
    for name, entry in sets.items():
        root = confined(evidence_root, entry["root"], f"set {name} root")
        report_path = confined(root, entry["report"], f"set {name} report")
        if not root.is_dir() or not report_path.is_file():
            raise FileNotFoundError(f"Evidence set {name!r} is missing root/report")
        report_bytes = report_path.read_bytes()
        report = json.loads(report_bytes)
        report_sha = hashlib.sha256(report_bytes).hexdigest()
        report_sha_key = report.get("source_head_sha")
        index_sha_key = entry.get("source_head_sha", report_sha_key)
        if not report_sha_key or report_sha_key != index_sha_key:
            raise ValueError(f"Evidence set {name!r} producer report and index source SHA disagree")
        if expected_sha and report_sha_key != expected_sha:
            raise ValueError(f"Evidence set {name!r} belongs to {report_sha_key}, expected {expected_sha}")
        files = report.get("files")
        if not isinstance(files, dict):
            raise ValueError(f"Evidence set {name!r} has no producer file-hash map")
        display = report.get("screen") or report.get("screen_size")
        if not (isinstance(display, list) and len(display) == 2 and all(isinstance(x, int) for x in display)):
            raise ValueError(f"Evidence set {name!r} has no numeric display geometry")
        loaded[name] = {
            "root": root,
            "report": report,
            "report_path": report_path,
            "report_sha256": report_sha,
            "source_head_sha": report_sha_key,
            "display": display,
            "files": files,
            "index": entry,
        }
    return index, loaded


def render_pages(screens: list[dict], evidence: dict[str, dict], output: Path,
                 args: argparse.Namespace, manifest: dict) -> tuple[str, list[dict]]:
    pages: list[str] = []
    resolved: list[dict] = []
    ids: set[str] = set()
    output_root = output.resolve()
    assets_dir = output / "assets"
    assets_dir.mkdir(parents=True, exist_ok=True)
    assets_root = assets_dir.resolve()
    if not assets_root.is_relative_to(output_root):
        raise ValueError("Output assets directory escapes --output-dir")
    for index, item in enumerate(screens, 1):
        screen_id = item.get("id", "")
        if not re.fullmatch(r"[a-z0-9]+(?:-[a-z0-9]+)*", screen_id) or screen_id in ids:
            raise ValueError(f"Missing or duplicate screen id: {screen_id!r}")
        ids.add(screen_id)
        source_set = item["source_set"]
        if source_set not in evidence:
            raise ValueError(f"No evidence map for source_set={source_set!r}")
        source = evidence[source_set]
        relative_path = item["path"]
        original = confined(source["root"], relative_path, f"screen {screen_id}")
        if not original.is_file():
            raise FileNotFoundError(f"Missing original screenshot: {original}")
        sha = file_sha(original)
        producer_sha = source["files"].get(Path(relative_path).as_posix())
        if not producer_sha or producer_sha.lower() != sha.lower():
            raise ValueError(f"Producer report hash missing or mismatched for screen {screen_id}: {relative_path}")
        dimensions = png_dimensions(original)
        if dimensions != tuple(source["display"]):
            raise ValueError(f"Screen {screen_id} PNG size {dimensions} does not match producer display {source['display']}")
        crop_record = None
        crop_option = ""
        crop = manifest.get("window_crop")
        if crop:
            expected_dimensions = (1366, 768)
            expected_rect = {"left": 0, "top": 0, "width": 1182, "height": 704}
            if dimensions != expected_dimensions:
                raise ValueError(f"Window-crop calibration is only verified for {expected_dimensions}; got {dimensions} for {screen_id}")
            if any(type(crop.get(key)) is not int for key in expected_rect):
                raise ValueError("Window crop coordinates and dimensions must be true integers, not booleans or numeric strings")
            actual_rect = {key: crop[key] for key in expected_rect}
            if actual_rect != expected_rect:
                raise ValueError(f"Unreviewed crop rectangle for {screen_id}: {actual_rect}; expected {expected_rect}")
            if png_has_phys_chunk(original):
                raise ValueError(f"Screen {screen_id} has PNG pHYs metadata; natural bp crop basis must be reviewed")
            left, top, width, height = (crop[key] for key in ("left", "top", "width", "height"))
            image_width, image_height = dimensions
            if min(left, top, width, height) < 0 or width == 0 or height == 0:
                raise ValueError(f"Invalid window crop for screen {screen_id}: {crop}")
            if left + width > image_width or top + height > image_height:
                raise ValueError(f"Window crop exceeds screenshot bounds for screen {screen_id}: {crop}")
            right = image_width - left - width
            bottom = image_height - top - height
            crop_option = f"trim={left}bp {bottom}bp {right}bp {top}bp,clip"
            crop_record = {
                "displayed_region": "application window; original full-screen PNG is retained in assets",
                "rectangle_px_from_top_left": {"left": left, "top": top, "width": width, "height": height},
                "source_image_px": {"width": image_width, "height": image_height},
                "graphicx_trim_bp_left_bottom_right_top": [left, bottom, right, top],
                "basis": "extractbb HiResBoundingBox verified as 0 0 1366 768; input PNG has no pHYs chunk, so 1 bp per pixel",
            }
        dest_name = f"{item['id']}_{original.name}"
        dest = assets_root / dest_name
        if not dest.resolve().is_relative_to(assets_root):
            raise ValueError(f"Output screenshot path escapes assets directory: {dest_name}")
        if dest.is_symlink():
            raise ValueError(f"Refusing to overwrite a symlinked screenshot destination: {dest}")
        shutil.copyfile(original, dest)
        # Byte-identical package copy is checked immediately.
        if file_sha(dest) != sha:
            raise RuntimeError(f"Screenshot copy differs from original: {item['id']}")
        observed = item.get("observed", "")
        limitation = item.get("limitation", "")
        report = source["report"]
        display = source["display"]
        client = report.get("client") or report.get("client_size")
        geometry = f"{display[0]}×{display[1]} display"
        if isinstance(client, list) and len(client) == 2:
            geometry += f", client {client[0]}×{client[1]}"
        page_provenance = {
            "checkpoint": source["index"].get("checkpoint", "не указан"),
            "source_sha": source["source_head_sha"],
            "run_url": source["index"].get("run_url", ""),
            "run_id": source["index"].get("run_id"),
            "host": source["index"].get("host", report.get("host", report.get("gui", "unknown"))),
            "geometry": geometry,
            "app_tree_sha": source["index"].get("app_tree_sha", report.get("app_tree_sha")),
        }
        page_record = {**item, "provenance": page_provenance}
        body = (f"\\hypertarget{{sc{index}}}{{}}\n"
                f"\\eyebrow{{{tex_text(item.get('chapter', 'Наблюдение'))}}}\n"
                f"\\sectionTitle{{{tex_text(item['title'])}}}\n"
                f"\\screenImage[{crop_option}]{{assets/{dest_name}}}\n"
                f"\\vspace{{-3mm}}\\meta{{Окно приложения; полный PNG без изменений сохранён в assets.}}\\par\n"
                f"\\vspace{{-2mm}}\\callout{{Что видно}}{{{tex_text(item['caption'])}}}\n\\vspace{{2pt}}\n"
                f"\\begin{{minipage}}[t]{{0.56\\linewidth}}\\footnotesize {tex_text(observed)}\\end{{minipage}}"
                f"\\hfill\\begin{{minipage}}[t]{{0.40\\linewidth}}\\footnotesize\\color{{Muted}}"
                f"{tex_text(limitation)}\\end{{minipage}}\n"
                f"\\vfill\\meta{{{tex_text(metadata_line(page_record, args))}}}\n\\newpage")
        pages.append(body)
        resolved.append({
            **page_record,
            "resolved_path": dest.relative_to(output_root).as_posix(),
            "original_path": original.as_posix(),
            "original_sha256": sha,
            "producer_sha256": producer_sha,
            "producer_report_sha256": source["report_sha256"],
            "artifact_id": source["index"].get("artifact_id"),
            "artifact_sha256": source["index"].get("artifact_sha256"),
            "producer_report": source["report_path"].relative_to(args.evidence_root.resolve()).as_posix(),
            "producer_metadata": {key: source["index"].get(key) for key in
                                  ("run_id", "run_url", "artifact_id", "artifact_sha256", "app_tree_sha", "host", "checkpoint")},
            "byte_size": original.stat().st_size,
            "png_dimensions": list(dimensions),
            "display_crop": crop_record,
            "provenance": page_provenance,
        })
    return "\n".join(pages), resolved


def replay_metrics(config: dict | None, evidence: dict[str, dict]) -> dict | None:
    if not config:
        return None
    source_set = config["source_set"]
    if source_set not in evidence:
        raise ValueError(f"No evidence set for replay log: {source_set}")
    source = evidence[source_set]
    rel = config["path"]
    path = confined(source["root"], rel, "ergonomic replay log")
    if not path.is_file():
        raise FileNotFoundError(f"Missing ergonomic replay log: {path}")
    digest = file_sha(path)
    producer_sha = source["files"].get(Path(rel).as_posix())
    if not producer_sha or producer_sha.lower() != digest.lower():
        raise ValueError("Ergonomic replay log SHA is missing from or differs from its producer report")
    if source["source_head_sha"] != config.get("source_sha", source["source_head_sha"]):
        raise ValueError("Ergonomic replay log source SHA mismatch")
    events = [json.loads(line) for line in path.read_text(encoding="utf-8").splitlines() if line.strip()]
    pointer = [event["actual_root_xy"] for event in events
               if event.get("event") == "pointer_position"
               and isinstance(event.get("actual_root_xy"), list)
               and len(event["actual_root_xy"]) == 2]
    path_sum = sum(math.dist(a, b) for a, b in zip(pointer, pointer[1:]))
    return {
        "source_set": source_set,
        "path": rel,
        "sha256": digest,
        "producer_report_sha256": source["report_sha256"],
        "source_head_sha": source["source_head_sha"],
        "run_id": source["index"].get("run_id"),
        "run_url": source["index"].get("run_url"),
        "artifact_id": source["index"].get("artifact_id"),
        "artifact_sha256": source["index"].get("artifact_sha256"),
        "event_count": len(events),
        "click_count": sum(event.get("event") == "x11_click" for event in events),
        "key_count": sum(event.get("event") == "x11_key" for event in events),
        "pointer_sample_count": len(pointer),
        "pointer_segment_sum_px": round(path_sum, 1),
        "key_chords": {key: sum(event.get("event") == "x11_key" and event.get("chord") == key for event in events)
                       for key in sorted({event.get("chord") for event in events if event.get("event") == "x11_key"})},
    }


def replay_summary_tex(metrics: dict | None) -> str:
    if not metrics:
        return r"\textcolor{Muted}{В этом наборе нет проверенного журнала pointer/key events.}"
    return (f"В проверенном журнале записано {metrics['click_count']} автоматизированных X11-кликов, "
            f"{metrics['key_count']} событий клавиш и {metrics['pointer_sample_count']} точек pointer-position. "
            f"Сумма расстояний между соседними записанными координатами: {metrics['pointer_segment_sum_px']:.1f} px. "
            "Последовательность включает QA-проверки и повторы; это разреженная сумма координатных сегментов, "
            "а не непрерывная траектория, физическое движение руки или исследование с людьми. "
            f"SHA-256 журнала \\texttt{{{metrics['sha256'][:12]}}}; полный digest в \\texttt{{resolved\\_manifest.json}}.")


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--evidence-root", type=Path, required=True)
    parser.add_argument("--evidence-index", type=Path, required=True,
                        help="Producer-backed index that maps evidence-set names to rooted reports.")
    parser.add_argument("--source-sha", required=True)
    parser.add_argument("--run-url", default="")
    parser.add_argument("--manifest", type=Path, default=Path(__file__).with_name("screens.json"))
    parser.add_argument("--template", type=Path, default=Path(__file__).with_name("template.tex"))
    parser.add_argument("--output-dir", type=Path, required=True)
    args = parser.parse_args()
    args.output_dir.mkdir(parents=True, exist_ok=True)
    manifest = json.loads(args.manifest.read_text(encoding="utf-8"))
    evidence_root = args.evidence_root.resolve()
    index_path = args.evidence_index if args.evidence_index.is_absolute() else evidence_root / args.evidence_index
    index_path = index_path.resolve()
    if not index_path.is_relative_to(evidence_root):
        raise ValueError("Evidence index must be located inside --evidence-root")
    evidence_index, evidence = load_evidence_index(index_path, evidence_root, args.source_sha)
    body, resolved = render_pages(manifest["screens"], evidence, args.output_dir, args, manifest)
    replay = replay_metrics(manifest.get("ergonomics"), evidence)
    intro = manifest.get("contents_intro", "")
    toc_rows = "\\\\\n".join(
        f"{idx}. \\hyperlink{{sc{idx}}}{{{tex_text(s['title'])}}}"
        for idx, s in enumerate(manifest["screens"], 1)
    )
    text = args.template.read_text(encoding="utf-8")
    replacements = {
        "\\GuideBuild": tex_text(manifest.get("build_label", "TikZarium CP09")),
        "\\GuideCommit": tex_text(args.source_sha or manifest.get("source_sha", "commit не зафиксирован")),
        "\\GuideEnvironment": tex_text(manifest.get("environment_summary", "см. подписи каждого кадра")),
        "\\GuideRun": "\\url{" + (args.run_url or manifest.get("run_url", "run не указан")) + "}",
        "\\GuideContents": toc_rows + ("\\\\[6pt]" + tex_text(intro) if intro else ""),
        "\\GuidePages": body,
        "\\GuideReplayErgo": replay_summary_tex(replay),
    }
    for key, value in replacements.items():
        text = text.replace(key, value)
    (args.output_dir / "guide.tex").write_text(text, encoding="utf-8")
    resolved_doc = {**manifest, "build": {"source_sha": args.source_sha,
                                           "run_url": args.run_url or None,
                                           "evidence_index_sha256": file_sha(index_path),
                                           "evidence_sets": {k: {"root": v["index"]["root"],
                                                                 "report": v["index"]["report"],
                                                                 "report_sha256": v["report_sha256"],
                                                                 "source_head_sha": v["source_head_sha"],
                                                                 "run_id": v["index"].get("run_id"),
                                                                 "run_url": v["index"].get("run_url"),
                                                                 "artifact_id": v["index"].get("artifact_id"),
                                                                 "artifact_sha256": v["index"].get("artifact_sha256")}
                                                             for k, v in evidence.items()}},
                    "screens": resolved,
                    "ergonomics_replay": replay}
    (args.output_dir / "resolved_manifest.json").write_text(json.dumps(resolved_doc, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    (args.output_dir / "guide.html").write_text(html_document(manifest, resolved, args, replay), encoding="utf-8")
    print(f"Generated {args.output_dir / 'guide.tex'} and guide.html with {len(resolved)} original screenshots.")
    print(f"Resolved screen manifest: {args.output_dir / 'resolved_manifest.json'}")


if __name__ == "__main__":
    main()
