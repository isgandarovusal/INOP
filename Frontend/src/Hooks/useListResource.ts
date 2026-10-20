import { useCallback, useEffect, useState, type SetStateAction } from 'react';
import { useAuth } from '../Context/useAuth';

/** Locale-independent reads. A new request/authority key cannot expose an old result. */
export function useListResource<T>(load: () => Promise<T>, initial: T) {
  const { user } = useAuth();
  const [revision, setRevision] = useState(0);
  const key = JSON.stringify([user?.id, user?.role, user?.departmentId, user?.isActive, user?.hrAccess, user?.auditDirection, user?.auditDirections, user?.permissions, revision]);
  const [result, setResult] = useState<{ key: string; data: T; error: boolean }>({ key: '', data: initial, error: false });
  useEffect(() => {
    let current = true;
    void load().then(data => {
      if (current) setResult({ key, data, error: false });
    }).catch(() => {
      if (current) setResult({ key, data: initial, error: true });
    });
    return () => { current = false; };
  }, [key, load, initial]);
  const reload = useCallback(() => setRevision(value => value + 1), []);
  const setData = useCallback((update: SetStateAction<T>) => {
    setResult(current => current.key !== key ? current : ({ ...current, data: typeof update === 'function' ? (update as (value: T) => T)(current.data) : update }));
  }, [key]);
  return { data: result.key === key ? result.data : initial, loading: result.key !== key, error: result.key === key && result.error, reload, setData };
}
