import { useTranslation } from "react-i18next";
import {
 useEffect,
 useState
} from "react";

import PageState from "../../../Components/PageState";
import AuditResourceState from "../../../Components/AuditResourceState";

import {
 getAuditNotifications,
 markNotificationRead,
 type AuditNotification,
}
from "../../../Services/auditNotificationService";


export default function AuditNotificationsList(){
 const {t}=useTranslation();

 const [
  notifications,
  setNotifications
 ] = useState<AuditNotification[]>([]);


 const [
  loading,
  setLoading
 ] = useState(true);



 const [failed, setFailed] = useState(false);

 async function load(){

  try{

   const result =
    await getAuditNotifications();


   setFailed(false);
   setNotifications(
    result.data || []
   );


  }
  catch { setFailed(true); }
  finally{

   setLoading(false);

  }

 }



 useEffect(()=>{

  let active = true;
  void getAuditNotifications().then(result => { if(active) setNotifications(result.data || []); })
   .catch(() => { if(active) setFailed(true); })
   .finally(() => { if(active) setLoading(false); });
  return () => { active = false; };
 },[]);



 async function read(id:string){

  try {
   await markNotificationRead(id);
   await load();
  } catch { setFailed(true); }

 }



 if(loading){

  return <PageState type="loading" title={t("auditPresentation.states.loading")} />;

 }



 return (

 <div className="audit-modern-card">

  {failed && <AuditResourceState status="error" retry={()=>void load()} />}
  <h2>
   {t("auditFoundation.notifications")}
  </h2>


  {
   notifications.length===0 && !failed ?

   <p>
    {t("auditPresentation.noNotifications")}
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
      <button className="btn-secondary" type="button"
       onClick={()=>
        read(item._id)
       }
      >
       {t("auditPresentation.markRead")}
      </button>
     }


    </div>

    )

   )

  }


 </div>

 );

}
