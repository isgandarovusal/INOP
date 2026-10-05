import {
 useEffect,
 useState
} from "react";

import PageState from "../../../Components/PageState";

import {
 useParams
} from "react-router-dom";

import {
 getAuditExecution,
 submitAuditAnswers,
 type AuditExecution,
 type AuditExecutionAnswer,
} from "../../../Services/auditExecutionService";


export default function AuditExecutionPage(){


 const {
  id
 } = useParams();


 const [
  execution,
  setExecution
 ] = useState<AuditExecution | null>(null);


 const [
  answers,
  setAnswers
 ] = useState<AuditExecutionAnswer[]>([]);



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
  value:string
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

  return <PageState type="loading" />;

 }



 const checklist = execution.checklist || [];
 const totalQuestions = checklist.length;

 const answeredQuestions = checklist.reduce(
  (count, _item, index) =>
   answers[index]?.value?.trim()
    ? count + 1
    : count,
  0
 );

 const progress =
  totalQuestions > 0
   ? Math.round(
      (answeredQuestions / totalQuestions) * 100
     )
   : 0;


 return (

 <div className="audit-execution">

  <header className="audit-execution__header">

   <span className="audit-execution__eyebrow">
    AUDIT EXECUTION
   </span>

   <h1>
    Audit Execution
   </h1>

   <p>
    Complete each checklist item before submitting the audit.
   </p>

  </header>


  <section className="audit-execution__progress">

   <div className="audit-execution__progress-top">

    <div>

     <span className="audit-execution__progress-label">
      CHECKLIST PROGRESS
     </span>

     <strong>
      {answeredQuestions} / {totalQuestions}
     </strong>

    </div>

    <span className="audit-execution__progress-percent">
     {progress}%
    </span>

   </div>

   <div
    className="audit-execution__progress-track"
    aria-hidden="true"
   >

    <div
     className="audit-execution__progress-fill"
     style={{
      width: `${progress}%`
     }}
    />

   </div>

  </section>


  <section className="audit-execution__questions">

   {
    checklist.map(
     (item,index:number)=>{

      const isAnswered =
       Boolean(
        answers[index]?.value?.trim()
       );


      return (

       <article
        key={index}
        className={
         `audit-question ${
          isAnswered
           ? "audit-question--answered"
           : ""
         }`
        }
       >

        <div className="audit-question__number">
         {String(index + 1).padStart(2, "0")}
        </div>


        <div className="audit-question__body">

         <div className="audit-question__topline">

          <span className="audit-question__label">
           CHECKLIST ITEM
          </span>

          {
           isAnswered && (

            <span className="audit-question__state">
             Answered
            </span>

           )
          }

         </div>


         <h3>
          {item.question}
         </h3>


         <input
          value={
           answers[index]?.value || ""
          }
          onChange={
           e =>
            updateAnswer(
             index,
             e.target.value
            )
          }
          placeholder="Enter your answer"
         />

        </div>

       </article>

      );

     }
    )
   }

  </section>


  <div className="audit-execution__actions">

   <div className="audit-execution__action-copy">

    <span>
     {answeredQuestions} of {totalQuestions} completed
    </span>

    <small>
     Review your responses before completing the audit.
    </small>

   </div>


   <button
    type="button"
    className="btn-primary audit-execution__submit"
    onClick={submit}
   >

    Submit Audit

    <span aria-hidden="true">
     →
    </span>

   </button>

  </div>


 </div>

 );

}
