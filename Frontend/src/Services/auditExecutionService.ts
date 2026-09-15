import API_BASE_URL from "./../config/api";
export interface AuditExecutionChecklistItem {
  question: string;
}

export interface AuditExecutionAnswer {
  value?: string;
  [key: string]: unknown;
}

export interface AuditExecution {
  checklist: AuditExecutionChecklistItem[];
  answers: AuditExecutionAnswer[];
}

async function request<T>(
 path: string,
 options: RequestInit = {},
): Promise<T> {

 const res =
 await fetch(
  `${API_BASE_URL}${path}`,
  {
   headers:{
    "Content-Type":"application/json"
   },
   ...options
  }
 );


 if(!res.ok){
  throw new Error(
   "Audit execution request failed"
  );
 }


 return res.json();

}



export function getAuditExecution(
  id: string,
): Promise<{ data: AuditExecution }> {
  return request<{ data: AuditExecution }>(
    `/audit-execution/${id}`,
  );
}



export function startAuditExecution(data: Record<string, unknown>){

 return request(
  "/audit-execution",
  {
   method:"POST",
   body:JSON.stringify(data)
  }
 );

}



export function submitAuditAnswers(
 id:string,
 answers: unknown[]
){

 return request(
  `/audit-execution/${id}/submit`,
  {
   method:"PATCH",
   body:JSON.stringify({
    answers
   })
  }
 );

}
