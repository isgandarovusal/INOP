import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import {
  ClipboardList,
  Plus,
  ChevronRight,
  Layers3,
} from "lucide-react";
import {
  getAuditTemplates,
  deleteAuditTemplate,
} from "../../../Services/auditTemplatesService";
import type { AuditTemplate } from "../../../Types/Audit";
import { useTranslation } from "react-i18next";

export default function AuditTemplatesList() {
  const { t } = useTranslation();
  const location = useLocation();
  const message = location.state?.message;
  const [templates, setTemplates] = useState<AuditTemplate[]>([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    try {
      setLoading(true);
      setTemplates(await getAuditTemplates());
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  async function removeTemplate(id: string) {
    if (!window.confirm(t("audit.checklist.list.deleteConfirm"))) return;

    await deleteAuditTemplate(id);
    await load();
  }

  return (
    <div className="audit-modern-page">
      {message && (
        <div className="audit-success-message">
          {message}
        </div>
      )}
      <div className="audit-modern-header">
        <div>
          <h1>{t("audit.checklist.list.title")}</h1>
          <p>
            {t("audit.checklist.list.subtitle")}
          </p>
        </div>

        <Link
          to="/app/audit/checklists/new"
          className="audit-modern-button audit-modern-button-primary"
        >
          <Plus size={18} />
          Yeni checklist
        </Link>
      </div>

      {message && (
        <div className="audit-success-message">
          {message}
        </div>
      )}

      {loading ? (
        <div className="audit-card">
          {t("audit.checklist.list.loading")}
        </div>
      ) : templates.length === 0 ? (
        <div className="audit-modern-empty">
          <div className="audit-empty-icon">
            <ClipboardList size={30} />
          </div>
          <h2>{t("audit.checklist.list.emptyTitle")}</h2>
          <p>
            {t("audit.checklist.list.emptyHint")}
          </p>
          <Link
            to="/app/audit/checklists/new"
            className="audit-modern-button audit-modern-button-primary"
          >
            <Plus size={18} />
            Checklist yarat
          </Link>
        </div>
      ) : (
        <div className="audit-template-grid">
          {templates.map((template) => (
            <article
              key={template.id}
              className="audit-template-card"
            >
              <div className="audit-template-card-top">
                <div className="audit-kpi-icon">
                  <Layers3 size={20} />
                </div>

                <span
                  className={`audit-status-badge ${t(`audit.checklist.status.${template.status}`, { defaultValue: template.status })}`}
                >
                  {t(`audit.checklist.status.${template.status}`, { defaultValue: template.status })}
                </span>
              </div>

              <h2>{template.name}</h2>

              <div className="audit-template-meta">
                <strong>{template.brandName}</strong>
                <span>
                  {t(`audit.checklist.types.${template.auditType === "occupational-safety" ? "occupationalSafety" : template.auditType}`)}
                </span>
                <span>v{template.version}</span>
              </div>

              <div className="audit-template-counts">
                <span>
                  {t("audit.checklist.list.sectionCount", { count: template.sections.length })}
                </span>
                <span>
                  {t("audit.checklist.list.questionCount", {
                    count: template.sections.reduce(
                      (total, section) =>
                        total +
                        section.questions.length +
                        section.subsections.reduce(
                          (sum, subsection) =>
                            sum + subsection.questions.length,
                          0
                        ),
                      0
                    ),
                  })}
                </span>
              </div>

              <div className="audit-template-actions">
                <Link
                  to={`/app/audit/checklists/${template.id}`}
                  className="audit-modern-button audit-modern-button-secondary"
                >
                  İdarə et
                  <ChevronRight size={16} />
                </Link>

                <button
                  type="button"
                  className="audit-modern-button audit-modern-button-danger"
                  onClick={() => void removeTemplate(template.id)}
                >
                  Sil
                </button>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
