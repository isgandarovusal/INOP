const test=require('node:test'),assert=require('node:assert/strict');
const {withAuditFixture}=require('./helpers/auditFixture.cjs');
const names=['HR_AI_PROVIDER','HR_AI_MODEL','OPENAI_API_KEY','HR_AI_DAILY_BUDGET_USD','HR_AI_INPUT_USD_PER_MILLION','HR_AI_OUTPUT_USD_PER_MILLION'];
test('Analytics reports safe configured AI metadata without provider calls or fabricated live health',async t=>withAuditFixture(async h=>{
 const before=new Map(names.map(n=>[n,process.env[n]]));let calls=0;const fetch=global.fetch;global.fetch=(...args)=>{if(String(args[0]).startsWith('https://api.openai.com')){calls++;throw Error('External provider must not be called');}return fetch(...args);};
 try{
  for(const [state,settings]of [['not_configured',{}],['configuration_required',{HR_AI_PROVIDER:'unsupported'}],['configuration_required',{HR_AI_PROVIDER:'openai',HR_AI_MODEL:'synthetic-model'}],['configured_not_verified',{HR_AI_PROVIDER:'openai',HR_AI_MODEL:'synthetic-model',OPENAI_API_KEY:'SYNTHETIC_NOT_A_CREDENTIAL',HR_AI_DAILY_BUDGET_USD:'1',HR_AI_INPUT_USD_PER_MILLION:'1',HR_AI_OUTPUT_USD_PER_MILLION:'1'}]])await t.test(state+' from bounded local configuration only',async()=>{
   for(const n of names)delete process.env[n];Object.assign(process.env,settings);const r=await h.request('admin','GET','/hr/analytics');assert.equal(r.status,200);assert.equal(r.data.integrations.ai,state);const json=JSON.stringify(r.data);assert.ok(!json.includes('SYNTHETIC_NOT_A_CREDENTIAL'));assert.ok(!json.includes('synthetic-model'));assert.equal(calls,0);assert.equal(r.data.totals.applications,0);
  });
 }finally{global.fetch=fetch;for(const[n,v]of before)v===undefined?delete process.env[n]:process.env[n]=v;}
}));
