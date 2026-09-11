const API =
 import.meta.env.VITE_API_BASE_URL ||
 "http://localhost:3001/api";


export async function getAuditTimeline(id:string){

 const res =
 await fetch(
 `${API}/audit-timeline/${id}`
 );

 return res.json();

}
