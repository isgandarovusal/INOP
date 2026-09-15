import API_BASE_URL from "./../config/api";
export async function checkAuditAccess(){

 const res =
 await fetch(
 `${API_BASE_URL}/audit-permission/check`
 );

 return res.json();

}
