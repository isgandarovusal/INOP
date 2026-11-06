// Synthetic fixtures only. Optional runtimes must be reviewed/preinstalled; never installs.
const fs=require('node:fs'),path=require('node:path'),os=require('node:os'),crypto=require('node:crypto'),{spawnSync}=require('node:child_process'),{performance}=require('node:perf_hooks');
async function main(){
 const out=fs.mkdtempSync(path.join(os.tmpdir(),'inop-converter-benchmark-'));const script=path.join(__dirname,'benchmarkCvConverters.py');
 const env={...process.env,HF_HUB_OFFLINE:'1',TRANSFORMERS_OFFLINE:'1',...(process.env.INOP_PARSER_EXPERIMENT_PATH?{PYTHONPATH:process.env.INOP_PARSER_EXPERIMENT_PATH}:{})};
 const run=mode=>{const p=spawnSync('python3',[script,mode,out],{env,encoding:'utf8',timeout:60000,maxBuffer:1024*1024});if(p.status!==0)return{tool:mode,status:'BLOCKED',reason:p.error?.code||'RUNTIME_FAILED'};return JSON.parse(p.stdout.trim().split('\n').at(-1));};
 const fixtures=run('fixtures');if(!Array.isArray(fixtures))throw Error('Synthetic fixture generation failed');
 const parser=require('../services/cvParser.service'),rows=[];
 for(const f of fixtures){const bytes=fs.readFileSync(f.file);if(crypto.createHash('sha256').update(bytes).digest('hex')!==f.sha256)throw Error('Fixture identity changed');const at=performance.now(),r=await parser.parseCvResultFromBuffer(bytes,'synthetic.docx');rows.push({language:f.lang,sourceHash:f.sha256,tokensPreserved:f.expected.map(s=>r.text.includes(s)),latencyMs:Math.round((performance.now()-at)*100)/100,characters:r.text.length,structuredTables:false});}
 let rejected;try{rejected=!await require('../services/documentWorkerPool.service').pool.run('validate',Buffer.from('Synthetic invalid zip'),'.docx');}catch{rejected=true;}
 const results=[{invalidDocxRejected:rejected,tool:'inop-rules-2',results:rows,peakRssMiB:process.resourceUsage().maxRSS/1024,semanticInference:false},run('docling'),run('markitdown')];const report={syntheticOnly:true,outputDirectory:out,results};fs.writeFileSync(path.join(out,'results.json'),JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));await require('../services/documentWorkerPool.service').pool.close();
}
if(require.main===module)main().catch(()=>{console.error('Synthetic converter benchmark failed.');process.exitCode=1;});
module.exports={main};
