import {
 useEffect,
 useState
} from "react";

import {
 getApprovals,
 updateApproval
}
from "../../../Services/auditApprovalService";


export default function AuditApprovalPanel(
{
 auditId
}:{
 auditId:string
}){


const [
 approvals,
 setApprovals
]=useState<any[]>([]);


const load =
async()=>{

 const res =
 await getApprovals(
  auditId
 );


 setApprovals(
  res.data || []
 );

};


useEffect(()=>{

 load();

},[auditId]);




async function changeStatus(
 id:string,
 status:string
){

 await updateApproval(
  id,
  {
   status
  }
 );


 load();

}



return (

<div className="detail-card">

<h3>
 Audit Approval
</h3>


{
approvals.length===0
?
<p>
No approval requests
</p>
:
approvals.map(
 item=>(

<div
key={item._id}
className="detail-row"
>


<div>

<strong>
{item.status}
</strong>


<p>
{item.comment}
</p>

</div>


<div>

<button
onClick={()=>changeStatus(
 item._id,
 "approved"
)}
>
Approve
</button>


<button
onClick={()=>changeStatus(
 item._id,
 "rejected"
)}
>
Reject
</button>


</div>


</div>

)

)

}


</div>

);


}
