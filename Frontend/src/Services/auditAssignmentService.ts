import API_BASE_URL from "./../config/api";
export interface AuditAssignment {
  _id: string;
  auditor?: {
    name?: string;
  } | null;
  status: string;
}


export async function getAssignments(
  id: string,
): Promise<{ data: AuditAssignment[] }> {
  const res = await fetch(
    `${API_BASE_URL}/audit-assignments/${id}`,
  );

  if (!res.ok) {
    throw new Error("Failed to load audit assignments");
  }

  return res.json();
}



export async function assignAudit(data: Record<string, unknown>){

 const res =
 await fetch(
 `${API_BASE_URL}/audit-assignments`,
 {
  method:"POST",
  headers:{
   "Content-Type":"application/json"
  },
  body:JSON.stringify(data)
 });

 return res.json();

}
