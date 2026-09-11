import {
 useEffect,
 useState
} from "react";

import {
 getFindings
} from "../../../Services/auditFindingService";


export default function AuditFindingsList(
{
 auditId
}:{
 auditId:string
}){


const [items,setItems]=useState<any[]>([]);


useEffect(()=>{

getFindings(auditId)
.then(r=>{
 setItems(r.data||[]);
});

},[auditId]);



return (

<div className="audit-section">

<h2>
Audit Findings
</h2>


{
items.length===0?

<p>
No findings
</p>

:

items.map(item=>(

<div
key={item._id}
className="audit-card"
>

<h4>
{item.title}
</h4>

<p>
{item.description}
</p>


<span>
Severity: {item.severity}
</span>


<br/>

<span>
Status: {item.status}
</span>


</div>

))

}


</div>

);

}
