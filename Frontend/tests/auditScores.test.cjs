const test=require('node:test');const assert=require('node:assert/strict');const {withBrowserFixture}=require('./helpers/browser.cjs');
const harness=`import React from 'react';import{createRoot}from'react-dom/client';import{BrowserRouter,useNavigate}from'react-router-dom';import{AuthContext}from'/src/Context/AuthContext.ts';import Dashboard from'/src/Pages/Audit/AuditDashboard/AuditDashboard.tsx';import api from'/src/api/axios.ts';api.defaults.baseURL='/api';function App(){window.navigateTest=useNavigate();return React.createElement(AuthContext.Provider,{value:{user:window.testUser,isLoading:false}},React.createElement(Dashboard));}createRoot(document.getElementById('root')).render(React.createElement(React.StrictMode,null,React.createElement(BrowserRouter,null,React.createElement(App))));`;
test('Audit dashboard envelope and heterogeneous score contracts',async t=>withBrowserFixture(harness,async h=>{
 const audit=await h.audit('own','standard',{compliancePercentage:50,scores:null});
 await h.audit('own','service',{overallPercentage:0,scores:null});await h.audit('own','occupational-safety',{scorePercentage:100,scores:null});
 await h.audit('own','legacy');await h.audit('own','service',{overallPercentage:null,scores:null});
 await h.audit('foreign','standard',{compliancePercentage:100});
 await h.models.Execution.create({auditId:audit._id,totalScore:0,status:'completed'});
 await h.models.Execution.create({auditId:audit._id,totalScore:20,status:'completed'});
 await h.open('own','/dashboard');await h.page.waitForLoadState('networkidle');
 await t.test('Dashboard unwraps data and formats the Mongo month/year trend',async()=>{
  const data=await h.page.evaluate(async()=> (await import('/src/Services/auditDashboardService.ts')).getAuditDashboard());
  assert.equal(data.totalAudits,5);assert.equal(data.completedAudits,2);assert.equal(data.averageScore,10);assert.equal(data.scoredExecutions,2);
  assert.match(data.trend[0].label,/^2026-\d\d$/);assert.equal(data.trend[0].count,2);assert.deepEqual(h.pageErrors,[]);
 });
 await t.test('Canonical zero, missing scores, safety ratio and legacy scores are distinct',async()=>{
  const cases=[
   [{auditType:'service',overallPercentage:0},0],[{auditType:'standard',compliancePercentage:0},0],
   [{auditType:'occupational-safety',scorePercentage:0},0],[{auditType:'safety',totalScore:0,maxScore:5},0],
   [{auditType:'safety',totalScore:5,maxScore:10},5],[{auditType:'standard',compliancePercentage:50},5],
   [{auditType:'service',overallPercentage:'80'},8],[{auditType:'service',overallPercentage:null},null],
   [{auditType:'safety',totalScore:2,maxScore:0},null],[{},null],
   [{scores:{food:8,service:6,cleanliness:4,staff:2}},5],
  ];
  const values=await h.page.evaluate(async cases=>{const{overallScore}=await import('/src/Services/auditsService.ts');return cases.map(([audit])=>overallScore(audit));},cases);
  assert.deepEqual(values,cases.map(([,score])=>score));
 });
 await t.test('Mixed analytics includes unscored audits in counts, excludes missing values from averages and critical counts',async()=>{
  const data=await h.page.evaluate(async()=> (await import('/src/Services/analyticsService.ts')).getAuditAnalytics());
  assert.equal(data.totalAudits,5);assert.equal(data.overallScore,5.8);assert.equal(data.criticalCount,2);
  assert.equal(data.restaurantComparison[0].score,5.8);assert.equal(data.historicalTrend[0].score,5.8);
 });
}));
