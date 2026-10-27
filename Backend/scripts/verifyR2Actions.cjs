// Approval adapter for workflow_dispatch only. Interactive CLI remains unchanged.
const {createVerifier,APPROVAL}=require('./verifyR2Synthetic.cjs');
const REPO='isgandarovusal/INOP',OWNER='isgandarovusal',BRANCH='refs/heads/inop-main',ENVIRONMENT='r2-synthetic-verification';
const denied=code=>Object.assign(Error('Verification approval unavailable.'),{code});
function validateContext(env) {
  if(env.GITHUB_ACTIONS!=='true'||env.GITHUB_EVENT_NAME!=='workflow_dispatch'||env.GITHUB_REPOSITORY!==REPO||env.GITHUB_REF!==BRANCH||env.GITHUB_RUN_ATTEMPT!=='1'||!/^\d+$/.test(env.GITHUB_RUN_ID||'')||env.GITHUB_ACTOR!==OWNER||env.GITHUB_TRIGGERING_ACTOR!==OWNER||env.GITHUB_WORKFLOW_REF!==REPO+'/.github/workflows/r2-synthetic-verification.yml@'+BRANCH)throw denied('ACTIONS_CONTEXT_REJECTED');
  if(env.R2_SYNTHETIC_ACTIONS_ENABLED!=='true'||env.R2_APPROVAL_PHRASE!==APPROVAL||env.R2_RETENTION_APPROVED!=='true'||!/^[a-f0-9]{40}$/.test(env.R2_APPROVED_SHA||'')||env.R2_APPROVED_SHA!==env.GITHUB_SHA)throw denied('ACTIONS_APPROVAL_REQUIRED');
}
async function readMetadata(path,env,fetcher) {
  if(!env.GH_TOKEN)throw denied('ACTIONS_PREFLIGHT_FAILED');
  const response=await fetcher('https://api.github.com/repos/'+REPO+path,{method:'GET',headers:{Authorization:'Bearer '+env.GH_TOKEN,Accept:'application/vnd.github+json','X-GitHub-Api-Version':'2022-11-28'},redirect:'error',signal:AbortSignal.timeout(5000)});
  if(response.status!==200)throw denied('ACTIONS_PREFLIGHT_FAILED');
  let text='';
  for await(const chunk of response.body||[]) {text+=Buffer.from(chunk).toString('utf8');if(Buffer.byteLength(text)>65536)throw denied('ACTIONS_PREFLIGHT_FAILED');}
  return JSON.parse(text);
}
async function preflight(env,fetcher=fetch) {
  validateContext(env);
  const metadata=await readMetadata('/environments/'+ENVIRONMENT,env,fetcher);
  if(metadata.name!==ENVIRONMENT||metadata.can_admins_bypass!==false||!metadata.protection_rules?.some(rule=>rule.type==='required_reviewers'&&Array.isArray(rule.reviewers)&&rule.reviewers.some(item=>item.type==='User'&&item.reviewer?.login===OWNER))||metadata.deployment_branch_policy?.custom_branch_policies!==true||metadata.deployment_branch_policy?.protected_branches!==false)throw denied('ACTIONS_ENVIRONMENT_UNPROTECTED');
  const branches=await readMetadata('/environments/'+ENVIRONMENT+'/deployment-branch-policies?per_page=100',env,fetcher);
  if(branches.total_count!==1||branches.branch_policies?.length!==1||branches.branch_policies[0].name!=='inop-main'||branches.branch_policies[0].type!=='branch')throw denied('ACTIONS_ENVIRONMENT_UNPROTECTED');
}
function createActionsRunner({env=process.env,fetcher=fetch,verifier=createVerifier,emit=code=>console.log(code)}={}) {
  let attempted=false;
  return {async run(mode) {
    if(attempted){emit('VERIFICATION_ALREADY_ATTEMPTED');return false;}attempted=true;
    if(!['--preflight','--execute'].includes(mode)){emit('VERIFICATION_DISABLED');return false;}
    try {await preflight(env,fetcher);}catch(error){emit(['ACTIONS_CONTEXT_REJECTED','ACTIONS_APPROVAL_REQUIRED','ACTIONS_ENVIRONMENT_UNPROTECTED'].includes(error?.code)?error.code:'ACTIONS_PREFLIGHT_FAILED');return false;}
    if(mode==='--preflight'){emit('ACTIONS_PREFLIGHT_OK');return true;}
    // GitHub has released environment secrets only after platform approval;
    // context, exact commit and current protection policy are checked again here.
    try {return await verifier({env,emit,confirm:async()=>true}).run({execute:true});}
    catch {emit('VERIFICATION_FAILED');return false;}
  }};
}
if(require.main===module) {
 const args=process.argv.slice(2);
 createActionsRunner().run(args.length===1?args[0]:'').then(ok=>{process.exitCode=ok?0:1;}).catch(()=>{console.log('VERIFICATION_FAILED');process.exitCode=1;});
}
module.exports={validateContext,preflight,createActionsRunner};
