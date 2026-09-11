import {
  exportAuditCsv,
  exportAuditExcel,
  exportAuditPdf
} from "../../../Services/auditExportService";


export default function AuditExportPanel({
  auditId
}: {
  auditId: string;
}) {
  return (
    <div className="detail-card">
      <h3>
        Audit Export
      </h3>

      <div
        style={{
          display: "flex",
          gap: "8px",
          flexWrap: "wrap"
        }}
      >
        <button
          type="button"
          onClick={() =>
            exportAuditPdf(auditId)
          }
        >
          Export PDF
        </button>

        <button
          type="button"
          onClick={() =>
            exportAuditExcel(auditId)
          }
        >
          Export Excel
        </button>

        <button
          type="button"
          onClick={() =>
            exportAuditCsv(auditId)
          }
        >
          Export CSV
        </button>
      </div>
    </div>
  );
}
