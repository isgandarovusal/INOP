const{spawnSync}=require('node:child_process'),path=require('node:path');
if(process.env.INOP_AUDIT_TEST_PORT!=='27018')throw Error('Browser integration requires owned loopback QA port 27018.');
const root=path.resolve(__dirname,'../..');
const groups=[['loginIntakeReadiness.test.cjs','recruitmentWorkspaceUI.test.cjs','cvUniversalImportUI.test.cjs','recruitmentRoutesRealAuth.test.cjs'],['cvIntakeUI.test.cjs','cvIntakeQueueUI.test.cjs','cvIntakeSourceReviewUI.test.cjs','cvIntakeRepairUI.test.cjs','cvIntakeOcrUI.test.cjs'],['auditCriticalRemediation.test.cjs'],['sourceDocuments.test.cjs','sourceDownloadRace.test.cjs'],['auditCenterIntegration.spec.cjs'],['hseAuditWorkflow.spec.cjs'],['standardAuditWorkflow.spec.cjs','serviceAuditWorkflow.spec.cjs'],['hrAuditWorkflow.spec.cjs'],['auditFinalReport.spec.cjs'],['hrAuditPhotos.spec.cjs','auditExportPanel.spec.cjs'],['auditVisualUnification.test.cjs'],['applicationWorkflowKey.test.cjs','applicationLifecycleUI.test.cjs'],['administrationUI.test.cjs','auditDraftFlow.spec.cjs','dashboardPerformance.test.cjs','hrNavigationPerformance.test.cjs'],['designRemediation.test.cjs','enterpriseReadiness.test.cjs'],['uiConsistency.test.cjs','enterpriseControlsUI.test.cjs','hrWorkspaceUI.test.cjs']];const failures=[];
for(const [index,group] of groups.entries()){
 const started=performance.now();
 console.log(JSON.stringify({code:'BROWSER_QA_GROUP_START',group:index+1,files:group}));
 const result=spawnSync(process.execPath,['--test','--test-isolation=none',...group.map(p=>path.join(__dirname,p))],{cwd:root,env:process.env,stdio:'inherit'});
 const record={group:index+1,files:group,status:result.status,signal:result.signal??null,errorCode:result.error?.code??null,elapsedMs:Math.round(performance.now()-started)};
 if(result.status!==0)failures.push(record);
 console.log(JSON.stringify({code:'BROWSER_QA_GROUP_RESULT',...record}));
}
console.log(JSON.stringify({code:'BROWSER_QA_SUMMARY',groups:groups.length,failedGroups:failures}));
process.exitCode=failures.length?1:0;
