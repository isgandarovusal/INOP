const API =
 import.meta.env.VITE_API_BASE_URL ||
 "http://localhost:3001/api";


export async function getFindings(auditId:string){

 const res =
 await fetch(
 `${API}/audit-findings/${auditId}`
 );

 return res.json();

}


export async function createFinding(data:any){

 const res =
 await fetch(
 `${API}/audit-findings`,
 {
  method:"POST",
  headers:{
   "Content-Type":"application/json"
  },
  body:JSON.stringify(data)
 });

 return res.json();

}
