const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {withBrowserFixture}=require('./helpers/browser.cjs');
const shell=`import React from'react';import{createRoot}from'react-dom/client';import App from'/src/App.tsx';import api from'/src/api/axios.ts';import i18n from'/src/i18n/index.ts';api.defaults.baseURL='/api';window.localeTest=l=>i18n.changeLanguage(l);createRoot(document.getElementById('root')).render(React.createElement(App));`;
const overlay={loadSource:id=>id.endsWith('/src/App.tsx')?fs.readFileSync(id,'utf8').replace('const router = createBrowserRouter(ROUTES);','const router = createBrowserRouter(ROUTES);window.navigateTest=to=>router.navigate(to);'):undefined};
async function shots(p,section,prefix){for(const locale of ['az','en','ru'])for(const width of [1440,768,390,320]){
 await p.setViewportSize({width,height:950});await p.evaluate(l=>window.localeTest(l),locale);await p.evaluate(async()=>{await document.fonts.ready;await Promise.all(document.getAnimations().filter(a=>Number.isFinite(a.effect?.getTiming().iterations??1)).map(a=>a.finished.catch(()=>{})));});
 await section.scrollIntoViewIfNeeded();assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false);
 const dir=process.env.INOP_QA_SCREENSHOTS;if(dir){fs.mkdirSync(dir,{recursive:true});await p.screenshot({path:path.join(dir,`${prefix}-${locale}-${width}.png`),fullPage:true});}
}await p.evaluate(()=>window.localeTest('en'));}
async function axe(p,selector){await p.addScriptTag({path:require.resolve('axe-core/axe.min.js')});assert.deepEqual(await p.evaluate(async selector=>(await axe.run(selector,{runOnly:{type:'tag',values:['wcag2a','wcag2aa']}})).violations.map(v=>v.id),selector),[]);}
test('Approved immutable linked reinspection persists through refresh and independent navigation',{timeout:90000},async()=>withBrowserFixture(shell,async h=>{
 const p=h.page,unexpected=[];p.on('console',m=>{if(m.type()==='error')unexpected.push(m.text());});
 await require('../../Backend/models/restaurant.model').create({id:'policy-browser-site',name:'Synthetic reinspection site',brandId:'kfc',organizationId:'gfc'});
 assert.equal((await h.request('admin','POST','/audit-hr/templates/kfc',{})).status,201);
 const source=await h.request('admin','POST','/audit-hr/audits',{brandId:'kfc',restaurantId:'policy-browser-site',date:'2026-11-06'});assert.equal(source.status,201);
 // Finalized seed is synthetic; reinspection creation and persistence are real APIs.
 await h.models.Audit.updateOne({_id:source.data.data._id},{$set:{status:'completed'}});const before=await h.models.Audit.findById(source.data.data._id).lean();
 await h.open('admin','/app/audit/audits/'+before.id);await p.evaluate(()=>window.localeTest('en'));const panel=p.locator('[data-audit-reinspections]');await panel.getByRole('button',{name:'Create linked reinspection',exact:true}).waitFor();assert.equal(await p.getByRole('button',{name:'Start execution',exact:true}).count(),0);assert.equal(await p.locator('input[type=file]').count(),0);
 await panel.getByLabel('Reinspection date',{exact:true}).fill('2026-11-07');
 // Native date inputs have multiple keyboard segments; traverse them rather
 // than assuming that one Tab leaves the whole date widget.
 await panel.getByLabel('Reinspection date',{exact:true}).focus();const submit=panel.getByRole('button',{name:'Create linked reinspection',exact:true});
 for(let tabs=0;tabs<6&&!await submit.evaluate(e=>e===document.activeElement);tabs++)await p.keyboard.press('Tab');assert.equal(await submit.evaluate(e=>e===document.activeElement),true);
 const saved=p.waitForResponse(r=>r.url().includes('/audit-reinspections/')&&r.request().method()==='POST'&&r.status()===201);
 await p.keyboard.press('Enter');await saved;await panel.locator('[data-reinspection-link]').waitFor();
 assert.equal(await h.models.Audit.countDocuments(),2);assert.deepEqual(await h.models.Audit.findById(before._id).lean(),before);
 await shots(p,panel,'reinspection');await axe(p,'[data-audit-reinspections]');
 await p.reload();await p.locator('[data-reinspection-link]').waitFor();await p.evaluate(()=>window.localeTest('en'));await p.locator('[data-reinspection-link]').getByRole('link',{name:/^Reinspection ·/}).click();
 await p.locator('[data-reinspection-link]').getByRole('link',{name:/^Original inspection ·/}).waitFor();
 const child=await h.models.Audit.findOne({_id:{$ne:before._id}}).lean();assert.equal(child.status,'draft');assert.ok(!child.checks?.length);assert.equal(child.photos.length,0);
 await p.locator('[data-reinspection-link]').getByRole('link',{name:/^Original inspection ·/}).click();await panel.getByRole('button',{name:'Create linked reinspection',exact:true}).waitFor();assert.equal(await p.getByRole('button',{name:'Start execution',exact:true}).count(),0);assert.equal(await p.locator('input[type=file]').count(),0);
 assert.deepEqual(await h.models.Audit.findById(before._id).lean(),before);
 for(const [prefix,type]of [['audit-service','service'],['audit-standard','standard'],['audit-hse','occupational-safety']]){
  const hse=type==='occupational-safety';assert.equal((await h.request('admin','POST','/'+prefix+'/templates/'+(hse?'restaurant':'kfc'),{})).status,201);
  const created=await h.request('admin','POST','/'+prefix+'/audits',{brandId:'kfc',restaurantId:'policy-browser-site',objectType:'restaurant',objectId:'policy-browser-site',date:'2026-11-06'});assert.equal(created.status,201);
  await h.models.Audit.updateOne({_id:created.data.data._id},{$set:{status:'completed'}});const original=await h.models.Audit.findById(created.data.data._id).lean();
  await p.evaluate(id=>window.navigateTest('/app/audit/audits/'+id),original.id);await panel.getByRole('button',{name:'Create linked reinspection',exact:true}).waitFor();assert.equal(await p.getByRole('button',{name:'Start execution',exact:true}).count(),0);assert.equal(await p.locator('input[type=file]').count(),0);await panel.getByLabel('Reinspection date',{exact:true}).fill('2026-11-08');
  const response=p.waitForResponse(r=>r.url().includes('/audit-reinspections/')&&r.request().method()==='POST'&&r.status()===201);await panel.getByRole('button',{name:'Create linked reinspection',exact:true}).click();await response;await panel.locator('[data-reinspection-link]').waitFor();assert.deepEqual(await h.models.Audit.findById(original._id).lean(),original);
 }
 assert.deepEqual(h.pageErrors,[]);assert.deepEqual(unexpected,[]);
},overlay));
test('Approved HR duplicate confirmation preserves profiles, evidence and renewed-review state',{timeout:90000},async()=>withBrowserFixture(shell,async h=>{
 const p=h.page,Review=require('../../Backend/models/candidateDuplicateReview.model'),Candidate=require('../../Backend/models/candidate.model');await Review.createIndexes();
 const owner={createdBy:h.actors.admin._id,assignedTo:h.actors.admin._id,departmentId:'dep_A'},a=await Candidate.create({name:'Synthetic policy profile A',role:'Cashier',email:'policy@example.invalid',...owner}),b=await Candidate.create({name:'Synthetic policy profile B',role:'Cashier',email:a.email,...owner});const before=await Candidate.find().lean();
 await h.open('admin','/app/recruitment/candidates/'+a._id);await p.evaluate(()=>window.localeTest('en'));const panel=p.locator('[data-candidate-duplicates]');await panel.locator('summary').first().click();await panel.getByText('Awaiting HR review',{exact:true}).waitFor();
 await panel.locator('[data-duplicate-comparison] summary').click();await panel.getByRole('combobox',{name:'Human review',exact:true}).selectOption('same_person');await panel.getByRole('textbox',{name:'Review note (internal)',exact:true}).fill('Synthetic HR confirmation; records remain separate');
 const saved=p.waitForResponse(r=>r.url().endsWith('/duplicate-reviews')&&r.request().method()==='POST'&&r.status()===200);await panel.getByRole('button',{name:'Record review',exact:true}).click();await saved;await panel.getByText('Reviewed for the current candidate revisions',{exact:true}).waitFor();
 assert.deepEqual(await Candidate.find().lean(),before);const journal=await Review.findOne().lean();assert.equal(journal.decision,'same_person');assert.equal(journal.evidence.version,1);assert.equal(journal.evidence.revisions.length,2);
 await panel.locator('[data-duplicate-history] summary').click();await panel.getByText('Evidence and candidate revision references recorded',{exact:true}).waitFor();await shots(p,panel,'duplicate-policy');await axe(p,'[data-candidate-duplicates]');
 await p.reload();await p.evaluate(()=>window.localeTest('en'));await panel.locator('summary').first().click();await panel.getByText('Reviewed for the current candidate revisions',{exact:true}).waitFor();
 await Candidate.updateOne({_id:b._id},{$set:{role:'Synthetic revised role'}});await panel.getByRole('button',{name:'Refresh',exact:true}).first().click();await panel.getByText('Candidate information changed — renewed HR review required',{exact:true}).waitFor();assert.equal(await Review.countDocuments(),1);assert.equal(await Candidate.countDocuments(),2);assert.deepEqual(h.pageErrors,[]);
},overlay));

test('OCR confusable warning is localized and accessible without altering source quotes',{timeout:60000},async()=>withBrowserFixture(`import React from'react';import{createRoot}from'react-dom/client';import{BrowserRouter,useNavigate}from'react-router-dom';import i18n from'/src/i18n/index.ts';import Evidence from'/src/Components/CvReviewEvidence.tsx';import'/src/App.css';window.localeTest=l=>i18n.changeLanguage(l);function App(){window.navigateTest=useNavigate();return React.createElement(Evidence,{review:{version:'ocr-rules-1',provider:'tesseract-rules',processingStatus:'extracted',reviewStatus:'pending',warnings:['ocr_acronym_review'],fields:{skills:{source:'ocr-text',confidence:null,evidence:['НАССР']}}}})}createRoot(document.getElementById('root')).render(React.createElement(BrowserRouter,null,React.createElement(App)));`,async h=>{
 const p=h.page;await h.open('admin','/');await p.locator('[data-cv-review] [role=alert]').waitFor();await shots(p,p.locator('[data-cv-review]'),'ocr-warning');await axe(p,'[data-cv-review]');assert.equal(await p.locator('blockquote').textContent(),'НАССР');assert.deepEqual(h.pageErrors,[]);
}));
