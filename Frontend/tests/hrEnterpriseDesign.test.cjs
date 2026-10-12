const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs/promises'),path=require('node:path');
const {withProductionHRFixture}=require('./helpers/productionHRFixture.cjs');
const stage=process.env.INOP_HR_DESIGN_STAGE||'A';
const rgb=s=>s.match(/[\d.]+/g).slice(0,3).map(Number);
const luminance=c=>c.map(v=>{v/=255;return v<=.04045?v/12.92:((v+.055)/1.055)**2.4}).reduce((n,v,i)=>n+v*[.2126,.7152,.0722][i],0);
const contrast=(a,b)=>{a=luminance(rgb(a));b=luminance(rgb(b));return(Math.max(a,b)+.05)/(Math.min(a,b)+.05)};
test('Reference-led enterprise controls in actual production shell '+stage,async t=>withProductionHRFixture(async h=>{
 const dir=process.env.INOP_HR_SCREENSHOTS;if(!dir||!path.isAbsolute(dir))throw Error('Owned evidence output required');await fs.mkdir(dir,{recursive:true});const records=[];
 for(const width of [1440,768,390])await t.test('Semantic controls, current actions and responsive '+width,async()=>{
  await h.page.setViewportSize({width,height:900});await h.open('admin','/app/recruitment/jobs/new');await h.page.locator('.job-form-page form').waitFor();await h.page.waitForLoadState('networkidle');
  const state=await h.page.evaluate(()=>{const style=s=>{const e=document.querySelector(s),c=getComputedStyle(e);return{background:c.backgroundColor,color:c.color,border:c.borderColor,height:e.getBoundingClientRect().height,width:e.getBoundingClientRect().width}};return{primary:style('.form-actions .btn-primary'),secondary:style('.form-actions .btn-secondary'),neutral:style('.form-actions .btn-cancel'),overflow:document.documentElement.scrollWidth>innerWidth+1,active:style('.hr-product-nav [aria-current=page]'),logo:document.querySelector('.inop-logo').getBoundingClientRect().width}});
  assert.notEqual(state.secondary.background,'rgb(255, 255, 255)','Secondary is clearly blue-tinted');assert.notEqual(state.primary.background,state.secondary.background);assert.ok(contrast(state.secondary.background,state.secondary.color)>=4.5);assert.ok(contrast(state.primary.background,state.primary.color)>=4.5);assert.equal(state.overflow,false);assert.ok(state.secondary.height<=48,"Draft action does not wrap into a narrow column");assert.ok(state.secondary.width>=100);
  if(stage!=='A'){assert.equal(state.active.color,'rgb(255, 255, 255)');assert.ok(contrast(state.active.background,state.active.color)>=4.5);}
  const primary=h.page.locator('.form-actions .btn-primary');await primary.focus();assert.equal(await primary.evaluate(e=>getComputedStyle(e).outlineStyle),'solid');
  records.push({width,...state});await h.page.evaluate(()=>window.scrollTo(0,0));await h.page.screenshot({path:path.join(dir,'controls-'+width+'.jpg'),fullPage:true,type:'jpeg',quality:70});
 });await fs.writeFile(path.join(dir,'styles.json'),JSON.stringify(records,null,2));assert.deepEqual(h.pageErrors,[]);
}));
