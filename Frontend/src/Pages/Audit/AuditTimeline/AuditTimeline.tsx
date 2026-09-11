import {
useEffect,
useState
} from "react";


import {
getAuditTimeline
} from "../../../Services/auditTimelineService";



export default function AuditTimeline(
{
auditId
}:{
auditId:string
}){


const [items,setItems]=useState<any[]>([]);



useEffect(()=>{

getAuditTimeline(auditId)
.then(r=>{
setItems(r.data||[]);
});

},[auditId]);



return (

<div>

<h2>
Audit Timeline
</h2>


{
items.map(
item=>(

<div
key={item._id}
className="audit-card"
>

<strong>
{item.action}
</strong>


<p>
{item.description}
</p>


<small>
{
new Date(item.createdAt)
.toLocaleString()
}
</small>


</div>

)
)

}

</div>

);

}
