import {
Link
} from "react-router-dom";


export default function AuditHome(){


return (

<div>

<h1>
Audit Management
</h1>


<div className="audit-grid">


<Link to="/app/audit/analytics">
Analytics
</Link>


<Link to="/app/audit/standard">
Standard Audit
</Link>


<Link to="/app/audit/service">
Service Audit
</Link>


<Link to="/app/audit/safety">
Occupational Safety Audit
</Link>


<Link to="/app/audit/checklists">
Checklists
</Link>


</div>


</div>

);

}
