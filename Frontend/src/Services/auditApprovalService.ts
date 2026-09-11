const API =
 import.meta.env.VITE_API_BASE_URL ||
 "http://localhost:3001/api";


async function request(
 path:string,
 options:any={}
){

 const res =
 await fetch(
  `${API}${path}`,
  {
   headers:{
    "Content-Type":"application/json"
   },
   ...options
  }
 );


 const data =
 await res.json();


 if(!res.ok){
  throw new Error(
   data.message ||
   "Audit approval request failed"
  );
 }


 return data;

}



export function getApprovals(
 auditId:string
){

 return request(
  `/audit-approval/${auditId}`
 );

}



export function createApproval(
 payload:any
){

 return request(
  "/audit-approval",
  {
   method:"POST",
   body:
    JSON.stringify(payload)
  }
 );

}



export function updateApproval(
 id:string,
 payload:any
){

 return request(
  `/audit-approval/${id}`,
  {
   method:"PATCH",
   body:
    JSON.stringify(payload)
  }
 );

}
