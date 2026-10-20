const{spawnSync}=require('node:child_process'),path=require('node:path');
if(process.env.INOP_AUDIT_TEST_PORT!=='27018')throw Error('Browser integration requires owned loopback QA port 27018.');
const root=path.resolve(__dirname,'../..');
const groups=[['auditCenterIntegration.spec.cjs'],['hseAuditWorkflow.spec.cjs'],['standardAuditWorkflow.spec.cjs','serviceAuditWorkflow.spec.cjs'],['hrAuditWorkflow.spec.cjs'],['auditFinalReport.spec.cjs'],['hrAuditPhotos.spec.cjs','auditExportPanel.spec.cjs'],['auditVisualUnification.test.cjs'],['applicationLifecycleUI.test.cjs'],['administrationUI.test.cjs','auditDraftFlow.spec.cjs','dashboardPerformance.test.cjs','hrNavigationPerformance.test.cjs']];let failed=false;
for(const group of groups){const result=spawnSync(process.execPath,['--test','--test-isolation=none',...group.map(p=>path.join(__dirname,p))],{cwd:root,env:process.env,stdio:'inherit'});if(result.status!==0)failed=true;}
process.exitCode=failed?1:0;
