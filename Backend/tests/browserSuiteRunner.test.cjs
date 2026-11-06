const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const filename=path.resolve(__dirname,'../../Frontend/tests/runAuditBrowserSuite.cjs'),source=fs.readFileSync(filename,'utf8');
async function run(results={},port='27018'){
 const calls=[],logs=[],process={env:{INOP_AUDIT_TEST_PORT:port},execPath:'/synthetic/node'};let tick=0;
 const module={exports:{}};vm.runInNewContext(source,{module,exports:module.exports,__dirname:path.dirname(filename),process,performance:{now:()=>tick++},console:{log:s=>logs.push(JSON.parse(s))},require:id=>id==='../../scripts/runQaProcess.cjs'?{runQaProcess:async(...args)=>{calls.push(args);return results[calls.length]??{status:0};}}:require(id)});
 await module.exports.main();return{calls,logs,process};
}
test('Browser runner keeps all serial groups, flags and guarded environment; success is explicit',async()=>{
 const {calls,logs,process}=await run();assert.equal(calls.length,16);assert.equal(process.exitCode,0);
 const files=calls.flatMap(([,args])=>Array.from(args.slice(3)));assert.equal(files.length,43);assert.equal(new Set(files).size,43);assert.ok(files.some(f=>f.endsWith('applicationHandoffContextUI.test.cjs')));
 for(const [binary,args,options]of calls){assert.equal(binary,process.execPath);assert.deepEqual(Array.from(args.slice(0,3)),['--test','--test-timeout=300000','--test-isolation=none']);assert.equal(options.env,process.env);assert.equal(options.stdio,'inherit');for(const file of args.slice(3))assert.ok(fs.existsSync(file));}
 assert.equal(logs.filter(x=>x.code==='BROWSER_QA_GROUP_START').length,16);assert.equal(logs.filter(x=>x.code==='BROWSER_QA_GROUP_RESULT').length,16);assert.equal(logs.at(-1).failedGroups.length,0);
});
test('Early child failure survives later passing groups and identifies the exact group',async()=>{
 const {calls,logs,process}=await run({2:{status:1}});assert.equal(calls.length,16);assert.equal(process.exitCode,1);
 const failed=logs.at(-1).failedGroups;assert.equal(failed.length,1);assert.equal(failed[0].group,2);assert.equal(failed[0].status,1);assert.ok(failed[0].files.includes('cvIntakeSourceReviewUI.test.cjs'));assert.equal(logs.at(-2).status,0);
});
test('Signal termination and spawn errors fail closed without logging raw diagnostics',async()=>{
 for(const result of [{status:null,signal:'SIGKILL'},{status:null,error:{code:'ENOENT',message:'DO_NOT_LOG_RAW_DIAGNOSTICS'}}]){const {calls,logs,process}=await run({1:result});assert.equal(calls.length,16);assert.equal(process.exitCode,1);assert.equal(logs.at(-1).failedGroups.length,1);assert.ok(!JSON.stringify(logs).includes('DO_NOT_LOG_RAW_DIAGNOSTICS'));}
});
test('Browser runner still refuses a missing owned QA port before spawning tests',async()=>{
 await assert.rejects(run({},''),/loopback QA port/);
});

test('Matching authorization and navigation regressions run exactly once in FULL and Recruitment coverage',async()=>{
 const matching='applicationMatchingUI.test.cjs';
 const full=await run(),fullFiles=full.calls.flatMap(([,args])=>Array.from(args.slice(3)));
 assert.equal(fullFiles.filter(f=>path.basename(f)===matching).length,1,'FULL must execute matching UI regression');
 const {groups,runBrowser}=require('../../scripts/qaScope.cjs');
 const selectedFiles=groups.flatMap(g=>g.files);
 assert.equal(selectedFiles.length,34);assert.equal(new Set(selectedFiles).size,34);
 assert.equal(selectedFiles.filter(f=>f===matching).length,1);
 const previous=process.env.INOP_AUDIT_TEST_PORT;process.env.INOP_AUDIT_TEST_PORT='27018';
 try{const calls=[];assert.equal(await runBrowser({scope:'recruitment-frontend'},{spawn:(_exe,args)=>{calls.push(args);return{status:0};}}),0);
 assert.equal(calls.flat().filter(f=>f.endsWith('/'+matching)).length,1);
 }finally{if(previous===undefined)delete process.env.INOP_AUDIT_TEST_PORT;else process.env.INOP_AUDIT_TEST_PORT=previous;}
 const failed=await run({12:{status:1}});assert.equal(failed.process.exitCode,1);
 assert.ok(failed.logs.at(-1).failedGroups[0].files.includes(matching));
});

test('Product comparison/work-queue acceptance runs exactly once in each selection',async()=>{const full=await run();const files=full.calls.flatMap(([,args])=>Array.from(args.slice(3)).map(p=>path.basename(p)));assert.equal(files.filter(f=>f==='recruitmentProductUI.test.cjs').length,1);assert.equal(require('../../scripts/qaScope.cjs').groups.flatMap(g=>g.files).filter(f=>f==='recruitmentProductUI.test.cjs').length,1);});

test('Feedback/CAPA/axe acceptance runs once in each browser selection',async()=>{const full=await run();assert.equal(full.calls.flatMap(([,args])=>Array.from(args.slice(3))).filter(f=>f.endsWith('/opensourceCapabilityUI.test.cjs')).length,1);assert.equal(require('../../scripts/qaScope.cjs').groups.flatMap(g=>g.files).filter(f=>f==='opensourceCapabilityUI.test.cjs').length,1);});
