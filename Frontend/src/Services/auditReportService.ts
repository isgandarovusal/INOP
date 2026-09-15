import API_BASE_URL from "./../config/api";
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




async function request<T>(
 path: string,
): Promise<T> {

 const res =
 await fetch(`${API_BASE_URL}${path}`);


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
  `${API_BASE_URL}/audit-score/${id}/calculate`,
  {
   method:"POST"
  }
 )
 .then(r=>r.json());

}
