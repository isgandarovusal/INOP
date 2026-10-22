import "../auditModern.css";
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
import { useTranslation } from "react-i18next";

import {useAuth} from "../../../Context/useAuth";
import {useAuditResource} from "../../../Hooks/useAuditResource";
import {useAuditAction} from "../../../Hooks/useAuditAction";
import {getPermissionScope} from "../../../Utils/permissions";
import AuditResourceState from "../../../Components/AuditResourceState";

const loadTemplates = (_id:string, signal?:AbortSignal, scopeKey?:string) => getAuditTemplates(undefined,signal,scopeKey);

export default function AuditTemplatesList() {
  const { t } = useTranslation();
  const location = useLocation();
  const message = location.state?.message;
  const {user}=useAuth();
  const resource=useAuditResource('directory','audit.template',loadTemplates,{refreshOnFocus:false,deadlineMs:15000});
  const templates=resource.data||[];
  const removal=useAuditAction('directory','audit.template','delete');
  const canCreate=getPermissionScope(user,'audit.template','create')==='all';
  const canUpdate=getPermissionScope(user,'audit.template','update')==='all';
  const canDelete=getPermissionScope(user,'audit.template','delete')==='all';
  function removeTemplate(id:string){
    if(!canDelete||!window.confirm(t("auditFoundation.retireConfirm")))return;
    void removal.run(signal=>deleteAuditTemplate(id,signal),resource.reload);
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

        {canCreate&&<Link
          to="/app/audit/checklists/new"
          className="btn-primary checklist-create-action"
        >
          <Plus size={18} />
          {t("audit.checklist.list.create")}
        </Link>}
      </div>


      {canDelete&&removal.status!=="ready"&&removal.status!=="loading"&&<AuditResourceState status={removal.status}/>}
      {resource.status!=="ready" ? <AuditResourceState status={resource.status} retry={resource.reload}/> : templates.length === 0 ? (
        <div className="audit-modern-empty checklist-empty-state">
          <div className="audit-empty-icon">
            <ClipboardList size={30} />
          </div>
          <h2>{t("audit.checklist.list.emptyTitle")}</h2>
          <p>
            {t("audit.checklist.list.emptyHint")}
          </p>        </div>
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
                  className={`audit-status-badge ${template.status}`}
                >
                  {t(`audit.checklist.status.${template.status}`, { defaultValue: template.status })}
                </span>
              </div>

              <h2>{template.name}</h2>

              <div className="audit-template-meta">
                <strong>{template.brandName}</strong>
                <span>
                  {template.auditType==='hr'?t('hrAudit.title'):t(`audit.checklist.types.${template.auditType === "occupational-safety" ? "occupationalSafety" : template.auditType}`)}
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
                  className="btn-secondary"
                >
                  {t(canUpdate?"audit.checklist.list.manage":"common.actions.view")}
                  <ChevronRight size={16} />
                </Link>

                {canDelete&&<button
                  type="button"
                  className="btn-danger"
                  disabled={removal.busy||template.status==='archived'}
                  onClick={() => void removeTemplate(template.id)}
                >
                  {t("auditFoundation.retire")}
                </button>}
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
