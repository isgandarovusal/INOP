import "../auditModern.css";
import "../auditAnalytics.css";
import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

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
} from "recharts";

import {
 BarChart3,
 TrendingUp,
} from "lucide-react";

import PageHeader from "../../../Components/PageHeader";

import {
 getAuditSummary,
 getAuditTypeAnalytics,
 getAuditTrend,
} from "../../../Services/auditAnalyticsService";


const AuditAnalytics:React.FC = ()=>{
  const { t } = useTranslation();


 const [statusData,setStatusData] = useState<any[]>([]);
 const [typeData,setTypeData] = useState<any[]>([]);
 const [trendData,setTrendData] = useState<any[]>([]);

 const [loading,setLoading]=useState(true);



 useEffect(()=>{

  Promise.all([
   getAuditSummary(),
   getAuditTypeAnalytics(),
   getAuditTrend()
  ])
  .then(([summary,type,trend])=>{


   setStatusData(
    summary?.data?.statusSummary || []
   );


   setTypeData(
    type?.data?.typeSummary || []
   );


   setTrendData(
    trend?.data?.trend || []
   );


  })
  .finally(()=>setLoading(false));


 },[]);



 const total =
  statusData.reduce(
   (sum,item)=>sum + item.value,
   0
  );


 return (

 <div>


 <PageHeader
  title={t("audit.analytics.title")}
  subtitle={t("audit.analytics.subtitle")}
 />


 {
 loading ?

 <div className="empty-state">
  Loading analytics...
 </div>


 :

 <>


 <div className="kpi-grid">

  <div className="kpi-card">

   <BarChart3 size={22}/>

   <p>{t("audit.analytics.totalAudits")}</p>

   <h2>
    {total}
   </h2>

  </div>


  <div className="kpi-card">

   <TrendingUp size={22}/>

   <p>{t("audit.analytics.statusGroups")}</p>

   <h2>
    {statusData.length}
   </h2>

  </div>


 </div>




 <div className="charts-grid">


 <div className="chart-card">

 <h3>
 Audit Status
 </h3>


 <ResponsiveContainer
  width="100%"
  height={280}
 >

 <BarChart data={statusData}>


 <XAxis
  dataKey="name"
 />

 <YAxis/>

 <Tooltip/>


 <Bar
  dataKey="value"
 />


 </BarChart>


 </ResponsiveContainer>


 </div>





 <div className="chart-card">


 <h3>
 Audit Types
 </h3>


 <ResponsiveContainer
 width="100%"
 height={280}
 >

 <BarChart data={typeData}>


 <XAxis
 dataKey="name"
/>


 <YAxis/>


 <Tooltip/>


 <Bar
 dataKey="value"
/>


 </BarChart>


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


 <LineChart data={trendData}>


 <CartesianGrid
 strokeDasharray="3 3"
/>


 <XAxis
 dataKey="label"
/>


 <YAxis/>


 <Tooltip/>


 <Line
 type="monotone"
 dataKey="value"
/>


 </LineChart>


 </ResponsiveContainer>


 </div>



 </>


 }


 </div>

 );


};


export default AuditAnalytics;
