import { useCallback, useEffect, useState } from "react";
import { isAxiosError } from "axios";
import { useAuth } from "../Context/useAuth";
import { getPermissionScope } from "../Utils/permissions";

export type AuditLoadStatus = "loading" | "ready" | "not-found" | "unauthenticated" | "forbidden" | "server-error" | "error";

export function auditErrorStatus(error: unknown): AuditLoadStatus {
  const status = isAxiosError(error) ? error.response?.status : undefined;
  if (status === 401) return "unauthenticated";
  if (status === 403) return "forbidden";
  if (status === 404) return "not-found";
  if (status && status >= 500) return "server-error";
  return "error";
}

export function useAuditResource<T>(id: string | undefined, resource: string, load: (id: string, signal?: AbortSignal) => Promise<T>) {
  const { user, isLoading } = useAuth();
  const [revision, setRevision] = useState(0);
  const reload = useCallback(() => setRevision(value => value + 1), []);
  const authKey = JSON.stringify([user?.id, user?.role, user?.departmentId, user?.permissions]);
  const scope = getPermissionScope(user, resource, "read");
  const blocked: AuditLoadStatus | null = isLoading ? "loading" : !user ? "unauthenticated" : !scope || scope === "none" ? "forbidden" : !id ? "not-found" : null;
  const key = JSON.stringify([id, authKey, revision]);
  const [result, setResult] = useState<{ key: string; status: AuditLoadStatus; data?: T }>({ key: "", status: "loading" });

  useEffect(() => {
    if (blocked || !id) return;
    const controller = new AbortController(); let current = true;
    void load(id, controller.signal).then(data => {
      if (current) setResult({ key, status: data == null ? "not-found" : "ready", data });
    }).catch(error => {
      if (current && !controller.signal.aborted) setResult({ key, status: auditErrorStatus(error) });
    });
    return () => { current = false; controller.abort(); };
  }, [id, key, blocked, load]);

  useEffect(() => {
    const visible = () => { if (document.visibilityState === "visible") reload(); };
    window.addEventListener("focus", reload);
    document.addEventListener("visibilitychange", visible);
    return () => { window.removeEventListener("focus", reload); document.removeEventListener("visibilitychange", visible); };
  }, [reload]);

  // Never render data belonging to a previous audit or permission context,
  // including the render before an effect's cleanup has run.
  const status = blocked || (result.key === key ? result.status : "loading");
  return { status, data: status === "ready" ? result.data : undefined, reload };
}
