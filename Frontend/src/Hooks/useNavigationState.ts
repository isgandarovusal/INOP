import { useCallback, useState, type SetStateAction } from 'react';
import { useAuth } from '../Context/useAuth';
import { readNavigation, syncClientSession, writeNavigation } from '../api/clientSession';
// Per-document preferences only. No records, draft payloads, storage or URL PII.
export function useNavigationState<T>(key: string | undefined, fallback: T): [T, (value: SetStateAction<T>) => void] {
  const { user } = useAuth(), identity = syncClientSession(user);
  const [entry,setEntry] = useState(() => ({identity,value:readNavigation(key,fallback)}));
  const value = entry.identity === identity ? entry.value : readNavigation(key,fallback);
  const set = useCallback((action: SetStateAction<T>) => setEntry(previous => {
    const current = previous.identity === identity ? previous.value : readNavigation(key,fallback);
    const next = typeof action === 'function' ? (action as (value:T)=>T)(current) : action;
    writeNavigation(key,next,identity); return {identity,value:next};
  }),[identity,key,fallback]);
  return [value,set];
}
