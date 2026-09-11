import {
 useEffect,
 useState
} from "react";

import {
 useParams
} from "react-router-dom";

import {
 getAuditExecution,
 submitAuditAnswers
} from "../../../Services/auditExecutionService";


export default function AuditExecutionPage(){


 const {
  id
 } = useParams();


 const [
  execution,
  setExecution
 ] = useState<any>(null);


 const [
  answers,
  setAnswers
 ] = useState<any[]>([]);



 useEffect(()=>{

  if(!id)
   return;


  getAuditExecution(id)
   .then(res=>{

    setExecution(
     res.data
    );


    setAnswers(
     res.data.answers || []
    );

   });


 },[id]);




 function updateAnswer(
  index:number,
  value:any
 ){

  const copy=[
   ...answers
  ];


  copy[index]={
   ...copy[index],
   value
  };


  setAnswers(copy);

 }



 async function submit(){

  if(!id)
   return;


  await submitAuditAnswers(
   id,
   answers
  );


  alert(
   "Audit completed"
  );

 }



 if(!execution){

  return (
   <div>
    Loading audit...
   </div>
  );

 }



 return (

 <div className="audit-execution">


  <h1>
   Audit Execution
  </h1>


  {
   execution.checklist?.map(
    (item:any,index:number)=>(

    <div
     key={index}
     className="audit-question"
    >

     <h3>
      {item.question}
     </h3>


     <input

      value={
       answers[index]?.value || ""
      }

      onChange={
       e=>
       updateAnswer(
        index,
        e.target.value
       )
      }

     />


    </div>

    )

   )
  }



  <button
   onClick={submit}
  >

   Submit Audit

  </button>


 </div>

 );

}
