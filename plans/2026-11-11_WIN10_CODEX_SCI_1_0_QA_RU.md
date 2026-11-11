# Codex на Windows 10 Pro — Scientific Studio 1.0 native QA

**11 ноября 2026.** Текст задания для локального Codex на уже работающем Windows 10 Pro (Admin session). Это инструкция, не результат запуска. Source of truth: GitHub i-shutov/tikzarium docs/RELEASE_SCOPE_SCIENTIFIC_STUDIO_1_0_RU.md.

## Полный текст для Codex

Ты независимый Windows QA TikZarium Scientific Studio 1.0 на ЭТОЙ машине Windows 10 Pro x64, в открытом интерактивном сеансе. Начни с безопасного READ-ONLY PREFLIGHT. Владелец разрешил испытания собственного окна TikZarium, но не меняй UAC, реестр, RDP, глобальный DPI, системный MiKTeX, учётные записи, сеть, драйверы, DLL/службы/runner, FlowBridge и чужие процессы. Не устанавливай и не обновляй программы/пакеты. Не включай shell escape. Никогда не запускай untrusted PR на постоянном Server.

**Фаза A:** выполни hostname, whoami, OS Caption/Version/BuildNumber/OSArchitecture через Get-CimInstance, при Access denied сообщи ошибку и используй READ-ONLY реестр. Проверь PSVersion, Get-Command git/rustc/cargo/xelatex/miktex/pdffonts/pdftotext/codex, точные версии найденных инструментов, текущие SessionId/Desktop, реальные мониторы/effective DPI. Найди только в текущем пользовательском каталоге ранее установленные TikZarium/repo. Для найденного main/release binary — полный Git SHA, Cargo.lock SHA и EXE SHA256. Если отсутствует, сообщи NOT_FOUND, не устанавливай автоматически. Верни таблицу фактов stdout/stderr PASS/FAIL/BLOCKED; не пытайся исправить окружение административными трюками.

**Фаза B (после фактического обнаружения доверенного binary в текущем профиле):** открой собственное окно TikZarium, проверив HWND/PID/session/executable SHA. Пройди реальные 6 жестов, Inspector/Apply/Undo, F1, native Save/Open, Unicode+CRLF+unknown macros без нормализации, Save&Build→XeLaTeX→PDF/шрифты/ToUnicode/кириллицу, диагностический переход к правильной строке и файлу, stale/last-good, cancel, export. Сохрани настоящие owned-client PNG и оригинальные source/log/PDF+manifest SHA256. Допустим только явно отмеченный isolated QA workaround из существующего repo runbook для RDP OpenGL; это НЕ native production GPU acceptance. Не меняй driver/system DLL.

Проверка 96/120/192 DPI (100/125/200%) — только если доступна безопасная per-process/native процедура без изменения глобального масштабирования. Иначе NOT_RUN. Проверка реального IME composition/preedit/commit отдельно от русской клавиатуры и clipboard, иначе NOT_RUN. Измеряй native key-to-frame p95 на 10k lines/1MiB и first editable frame ≤2s и memory at100k/10MiB только если есть воспроизводимый инструмент; CPU microbench НЕ P95, отсутствие инструмента = NOT_MEASURED.

Доказательства размещай только в пользовательском Documents/TikZarium-QA/evidence/20261111-scientific-studio; никакие личные/чужие окна не фотографировать. Итог: hostname/whoami/OS, versions, Git/EXE hashes, session, original evidence paths, каждая W3/DPI/IME/G3/Scientific операция отдельно PASS/FAIL/NOT_RUN, точная ошибка/blocker и минимальная команда исправления. Не делать merge/tag/release, не объявлять W2b Server по Win10 результатам.

## PowerShell 5.1: первые read-only команды

    $ErrorActionPreference = 'Continue'
    '=== Machine ==='
    hostname
    whoami
    $PSVersionTable.PSVersion.ToString()
    '=== OS ==='
    try {
      Get-CimInstance Win32_OperatingSystem -ErrorAction Stop |
        Select-Object Caption,Version,BuildNumber,OSArchitecture | Format-List
    } catch {
      "CIM ERROR: $($_.Exception.Message)"
      Get-ItemProperty 'HKLM:\SOFTWARE\Microsoft\Windows NT\CurrentVersion' -ErrorAction SilentlyContinue |
        Select-Object ProductName,CurrentBuildNumber,DisplayVersion | Format-List
    }
    '=== Tools ==='
    foreach ($name in 'git','rustc','cargo','xelatex','miktex','pdffonts','pdftotext','codex') {
      $cmd = Get-Command $name -ErrorAction SilentlyContinue
      if ($cmd) { "$name => $($cmd.Source)" } else { "$name => NOT_FOUND" }
    }
    '=== Session ==='
    Get-Process -Id $PID | Select-Object Id,SessionId,Path
    '=== Display controller ==='
    Get-CimInstance Win32_VideoController -ErrorAction SilentlyContinue |
      Select-Object Name,DriverVersion,CurrentHorizontalResolution,CurrentVerticalResolution

**Server 2025 is a separate test:** previous queued self-hosted job with runner_id=0 is not proof of offline. Check runner service/labels READ-ONLY on the server itself through its authorised local Codex, do not reconfigure FlowBridge or services from Win10.

Do not claim you have opened a local desktop if no actual owned HWND or app process was observed. When complete, paste original summary and evidence hashes back to this ChatGPT conversation; integrator will verify and update W0–W4 independently.
