import API_BASE_URL from "./../config/api";
export interface AuditFinding {
  _id: string;
  title: string;
  description: string;
  severity: string;
  status: string;
}




export async function getFindings(
 auditId: string,
): Promise<{ data: AuditFinding[] }> {

 const res =
 await fetch(
 `${API_BASE_URL}/audit-findings/${auditId}`
 );

 return res.json();

}


export async function createFinding(data: Record<string, unknown>){

 const res =
 await fetch(
 `${API_BASE_URL}/audit-findings`,
 {
  method:"POST",
  headers:{
   "Content-Type":"application/json"
  },
  body:JSON.stringify(data)
 });

 return res.json();

}
