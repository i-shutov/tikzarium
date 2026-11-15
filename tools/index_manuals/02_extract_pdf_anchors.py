#!/usr/bin/env python3
"""Однократная предсборочная разметка прямых точек в оригинальных PDF-мануалах TikZ."""
import json, pathlib, tomllib
import fitz  # PyMuPDF (pip install pymupdf)

SPEC = tomllib.loads(pathlib.Path("tools/index_manuals/anchors_manifest.toml").read_text("utf-8"))
RAW_DIR = pathlib.Path("assets/manuals/raw")
OUT_DIR = pathlib.Path("assets/manuals")
OUT_DIR.mkdir(parents=True, exist_ok=True)

anchors_out = []
for doc_cfg in SPEC["documents"]:
    pdf_path = RAW_DIR / doc_cfg["filename"]
    doc = fitz.open(pdf_path)
    toc = doc.get_toc(simple=False)  # [lvl, title, page_1based, dest_dict]

    for target in doc_cfg["targets"]:
        page_idx = target["fallback_page"] - 1
        bbox_norm = [0.08, 0.20, 0.92, 0.48]

        # 1. Точный поиск сигнатуры команды / заголовка секции на целевой области страниц
        for pno in range(max(0, page_idx - 2), min(len(doc), page_idx + 3)):
            page = doc[pno]
            hits = page.search_for(target["probe_phrase"])
            if hits:
                r = hits[0]
                w, h = page.rect.width, page.rect.height
                page_idx = pno
                # PyMuPDF уже возвращает верхне-левую систему координат (0..w, 0..h):
                bbox_norm = [
                    round(max(0.04, r.x0 / w - 0.02), 4),
                    round(max(0.02, r.y0 / h - 0.015), 4),
                    round(min(0.96, 0.92), 4),
                    round(min(0.98, (r.y1 + 140.0) / h), 4),
                ]
                break

        anchors_out.append({
            "id": target["id"],
            "docId": doc_cfg["id"],
            "section": target["section"],
            "page": page_idx + 1,
            "namedDest": f"tikzarium.{target['id']}",
            "bboxNorm": {
                "x0": bbox_norm[0], "y0": bbox_norm[1],
                "x1": bbox_norm[2], "y1": bbox_norm[3],
            },
            "matchedTokens": target["tokens"],
        })

    # Сохраняем линеаризованный PDF для мгновенного чтения страниц в офлайне
    doc.save(OUT_DIR / doc_cfg["filename"], garbage=3, deflate=True, linear=True)
    doc.close()

index_payload = {
    "schema": "tikzarium.pdf_manual_index.v1",
    "coordinateSpace": "top-left-normalized-0..1",
    "anchors": anchors_out,
}
(OUT_DIR / "manual_anchors.index.json").write_text(
    json.dumps(index_payload, ensure_ascii=False, indent=2), "utf-8"
)
print(f"Размечено прямых точек: {len(anchors_out)} -> assets/manuals/manual_anchors.index.json")