import React, { useEffect, useMemo, useState } from 'react';
import {
  BookOpen,
  Check,
  Code2,
  Copy,
  Download,
  ExternalLink,
  FileText,
  FileUp,
  GitBranch,
  Layers,
  Play,
  Search,
  ShieldCheck,
  Terminal,
  X,
} from 'lucide-react';
import {
  BUILD_TIME_PDF_INDEXING_GUIDE,
  PDF_MANUAL_ANCHORS,
  PDF_MANUAL_DOCUMENTS,
  exportManualAnchorIndexJson,
  resolveManualAnchorById,
  resolveManualDocumentMeta,
  searchPdfManualAnchors,
} from '../domain/pdfManualAnchors';
import type {
  ManualDiagramPreviewKind,
  PdfManualAnchor,
  PdfManualDocId,
} from '../domain/pdfManualAnchors';
import {
  AGENT_JSONL_PRESETS,
  ALL_CONTROL_OPERATIONS_V2,
  StudioControlEngine,
  UPSTREAM_TEST_COMPATIBILITY_MATRIX,
  buildSelfContainedGitSyncShellScript,
  buildUpstreamMigrationArtifacts,
} from '../domain/studioControlApi';
import type { ControlJsonResponse, StudioControlSnapshot } from '../domain/studioControlApi';
import { isTauriRuntime, tauriRenderLocalManualPage } from '../domain/tauriNativeBridge';
import type { TauriManualPageRaster } from '../domain/tauriNativeBridge';

export type ManualModalTabId = 'reader' | 'build-pipeline' | 'agent-api-github';

interface PdfManualAnchorModalProps {
  isOpen: boolean;
  initialTab?: ManualModalTabId;
  activeAnchorId: string;
  currentSource: string;
  onSelectAnchor: (anchorId: string) => void;
  onInsertManualExample: (exampleTex: string, labelRu: string) => void;
  onApplyAgentSnapshotToGui: (snapshot: StudioControlSnapshot, summaryRu: string) => void;
  onOpenTauriBranchView?: () => void;
  onClose: () => void;
}

function renderManualVectorPreview(kind: ManualDiagramPreviewKind): React.ReactNode {
  switch (kind) {
    case 'arrow-tips':
      return (
        <svg viewBox="0 0 220 76" className="w-full h-20">
          <defs>
            <marker id="m-stealth" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto">
              <path d="M 0 1 L 10 5 L 0 9 L 3 5 z" fill="#1d4ed8" />
            </marker>
            <marker id="m-latex" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto">
              <path d="M 0 1.5 Q 5 5 10 5 Q 5 5 0 8.5 z" fill="#0f172a" />
            </marker>
          </defs>
          <line x1="18" y1="24" x2="150" y2="24" stroke="#1d4ed8" strokeWidth="2" markerEnd="url(#m-stealth)" />
          <text x="160" y="28" fontSize="10" fontFamily="monospace" fill="#1e293b">Stealth[length=3mm]</text>
          <line x1="18" y1="54" x2="150" y2="54" stroke="#0f172a" strokeWidth="1.8" markerEnd="url(#m-latex)" />
          <text x="160" y="58" fontSize="10" fontFamily="monospace" fill="#475569">Latex[open]</text>
        </svg>
      );
    case 'circuitikz':
      return (
        <svg viewBox="0 0 220 76" className="w-full h-20">
          <line x1="16" y1="38" x2="56" y2="38" stroke="#0f172a" strokeWidth="1.8" />
          <rect x="56" y="28" width="44" height="20" fill="none" stroke="#1d4ed8" strokeWidth="2" />
          <text x="68" y="22" fontSize="10" fontFamily="serif" fill="#1e293b">R₁</text>
          <line x1="100" y1="38" x2="146" y2="38" stroke="#0f172a" strokeWidth="1.8" />
          <line x1="146" y1="22" x2="146" y2="54" stroke="#1d4ed8" strokeWidth="2.2" />
          <line x1="156" y1="22" x2="156" y2="54" stroke="#1d4ed8" strokeWidth="2.2" />
          <text x="145" y="16" fontSize="10" fontFamily="serif" fill="#1e293b">C₁</text>
          <line x1="156" y1="38" x2="202" y2="38" stroke="#0f172a" strokeWidth="1.8" />
        </svg>
      );
    case 'pgfplots':
      return (
        <svg viewBox="0 0 220 76" className="w-full h-20">
          <line x1="28" y1="64" x2="202" y2="64" stroke="#0f172a" strokeWidth="1.5" />
          <line x1="28" y1="64" x2="28" y2="10" stroke="#0f172a" strokeWidth="1.5" />
          <line x1="28" y1="38" x2="200" y2="38" stroke="#cbd5e1" strokeDasharray="3 3" />
          <path d="M 30 60 Q 75 12, 120 38 T 198 18" fill="none" stroke="#1d4ed8" strokeWidth="2.2" />
          <circle cx="76" cy="26" r="2.8" fill="#1d4ed8" />
          <circle cx="120" cy="38" r="2.8" fill="#1d4ed8" />
          <circle cx="164" cy="28" r="2.8" fill="#1d4ed8" />
        </svg>
      );
    case 'chemfig':
      return (
        <svg viewBox="0 0 220 76" className="w-full h-20">
          <polygon
            points="70,14 96,28 96,54 70,68 44,54 44,28"
            fill="none"
            stroke="#0f172a"
            strokeWidth="1.8"
          />
          <circle cx="70" cy="41" r="14" fill="none" stroke="#1d4ed8" strokeDasharray="3 2" strokeWidth="1.4" />
          <line x1="96" y1="28" x2="128" y2="16" stroke="#0f172a" strokeWidth="1.8" />
          <text x="132" y="20" fontSize="11" fontFamily="sans-serif" fill="#1d4ed8">OH</text>
        </svg>
      );
    default:
      return (
        <svg viewBox="0 0 220 76" className="w-full h-20">
          <rect x="22" y="16" width="66" height="44" fill="#eff6ff" stroke="#1d4ed8" strokeWidth="1.7" />
          <line x1="88" y1="38" x2="138" y2="38" stroke="#0f172a" strokeWidth="1.8" />
          <circle cx="164" cy="38" r="22" fill="none" stroke="#0f172a" strokeWidth="1.7" />
          <circle cx="164" cy="38" r="2.5" fill="#1d4ed8" />
        </svg>
      );
  }
}

export const PdfManualAnchorModal: React.FC<PdfManualAnchorModalProps> = ({
  isOpen,
  initialTab = 'reader',
  activeAnchorId,
  currentSource,
  onSelectAnchor,
  onInsertManualExample,
  onApplyAgentSnapshotToGui,
  onOpenTauriBranchView,
  onClose,
}) => {
  const [tab, setTab] = useState<ManualModalTabId>(initialTab);
  const [docFilter, setDocFilter] = useState<PdfManualDocId | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Optional local TeX Live PDF blob URLs attached by user (zero bulk PDF redistribution!)
  const [attachedPdfUrls, setAttachedPdfUrls] = useState<Partial<Record<PdfManualDocId, string>>>({});
  const [nativeManualRaster, setNativeManualRaster] = useState<TauriManualPageRaster | null>(null);

  // Agent Control Console state
  const [selectedPresetId, setSelectedPresetId] = useState<string>(AGENT_JSONL_PRESETS[0].id);
  const [jsonlInput, setJsonlInput] = useState<string>(AGENT_JSONL_PRESETS[0].jsonl);
  const [agentResponses, setAgentResponses] = useState<ControlJsonResponse[] | null>(null);
  const [agentRunModeLabel, setAgentRunModeLabel] = useState<string>('');
  const [isRunningHttpApi, setIsRunningHttpApi] = useState(false);

  // GitHub OAuth / Device Flow / Migration state
  const [selectedArtifactIdx, setSelectedArtifactIdx] = useState(0);
  const [isLoadingGhStatus, setIsLoadingGhStatus] = useState(true);
  const [ghStatus, setGhStatus] = useState<{
    oauthConfigured: boolean;
    deviceFlowAvailable: boolean;
    envTokenConfigured: boolean;
    callbackUrl: string;
    authenticated: boolean;
    sessionId?: string | null;
    authMethod: 'oauth-session' | 'env-token' | null;
    openPr?: { number: number; htmlUrl: string; branchName: string; headSha: string } | null;
    openTauriPr?: { number: number; htmlUrl: string; branchName: string; headSha: string } | null;
    user: { login: string; avatarUrl: string } | null;
    authUrl?: string;
  } | null>(null);
  const [deviceFlowState, setDeviceFlowState] = useState<{
    flowId: string;
    userCode: string;
    verificationUri: string;
    intervalSec: number;
    statusText: string;
  } | null>(null);
  const [deviceFlowError, setDeviceFlowError] = useState<string | null>(null);
  const [isStartingDeviceFlow, setIsStartingDeviceFlow] = useState(false);
  const [branchNameInput, setBranchNameInput] = useState('feat/studio-v2-manual-api');
  const [prResult, setPrResult] = useState<{
    ok: boolean;
    prUrl?: string;
    prNumber?: number;
    branchName?: string;
    error?: string;
  } | null>(null);
  const [isPublishingPr, setIsPublishingPr] = useState(false);

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

  const clientCallbackUrl =
    typeof window !== 'undefined'
      ? `${window.location.origin}/auth/github/callback`
      : ghStatus?.callbackUrl ?? '/auth/github/callback';

  useEffect(() => {
    setTab(initialTab);
  }, [initialTab, isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onClose();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isOpen, onClose]);

  const refreshGithubStatus = async () => {
    try {
      const storedSid = readStoredGhSid();
      const res = await fetch('/api/github/status', {
        headers: storedSid ? { 'X-Tikzarium-Gh-Sid': storedSid } : undefined,
      });
      if (!res.ok) return;
      const statusJson = await res.json();
      if (statusJson.sessionId) {
        writeStoredGhSid(statusJson.sessionId);
      }
      let authUrl: string | undefined;
      if (statusJson.oauthConfigured && !statusJson.authenticated) {
        const originParam =
          typeof window !== 'undefined' ? `?origin=${encodeURIComponent(window.location.origin)}` : '';
        const uRes = await fetch(`/api/github/auth-url${originParam}`);
        if (uRes.ok) {
          const uJson = await uRes.json();
          authUrl = uJson.url;
        }
      }
      setGhStatus({ ...statusJson, authUrl });
      if (statusJson.authenticated) {
        setDeviceFlowState(null);
        setDeviceFlowError(null);
      }
    } catch {
      // Offline or preview fallback
    } finally {
      setIsLoadingGhStatus(false);
    }
  };

  useEffect(() => {
    if (!isOpen || tab !== 'agent-api-github') return;
    let cancelled = false;

    const safeRefresh = async () => {
      if (!cancelled) {
        await refreshGithubStatus();
      }
    };

    safeRefresh();

    const onMsg = (ev: MessageEvent) => {
      const origin = ev.origin || '';
      if (
        origin &&
        !origin.endsWith('.run.app') &&
        !origin.includes('localhost') &&
        origin !== window.location.origin
      ) {
        return;
      }
      if (ev.data && ev.data.type === 'OAUTH_AUTH_SUCCESS') {
        if (typeof ev.data.sessionId === 'string') {
          writeStoredGhSid(ev.data.sessionId);
        }
        safeRefresh();
      }
    };

    const onFocus = () => {
      safeRefresh();
    };

    window.addEventListener('message', onMsg);
    window.addEventListener('focus', onFocus);
    return () => {
      cancelled = true;
      window.removeEventListener('message', onMsg);
      window.removeEventListener('focus', onFocus);
    };
  }, [isOpen, tab]);

  // Automatic background polling while waiting for GitHub Device Flow confirmation on github.com/login/device
  useEffect(() => {
    if (!isOpen || tab !== 'agent-api-github' || !deviceFlowState) return;
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
          await refreshGithubStatus();
        } else if (data.status === 'pending') {
          setDeviceFlowState((prev) =>
            prev
              ? {
                  ...prev,
                  intervalSec: typeof data.intervalSec === 'number' ? data.intervalSec : prev.intervalSec,
                  statusText: data.message || prev.statusText,
                }
              : null
          );
        } else if (!res.ok) {
          setDeviceFlowState(null);
          setDeviceFlowError(data.error || 'Сессия подтверждения кода завершена');
        }
      } catch {
        // Keep waiting on transient network hiccup
      }
    }, pollMs);

    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [isOpen, tab, deviceFlowState]);

  const activeAnchor: PdfManualAnchor = useMemo(
    () => resolveManualAnchorById(activeAnchorId),
    [activeAnchorId]
  );

  const activeDocMeta = useMemo(
    () => resolveManualDocumentMeta(activeAnchor.docId),
    [activeAnchor.docId]
  );

  useEffect(() => {
    if (!isOpen || tab !== 'reader' || !isTauriRuntime()) {
      setNativeManualRaster(null);
      return;
    }
    let cancelled = false;
    void tauriRenderLocalManualPage(activeDocMeta.filename, activeAnchor.page)
      .then((res) => {
        if (!cancelled) {
          setNativeManualRaster(res && res.ok && res.pngDataUrl ? res : null);
        }
      })
      .catch(() => {
        if (!cancelled) setNativeManualRaster(null);
      });
    return () => {
      cancelled = true;
    };
  }, [activeAnchor.page, activeDocMeta.filename, isOpen, tab]);

  const filteredAnchors = useMemo(
    () => searchPdfManualAnchors(searchQuery, docFilter),
    [searchQuery, docFilter]
  );

  const migrationArtifacts = useMemo(() => buildUpstreamMigrationArtifacts(), []);

  const indexJsonDownloadUrl = useMemo(() => {
    const blob = new Blob([exportManualAnchorIndexJson()], { type: 'application/json' });
    return URL.createObjectURL(blob);
  }, []);

  const gitSyncScriptDownloadUrl = useMemo(() => {
    const blob = new Blob([buildSelfContainedGitSyncShellScript()], {
      type: 'text/x-shellscript;charset=utf-8',
    });
    return URL.createObjectURL(blob);
  }, []);

  useEffect(() => {
    return () => {
      URL.revokeObjectURL(indexJsonDownloadUrl);
      URL.revokeObjectURL(gitSyncScriptDownloadUrl);
    };
  }, [indexJsonDownloadUrl, gitSyncScriptDownloadUrl]);

  if (!isOpen) return null;

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard?.writeText(text).catch(() => {});
    setCopiedId(id);
    setTimeout(() => setCopiedId((prev) => (prev === id ? null : prev)), 1600);
  };

  const handleAttachLocalPdf = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    setAttachedPdfUrls((prev) => ({
      ...prev,
      [activeAnchor.docId]: url,
    }));
  };

  const handleRunAgentOnLiveGui = () => {
    const engine = new StudioControlEngine(currentSource);
    const results = engine.runJsonl(jsonlInput);
    const snap = engine.snapshot();
    setAgentResponses(results);
    const okCount = results.filter((r) => r.ok).length;
    setAgentRunModeLabel(
      `Живой буфер GUI: выполнено ${okCount}/${results.length} команд · ревизия #${snap.revision}`
    );
    onApplyAgentSnapshotToGui(
      snap,
      `API агента: выполнено ${okCount}/${results.length} JSONL-операций`
    );
  };

  const handleRunAgentViaHttpBackend = async () => {
    setIsRunningHttpApi(true);
    try {
      const res = await fetch('/api/qa-control', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          isolated: true,
          initialSource: currentSource,
          jsonl: jsonlInput,
        }),
      });
      const data = await res.json();
      if (Array.isArray(data.responses)) {
        setAgentResponses(data.responses);
        const okCount = data.responses.filter((r: ControlJsonResponse) => r.ok).length;
        setAgentRunModeLabel(
          `HTTP POST /api/qa-control: ${okCount}/${data.responses.length} команд · owned_count=${data.finalSnapshot?.owned_count ?? 0}`
        );
      }
    } catch (err) {
      setAgentResponses([
        { ok: false, error: err instanceof Error ? err.message : 'Ошибка сети /api/qa-control' },
      ]);
    } finally {
      setIsRunningHttpApi(false);
    }
  };

  const handleStartDeviceFlow = async () => {
    setIsStartingDeviceFlow(true);
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
        statusText: 'Введите код на github.com/login/device и нажмите Authorize — проверка идёт автоматически...',
      });
    } catch (err) {
      setDeviceFlowError(err instanceof Error ? err.message : 'Сетевая ошибка запуска Device Flow');
    } finally {
      setIsStartingDeviceFlow(false);
    }
  };

  const handleLogoutGithub = async () => {
    try {
      const storedSid = readStoredGhSid();
      await fetch('/api/github/logout', {
        method: 'POST',
        headers: storedSid ? { 'X-Tikzarium-Gh-Sid': storedSid } : undefined,
      });
      writeStoredGhSid(null);
      setPrResult(null);
      await refreshGithubStatus();
    } catch {
      // Ignore
    }
  };

  const handlePublishPullRequest = async () => {
    setIsPublishingPr(true);
    setPrResult(null);
    try {
      const cleanBranch = branchNameInput.trim();
      const storedSid = readStoredGhSid();
      const res = await fetch('/api/github/publish-pr', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(storedSid ? { 'X-Tikzarium-Gh-Sid': storedSid } : {}),
        },
        body: JSON.stringify(cleanBranch ? { branchName: cleanBranch } : {}),
      });
      const json = await res.json();
      setPrResult(json);
      if (json.ok) {
        await refreshGithubStatus();
      }
    } catch (err) {
      setPrResult({
        ok: false,
        error: err instanceof Error ? err.message : 'Сетевая ошибка обращения к GitHub API',
      });
    } finally {
      setIsPublishingPr(false);
    }
  };

  const attachedLocalPdfUrl = attachedPdfUrls[activeAnchor.docId];
  const bboxX = Math.round(activeAnchor.bboxNorm.x0 * 1000) / 10;
  const bboxY = Math.round(activeAnchor.bboxNorm.y0 * 1000) / 10;
  const bboxW = Math.round((activeAnchor.bboxNorm.x1 - activeAnchor.bboxNorm.x0) * 1000) / 10;
  const bboxH = Math.round((activeAnchor.bboxNorm.y1 - activeAnchor.bboxNorm.y0) * 1000) / 10;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-3"
      role="dialog"
      aria-modal="true"
      aria-label="Оригинальный PDF-мануал TikZ, предсборочная разметка и API агентов"
      onClick={onClose}
    >
      <div
        className="flex h-[90vh] w-full max-w-[1380px] flex-col overflow-hidden rounded border border-[var(--tz-outline)] bg-[var(--tz-panel)] text-[var(--tz-text)] shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Modal Header */}
        <div className="flex flex-wrap shrink-0 items-center justify-between gap-3 border-b border-[var(--tz-outline)] bg-[var(--tz-window)] px-4 py-2.5">
          <div className="flex items-center gap-2.5 min-w-0">
            <BookOpen className="h-4 w-4 text-[var(--tz-link)] shrink-0" />
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-sm font-semibold tracking-tight text-[var(--tz-text)]">
                  Оригинальные PDF-мануалы PGF/TikZ · Прямые точки и API синхронизации
                </h2>
                <span className="font-mono tabular-nums text-[11px] text-[var(--tz-muted)]">
                  {PDF_MANUAL_DOCUMENTS.length} PDF · {PDF_MANUAL_ANCHORS.length} якорей · {ALL_CONTROL_OPERATIONS_V2.length} API op
                </span>
              </div>
              <p className="text-[11px] text-[var(--tz-muted)] truncate">
                Прямой прыжок к секции и координате [x0..x1, y0..y1] в оригинальном руководстве + 100% паритет GUI↔API для тестов и агентов
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={() => setTab('reader')}
              className={`flex items-center gap-1.5 rounded border px-2.5 py-1.5 text-xs font-medium transition-colors whitespace-nowrap ${
                tab === 'reader'
                  ? 'border-[var(--tz-accent)] bg-[var(--tz-active)] text-[var(--tz-text)] font-semibold'
                  : 'border-[var(--tz-outline)] bg-[var(--tz-button)] text-[var(--tz-muted)] hover:bg-[var(--tz-hover)] hover:text-[var(--tz-text)]'
              }`}
            >
              <FileText className="h-3.5 w-3.5" />
              <span>1. PDF-мануал и прямые точки</span>
            </button>
            <button
              type="button"
              onClick={() => setTab('build-pipeline')}
              className={`flex items-center gap-1.5 rounded border px-2.5 py-1.5 text-xs font-medium transition-colors whitespace-nowrap ${
                tab === 'build-pipeline'
                  ? 'border-[var(--tz-accent)] bg-[var(--tz-active)] text-[var(--tz-text)] font-semibold'
                  : 'border-[var(--tz-outline)] bg-[var(--tz-button)] text-[var(--tz-muted)] hover:bg-[var(--tz-hover)] hover:text-[var(--tz-text)]'
              }`}
            >
              <Layers className="h-3.5 w-3.5" />
              <span>2. Сборка и разметка PDF</span>
            </button>
            <button
              type="button"
              onClick={() => setTab('agent-api-github')}
              className={`flex items-center gap-1.5 rounded border px-2.5 py-1.5 text-xs font-medium transition-colors whitespace-nowrap ${
                tab === 'agent-api-github'
                  ? 'border-[var(--tz-accent)] bg-[var(--tz-active)] text-[var(--tz-text)] font-semibold'
                  : 'border-[var(--tz-outline)] bg-[var(--tz-button)] text-[var(--tz-muted)] hover:bg-[var(--tz-hover)] hover:text-[var(--tz-text)]'
              }`}
            >
              <GitBranch className="h-3.5 w-3.5" />
              <span>3. API агентов &amp; GitHub tikzarium</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              title="Закрыть (Esc)"
              aria-label="Закрыть окно PDF-мануала"
              className="ml-1 rounded border border-[var(--tz-outline)] bg-[var(--tz-button)] p-1.5 text-[var(--tz-muted)] hover:bg-[var(--tz-hover)] hover:text-[var(--tz-text)]"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* TAB 1: DIRECT PDF MANUAL READER */}
        {tab === 'reader' && (
          <div className="grid min-h-0 flex-1 grid-cols-12">
            {/* Left Sidebar: Manuals & Anchor Index */}
            <div className="col-span-3 flex min-h-0 flex-col border-r border-[var(--tz-outline)] bg-[var(--tz-window)]">
              <div className="border-b border-[var(--tz-outline)] p-2.5 space-y-2">
                <div className="relative">
                  <Search className="pointer-events-none absolute left-2.5 top-2 h-3.5 w-3.5 text-[var(--tz-muted)]" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Команда (\addplot, Stealth, §16)..."
                    className="w-full rounded border border-[var(--tz-outline)] bg-[var(--tz-inset)] py-1.5 pl-8 pr-2 text-xs text-[var(--tz-text)] placeholder:text-[var(--tz-muted)]"
                  />
                </div>
                <select
                  value={docFilter}
                  onChange={(e) => setDocFilter(e.target.value as PdfManualDocId | 'all')}
                  aria-label="Фильтр PDF-руководства"
                  className="w-full rounded border border-[var(--tz-outline)] bg-[var(--tz-inset)] px-2 py-1 text-xs text-[var(--tz-text)]"
                >
                  <option value="all">Все руководства ({PDF_MANUAL_DOCUMENTS.length} PDF)</option>
                  {PDF_MANUAL_DOCUMENTS.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.filename} (v{d.version}, {d.totalPages} стр.)
                    </option>
                  ))}
                </select>
              </div>

              <div className="min-h-0 flex-1 overflow-y-auto divide-y divide-[var(--tz-outline)]/60">
                {filteredAnchors.map((anchor) => {
                  const docMeta = resolveManualDocumentMeta(anchor.docId);
                  const selected = anchor.id === activeAnchor.id;
                  return (
                    <button
                      key={anchor.id}
                      type="button"
                      onClick={() => onSelectAnchor(anchor.id)}
                      className={`w-full px-3 py-2 text-left transition-colors ${
                        selected
                          ? 'bg-[var(--tz-active)] ring-1 ring-inset ring-[var(--tz-accent)]'
                          : 'hover:bg-[var(--tz-hover)]'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-1 text-[10px] font-mono tabular-nums text-[var(--tz-muted)]">
                        <span className="truncate text-[var(--tz-link)]">{docMeta.filename}</span>
                        <span className="shrink-0">{anchor.section} · стр. {anchor.page}</span>
                      </div>
                      <div className="mt-0.5 text-xs font-medium text-[var(--tz-text)] line-clamp-2">
                        {anchor.titleRu}
                      </div>
                      <div className="mt-1 font-mono text-[10px] text-[var(--tz-muted)] truncate">
                        {anchor.matchedTokens.slice(0, 4).join(' · ')}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Center Column: Authentic Original PDF Page Sheet + Normalized BBox Reticle */}
            <div className="col-span-5 flex min-h-0 flex-col border-r border-[var(--tz-outline)] bg-[var(--tz-panel)]">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--tz-outline)] bg-[var(--tz-window)] px-3 py-2 text-[11px]">
                <div className="flex items-center gap-1.5 font-mono tabular-nums">
                  <span className="font-semibold text-[var(--tz-link)]">
                    {activeDocMeta.filename}
                  </span>
                  <span aria-hidden="true" className="text-[var(--tz-muted)]">·</span>
                  <span className="text-[var(--tz-text)]">
                    стр. <strong>{activeAnchor.page}</strong> / {activeDocMeta.totalPages}
                  </span>
                  <span aria-hidden="true" className="text-[var(--tz-muted)]">·</span>
                  <span className="text-[var(--tz-muted)]">#{activeAnchor.namedDest}</span>
                </div>

                <label className="flex cursor-pointer items-center gap-1.5 rounded border border-[var(--tz-outline)] bg-[var(--tz-button)] px-2 py-1 text-[11px] text-[var(--tz-text)] hover:bg-[var(--tz-hover)] whitespace-nowrap">
                  <FileUp className="h-3.5 w-3.5 text-[var(--tz-link)]" />
                  <span>Открыть локальный {activeDocMeta.filename}</span>
                  <input
                    type="file"
                    accept="application/pdf"
                    onChange={handleAttachLocalPdf}
                    className="hidden"
                  />
                </label>
              </div>

              <div className="min-h-0 flex-1 overflow-y-auto p-4 bg-[var(--tz-inset)]">
                {attachedLocalPdfUrl ? (
                  <div className="flex h-full min-h-[520px] flex-col gap-2">
                    <div className="flex items-center justify-between rounded border border-emerald-500/40 bg-emerald-500/10 px-2.5 py-1 text-[11px] text-[var(--tz-text)]">
                      <span>
                        Подключён локальный PDF → открыта прямая точка{' '}
                        <code className="font-mono">
                          #page={activeAnchor.page}&amp;nameddest={activeAnchor.namedDest}
                        </code>
                      </span>
                      <button
                        type="button"
                        onClick={() =>
                          setAttachedPdfUrls((prev) => ({ ...prev, [activeAnchor.docId]: undefined }))
                        }
                        className="text-[var(--tz-link)] underline"
                      >
                        Вернуться к макету якоря
                      </button>
                    </div>
                    <object
                      data={`${attachedLocalPdfUrl}#page=${activeAnchor.page}&nameddest=${activeAnchor.namedDest}`}
                      type="application/pdf"
                      className="w-full flex-1 rounded border border-[var(--tz-outline)] bg-white"
                    >
                      <p className="p-4 text-xs text-[var(--tz-muted)]">
                        Встроенный просмотрщик PDF недоступен в этом браузере.
                      </p>
                    </object>
                  </div>
                ) : nativeManualRaster?.pngDataUrl ? (
                  <div className="space-y-2">
                    <div className="rounded border border-emerald-500/40 bg-emerald-500/10 px-2.5 py-1 text-[11px] text-[var(--tz-text)]">
                      Локальный PDF TeX Live (<code className="font-mono">{nativeManualRaster.resolvedPdfPath}</code>) · стр.{' '}
                      <strong>{nativeManualRaster.page}</strong> растеризована через Tauri IPC (<code className="font-mono">tz_render_manual_page</code>)
                    </div>
                    <div className="relative mx-auto max-w-[560px] rounded-sm border border-slate-400 bg-white shadow-lg">
                      <img
                        src={nativeManualRaster.pngDataUrl}
                        alt={`${activeDocMeta.filename} стр. ${activeAnchor.page}`}
                        className="block w-full h-auto"
                      />
                      <svg
                        viewBox="0 0 100 100"
                        preserveAspectRatio="none"
                        aria-hidden="true"
                        className="pointer-events-none absolute inset-0 h-full w-full"
                      >
                        <rect
                          x={bboxX}
                          y={bboxY}
                          width={bboxW}
                          height={bboxH}
                          fill="rgba(37, 99, 235, 0.14)"
                          stroke="#2563eb"
                          strokeWidth="0.6"
                          strokeDasharray="1.5 1"
                        />
                      </svg>
                    </div>
                  </div>
                ) : (
                  /* Simulated Computer-Modern TeX Manual Sheet with Exact Normalized BBox Reticle */
                  <div className="relative mx-auto max-w-[540px] rounded-sm border border-slate-400 bg-[#fcfbf7] p-6 text-slate-900 shadow-lg">
                    {/* Normalized [0..1] BBox SVG Overlay (zero inline CSS styles!) */}
                    <svg
                      viewBox="0 0 100 100"
                      preserveAspectRatio="none"
                      className="pointer-events-none absolute inset-0 h-full w-full"
                    >
                      <rect
                        x={bboxX}
                        y={bboxY}
                        width={bboxW}
                        height={bboxH}
                        fill="rgba(37, 99, 235, 0.07)"
                        stroke="#2563eb"
                        strokeWidth="0.45"
                        strokeDasharray="1.4 0.9"
                      />
                    </svg>

                    {/* Running Header of Original TeX Manual */}
                    <div className="flex items-center justify-between border-b border-slate-300 pb-1.5 font-serif text-[11px] italic text-slate-600">
                      <span>{activeDocMeta.titleEn} (v{activeDocMeta.version})</span>
                      <span className="not-italic font-semibold tabular-nums text-slate-800">{activeAnchor.page}</span>
                    </div>

                    {/* Section Heading */}
                    <div className="mt-4">
                      <div className="flex items-baseline justify-between gap-2">
                        <h3 className="font-serif text-sm font-bold text-slate-900">
                          {activeAnchor.chapterTitleEn}
                        </h3>
                        <span className="shrink-0 font-mono text-[10px] text-blue-800">
                          #{activeAnchor.namedDest}
                        </span>
                      </div>

                      {/* Target Declaration Box inside Normalized BBox (hairline border, zero thick left bar) */}
                      <div className="mt-3 rounded-sm border border-blue-300 bg-blue-50/75 p-2.5">
                        <div className="flex items-center justify-between text-[10px] font-mono tabular-nums text-blue-900">
                          <span>Declaration ({activeAnchor.section})</span>
                          <span>
                            bbox=[{activeAnchor.bboxNorm.x0.toFixed(2)}, {activeAnchor.bboxNorm.y0.toFixed(2)} →{' '}
                            {activeAnchor.bboxNorm.x1.toFixed(2)}, {activeAnchor.bboxNorm.y1.toFixed(2)}]
                          </span>
                        </div>
                        <pre className="mt-1.5 whitespace-pre-wrap break-words font-mono text-[11.5px] font-semibold text-slate-900">
                          {activeAnchor.originalDeclarationEn}
                        </pre>
                      </div>

                      {/* Original English Manual Excerpt */}
                      <p className="mt-3 font-serif text-xs leading-relaxed text-slate-800">
                        {activeAnchor.originalExcerptEn}
                      </p>

                      {/* Side-by-side Manual Illustration + Minimal TeX Listing */}
                      <div className="mt-4 grid grid-cols-1 gap-3 rounded-sm border border-slate-300 bg-white p-3">
                        <div className="border-b border-slate-200 pb-2">
                          {renderManualVectorPreview(activeAnchor.previewKind)}
                        </div>
                        <pre className="overflow-x-auto font-mono text-[11px] leading-snug text-slate-800">
                          {activeAnchor.originalExampleTex}
                        </pre>
                      </div>
                    </div>

                    <div className="mt-4 flex items-center justify-between border-t border-slate-200 pt-2 font-mono text-[10px] text-slate-500">
                      <span>texdoc {activeDocMeta.texdocKey}</span>
                      <span>SHA-256: {activeDocMeta.sha256Short}</span>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Right Column: Russian Engineering Notes + 1-Click Insertion */}
            <div className="col-span-4 flex min-h-0 flex-col bg-[var(--tz-panel)] p-4 overflow-y-auto space-y-4">
              <div className="rounded border border-[var(--tz-outline)] bg-[var(--tz-window)] p-3.5">
                <div className="text-[11px] font-medium text-[var(--tz-link)]">
                  Инженерный разбор к секции {activeAnchor.section}
                </div>
                <h4 className="mt-1 text-sm font-semibold text-[var(--tz-text)]">{activeAnchor.titleRu}</h4>
                <p className="mt-2 text-xs leading-relaxed text-[var(--tz-muted)]">
                  {activeAnchor.russianCommentaryRu}
                </p>
              </div>

              <div className="rounded border border-[var(--tz-outline)] bg-[var(--tz-window)] p-3.5 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-[var(--tz-text)]">
                    Эталонный фрагмент из {activeDocMeta.filename}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleCopy('manual-ex', activeAnchor.originalExampleTex)}
                    className="flex items-center gap-1 rounded border border-[var(--tz-outline)] bg-[var(--tz-button)] px-2 py-1 text-[11px] text-[var(--tz-text)] hover:bg-[var(--tz-hover)]"
                  >
                    {copiedId === 'manual-ex' ? (
                      <Check className="h-3 w-3 text-emerald-500" />
                    ) : (
                      <Copy className="h-3 w-3" />
                    )}
                    <span>Копировать</span>
                  </button>
                </div>
                <pre className="max-h-48 overflow-auto rounded border border-[var(--tz-outline)] bg-[var(--tz-inset)] p-2.5 font-mono text-[11px] text-[var(--tz-text)]">
                  {activeAnchor.originalExampleTex}
                </pre>
                <button
                  type="button"
                  onClick={() => {
                    onInsertManualExample(activeAnchor.originalExampleTex, activeAnchor.titleRu);
                    onClose();
                  }}
                  className="flex w-full items-center justify-center gap-2 rounded bg-[var(--tz-accent)] px-3 py-2 text-xs font-semibold text-white hover:opacity-95"
                >
                  <Code2 className="h-3.5 w-3.5" />
                  <span>Вставить пример и пакеты в текущий рисунок</span>
                </button>
              </div>

              <div className="rounded border border-[var(--tz-outline)] bg-[var(--tz-window)] p-3 text-[11px] text-[var(--tz-muted)] space-y-1.5">
                <div className="font-semibold text-[var(--tz-text)]">
                  Как это работает в нативном Rust/egui (без коммита 50 МБ PDF в Git):
                </div>
                <p>
                  По правилу <code className="font-mono text-[var(--tz-text)]">AGENTS.md #5</code> полные PDF не
                  перераспределяются пачкой в репозитории: приложение хранит компактный предразмеченный
                  индекс <code className="font-mono text-[var(--tz-text)]">manual_anchors.index.json</code>, находит
                  локальный <code className="font-mono text-[var(--tz-text)]">{activeDocMeta.filename}</code> через{' '}
                  <code className="font-mono text-[var(--tz-text)]">kpsewhich</code>, рендерит ровно одну страницу{' '}
                  <code className="font-mono text-[var(--tz-text)]">pdftoppm -f {activeAnchor.page} -l {activeAnchor.page}</code>{' '}
                  и подсвечивает декларацию рамкой <code className="font-mono text-[var(--tz-text)]">egui::Painter::rect_stroke</code>.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: ONE-TIME EXTERNAL BUILD-TIME PDF INDEXING GUIDE */}
        {tab === 'build-pipeline' && (
          <div className="min-h-0 flex-1 overflow-y-auto p-5 space-y-5 bg-[var(--tz-panel)]">
            <div className="flex flex-wrap items-center justify-between gap-3 rounded border border-[var(--tz-outline)] bg-[var(--tz-window)] p-4">
              <div className="max-w-3xl">
                <h3 className="text-sm font-semibold text-[var(--tz-text)]">
                  Инструкция однократной сторонней разметки PDF-документации при сборке приложения
                </h3>
                <p className="mt-1 text-xs text-[var(--tz-muted)]">
                  Выполняется один раз на сборочной машине разработчика (или в release-пайплайне): сторонние
                  утилиты <code className="font-mono text-[var(--tz-link)]">kpsewhich</code>,{' '}
                  <code className="font-mono text-[var(--tz-link)]">PyMuPDF (fitz) / mutool</code> и{' '}
                  <code className="font-mono text-[var(--tz-link)]">qpdf</code> извлекают точные страницы,{' '}
                  <code className="font-mono text-[var(--tz-link)]">NamedDest</code> и нормализованные координаты{' '}
                  <code className="font-mono text-[var(--tz-link)]">[0..1]</code> всех команд в статический индекс для{' '}
                  <code className="font-mono text-[var(--tz-link)]">cargo build</code>.
                </p>
              </div>
              <a
                href={indexJsonDownloadUrl}
                download="manual_anchors.index.json"
                className="flex items-center gap-1.5 rounded bg-[var(--tz-accent)] px-3 py-2 text-xs font-semibold text-white hover:opacity-95 whitespace-nowrap"
              >
                <Download className="h-3.5 w-3.5" />
                <span>Скачать готовый manual_anchors.index.json</span>
              </a>
            </div>

            <div className="grid grid-cols-1 gap-4">
              {BUILD_TIME_PDF_INDEXING_GUIDE.map((step) => (
                <div
                  key={step.stepNumber}
                  className="rounded border border-[var(--tz-outline)] bg-[var(--tz-window)] p-4 space-y-2.5"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <h4 className="text-sm font-semibold text-[var(--tz-text)]">
                      {step.stepNumber}. {step.titleRu}
                    </h4>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-[11px] text-[var(--tz-muted)]">{step.filename}</span>
                      <button
                        type="button"
                        onClick={() => handleCopy(step.filename, step.code)}
                        className="flex items-center gap-1 rounded border border-[var(--tz-outline)] bg-[var(--tz-button)] px-2 py-1 text-[11px] text-[var(--tz-text)] hover:bg-[var(--tz-hover)]"
                      >
                        {copiedId === step.filename ? (
                          <Check className="h-3 w-3 text-emerald-500" />
                        ) : (
                          <Copy className="h-3 w-3" />
                        )}
                        <span>Копировать скрипт</span>
                      </button>
                    </div>
                  </div>
                  <div className="text-[11px] font-mono text-[var(--tz-link)]">{step.toolStackRu}</div>
                  <p className="text-xs text-[var(--tz-muted)]">{step.explanationRu}</p>
                  <pre className="max-h-64 overflow-auto rounded border border-[var(--tz-outline)] bg-[var(--tz-inset)] p-3 font-mono text-[11px] leading-relaxed text-[var(--tz-text)]">
                    {step.code}
                  </pre>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 3: 100% GUI<->API PARITY CONSOLE & UPSTREAM GITHUB i-shutov/tikzarium SYNC */}
        {tab === 'agent-api-github' && (
          <div className="grid min-h-0 flex-1 grid-cols-12 bg-[var(--tz-panel)]">
            {/* Left Half: Interactive JSONL Agent Control API Runner */}
            <div className="col-span-6 flex min-h-0 flex-col border-r border-[var(--tz-outline)] p-4 space-y-3 overflow-y-auto">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="flex items-center gap-2">
                    <Terminal className="h-4 w-4 text-[var(--tz-link)]" />
                    <h3 className="text-sm font-semibold text-[var(--tz-text)]">
                      Консоль API управления и тестирования (tikzarium-qa-control v2)
                    </h3>
                  </div>
                  <p className="mt-0.5 text-xs text-[var(--tz-muted)]">
                    100% паритет GUI↔API: все 24 команды v1 сохранены + добавлены 25 операций v2 (преамбула, 12 расширений, мастерские и PDF-якоря).
                  </p>
                </div>
                <span className="shrink-0 font-mono tabular-nums text-[11px] text-[var(--tz-link)]">
                  {ALL_CONTROL_OPERATIONS_V2.length} операций JSONL
                </span>
              </div>

              <div className="space-y-1.5">
                <label className="block text-[11px] font-medium text-[var(--tz-muted)]">
                  Готовый сценарий для ИИ-агента / автотеста:
                </label>
                <select
                  value={selectedPresetId}
                  onChange={(e) => {
                    const next = AGENT_JSONL_PRESETS.find((p) => p.id === e.target.value);
                    setSelectedPresetId(e.target.value);
                    if (next) setJsonlInput(next.jsonl);
                  }}
                  aria-label="Сценарий JSONL для агента"
                  className="w-full rounded border border-[var(--tz-outline)] bg-[var(--tz-window)] px-2.5 py-1.5 text-xs text-[var(--tz-text)]"
                >
                  {AGENT_JSONL_PRESETS.map((pr) => (
                    <option key={pr.id} value={pr.id}>
                      {pr.titleRu}
                    </option>
                  ))}
                </select>
                <p className="text-[11px] text-[var(--tz-muted)]">
                  {AGENT_JSONL_PRESETS.find((p) => p.id === selectedPresetId)?.descriptionRu}
                </p>
              </div>

              <div className="space-y-1">
                <div className="flex items-center justify-between text-[11px] text-[var(--tz-muted)]">
                  <span>Пакет команд JSONL (по одной JSON-операции на строку):</span>
                  <span className="font-mono">POST /api/qa-control</span>
                </div>
                <textarea
                  value={jsonlInput}
                  onChange={(e) => setJsonlInput(e.target.value)}
                  rows={6}
                  spellCheck={false}
                  className="w-full rounded border border-[var(--tz-outline)] bg-[var(--tz-inset)] p-2.5 font-mono text-xs text-[var(--tz-syn-cmd)]"
                />
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={handleRunAgentOnLiveGui}
                  className="flex items-center gap-1.5 rounded bg-[var(--tz-accent)] px-3 py-1.5 text-xs font-semibold text-white hover:opacity-95"
                >
                  <Play className="h-3.5 w-3.5" />
                  <span>Выполнить на живом окне GUI</span>
                </button>
                <button
                  type="button"
                  onClick={handleRunAgentViaHttpBackend}
                  disabled={isRunningHttpApi}
                  className="flex items-center gap-1.5 rounded border border-[var(--tz-outline)] bg-[var(--tz-button)] px-3 py-1.5 text-xs font-medium text-[var(--tz-text)] hover:bg-[var(--tz-hover)] disabled:opacity-50"
                >
                  <ShieldCheck className="h-3.5 w-3.5 text-[var(--tz-link)]" />
                  <span>{isRunningHttpApi ? 'Выполнение...' : 'Проверить через POST /api/qa-control'}</span>
                </button>
              </div>

              {agentResponses && (
                <div className="rounded border border-[var(--tz-outline)] bg-[var(--tz-inset)] p-2.5 space-y-1.5">
                  <div className="text-[11px] font-mono text-[var(--tz-link)]">{agentRunModeLabel}</div>
                  <pre className="max-h-52 overflow-auto font-mono text-[10.5px] leading-relaxed text-[var(--tz-text)]">
                    {agentResponses.map((r, i) => `#${i + 1} ${JSON.stringify(r)}`).join('\n\n')}
                  </pre>
                </div>
              )}

              <div className="rounded border border-[var(--tz-outline)] bg-[var(--tz-window)] p-2.5">
                <div className="text-[11px] font-semibold text-[var(--tz-text)]">
                  Полный реестр операций API v2 (1:1 с кнопками и мастерскими GUI):
                </div>
                <div className="mt-1.5 font-mono text-[10.5px] leading-relaxed text-[var(--tz-muted)]">
                  {ALL_CONTROL_OPERATIONS_V2.join(' · ')}
                </div>
              </div>
            </div>

            {/* Right Half: Test Migration Matrix + GitHub Publication to i-shutov/tikzarium */}
            <div className="col-span-6 flex min-h-0 flex-col p-4 space-y-4 overflow-y-auto">
              {/* Publication Card */}
              <div className="rounded border border-[var(--tz-outline)] bg-[var(--tz-window)] p-3.5 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <h3 className="text-sm font-semibold text-[var(--tz-text)]">
                      Публикация в репозиторий <span className="font-mono text-[var(--tz-link)]">i-shutov/tikzarium</span>
                    </h3>
                    <p className="text-[11px] text-[var(--tz-muted)]">
                      Сверено с актуальным деревом <code className="font-mono">HEAD 0a98314</code> (4 крейта Rust, контракт AGENTS.md)
                    </p>
                  </div>
                  <a
                    href={gitSyncScriptDownloadUrl}
                    download="tikzarium-studio-v2-sync.sh"
                    className="flex items-center gap-1.5 rounded bg-[var(--tz-accent)] px-3 py-1.5 text-xs font-semibold text-white hover:opacity-95 whitespace-nowrap"
                  >
                    <Download className="h-3.5 w-3.5" />
                    <span>Скачать скрипт ветки + cargo test (.sh)</span>
                  </a>
                </div>

                {/* GitHub OAuth / Device Flow Session & Active PR Card */}
                <div className="rounded border border-[var(--tz-outline)] bg-[var(--tz-inset)] p-3 text-xs space-y-2.5">
                  {ghStatus?.openPr && (
                    <div className="flex flex-wrap items-center justify-between gap-2 rounded border border-emerald-500/40 bg-emerald-500/10 px-2.5 py-1.5 text-[11px] text-[var(--tz-text)]">
                      <span>
                        Активный Pull Request:{' '}
                        <strong className="font-mono tabular-nums">
                          #{ghStatus.openPr.number} ({ghStatus.openPr.branchName} · {ghStatus.openPr.headSha})
                        </strong>
                      </span>
                      <a
                        href={ghStatus.openPr.htmlUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 font-semibold text-[var(--tz-link)] underline"
                      >
                        <span>Открыть PR #{ghStatus.openPr.number} на GitHub</span>
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    </div>
                  )}

                  {onOpenTauriBranchView && (
                    <div className="flex flex-wrap items-center justify-between gap-2 rounded border border-[var(--tz-accent)]/50 bg-[var(--tz-accent)]/10 px-2.5 py-2 text-[11px] text-[var(--tz-text)]">
                      <div>
                        <div className="font-semibold">
                          Отдельная десктопная ветка <code className="font-mono text-[var(--tz-link)]">feat/tauri-v2-studio</code> (Tauri v2 + Rust)
                        </div>
                        <div className="text-[10.5px] text-[var(--tz-muted)]">
                          Изолирована в <code className="font-mono">apps/tikzarium-studio-tauri/</code> — не затрагивает PR #190 и корневой <code className="font-mono">Cargo.lock</code>.
                          {ghStatus?.openTauriPr ? ` Открыт PR #${ghStatus.openTauriPr.number}.` : ''}
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={onOpenTauriBranchView}
                        className="rounded bg-[var(--tz-accent)] px-2.5 py-1 text-xs font-semibold text-white hover:opacity-95 whitespace-nowrap"
                      >
                        Открыть стенд ветки Tauri v2 →
                      </button>
                    </div>
                  )}

                  {isLoadingGhStatus && !ghStatus ? (
                    <div className="text-[11px] text-[var(--tz-muted)]">
                      Проверка подключённой сессии GitHub…
                    </div>
                  ) : ghStatus?.authenticated ? (
                    <div className="space-y-2.5">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-2 text-[var(--tz-text)]">
                          <span>
                            GitHub подключён: <strong className="text-emerald-500">@{ghStatus.user?.login}</strong>
                          </span>
                          <span aria-hidden="true" className="text-[var(--tz-muted)]">·</span>
                          <span className="font-mono text-[10.5px] text-[var(--tz-muted)]">OAuth App</span>
                        </div>
                        {ghStatus.authMethod === 'oauth-session' && (
                          <button
                            type="button"
                            onClick={handleLogoutGithub}
                            className="rounded border border-[var(--tz-outline)] bg-[var(--tz-button)] px-2 py-0.5 text-[11px] text-[var(--tz-muted)] hover:bg-[var(--tz-hover)] hover:text-[var(--tz-text)]"
                          >
                            Отключить сессию
                          </button>
                        )}
                      </div>

                      <div className="flex flex-wrap items-center gap-2">
                        <input
                          type="text"
                          value={branchNameInput}
                          onChange={(e) => setBranchNameInput(e.target.value)}
                          aria-label="Имя новой ветки для Pull Request"
                          placeholder="feat/studio-v2-manual-api"
                          className="min-w-[210px] flex-1 rounded border border-[var(--tz-outline)] bg-[var(--tz-window)] px-2.5 py-1 font-mono text-[11px] text-[var(--tz-text)]"
                        />
                        <button
                          type="button"
                          onClick={handlePublishPullRequest}
                          disabled={isPublishingPr}
                          className="rounded bg-[var(--tz-accent)] px-3 py-1.5 text-xs font-semibold text-white hover:opacity-95 disabled:opacity-50 whitespace-nowrap"
                        >
                          {isPublishingPr
                            ? 'Коммит и пуш в GitHub...'
                            : ghStatus?.openPr && branchNameInput.trim() === ghStatus.openPr.branchName
                              ? `Коммит и пуш в PR #${ghStatus.openPr.number} (${ghStatus.openPr.branchName})`
                              : 'Создать ветку и Pull Request в i-shutov/tikzarium'}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-2.5">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="font-semibold text-[var(--tz-text)]">
                          Сессия GitHub OAuth отключена:
                        </span>
                        <div className="flex flex-wrap items-center gap-1.5">
                          {ghStatus?.deviceFlowAvailable && (
                            <button
                              type="button"
                              onClick={handleStartDeviceFlow}
                              disabled={isStartingDeviceFlow}
                              className="inline-flex items-center gap-1 rounded bg-[var(--tz-accent)] px-2.5 py-1 text-xs font-semibold text-white hover:opacity-95 disabled:opacity-50"
                            >
                              <span>
                                {isStartingDeviceFlow
                                  ? 'Запрос кода...'
                                  : 'Войти через GitHub (Device Flow)'}
                              </span>
                            </button>
                          )}
                          {ghStatus?.oauthConfigured && ghStatus.authUrl && (
                            <a
                              href={ghStatus.authUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 rounded border border-[var(--tz-outline)] bg-[var(--tz-button)] px-2.5 py-1 text-xs font-medium text-[var(--tz-link)] hover:bg-[var(--tz-hover)]"
                            >
                              <span>Войти через OAuth Callback</span>
                              <ExternalLink className="h-3 w-3" />
                            </a>
                          )}
                        </div>
                      </div>

                      {deviceFlowState && (
                        <div className="rounded border border-[var(--tz-accent)]/50 bg-[var(--tz-window)] p-2.5 space-y-2">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <div className="flex items-center gap-2">
                              <span className="text-[11px] text-[var(--tz-muted)]">Ваш одноразовый код:</span>
                              <code className="rounded border border-[var(--tz-outline)] bg-[var(--tz-inset)] px-2 py-0.5 font-mono text-sm font-bold tracking-widest text-[var(--tz-link)]">
                                {deviceFlowState.userCode}
                              </code>
                              <button
                                type="button"
                                onClick={() => handleCopy('gh-device-code', deviceFlowState.userCode)}
                                className="inline-flex items-center gap-1 rounded border border-[var(--tz-outline)] bg-[var(--tz-button)] px-2 py-0.5 text-[10px] text-[var(--tz-text)] hover:bg-[var(--tz-hover)]"
                              >
                                {copiedId === 'gh-device-code' ? (
                                  <Check className="h-3 w-3 text-emerald-500" />
                                ) : (
                                  <Copy className="h-3 w-3" />
                                )}
                                <span>Копировать код</span>
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

                      {ghStatus && !ghStatus.deviceFlowAvailable && !ghStatus.oauthConfigured && (
                        <div className="text-[11px] text-[var(--tz-muted)]">
                          Для OAuth-подключения укажите Client ID вашего приложения GitHub (<code className="font-mono text-[var(--tz-text)]">GITHUB_CLIENT_ID</code>, Callback URL: <code className="font-mono text-[var(--tz-text)]">{clientCallbackUrl}</code>).
                        </div>
                      )}
                    </div>
                  )}

                  {prResult && (
                    <div
                      className={`rounded border p-2 text-[11px] ${
                        prResult.ok
                          ? 'border-emerald-500/40 bg-emerald-500/10 text-[var(--tz-text)]'
                          : 'border-rose-500/40 bg-rose-500/10 text-rose-500'
                      }`}
                    >
                      {prResult.ok && prResult.prUrl ? (
                        <a
                          href={prResult.prUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-[var(--tz-link)] underline"
                        >
                          <span>Открыт Pull Request #{prResult.prNumber} ({prResult.branchName})</span>
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      ) : (
                        <span>{prResult.error}</span>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Test Compatibility Matrix */}
              <div className="space-y-2">
                <h4 className="text-xs font-semibold text-[var(--tz-text)]">
                  Ревизия существующих автотестов в i-shutov/tikzarium (что менять и что сохранено)
                </h4>
                <div className="overflow-hidden rounded border border-[var(--tz-outline)]">
                  <table className="w-full border-collapse text-left text-[11px]">
                    <thead className="bg-[var(--tz-window)] text-[var(--tz-muted)]">
                      <tr>
                        <th className="border-b border-[var(--tz-outline)] px-2.5 py-1.5">Тест в репозитории</th>
                        <th className="border-b border-[var(--tz-outline)] px-2.5 py-1.5">Статус</th>
                        <th className="border-b border-[var(--tz-outline)] px-2.5 py-1.5">Решение при замене UI</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[var(--tz-outline)] bg-[var(--tz-inset)]/60">
                      {UPSTREAM_TEST_COMPATIBILITY_MATRIX.map((row) => (
                        <tr key={row.testName}>
                          <td className="px-2.5 py-2 align-top">
                            <div className="font-mono text-[10.5px] font-semibold text-[var(--tz-text)]">
                              {row.testName}
                            </div>
                            <div className="font-mono text-[10px] text-[var(--tz-muted)]">{row.crateAndFile}</div>
                          </td>
                          <td className="px-2.5 py-2 align-top whitespace-nowrap font-mono text-[10.5px]">
                            {row.impactStatus === 'pass-unchanged' && (
                              <span className="text-emerald-500 font-medium">Без правок</span>
                            )}
                            {row.impactStatus === 'update-assert' && (
                              <span className="text-amber-500 font-medium">Расширить</span>
                            )}
                            {row.impactStatus === 'new-v2-test' && (
                              <span className="text-[var(--tz-link)] font-medium">Новый тест</span>
                            )}
                          </td>
                          <td className="px-2.5 py-2 align-top text-[var(--tz-muted)]">{row.migrationActionRu}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Generated Rust / Python Migration Files Preview */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-[var(--tz-text)]">
                    Генерируемые файлы пакета миграции ({migrationArtifacts.length}):
                  </span>
                  <select
                    value={selectedArtifactIdx}
                    onChange={(e) => setSelectedArtifactIdx(Number(e.target.value))}
                    aria-label="Выбор файла миграции"
                    className="rounded border border-[var(--tz-outline)] bg-[var(--tz-window)] px-2 py-1 font-mono text-[11px] text-[var(--tz-text)]"
                  >
                    {migrationArtifacts.map((f, idx) => (
                      <option key={f.path} value={idx}>
                        {f.path}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="rounded border border-[var(--tz-outline)] bg-[var(--tz-inset)] p-2.5">
                  <div className="flex items-center justify-between text-[11px] text-[var(--tz-muted)]">
                    <span>{migrationArtifacts[selectedArtifactIdx]?.roleRu}</span>
                    <button
                      type="button"
                      onClick={() =>
                        handleCopy(
                          migrationArtifacts[selectedArtifactIdx].path,
                          migrationArtifacts[selectedArtifactIdx].content
                        )
                      }
                      className="flex items-center gap-1 rounded border border-[var(--tz-outline)] bg-[var(--tz-button)] px-2 py-0.5 text-[10px] text-[var(--tz-text)] hover:bg-[var(--tz-hover)]"
                    >
                      <Copy className="h-3 w-3" />
                      <span>Копировать</span>
                    </button>
                  </div>
                  <pre className="mt-2 max-h-40 overflow-auto font-mono text-[10.5px] text-[var(--tz-text)]">
                    {migrationArtifacts[selectedArtifactIdx]?.content}
                  </pre>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
