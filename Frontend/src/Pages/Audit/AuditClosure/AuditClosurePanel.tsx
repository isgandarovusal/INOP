import {
 useState
} from "react";


import {
 closeAudit
}
from "../../../Services/auditClosureService";



export default function AuditClosurePanel(
{
 auditId
}:{
 auditId:string
}){


const [
 message,
 setMessage
]=useState("");



async function close(){

try{


await closeAudit({

 auditId,

 comment:
 "Audit completed"

});


setMessage(
"Audit closed successfully"
);


}
catch(e:any){

setMessage(
e.message
);

}


}



return (

<div className="detail-card">

<h3>
Audit Closure
</h3>


<button
onClick={close}
>
Close Audit
</button>


<p>
{message}
</p>


</div>

);

}
