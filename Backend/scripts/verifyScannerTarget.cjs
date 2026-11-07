// Operator-run, isolated native target only. Never starts/reloads a daemon or updater.
const fs=require('node:fs/promises'),{spawnSync}=require('node:child_process'),crypto=require('node:crypto');
function guard(env=process.env){
 if(env.INOP_SCANNER_TARGET_APPROVED!=='isolated-staging'||env.NODE_ENV==='production'||env.RENDER==='true')throw Error('ISOLATED_SCANNER_APPROVAL_REQUIRED');
 for(const gate of['DURABLE_INTAKE','SCAN','INTAKE_WORKER','OCR','PROCESSING','AI_PROCESSING'])if(env['HR_CV_'+gate+'_ENABLED']&&env['HR_CV_'+gate+'_ENABLED']!=='false')throw Error('PROCESSING_GATES_MUST_BE_DISABLED');
}
async function main(){guard();if(process.argv.length!==3||!['--preflight','--synthetic-only'].includes(process.argv[2]))throw Error('INVALID_MODE');
 for(const file of['/usr/bin/clamscan','/usr/bin/sigtool']){const st=await fs.lstat(file).catch(()=>null);if(!st?.isFile()||st.isSymbolicLink()||(st.mode&0o022))throw Error('SCANNER_RUNTIME_REQUIRED');}
 const version=spawnSync('/usr/bin/clamscan',['--version'],{encoding:'utf8',timeout:5000,maxBuffer:8192,env:{PATH:'/usr/bin:/bin',LANG:'C',TZ:'UTC'}});
 const match=/^ClamAV ([\d.]+)\/(\d+)\/([^\r\n]+)\s*$/.exec(version.stdout||'');if(version.status!==0||!match)throw Error('SCANNER_DEFINITIONS_REQUIRED');const age=Date.now()-Date.parse(match[3]+' UTC');if(!Number.isFinite(age)||age < -300000||age>24*3600000)throw Error('SCANNER_DEFINITIONS_STALE');
 const definitions=[];
 for(const name of['main','daily']){let file;for(const ext of['cvd','cld']){const p='/var/lib/clamav/'+name+'.'+ext;const s=await fs.lstat(p).catch(()=>null);if(s?.isFile()&&!s.isSymbolicLink()&&!(s.mode&0o022)&&s.size<=512*1024*1024){file=p;break;}}
  if(!file)throw Error('OFFICIAL_DEFINITION_ARTIFACT_REQUIRED');
  const info=spawnSync('/usr/bin/sigtool',['--info',file],{encoding:'utf8',timeout:15000,maxBuffer:16384,env:{PATH:'/usr/bin:/bin',LANG:'C',TZ:'UTC'}});if(info.status!==0||!/Verification OK/.test(info.stdout||''))throw Error('DEFINITION_VERIFICATION_FAILED');
  const hash=crypto.createHash('sha256');for await(const b of require('node:fs').createReadStream(file))hash.update(b);definitions.push({name,sha256:hash.digest('hex')});
 }
 const receipt={environment:'OWNER_APPROVED_ISOLATED_NATIVE_TARGET',engine:'clamav',version:match[1],databaseVersion:match[2],definitionDate:new Date(Date.parse(match[3]+' UTC')).toISOString(),definitions,productionReady:false};
 if(process.argv[2]==='--preflight'){console.log(JSON.stringify({status:'PASS_CONFIGURATION_ONLY',...receipt,scansExecuted:false}));return;}
 const rows=[],start=performance.now();const native=await require('./verifyNativeClamav.cjs').createQa({env:{INOP_NATIVE_AV_QA_ENABLED:'true'},emit:r=>rows.push(r)}).run({execute:true});if(!native)throw Error(rows.at(-1)?.code||'NATIVE_ACCEPTANCE_FAILED');
 const {createScanner}=require('../services/hrClamScan.service'),samples=await require('./verifyNativeClamav.cjs').syntheticFixtures(),sample=samples[0],sha256=crypto.createHash('sha256').update(sample.bytes).digest('hex'),context={mimeType:sample.mimeType,sha256};
 const assert=require('node:assert/strict'),scanner=createScanner({enabled:true,binary:'/usr/bin/clamscan'});
 await assert.rejects(scanner.scan(sample.bytes,{...context,sha256:'0'.repeat(64)}),{code:'AV_INPUT'});
 const scans=await Promise.all([scanner.scan(sample.bytes,context),scanner.scan(sample.bytes,context)]);assert.ok(scans.every(r=>r.verdict==='clean'&&r.sha256===sha256));
 await assert.rejects(createScanner({enabled:true,binary:'/inop-no-such-directory/clamscan'}).scan(sample.bytes,context),{code:'AV_UNAVAILABLE'});
 await assert.rejects(createScanner({enabled:true,binary:'/usr/bin/clamscan',now:()=>new Date(Date.now()+72*3600000)}).scan(sample.bytes,context),{code:'AV_DEFINITIONS'});
 console.log(JSON.stringify({status:'PASS_LOCAL_ONLY',...receipt,fixtures:rows,additionalChecks:['hash_mismatch','two_concurrent_scans','unavailable_binary','expired_clock'],elapsedMs:Math.round(performance.now()-start),scanDeadlineMs:10000,unverified:['supervised_reload_restart','changed_definitions_during_scan','quarantine_http_authorization','host_cpu_peak_memory'],productionReady:false}));
}
if(require.main===module)main().catch(e=>{console.error(JSON.stringify({status:'FAIL_OR_BLOCKED',code:/^[A-Z_]{3,60}$/.test(e.message)?e.message:'SCANNER_ACCEPTANCE_FAILED',productionReady:false}));process.exitCode=1;});
module.exports={guard};
