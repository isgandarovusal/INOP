import {
 useEffect,
 useState
} from "react";


import {
 getAssignments
} from "../../../Services/auditAssignmentService";



export default function AuditAssignmentsList(
{
auditId
}:{
auditId:string
}){


const [data,setData]=useState<any[]>([]);



useEffect(()=>{

getAssignments(auditId)
.then(r=>{
setData(r.data||[]);
});


},[auditId]);



return (

<div>

<h2>
Audit Assignments
</h2>


{
data.map(x=>(

<div
className="audit-card"
key={x._id}
>

Auditor:
{x.auditor?.name || "Unknown"}

<br/>

Status:
{x.status}


</div>

))

}


</div>

);

}
