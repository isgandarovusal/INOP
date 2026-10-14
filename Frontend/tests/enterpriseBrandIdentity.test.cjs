const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs/promises');
const {withBrowserFixture}=require('./helpers/browser.cjs');
const source=`import React from'react';import{createRoot}from'react-dom/client';import{INOPConcept}from'/src/Components/brand/INOPConcepts.tsx';import INOPLogo from'/src/Components/INOPLogo.tsx';window.navigateTest=()=>{};createRoot(document.getElementById('root')).render(React.createElement('main',null,...['A','B','C'].flatMap(concept=>['light','dark'].map(tone=>React.createElement('div',{key:concept+tone,style:{background:tone==='light'?'#132745':'white',padding:16}},React.createElement(INOPConcept,{concept,tone})))),React.createElement(INOPLogo,{compact:true})));`;
test('Three original four-letter wordmarks preserve accessible shared artwork without standalone icons',async()=>withBrowserFixture(source,async h=>{
 await h.open('admin','/');await h.page.locator('svg').first().waitFor();
 assert.equal(await h.page.getByRole('img',{name:'INOP',exact:true}).count(),7);
 const signatures=await h.page.locator('svg').evaluateAll(nodes=>nodes.map(n=>Array.from(n.querySelectorAll('path')).map(p=>p.getAttribute('d')).join('|')));assert.equal(new Set(signatures.slice(0,-1)).size,3);
 for(const logo of await h.page.locator('svg').all())assert.deepEqual(await logo.locator('path').evaluateAll(nodes=>nodes.map(n=>n.dataset.letter)),['I','N','O','P']);
 assert.equal(await h.page.locator('svg').last().getAttribute('data-variant'),'compact');
 const sharedPaths=await h.page.evaluate(async()=> (await import('/src/Components/brand/wordmarkPaths.ts')).wordmarkPaths.map(([,d])=>d));
 assert.deepEqual(await h.page.locator('svg').last().locator('path').evaluateAll(nodes=>nodes.map(node=>node.getAttribute('d'))),sharedPaths);
 const favicon=await fs.readFile(require('node:path').join(__dirname,'../public/favicon-32.png'));
 assert.deepEqual(favicon.subarray(0,8),Buffer.from([137,80,78,71,13,10,26,10]));
 assert.equal(await h.page.locator('svg defs,svg image,svg script').count(),0);assert.deepEqual(h.pageErrors,[]);
}));
