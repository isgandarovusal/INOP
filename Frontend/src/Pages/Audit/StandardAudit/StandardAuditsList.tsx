import "../auditModern.css";
import { useTranslation } from "react-i18next";
import { useEffect, useState } from "react";

const API =
  import.meta.env.VITE_API_BASE_URL ||
  "http://localhost:3001/api";


export default function StandardAuditsList(){

 const { t } = useTranslation();
 const [audits,setAudits] = useState<any[]>([]);
 const [loading,setLoading] = useState(true);


 useEffect(()=>{

  fetch(`${API}/audit-module/standard`)
   .then(r=>r.json())
   .then(res=>{
     setAudits(res.data || []);
   })
   .finally(()=>{
     setLoading(false);
   });

 },[]);



 if(loading){
  return <div>{t("audit.standard.list.loading")}</div>;
 }


 return (

  <div>

   <h2>{t("audit.standard.list.title")}</h2>


   <table>

    <thead>
     <tr>
      <th>{t("audit.standard.list.status")}</th>
      <th>{t("audit.standard.list.type")}</th>
      <th>{t("audit.standard.list.date")}</th>
     </tr>
    </thead>


    <tbody>

    {
     audits.map(a=>(

      <tr key={a._id}>

       <td>
        {a.status}
       </td>

       <td>
        {a.auditType}
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
