const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const filename=path.resolve(__dirname,'../../Frontend/tests/runAuditBrowserSuite.cjs'),source=fs.readFileSync(filename,'utf8');
function run(results={},port='27018'){
 const calls=[],logs=[],process={env:{INOP_AUDIT_TEST_PORT:port},execPath:'/synthetic/node'};let tick=0;
 vm.runInNewContext(source,{__dirname:path.dirname(filename),process,performance:{now:()=>tick++},console:{log:s=>logs.push(JSON.parse(s))},require:id=>id==='node:child_process'?{spawnSync:(...args)=>{calls.push(args);return results[calls.length]??{status:0};}}:require(id)});
 return{calls,logs,process};
}
test('Browser runner keeps all serial groups, flags and guarded environment; success is explicit',()=>{
 const {calls,logs,process}=run();assert.equal(calls.length,15);assert.equal(process.exitCode,0);
 const files=calls.flatMap(([,args])=>Array.from(args.slice(2)));assert.equal(files.length,32);assert.equal(new Set(files).size,32);
 for(const [binary,args,options]of calls){assert.equal(binary,process.execPath);assert.deepEqual(Array.from(args.slice(0,2)),['--test','--test-isolation=none']);assert.equal(options.env,process.env);assert.equal(options.stdio,'inherit');for(const file of args.slice(2))assert.ok(fs.existsSync(file));}
 assert.equal(logs.filter(x=>x.code==='BROWSER_QA_GROUP_START').length,15);assert.equal(logs.filter(x=>x.code==='BROWSER_QA_GROUP_RESULT').length,15);assert.equal(logs.at(-1).failedGroups.length,0);
});
test('Early child failure survives later passing groups and identifies the exact group',()=>{
 const {calls,logs,process}=run({2:{status:1}});assert.equal(calls.length,15);assert.equal(process.exitCode,1);
 const failed=logs.at(-1).failedGroups;assert.equal(failed.length,1);assert.equal(failed[0].group,2);assert.equal(failed[0].status,1);assert.ok(failed[0].files.includes('cvIntakeSourceReviewUI.test.cjs'));assert.equal(logs.at(-2).status,0);
});
test('Signal termination and spawn errors fail closed without logging raw diagnostics',()=>{
 for(const result of [{status:null,signal:'SIGKILL'},{status:null,error:{code:'ENOENT',message:'DO_NOT_LOG_RAW_DIAGNOSTICS'}}]){const {calls,logs,process}=run({1:result});assert.equal(calls.length,15);assert.equal(process.exitCode,1);assert.equal(logs.at(-1).failedGroups.length,1);assert.ok(!JSON.stringify(logs).includes('DO_NOT_LOG_RAW_DIAGNOSTICS'));}
});
test('Browser runner still refuses a missing owned QA port before spawning tests',()=>{
 assert.throws(()=>run({},''),/loopback QA port/);
});
