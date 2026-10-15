import { useTranslation } from "react-i18next";
import PageState from "./PageState";
import type { AuditLoadStatus } from "../Hooks/useAuditResource";

export default function AuditResourceState({ status, retry }: { status: AuditLoadStatus; retry?: () => void }) {
  const { t } = useTranslation();
  if (status === "ready") return null;
  const loading = status === "loading";
  return <div className="audit-resource-state" data-audit-state={status} role={loading ? "status" : "alert"} aria-live="polite" aria-busy={loading || undefined}>
    <PageState type={loading ? "loading" : status === "not-found" ? "empty" : "error"}
      title={t(`auditPresentation.states.${status}`)} action={retry && !loading && status !== "unauthenticated" ? <button className="btn-secondary" type="button" onClick={retry}>{t("auditPresentation.retry")}</button> : undefined} />
  </div>;
}
