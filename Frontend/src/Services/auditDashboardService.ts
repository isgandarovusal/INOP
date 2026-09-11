const API =
  import.meta.env.VITE_API_BASE_URL ||
  "http://localhost:3001/api";


async function request(path:string){

  const res = await fetch(`${API}${path}`);

  if(!res.ok){
    throw new Error("Audit dashboard request failed");
  }

  return res.json();
}


export function getAuditDashboard(){

  return request(
    "/audit-dashboard"
  );

}
