const API =
 import.meta.env.VITE_API_BASE_URL ||
 "http://localhost:3001/api";


export async function getAssignments(id:string){

 const res =
 await fetch(
 `${API}/audit-assignments/${id}`
 );

 return res.json();

}



export async function assignAudit(data:any){

 const res =
 await fetch(
 `${API}/audit-assignments`,
 {
  method:"POST",
  headers:{
   "Content-Type":"application/json"
  },
  body:JSON.stringify(data)
 });

 return res.json();

}
