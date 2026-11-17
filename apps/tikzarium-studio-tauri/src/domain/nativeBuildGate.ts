import { computeSourceDigest } from './sourceDigest';
import type { EngineAdapter, PdfUnderlayRenderRequest, PdfUnderlayRenderResponse } from './sourcePatchEngine';

export interface BuildTicket { generation: number; source: string; revision: number; documentEpoch: number }
/** Prevents old documents/jobs, edit-undo cycles and cancelled jobs publishing a result. */
export class NativeBuildGate {
  private generation = 0;
  invalidate(): void { this.generation++; }
  begin(source: string, revision: number, documentEpoch: number): BuildTicket {
    return { generation: ++this.generation, source, revision, documentEpoch };
  }
  isCurrent(ticket: BuildTicket, source: string, revision: number, documentEpoch: number): boolean {
    return ticket.generation === this.generation && ticket.documentEpoch === documentEpoch
      && ticket.source === source && ticket.revision === revision;
  }
}

export function assertAuthoritativePdf(request: PdfUnderlayRenderRequest, result: PdfUnderlayRenderResponse): void {
  if (!result.ok || result.engine !== 'xelatex' || result.revision !== request.revision ||
      result.sourceDigest !== computeSourceDigest(request.source) || !result.pdfBase64) {
    throw new Error(result.errorRu || 'PDF не подтверждён внешним XeLaTeX для этой ревизии исходника.');
  }
  let header = '';
  try { header = atob(result.pdfBase64.slice(0, 16)); } catch { /* rejected below */ }
  if (!/^%PDF-[0-9]\.[0-9]/.test(header)) throw new Error('Некорректный заголовок PDF-артефакта.');
}

export async function requestAuthoritativePdf(adapter: EngineAdapter, request: PdfUnderlayRenderRequest): Promise<PdfUnderlayRenderResponse> {
  if (adapter.adapterId !== 'rust-tauri-v2-ipc') {
    throw new Error('Browser preview не подтверждает нативную сборку. Откройте Studio в Tauri.');
  }
  const result = await adapter.renderPdfUnderlay(request);
  assertAuthoritativePdf(request, result);
  return result;
}

/** A cancelled/failed save cannot mark a revision saved or launch compilation. */
export async function saveThenContinue<T extends { ok: boolean; sha256Short: string }>(
  source: string, save: () => Promise<T | null>, isCurrent: () => boolean,
  onSaved: (saved: T) => void, build: () => Promise<void>
): Promise<'cancelled' | 'superseded' | 'continued'> {
  const saved = await save();
  if (!saved) return 'cancelled';
  if (!saved.ok || saved.sha256Short !== computeSourceDigest(source).slice(0, 16)) {
    throw new Error('Сохранённый файл не соответствует отправленному исходнику.');
  }
  if (!isCurrent()) return 'superseded';
  onSaved(saved);
  await build();
  return 'continued';
}

/** At most one automatic attempt per document/source revision, including failures. */
export class LiveBuildAdmission {
  private previous: { source: string; revision: number; epoch: number } | null = null;
  reset(): void { this.previous = null; }
  remember(source: string, revision: number, epoch: number): void { this.previous = { source, revision, epoch }; }
  shouldSchedule(source: string, revision: number, epoch: number): boolean {
    const p = this.previous;
    return !p || p.source !== source || p.revision !== revision || p.epoch !== epoch;
  }
}
