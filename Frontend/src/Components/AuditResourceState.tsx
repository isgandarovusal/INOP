import PageState from "./PageState";
import type { AuditLoadStatus } from "../Hooks/useAuditResource";

const messages: Record<Exclude<AuditLoadStatus, "ready">, string> = {
  loading: "Loading audit data…",
  "not-found": "Audit data was not found or is no longer available.",
  unauthenticated: "Your session has expired. Please sign in again.",
  forbidden: "You do not have permission to view this audit data.",
  "server-error": "The server could not load this audit data. Please retry.",
  error: "Audit data could not be loaded. Please retry.",
};

export default function AuditResourceState({ status, retry }: { status: AuditLoadStatus; retry?: () => void }) {
  if (status === "ready") return null;
  return <div data-audit-state={status} role={status === "loading" ? "status" : "alert"}>
    <PageState type={status === "loading" ? "loading" : status === "not-found" ? "empty" : "error"}
      title={messages[status]} action={retry && status !== "loading" && status !== "unauthenticated" ? <button type="button" onClick={retry}>Retry</button> : undefined} />
  </div>;
}
