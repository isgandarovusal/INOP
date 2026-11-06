import { useCallback, useEffect, useState } from 'react';
import { useAuditResource } from './useAuditResource';
import { useNavigationState } from './useNavigationState';
import type { HRPage, HRPageQuery } from '../Services/hrPageService';
export function useDebouncedSearch(value: string) {
  const [settled, setSettled] = useState(value);
  useEffect(() => { const timer = setTimeout(() => setSettled(value.trim().slice(0, 80)), 250); return () => clearTimeout(timer); }, [value]);
  return settled;
}
export function useHRPage<T>(resource: string, filters: HRPageQuery, get: (query: HRPageQuery, signal?: AbortSignal, scopeKey?: string) => Promise<HRPage<T>>, options: { enabled?: boolean; navigationKey?: string } = {}) {
  const key = JSON.stringify(filters);
  const [position, setPosition] = useNavigationState(options.navigationKey, { key, page: 1 });
  const page = position.key === key ? position.page : 1;
  const queryKey = JSON.stringify({ ...filters, page, pageSize: 30 });
  const load = useCallback((id: string, signal?: AbortSignal, scopeKey?: string) => get(JSON.parse(id) as HRPageQuery, signal, scopeKey), [get]);
  // Current authority still comes from AuthProvider. A focus event alone must
  // not discard a scoped page; mutations and explicit refresh call reload().
  const result = useAuditResource(options.enabled === false ? undefined : queryKey, resource, load, { refreshOnFocus: false, retainOnReload: true });
  const setPage = useCallback((value: number) => setPosition({ key, page: Math.max(1, value) }), [key,setPosition]);
  // A deletion/archive can shrink the server result while we retain page N.
  // Recover only from a fresh, same-page result; never from retained/stale data
  // or cursor navigation. This issues one corrective read for a stable dataset.
  useEffect(() => {
    if (result.status !== 'ready' || result.refreshing || !result.data || result.data.page !== page || filters.after) return;
    const last = Math.max(1, Math.ceil(result.data.total / result.data.pageSize));
    if (page > last) setPage(last);
  }, [result.status, result.refreshing, result.data, page, filters.after, setPage]);
  return { ...result, page, setPage };
}
