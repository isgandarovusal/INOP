import { useCallback, useEffect, useState } from 'react';
import { useAuditResource } from './useAuditResource';
import { useHRActionContext } from './useHRActionContext';
import type { HRPage, HRPageQuery } from '../Services/hrPageService';
export function useDebouncedSearch(value: string) {
  const [settled, setSettled] = useState(value);
  useEffect(() => { const timer = setTimeout(() => setSettled(value.trim().slice(0, 80)), 250); return () => clearTimeout(timer); }, [value]);
  return settled;
}
export function useHRPage<T>(resource: string, filters: HRPageQuery, get: (query: HRPageQuery, signal?: AbortSignal, scopeKey?: string) => Promise<HRPage<T>>, options: { enabled?: boolean } = {}) {
  const context = useHRActionContext();
  const filterKey = JSON.stringify(filters), key = JSON.stringify([filterKey, context.key]);
  const [position, setPosition] = useState({ key, page: 1 });
  const page = position.key === key ? position.page : 1;
  const queryKey = JSON.stringify({ ...filters, page, pageSize: 30 });
  const load = useCallback((id: string, signal?: AbortSignal, scopeKey?: string) => get(JSON.parse(id) as HRPageQuery, signal, scopeKey), [get]);
  // Current authority still comes from AuthProvider. A focus event alone must
  // not discard a scoped page; mutations and explicit refresh call reload().
  const result = useAuditResource(options.enabled === false ? undefined : queryKey, resource, load, { refreshOnFocus: false, retainOnReload: true });
  const setPage = useCallback((value: number) => setPosition({ key, page: Math.max(1, value) }), [key]);
  return { ...result, page, setPage };
}
