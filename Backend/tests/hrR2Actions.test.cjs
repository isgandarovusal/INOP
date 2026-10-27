const test=require('node:test'),assert=require('node:assert/strict');
const {Readable}=require('node:stream');
const {createActionsRunner}=require('../scripts/verifyR2Actions.cjs');
const {APPROVAL}=require('../scripts/verifyR2Synthetic.cjs');
const storage=require('../services/hrPrivateObjectStorage.service');
const SHA='a'.repeat(40);
const environment=()=>({GITHUB_ACTIONS:'true',GITHUB_EVENT_NAME:'workflow_dispatch',GITHUB_REPOSITORY:'isgandarovusal/INOP',GITHUB_REF:'refs/heads/inop-main',GITHUB_RUN_ATTEMPT:'1',GITHUB_RUN_ID:'123456',GITHUB_ACTOR:'isgandarovusal',GITHUB_TRIGGERING_ACTOR:'isgandarovusal',GITHUB_WORKFLOW_REF:'isgandarovusal/INOP/.github/workflows/r2-synthetic-verification.yml@refs/heads/inop-main',GITHUB_SHA:SHA,R2_APPROVED_SHA:SHA,R2_APPROVAL_PHRASE:APPROVAL,R2_RETENTION_APPROVED:'true',R2_SYNTHETIC_ACTIONS_ENABLED:'true',GH_TOKEN:'synthetic-github-token'});
const protection=()=>({name:'r2-synthetic-verification',can_admins_bypass:false,protection_rules:[{type:'required_reviewers',reviewers:[{type:'User',reviewer:{login:'isgandarovusal'}}]}],deployment_branch_policy:{custom_branch_policies:true,protected_branches:false}});
const policy=()=>({total_count:1,branch_policies:[{name:'inop-main',type:'branch'}]});
const response=(data,status=200)=>({status,body:Readable.from([JSON.stringify(data)])});
function harness({change={},metadata=protection(),branches=policy(),fetcher,verifier}={}) {
 const codes=[],requests=[];let confirms=0,calls=0;
 const runner=createActionsRunner({env:{...environment(),...change},emit:c=>codes.push(c),fetcher:async(url,options)=>{requests.push(url);assert.equal(options.method,'GET');assert.equal(options.redirect,'error');assert.equal(options.headers.Authorization,'Bearer synthetic-github-token');return fetcher?fetcher(url,options):response(url.includes('deployment-branch-policies')?branches:metadata);},verifier:verifier||(({confirm})=>({run:async options=>{calls++;assert.equal(options.execute,true);assert.equal(await confirm(),true);confirms++;return true;}}))});
 return{runner,codes,requests,calls:()=>calls,confirms:()=>confirms};
}
test('Actions is manual-owner-default-branch-first-attempt-only and rejects before metadata/secrets use',async()=>{
 for(const change of [{GITHUB_ACTIONS:undefined},...['push','pull_request','schedule','deployment','workflow_run'].map(v=>({GITHUB_EVENT_NAME:v})),{GITHUB_REF:'refs/heads/other'},{GITHUB_REPOSITORY:'fork/INOP'},{GITHUB_RUN_ATTEMPT:'2'},{GITHUB_RUN_ID:'invalid'},{GITHUB_ACTOR:'other'},{GITHUB_TRIGGERING_ACTOR:'other'},{GITHUB_WORKFLOW_REF:'isgandarovusal/INOP/.github/workflows/untrusted.yml@refs/heads/inop-main'}]){
  const h=harness({change});assert.equal(await h.runner.run('--execute'),false);assert.deepEqual(h.codes,['ACTIONS_CONTEXT_REJECTED']);assert.equal(h.requests.length,0);assert.equal(h.calls(),0);
 }
});
test('Explicit opt-in, exact reviewed SHA, typed retention phrase and checkbox all required',async()=>{
 for(const change of [{R2_SYNTHETIC_ACTIONS_ENABLED:undefined},{R2_SYNTHETIC_ACTIONS_ENABLED:'false'},{R2_APPROVED_SHA:'b'.repeat(40)},{R2_APPROVED_SHA:'invalid'},{R2_APPROVAL_PHRASE:'yes'},{R2_RETENTION_APPROVED:'false'}]){
  const h=harness({change});assert.equal(await h.runner.run('--execute'),false);assert.deepEqual(h.codes,['ACTIONS_APPROVAL_REQUIRED']);assert.equal(h.requests.length,0);assert.equal(h.calls(),0);
 }
 const h=harness();assert.equal(await h.runner.run(''),false);assert.deepEqual(h.codes,['VERIFICATION_DISABLED']);
});
test('Missing required reviewer, admin bypass and broad branch policies fail closed',async()=>{
 for(const metadata of [{...protection(),name:'Production'},{...protection(),can_admins_bypass:true},{...protection(),protection_rules:[]},{...protection(),protection_rules:[{type:'required_reviewers',reviewers:[]}]},{...protection(),deployment_branch_policy:null}]){
  const h=harness({metadata});assert.equal(await h.runner.run('--execute'),false);assert.deepEqual(h.codes,['ACTIONS_ENVIRONMENT_UNPROTECTED']);assert.equal(h.calls(),0);
 }
 for(const branches of [{total_count:0,branch_policies:[]},{total_count:2,branch_policies:[{name:'inop-main',type:'branch'},{name:'other',type:'branch'}]},{total_count:1,branch_policies:[{name:'inop-main',type:'tag'}]}]){
  const h=harness({branches});assert.equal(await h.runner.run('--execute'),false);assert.deepEqual(h.codes,['ACTIONS_ENVIRONMENT_UNPROTECTED']);assert.equal(h.calls(),0);
 }
});
test('Preflight is read-only and cannot call storage even with all approvals',async()=>{
 const h=harness();assert.equal(await h.runner.run('--preflight'),true);assert.deepEqual(h.codes,['ACTIONS_PREFLIGHT_OK']);assert.equal(h.calls(),0);assert.equal(h.requests.length,2);assert.ok(h.requests.every(u=>u.startsWith('https://api.github.com/repos/isgandarovusal/INOP/environments/r2-synthetic-verification')));
});
test('Metadata denied/unavailable/redirect/oversized errors cannot release approval or leak raw errors',async()=>{
 for(const fetcher of [async()=>response({secret:'PRIVATE'},403),async()=>response({},404),async()=>response({},302),async()=>{throw Error('PRIVATE API ERROR');},async()=>({status:200,body:Readable.from(['x'.repeat(65537)])})]){
  const h=harness({fetcher});assert.equal(await h.runner.run('--execute'),false);assert.deepEqual(h.codes,['ACTIONS_PREFLIGHT_FAILED']);assert.equal(h.calls(),0);
 }
 const h=harness({change:{GH_TOKEN:''}});assert.equal(await h.runner.run('--execute'),false);assert.deepEqual(h.codes,['ACTIONS_PREFLIGHT_FAILED']);assert.equal(h.requests.length,0);
});
test('Execute requires successful protected preflight, reuses harness and cannot execute twice',async()=>{
 const h=harness();assert.equal(await h.runner.run('--execute'),true);assert.equal(h.calls(),1);assert.equal(h.confirms(),1);assert.equal(await h.runner.run('--execute'),false);assert.equal(h.calls(),1);assert.deepEqual(h.codes,['VERIFICATION_ALREADY_ATTEMPTED']);
 const bad=harness({verifier:()=>{throw Error('SECRET');}});assert.equal(await bad.runner.run('--execute'),false);assert.deepEqual(bad.codes,['VERIFICATION_FAILED']);
});
test('Actions adapter retains one 64-byte object and all existing synthetic protections',async()=>{
 const config={provider:'s3',endpoint:'https://'+'a'.repeat(32)+'.r2.cloudflarestorage.com',bucket:'inop-private-cv',region:'auto',accessKeyId:'synthetic-key',secretAccessKey:'synthetic-secret'};
 const env={...environment(),HR_CV_STORAGE_PROVIDER:'s3',HR_CV_STORAGE_ENDPOINT:config.endpoint,HR_CV_STORAGE_BUCKET:config.bucket,HR_CV_STORAGE_REGION:'auto',HR_CV_STORAGE_ACCESS_KEY_ID:config.accessKeyId,HR_CV_STORAGE_SECRET_ACCESS_KEY:config.secretAccessKey,HR_CV_DURABLE_INTAKE_ENABLED:'false',HR_CV_SCAN_ENABLED:'false',HR_CV_INTAKE_WORKER_ENABLED:'false'};
 const objects=new Map(),methods=[],codes=[];
 const adapter={prepare:storage.prepare,fromEnvironment:e=>{storage.fromEnvironment(e);return storage.createStore(config,{transport:async r=>{
  methods.push(r.method);assert.equal(r.headers['if-none-match'],r.method==='PUT'?'*':undefined);
  if(r.method==='PUT'){if(objects.has(r.url))return{status:412};objects.set(r.url,Buffer.from(r.body));return{status:200};}
  assert.equal(r.method,'GET');return{status:200,body:[objects.get(r.url)]};
 }});}};
 const {createVerifier}=require('../scripts/verifyR2Synthetic.cjs');
 const runner=createActionsRunner({env,emit:c=>codes.push(c),fetcher:async u=>response(u.includes('deployment-branch-policies')?policy():protection()),verifier:options=>createVerifier({...options,adapter})});
 assert.equal(await runner.run('--execute'),true);assert.deepEqual(methods,['PUT','GET','PUT']);assert.equal(objects.size,1);assert.equal([...objects.values()][0].length,64);assert.deepEqual(codes,['CONFIG_OK','WRITE_OK','READBACK_OK','SHA256_MATCH','WRITE_CONFLICT_CONFIRMED']);assert.ok(!JSON.stringify(codes).includes('synthetic-secret'));
});
test('Workflow YAML has manual-only trigger, serialized concurrency, scoped secret step and no install/artifacts',()=>{
 const fs=require('node:fs'),path=require('node:path'),yaml=require('js-yaml');
 const text=fs.readFileSync(path.join(__dirname,'../../.github/workflows/r2-synthetic-verification.yml'),'utf8'),w=yaml.load(text);
 assert.deepEqual(Object.keys(w.on),['workflow_dispatch']);assert.equal(w.permissions.contents,'read');assert.equal(w.concurrency.group,'r2-synthetic-verification-single');assert.equal(w.concurrency['cancel-in-progress'],false);assert.equal(w.on.workflow_dispatch.inputs.retain_object.default,false);
 for(const job of Object.values(w.jobs)){
  assert.equal(job['runs-on'],'ubuntu-24.04');assert.equal(job['timeout-minutes'],3);assert.deepEqual(job.permissions,{contents:'read',actions:'read'});assert.ok(job.if.includes("github.run_attempt == 1"));assert.ok(!job.env||!JSON.stringify(job.env).includes('secrets.'));
  for(const step of job.steps){if(step.uses)assert.match(step.uses,/@[a-f0-9]{40}$/);if(step.with?.ref)assert.equal(step.with.ref,'${{ github.sha }}');if(step.uses?.startsWith('actions/checkout'))assert.equal(step.with['persist-credentials'],false);if(step.uses?.startsWith('actions/setup-node'))assert.equal(step.with['package-manager-cache'],false);if(step.run)assert.ok(!step.run.includes('${{'));}
 }
 assert.equal(w.jobs.verify.needs,'preflight');assert.ok(w.jobs.verify.if.includes("needs.preflight.result == 'success'"));assert.equal(w.jobs.verify.environment,'r2-synthetic-verification');assert.ok(!JSON.stringify(w.jobs.preflight).includes('secrets.'));
 const live=w.jobs.verify.steps.at(-1);assert.equal(live.run,'node Backend/scripts/verifyR2Actions.cjs --execute');assert.equal(live.env.HR_CV_STORAGE_BUCKET,'inop-private-cv');
 for(const key of ['HR_CV_DURABLE_INTAKE_ENABLED','HR_CV_SCAN_ENABLED','HR_CV_INTAKE_WORKER_ENABLED','HR_CV_OCR_ENABLED','HR_CV_PROCESSING_ENABLED','HR_CV_AI_PROCESSING_ENABLED'])assert.equal(live.env[key],'false');
 assert.ok(!/npm ci|upload-artifact|cache: npm|id-token:|contents: write|deployments: write|workflow_call|workflow_run/.test(text));
});
