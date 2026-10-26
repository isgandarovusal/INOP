const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),ts=require('typescript');
const moduleSource=ts.transpileModule(fs.readFileSync(path.join(__dirname,'../src/Utils/applicationWorkflowKey.ts'),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText;
const exportsObject={};vm.runInNewContext(moduleSource,{exports:exportsObject});
const key=exportsObject.applicationWorkflowKey;
test('Score revision preserves hiring draft identity; persisted workflow or parent changes invalidate it',()=>{
 const app={id:'synthetic',revision:0,status:'applied',notes:'',assignedTo:'actor',nextAction:{kind:'none'}};
 assert.equal(key(app),key({...app,revision:1,score:75,matching:{version:'ats-v2',calculatedAt:'later'}}));
 for(const change of [{id:'other'},{status:'shortlisted'},{notes:'saved note'},{assignedTo:'other'},{substatus:'selected'},{stageEnteredAt:'later'},{interview:{timezone:'Asia/Baku'}},{nextAction:{kind:'call'}}])assert.notEqual(key(app),key({...app,...change}));
});
