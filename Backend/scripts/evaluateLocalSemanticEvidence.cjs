// Explicit offline synthetic experiment, never an application request handler.
const path=require('node:path'),{spawnSync}=require('node:child_process');
const {prepare,rank}=require('./localSemanticEvidence.cjs');
const {calculateApplicationMatch}=require('../services/applicationMatch.service');
const fail=()=>{throw Object.assign(new Error('Local semantic evaluation is unavailable.'),{code:'LOCAL_SEMANTIC_REJECTED'});};
const MODEL_HASH='5e6329fe3fecedb1d1a02c3ea2172ee0fede6cea6e4aefb6a02d832dba78a310';
const cases=[
 {caseId:'english-paraphrase-and-negation',requirement:'Customer service',quotes:['Explains menu choices and resolves customer complaints','Repairs refrigeration equipment','Has no experience in customer service']},
 {caseId:'english-inventory-paraphrase',requirement:'Inventory management',quotes:['Tracks ingredient stock and replenishes supplies','Schedules staff shifts']},
 {caseId:'english-out-of-vocabulary',requirement:'qzxqzxqzx',quotes:['Customer service','Tracks ingredient stock']},
];
function input(row){return{locale:'en',requirement:row.requirement,evidence:{version:'cv-professional-evidence-v1',facts:row.quotes.map((quote,i)=>({id:`e${i+1}`,field:'skills',quote}))}};}
function evaluate({python,modelDir,execute=spawnSync}={}){
 if(typeof python!=='string'||!path.isAbsolute(python)||/[\x00-\x1f\x7f]/.test(python)||typeof modelDir!=='string'||!path.isAbsolute(modelDir)||/[\x00-\x1f\x7f]/.test(modelDir))fail();
 const prepared=cases.map(row=>prepare(input(row))),texts=prepared.flatMap(row=>row.texts);
 const result=execute(python,['-I',path.join(__dirname,'localSemanticVectors.py'),modelDir],{
  input:JSON.stringify({texts}),encoding:'utf8',timeout:20000,killSignal:'SIGKILL',maxBuffer:1024*1024,shell:false,
  env:{PATH:'/usr/bin:/bin',LANG:'C.UTF-8',PYTHONNOUSERSITE:'1',OMP_NUM_THREADS:'1',OPENBLAS_NUM_THREADS:'1',MKL_NUM_THREADS:'1'},
 });
 if(result.error||result.status!==0||result.signal||typeof result.stdout!=='string'||Buffer.byteLength(result.stdout)>1024*1024)fail();
 let output;try{output=JSON.parse(result.stdout);}catch{fail();}
 const metadata=output?.metadata;
 if(!output||Object.keys(output).some(key=>!['vectors','metadata'].includes(key))||!Array.isArray(output.vectors)||output.vectors.length!==texts.length||metadata?.model!=='en_core_web_md'||metadata.version!=='3.8.0'||metadata.runtime!=='spacy'||metadata.runtimeVersion!=='3.8.8'||metadata.language!=='en'||metadata.kind!=='english-static-word-vector-mean'||metadata.dimensions!==300||metadata.verifiedModelFiles!==8||metadata.modelWheelSha256!==MODEL_HASH||metadata.productionReady!==false)fail();
 for(const key of ['loadMs','embeddingMs','peakRssKiB'])if(typeof metadata[key]!=='number'||!Number.isFinite(metadata[key])||metadata[key]<0||metadata[key]>1e9)fail();
 let offset=0;
 const results=cases.map((row,index)=>{
  const size=prepared[index].texts.length;let ranking;try{ranking=rank(input(row),output.vectors.slice(offset,offset+size)).ranking;}catch{fail();}offset+=size;
  const lexical=calculateApplicationMatch({_id:'111111111111111111111111',requiredSkills:[row.requirement]},{_id:'222222222222222222222222',skills:row.quotes,reviewedFields:['skills']},{application:{jobId:'111111111111111111111111',candidateId:'222222222222222222222222'}});
  return{caseId:row.caseId,lexicalAtsScore:lexical.score,ranking};
 });
 return{execution:'ACTUAL_LOCAL_STATIC_VECTOR_INFERENCE',syntheticOnly:true,productionReady:false,requiresHumanReview:true,limitations:['English only; locale admission is not language detection','Static word-vector means do not resolve negation or establish qualifications','Retrieval similarity never changes deterministic ATS or hiring decisions','Python socket guard is not an OS network sandbox; no production capacity claim'],metadata,results};
}
if(require.main===module){try{const args=process.argv.slice(2);if(args.length!==4||args[0]!=='--python'||args[2]!=='--model-dir')fail();process.stdout.write(JSON.stringify(evaluate({python:args[1],modelDir:args[3]}),null,2)+'\n');}catch{process.stderr.write('LOCAL_SEMANTIC_REJECTED\n');process.exitCode=1;}}
module.exports={evaluate,cases,MODEL_HASH};
