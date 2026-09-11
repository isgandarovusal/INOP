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


 if(!res.ok){
  throw new Error(
   "Audit execution request failed"
  );
 }


 return res.json();

}



export function getAuditExecution(id:string){

 return request(
  `/audit-execution/${id}`
 );

}



export function startAuditExecution(data:any){

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
 answers:any[]
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
