const API =
  import.meta.env.VITE_API_BASE_URL ||
  "http://localhost:3001/api";


function downloadAuditFile(
  auditId: string,
  format: "pdf" | "excel" | "csv"
) {
  const url =
    `${API}/audit-export/${auditId}/${format}`;

  window.open(
    url,
    "_blank",
    "noopener,noreferrer"
  );
}


export function exportAuditPdf(
  auditId: string
) {
  downloadAuditFile(
    auditId,
    "pdf"
  );
}


export function exportAuditExcel(
  auditId: string
) {
  downloadAuditFile(
    auditId,
    "excel"
  );
}


export function exportAuditCsv(
  auditId: string
) {
  downloadAuditFile(
    auditId,
    "csv"
  );
}
