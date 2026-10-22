const test=require('node:test'),assert=require('node:assert/strict'),path=require('node:path');
const {DocumentWorkerPool,MAX_BYTES}=require('../services/documentWorkerPool.service');
const {extractCvTextFromBuffer,extractCvResultFromBuffer,parseCvResultFromBuffer}=require('../services/cvParser.service');
const docs=require('./helpers/cvDocuments.cjs');
const workerFile=path.join(__dirname,'helpers/documentTestWorker.cjs');
test('Education ends at exact additional-information headings across AZ/EN/RU without truncating school text',async()=>{
 for(const [heading,school,next]of [['Education','Secondary school','Additional professional information'],['Təhsil','Tam orta təhsil','Əlavə məlumatlar'],['Образование','Среднее образование','Дополнительная информация']]){
  const text='Name: Synthetic Education\n'+heading+'\n'+school+'\n'+next+'\nAvailable on weekends';
  const out=await parseCvResultFromBuffer(docs.docx(text),'synthetic.docx');assert.equal(out.parsed.education,school);assert.equal(out.parsed.sections.additional,'Available on weekends');
 }
 const out=await parseCvResultFromBuffer(docs.docx('Name: Synthetic Education\nEducation\nUniversity — Additional information studies\nGraduate degree'),'school.docx');assert.equal(out.parsed.education,'University — Additional information studies\nGraduate degree');
});
test('Document workers bound CPU, queues, diagnostics, inputs and cancellation',async t=>{
 await t.test('CPU-bound worker leaves the parent responsive and queue is bounded',async()=>{
  const p=new DocumentWorkerPool({workerFile,concurrency:1,maxQueue:1});let ticks=0;const timer=setInterval(()=>ticks++,5);
  try{const first=p.run('validate',Buffer.from('wait:150'),'.txt'),second=p.run('validate',Buffer.from('ok'),'.txt');assert.equal(p.stats().active,1);assert.equal(p.stats().queued,1);await assert.rejects(p.run('validate',Buffer.from('excess'),'.txt'),e=>e.code==='DOCUMENT_BUSY'&&e.status===503);assert.equal(await first,true);assert.equal(await second,true);assert.ok(ticks>=5);assert.equal(p.stats().rejected,1);}finally{clearInterval(timer);await p.close();}
 });
 await t.test('deadline terminates CPU work and a later job can recover',async()=>{
  const p=new DocumentWorkerPool({workerFile,timeoutMs:50});try{await assert.rejects(p.run('validate',Buffer.from('wait:250'),'.txt'),e=>e.code==='DOCUMENT_TIMEOUT'&&e.status===503);assert.equal(p.stats().timedOut,1);}finally{await p.close();}assert.equal(p.stats().active,0);
 });
 await t.test('queued and active cancellation release capacity without changing the original buffer',async()=>{
  const p=new DocumentWorkerPool({workerFile}),a=new AbortController(),b=new AbortController(),bytes=Buffer.from('wait:150');
  try{const first=p.run('validate',bytes,'.txt',{signal:a.signal}),second=p.run('validate',Buffer.from('ok'),'.txt',{signal:b.signal});b.abort();await assert.rejects(second,e=>e.code==='DOCUMENT_CANCELED');assert.equal(p.stats().queued,0);a.abort();await assert.rejects(first,e=>e.code==='DOCUMENT_CANCELED');assert.equal(bytes.toString(),'wait:150');assert.equal(await p.run('validate',Buffer.from('ok'),'.txt'),true);}finally{await p.close();}
 });
 for(const command of ['throw','exit','invalid'])await t.test(`${command} worker failure does not expose document diagnostics`,async()=>{
  const p=new DocumentWorkerPool({workerFile});try{await assert.rejects(p.run(command==='invalid'?'extract':'validate',Buffer.from(command),'.txt'),e=>e.code==='DOCUMENT_WORKER_FAILED'&&!/private|Synthetic/.test(e.message));assert.equal(await p.run('validate',Buffer.from('ok'),'.txt'),true);}finally{await p.close();}
 });
 await t.test('workers do not inherit DB, JWT or SMTP credentials',async()=>{
  const p=new DocumentWorkerPool({workerFile});try{assert.equal(await p.run('validate',Buffer.from('env'),'.txt'),false);}finally{await p.close();}
 });
 await t.test('input/configuration limits and shutdown fail closed',async()=>{
  const p=new DocumentWorkerPool({workerFile});await assert.rejects(p.run('extract',Buffer.alloc(MAX_BYTES+1),'x.pdf'),e=>e.code==='DOCUMENT_LIMIT');await assert.rejects(p.run('extract','fake','x.pdf'),e=>e.code==='DOCUMENT_INVALID');await assert.rejects(p.run('unknown',Buffer.from('x'),'x.pdf'),e=>e.code==='DOCUMENT_INVALID');await p.close();await assert.rejects(p.run('extract',Buffer.from('x'),'x.pdf'),e=>e.code==='DOCUMENT_CANCELED');assert.throws(()=>new DocumentWorkerPool({concurrency:3}),RangeError);
 });
});
test('Actual bounded PDF/DOCX extraction preserves text and declares partial results',async t=>{
 await t.test('actual multilingual PDF and DOCX remain readable without AI or fabricated fields',async()=>{
  const text='Name: Ali Example\nPhone: +994 (50) 123-45-67\nSkills: HACCP, Food safety';
  const pdf=await docs.pdf(text);assert.match(await extractCvTextFromBuffer(pdf,'cv.pdf'),/994/);
  for(const text of ['Ad soyad: Əli Məmmədov\nTelefon: 0501234567','Name: Jane Smith\nPhone: +14155552671','ФИО: Иван Петров\nТелефон: +994501234567'])assert.equal((await extractCvTextFromBuffer(docs.docx(text),'cv.docx')).trim(),text.replaceAll('\n','\n\n'));
 });
 await t.test('structured parsing also runs in the worker and retains canonical DTO/evidence',async()=>{
  let ticks=0;const timer=setInterval(()=>ticks++,5);
  try { const r=await parseCvResultFromBuffer(docs.docx('Name: Jane Smith\nPhone: +994501234567\nSkills\nHACCP'),'review.docx');assert.equal(r.parsed.name,'Jane Smith');assert.equal(r.parsed.phone,'+994501234567');assert.ok(r.parsed.skills.includes('HACCP'));assert.equal(r.parsed.rawText,r.text);assert.equal(r.parsed.extraction.provider,'rule-based');assert.ok(ticks>0); } finally {clearInterval(timer);}
 });
 await t.test('100k text limit is explicit instead of pretending the whole original was extracted',async()=>{
  const bytes=docs.docx('A'.repeat(150000));const r=await extractCvResultFromBuffer(bytes,'large.docx');assert.equal(r.text.length,100000);assert.deepEqual(r.warnings,['text_limit']);
 });
 await t.test('PDF processing stops after 50 pages with a review warning',async()=>{
  const PDFDocument=require('pdfkit'),doc=new PDFDocument({autoFirstPage:false}),chunks=[];const ready=new Promise(resolve=>{doc.on('data',c=>chunks.push(c));doc.on('end',()=>resolve(Buffer.concat(chunks)));});
  for(let i=1;i<=51;i++){doc.addPage();doc.text('UniquePageMarker '+i);}doc.end();const r=await extractCvResultFromBuffer(await ready,'many.pdf');assert.ok(r.warnings.includes('page_limit'));assert.ok(!r.text.includes('UniquePageMarker 51'));assert.ok(r.text.includes('UniquePageMarker 50'));
 });
 await t.test('malformed and oversized documents reject safely; scanned PDF remains explicit OCR-required',async()=>{
  await assert.rejects(extractCvTextFromBuffer(Buffer.from('%PDF-broken'),'invalid.pdf'),e=>e.code==='DOCUMENT_WORKER_FAILED');assert.equal(await extractCvTextFromBuffer(await docs.pdf(''),'scan.pdf'),'');await assert.rejects(extractCvTextFromBuffer(Buffer.alloc(MAX_BYTES+1),'oversized.pdf'),e=>e.code==='DOCUMENT_LIMIT');
 });
});

test('unbroken 100k input cannot monopolize structured contact parsing or fabricate suffix emails', () => {
 const { spawnSync } = require('node:child_process');
 const result = spawnSync(process.execPath, ['-e', `const {parseStructuredCv}=require('./Backend/services/cvStructuredParser.service');
 const r=parseStructuredCv('A'.repeat(98000)+'\\nEmail: applicant@example.invalid');
 if(r.email!=='applicant@example.invalid'||r.name!=='')process.exit(1);
 if(parseStructuredCv('A'.repeat(1000)+'@example.invalid').email!=='')process.exit(2);`], { cwd:require('node:path').resolve(__dirname,'../..'),timeout:2000,env:{},encoding:'utf8' });
 assert.equal(result.error, undefined); assert.equal(result.status, 0, result.stderr);
});
