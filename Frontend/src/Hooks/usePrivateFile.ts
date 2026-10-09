import { useCallback, useLayoutEffect, useRef, useState } from "react";
import { auditErrorStatus, type AuditLoadStatus } from "./useAuditResource";

export function privateFileErrorMessage(status: AuditLoadStatus | null) {
  if (status === "unauthenticated") return "Sessiyanız bitib. Yenidən daxil olun.";
  if (status === "forbidden") return "Bu fayla giriş icazəniz yoxdur.";
  if (status === "not-found") return "Fayl tapılmadı.";
  if (status === "server-error") return "Server faylı yükləyə bilmədi. Yenidən cəhd edin.";
  return status ? "Faylı yükləmək mümkün olmadı." : "";
}

// A blob URL is private data: never carry it across a record/permission context.
export function usePrivateFile(contextKey: string) {
  const currentKey = useRef(contextKey);
  const operation = useRef<{ controller: AbortController; url?: string } | null>(null);
  const [result, setResult] = useState<{ key: string; loading: boolean; url?: string; type?: string; error?: AuditLoadStatus }>({ key: "", loading: false });
  const dispose = useCallback(() => {
    operation.current?.controller.abort();
    if (operation.current?.url) URL.revokeObjectURL(operation.current.url);
    operation.current = null;
  }, []);
  useLayoutEffect(() => { currentKey.current = contextKey; return dispose; }, [contextKey, dispose]);
  const close = useCallback(() => { dispose(); setResult({ key: contextKey, loading: false }); }, [contextKey, dispose]);
  const open = useCallback(async (load: (signal: AbortSignal) => Promise<Blob>) => {
    dispose();
    const request = { controller: new AbortController(), url: undefined as string | undefined };
    operation.current = request; setResult({ key: contextKey, loading: true });
    try {
      const blob = await load(request.controller.signal);
      if (request.controller.signal.aborted || operation.current !== request || currentKey.current !== contextKey) return;
      request.url = URL.createObjectURL(blob);
      setResult({ key: contextKey, loading: false, url: request.url, type: blob.type });
    } catch (error) {
      if (!request.controller.signal.aborted && operation.current === request && currentKey.current === contextKey) setResult({ key: contextKey, loading: false, error: auditErrorStatus(error) });
    }
  }, [contextKey, dispose]);
  const visible: { loading: boolean; url?: string; type?: string; error?: AuditLoadStatus } = result.key === contextKey ? result : { loading: false };
  return { ...visible, open, close };
}
