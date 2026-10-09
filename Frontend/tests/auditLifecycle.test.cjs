const test = require('node:test');
const assert = require('node:assert/strict');
const { withBrowserFixture } = require('./helpers/browser.cjs');
const harness = `
import React from 'react'; import {createRoot} from 'react-dom/client';
import {BrowserRouter, Routes, Route, useNavigate} from 'react-router-dom';
import {AuthContext} from '/src/Context/AuthContext.ts';
import Standard from '/src/Pages/Audit/StandardAudit/StandardAuditDetail.tsx';
import Safety from '/src/Pages/Audit/OccupationalSafetyAudit/SafetyAuditDetail.tsx';
import Generic from '/src/Pages/Audit/Audits/AuditDetail.tsx';
import api from '/src/api/axios.ts'; api.defaults.baseURL='/api';
function App(){ const [user,setUser]=React.useState(window.testUser); window.setTestUser=setUser;
 window.navigateTest=useNavigate(); return React.createElement(AuthContext.Provider,{value:{user,isLoading:false}},
 React.createElement(Routes,null,
 React.createElement(Route,{path:'/standard/:id',element:React.createElement(Standard)}),
 React.createElement(Route,{path:'/safety/:id',element:React.createElement(Safety)}),
 React.createElement(Route,{path:'/generic/:id',element:React.createElement(Generic)}))); }
createRoot(document.getElementById('root')).render(React.createElement(React.StrictMode,null,React.createElement(BrowserRouter,null,React.createElement(App))));
`;

test('Audit lifecycle browser contracts with isolated real authorization', async t => withBrowserFixture(harness, async h => {
  const first = await h.audit('own', 'standard', { foundCritical: 0, foundMajor: 0, foundMinor: 0, foundTotal: 0, compliancePercentage: 100, passed: true });
  const second = await h.audit('own', 'occupational-safety', { restaurantId: 'second-audit', totalScore: 0, maxScore: 2, scorePercentage: 0 });
  await h.models.Finding.create({ auditId: first._id, title: 'authorized-finding' });
  await h.assign('own', first);
  await t.test('Standard/Safety lifecycle sends authenticated requests without page errors', async () => {
    for (const [type, audit] of [['standard', first], ['safety', second]]) {
      await h.open('own', `/${type}/${audit.id}`);
      await h.page.getByText(audit.restaurantId, { exact: true }).first().waitFor();
      await h.page.waitForLoadState('networkidle');
      assert.deepEqual(h.pageErrors, []);
    }
  });
  await t.test('Auxiliary failure never hides a successfully loaded generic Audit', async () => {
    await h.page.route('**/api/restaurants/**', route => route.fulfill({ status: 500, contentType: 'application/json', body: JSON.stringify({ message: 'Injected local auxiliary failure' }) }));
    await h.open('own', `/generic/${first.id}`);
    await h.page.getByText('authorized-finding', { exact: true }).waitFor();
    await h.page.waitForLoadState('networkidle');
    assert.equal(await h.page.getByText('It may have been deleted.', { exact: true }).count(), 0);
    await h.page.unroute('**/api/restaurants/**');
  });
  for (const status of [401,403,404,500]) await t.test(`Primary HTTP ${status} has its own visible state`, async () => {
    await h.page.route('**/api/audits/status-test', route => route.fulfill({ status, contentType: 'application/json', body: JSON.stringify({ message: 'Injected local primary failure' }) }));
    await h.open('own', '/standard/status-test');
    const state = {401:'unauthenticated',403:'forbidden',404:'not-found',500:'server-error'}[status];
    await h.page.locator(`[data-audit-state="${state}"]`).waitFor();
    await h.page.unroute('**/api/audits/status-test');
  });
  await t.test('Late previous-id primary response cannot replace a newer audit', async () => {
    let release, started;
    const entered = new Promise(resolve => started = resolve), gate = new Promise(resolve => release = resolve);
    await h.page.route(`**/api/audits/${first.id}`, async route => { started(); await gate; await route.fulfill({ status:200,contentType:'application/json',body:JSON.stringify(first.toObject()) }); });
    try {
      await h.open('own', `/standard/${first.id}`); await entered;
      await h.page.evaluate(id => window.navigateTest('/safety/' + id), second.id);
      await h.page.getByText('second-audit',{exact:true}).first().waitFor(); release();
      await h.page.waitForLoadState('networkidle'); assert.equal(await h.page.getByText('second-audit',{exact:true}).count()>0,true);
    } finally { release(); await h.page.unroute(`**/api/audits/${first.id}`); }
  });
  await t.test('Permission loss clears visible audit immediately and denies further display', async () => {
    await h.open('own', `/standard/${first.id}`); await h.page.getByText(first.restaurantId,{exact:true}).first().waitFor();
    const profile = await h.profile('own'); profile.permissions=[];
    await h.page.evaluate(user => window.setTestUser(user),profile);
    await h.page.locator('[data-audit-state="forbidden"]').waitFor();
    assert.equal(await h.page.getByText(first.restaurantId,{exact:true}).count(),0);
  });
  await t.test('Approval action remains usable under StrictMode and catches its failures', async () => {
    const approval = await h.models.Approval.create({ auditId: first._id, status: 'pending' });
    await h.open('own', `/standard/${first.id}`);
    await h.page.getByRole('button',{name:'Approve',exact:true}).click();
    await h.page.getByText('approved',{exact:true}).waitFor();
    assert.equal((await h.models.Approval.findById(approval._id)).status,'approved');
    assert.deepEqual(h.pageErrors,[]);
  });
  await t.test('Assignment revocation is rechecked on window focus', async () => {
    const grant=await h.assign('assigned',first);
    await h.open('assigned', `/standard/${first.id}`); await h.page.getByText(first.restaurantId,{exact:true}).first().waitFor();
    await h.models.Assignment.deleteOne({_id:grant._id});
    await h.page.evaluate(()=>window.dispatchEvent(new Event('focus')));
    await h.page.locator('[data-audit-state="not-found"]').waitFor();
    assert.equal(await h.page.getByText(first.restaurantId,{exact:true}).count(),0);
  });
}));
