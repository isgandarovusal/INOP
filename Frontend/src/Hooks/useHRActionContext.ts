import { useLayoutEffect, useRef } from 'react';
import { useAuth } from '../Context/useAuth';
export function useHRActionContext(id?: string) {
  const { user } = useAuth();
  const key = JSON.stringify([id, user?.id, user?.role, user?.departmentId, user?.permissions]);
  const current = useRef<string | null>(key);
  useLayoutEffect(() => { current.current = key; return () => { current.current = null; }; }, [key]);
  return { key, current };
}
