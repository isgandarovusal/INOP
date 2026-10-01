import AuditFindingsList from "../AuditFindings/AuditFindingsList";
import AuditAssignmentsList from "../AuditAssignments/AuditAssignmentsList";
import AuditTimeline from "../AuditTimeline/AuditTimeline";
import AuditApprovalPanel from "../AuditApproval/AuditApprovalPanel";
import AuditClosurePanel from "../AuditClosure/AuditClosurePanel";
import AuditExportPanel from "../AuditExport/AuditExportPanel";
import AuditHistoryPanel from "../AuditHistory/AuditHistoryPanel";

interface AuditLifecyclePanelProps {
  auditId: string;
}

export default function AuditLifecyclePanel({
  auditId,
}: AuditLifecyclePanelProps) {
  if (!auditId) {
    return null;
  }

  return (
    <div className="audit-business-modules">
      <AuditFindingsList auditId={auditId} />

      <AuditAssignmentsList auditId={auditId} />

      <AuditTimeline auditId={auditId} />

      <AuditApprovalPanel auditId={auditId} />

      <AuditClosurePanel auditId={auditId} />

      <AuditExportPanel auditId={auditId} />

      <AuditHistoryPanel auditId={auditId} />
    </div>
  );
}
