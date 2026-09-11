import { useEffect, useState } from "react";
import {
 ResponsiveContainer,
 BarChart,
 Bar,
 XAxis,
 YAxis,
 Tooltip,
 LineChart,
 Line,
 CartesianGrid,
 PieChart,
 Pie,
 Cell
} from "recharts";

import {
 ClipboardCheck,
 CheckCircle,
 AlertTriangle,
 TrendingUp
} from "lucide-react";

import {
 getAuditDashboard
} from "../../../Services/auditDashboardService";


const EMPTY = {

 totalAudits:0,
 completedAudits:0,
 pendingAudits:0,
 averageScore:0,
 riskStats:[],
 typeStats:[],
 trend:[]
};



export default function AuditDashboard(){


 const [data,setData] = useState<any>(EMPTY);

 const [loading,setLoading] = useState(true);



 useEffect(()=>{

   getAuditDashboard()
    .then((res)=>{

      if(res.data){
        setData(res.data);
      }
      else{
        setData(res);
      }

    })
    .finally(()=>setLoading(false));


 },[]);



 if(loading){

   return (
    <div>
      Loading audit dashboard...
    </div>
   );

 }



 return (

 <div className="audit-dashboard">


 <h1>
 Audit Dashboard
 </h1>



 <div className="kpi-grid">


 <div className="kpi-card">

  <ClipboardCheck />

  <span>
   Total Audits
  </span>

  <strong>
   {data.totalAudits}
  </strong>

 </div>



 <div className="kpi-card">

  <CheckCircle />

  <span>
   Completed
  </span>

  <strong>
   {data.completedAudits}
  </strong>

 </div>



 <div className="kpi-card">

  <TrendingUp />

  <span>
   Average Score
  </span>

  <strong>
   {data.averageScore?.toFixed?.(1) || 0}
  </strong>

 </div>



 <div className="kpi-card">

  <AlertTriangle />

  <span>
   Risks
  </span>

  <strong>
   {
    data.riskStats?.reduce(
     (a:any,b:any)=>a+b.count,
     0
    )
   }
  </strong>

 </div>


 </div>




 <div className="charts-grid">


 <div className="chart-card">

 <h3>
 Audit Types
 </h3>


 <ResponsiveContainer
  width="100%"
  height={260}
 >

 <BarChart
 data={data.typeStats}
 >

 <XAxis dataKey="_id"/>

 <YAxis/>

 <Tooltip/>

 <Bar
 dataKey="count"
 fill="#6366f1"
 />

 </BarChart>

 </ResponsiveContainer>


 </div>





 <div className="chart-card">

 <h3>
 Risk Distribution
 </h3>


 <ResponsiveContainer
 width="100%"
 height={260}
 >

 <PieChart>

 <Pie
 data={data.riskStats}
 dataKey="count"
 nameKey="_id"
 >

 {
 data.riskStats?.map(
 (_:any,index:number)=>(
  <Cell key={index}/>
 )
 )
 }


 </Pie>


 <Tooltip/>

 </PieChart>


 </ResponsiveContainer>


 </div>


 </div>





 <div className="chart-card">


 <h3>
 Audit Trend
 </h3>


 <ResponsiveContainer
 width="100%"
 height={280}
 >


 <LineChart
 data={data.trend}
 >


 <CartesianGrid
 strokeDasharray="3 3"
 />


 <XAxis
 dataKey="_id"
 />


 <YAxis/>


 <Tooltip/>


 <Line
 type="monotone"
 dataKey="count"
 strokeWidth={3}
 />



 </LineChart>


 </ResponsiveContainer>


 </div>



 </div>

 );


}
