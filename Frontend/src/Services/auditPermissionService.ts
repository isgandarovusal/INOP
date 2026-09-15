const API =
 import.meta.env.VITE_API_BASE_URL ||
 "http://localhost:3001/api";


export async function checkAuditAccess(){

 const res =
 await fetch(
 `${API}/audit-permission/check`
 );

 return res.json();

}
