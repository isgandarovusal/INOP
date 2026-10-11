const test=require('node:test'),assert=require('node:assert/strict');
const {withBrowserFixture}=require('./helpers/browser.cjs');
const Candidate=require('../../Backend/models/candidate.model'),Job=require('../../Backend/models/job.model'),Application=require('../../Backend/models/application.model');
const harness=`import React from 'react';import {createRoot} from 'react-dom/client';import {BrowserRouter,Routes,Route,useNavigate} from 'react-router-dom';import {AuthContext} from '/src/Context/AuthContext.ts';import '/src/i18n/index.ts';import '/src/App.css';import Candidates from '/src/Pages/Recruitment/Candidates/CandidatesList.tsx';import Detail from '/src/Pages/Recruitment/Candidates/CandidateDetail.tsx';import Form from '/src/Pages/Recruitment/Candidates/CandidateForm.tsx';import api from '/src/api/axios.ts';api.defaults.baseURL='/api';function App(){window.navigateTest=useNavigate();return React.createElement(AuthContext.Provider,{value:{user:window.testUser,isLoading:false}},React.createElement(Routes,null,React.createElement(Route,{path:'/app/recruitment/candidates',element:React.createElement(Candidates)}),React.createElement(Route,{path:'/app/recruitment/candidates/:id/edit',element:React.createElement(Form)}),React.createElement(Route,{path:'/app/recruitment/candidates/:id',element:React.createElement(Detail)})));}createRoot(document.getElementById('root')).render(React.createElement(React.StrictMode,null,React.createElement(BrowserRouter,null,React.createElement(App))));`;
test('Actual archive UI retains Applications, exposes scoped restore and contains modal focus',async t=>withBrowserFixture(harness,async h=>{
 const c=await Candidate.create({name:'Synthetic archived applicant',role:'Cashier'}),j=await Job.create({title:'Archive vacancy',description:'Synthetic',department:'Operations'});
 const a=await Application.create({candidateId:c._id,jobId:j._id});
 await h.open('admin','/app/recruitment/candidates/'+c._id);await h.page.getByRole('button',{name:'Arxivlə',exact:true}).waitFor();
 await t.test('Archive confirmation traps Tab/Escape and restores focus without changing data',async()=>{
  const button=h.page.getByRole('button',{name:'Arxivlə',exact:true});await button.click();const dialog=h.page.getByRole('dialog');await dialog.waitFor();
  for(let n=0;n<4;n++){await h.page.keyboard.press('Tab');assert.ok(await dialog.evaluate(el=>el.contains(document.activeElement)));}
  await h.page.keyboard.press('Escape');assert.equal(await dialog.count(),0);assert.equal(await button.evaluate(el=>el===document.activeElement),true);assert.equal((await Candidate.findById(c._id)).archivedAt,null);
 });
 await t.test('Archive persists on refresh; active list omits and archive list restores without dropping application',async()=>{
  await h.page.getByRole('button',{name:'Arxivlə',exact:true}).click();await h.page.getByRole('dialog').getByRole('button',{name:'Arxivlə',exact:true}).click();await h.page.waitForURL('**/app/recruitment/candidates');
  assert.ok((await Candidate.findById(c._id)).archivedAt);assert.equal(await Application.countDocuments({_id:a._id}),1);
  await h.page.getByText(require('../src/i18n/locales/az.json').recruitment.candidates.empty,{exact:true}).waitFor();
  assert.equal(await h.page.getByText(c.name,{exact:true}).count(),0);
  await h.page.getByRole('combobox',{name:'Namizəd siyahısı'}).selectOption('true');await h.page.getByText(c.name,{exact:true}).waitFor();
  await h.page.getByText(c.name,{exact:true}).click();await h.page.getByRole('button',{name:'Bərpa et',exact:true}).waitFor();
  assert.equal(await h.page.getByRole('button',{name:'Redaktə',exact:true}).count(),0);
  await h.page.reload();await h.page.getByRole('button',{name:'Bərpa et',exact:true}).waitFor();
  await h.page.getByRole('button',{name:'Arxiv tarixçəsi',exact:true}).click();await h.page.locator('[data-candidate-archive-history] ol li').waitFor();
  await h.page.getByRole('button',{name:'Bərpa et',exact:true}).click();await h.page.getByRole('button',{name:'Arxivlə',exact:true}).waitFor();assert.equal((await Candidate.findById(c._id)).archivedAt,null);assert.equal(await Application.countDocuments({_id:a._id}),1);
 });
 await t.test('Archived direct edit is a readable explanation, without editable form',async()=>{
  const revision=(await Candidate.findById(c._id)).__v;assert.equal((await h.request('admin','POST',`/candidates/${c._id}/archive`,{expectedRevision:revision})).status,200);
  await h.open('admin','/app/recruitment/candidates/'+c._id+'/edit');await h.page.getByText('Bu namizəd arxivdədir.',{exact:false}).waitFor();assert.equal(await h.page.locator('form').count(),0);
 });
 assert.deepEqual(h.pageErrors,[]);
}));
