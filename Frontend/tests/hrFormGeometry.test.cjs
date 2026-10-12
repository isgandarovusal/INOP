const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs/promises'),path=require('node:path');const {withBrowserFixture}=require('./helpers/browser.cjs');
test('Candidate create/edit control geometry, labels and history stay usable across responsive sizes',async t=>{
 const harness=(await fs.readFile(path.join(__dirname,'hrNavigationPerformance.test.cjs'),'utf8')).match(/const harness=`([\s\S]*?)`;/)[1];
 await withBrowserFixture(harness,async h=>{
  for(const width of[320,768,1440])await t.test('Create '+width,async()=>{
   await h.page.setViewportSize({width,height:1000});await h.open('admin','/app/recruitment/candidates/new');const education=h.page.locator('textarea[name=education]');await education.waitFor();
   const boxes=await education.evaluate(e=>({textarea:e.getBoundingClientRect().toJSON(),group:e.closest('.form-group').getBoundingClientRect().toJSON(),fieldsetBorder:getComputedStyle(document.querySelector('.candidate-fields')).borderTopWidth}));
   await fs.writeFile('/workspace/inop-hr20-form-after-'+width+'.json',JSON.stringify(boxes,null,2));assert.ok(boxes.textarea.width>=boxes.group.width-2,'Education textarea must fill its field, not inline shrink');assert.equal(boxes.fieldsetBorder,'0px');assert.ok(boxes.textarea.height>=110,'Textarea must preserve readable multiline height');
   await h.page.locator('.candidate-fields .candidate-field-label').first().click();assert.equal(await h.page.locator('input[name=name]').evaluate(e=>document.activeElement===e),true);
   const labels=await h.page.locator('.candidate-fields label[for]').evaluateAll(rows=>rows.every(l=>!!document.getElementById(l.htmlFor)));assert.equal(labels,true);
   await education.fill('Long education '.repeat(100));const skill=h.page.getByRole('textbox',{name:'Bacarıqlar',exact:true});await skill.fill('HACCP');await skill.press('Enter');assert.equal(await h.page.getByRole('button',{name:'Sil HACCP',exact:true}).count(),1);
   await h.page.locator('.cv-history-editor').first().getByRole('button',{name:'Əlavə et',exact:true}).click();await h.page.locator('.cv-history-editor fieldset').first().waitFor();
   const overflow=await h.page.locator('.candidate-fields').evaluate(e=>e.scrollWidth>e.clientWidth+1);assert.equal(overflow,false);assert.ok(await h.page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
   await fs.mkdir('/workspace/inop-hr20-visual',{recursive:true});await h.page.screenshot({path:'/workspace/inop-hr20-visual/candidate-create-'+width+'.png',fullPage:true});
  });
  const candidate=(await h.request('admin','POST','/candidates',{name:'Geometry fixture',role:'Cashier',education:'Original school',skills:['HACCP'],employmentHistory:[{raw:'Synthetic employment',organization:'GFC fixture',title:'Cashier',start:{year:2020,month:1},end:null,ongoing:true}]})).data;
  await t.test('Edit education/name save preserves histories and review metadata',async()=>{
   await h.open('admin','/app/recruitment/candidates/'+candidate._id+'/edit');await h.page.locator('textarea[name=education]').waitFor();await h.page.locator('textarea[name=education]').fill('Reviewed school');await h.page.locator('input[name=name]').fill('Reviewed fixture');await h.page.locator('button[type=submit]').click();await h.page.waitForURL('**/app/recruitment/candidates');const updated=(await h.request('admin','GET','/candidates/'+candidate._id)).data;assert.equal(updated.name,'Reviewed fixture');assert.equal(updated.education,'Reviewed school');assert.equal(updated.employmentHistory[0].organization,'GFC fixture');
  });assert.deepEqual(h.pageErrors,[]);
 });
});
