const {test,expect}=require('/opt/codex/runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/test');
const fs=require('node:fs/promises'),path=require('node:path');
const root=path.resolve(__dirname,'..');
test('Production build serves the approved icons and manifest on real login and deep routes',async({page})=>{
 const {preview}=await import(path.join(root,'node_modules/vite/dist/node/index.js'));
 const server=await preview({root,preview:{host:'127.0.0.1',port:0,strictPort:true,open:false}});
 const origin=`http://127.0.0.1:${server.httpServer.address().port}`;
 const output=process.env.INOP_AUDIT_SCREEN_DIR||'/workspace/work/favicon-final';await fs.mkdir(output,{recursive:true});
 const errors=[];page.on('pageerror',error=>errors.push(error.message));
 await page.route('**/*',route=>['localhost','127.0.0.1'].includes(new URL(route.request().url()).hostname)?route.continue():route.abort());
 try{
  await page.goto(origin+'/login');await expect(page.locator('#email')).toBeVisible();
  const icons=await page.locator('link[rel=icon]').evaluateAll(nodes=>nodes.map(node=>({href:node.href,type:node.type,sizes:node.sizes.value})));
  expect(icons).toHaveLength(3);expect(icons.some(icon=>new URL(icon.href).pathname==='/favicon.ico')).toBe(true);
  const version=new URL(icons[0].href).searchParams.get('v');expect(version).toMatch(/^[a-f0-9]{12}$/);
  for(const icon of icons)expect(new URL(icon.href).searchParams.get('v')).toBe(version);
  for(const icon of icons){const response=await page.request.get(icon.href);expect(response.status()).toBe(200);expect(await response.body()).toEqual(await fs.readFile(path.join(root,'public',new URL(icon.href).pathname.slice(1))));}
  const manifestHref=await page.locator('link[rel=manifest]').getAttribute('href');
  expect(new URL(manifestHref,origin).searchParams.get('v')).toBe(version);
  const manifestResponse=await page.request.get(origin+manifestHref);expect(manifestResponse.status()).toBe(200);
  const manifest=await manifestResponse.json();expect(manifest.name).toBe('INOP');expect(manifest.icons.map(icon=>icon.sizes)).toEqual(['192x192','512x512']);
  for(const icon of manifest.icons){expect(new URL(icon.src,origin).searchParams.get('v')).toBe(version);const response=await page.request.get(origin+icon.src);expect(response.status()).toBe(200);expect(await response.body()).toEqual(await fs.readFile(path.join(root,'public',icon.src.split('?')[0].slice(1))));}
  const appleHref=await page.locator('link[rel=apple-touch-icon]').getAttribute('href');expect((await page.request.get(origin+appleHref)).status()).toBe(200);
  for(const width of[1440,768,390]){await page.setViewportSize({width,height:1000});await expect(page.locator('#email')).toBeVisible();expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);if(width>680)await page.waitForFunction(()=>{const img=document.querySelector('.auth-brand-art img');return img?.complete&&img.naturalWidth>0;});await page.screenshot({path:`${output}/login-${width}.png`,fullPage:true});}
  await page.evaluate(version=>{const gallery=document.createElement('div');gallery.id='favicon-gallery';gallery.style.cssText='background:white;padding:24px;display:flex;gap:24px;align-items:center';for(const size of[16,32,48,64]){const img=new Image(size,size);img.src=`/favicon-${size}.png?v=${version}`;gallery.append(img);}document.body.append(gallery);},version);
  await page.waitForFunction(()=>[...document.querySelectorAll('#favicon-gallery img')].every(img=>img.complete&&img.naturalWidth===img.width));await page.locator('#favicon-gallery').screenshot({path:output+'/favicon-sizes.png'});
  await page.goto(origin+'/app/audit/hr');await expect(page.locator('#email')).toBeVisible();expect(await page.locator('link[rel=icon]').count()).toBe(3);
  expect(errors).toEqual([]);
 }finally{await new Promise((resolve,reject)=>server.httpServer.close(error=>error?reject(error):resolve()));}
});
