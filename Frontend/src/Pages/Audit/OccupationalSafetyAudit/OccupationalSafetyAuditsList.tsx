import {useEffect,useState} from "react";


const API =
 import.meta.env.VITE_API_BASE_URL ||
 "http://localhost:3001/api";



export default function OccupationalSafetyAuditsList(){


 const [audits,setAudits]=useState<any[]>([]);

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



 if(loading){

  return <div>Loading...</div>;

 }



 return (

  <div>

   <h2>
    Occupational Safety Audit
   </h2>


   <table>

    <thead>

     <tr>

      <th>Status</th>

      <th>Audit Type</th>

      <th>Date</th>

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
