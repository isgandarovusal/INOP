const {test,expect}=require('/opt/codex/runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/test');
const fs=require('node:fs/promises'),path=require('node:path');
const {withBrowserFixture}=require('./helpers/browser.cjs');
test('Selected identity and static login composition preserve responsive form priority and keyboard access',async()=>{
 const text=await fs.readFile(path.join(__dirname,'enterpriseLoginUI.test.cjs'),'utf8'),source=text.match(/const harness=`([\s\S]*?)`;/)[1];
 await withBrowserFixture(source,async h=>{
  for(const width of [1440,768,390]){
   await h.page.setViewportSize({width,height:1000});await h.open('admin','/login');await h.page.locator('#email').waitFor();
   expect(await h.page.locator('.inop-logo').getAttribute('data-concept')).toBe('B');
   expect(await h.page.locator('.auth-brand-art').getAttribute('aria-hidden')).toBe('true');
   expect(await h.page.locator('.auth-brand-art').isVisible()).toBe(width>680);
   expect(await h.page.locator('.auth-brand-copy').isVisible()).toBe(width>680);
   expect(await h.page.locator('.auth-entry-panel').textContent()).not.toMatch(/INTERNAL OPERATIONS|RECRUITMENT · AUDIT/);
   expect(await h.page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
   await h.page.locator('#password').fill('Synthetic-only');await h.page.locator('#password').focus();await h.page.keyboard.press('Tab');
   expect(await h.page.locator('.auth-password-field__toggle').evaluate(e=>document.activeElement===e)).toBe(true);
   await h.page.keyboard.press('Enter');expect(await h.page.locator('#password').getAttribute('type')).toBe('text');
   const focus=await h.page.locator('.auth-password-field__toggle').evaluate(e=>getComputedStyle(e).outlineStyle);expect(focus).not.toBe('none');
   await fs.mkdir('/workspace/work/final-premium/login-qa',{recursive:true});await h.page.screenshot({path:`/workspace/work/final-premium/login-qa/login-${width}.png`,fullPage:true});
  }
  expect(h.pageErrors).toEqual([]);expect(h.wire.filter(r=>r.method==='POST')).toEqual([]);
 });
});
