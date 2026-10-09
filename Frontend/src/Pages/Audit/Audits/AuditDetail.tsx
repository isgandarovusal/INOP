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
import PageHeader from "../../../Components/PageHeader";
import Badge from "../../../Components/Badge";
import EmptyState from "../../../Components/EmptyState";
import { getAuditById } from "../../../Services/auditsService";
import { getRestaurantById } from "../../../Services/restaurantsService";
import { getUserById } from "../../../Services/usersService";
import { useAuditResource } from "../../../Hooks/useAuditResource";
import AuditResourceState from "../../../Components/AuditResourceState";
import type { Restaurant } from "../../../Types/audit";
import type { PublicUser } from "../../../Types/auth";
import { useAuth } from "../../../Context/AuthContext";
import { canManageAudit } from "../../../Utils/permissions";

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
  return (
    <div className="audit-business-module">
      <Suspense
        fallback={
          <div className="audit-business-module__loading">
            Loading...
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
    void Promise.allSettled([getRestaurantById(audit.restaurantId), getUserById(audit.auditorId)])
      .then(([restaurantResult, auditorResult]) => {
        if (cancelled) return;
        setRestaurant(restaurantResult.status === "fulfilled" ? restaurantResult.value ?? null : null);
        setAuditor(auditorResult.status === "fulfilled" ? auditorResult.value ?? null : null);
      });
    return () => { cancelled = true; };
  }, [audit]);

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
    return <EmptyState icon={<ClipboardCheck size={28} />} title={t("audit.generic.detail.notFound")} hint="It may have been deleted." />;
  }

  const overall =
    audit.overallPercentage && audit.overallPercentage > 0
      ? audit.overallPercentage / 10
      : (
          audit.scores.cleanliness +
          audit.scores.service +
          audit.scores.food +
          audit.scores.staff
        ) / 4;

  return (
    <div>
      <PageHeader
        title={restaurant?.name ?? "Audit"}
        subtitle={`${audit.auditType} · ${audit.date} · by ${auditor?.name ?? "Unknown"}`}
        actions={
          <>
            <button className="btn-secondary" onClick={() => navigate("/app/audit/audits")}>
              <ArrowLeft size={15} /> Back
            </button>

            {canManage && (
              <button
                className="btn-secondary"
                onClick={() => navigate(`/app/audit/audits/${audit.id}/edit`)}
              >
                <Pencil size={15} /> Edit
              </button>
            )}
          </>
        }
      />

      <div className="detail-grid">
        <div>
          <div className="audit-modern-card">
            <h3>{t("audit.generic.detail.scores")}</h3>
            {(Object.entries(audit.scores) as [string, number][]).map(([key, value]) => (
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
              {audit.comments || "No comments provided."}
            </p>
          </div>

          <div className="audit-modern-card">
            <h3>{t("audit.generic.detail.photos")}</h3>
            {audit.photos.length === 0 ? (
              <p style={{ fontSize: "0.85rem", color: "var(--text-secondary)" }}>{t("audit.generic.detail.noPhotos")}</p>
            ) : (
              <div className="thumb-grid">
                {audit.photos.map((photo, idx) =>
                  photo.blobUrl ? (
                    <div className="thumb" key={idx}>
                      <img src={photo.blobUrl} alt={photo.name} />
                    </div>
                  ) : (
                    <div className="thumb thumb--placeholder" key={idx}>
                      <ImageOff size={16} />
                      not available
                    </div>
                  ),
                )}
              </div>
            )}
          </div>

          {audit.attachments.length > 0 && (
            <div className="audit-modern-card">
              <h3>{t("audit.generic.detail.attachments")}</h3>
              <div className="file-list">
                {audit.attachments.map((file, idx) =>
                  file.blobUrl ? (
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
                      <span>{file.name} — not available (no backend yet)</span>
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
            <Badge tone={scoreTone(overall)}>{overall.toFixed(1)} / 10</Badge>
          </div>
          <div className="audit-modern-card">
            <h3>{t("audit.generic.detail.details")}</h3>
            <div className="detail-row">
              <dt>Restaurant</dt>
              <dd>{restaurant?.name ?? "Unknown"}</dd>
            </div>
            <div className="detail-row">
              <dt>Auditor</dt>
              <dd>{auditor?.name ?? "Unknown"}</dd>
            </div>
            <div className="detail-row">
              <dt>Type</dt>
              <dd>{audit.auditType}</dd>
            </div>
            <div className="detail-row">
              <dt>Date</dt>
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

