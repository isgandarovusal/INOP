import api from "../api/axios";
import { downloadBlob } from "../Utils/downloadFile";
async function downloadAuditFile(auditId: string, format: "pdf" | "excel" | "csv", signal?: AbortSignal) {
 const response=await api.get(`/audit-export/${encodeURIComponent(auditId)}/${format}`,{responseType:"blob",signal});
 if (signal?.aborted) return;
 downloadBlob(response.data, `audit-${auditId}.${format === "excel" ? "xlsx" : format}`);
}
export function exportAuditPdf(id:string,signal?:AbortSignal){return downloadAuditFile(id,"pdf",signal);}
export function exportAuditExcel(id:string,signal?:AbortSignal){return downloadAuditFile(id,"excel",signal);}
export function exportAuditCsv(id:string,signal?:AbortSignal){return downloadAuditFile(id,"csv",signal);}
