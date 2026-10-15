import { useTranslation } from "react-i18next";
import {
 useEffect,
 useState
} from "react";

import PageState from "../../../Components/PageState";
import AuditResourceState from "../../../Components/AuditResourceState";


import {
 useParams
} from "react-router-dom";


import {
 getAuditReport,
 calculateAuditScore,
 type AuditReport,
} from "../../../Services/auditReportService";



export default function AuditReportDetail(){
 const {t}=useTranslation();


 const {
  id
 } = useParams();



 const [
  report,
  setReport
 ] = useState<AuditReport | null>(null);



 const [
  loading,
  setLoading
 ] = useState(true);



 const [failed, setFailed] = useState(false);
 const [attempt, setAttempt] = useState(0);
 const [loadedId, setLoadedId] = useState<string>();

 useEffect(()=>{
  let active = true;



  if(!id) return;


  getAuditReport(id)
  .then(res=>{

    if(active) setReport(res.data);

  })
  .catch(()=>{ if(active) setFailed(true); })
  .finally(()=>{

    if(active) { setLoading(false); setLoadedId(id); }

  });


  return () => { active = false; };
 },[id, attempt]);





 if(!id) return <AuditResourceState status="not-found" />;

 if(loading || loadedId !== id){

  return <PageState type="loading" title={t("auditPresentation.states.loading")} />;

 }




 if(failed) return <AuditResourceState status="error" retry={()=>{setLoading(true);setFailed(false);setAttempt(value=>value+1);}} />;

 if(!report){

  return (
   <div>
    {t("auditPresentation.states.not-found")}
   </div>
  );

 }




 return (

  <div className="audit-report">


   <h1>
    {t("auditPresentation.report")}
   </h1>



   <div className="audit-card">

    <p>
     {t("auditPresentation.type")}:
     {" "}
     {report.type}
    </p>


    <p>
     {t("auditFoundation.status")}:
     {" "}
     {report.status}
    </p>


    <p>
     {t("auditPresentation.score")}:
     {" "}
     {report.score===null?'—':`${report.score}${report.hr?'%':''}`}
    </p>
     {report.hr&&<><p>{t(report.hr.assessment.contract==='blocked-kfc-denominator'?'hrAudit.kfcBlocked':'hrAudit.scale')}</p><p>{report.hr.details.observations}</p><p>{report.hr.details.finalOpinion}</p></>}
     {report.hr&&<p>{t('hrAudit.nonconformities')}: {report.hr.nonconformities}</p>}
     {report.hr?.assessment.sections.map(section=><p key={section.id}>{section.title}: {section.percentage===null?'—':`${section.percentage.toFixed(1)}%`}</p>)}


   </div>





   {!report.hr&&<div className="audit-card">

    <h3>
     {t("auditPresentation.checklist")}
    </h3>


    <p>
     {t("auditFoundation.metrics.total")}:
     {" "}
     {report.summary.totalChecks}
    </p>


    <p>
     {t("auditPresentation.passed")}:
     {" "}
     {report.summary.passed}
    </p>


    <p>
     {t("auditPresentation.failed")}:
     {" "}
     {report.summary.failed}
    </p>


   </div>}





   {
    report.safety &&

    <div className="audit-card">

     <h3>
      {t("auditFoundation.directions.occupational-safety")}
     </h3>


     <p>
      {t("auditPresentation.risk")}:
      {" "}
      {report.safety.riskLevel}
     </p>


     <p>
      {t("auditPresentation.violations")}:
      {" "}
      {report.safety.violations?.length || 0}
     </p>


    </div>

   }



   {report.type!=='hr'&&<button className="btn-secondary" type="button"

    onClick={()=>{

     if(id)

     calculateAuditScore(id);

    }}

   >

    {t("auditPresentation.recalculate")}

   </button>}



  </div>

 );


}
