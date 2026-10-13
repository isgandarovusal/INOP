const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs/promises');
const {withBrowserFixture}=require('./helpers/browser.cjs'),az=require('../src/i18n/locales/az.json');
const bcrypt=require('../../Backend/node_modules/bcryptjs');
const harness=`import React from'react';import{createRoot}from'react-dom/client';import{BrowserRouter,Routes,Route,useNavigate}from'react-router-dom';import{AuthProvider}from'/src/Context/AuthContextProvider.tsx';import Login from'/src/Pages/Auth/Login/Login.tsx';import'/src/i18n/index.ts';import'/src/App.css';import api from'/src/api/axios.ts';api.defaults.baseURL='/api';localStorage.removeItem('inop_auth_token');function App(){window.navigateTest=useNavigate();return React.createElement(AuthProvider,null,React.createElement(Routes,null,React.createElement(Route,{path:'/login',element:React.createElement(Login)}),React.createElement(Route,{path:'/app/dashboard',element:React.createElement('p',{'data-login-destination':true},'Authenticated destination')})));}createRoot(document.getElementById('root')).render(React.createElement(BrowserRouter,null,React.createElement(App)));`;
test('Enterprise login validates locally and preserves real auth, languages, password visibility and redirect',async()=>withBrowserFixture(harness,async h=>{
 const password='Synthetic-login-test-only!';await h.models.User.create({name:'Auth validation fixture',email:'auth-enterprise@example.invalid',role:'admin',password:await bcrypt.hash(password,4)});
 for(const width of [1440,768,390]){
  await h.page.setViewportSize({width,height:1000});await h.open('admin','/login');await h.page.locator('#email').waitFor();await h.page.locator('.auth-submit').waitFor();
  for(const locale of ['ENG','RUS','AZE']){const b=h.page.getByRole('button',{name:locale,exact:true});await b.click();assert.equal(await b.getAttribute('aria-pressed'),'true');}
  assert.equal(await h.page.locator('.auth-brand-features, .auth-brand-panel__footer, .auth-entry-panel__footer, .auth-brand-panel__eyebrow').count(),0);
  assert.equal(await h.page.getByRole('link').count(),0);
  assert.ok(await h.page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));await fs.mkdir('/workspace/work/premium/screens',{recursive:true});await h.page.screenshot({path:`/workspace/work/premium/screens/login-${width}.png`,fullPage:true});
  await h.page.locator('.auth-submit').click();assert.equal(await h.page.locator('#email').getAttribute('aria-invalid'),'true');assert.equal(await h.page.locator('#email').evaluate(e=>e===document.activeElement),true);
 }
 assert.equal(h.wire.filter(r=>r.path==='/api/auth/login').length,0);
 await h.page.locator('#email').fill('auth-enterprise@example.invalid');await h.page.locator('#password').fill('Wrong-synthetic-password');
 const toggle=h.page.getByRole('button',{name:az.auth.showPassword,exact:true});await toggle.focus();await toggle.press('Enter');assert.equal(await h.page.locator('#password').getAttribute('type'),'text');assert.equal(await h.page.locator('.auth-password-field__toggle').getAttribute('aria-pressed'),'true');
 await h.page.locator('.auth-submit').click();await h.page.getByRole('alert').waitFor();assert.equal(await h.page.locator('#email').inputValue(),'auth-enterprise@example.invalid');
 await h.page.locator('#password').fill(password);await h.page.locator('.auth-submit').click();await h.page.locator('[data-login-destination]').waitFor();assert.ok(await h.page.evaluate(()=>!!localStorage.getItem('inop_auth_token')));
 assert.equal(h.wire.filter(r=>r.path==='/api/auth/login').length,2);assert.deepEqual(h.pageErrors,[]);
}));
