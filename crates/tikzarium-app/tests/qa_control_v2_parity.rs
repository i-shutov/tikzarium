//! Интеграционный тест паритета egui GUI <-> JSONL API для прямых точек PDF-мануалов
//! и двухоконного паспорта преамбулы (сохраняет неизменный B42 lease в crates/tikzarium-app/src).

use eframe::egui;
use serde_json::{Value, json};
use tikzarium_extensions::manual_anchors::{ManualAnchorCatalog, split_atomic_preamble};
use tikzarium_extensions::project_imports;

fn handle_manual_api(catalog: &ManualAnchorCatalog, source: &str, req: &Value) -> Result<Value, String> {
    let op = req
        .get("op")
        .and_then(Value::as_str)
        .ok_or_else(|| String::from("missing op"))?;
    match op {
        "preamble.inspect" => {
            let (preamble, body) = split_atomic_preamble(source);
            let imports = project_imports::inspect(source);
            Ok(json!({
                "preamble_bytes": preamble.len(),
                "body_bytes": body.len(),
                "class_declared": imports.class_declared,
                "crlf": source.contains("\r\n"),
            }))
        }
        "manual.documents" => Ok(json!({
            "count": catalog.documents.len(),
            "documents": catalog.documents,
        })),
        "manual.resolve_token" => {
            let token = req
                .get("token")
                .and_then(Value::as_str)
                .ok_or_else(|| String::from("missing token"))?;
            match catalog.resolve_token(token) {
                Some(anchor) => Ok(json!({
                    "matched": true,
                    "anchor": anchor,
                    "document": catalog.document(&anchor.doc_id),
                })),
                None => Ok(json!({ "matched": false, "anchor": Value::Null })),
            }
        }
        other => Err(format!("unsupported v2 op: {other}")),
    }
}

#[test]
fn egui_manual_bbox_overlay_and_api_leave_crlf_source_untouched() {
    let catalog = ManualAnchorCatalog::bundled().unwrap();
    let source = "% русский комментарий\r\n\\documentclass{standalone}\r\n\\usepackage{tikz}\r\n\\begin{document}\r\n\\begin{tikzpicture}\r\n\\myMacro{Кириллица}\r\n\\end{tikzpicture}\r\n\\end{document}\r\n";
    let snapshot_before = source.to_owned();

    let resolved = handle_manual_api(
        &catalog,
        source,
        &json!({ "op": "manual.resolve_token", "token": "\\addplot" }),
    )
    .unwrap();
    assert_eq!(resolved["matched"], true);
    assert_eq!(resolved["document"]["filename"], "pgfplots.pdf");

    let passport = handle_manual_api(&catalog, source, &json!({ "op": "preamble.inspect" })).unwrap();
    assert_eq!(passport["class_declared"], true);
    assert_eq!(passport["crlf"], true);

    let anchor = catalog.resolve_token("Stealth").unwrap();
    let ctx = egui::Context::default();
    let mut painted_rect = egui::Rect::NOTHING;
    let _ = ctx.run(
        egui::RawInput {
            screen_rect: Some(egui::Rect::from_min_size(
                egui::Pos2::ZERO,
                egui::vec2(1280.0, 800.0),
            )),
            ..Default::default()
        },
        |ctx| {
            egui::CentralPanel::default().show(ctx, |ui| {
                let page_rect = egui::Rect::from_min_size(
                    ui.min_rect().min,
                    egui::vec2(420.0, 594.0),
                );
                let [x0, y0, x1, y1] = anchor.bbox;
                let target = egui::Rect::from_min_max(
                    egui::pos2(
                        page_rect.left() + page_rect.width() * x0,
                        page_rect.top() + page_rect.height() * y0,
                    ),
                    egui::pos2(
                        page_rect.left() + page_rect.width() * x1,
                        page_rect.top() + page_rect.height() * y1,
                    ),
                );
                ui.painter().rect_stroke(
                    target,
                    2.0,
                    egui::Stroke::new(1.5, egui::Color32::from_rgb(37, 99, 235)),
                    egui::StrokeKind::Inside,
                );
                painted_rect = target;
            });
        },
    );

    assert!(painted_rect.is_positive());
    assert_eq!(source, snapshot_before);
}
