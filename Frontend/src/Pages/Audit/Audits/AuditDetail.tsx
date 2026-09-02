import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, ClipboardCheck, ImageOff, Loader2, Paperclip } from "lucide-react";
import PageHeader from "../../../Components/PageHeader";
import Badge from "../../../Components/Badge";
import EmptyState from "../../../Components/EmptyState";
import { getAuditById, overallScore } from "../../../Services/auditsService";
import { getRestaurantById } from "../../../Services/restaurantsService";
import { getUsers } from "../../../Services/usersService";
import type { Audit } from "../../../Types/audit";
import type { Restaurant } from "../../../Types/audit";
import type { PublicUser } from "../../../Types/auth";

const scoreTone = (score: number) => (score >= 8 ? "success" : score >= 6 ? "warning" : "danger");

const AuditDetail: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [audit, setAudit] = useState<Audit | null>(null);
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [auditor, setAuditor] = useState<PublicUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    getAuditById(id).then(async (auditResult) => {
      if (!auditResult) {
        setLoading(false);
        return;
      }
      setAudit(auditResult);
      const [restaurantResult, users] = await Promise.all([
        getRestaurantById(auditResult.restaurantId),
        getUsers(),
      ]);
      setRestaurant(restaurantResult ?? null);
      setAuditor(users.find((u) => u.id === auditResult.auditorId) ?? null);
      setLoading(false);
    });
  }, [id]);

  if (loading) {
    return (
      <div className="empty-state">
        <Loader2 size={24} className="spin" />
      </div>
    );
  }

  if (!audit) {
    return <EmptyState icon={<ClipboardCheck size={28} />} title="Audit not found" hint="It may have been deleted." />;
  }

  const overall = overallScore(audit);

  return (
    <div>
      <PageHeader
        title={restaurant?.name ?? "Audit"}
        subtitle={`${audit.auditType} · ${audit.date} · by ${auditor?.name ?? "Unknown"}`}
        actions={
          <button className="btn-secondary" onClick={() => navigate("/app/audit/audits")}>
            <ArrowLeft size={15} /> Back
          </button>
        }
      />

      <div className="detail-grid">
        <div>
          <div className="detail-card">
            <h3>Scores</h3>
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

          <div className="detail-card">
            <h3>Comments</h3>
            <p style={{ fontSize: "0.9rem", color: "var(--text-secondary)", whiteSpace: "pre-wrap" }}>
              {audit.comments || "No comments provided."}
            </p>
          </div>

          <div className="detail-card">
            <h3>Photos</h3>
            {audit.photos.length === 0 ? (
              <p style={{ fontSize: "0.85rem", color: "var(--text-secondary)" }}>No photos attached.</p>
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
            <div className="detail-card">
              <h3>Attachments</h3>
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
          <div className="detail-card">
            <h3>Overall score</h3>
            <Badge tone={scoreTone(overall)}>{overall.toFixed(1)} / 10</Badge>
          </div>
          <div className="detail-card">
            <h3>Details</h3>
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
    </div>
  );
};

export default AuditDetail;
