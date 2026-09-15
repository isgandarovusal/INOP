import "../auditModern.css";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";


import PageState from "../../../Components/PageState";
const API =
 import.meta.env.VITE_API_BASE_URL ||
 "http://localhost:3001/api";

interface OccupationalSafetyAudit {
  _id: string;
  status: string;
  auditType: string;
  createdAt: string;
}

export default function OccupationalSafetyAuditsList(){
  const { t } = useTranslation();


 const [audits,setAudits]=useState<OccupationalSafetyAudit[]>([]);

 const [loading,setLoading]=useState(true);



 useEffect(()=>{


  fetch(`${API}/occupational-safety-audits`)

  .then(r=>r.json())

  .then(res=>{

    setAudits(res.data || []);

  })

  .finally(()=>{

    setLoading(false);

  });


 },[]);



 if (loading) {
  return (
    <PageState
      type="loading"
      title={t("audit.safety.list.loading")}
    />
  );
}

return (

  <div className="audit-modern-page">

   <div className="audit-modern-header">
    <div>
     <h1>Occupational Safety Audit</h1>
     <p>{t("audit.safety.list.subtitle")}</p>
    </div>
   </div>

   <section className="audit-card">
    <div className="audit-card-header">
     <div>
      <h3>{t("audit.safety.list.title")}</h3>
      <p>{t("audit.safety.list.subtitle")}</p>
     </div>
     <strong>{audits.length}</strong>
    </div>

   <div className="audit-modern-table-wrapper">
   <table className="audit-modern-table">

    <thead>

     <tr>

      <th>{t("audit.safety.list.status")}</th>

      <th>{t("audit.safety.list.auditType")}</th>

      <th>{t("audit.safety.list.date")}</th>

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
   </section>


  </div>

 );


}
