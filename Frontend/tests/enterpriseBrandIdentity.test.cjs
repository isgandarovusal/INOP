const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs/promises');
const {withBrowserFixture}=require('./helpers/browser.cjs');
const source=`import React from'react';import{createRoot}from'react-dom/client';import{INOPConcept}from'/src/Components/brand/INOPConcepts.tsx';import INOPLogo from'/src/Components/INOPLogo.tsx';window.navigateTest=()=>{};createRoot(document.getElementById('root')).render(React.createElement('main',null,...['A','B','C'].flatMap(concept=>['light','dark'].map(tone=>React.createElement('div',{key:concept+tone,style:{background:tone==='light'?'#132745':'white',padding:16}},React.createElement(INOPConcept,{concept,tone}),React.createElement(INOPConcept,{concept,tone,iconOnly:true})))),React.createElement(INOPLogo,{compact:true})));`;
test('Three distinct identities retain readable SVG variants and the selected favicon artwork',async()=>withBrowserFixture(source,async h=>{
 await h.open('admin','/');await h.page.locator('svg').first().waitFor();
 assert.equal(await h.page.getByRole('img',{name:'INOP',exact:true}).count(),13);
 const signatures=await h.page.locator('svg[data-variant=icon]').evaluateAll(nodes=>nodes.map(n=>Array.from(n.querySelectorAll('path')).map(p=>p.getAttribute('d')).join('|')));
 assert.equal(new Set(signatures).size,3);
 assert.equal(await h.page.locator('svg').last().getAttribute('data-concept'),'B');
 const favicon=await fs.readFile(require('node:path').join(__dirname,'../public/favicon.svg'),'utf8');
 const selectedPaths=await h.page.locator('svg[data-concept=B][data-variant=icon]').first().locator('path').evaluateAll(nodes=>nodes.map(n=>n.getAttribute('d')));
 for(const d of selectedPaths)assert.ok(favicon.includes(d));
 assert.equal(await h.page.locator('svg defs,svg image,svg script').count(),0);
 assert.deepEqual(h.pageErrors,[]);
}));
