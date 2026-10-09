import api from "../api/axios";
async function downloadAuditFile(auditId: string, format: "pdf" | "excel" | "csv", signal?: AbortSignal) {
 const response=await api.get(`/audit-export/${auditId}/${format}`,{responseType:"blob",signal});
 if (signal?.aborted) return;
 const url=URL.createObjectURL(response.data);
 const link=document.createElement("a"); link.href=url;
 link.download=`audit-${auditId}.${format === "excel" ? "xlsx" : format}`;
 link.click(); setTimeout(()=>URL.revokeObjectURL(url),0);
}
export function exportAuditPdf(id:string,signal?:AbortSignal){return downloadAuditFile(id,"pdf",signal);}
export function exportAuditExcel(id:string,signal?:AbortSignal){return downloadAuditFile(id,"excel",signal);}
export function exportAuditCsv(id:string,signal?:AbortSignal){return downloadAuditFile(id,"csv",signal);}
