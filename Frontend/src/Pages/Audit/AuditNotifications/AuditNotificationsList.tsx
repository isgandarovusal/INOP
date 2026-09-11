import {
 useEffect,
 useState
} from "react";

import {
 getAuditNotifications,
 markNotificationRead
}
from "../../../Services/auditNotificationService";


export default function AuditNotificationsList(){

 const [
  notifications,
  setNotifications
 ] = useState<any[]>([]);


 const [
  loading,
  setLoading
 ] = useState(true);



 async function load(){

  try{

   const result =
    await getAuditNotifications();


   setNotifications(
    result.data || []
   );


  }
  finally{

   setLoading(false);

  }

 }



 useEffect(()=>{

  load();

 },[]);



 async function read(id:string){

  await markNotificationRead(id);

  load();

 }



 if(loading){

  return (
   <div>
    Loading notifications...
   </div>
  );

 }



 return (

 <div className="detail-card">

  <h2>
   Audit Notifications
  </h2>


  {
   notifications.length===0 ?

   <p>
    No notifications
   </p>

   :

   notifications.map(
    item=>(

    <div
     key={item._id}
     className="detail-row"
    >

     <div>

      <strong>
       {item.title}
      </strong>

      <p>
       {item.message}
      </p>

     </div>


     {
      !item.read &&
      <button
       onClick={()=>
        read(item._id)
       }
      >
       Mark read
      </button>
     }


    </div>

    )

   )

  }


 </div>

 );

}
