export interface AuditNotification {
  _id: string;
  title: string;
  message: string;
  read: boolean;
}

const API =
 import.meta.env.VITE_API_BASE_URL ||
 "http://localhost:3001/api";


export async function getAuditNotifications():
 Promise<{ data: AuditNotification[] }> {

 const res =
 await fetch(
  `${API}/audit-notification`
 );


 if(!res.ok){
  throw new Error(
   "Notification fetch failed"
  );
 }


 return res.json();

}



export async function markNotificationRead(
 id:string
){

 const res =
 await fetch(
  `${API}/audit-notification/${id}/read`,
  {
   method:"PATCH",
   headers:{
    "Content-Type":"application/json"
   }
  }
 );


 if(!res.ok){
  throw new Error(
   "Notification update failed"
  );
 }


 return res.json();

}
