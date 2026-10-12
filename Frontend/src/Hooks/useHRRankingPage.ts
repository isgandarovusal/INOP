import { useCallback, useState } from 'react';
import { isAxiosError } from 'axios';
import { useAuditResource } from './useAuditResource';
import { useHRActionContext } from './useHRActionContext';
import { getApplicationRankingPage } from '../Services/hrPageService';
export function useHRRankingPage(jobId: string | undefined, enabled = true) {
  const context = useHRActionContext(jobId), key = context.key;
  const [position, setPosition] = useState<{ key: string; page: number; cursors: (string | undefined)[] }>({ key, page: 1, cursors: [undefined] });
  const [conflict, setConflict] = useState({ key: '', changed: false });
  const current = position.key === key ? position : { key, page: 1, cursors: [undefined] };
  const query = JSON.stringify({ jobId, pageSize: 30, after: current.cursors[current.page - 1] });
  const load = useCallback(async (value: string, signal?: AbortSignal, scopeKey?: string) => {
    setConflict({ key, changed: false });
    try { return await getApplicationRankingPage(JSON.parse(value), signal, scopeKey); }
    catch (error) {
      if (signal && !signal.aborted && isAxiosError(error) && error.response?.status === 409 && error.response.data?.code === 'RANKING_CHANGED') setConflict({ key, changed: true });
      throw error;
    }
  }, [key]);
  const result = useAuditResource(enabled && jobId ? query : undefined, 'application', load, { refreshOnFocus: false, retainOnReload: true });
  const setPage = (page: number) => {
    if (result.status !== 'ready') return;
    if (page === current.page + 1 && result.data?.nextCursor) setPosition({ key, page, cursors: [...current.cursors.slice(0, current.page), result.data.nextCursor] });
    else if (page >= 1 && page < current.page && page <= current.cursors.length) setPosition({ ...current, page });
  };
  const reload = () => { setPosition({ key, page: 1, cursors: [undefined] }); result.reload(); };
  return { ...result, reload, setPage, page: current.page, changed: conflict.key === key && conflict.changed && result.status === 'error' };
}
