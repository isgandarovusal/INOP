// Isolated provider acceptance only. Never accepts an external target binding.
const owned=require('./staging/ownedS3.cjs');
async function main(){owned.guard();const mode=process.argv[2];if(process.argv.length!==3||!['--preflight','--storage'].includes(mode))throw Error('INVALID_MODE');const binary=process.env.INOP_QA_S3_BINARY;await owned.validate(binary);
 if(mode==='--preflight'){console.log(JSON.stringify({status:'PASS_CONFIGURATION_ONLY',wouldExecute:false,productionReady:false}));return;}
 const provider=await owned.start(binary);try{
  const result=await require('./staging/storageAcceptance.cjs').run(provider);
  await require('./staging/storageApiAcceptance.cjs').run(provider,result);
  console.log(JSON.stringify({status:'PASS_ISOLATED_STAGING',environment:'ISOLATED_LOOPBACK_REAL_S3',...provider.identity,tests:result.tests,restoredObjects:result.owned.size,originalLinkageUnchanged:true,mongoVersion:result.mongoVersion,networkBoundary:'Owned loopback TLS transport only; production DNS policy unchanged',applicationAuthorization:'REAL_LOOPBACK_HTTP_AND_MONGO',scanner:'NOT_USED_STORAGE_FIXTURES_ONLY',productionReady:false}));
 }finally{await provider.close();}}
main().catch(e=>{console.error(JSON.stringify({status:'FAIL_OR_BLOCKED',code:/^[A-Z_]{3,60}$/.test(e.code||e.message)?e.code||e.message:'STAGING_ACCEPTANCE_FAILED',productionReady:false}));process.exitCode=1;});
