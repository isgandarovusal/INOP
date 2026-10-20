const test = require('node:test'), assert = require('node:assert/strict');
const { withBrowserFixture } = require('./helpers/browser.cjs');
const Job = require('../../Backend/models/job.model'), Candidate = require('../../Backend/models/candidate.model'), Application = require('../../Backend/models/application.model');
const harness = `import React from 'react';import {createRoot} from 'react-dom/client';import {BrowserRouter,useNavigate} from 'react-router-dom';import {AuthContext} from '/src/Context/AuthContext.ts';import i18n from '/src/i18n/index.ts';import '/src/Styles/recruitment.css';import Apps from '/src/Pages/Recruitment/Applications/ApplicationsList.tsx';import api from '/src/api/axios.ts';api.defaults.baseURL='/api';window.changeLanguage=l=>i18n.changeLanguage(l);function App(){window.navigateTest=useNavigate();const [user,setUser]=React.useState(window.testUser);window.setTestUser=setUser;return React.createElement(AuthContext.Provider,{value:{user,isLoading:false}},React.createElement(Apps));}createRoot(document.getElementById('root')).render(React.createElement(React.StrictMode,null,React.createElement(BrowserRouter,null,React.createElement(App))));`;
test('Application board pages and manual drag are context-bound and persisted', async t => withBrowserFixture(harness, async h => {
  const job = await Job.create({ title: 'Board UI vacancy', department: 'HR', description: 'Synthetic', createdBy: h.actors.admin._id }), records = [];
  for (const [status, n] of [['Applied',35], ['Screening',20], ['Hired',2]]) for(let i=0;i<n;i++) {
    const candidate = await Candidate.create({ name: `${status} board ${String(i).padStart(2,'0')}`, role: 'Cashier', createdBy: h.actors.admin._id });
    const app = await Application.create({ jobId: job._id, candidateId: candidate._id, status, createdBy: h.actors.admin._id }); records.push(app);
  }
  const lane = stage => h.page.locator(`[data-board-lane="${stage}"]`), card = id => h.page.locator(`[data-application-card="${id}"]`);
  const open = () => h.open('admin', '/app/recruitment/applications?view=board');
  const selectJob = async () => { if(!await h.page.locator('[data-hr-filters]').evaluate(el=>el.open))await h.page.locator('[data-hr-filters] > summary').click();await h.page.getByLabel('Vakansiya filtri', { exact: true }).selectOption(String(job._id)); await lane('applied').locator('[data-application-card]').first().waitFor(); };
  const moveDown = async (row, timeout = 10000) => {
    const handle = card(row._id).locator('[data-rfd-drag-handle-draggable-id]'); await handle.focus(); await handle.press('Space'); await handle.press('ArrowDown'); await h.page.waitForTimeout(100);
    const saved = h.page.waitForResponse(r => r.url().endsWith(`/applications/${row._id}/status`) && r.request().method()==='PATCH', { timeout }); await handle.press('Space'); return saved;
  };
  await t.test('StrictMode loads one bounded board and no redundant table page; lane counts are complete', async () => {
    const start = h.wire.length; await open(); await lane('applied').waitFor(); await lane('hired').locator('[data-application-card]').first().waitFor();
    assert.equal(await h.page.locator('[data-application-card]').count(), 22);
    assert.equal(await lane('applied').locator('[data-application-card]').count(), 10); assert.ok((await lane('applied').getByRole('heading').textContent()).includes('35'));
    assert.equal(h.wire.slice(start).filter(r=>r.path==='/api/hr/v2/application-board').length, 1);
    assert.equal(h.wire.slice(start).filter(r=>r.path==='/api/hr/v2/applications').length, 0);
  });
  if (process.env.INOP_BASELINE_ONLY) return;
  await t.test('a lane page replaces ten cards while other lanes remain visible; previous returns the same ids', async () => {
    const before = await lane('applied').locator('[data-application-card]').evaluateAll(nodes=>nodes.map(n=>n.dataset.applicationCard));
    const other = await lane('screening').locator('[data-application-card]').evaluateAll(nodes=>nodes.map(n=>n.dataset.applicationCard));
    await lane('applied').getByRole('button',{name:'Növbəti kartlar',exact:true}).click(); await lane('applied').getByText('Səhifə 2',{exact:true}).waitFor();
    const next = await lane('applied').locator('[data-application-card]').evaluateAll(nodes=>nodes.map(n=>n.dataset.applicationCard)); assert.equal(next.length,10); assert.equal(next.filter(id=>before.includes(id)).length,0);
    assert.deepEqual(await lane('screening').locator('[data-application-card]').evaluateAll(nodes=>nodes.map(n=>n.dataset.applicationCard)),other);
    await lane('applied').getByRole('button',{name:'Əvvəlki kartlar',exact:true}).click(); await lane('applied').getByText('Səhifə 1',{exact:true}).waitFor();
    assert.deepEqual(await lane('applied').locator('[data-application-card]').evaluateAll(nodes=>nodes.map(n=>n.dataset.applicationCard)),before);
  });
  await t.test('same-vacancy keyboard order persists and survives refresh', async () => {
    await selectJob(); const a=records[0],b=records[1]; const response=await moveDown(a); assert.equal(response.status(),200);
    const body=response.request().postDataJSON(); assert.equal(body.status,'Applied'); assert.equal(body.expectedRevision,0); assert.equal(body.placement.before.id,String(b._id)); assert.equal(body.placement.after.id,String(records[2]._id));
    await h.page.waitForFunction(id=>document.querySelector('[data-board-lane=applied] [data-application-card]')?.getAttribute('data-application-card')===id,String(b._id));
    const stored=await Application.findById(a._id); assert.equal(stored.events.at(-1).type,'reorder'); assert.equal(stored.status,'Applied'); assert.equal(stored.__v,1);
    await open(); await selectJob(); assert.equal(await lane('applied').locator('[data-application-card]').first().getAttribute('data-application-card'),String(b._id));
  });
  await t.test('page-two first placement uses the authorized preceding-page neighbor', async () => {
    await lane('applied').getByRole('button',{name:'Növbəti kartlar',exact:true}).click(); await lane('applied').getByText('Səhifə 2',{exact:true}).waitFor();
    const ids=await lane('applied').locator('[data-application-card]').evaluateAll(nodes=>nodes.map(n=>n.dataset.applicationCard)); const handle=card(ids[1]).locator('[data-rfd-drag-handle-draggable-id]');
    await handle.focus(); await handle.press('Space'); await handle.press('ArrowUp'); await h.page.waitForTimeout(100);
    const pending=h.page.waitForResponse(r=>r.url().endsWith(`/applications/${ids[1]}/status`)&&r.request().method()==='PATCH'); await handle.press('Space'); const r=await pending; assert.equal(r.status(),200);
    assert.equal(r.request().postDataJSON().placement.before.id,String(records[9]._id)); assert.equal(r.request().postDataJSON().placement.after.id,ids[0]);
    await lane('applied').getByText('Səhifə 1',{exact:true}).waitFor();
  });
  await t.test('409 rollback/refetch retains a visible conflict and correct server order', async () => {
    const row=records[3]; await Application.updateOne({_id:row._id},{$inc:{__v:1}}); const r=await moveDown(row); assert.equal(r.status(),409);
    await h.page.getByRole('alert').filter({hasText:'Müraciət başqa əməliyyatda dəyişib'}).waitFor(); assert.equal((await Application.findById(row._id)).boardOrder,row.boardOrder);
  });
  await t.test('a secondary page 500 retains all primary lanes and supplies retry', async () => {
    await open();await selectJob(); // Begin after the previous conflict/refetch has settled.
    await h.page.route('**/api/hr/v2/application-board?*', async r => {if(new URL(r.request().url()).searchParams.get('stage'))return r.fulfill({status:500,contentType:'application/json',body:'{"message":"Synthetic lane failure"}'});return r.fallback();});
    await lane('applied').getByRole('button',{name:'Növbəti kartlar',exact:true}).click(); await lane('applied').getByRole('alert').waitFor();
    assert.equal(await lane('applied').locator('[data-application-card]').count(),10); assert.equal(await lane('screening').locator('[data-application-card]').count(),10);
    await h.page.unroute('**/api/hr/v2/application-board?*'); await lane('applied').getByRole('button',{name:'Yenidən cəhd et',exact:true}).click(); await lane('applied').getByText('Səhifə 1',{exact:true}).waitFor();
  });
  await t.test('language emits zero requests and filtered boards clearly disable manual ordering', async () => {
    await h.page.waitForTimeout(100); const count=h.wire.length; await h.page.evaluate(()=>window.changeLanguage('en')); await lane('applied').getByRole('button',{name:'Next cards',exact:true}).waitFor(); await h.page.waitForTimeout(100); assert.equal(h.wire.length,count);
    await h.page.getByRole('searchbox').fill('board 03'); await h.page.waitForResponse(r=>r.url().includes('/application-board?')&&new URL(r.url()).searchParams.get('q')==='board 03');
    await h.page.getByRole('note').filter({hasText:'Choose one vacancy and clear other filters'}).waitFor(); await h.page.evaluate(()=>window.changeLanguage('az'));
  });
  await t.test('changed observed page boundary supplies restart rather than skipping cards', async () => {
    await open(); await selectJob(); const ids=await lane('applied').locator('[data-application-card]').evaluateAll(nodes=>nodes.map(n=>n.dataset.applicationCard));
    await Application.updateOne({_id:ids.at(-1)},{$inc:{__v:1}}); await lane('applied').getByRole('button',{name:'Növbəti kartlar',exact:true}).click();
    await lane('applied').getByRole('alert').waitFor(); await lane('applied').getByRole('button',{name:'Yenidən cəhd et',exact:true}).click(); await lane('applied').getByText('Səhifə 1',{exact:true}).waitFor();
  });
  for(const [code,state]of[[401,'unauthenticated'],[403,'forbidden'],[404,'not-found']])await t.test(`secondary ${code} clears all private cards and loaded filter choices`,async()=>{
    await open();await selectJob();await h.page.route('**/api/hr/v2/application-board?*',async r=>{if(new URL(r.request().url()).searchParams.get('stage'))return r.fulfill({status:code,contentType:'application/json',body:'{"message":"Synthetic authorization failure"}'});return r.fallback();});
    await lane('applied').getByRole('button',{name:'Növbəti kartlar',exact:true}).click();await h.page.locator(`[data-hr-state=${state}]`).waitFor();assert.equal(await h.page.locator('[data-application-card]').count(),0);assert.equal(await h.page.getByText('Applied board 00',{exact:true}).count(),0);await h.page.unroute('**/api/hr/v2/application-board?*');
  });
  await t.test('pending mutation cannot restore cards or feedback after permission revocation', async () => {
    await open(); await selectJob(); let release,entered; const ready=new Promise(r=>entered=r),gate=new Promise(r=>release=r); const row=records[4];
    await h.page.route(`**/api/applications/${row._id}/status`,async r=>{entered();await gate;await r.fulfill({status:500,contentType:'application/json',body:'{"message":"Synthetic stale move"}'}).catch(()=>{});});
    const pending=moveDown(row,1000).catch(()=>null); await ready; const profile=await h.profile('admin'); profile.permissions=[]; await h.page.evaluate(p=>window.setTestUser(p),profile); await h.page.locator('[data-hr-state=forbidden]').waitFor(); const count=h.wire.length; release(); await pending; await h.page.waitForTimeout(100);
    assert.equal(await h.page.locator('[data-application-card]').count(),0); assert.equal(h.wire.length,count); await h.page.unroute(`**/api/applications/${row._id}/status`);
  });
  assert.deepEqual(h.pageErrors,[]);
}));
