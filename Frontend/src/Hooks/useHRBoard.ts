import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { auditErrorStatus, useAuditResource, type AuditLoadStatus } from './useAuditResource';
import { useHRActionContext } from './useHRActionContext';
import { getApplicationBoard, type BoardQuery, type BoardStage, type BoardColumn, type HRBoard } from '../Services/hrBoardService';
interface LaneState { data: BoardColumn; cursors: (string | undefined)[]; loading?: boolean; error?: boolean }
interface State { key: string; base?: HRBoard; lanes: Partial<Record<BoardStage, LaneState>>; blocked?: AuditLoadStatus }
export function useHRBoard(filters: BoardQuery, enabled: boolean) {
  const query = JSON.stringify({ ...filters, pageSize: 10 }), context = useHRActionContext(query), key = context.key;
  const load = useCallback((value: string, signal?: AbortSignal, scopeKey?: string) => getApplicationBoard(JSON.parse(value) as BoardQuery, signal, scopeKey), []);
  const result = useAuditResource(enabled ? query : undefined, 'application', load);
  const [state, setState] = useState<State>({ key: '', lanes: {} });
  const controllers = useRef(new Map<BoardStage, AbortController>());
  useEffect(() => { const active = controllers.current; return () => { for (const c of active.values()) c.abort(); active.clear(); }; }, [key, result.data]);
  const valid = state.key === key && state.base === result.data;
  const columns = useMemo(() => {
    const values = { ...result.data?.columns };
    if (valid) for (const [stage, lane] of Object.entries(state.lanes)) if (lane) values[stage as BoardStage] = lane.data;
    return values;
  }, [result.data, state, valid]);
  const pageLane = async (stage: BoardStage, delta: -1 | 1) => {
    if (result.status !== 'ready' || !result.data || context.current.current !== key) return;
    const base = result.data, previous = valid ? state.lanes[stage] : undefined, data = previous?.data || base.columns[stage];
    if (!data || previous?.loading || delta < 0 && data.page <= 1 || delta > 0 && !data.nextCursor) return;
    const cursors = previous?.cursors || [undefined], page = data.page + delta;
    const positions = delta > 0 ? [...cursors.slice(0, data.page), data.nextCursor!] : cursors;
    const controller = new AbortController(); controllers.current.get(stage)?.abort(); controllers.current.set(stage, controller);
    const entry = { data, cursors: positions, loading: true, error: false };
    setState(s => ({ key, base, lanes: { ...(s.key === key && s.base === base ? s.lanes : {}), [stage]: entry } }));
    try {
      const response = await getApplicationBoard({ ...JSON.parse(query), stage, after: positions[page - 1] }, controller.signal, key);
      if (controller.signal.aborted || context.current.current !== key) return;
      setState(s => s.key === key && s.base === base ? { ...s, lanes: { ...s.lanes, [stage]: { data: response.columns[stage]!, cursors: positions } } } : s);
    } catch (error) {
      if (controller.signal.aborted || context.current.current !== key) return;
      const status = auditErrorStatus(error), blocked = ['unauthenticated', 'forbidden', 'not-found'].includes(status) ? status : undefined;
      setState(s => s.key === key && s.base === base ? { ...s, ...(blocked ? { blocked } : {}), lanes: { ...s.lanes, [stage]: { ...entry, loading: false, error: true } } } : s);
    } finally { if (controllers.current.get(stage) === controller) controllers.current.delete(stage); }
  };
  const status = valid && state.blocked || result.status;
  return { ...result, status, data: status === 'ready' ? result.data : undefined, columns: status === 'ready' ? columns : {}, pageLane, laneState: valid ? state.lanes : {}, reload: result.reload };
}
