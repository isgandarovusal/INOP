const fs=require('node:fs'),os=require('node:os'),path=require('node:path'),crypto=require('node:crypto'),{spawnSync}=require('node:child_process');
async function main(){
 const out=fs.mkdtempSync(path.join(os.tmpdir(),'inop-pdf-acceptance-')),script=path.join(__dirname,'benchmarkPdfOcr.py'),env={...process.env,PYTHONPATH:process.env.INOP_PARSER_EXPERIMENT_PATH||'',HF_HUB_OFFLINE:'1',TRANSFORMERS_OFFLINE:'1'};
 const run=mode=>{const r=spawnSync('python3',[script,mode,out],{env,timeout:60000,maxBuffer:1024*1024,encoding:'utf8'});if(r.status!==0)throw Error('Reviewed converter runtime unavailable');return JSON.parse(r.stdout.trim().split('\n').at(-1));};
 const fixtures=run('fixtures'),pool=require('../services/documentWorkerPool.service').pool,parser=require('../services/cvParser.service'),ocr=require('../services/hrCvOcrEngine.service').createOcrEngine({enabled:true,dataDirectory:require('./prepareOcrTestModels.cjs').directory}),results=[];
 try{for(const f of fixtures){const b=fs.readFileSync(f.file);if(crypto.createHash('sha256').update(b).digest('hex')!==f.sha256)throw Error('Fixture changed');let at=performance.now(),r=await parser.parseCvResultFromBuffer(b,'synthetic.pdf');const row={language:f.language,kind:f.kind,sourceHash:f.sha256,markers:f.expected.filter(p=>r.text.includes(p)).length,expectedMarkers:4,characters:r.text.length,latencyMs:Math.round((performance.now()-at)*100)/100,structuredTables:false};
 if(f.kind==='scan'){at=performance.now();try{const actual=await ocr.extract(b);row.ocr={markers:f.expected.filter(p=>actual.text.includes(p)).length,latencyMs:Math.round((performance.now()-at)*100)/100,pages:actual.pages,engine:actual.engine,actualNeuralOcr:true};}catch(e){row.ocr={status:'BLOCKED',code:e.code};}}
 results.push(row);}
 let rejected;try{rejected=!await pool.run('validate',Buffer.from('%PDF-Synthetic invalid'),'.pdf');}catch{rejected=true;}
 let parseRejected=false;try{await parser.parseCvResultFromBuffer(Buffer.from('%PDF-Synthetic invalid'),'invalid.pdf');}catch{parseRejected=true;}
 const report={syntheticOnly:true,semanticInference:false,outputDirectory:out,results:[{tool:'INOP parser + native OCR',results,peakRssMiB:process.resourceUsage().maxRSS/1024,signatureValidationRejected:rejected,invalidPdfParseRejected:parseRejected},run('markitdown')],docling:{status:'NOT_RUN',reason:'Reviewed slim DOCX runtime does not include PDF layout/OCR artifacts; no new models downloaded'}};fs.writeFileSync(path.join(out,'results.json'),JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));
 }finally{await pool.close();}
}
if(require.main===module)main().catch(()=>{console.error('Synthetic PDF benchmark failed.');process.exitCode=1;});module.exports={main};
