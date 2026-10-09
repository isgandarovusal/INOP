const test=require('node:test');
const assert=require('node:assert/strict');
const {withBrowserFixture}=require('./helpers/browser.cjs');
const source=`import React from 'react'; import {createRoot} from 'react-dom/client'; import {BrowserRouter,Routes,Route,useNavigate} from 'react-router-dom';
import {AuthProvider} from '/src/Context/AuthContextProvider.tsx'; import Standard from '/src/Pages/Audit/StandardAudit/StandardAuditDetail.tsx';
import api from '/src/api/axios.ts';api.defaults.baseURL='/api';
function App(){window.navigateTest=useNavigate();return React.createElement(AuthProvider,null,React.createElement(Routes,null,React.createElement(Route,{path:'/:id',element:React.createElement(Standard)})));}
createRoot(document.getElementById('root')).render(React.createElement(React.StrictMode,null,React.createElement(BrowserRouter,null,React.createElement(App))));`;
test('Real AuthProvider revalidates revoked and restored permissions on focus',async()=>withBrowserFixture(source,async h=>{
 const audit=await h.audit('own','standard',{compliancePercentage:100,foundTotal:0,foundCritical:0,foundMajor:0,foundMinor:0,passed:true});
 const role=await h.models.Role.findOne({key:'test_own'}).lean();
 await h.open('own',`/${audit.id}`);await h.page.getByText(audit.restaurantId,{exact:true}).first().waitFor();
 await h.models.Role.updateOne({_id:role._id},{permissions:[]});
 await h.page.evaluate(()=>window.dispatchEvent(new Event('focus')));await h.page.locator('[data-audit-state="forbidden"]').first().waitFor();
 assert.equal(await h.page.getByText(audit.restaurantId,{exact:true}).count(),0);
 await h.models.Role.updateOne({_id:role._id},{permissions:role.permissions});
 await h.page.evaluate(()=>window.dispatchEvent(new Event('focus')));await h.page.getByText(audit.restaurantId,{exact:true}).first().waitFor();
 assert.deepEqual(h.pageErrors,[]);
 await h.page.evaluate(()=>{localStorage.setItem('inop_auth_token','invalid-local-test-token');window.dispatchEvent(new Event('focus'));});
 await h.page.locator('[data-audit-state="unauthenticated"]').first().waitFor();
 assert.equal(await h.page.evaluate(()=>localStorage.getItem('inop_auth_token')),null);
}));
