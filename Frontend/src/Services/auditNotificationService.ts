import API_BASE_URL from "./../config/api";
export interface AuditNotification {
  _id: string;
  title: string;
  message: string;
  read: boolean;
}




export async function getAuditNotifications():
 Promise<{ data: AuditNotification[] }> {

 const res =
 await fetch(
  `${API_BASE_URL}/audit-notification`
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
  `${API_BASE_URL}/audit-notification/${id}/read`,
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
