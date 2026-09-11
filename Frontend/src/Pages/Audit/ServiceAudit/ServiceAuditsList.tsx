import "../auditModern.css";
import {useEffect,useState} from "react";
import { useTranslation } from "react-i18next";


const API =
 import.meta.env.VITE_API_BASE_URL ||
 "http://localhost:3001/api";


export default function ServiceAuditsList(){

 const { t } = useTranslation();
 const [audits,setAudits] = useState<any[]>([]);
 const [loading,setLoading] = useState(true);



 useEffect(()=>{

  fetch(`${API}/audit-module/service`)
  .then(r=>r.json())
  .then(res=>{
    setAudits(res.data || []);
  })
  .finally(()=>{
    setLoading(false);
  });


 },[]);



 if(loading){
  return <div>{t("audit.service.list.loading")}</div>;
 }



 return (

  <div>

   <h2>
    {t("audit.service.list.title")}
   </h2>


   <table>

    <thead>

     <tr>
      <th>{t("audit.service.list.status")}</th>
      <th>{t("audit.service.list.type")}</th>
      <th>{t("audit.service.list.date")}</th>
     </tr>

    </thead>


    <tbody>

    {
     audits.map(a=>(

      <tr key={a._id}>

       <td>
        {t(`common.status.${a.status}`, { defaultValue: a.status })}
       </td>

       <td>
        {t("audit.types.service")}
       </td>

       <td>
        {new Date(a.createdAt)
        .toLocaleDateString()}
       </td>

      </tr>

     ))
    }

    </tbody>

   </table>


  </div>

 );

}
