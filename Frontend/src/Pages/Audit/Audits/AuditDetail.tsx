import React, {
  lazy,
  Suspense,
  useEffect,
  useRef,
  useState,
} from "react";
import { useTranslation } from "react-i18next";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, ClipboardCheck, ImageOff, Paperclip, Pencil } from "lucide-react";
import AuditExecutionTools from '../../../Components/AuditExecutionTools';
import AuditEvidencePanel from '../../../Components/AuditEvidencePanel';
import PageHeader from "../../../Components/PageHeader";
import Badge from "../../../Components/Badge";
import EmptyState from "../../../Components/EmptyState";
import { getAuditById, overallScore } from "../../../Services/auditsService";
import { getRestaurantById } from "../../../Services/restaurantsService";
import { getUserById } from "../../../Services/usersService";
import { useAuditResource } from "../../../Hooks/useAuditResource";
import AuditResourceState from "../../../Components/AuditResourceState";
import type { Restaurant } from "../../../Types/audit";
import type { PublicUser } from "../../../Types/auth";
import { useAuth } from "../../../Context/AuthContext";
import { canManageAudit, hasPermission } from "../../../Utils/permissions";

const AuditFindingsList = lazy(
  () => import("../AuditFindings/AuditFindingsList")
);
const AuditAssignmentsList = lazy(
  () => import("../AuditAssignments/AuditAssignmentsList")
);
const AuditTimeline = lazy(
  () => import("../AuditTimeline/AuditTimeline")
);
const AuditApprovalPanel = lazy(
  () => import("../AuditApproval/AuditApprovalPanel")
);
const AuditClosurePanel = lazy(
  () => import("../AuditClosure/AuditClosurePanel")
);
const AuditExportPanel = lazy(
  () => import("../AuditExport/AuditExportPanel")
);
const AuditHistoryPanel = lazy(
  () => import("../AuditHistory/AuditHistoryPanel")
);

type LazyAuditModuleProps = {
  children: React.ReactNode;
};

const LazyAuditModule: React.FC<LazyAuditModuleProps> = ({ children }) => {
  const { t } = useTranslation();
  return (
    <div className="audit-business-module">
      <Suspense
        fallback={
          <div className="audit-business-module__loading">
            {t("auditPresentation.states.loading")}
          </div>
        }
      >
        {children}
      </Suspense>
    </div>
  );
};

const scoreTone = (score: number) => (score >= 8 ? "success" : score >= 6 ? "warning" : "danger");

const AuditDetail: React.FC = () => {
  const { t } = useTranslation();
  const { id } = useParams();
  const navigate = useNavigate();

  const { user } = useAuth();
  const canManage = user ? canManageAudit(user) : false;

  const { data: audit, status, reload } = useAuditResource(id, "audit", getAuditById);
  const loading = status === "loading";
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [auditor, setAuditor] = useState<PublicUser | null>(null);

  const [renderedBusinessModules, setRenderedBusinessModules] = useState(1);
  const businessModulesSentinelRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    let cancelled = false;
    if (!audit) return;
    setRestaurant(null); setAuditor(null);
    void Promise.allSettled([hasPermission(user,'restaurant','read')?getRestaurantById(audit.restaurantId):Promise.resolve(null), hasPermission(user,'user','read')?getUserById(audit.auditorId):Promise.resolve(null)])
      .then(([restaurantResult, auditorResult]) => {
        if (cancelled) return;
        setRestaurant(restaurantResult.status === "fulfilled" ? restaurantResult.value ?? null : null);
        setAuditor(auditorResult.status === "fulfilled" ? auditorResult.value ?? null : null);
      });
    return () => { cancelled = true; };
  }, [audit, user]);

  useEffect(() => {
    setRenderedBusinessModules(1);
  }, [id]);

  useEffect(() => {
    if (loading || renderedBusinessModules >= 7) return;

    const sentinel = businessModulesSentinelRef.current;

    if (!sentinel) return;

    if (!("IntersectionObserver" in window)) {
      setRenderedBusinessModules((current) =>
        Math.min(current + 1, 7),
      );
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;

        setRenderedBusinessModules((current) =>
          Math.min(current + 1, 7),
        );
      },
      {
        rootMargin: "300px 0px",
      },
    );

    observer.observe(sentinel);

    return () => observer.disconnect();
  }, [loading, renderedBusinessModules]);

  if (status !== "ready") return <AuditResourceState status={status} retry={reload} />;

  if (!audit) {
    return <EmptyState icon={<ClipboardCheck size={28} />} title={t("audit.generic.detail.notFound")} hint={t("auditPresentation.states.not-found")} />;
  }

  const overall = overallScore(audit);

  return (
    <div>
      <PageHeader
        title={restaurant?.name ?? t("auditFoundation.audit")}
        subtitle={`${audit.auditType} · ${audit.date} · ${t("auditPresentation.by")} ${auditor?.name ?? t("auditPresentation.unknown")}`}
        actions={
          <>
            <button className="btn-secondary" onClick={() => navigate("/app/audit/audits")}>
              <ArrowLeft size={15} /> {t("auditPresentation.back")}
            </button>

            {canManage && (
              <button
                className="btn-secondary"
                onClick={() => navigate(`/app/audit/audits/${audit.id}/edit`)}
              >
                <Pencil size={15} /> {t("auditPresentation.edit")}
              </button>
            )}
          </>
        }
      />

      <AuditExecutionTools auditId={String((audit as typeof audit & { _id?: string })._id || audit.id)} versioned={Boolean((audit as typeof audit & { templateRevisionId?: string }).templateRevisionId)} />
      <AuditEvidencePanel auditId={String((audit as typeof audit & { _id?: string })._id || audit.id)} />
      <div className="detail-grid">
        <div>
          <div className="audit-modern-card">
            <h3>{t("audit.generic.detail.scores")}</h3>
            {(Object.entries(audit.scores || {}) as [string, number][]).map(([key, value]) => (
              <div className="score-bar-row" key={key}>
                <span style={{ textTransform: "capitalize" }}>{key}</span>
                <div className="score-bar-track">
                  <div className="score-bar-fill" style={{ width: `${(value / 10) * 100}%` }} />
                </div>
                <strong>{value}</strong>
              </div>
            ))}
          </div>

          <div className="audit-modern-card">
            <h3>{t("audit.generic.detail.status")}</h3>
            <Badge tone={audit.status === "completed" ? "success" : "warning"}>
              {audit.status ?? "unknown"}
            </Badge>
          </div>

          <div className="audit-modern-card">
            <h3>{t("audit.generic.detail.findings")}</h3>
            {audit.findings && audit.findings.length > 0 ? (
              <ul>
                {audit.findings.map((item, index) => (
                  <li key={index}>
                    {typeof item === "string"
                      ? item
                      : JSON.stringify(item)}
                  </li>
                ))}
              </ul>
            ) : (
              <p>{t("audit.generic.detail.noFindings")}</p>
            )}
          </div>

          <div className="audit-modern-card">
            <h3>{t("audit.generic.detail.recommendations")}</h3>
            {audit.recommendations && audit.recommendations.length > 0 ? (
              <ul>
                {audit.recommendations.map((item, index) => (
                  <li key={index}>
                    {typeof item === "string"
                      ? item
                      : JSON.stringify(item)}
                  </li>
                ))}
              </ul>
            ) : (
              <p>{t("audit.generic.detail.noRecommendations")}</p>
            )}
          </div>

          <div className="audit-modern-card">
            <h3>{t("audit.generic.detail.comments")}</h3>
            <p style={{ fontSize: "0.9rem", color: "var(--text-secondary)", whiteSpace: "pre-wrap" }}>
              {audit.comments || t("auditPresentation.noComments")}
            </p>
          </div>

          <div className="audit-modern-card">
            <h3>{t("audit.generic.detail.photos")}</h3>
            {audit.photos.length === 0 ? (
              <p style={{ fontSize: "0.85rem", color: "var(--text-secondary)" }}>{t("audit.generic.detail.noPhotos")}</p>
            ) : (
              <div className="thumb-grid">
                {audit.photos.map((photo, idx) => <div className="thumb thumb--placeholder" key={idx}><ImageOff size={16}/><span>{photo.name}</span><small>{t('auditFoundation.legacyEvidence')}</small></div>)}
              </div>
            )}
          </div>

          {audit.attachments.length > 0 && (
            <div className="audit-modern-card">
              <h3>{t("audit.generic.detail.attachments")}</h3>
              <div className="file-list">
                {audit.attachments.map((file, idx) =>
                  file.blobUrl && !file.blobUrl.startsWith("/api/audit-evidence/") && !file.blobUrl.startsWith("blob:") ? (
                    <a
                      key={idx}
                      href={file.blobUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="file-chip"
                      style={{ textDecoration: "none" }}
                    >
                      <Paperclip size={13} />
                      <span>{file.name}</span>
                    </a>
                  ) : (
                    <div className="file-chip" key={idx}>
                      <Paperclip size={13} />
                      <span>{file.name} — {t('auditFoundation.legacyEvidence')}</span>
                    </div>
                  ),
                )}
              </div>
            </div>
          )}
        </div>

        <div>
          <div className="audit-modern-card">
            <h3>{t("audit.generic.detail.overallScore")}</h3>
            <Badge tone={overall === null ? "neutral" : scoreTone(overall)}>{overall?.toFixed(1) ?? "—"} / 10</Badge>
          </div>
          <div className="audit-modern-card">
            <h3>{t("audit.generic.detail.details")}</h3>
            <div className="detail-row">
              <dt>{t("navigation.restaurants")}</dt>
              <dd>{restaurant?.name ?? t("auditPresentation.unknown")}</dd>
            </div>
            <div className="detail-row">
              <dt>{t("auditFoundation.auditor")}</dt>
              <dd>{auditor?.name ?? t("auditPresentation.unknown")}</dd>
            </div>
            <div className="detail-row">
              <dt>{t("auditPresentation.type")}</dt>
              <dd>{audit.auditType}</dd>
            </div>
            <div className="detail-row">
              <dt>{t("auditFoundation.date")}</dt>
              <dd>{audit.date}</dd>
            </div>
          </div>
        </div>
      </div>


      {/* AUDIT BUSINESS MODULES */}

      <div className="audit-business-modules" key={String(audit.id)}>
        {renderedBusinessModules >= 1 && (
          <LazyAuditModule>
            <AuditFindingsList auditId={String(audit.id)} />
          </LazyAuditModule>
        )}

        {renderedBusinessModules >= 2 && (
          <LazyAuditModule>
            <AuditAssignmentsList auditId={String(audit.id)} />
          </LazyAuditModule>
        )}

        {renderedBusinessModules >= 3 && (
          <LazyAuditModule>
            <AuditTimeline auditId={String(audit.id)} />
          </LazyAuditModule>
        )}

        {renderedBusinessModules >= 4 && (
          <LazyAuditModule>
            <AuditApprovalPanel auditId={String(audit.id)} />
          </LazyAuditModule>
        )}

        {renderedBusinessModules >= 5 && (
          <LazyAuditModule>
            <AuditClosurePanel auditId={String(audit.id)} />
          </LazyAuditModule>
        )}

        {renderedBusinessModules >= 6 && (
          <LazyAuditModule>
            <AuditExportPanel auditId={String(audit.id)} />
          </LazyAuditModule>
        )}

        {renderedBusinessModules >= 7 && (
          <LazyAuditModule>
            <AuditHistoryPanel auditId={String(audit.id)} />
          </LazyAuditModule>
        )}

        {renderedBusinessModules < 7 && (
          <div
            ref={businessModulesSentinelRef}
            className="audit-business-modules__sentinel"
            aria-hidden="true"
          />
        )}
      </div>


    </div>
  );
};

export default AuditDetail;

