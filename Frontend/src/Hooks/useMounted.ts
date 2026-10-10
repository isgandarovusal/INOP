import { useEffect, useRef } from 'react';

// Mutations may finish on the server after navigation; their old page must not
// navigate, open a download or replace feedback in the new page.
export function useMounted() {
  const mounted = useRef(true);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
  return mounted;
}
