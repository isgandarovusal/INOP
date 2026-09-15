export interface AuditReport {
  type: string;
  status: string;
  score: number;
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

const API =
 import.meta.env.VITE_API_BASE_URL ||
 "http://localhost:3001/api";


async function request<T>(
 path: string,
): Promise<T> {

 const res =
 await fetch(`${API}${path}`);


 if(!res.ok){

  throw new Error(
   "Audit report request failed"
  );

 }


 return res.json();

}



export function getAuditReport(
 id: string,
): Promise<{ data: AuditReport }> {
 return request<{ data: AuditReport }>(
  `/audit-report/${id}`,
 );
}



export function calculateAuditScore(id:string){

 return fetch(
  `${API}/audit-score/${id}/calculate`,
  {
   method:"POST"
  }
 )
 .then(r=>r.json());

}
