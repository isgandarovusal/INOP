import { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "../Context/useAuth";
import { getPermissionScope } from "../Utils/permissions";
import { auditErrorStatus, type AuditLoadStatus } from "./useAuditResource";

export function useAuditAction(auditId: string, resource: string, action: string) {
  const { user } = useAuth();
  const key = JSON.stringify([auditId, user?.id, user?.role, user?.departmentId, user?.permissions]);
  const pending = useMemo(() => ({ key, controllers: new Set<AbortController>() }), [key]);
  useEffect(() => () => { for (const controller of pending.controllers) controller.abort(); pending.controllers.clear(); }, [pending]);
  const scope = getPermissionScope(user, resource, action);
  const allowed = Boolean(scope && scope !== "none");
  const [result, setResult] = useState<{ key: string; status: AuditLoadStatus }>({ key: "", status: "ready" });
  const run = useCallback(async (operation: (signal: AbortSignal) => Promise<unknown>, after?: () => void) => {
    if (!allowed || pending.controllers.size) return;
    const controller = new AbortController(); pending.controllers.add(controller);
    setResult({ key, status: "loading" });
    try {
      await operation(controller.signal);
      if (!controller.signal.aborted) { setResult({ key, status: "ready" }); after?.(); }
    } catch (error) {
      if (!controller.signal.aborted) setResult({ key, status: auditErrorStatus(error) });
    } finally {
      pending.controllers.delete(controller);
    }
  }, [allowed, pending, key]);
  const status = !allowed ? "forbidden" : result.key === key ? result.status : "ready";
  return { run, status, allowed, busy: status === "loading" };
}
