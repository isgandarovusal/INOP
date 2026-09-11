const API =
 import.meta.env.VITE_API_BASE_URL ||
 "http://localhost:3001/api";


async function request(path:string){

 const res = await fetch(
  `${API}${path}`
 );

 if(!res.ok){
  throw new Error("Analytics request failed");
 }

 return res.json();

}


export function getAuditSummary(){

 return request(
  "/audit-analytics/summary"
 );

}


export function getAuditTypeAnalytics(){

 return request(
  "/audit-analytics/type"
 );

}


export function getAuditTrend(){

 return request(
  "/audit-analytics/trend"
 );

}
