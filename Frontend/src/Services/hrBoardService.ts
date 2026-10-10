import { readJson } from '../api/readRequest';
import { normalizeApplication, type ApplicationAnchor } from './applicationsService';
import type { Application, ApplicationStatus } from '../Types/recruitment';
import type { HRPageQuery } from './hrPageService';
export type BoardStage = ApplicationStatus | 'processing';
export const boardStages: BoardStage[] = ['applied', 'processing', 'screening', 'shortlisted', 'interview', 'offered', 'hired', 'rejected'];
export interface BoardColumn { items: Application[]; total: number; page: number; pageSize: number; hasMore: boolean; nextCursor: string | null; before: ApplicationAnchor | null; after: ApplicationAnchor | null }
export interface HRBoard { version: 'hr-board-v1'; columns: Partial<Record<BoardStage, BoardColumn>>; total: number; manualOrder: boolean }
export type BoardQuery = Pick<HRPageQuery, 'q' | 'jobId' | 'brandId' | 'branchId' | 'status' | 'pageSize' | 'after'> & { stage?: BoardStage };
export function applicationLane(app: Application): BoardStage { return app.status === 'applied' && ['queued', 'running'].includes(app.processingState || '') ? 'processing' : app.status; }
const laneNames: Record<string, BoardStage> = { Applied: 'applied', processing: 'processing', Screening: 'screening', Shortlisted: 'shortlisted', Interview: 'interview', Offered: 'offered', Hired: 'hired', Rejected: 'rejected' };
function anchor(value: unknown): ApplicationAnchor | null {
  if (value === null) return null;
  const a = value as ApplicationAnchor;
  if (!a || typeof a.id !== 'string' || !/^[a-f0-9]{24}$/.test(a.id) || !Number.isInteger(a.expectedRevision) || a.expectedRevision < 0) throw Error('Invalid board anchor.');
  return { id: a.id, expectedRevision: a.expectedRevision };
}
export async function getApplicationBoard(query: BoardQuery, signal?: AbortSignal, scopeKey?: string): Promise<HRBoard> {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) if (value !== undefined && value !== '') params.set(key, key === 'stage' && value !== 'processing' ? String(value).charAt(0).toUpperCase() + String(value).slice(1) : String(value));
  const raw = await readJson<HRBoard>(`/hr/v2/application-board?${params}`, { signal, scopeKey });
  if (!raw || raw.version !== 'hr-board-v1' || !raw.columns || typeof raw.columns !== 'object' || Array.isArray(raw.columns) || !Number.isInteger(raw.total) || raw.total < 0 || typeof raw.manualOrder !== 'boolean') throw Error('Invalid board response.');
  const columns: HRBoard['columns'] = {}, ids = new Set<string>();
  for (const [name, c] of Object.entries(raw.columns)) {
    const lane = laneNames[name];
    if (!lane || !c || !Array.isArray(c.items) || !Number.isInteger(c.page) || c.page < 1 || !Number.isInteger(c.pageSize) || c.pageSize < 1 || c.pageSize > 30 || c.items.length > c.pageSize || !Number.isInteger(c.total) || c.total < c.items.length || typeof c.hasMore !== 'boolean' || (c.nextCursor !== null && typeof c.nextCursor !== 'string') || c.hasMore !== !!c.nextCursor) throw Error('Invalid board column.');
    const items = c.items.map(normalizeApplication);
    for (const item of items) { if (!item.id || ids.has(item.id) || applicationLane(item) !== lane) throw Error('Invalid board identity or lane.'); ids.add(item.id); }
    columns[lane] = { ...c, items, before: anchor(c.before), after: anchor(c.after) };
  }
  if (query.stage ? Object.keys(columns).length !== 1 || !columns[query.stage] : Object.keys(columns).length !== boardStages.length) throw Error('Incomplete board response.');
  return { ...raw, columns };
}
