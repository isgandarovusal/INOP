const test=require('node:test'),assert=require('node:assert/strict');const{withBrowserFixture}=require('./helpers/browser.cjs');
const shell=`import React from'react';import{createRoot}from'react-dom/client';import App from'/src/App.tsx';import api from'/src/api/axios.ts';api.defaults.baseURL='/api';window.navigateTest=()=>{};createRoot(document.getElementById('root')).render(React.createElement(App));`;
test('Actual HR workspace landing, module denial, profile menu and permission narrowing',async()=>withBrowserFixture(shell,async h=>{
 await h.models.User.updateOne({_id:h.actors.own._id},{$set:{role:'recruitment_manager',departmentId:'dep_hr'}});
 await h.open('own','/app');await h.page.waitForURL('**/app/recruitment/analytics');await h.page.waitForLoadState('networkidle');
 assert.equal(await h.page.locator('.admin-sidebar a[href="/app/dashboard"]').count(),0);assert.equal(await h.page.locator('.admin-sidebar a[href^="/app/audit"],.admin-sidebar a[href="/app/users"]').count(),0);
 await h.page.locator('.admin-sidebar__profile-toggle').click();assert.equal(await h.page.getByRole('menuitem').count(),2);await h.page.keyboard.press('Escape');assert.equal(await h.page.getByRole('menuitem').count(),0);
 for(const url of ['/app/dashboard','/app/users','/app/audit']){await h.open('own',url);await h.page.waitForURL('**/unauthorized');assert.equal(await h.page.locator('.hr-dashboard-summary').count(),0);}
 await h.open('admin','/app');await h.page.waitForURL('**/app/dashboard');
 await h.open('own','/app/recruitment/candidates');await h.page.locator('.hr-candidates-page').waitFor();await h.models.Role.updateOne({key:'recruitment_manager'},{$set:{permissions:[]}});await h.page.evaluate(()=>window.dispatchEvent(new Event('focus')));await h.page.locator('[data-hr-state=forbidden]').waitFor();assert.equal(await h.page.locator('.admin-table-container').count(),0);
 assert.deepEqual(h.pageErrors,[]);
}));
