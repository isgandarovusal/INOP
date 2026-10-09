const test = require('node:test'), assert = require('node:assert/strict');
const fs = require('node:fs/promises'), path = require('node:path'), crypto = require('node:crypto');
const {withBrowserFixture} = require('./helpers/browser.cjs');
const harness = `
import React from 'react';import{createRoot}from'react-dom/client';import{BrowserRouter,useNavigate}from'react-router-dom';
import{usePrivateFile}from'/src/Hooks/usePrivateFile.ts';import Preview from'/src/Components/PrivateFilePreview.tsx';
import{getCandidateCv}from'/src/Services/candidatesService.ts';import api from'/src/api/axios.ts';api.defaults.baseURL='/api';
const create=URL.createObjectURL.bind(URL),revoke=URL.revokeObjectURL.bind(URL);window.created=[];window.revoked=[];
URL.createObjectURL=blob=>{const url=create(blob);window.created.push(url);return url;};URL.revokeObjectURL=url=>{window.revoked.push(url);revoke(url);};
function App(){const[key,setKey]=React.useState('first');window.changeKey=setKey;window.navigateTest=useNavigate();const file=usePrivateFile(key);window.file=file;window.cvService=getCandidateCv;return React.createElement('div',null,
 React.createElement('button',{onClick:()=>file.open(signal=>getCandidateCv(window.candidateId,signal))},'Open CV'),
 file.loading&&React.createElement('span',{'data-file-loading':true},'loading'),file.error&&React.createElement('span',{'data-file-error':file.error},file.error),
 file.url&&React.createElement(Preview,{url:file.url,type:file.type,name:'synthetic.pdf',onClose:file.close}));}
createRoot(document.getElementById('root')).render(React.createElement(React.StrictMode,null,React.createElement(BrowserRouter,null,React.createElement(App))));
`;
test('Authenticated private blob reads cancel stale data and revoke object URLs', async t => withBrowserFixture(harness, async h => {
 const name='test-'+crypto.randomUUID()+'.pdf',filename=path.resolve(__dirname,'../../Backend/uploads',name);
 const PDF = require('node:module').createRequire(path.resolve(__dirname,'../../Backend/package.json'))('pdfkit');
 const pdf = new PDF(), chunks=[]; pdf.on('data',bytes=>chunks.push(bytes)); const done=new Promise(resolve=>pdf.on('end',resolve));
 pdf.text('Synthetic private preview'); pdf.end(); await done;
 await fs.writeFile(filename,Buffer.concat(chunks),{flag:'wx'});
 try{
  const Candidate=require('../../Backend/models/candidate.model');const cv=await Candidate.create({name:'Synthetic',role:'Synthetic',cvUrl:'/uploads/'+name,createdBy:h.actors.foreign._id});
  await h.open('admin','/private-file-test');await h.page.evaluate(id=>window.candidateId=id,String(cv._id));
  await t.test('actual CV service sends Bearer, previews PDF and revokes on close',async()=>{
   await h.page.getByRole('button',{name:'Open CV',exact:true}).click();await h.page.getByRole('dialog').waitFor();
   assert.ok(h.wire.some(r=>r.path.endsWith('/cv')&&r.actor==='admin'));
   await h.page.waitForFunction(()=>document.querySelector('iframe')?.getAttribute('src')?.startsWith('blob:'));
   for(let i=0;i<30&&!h.page.frames().some(frame=>frame.url().startsWith('chrome-extension:'));i++)await h.page.waitForTimeout(100);
   assert.ok(h.page.frames().some(frame=>frame.url().startsWith('chrome-extension:')), 'Native Chromium PDF viewer loaded a real authorized PDF');
   await h.page.getByRole('button',{name:'Bağla'}).click();assert.equal(await h.page.getByRole('dialog').count(),0);
   assert.deepEqual(await h.page.evaluate(()=>window.revoked),await h.page.evaluate(()=>window.created));
  });
  await t.test('context/permission rotation clears visible blob and revokes its URL',async()=>{
   await h.page.getByRole('button',{name:'Open CV',exact:true}).click();await h.page.getByRole('dialog').waitFor();
   await h.page.evaluate(()=>window.changeKey('new-user-permissions'));await h.page.waitForFunction(()=>!document.querySelector('[role=dialog]'));
   assert.deepEqual(await h.page.evaluate(()=>window.revoked),await h.page.evaluate(()=>window.created));
  });
  await t.test('late blob from old record cannot allocate a URL or replace new context',async()=>{
   const count=await h.page.evaluate(()=>window.created.length);
   await h.page.evaluate(()=>{window.file.open(()=>new Promise(resolve=>window.release=()=>resolve(new Blob(['old'],{type:'application/pdf'}))));});
   await h.page.locator('[data-file-loading]').waitFor();await h.page.evaluate(()=>window.changeKey('new-record'));
   await h.page.evaluate(()=>window.release());await h.page.waitForFunction(()=>!document.querySelector('[data-file-loading]'));
   assert.equal(await h.page.evaluate(()=>window.created.length),count);assert.equal(await h.page.getByRole('dialog').count(),0);
  });
  for(const status of [401,403,404,500]) await t.test(`HTTP ${status} produces a distinct handled file error`,async()=>{
   await h.page.route('**/api/candidates/*/cv',route=>route.fulfill({status,contentType:'application/json',body:JSON.stringify({message:'Synthetic error'})}));
   // The 401 interceptor clears the previous token; restore only this fixture's token.
   await h.page.evaluate(token=>localStorage.setItem('inop_auth_token',token),h.tokens.admin);
   await h.page.getByRole('button',{name:'Open CV',exact:true}).click();await h.page.locator('[data-file-error="'+({401:'unauthenticated',403:'forbidden',404:'not-found',500:'server-error'}[status])+'"]').waitFor();
   assert.equal(await h.page.getByRole('dialog').count(),0);await h.page.unroute('**/api/candidates/*/cv');
  });
  assert.deepEqual(h.pageErrors,[]);
 }finally{await fs.unlink(filename);}
}));
