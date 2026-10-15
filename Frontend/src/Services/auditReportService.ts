import {readJson} from '../api/readRequest';
import api from '../api/axios';
export interface AuditReport {
  type: string;
  status: string;
  score: number|null;
  service?:{details:import('./serviceAuditService').ServiceDetails;assessment:{sections?:{id:string;title:string;percentage:number|null}[]};nonconformities:number};
  hr?: {details:import('./hrAuditService').HRDetails;assessment:{contract:string;sections:{id:string;title:string;percentage:number|null}[]};nonconformities:number};
  summary: {
    totalChecks: number;
    passed: number;
    failed: number;
  };
  safety?: {
    riskLevel: string;
    violations?: unknown[];
  };
}

export function getAuditReport(
 id: string,
): Promise<{ data: AuditReport }> {
 return readJson<{ data: AuditReport }>(
  `/audit-report/${id}`,
 );
}



export async function calculateAuditScore(id:string){return (await api.post(`/audit-score/${encodeURIComponent(id)}/calculate`)).data;}
