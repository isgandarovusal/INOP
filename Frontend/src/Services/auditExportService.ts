import API_BASE_URL from "./../config/api";
function downloadAuditFile(
  auditId: string,
  format: "pdf" | "excel" | "csv"
) {
  const url =
    `${API_BASE_URL}/audit-export/${auditId}/${format}`;

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
