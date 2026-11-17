# TikZarium Studio — Десктопная редакция Tauri v2 + Rust (`apps/tikzarium-studio-tauri`)

Данная директория содержит полную нативную десктопную сборку **TikZarium Studio v2.4** на стеке **Tauri v2 + Rust (`edition = "2024"`)**, которая напрямую линкует доменные крейты репозитория:

- `crates/tikzarium-core` — строгий офлайн-запуск внешнего `xelatex` (`-no-shell-escape`, запрет скрытой автоустановки пакетов MiKTeX `--disable-installer`, read-only `TexEnvironment::discover()` / `probe_package`, атомарное сохранение `Document::save_to` с защитой симлинков и внешних правок, `extract_diagnostics`);
- `crates/tikzarium-extensions` — декларативный каталог пакетов расширений, паспорт преамбулы `project_imports` и статический реестр прямых точек оригинальных PDF-мануалов `manual_anchors`.

При этом корневой `Cargo.toml`, `Cargo.lock` (`I40 qa_cargo_lock.py`) и нативный эталон `crates/tikzarium-app/src` (`egui = 0.33.3`, B42 lease) остаются **на 100% нетронутыми**, поэтому обе редакции (`egui` и `Tauri v2`) сосуществуют поверх одного чистого Rust-ядра.

## Архитектура IPC-моста (`#[tauri::command]`)

В десктопном окне Tauri v2 фронтенд общается с Rust напрямую по внутреннему IPC (`window.__TAURI_INTERNALS__.invoke`) **без Node.js и без локальных HTTP-портов**:

| Команда Rust (`src-tauri/src/commands.rs`) | Назначение и контракт безопасности |
| --- | --- |
| `tz_runtime_info` | Версия Tauri v2, платформа ОС и сводка обнаруженного `TexEnvironment`. |
| `tz_render_pdf_underlay` | SHA-256 LRU-кэш + фоновая сборка `tikzarium_core::BuildService::run` + растеризация `pdftoppm` 144 DPI для живой кальки `0–100%` под холстом. |
| `tz_cancel_active_build` | Немедленная отмена текущей сборки `BuildService::cancel()`. |
| `tz_doctor_environment` | Read-only аудит `xelatex`, `kpsewhich`/`findtexmf`, `pdftoppm` и 7 базовых пакетов TeX без сетевых загрузок. |
| `tz_open_document` | Чтение `.tex` через `Document::load` с сохранением CRLF/LF и подписка `notify::RecommendedWatcher` (`tz://external-file-change`). |
| `tz_save_document` | Запись `.tex` через `Document::save_to` с защитой от перезаписи чужих внешних изменений на диске. |
| `tz_apply_checked_patch` | Побайтово/UTF-16 выверенный `SourcePatch` с контролем SHA-256 ревизии и генерацией `inversePatch` для Undo. |
| `tz_render_manual_page` | Поиск локального лицензионного PDF через `kpsewhich` (`AGENTS.md п.5`) и рендер ровно одной страницы мануала `[page..page]`. |
| `tz_resolve_manual_token` | Разрешение любой команды LaTeX/TikZ в точную секцию, `NamedDest` и нормализованный `bbox` из `ManualAnchorCatalog::bundled()`. |

## Быстрый запуск разработки и сборки

### 1. Системные зависимости

- **Windows 10 / 11 (x64)**:
  - Rust `1.85+` (`1.91.0` из `rust-toolchain.toml`), Node.js `20+`
  - Системный Microsoft Edge **WebView2** (предустановлен в актуальных Windows 10/11; при необходимости ставится тихим бутстраппером)
  - Локальный MiKTeX или TeX Live (`xelatex` в `PATH` или `TIKZARIUM_XELATEX`)

- **Ubuntu 22.04 / 24.04 (X11 / Wayland)**:
  ```bash
  sudo apt-get update
  sudo apt-get install -y \
    libwebkit2gtk-4.1-dev build-essential curl wget file \
    libxdo-dev libssl-dev libayatana-appindicator3-dev librsvg2-dev \
    texlive-xetex texlive-pictures texlive-latex-extra poppler-utils
  ```

### 2. Запуск десктопного окна в режиме разработки

```bash
cd apps/tikzarium-studio-tauri
npm install
npm test
npm run tauri:dev
```

### 3. Production-сборка нативного установщика (`.msi` / `.exe` / `.deb` / `.AppImage`)

```bash
cd apps/tikzarium-studio-tauri
npm run tauri:build
```

Для включения автоматической матричной сборки Tauri v2 в GitHub Actions скопируйте готовый шаблон воркфлоу:

```bash
cp apps/tikzarium-studio-tauri/ci/tauri-v2-studio.workflow.yml .github/workflows/tauri-v2-studio.yml
```
