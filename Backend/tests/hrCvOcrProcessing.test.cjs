const test=require('node:test'),assert=require('node:assert/strict'),crypto=require('node:crypto'),fs=require('node:fs/promises'),path=require('node:path');
const PDFDocument=require('pdfkit'),{PDFParse}=require('pdf-parse');
const {withAuditFixture}=require('./helpers/auditFixture.cjs'),{uploadsDir}=require('../middleware/privateUpload.middleware');
const {createOcrEngine}=require('../services/hrCvOcrEngine.service'),{createOcrProcessing,parseOcrCv}=require('../services/hrCvOcrProcessing.service'),{createProcessing}=require('../services/hrCvProcessing.service');
const {extractCvResult}=require('../services/cvTextExtraction.service');
const Candidate=require('../models/candidate.model'),Jobs=require('../models/hrCvProcessingJob.model'),{directory,versions}=require('../scripts/prepareOcrTestModels.cjs');
const sha=value=>crypto.createHash('sha256').update(value).digest('hex');
async function document(draw,options={}){const doc=new PDFDocument(options),chunks=[],ready=new Promise(r=>{doc.on('data',c=>chunks.push(c));doc.on('end',()=>r(Buffer.concat(chunks)));});draw(doc);doc.end();return ready;}
async function scanned(text){
 const original=await document(doc=>doc.font('/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf').fontSize(17).text(text));
 const p=new PDFParse({data:original,verbosity:0,isEvalSupported:false});let image;try{image=(await p.getScreenshot({partial:[1],desiredWidth:1200,imageBuffer:true,imageDataUrl:false})).pages[0].data;}finally{await p.destroy();}
 return document(doc=>doc.image(image,0,0,{width:612,height:792}));
}
const examples={
 eng:'Name: Synthetic Applicant\nPhone: +994 50 123 45 67\nSkills\nFood safety\nHACCP\nExperience\n0 years',
 aze:'Ad soyad: Sintetik Namizəd\nTelefon: +994 50 123 45 67\nBacarıqlar\nQida təhlükəsizliyi\nHACCP\nTəcrübə\n0 il',
 rus:'Имя: Синтетический Кандидат\nТелефон: +994 50 123 45 67\nНавыки\nПищевая безопасность\nHACCP\nОпыт\n0 лет',
};
test('Actual bounded OCR processes image-only AZ/EN/RU PDFs locally; unsupported is explicit, not mock PASS',async t=>{
 for(const [lang,identity]of Object.entries(versions))assert.equal(sha(await fs.readFile(path.join(directory,lang+'.traineddata'))),identity,'Run node Backend/scripts/prepareOcrTestModels.cjs explicitly before real OCR tests.');
 for(const lang of ['eng','aze','rus'])await t.test(lang+' real Tesseract image extraction preserves phone/skills/unknown and leaves original intact',async()=>{
  const bytes=await scanned(examples[lang]),before=Buffer.from(bytes);assert.equal((await extractCvResult(bytes,'scan.pdf')).text,'');const output=await createOcrEngine({enabled:true,languages:lang==='rus'?['rus','eng']:[lang],dataDirectory:directory}).extract(bytes);
  assert.equal(output.engine.provider,'tesseract');assert.deepEqual(output.engine.languages,lang==='rus'?['rus','eng']:[lang]);assert.match(output.engine.version,/^\d+\.\d+\.\d+$/);assert.equal(output.pages,1);const facts=parseOcrCv(output.text);assert.equal(facts.phone,'+994501234567');assert.ok(facts.skills.includes('HACCP'));assert.ok(facts.skills.includes('Food safety'));assert.equal(facts.email,'');assert.deepEqual(bytes,before);
 });
 await t.test('exact OCR acronym aliases retain original evidence; arbitrary similar strings do not invent skills',()=>{
  for(const token of ['НАССР','НAСCP','насср','ХАССП']){const parsed=parseOcrCv('Skills\n'+token);assert.ok(parsed.skills.includes('HACCP'));assert.ok(parsed.extraction.fields.skills.evidence.includes(token));assert.ok(parsed.extraction.warnings.includes('ocr_acronym_review'));}
  for(const token of ['НАСС','HACCA','HACCPerson','personНАССР','Not certified'])assert.ok(!parseOcrCv('Skills\n'+token).skills.includes('HACCP'));
 });
 await t.test('default off, missing binary/models, bad input/config and cancelled work fail explicitly',async()=>{
  const bytes=await scanned(examples.eng);await assert.rejects(createOcrEngine().extract(bytes),{code:'OCR_DISABLED'});await assert.rejects(createOcrEngine({enabled:true,binary:'/tmp/no-such-ocr-runtime/tesseract'}).extract(bytes),{code:'OCR_RUNTIME_REQUIRED'});
  const unavailable=createOcrEngine({enabled:true,run:async()=> 'List of available languages:\neng\n'});await assert.rejects(unavailable.extract(bytes),{code:'OCR_LANGUAGE_REQUIRED'});
  for(const value of [Buffer.from('invalid'),Buffer.alloc(5*1024*1024+1)])await assert.rejects(createOcrEngine({enabled:true}).extract(value),{code:'OCR_INVALID_DOCUMENT'});
  for(const options of [{languages:['xxx']},{binary:'tesseract'},{dataDirectory:'../models'},{timeoutMs:16000}])assert.throws(()=>createOcrEngine(options),{code:'OCR_CONFIG'});
  await assert.rejects(createOcrEngine({enabled:true}).extract(bytes,{signal:AbortSignal.abort()}),{code:'OCR_CANCELLED'});
 });
 await t.test('more than three pages and oversized geometry reject instead of silently truncating CV',async()=>{
  const engine=createOcrEngine({enabled:true,dataDirectory:directory});const long=await document(doc=>{for(let i=0;i<4;i++){if(i)doc.addPage();doc.text('Synthetic page '+i);}});await assert.rejects(engine.extract(long),{code:'OCR_LIMIT'});
  const tall=await document(doc=>doc.text('Synthetic huge geometry'),{size:[612,12000]});await assert.rejects(engine.extract(tall),{code:'OCR_LIMIT'});
 });
 await t.test('cross-instance capacity, deadline and ignored late renderer do not leak temporary images or resume native OCR',async()=>{
  const bytes=await scanned(examples.eng);let entered,release;const ready=new Promise(r=>entered=r),gate=new Promise(r=>release=r);const run=async(_binary,args)=>args.includes('--list-langs')?'eng\n':args.includes('--version')?'tesseract 5.5.0':assert.fail('No image recognition after timeout');
  const engine=createOcrEngine({enabled:true,languages:['eng'],timeoutMs:80,run,render:async()=>{entered();await gate;return[{pageNumber:1,data:new Uint8Array([1])}];}}),pending=engine.extract(bytes);await ready;
  await assert.rejects(createOcrEngine({enabled:true}).extract(bytes),{code:'OCR_BUSY'});await assert.rejects(pending,{code:'OCR_TIMEOUT'});release();await new Promise(r=>setImmediate(r));
 });
 await t.test('native OCR child receives no inherited secret; temporary PNG permissions and cleanup are private',async()=>{
  const os=require('node:os'),root=await fs.mkdtemp(path.join(os.tmpdir(),'inop-ocr-binary-test-')),binary=path.join(root,'tesseract'),old=process.env.INOP_OCR_SYNTHETIC_SECRET;
  await fs.writeFile(binary,'#!/bin/sh\ncase "$1" in\n--list-langs) echo eng;;\n--version) echo "tesseract 5.5.0";;\n*) if [ -n "$INOP_OCR_SYNTHETIC_SECRET" ]; then echo PRIVATE_TEST_LEAK; else echo "Synthetic test recognition only"; fi;;\nesac\n',{flag:'wx',mode:0o700});
  process.env.INOP_OCR_SYNTHETIC_SECRET='synthetic-not-a-real-secret';let imageFile;
  try{const bytes=await scanned(examples.eng),output=await createOcrEngine({enabled:true,binary,languages:['eng'],render:async()=>[{pageNumber:1,data:new Uint8Array([1])}],run:undefined}).extract(bytes);assert.equal(output.text,'Synthetic test recognition only');assert.ok(!output.text.includes('PRIVATE_TEST_LEAK'));}
  finally{if(old===undefined)delete process.env.INOP_OCR_SYNTHETIC_SECRET;else process.env.INOP_OCR_SYNTHETIC_SECRET=old;await fs.unlink(binary);await fs.rmdir(root);}
  const nativeRun=async(_binary,args)=>{if(args.includes('--list-langs'))return'eng\n';if(args.includes('--version'))return'tesseract 5.5.0';imageFile=args[0];assert.equal((await fs.stat(imageFile)).mode&0o777,0o600);assert.equal((await fs.stat(path.dirname(imageFile))).mode&0o777,0o700);return'Synthetic mock recognition only';};
  await createOcrEngine({enabled:true,languages:['eng'],run:nativeRun,render:async()=>[{pageNumber:1,data:new Uint8Array([1])}]}).extract(await scanned(examples.eng));await assert.rejects(fs.stat(imageFile),{code:'ENOENT'});await assert.rejects(fs.stat(path.dirname(imageFile)),{code:'ENOENT'});
 });
 await t.test('cleanup failure cannot silently report success; recovery removes only this test generated PNG/directory',async()=>{
  const unlink=fs.unlink,paths=new Set(),run=async(_binary,args)=>args.includes('--list-langs')?'eng\n':args.includes('--version')?'tesseract 5.5.0':'Synthetic mock recognition only';
  fs.unlink=async filename=>{if(path.basename(filename)==='page.png'&&path.basename(path.dirname(filename)).startsWith('inop-ocr-')){paths.add(filename);throw Object.assign(Error('Synthetic permission failure'),{code:'EACCES'});}return unlink(filename);};
  try{await assert.rejects(createOcrEngine({enabled:true,languages:['eng'],run,render:async()=>[{pageNumber:1,data:new Uint8Array([1])}]}).extract(await scanned(examples.eng)),{code:'OCR_TEMP_CLEANUP_FAILED'});assert.equal(paths.size,1);}
  finally{fs.unlink=unlink;for(const file of paths){await unlink(file);await fs.rmdir(path.dirname(file));}}
 });
});
test('Durable OCR profile keeps current source/scope, review-only provenance and kind boundaries',async t=>withAuditFixture(async h=>{
 const bytes=await scanned(examples.eng),owned=[],req=actor=>({user:{id:String(h.actors[actor]._id)}}),engine=createOcrEngine({enabled:true,dataDirectory:directory,languages:['eng']}),queue=createOcrProcessing({enabled:true,engine});
 const input=c=>({kind:'ocr',expectedRevision:c.__v??0,expectedHash:c.cvOriginal.sha256});
 async function cv(owner='own'){const file=path.join(uploadsDir,'test-'+crypto.randomUUID()+'.pdf');await fs.writeFile(file,bytes,{flag:'wx',mode:0o600});owned.push(file);return Candidate.create({name:'Manual applicant',role:'Cashier',status:'new',experience:null,createdBy:h.actors[owner]._id,assignedTo:h.actors[owner==='own'?'assigned':owner]._id,departmentId:owner==='own'?'dep_A':'dep_B',cvUrl:'/uploads/'+path.basename(file),cvOriginal:{sha256:sha(bytes),size:bytes.length,mimeType:'application/pdf'},cvReview:{version:'rules-2',provider:'rule-based',processingStatus:'unsupported_ocr'}});}
 for(const scope of ['own','department','assigned','none'])await h.models.Role.updateOne({key:'test_'+scope},{permissions:[{resource:'candidate',action:'read',scope},{resource:'candidate',action:'update',scope}]});
 try{
  await t.test('disabled/no DDL cannot enqueue or run OCR; default parse endpoints do not admit kind',async()=>{const c=await cv();await assert.rejects(createOcrProcessing().enqueue(req('own'),c._id,input(c)),{code:'PROCESSING_DISABLED'});await assert.rejects(queue.enqueue(req('own'),c._id,input(c)),{code:'PROCESSING_QUEUE_NOT_READY'});await Jobs.createIndexes();await assert.rejects(createProcessing({enabled:true}).enqueue(req('own'),c._id,input(c)),{code:'PROCESSING_INVALID_INPUT'});});
  for(const actor of ['admin','hr','own','department','assigned'])await t.test(actor+' real scan job persists current HR-only review and original remains unchanged',async()=>{
   const c=await cv(),before=await Candidate.findById(c._id).lean(),job=await queue.enqueue(req(actor),c._id,input(c));assert.equal((await queue.enqueue(req(actor),c._id,input(c))).id,job.id);await queue.runOnce();const result=await queue.get(req(actor),job.id);assert.equal(result.state,'succeeded');assert.equal(result.result.parserVersion,'ocr-rules-1');assert.equal(result.result.requiresApproval,true);assert.equal(result.result.parsed.phone,'+994501234567');assert.equal(result.result.parsed.experience,0);assert.equal(result.result.parsed.email,undefined);assert.equal(result.result.parsed.rawText,undefined);assert.equal(result.result.review.provider,'tesseract-rules');assert.equal(result.result.review.reviewStatus,'pending');assert.ok(Object.values(result.result.review.fields).every(f=>f.source==='ocr-text'&&f.confidence===null));assert.deepEqual(await Candidate.findById(c._id).lean(),before);assert.deepEqual(await fs.readFile(owned.at(-1)),bytes);
  });
  await t.test('foreign/mixed scopes fail before original/OCR, and parse worker cannot claim OCR; disabled OCR approval stays closed',async()=>{
   const c=await cv('foreign');for(const actor of ['own','department','assigned','none'])await assert.rejects(queue.enqueue(req(actor),c._id,input(c)),{code:'PROCESSING_PARENT_UNAVAILABLE'});
   for(const permissions of [[{resource:'candidate',action:'read',scope:'all'},{resource:'candidate',action:'update',scope:'own'}],[{resource:'candidate',action:'read',scope:'own'},{resource:'candidate',action:'update',scope:'all'}]]){await h.models.Role.updateOne({key:'test_own'},{permissions});try{await assert.rejects(queue.enqueue(req('own'),c._id,input(c)),{code:'PROCESSING_PARENT_UNAVAILABLE'});}finally{await h.models.Role.updateOne({key:'test_own'},{permissions:[{resource:'candidate',action:'read',scope:'own'},{resource:'candidate',action:'update',scope:'own'}]});}}
   const job=await queue.enqueue(req('admin'),c._id,input(c)),parse=createProcessing({enabled:true});assert.equal((await parse.runOnce()).processed,0);await assert.rejects(parse.get(req('admin'),job.id),{code:'PROCESSING_PARENT_UNAVAILABLE'});await queue.runOnce();
   const processing=require('../services/hrCvProcessing.service'),factory=processing.createProcessing;processing.createProcessing=()=>factory({enabled:true});try{const r=await h.request('admin','PUT',`/candidates/${c._id}`,{name:'Forbidden automatic import',expectedRevision:0,reviewStatus:'confirmed',processingApproval:{jobId:job.id,contextHash:(await queue.get(req('admin'),job.id)).source.contextHash,expectedJobUpdatedAt:(await queue.get(req('admin'),job.id)).updatedAt}});assert.equal(r.status,503);assert.equal(r.data.code,'PROCESSING_DISABLED');assert.equal((await Candidate.findById(c._id)).name,'Manual applicant');}finally{processing.createProcessing=factory;}
  });
  await t.test('unconfigured runtime/no-text/docx are blocked, never invented candidate fields or success',async()=>{
   for(const engineValue of [undefined,{extract:async()=>({text:'',engine:{provider:'tesseract',version:'5.5.0',languages:['eng']},pages:1})}]){const worker=createOcrProcessing({enabled:true,...(engineValue?{engine:engineValue}:{})}),c=await cv(),job=await worker.enqueue(req('own'),c._id,input(c));await worker.runOnce();const result=await worker.get(req('own'),job.id);assert.equal(result.state,'blocked');assert.equal(result.code,engineValue?'OCR_NO_TEXT':'OCR_NOT_CONFIGURED');assert.equal(result.result,undefined);}
   const c=await cv();await Candidate.updateOne({_id:c._id},{$set:{'cvOriginal.mimeType':'application/vnd.openxmlformats-officedocument.wordprocessingml.document'}});const row=await Candidate.findById(c._id),job=await queue.enqueue(req('own'),row._id,input(row));await queue.runOnce();assert.equal((await queue.get(req('own'),job.id)).code,'OCR_PDF_REQUIRED');
  });
  await t.test('scope/source change while OCR waits discards facts and late version/source read cannot reapply',async()=>{
   for(const mode of ['source','role']){const c=await cv();let entered,release;const ready=new Promise(r=>entered=r),gate=new Promise(r=>release=r);const worker=createOcrProcessing({enabled:true,engine:{extract:async()=>{const output=await engine.extract(bytes);entered();await gate;return output;}}}),job=await worker.enqueue(req('own'),c._id,input(c)),pending=worker.runOnce();await ready;
    if(mode==='source')await Candidate.updateOne({_id:c._id},{name:'Concurrent source edit'});else await h.models.User.updateOne({_id:h.actors.own._id},{role:'test_none'});release();await pending;const row=await Jobs.findById(job.id).select('+result').lean();assert.equal(row.state,'cancelled');assert.equal(row.code,mode==='source'?'SOURCE_CHANGED':'AUTH_REVOKED');assert.equal(row.result,undefined);if(mode==='role')await h.models.User.updateOne({_id:h.actors.own._id},{role:'test_own'});
   }
  });
 }finally{for(const file of owned)await fs.unlink(file);}
}));
