import {
 useEffect,
 useState
} from "react";


import {
 useParams
} from "react-router-dom";


import {
 getAuditReport,
 calculateAuditScore
} from "../../../Services/auditReportService";



export default function AuditReportDetail(){


 const {
  id
 } = useParams();



 const [
  report,
  setReport
 ] = useState<any>(null);



 const [
  loading,
  setLoading
 ] = useState(true);



 useEffect(()=>{


  if(!id)return;


  getAuditReport(id)
  .then(res=>{

    setReport(
     res.data
    );

  })
  .finally(()=>{

    setLoading(false);

  });


 },[id]);





 if(loading){

  return (
   <div>
    Loading audit report...
   </div>
  );

 }




 if(!report){

  return (
   <div>
    Audit report not found
   </div>
  );

 }




 return (

  <div className="audit-report">


   <h1>
    Audit Report
   </h1>



   <div className="audit-card">

    <p>
     Type:
     {" "}
     {report.type}
    </p>


    <p>
     Status:
     {" "}
     {report.status}
    </p>


    <p>
     Score:
     {" "}
     {report.score}
    </p>


   </div>





   <div className="audit-card">

    <h3>
     Checklist
    </h3>


    <p>
     Total:
     {" "}
     {report.summary.totalChecks}
    </p>


    <p>
     Passed:
     {" "}
     {report.summary.passed}
    </p>


    <p>
     Failed:
     {" "}
     {report.summary.failed}
    </p>


   </div>





   {
    report.safety &&

    <div className="audit-card">

     <h3>
      Occupational Safety
     </h3>


     <p>
      Risk:
      {" "}
      {report.safety.riskLevel}
     </p>


     <p>
      Violations:
      {" "}
      {report.safety.violations?.length || 0}
     </p>


    </div>

   }



   <button

    onClick={()=>{

     if(id)

     calculateAuditScore(id);

    }}

   >

    Recalculate Score

   </button>



  </div>

 );


}
