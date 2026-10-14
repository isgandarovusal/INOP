const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs/promises');
const {withBrowserFixture}=require('./helpers/browser.cjs');
const source=`import React from'react';import{createRoot}from'react-dom/client';import{INOPConcept}from'/src/Components/brand/INOPConcepts.tsx';import INOPLogo from'/src/Components/INOPLogo.tsx';window.navigateTest=()=>{};createRoot(document.getElementById('root')).render(React.createElement('main',null,...['A','B','C'].flatMap(concept=>['light','dark'].map(tone=>React.createElement('div',{key:concept+tone,style:{background:tone==='light'?'#132745':'white',padding:16}},React.createElement(INOPConcept,{concept,tone})))),React.createElement(INOPLogo,{compact:true})));`;
test('Three original four-letter wordmarks preserve accessible shared artwork without standalone icons',async()=>withBrowserFixture(source,async h=>{
 await h.open('admin','/');await h.page.locator('svg').first().waitFor();
 assert.equal(await h.page.getByRole('img',{name:'INOP',exact:true}).count(),7);
 const signatures=await h.page.locator('svg').evaluateAll(nodes=>nodes.map(n=>Array.from(n.querySelectorAll('path')).map(p=>p.getAttribute('d')).join('|')));assert.equal(new Set(signatures).size,3);
 for(const logo of await h.page.locator('svg').all())assert.deepEqual(await logo.locator('path').evaluateAll(nodes=>nodes.map(n=>n.dataset.letter)),['I','N','O','P']);
 assert.equal(await h.page.locator('svg').last().getAttribute('data-concept'),'A');
 const favicon=await fs.readFile(require('node:path').join(__dirname,'../public/favicon.svg'),'utf8');
 const paths=await h.page.locator('svg').first().locator('path').evaluateAll(nodes=>nodes.map(n=>n.getAttribute('d')));for(const d of paths)assert.ok(favicon.includes(d));
 assert.equal(await h.page.locator('svg defs,svg image,svg script').count(),0);assert.deepEqual(h.pageErrors,[]);
}));
