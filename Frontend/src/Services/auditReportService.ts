const API =
 import.meta.env.VITE_API_BASE_URL ||
 "http://localhost:3001/api";


async function request(path:string){

 const res =
 await fetch(`${API}${path}`);


 if(!res.ok){

  throw new Error(
   "Audit report request failed"
  );

 }


 return res.json();

}



export function getAuditReport(id:string){

 return request(
  `/audit-report/${id}`
 );

}



export function calculateAuditScore(id:string){

 return fetch(
  `${API}/audit-score/${id}/calculate`,
  {
   method:"POST"
  }
 )
 .then(r=>r.json());

}
