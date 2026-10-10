const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs/promises'),path=require('node:path');const{createRequire}=require('node:module');
const{withBrowserFixture}=require('./helpers/browser.cjs');const backend=createRequire(path.resolve(__dirname,'../../Backend/package.json'));
const Template=backend('./models/auditTemplate.model'),Source=backend('./models/auditSourceDocument.model');
const harness=`
import React from'react';import{createRoot}from'react-dom/client';import{BrowserRouter,Routes,Route,useNavigate}from'react-router-dom';
import{AuthContext}from'/src/Context/AuthContext.ts';import Builder from'/src/Pages/Audit/ChecklistBuilder/AuditTemplateBuilder.tsx';
import*as service from'/src/Services/auditSourceDocumentsService.ts';import api from'/src/api/axios.ts';api.defaults.baseURL='/api';
const create=URL.createObjectURL.bind(URL),revoke=URL.revokeObjectURL.bind(URL);window.created=[];window.revoked=[];
URL.createObjectURL=blob=>{const url=create(blob);window.created.push(url);return url;};URL.revokeObjectURL=url=>{window.revoked.push(url);revoke(url);};
function App(){const[user,setUser]=React.useState(window.testUser);window.setTestUser=setUser;window.sourceService=service;window.navigateTest=useNavigate();return React.createElement(AuthContext.Provider,{value:{user,isLoading:false}},React.createElement(Routes,null,React.createElement(Route,{path:'/builder/:id?',element:React.createElement(Builder)}),React.createElement(Route,{path:'/app/audit/checklists',element:React.createElement('div',null,'Saved destination')}),React.createElement(Route,{path:'/contract',element:React.createElement('div',null,'fixture')})));}
createRoot(document.getElementById('root')).render(React.createElement(React.StrictMode,null,React.createElement(BrowserRouter,null,React.createElement(App))));
`;
async function pdfBytes(){const Pdf=backend('pdfkit'),doc=new Pdf(),chunks=[];doc.on('data',bytes=>chunks.push(bytes));const done=new Promise(resolve=>doc.on('end',resolve));doc.text('Synthetic source preview');doc.end();await done;return Buffer.concat(chunks);}
test('Source-document authenticated contract and editor lifecycle preserve private data boundaries',async t=>withBrowserFixture(harness,async h=>{
 const owned=[];const bytes=await pdfBytes();const first=await Template.create({name:'First template',brandName:'Synthetic brand',organizationId:'org-A',brandId:'brand-A',auditType:'standard',sections:[]});const second=await Template.create({name:'Second template',brandName:'Synthetic brand',auditType:'service',sections:[]});
 const editorName=()=>h.page.getByLabel('audit.checklist.builder.checklistName',{exact:true});
 async function open(id=String(first._id)){await h.open('admin','/builder/'+id);await h.page.locator('[data-source-state="ready"]').waitFor({state:'attached'});await editorName().waitFor();}
 try{
  let documentId;
  await t.test('actual multipart service create/list/download/delete sends Bearer and all metadata',async()=>{
   await h.open('admin','/contract');
   const result=await h.page.evaluate(async({templateId,bytes})=>{const service=window.sourceService;const file=new File([new Uint8Array(bytes)],'contract.pdf',{type:'application/pdf'});const doc=await service.uploadAuditSourceDocument(file,{templateId,organizationId:'org-A',brandId:'brand-A',auditType:'standard',uploadedBy:'forged'});const list=await service.getAuditSourceDocuments(templateId);const blob=await service.getAuditSourceDocumentFile(doc.id);return{doc,list,blobType:blob.type,blobSize:blob.size};},{templateId:String(first._id),bytes:[...bytes]});
   const stored=await Source.findById(result.doc.id);owned.push(stored.filePath);documentId=result.doc.id;
   assert.equal(stored.organizationId,'org-A');assert.equal(stored.brandId,'brand-A');assert.equal(stored.auditType,'standard');assert.equal(stored.uploadedBy,String(h.actors.admin._id));assert.ok(result.list.some(d=>d.id===documentId));assert.equal(result.blobType,'application/pdf');assert.equal(result.blobSize,bytes.length);
   await h.page.evaluate(id=>window.sourceService.deleteAuditSourceDocument(id),documentId);assert.equal(await Source.findById(documentId),null);
   assert.ok(h.wire.filter(r=>r.path.startsWith('/api/audit-source-documents')).every(r=>r.actor==='admin'));
  });
  await t.test('all editor upload→list→native PDF preview→download→delete works without raw static URL',async()=>{
   await open();await h.page.locator('input[type=file]').setInputFiles({name:'editor.pdf',mimeType:'application/pdf',buffer:bytes});
   await h.page.getByText('editor.pdf',{exact:true}).waitFor();const stored=await Source.findOne({originalName:'editor.pdf'});owned.push(stored.filePath);documentId=String(stored._id);
   assert.equal(stored.templateId,String(first._id));assert.equal(stored.auditType,'standard');
   const row=h.page.locator('label.audit-builder-check').filter({hasText:'editor.pdf'});assert.equal(await row.getByRole('checkbox').isChecked(),true);
   await row.getByRole('button',{name:'Aç / Endir'}).click();await h.page.getByRole('dialog').waitFor();
   const downloadPromise=h.page.waitForEvent('download');await h.page.getByRole('link',{name:'Endir: editor.pdf'}).click();const download=await downloadPromise;assert.equal(download.suggestedFilename(),'editor.pdf');assert.equal(await download.failure(),null);
   await h.page.getByRole('button',{name:'Bağla'}).click();assert.deepEqual(await h.page.evaluate(()=>window.created),await h.page.evaluate(()=>window.revoked));
   await row.getByRole('button',{name:'Sil',exact:true}).click();await h.page.waitForFunction(()=>!Array.from(document.querySelectorAll('span')).some(e=>e.textContent==='editor.pdf'));assert.equal(await Source.findById(documentId),null);
  });
  for(const status of [401,403,404,500])await t.test(`auxiliary HTTP ${status} has distinct state and does not become an empty successful list`,async()=>{
   await h.page.route('**/api/audit-source-documents?*',route=>route.fulfill({status,contentType:'application/json',body:JSON.stringify({message:'Synthetic auxiliary error'})}));
   await h.open('admin','/builder/'+first._id);const state={401:'unauthenticated',403:'forbidden',404:'not-found',500:'server-error'}[status];await h.page.locator('[data-source-state="'+state+'"]').waitFor();
   assert.equal(await editorName().inputValue(),'First template');assert.equal(await h.page.getByText('audit.checklist.builder.noSourceDocuments',{exact:true}).count(),0);
   await h.page.unroute('**/api/audit-source-documents?*');
  });
  for(const status of [401,403,404,500])await t.test(`primary HTTP ${status} is handled before rendering an editable template`,async()=>{
   await h.page.route('**/api/audit-templates/'+first._id,route=>route.fulfill({status,contentType:'application/json',body:JSON.stringify({message:'Synthetic primary error'})}));
   await h.open('admin','/builder/'+first._id);await h.page.locator('[data-audit-state="'+({401:'unauthenticated',403:'forbidden',404:'not-found',500:'server-error'}[status])+'"]').first().waitFor();assert.equal(await editorName().count(),0);
   await h.page.unroute('**/api/audit-templates/'+first._id);
  });
  await t.test('late previous primary and source responses never replace the next template',async()=>{
   let release,entered;const gate=new Promise(r=>release=r),started=new Promise(r=>entered=r);
   await h.page.route('**/api/audit-templates/'+first._id,async route=>{entered();await gate;await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({...first.toObject(),id:String(first._id)})});});
   await h.page.route('**/api/audit-source-documents?templateId='+first._id,async route=>{await gate;await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify([{id:'late',name:'Old private document'}])});});
   try{await h.open('admin','/builder/'+first._id);await started;await h.page.evaluate(id=>window.navigateTest('/builder/'+id),String(second._id));await h.page.waitForFunction(()=>document.querySelector('input[placeholder="audit.checklist.builder.checklistNamePlaceholder"]')?.value==='Second template');release();await h.page.waitForLoadState('networkidle');assert.equal(await editorName().inputValue(),'Second template');assert.equal(await h.page.getByText('Old private document',{exact:true}).count(),0);}finally{release();await h.page.unroute('**/api/audit-templates/'+first._id);await h.page.unroute('**/api/audit-source-documents?templateId='+first._id);}
  });
  await t.test('late upload response cannot add a selection or document to a new template',async()=>{
   let release,entered;const gate=new Promise(r=>release=r),started=new Promise(r=>entered=r);
   await open();await h.page.route('**/api/audit-source-documents',async route=>{entered();await gate;await route.fulfill({status:201,contentType:'application/json',body:JSON.stringify({id:'late-upload',name:'Old upload.pdf',originalName:'Old upload.pdf'})});});
   try{await h.page.locator('input[type=file]').setInputFiles({name:'Old upload.pdf',mimeType:'application/pdf',buffer:bytes});await started;await h.page.evaluate(id=>window.navigateTest('/builder/'+id),String(second._id));await h.page.waitForFunction(()=>document.querySelector('input[placeholder="audit.checklist.builder.checklistNamePlaceholder"]')?.value==='Second template');release();await h.page.waitForLoadState('networkidle');assert.equal(await h.page.getByText('Old upload.pdf',{exact:true}).count(),0);assert.equal(await editorName().inputValue(),'Second template');}finally{release();await h.page.unroute('**/api/audit-source-documents');}
  });
  await t.test('upload 500 ends loading, shows error, preserves draft and never throws from event handler',async()=>{
   await open();await editorName().fill('Unsaved draft');await h.page.route('**/api/audit-source-documents',route=>route.fulfill({status:500,contentType:'application/json',body:'{"message":"Synthetic upload error"}'}));
   await h.page.locator('input[type=file]').setInputFiles({name:'error.pdf',mimeType:'application/pdf',buffer:bytes});await h.page.locator('[data-source-mutation="server-error"]').waitFor();assert.equal(await editorName().inputValue(),'Unsaved draft');assert.equal(await h.page.locator('input[type=file]').isDisabled(),false);await h.page.unroute('**/api/audit-source-documents');
  });
  await t.test('server read revocation on focus hides private docs and revokes preview URLs',async()=>{
   await open();await h.page.locator('input[type=file]').setInputFiles({name:'revoke.pdf',mimeType:'application/pdf',buffer:bytes});await h.page.getByText('revoke.pdf',{exact:true}).waitFor();const stored=await Source.findOne({originalName:'revoke.pdf'});owned.push(stored.filePath);
   await h.page.getByRole('button',{name:'Aç / Endir'}).click();await h.page.getByRole('dialog').waitFor();
   await h.page.route('**/api/audit-source-documents?*',route=>route.fulfill({status:403,contentType:'application/json',body:'{"message":"Synthetic revoked read"}'}));await h.page.evaluate(()=>window.dispatchEvent(new Event('focus')));await h.page.locator('[data-source-state="forbidden"]').waitFor();assert.equal(await h.page.getByRole('dialog').count(),0);assert.equal(await h.page.getByText('revoke.pdf',{exact:true}).count(),0);assert.deepEqual(await h.page.evaluate(()=>window.created),await h.page.evaluate(()=>window.revoked));await h.page.unroute('**/api/audit-source-documents?*');
  });
  for(const status of [401,403,404,500])await t.test(`delete HTTP ${status} keeps the record and exposes a handled mutation state`,async()=>{
   await open();const doc=await Source.findOne({originalName:'revoke.pdf'});const row=h.page.locator('label.audit-builder-check').filter({hasText:'revoke.pdf'});
   await h.page.route('**/api/audit-source-documents/'+doc._id,route=>route.fulfill({status,contentType:'application/json',body:'{"message":"Synthetic delete error"}'}));
   try{await row.getByRole('button',{name:'Sil',exact:true}).click();await h.page.locator('[data-source-mutation="'+({401:'unauthenticated',403:'forbidden',404:'not-found',500:'server-error'}[status])+'"]').waitFor();assert.ok(await Source.findById(doc._id));assert.equal(await h.page.getByText('revoke.pdf',{exact:true}).count(),1);assert.equal(await row.getByRole('button',{name:'Sil',exact:true}).isDisabled(),false);}finally{await h.page.unroute('**/api/audit-source-documents/'+doc._id);}
  });
  await t.test('template save failure is handled and preserves the unsaved draft',async()=>{
   await open();await editorName().fill('Save draft');await h.page.route('**/api/audit-templates/'+first._id,route=>route.request().method()==='PUT'?route.fulfill({status:500,contentType:'application/json',body:'{"message":"Synthetic save error"}'}):route.fallback());
   try{await h.page.getByRole('button',{name:'audit.checklist.builder.save',exact:true}).click();await h.page.locator('[data-audit-state="server-error"]').waitFor();assert.equal(await editorName().inputValue(),'Save draft');}finally{await h.page.unroute('**/api/audit-templates/'+first._id);}
  });
  await t.test('create-only all template permission can save a new form without a read grant',async()=>{
   await h.models.Role.updateOne({key:'test_own'},{$push:{permissions:{resource:'audit.template',action:'create',scope:'all'}}});await h.open('own','/builder');await editorName().fill('Create-only template');await h.page.getByLabel('audit.checklist.builder.brand',{exact:true}).fill('Synthetic brand');await h.page.getByRole('button',{name:'audit.checklist.builder.save',exact:true}).click();await h.page.getByText('Saved destination',{exact:true}).waitFor();const saved=await Template.findOne({name:'Create-only template'});assert.equal(saved.createdBy,String(h.actors.own._id));
  });
  await t.test('user permission loss clears editor and object URLs under StrictMode',async()=>{
   await open();await h.page.getByRole('button',{name:'Aç / Endir'}).click();await h.page.getByRole('dialog').waitFor();const profile=await h.profile('admin');profile.permissions=[];
   // Admin has an implicit all grant; switch the UI identity to a non-admin role too.
   profile.role='test_none';await h.page.evaluate(user=>window.setTestUser(user),profile);await h.page.locator('[data-audit-state="forbidden"]').first().waitFor();assert.equal(await h.page.getByRole('dialog').count(),0);assert.equal(await editorName().count(),0);assert.deepEqual(await h.page.evaluate(()=>window.created),await h.page.evaluate(()=>window.revoked));
  });
  await t.test('non-all service requests still receive server 403 despite a caller-supplied scope claim',async()=>{
   await h.models.Role.updateOne({key:'test_assigned'},{$push:{permissions:{resource:'audit.source_document',action:'*',scope:'assigned'}}});await h.open('assigned','/contract');const statuses=await h.page.evaluate(async()=>{const results=[];for(const action of[()=>window.sourceService.getAuditSourceDocuments(),()=>window.sourceService.getAuditSourceDocumentFile('foreign'),()=>window.sourceService.deleteAuditSourceDocument('foreign'),()=>window.sourceService.uploadAuditSourceDocument(new File(['%PDF-fake'],'x.pdf',{type:'application/pdf'}),{uploadedBy:'admin'})]){try{await action();results.push(200);}catch(error){results.push(error.response?.status);}}return results;});assert.deepEqual(statuses,[403,403,403,403]);
  });
  assert.deepEqual(h.pageErrors,[]);
 }finally{for(const file of owned)await fs.unlink(file).catch(()=>{});}
}));
