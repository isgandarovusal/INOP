const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs/promises'),path=require('node:path'),{execFileSync}=require('node:child_process');
const {withBrowserFixture}=require('./helpers/browser.cjs');
const az=require('../src/i18n/locales/az.json');
const loginHarness=`import React from'react';import{createRoot}from'react-dom/client';import{createBrowserRouter,RouterProvider}from'react-router-dom';import{AuthContext}from'/src/Context/AuthContext.ts';import'/src/i18n/index.ts';import'/src/App.css';import Login from'/src/Pages/Auth/Login/Login.tsx';const router=createBrowserRouter([{path:'/login',element:React.createElement(Login)},{path:'/app/dashboard',element:React.createElement('p',{'data-login-destination':true},'Authenticated destination')}]);window.navigateTest=to=>router.navigate(to);function App(){const[user,setUser]=React.useState(null);return React.createElement(AuthContext.Provider,{value:{user,isLoading:false,login:async()=>{if(window.rejectLogin)throw Error('Synthetic login unavailable');setUser(window.testUser)},logout:async()=>setUser(null)}},React.createElement(RouterProvider,{router}))}createRoot(document.getElementById('root')).render(React.createElement(React.StrictMode,null,React.createElement(App)));`;
test('Shared brand/login: real asset sizes, quiet responsive layout, accessible languages/password/error and submit',async t=>withBrowserFixture(loginHarness,async h=>{
 for(const width of[320,768,1440])await t.test('Login '+width,async()=>{
  await h.page.setViewportSize({width,height:900});await h.open('admin','/login');await h.page.getByLabel(az.auth.email,{exact:true}).waitFor();
  await h.page.waitForFunction(()=>document.querySelector('svg.inop-logo path'));
  assert.ok(await h.page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
  assert.equal(await h.page.locator('.auth-page').evaluate(e=>getComputedStyle(e).backgroundImage),'none');
  assert.equal(await h.page.locator('.auth-page__ambient,.auth-orbit,.auth-page__grid-overlay').count(),0);
  const logo=h.page.getByRole('img',{name:'INOP — Internal Operations Platform',exact:true});assert.equal(await logo.getAttribute('width'),'320');assert.equal(await logo.getAttribute('height'),'128');
  for(const name of['ENG','RUS','AZE']){const b=h.page.getByRole('button',{name,exact:true});await b.click();assert.equal(await b.getAttribute('aria-pressed'),'true');}
  assert.equal(await logo.evaluate(e=>e.tagName.toLowerCase()),'svg');assert.ok((await logo.evaluate(e=>e.outerHTML)).length<4096);assert.equal(await logo.locator('image,rect,foreignObject,script').count(),0);assert.equal(await logo.getAttribute('src'),null);
  await fs.mkdir('/workspace/inop-hr18-brand-visual',{recursive:true});await h.page.screenshot({path:'/workspace/inop-hr18-brand-visual/login-'+width+'.png',fullPage:true});
 });
 await t.test('Password visibility and explicit error do not lose the form; successful submit navigates',async()=>{
  await h.page.locator('#email').fill('ui-only@example.invalid');await h.page.locator('#password').fill('synthetic-ui-only');
  await h.page.getByRole('button',{name:'Şifrəni göstər',exact:true}).click();assert.equal(await h.page.locator('#password').getAttribute('type'),'text');
  await h.page.evaluate(()=>window.rejectLogin=true);await h.page.getByRole('button',{name:'Daxil ol',exact:true}).click();await h.page.getByRole('alert').waitFor();assert.equal(await h.page.locator('#email').inputValue(),'ui-only@example.invalid');
  await h.page.evaluate(()=>window.rejectLogin=false);await h.page.getByRole('button',{name:'Daxil ol',exact:true}).click();await h.page.locator('[data-login-destination]').waitFor();
 });assert.deepEqual(h.pageErrors,[]);
}));
test('Existing Audit content keeps its computed design after duplicate-declaration cleanup',async t=>{
 const src=await fs.readFile(path.join(__dirname,'hrNavigationPerformance.test.cjs'),'utf8');
 const latest={};const previous={};for(const n of['components','recruitment','hr-workspace','layout','admin']){previous[n+'.css']=execFileSync('git',['show','406ac4f:Frontend/src/Styles/'+n+'.css'],{encoding:'utf8'});latest[n+'.css']=await fs.readFile(path.join(__dirname,'../src/Styles',n+'.css'),'utf8');}
 await withBrowserFixture(src.match(/const harness=`([\s\S]*?)`;/)[1],async h=>{
  for(const width of[320,1280])for(const url of['/app/audit/audits','/app/audit/restaurants','/app/audit/standard','/app/audit/restaurants/new'])await t.test(url+' '+width,async()=>{
   await h.page.setViewportSize({width,height:900});await h.open('admin',url);await h.page.locator('main.admin-main').waitFor();await h.page.waitForLoadState('networkidle');
   const value=await h.page.evaluate(({previous,latest})=>{
    const stop=document.createElement('style');stop.textContent='*{animation:none!important;transition:none!important}';document.head.append(stop);
    const read=()=>Array.from(document.querySelectorAll('main.admin-main :is(h1,h2,h3,p,button,input,select,table,th,td,form)')).slice(0,160).map(e=>{const s=getComputedStyle(e);return[e.tagName,...['color','backgroundColor','backgroundImage','fontSize','fontWeight','padding','margin','border','borderRadius','display','width','height'].map(k=>s[k])]});
    const current=read(),originals=[];let replacements=0;
    for(const e of document.querySelectorAll('style[data-vite-dev-id]')){const text=e.textContent;for(const name of Object.keys(previous))if(e.textContent.includes(latest[name].trim())){e.textContent=e.textContent.replace(latest[name].trim(),previous[name].trim());replacements++;}if(e.textContent!==text)originals.push([e,text]);}
    const old=read();for(const[e,text]of originals)e.textContent=text;stop.remove();return{current,old,replacements};
   },{previous,latest});
   assert.ok(value.current.length>0);assert.ok(value.replacements>=5,'Every selected stylesheet must actually be replaced, including bundled @imports');assert.deepEqual(value.current,value.old);
  });
  await t.test('One visible desktop HR navigation; mobile shortcuts and inert closed drawer retain keyboard operation',async()=>{
   await h.page.setViewportSize({width:1280,height:900});await h.open('admin','/app/recruitment/jobs');await h.page.locator('.admin-table-container').waitFor();
   assert.equal(await h.page.locator('[data-hr-product-bar]').isVisible(),false);
   assert.equal(await h.page.locator('aside').getAttribute('inert'),null);
   await h.page.setViewportSize({width:320,height:900});await h.page.waitForFunction(()=>document.querySelector('aside')?.inert);
   assert.equal(await h.page.locator('[data-hr-product-bar]').isVisible(),true);
   const button=h.page.getByRole('button',{name:az.navigation.toggleMenu,exact:true});await button.click();assert.equal(await button.getAttribute('aria-expanded'),'true');assert.equal(await h.page.locator('aside').getAttribute('inert'),null);
   await h.page.keyboard.press('Escape');await h.page.waitForFunction(()=>document.querySelector('aside')?.inert);assert.equal(await button.getAttribute('aria-expanded'),'false');
  });assert.deepEqual(h.pageErrors,[]);
 });
});
