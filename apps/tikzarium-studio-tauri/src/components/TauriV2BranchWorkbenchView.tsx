import React, { useCallback, useEffect, useState } from 'react';
import {
  Check,
  Copy,
  Cpu,
  Download,
  ExternalLink,
  FileCode2,
  GitBranch,
  Layers,
  ShieldCheck,
  Terminal,
} from 'lucide-react';
import { TAURI_V2_IPC_CATALOG, isTauriRuntime } from '../domain/tauriNativeBridge';

interface TauriBundlePreviewFile {
  path: string;
  roleRu: string;
  bytes: number;
  isBinary: boolean;
  previewText?: string;
}

interface TauriBundleManifestResponse {
  ok: boolean;
  defaultBranchName: string;
  appRootInRepo: string;
  totalFiles: number;
  totalBytes: number;
  keyFiles: TauriBundlePreviewFile[];
  allPaths: string[];
}

interface GithubStatusSnapshot {
  oauthConfigured: boolean;
  deviceFlowAvailable: boolean;
  envTokenConfigured: boolean;
  authenticated: boolean;
  sessionId?: string | null;
  authMethod: 'oauth-session' | 'env-token' | null;
  openPr?: { number: number; htmlUrl: string; branchName: string; headSha: string } | null;
  openTauriPr?: { number: number; htmlUrl: string; branchName: string; headSha: string } | null;
  user: { login: string; avatarUrl: string } | null;
  authUrl?: string;
}

interface TauriV2BranchWorkbenchViewProps {
  onBackToStudio: () => void;
}

export const TauriV2BranchWorkbenchView: React.FC<TauriV2BranchWorkbenchViewProps> = ({
  onBackToStudio,
}) => {
  const [bundleInfo, setBundleInfo] = useState<TauriBundleManifestResponse | null>(null);
  const [selectedFileIdx, setSelectedFileIdx] = useState<number>(0);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const [ghStatus, setGhStatus] = useState<GithubStatusSnapshot | null>(null);
  const [loadingGh, setLoadingGh] = useState<boolean>(true);
  const [deviceFlowState, setDeviceFlowState] = useState<{
    flowId: string;
    userCode: string;
    verificationUri: string;
    intervalSec: number;
    statusText: string;
  } | null>(null);
  const [deviceFlowError, setDeviceFlowError] = useState<string | null>(null);
  const [startingDeviceFlow, setStartingDeviceFlow] = useState<boolean>(false);

  const [branchName, setBranchName] = useState<string>('feat/tauri-v2-studio');
  const [openPrAfterPush, setOpenPrAfterPush] = useState<boolean>(true);
  const [publishing, setPublishing] = useState<boolean>(false);
  const [publishResult, setPublishResult] = useState<{
    ok: boolean;
    branchName?: string;
    branchUrl?: string;
    commitSha?: string;
    filesUploaded?: number;
    prNumber?: number | null;
    prUrl?: string | null;
    error?: string;
  } | null>(null);

  const readStoredGhSid = (): string => {
    try {
      return window.localStorage.getItem('tikzarium_gh_sid') ?? '';
    } catch {
      return '';
    }
  };

  const writeStoredGhSid = (sid: string | null) => {
    try {
      if (sid) {
        window.localStorage.setItem('tikzarium_gh_sid', sid);
      } else {
        window.localStorage.removeItem('tikzarium_gh_sid');
      }
    } catch {
      // Ignore storage restriction
    }
  };

  const refreshAll = useCallback(async () => {
    try {
      const storedSid = readStoredGhSid();
      const [bRes, gRes] = await Promise.all([
        fetch('/api/repo/tauri-v2-bundle'),
        fetch('/api/github/status', {
          headers: storedSid ? { 'X-Tikzarium-Gh-Sid': storedSid } : undefined,
        }),
      ]);
      if (bRes.ok) {
        const bJson = (await bRes.json()) as TauriBundleManifestResponse;
        setBundleInfo(bJson);
      }
      if (gRes.ok) {
        const gJson = (await gRes.json()) as GithubStatusSnapshot;
        if (gJson.sessionId) {
          writeStoredGhSid(gJson.sessionId);
        }
        setGhStatus(gJson);
        if (gJson.authenticated) {
          setDeviceFlowState(null);
          setDeviceFlowError(null);
        }
      }
    } catch {
      // Ignore offline preview error
    } finally {
      setLoadingGh(false);
    }
  }, []);

  useEffect(() => {
    void refreshAll();
  }, [refreshAll]);

  useEffect(() => {
    if (!deviceFlowState) return;
    let cancelled = false;
    const pollMs = Math.max(5, deviceFlowState.intervalSec || 5) * 1000;

    const timer = window.setInterval(async () => {
      if (cancelled) return;
      try {
        const res = await fetch('/api/github/device/poll', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ flowId: deviceFlowState.flowId }),
        });
        const data = await res.json();
        if (cancelled) return;
        if (data.status === 'authorized') {
          if (typeof data.sessionId === 'string') {
            writeStoredGhSid(data.sessionId);
          }
          setDeviceFlowState(null);
          setDeviceFlowError(null);
          await refreshAll();
        } else if (data.status === 'pending') {
          setDeviceFlowState((prev) =>
            prev
              ? {
                  ...prev,
                  intervalSec:
                    typeof data.intervalSec === 'number' ? data.intervalSec : prev.intervalSec,
                  statusText: data.message || prev.statusText,
                }
              : null
          );
        } else if (!res.ok) {
          setDeviceFlowState(null);
          setDeviceFlowError(data.error || 'Сессия кода устройства завершена');
        }
      } catch {
        // Transient network hiccup
      }
    }, pollMs);

    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [deviceFlowState, refreshAll]);

  const handleCopy = (key: string, text: string) => {
    navigator.clipboard?.writeText(text).catch(() => {});
    setCopiedKey(key);
    window.setTimeout(() => setCopiedKey((prev) => (prev === key ? null : prev)), 1600);
  };

  const handleStartDeviceFlow = async () => {
    setStartingDeviceFlow(true);
    setDeviceFlowError(null);
    try {
      const res = await fetch('/api/github/device/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        setDeviceFlowError(data.error || 'Не удалось запросить код устройства GitHub');
        return;
      }
      setDeviceFlowState({
        flowId: data.flowId,
        userCode: data.userCode,
        verificationUri: data.verificationUri || 'https://github.com/login/device',
        intervalSec: data.intervalSec || 5,
        statusText:
          'Введите код на github.com/login/device и нажмите Authorize — подключение выполнится автоматически…',
      });
    } catch (err) {
      setDeviceFlowError(err instanceof Error ? err.message : 'Сетевая ошибка Device Flow');
    } finally {
      setStartingDeviceFlow(false);
    }
  };

  const handlePublishTauriBranch = async () => {
    setPublishing(true);
    setPublishResult(null);
    try {
      const storedSid = readStoredGhSid();
      const res = await fetch('/api/github/publish-tauri-branch', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(storedSid ? { 'X-Tikzarium-Gh-Sid': storedSid } : {}),
        },
        body: JSON.stringify({
          branchName: branchName.trim() || 'feat/tauri-v2-studio',
          openPullRequest: openPrAfterPush,
        }),
      });
      const data = await res.json();
      setPublishResult(data);
      if (data.ok) {
        await refreshAll();
      }
    } catch (err) {
      setPublishResult({
        ok: false,
        error: err instanceof Error ? err.message : 'Сетевая ошибка публикации ветки Tauri v2',
      });
    } finally {
      setPublishing(false);
    }
  };

  const selectedFile = bundleInfo?.keyFiles[selectedFileIdx] ?? null;
  const runningInNativeTauri = isTauriRuntime();

  const quickStartCommands = [
    `git fetch origin ${branchName.trim() || 'feat/tauri-v2-studio'}`,
    `git checkout ${branchName.trim() || 'feat/tauri-v2-studio'}`,
    'cd apps/tikzarium-studio-tauri',
    'npm install',
    'npm run tauri:dev',
  ].join('\n');

  return (
    <div
      data-testid="tauri-v2-workbench-view"
      className="flex-1 min-h-0 overflow-y-auto bg-[var(--tz-panel)] text-[var(--tz-text)] p-4 lg:p-6"
    >
      <div className="mx-auto max-w-[1400px] space-y-5">
        {/* Top Summary Header */}
        <div className="flex flex-wrap items-start justify-between gap-4 rounded border border-[var(--tz-outline)] bg-[var(--tz-window)] p-4">
          <div className="space-y-1 max-w-4xl">
            <div className="flex flex-wrap items-center gap-2">
              <Cpu className="h-4 w-4 text-[var(--tz-link)]" />
              <h1 className="text-base font-bold tracking-tight text-[var(--tz-text)]">
                Десктопная редакция TikZarium Studio на Tauri v2 + Rust (отдельная ветка)
              </h1>
              <span className="font-mono tabular-nums text-[11px] text-[var(--tz-muted)]">
                {runningInNativeTauri
                  ? 'Запущено в нативном окне Tauri v2 IPC'
                  : 'Готовый пакет ветки feat/tauri-v2-studio'}
              </span>
            </div>
            <p className="text-xs leading-relaxed text-[var(--tz-muted)]">
              Полный интерфейс Studio v2.4 (плавная PDF-калька 0–100% как в Photoshop, 3 вкладки{' '}
              <code className="font-mono text-[var(--tz-text)]">Чертёж | Шапка | Весь .tex</code>,
              векторные УГО цепей/химии/оптики, прямые точки PDF-мануалов) упакован в{' '}
              <code className="font-mono text-[var(--tz-link)]">apps/tikzarium-studio-tauri/</code>{' '}
              и напрямую вызывает крейты{' '}
              <code className="font-mono text-[var(--tz-text)]">crates/tikzarium-core</code> и{' '}
              <code className="font-mono text-[var(--tz-text)]">crates/tikzarium-extensions</code>{' '}
              через 9 команд <code className="font-mono text-[var(--tz-text)]">#[tauri::command]</code>.
              Корневой <code className="font-mono text-[var(--tz-text)]">Cargo.lock</code>, эталон{' '}
              <code className="font-mono text-[var(--tz-text)]">egui 0.33.3</code> и открытый{' '}
              <code className="font-mono text-[var(--tz-text)]">PR #190</code> остаются полностью
              независимыми.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <a
              href="/api/repo/tauri-v2-tarball"
              download="tikzarium-tauri-v2-studio.tar.gz"
              className="inline-flex items-center gap-1.5 rounded border border-[var(--tz-outline)] bg-[var(--tz-button)] px-3 py-1.5 text-xs font-medium text-[var(--tz-text)] hover:bg-[var(--tz-hover)] whitespace-nowrap"
            >
              <Download className="h-3.5 w-3.5 text-[var(--tz-link)]" />
              <span>Скачать архив ветки (.tar.gz)</span>
            </a>
            <button
              type="button"
              onClick={onBackToStudio}
              className="rounded border border-[var(--tz-outline)] bg-[var(--tz-button)] px-3 py-1.5 text-xs font-medium text-[var(--tz-text)] hover:bg-[var(--tz-hover)]"
            >
              Вернуться к холсту
            </button>
          </div>
        </div>

        {/* Main 2-Column Grid: Left = GitHub Separate Branch Publisher + Quickstart, Right = Rust/Tauri Source Inspector */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          {/* Left 5 Columns: GitHub Separate Branch Push + CLI Quickstart */}
          <div className="lg:col-span-5 space-y-4">
            <div className="rounded border border-[var(--tz-outline)] bg-[var(--tz-window)] p-4 space-y-3">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <GitBranch className="h-4 w-4 text-[var(--tz-link)]" />
                  <h2 className="text-sm font-semibold text-[var(--tz-text)]">
                    Публикация отдельной ветки в <span className="font-mono text-[var(--tz-link)]">i-shutov/tikzarium</span>
                  </h2>
                </div>
                {bundleInfo && (
                  <span className="font-mono tabular-nums text-[11px] text-[var(--tz-muted)]">
                    {bundleInfo.totalFiles} файлов · {Math.round(bundleInfo.totalBytes / 1024)} КБ
                  </span>
                )}
              </div>

              {/* Existing branches status */}
              <div className="space-y-1.5 text-[11px]">
                {ghStatus?.openPr && (
                  <div className="flex flex-wrap items-center justify-between gap-2 rounded border border-[var(--tz-outline)] bg-[var(--tz-inset)] px-2.5 py-1.5 text-[var(--tz-muted)]">
                    <span>
                      Основная ветка egui/мануалов:{' '}
                      <strong className="font-mono text-[var(--tz-text)]">
                        PR #{ghStatus.openPr.number} ({ghStatus.openPr.branchName})
                      </strong>{' '}
                      — не затрагивается
                    </span>
                    <a
                      href={ghStatus.openPr.htmlUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-[var(--tz-link)] underline"
                    >
                      <span>PR #{ghStatus.openPr.number}</span>
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  </div>
                )}

                {ghStatus?.openTauriPr && (
                  <div className="flex flex-wrap items-center justify-between gap-2 rounded border border-emerald-500/40 bg-emerald-500/10 px-2.5 py-1.5 text-[var(--tz-text)]">
                    <span>
                      Активный PR Tauri v2:{' '}
                      <strong className="font-mono tabular-nums">
                        #{ghStatus.openTauriPr.number} ({ghStatus.openTauriPr.branchName} ·{' '}
                        {ghStatus.openTauriPr.headSha})
                      </strong>
                    </span>
                    <a
                      href={ghStatus.openTauriPr.htmlUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 font-semibold text-[var(--tz-link)] underline"
                    >
                      <span>Открыть на GitHub</span>
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  </div>
                )}
              </div>

              {/* Auth + Push Controls */}
              <div className="rounded border border-[var(--tz-outline)] bg-[var(--tz-inset)] p-3 space-y-3 text-xs">
                {loadingGh && !ghStatus ? (
                  <div className="text-[11px] text-[var(--tz-muted)]">
                    Проверка сессии GitHub…
                  </div>
                ) : ghStatus?.authenticated ? (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between gap-2 text-[11px]">
                      <span>
                        Авторизован GitHub:{' '}
                        <strong className="text-emerald-500">@{ghStatus.user?.login}</strong>
                      </span>
                      <span className="font-mono text-[var(--tz-muted)]">база: main</span>
                    </div>

                    <div className="space-y-1.5">
                      <label className="block text-[11px] text-[var(--tz-muted)]">
                        Имя отдельной ветки для Tauri v2 интерфейса:
                      </label>
                      <input
                        type="text"
                        value={branchName}
                        onChange={(e) => setBranchName(e.target.value)}
                        placeholder="feat/tauri-v2-studio"
                        className="w-full rounded border border-[var(--tz-outline)] bg-[var(--tz-window)] px-2.5 py-1.5 font-mono text-xs text-[var(--tz-text)]"
                      />
                    </div>

                    <label className="flex items-center gap-2 text-[11px] text-[var(--tz-text)] cursor-pointer">
                      <input
                        type="checkbox"
                        checked={openPrAfterPush}
                        onChange={(e) => setOpenPrAfterPush(e.target.checked)}
                      />
                      <span>Сразу открыть (или обновить) отдельный Pull Request в main</span>
                    </label>

                    <button
                      type="button"
                      data-testid="publish-tauri-branch-btn"
                      onClick={handlePublishTauriBranch}
                      disabled={publishing}
                      className="flex w-full items-center justify-center gap-2 rounded bg-[var(--tz-accent)] px-3 py-2 text-xs font-semibold text-white hover:opacity-95 disabled:opacity-50"
                    >
                      <GitBranch className="h-3.5 w-3.5" />
                      <span>
                        {publishing
                          ? 'Загрузка блобов и создание ветки в GitHub…'
                          : ghStatus.openTauriPr &&
                              branchName.trim() === ghStatus.openTauriPr.branchName
                            ? `Коммит и пуш в ветку ${branchName.trim()} (PR #${ghStatus.openTauriPr.number})`
                            : `Создать ветку ${branchName.trim() || 'feat/tauri-v2-studio'} и запушить в GitHub`}
                      </span>
                    </button>
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="font-medium text-[var(--tz-text)]">
                        Для прямого пуша ветки в GitHub войдите в 1 клик:
                      </span>
                      {ghStatus?.deviceFlowAvailable && (
                        <button
                          type="button"
                          onClick={handleStartDeviceFlow}
                          disabled={startingDeviceFlow}
                          className="rounded bg-[var(--tz-accent)] px-3 py-1.5 text-xs font-semibold text-white hover:opacity-95 disabled:opacity-50"
                        >
                          {startingDeviceFlow
                            ? 'Запрос кода…'
                            : 'Войти через GitHub (Device Flow)'}
                        </button>
                      )}
                    </div>

                    {deviceFlowState && (
                      <div className="rounded border border-[var(--tz-accent)]/50 bg-[var(--tz-window)] p-2.5 space-y-2">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <span className="text-[11px] text-[var(--tz-muted)]">Код:</span>
                            <code className="rounded border border-[var(--tz-outline)] bg-[var(--tz-inset)] px-2 py-0.5 font-mono text-sm font-bold tracking-widest text-[var(--tz-link)]">
                              {deviceFlowState.userCode}
                            </code>
                            <button
                              type="button"
                              onClick={() => handleCopy('df-code', deviceFlowState.userCode)}
                              className="inline-flex items-center gap-1 rounded border border-[var(--tz-outline)] bg-[var(--tz-button)] px-2 py-0.5 text-[10px] text-[var(--tz-text)] hover:bg-[var(--tz-hover)]"
                            >
                              {copiedKey === 'df-code' ? (
                                <Check className="h-3 w-3 text-emerald-500" />
                              ) : (
                                <Copy className="h-3 w-3" />
                              )}
                              <span>Копировать</span>
                            </button>
                          </div>
                          <a
                            href={deviceFlowState.verificationUri}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 rounded bg-[var(--tz-accent)] px-2.5 py-1 text-xs font-semibold text-white hover:opacity-95"
                          >
                            <span>Открыть github.com/login/device</span>
                            <ExternalLink className="h-3 w-3" />
                          </a>
                        </div>
                        <div className="text-[11px] text-[var(--tz-muted)]">
                          {deviceFlowState.statusText}
                        </div>
                      </div>
                    )}

                    {deviceFlowError && (
                      <div className="rounded border border-rose-500/40 bg-rose-500/10 p-2 text-[11px] text-rose-500">
                        {deviceFlowError}
                      </div>
                    )}
                  </div>
                )}

                {publishResult && (
                  <div
                    className={`rounded border p-2.5 text-[11px] space-y-1 ${
                      publishResult.ok
                        ? 'border-emerald-500/40 bg-emerald-500/10 text-[var(--tz-text)]'
                        : 'border-rose-500/40 bg-rose-500/10 text-rose-500'
                    }`}
                  >
                    {publishResult.ok ? (
                      <>
                        <div className="font-semibold">
                          Ветка{' '}
                          <code className="font-mono">{publishResult.branchName}</code> успешно
                          опубликована ({publishResult.filesUploaded} файлов · коммит{' '}
                          <code className="font-mono">
                            {publishResult.commitSha?.slice(0, 7)}
                          </code>
                          ).
                        </div>
                        <div className="flex flex-wrap items-center gap-3 pt-0.5">
                          {publishResult.branchUrl && (
                            <a
                              href={publishResult.branchUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 text-[var(--tz-link)] underline"
                            >
                              <span>Открыть ветку на GitHub</span>
                              <ExternalLink className="h-3 w-3" />
                            </a>
                          )}
                          {publishResult.prUrl && (
                            <a
                              href={publishResult.prUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 font-semibold text-[var(--tz-link)] underline"
                            >
                              <span>Открыть Pull Request #{publishResult.prNumber}</span>
                              <ExternalLink className="h-3 w-3" />
                            </a>
                          )}
                        </div>
                      </>
                    ) : (
                      <span>{publishResult.error}</span>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Quick Local Run Card */}
            <div className="rounded border border-[var(--tz-outline)] bg-[var(--tz-window)] p-4 space-y-2.5">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Terminal className="h-4 w-4 text-[var(--tz-link)]" />
                  <h3 className="text-xs font-semibold text-[var(--tz-text)]">
                    Локальный запуск нативного окна (Windows 10 / Linux)
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => handleCopy('quickstart', quickStartCommands)}
                  className="inline-flex items-center gap-1 rounded border border-[var(--tz-outline)] bg-[var(--tz-button)] px-2 py-0.5 text-[11px] text-[var(--tz-text)] hover:bg-[var(--tz-hover)]"
                >
                  {copiedKey === 'quickstart' ? (
                    <Check className="h-3 w-3 text-emerald-500" />
                  ) : (
                    <Copy className="h-3 w-3" />
                  )}
                  <span>Копировать</span>
                </button>
              </div>
              <pre className="overflow-x-auto rounded border border-[var(--tz-outline)] bg-[var(--tz-inset)] p-2.5 font-mono text-[11px] leading-relaxed text-[var(--tz-text)]">
                {quickStartCommands}
              </pre>
              <p className="text-[11px] text-[var(--tz-muted)]">
                Для сборки релизного инсталлятора (<code className="font-mono">.msi / .exe / .deb / .AppImage</code>)
                выполните <code className="font-mono text-[var(--tz-text)]">npm run tauri:build</code>.
              </p>
            </div>
          </div>

          {/* Right 7 Columns: Source Tree Inspector of apps/tikzarium-studio-tauri */}
          <div className="lg:col-span-7 rounded border border-[var(--tz-outline)] bg-[var(--tz-window)] p-4 flex flex-col space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <FileCode2 className="h-4 w-4 text-[var(--tz-link)]" />
                <h2 className="text-sm font-semibold text-[var(--tz-text)]">
                  Ключевые файлы хоста Tauri v2 + Rust (<code className="font-mono text-xs">src-tauri/</code>)
                </h2>
              </div>
              {bundleInfo && bundleInfo.keyFiles.length > 0 && (
                <select
                  value={selectedFileIdx}
                  onChange={(e) => setSelectedFileIdx(Number(e.target.value))}
                  aria-label="Выбор ключевого файла Tauri v2"
                  className="rounded border border-[var(--tz-outline)] bg-[var(--tz-inset)] px-2.5 py-1 font-mono text-xs text-[var(--tz-text)]"
                >
                  {bundleInfo.keyFiles.map((file, idx) => (
                    <option key={file.path} value={idx}>
                      {file.path} ({file.bytes} B)
                    </option>
                  ))}
                </select>
              )}
            </div>

            {selectedFile ? (
              <div className="flex-1 flex flex-col space-y-2">
                <div className="flex items-center justify-between gap-2 text-xs text-[var(--tz-muted)]">
                  <span>{selectedFile.roleRu}</span>
                  {selectedFile.previewText && (
                    <button
                      type="button"
                      onClick={() => handleCopy(selectedFile.path, selectedFile.previewText || '')}
                      className="inline-flex items-center gap-1 rounded border border-[var(--tz-outline)] bg-[var(--tz-button)] px-2 py-0.5 text-[11px] text-[var(--tz-text)] hover:bg-[var(--tz-hover)] shrink-0"
                    >
                      {copiedKey === selectedFile.path ? (
                        <Check className="h-3 w-3 text-emerald-500" />
                      ) : (
                        <Copy className="h-3 w-3" />
                      )}
                      <span>Копировать код</span>
                    </button>
                  )}
                </div>
                <pre className="max-h-[410px] overflow-auto rounded border border-[var(--tz-outline)] bg-[var(--tz-inset)] p-3 font-mono text-[11px] leading-relaxed text-[var(--tz-text)]">
                  {selectedFile.previewText ?? '[Бинарный RGBA PNG-ресурс]'}
                </pre>
              </div>
            ) : (
              <div className="p-6 text-xs text-[var(--tz-muted)]">
                Загрузка манифеста файлов Tauri v2…
              </div>
            )}
          </div>
        </div>

        {/* Bottom Table: 9 #[tauri::command] IPC Contract */}
        <div className="rounded border border-[var(--tz-outline)] bg-[var(--tz-window)] p-4 space-y-3">
          <div className="flex items-center gap-2">
            <Layers className="h-4 w-4 text-[var(--tz-link)]" />
            <h2 className="text-sm font-semibold text-[var(--tz-text)]">
              Контракт нативных команд Rust IPC (<code className="font-mono text-xs">#[tauri::command]</code> ↔{' '}
              <code className="font-mono text-xs">tikzarium-core</code>)
            </h2>
          </div>

          <div className="overflow-x-auto rounded border border-[var(--tz-outline)]">
            <table className="w-full border-collapse text-left text-xs">
              <thead className="bg-[var(--tz-panel)] text-[var(--tz-muted)]">
                <tr>
                  <th className="border-b border-[var(--tz-outline)] px-3 py-2">Команда IPC</th>
                  <th className="border-b border-[var(--tz-outline)] px-3 py-2">Привязка к крейтам Rust</th>
                  <th className="border-b border-[var(--tz-outline)] px-3 py-2">Назначение</th>
                  <th className="border-b border-[var(--tz-outline)] px-3 py-2">Инвариант безопасности</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--tz-outline)] bg-[var(--tz-inset)]/50">
                {TAURI_V2_IPC_CATALOG.map((item) => (
                  <tr key={item.command}>
                    <td className="px-3 py-2 align-top font-mono text-[11px] font-semibold text-[var(--tz-link)] whitespace-nowrap">
                      {item.command}
                    </td>
                    <td className="px-3 py-2 align-top font-mono text-[11px] text-[var(--tz-text)]">
                      {item.upstreamCrateBinding}
                    </td>
                    <td className="px-3 py-2 align-top text-[var(--tz-text)]">{item.purposeRu}</td>
                    <td className="px-3 py-2 align-top text-[var(--tz-muted)]">
                      <span className="inline-flex items-start gap-1">
                        <ShieldCheck className="h-3.5 w-3.5 text-emerald-500 shrink-0 mt-0.5" />
                        <span>{item.securityInvariantRu}</span>
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};
