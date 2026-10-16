const{test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs/promises'),os=require('node:os'),path=require('node:path');
const{create}=require('../../Frontend/tests/helpers/ownedCache.cjs');
test('Browser cache cleanup removes only the current owned directory, preserves supplied caches and refuses symlink replacement',async()=>{
 const c=await create();await fs.writeFile(path.join(c.dir,'generated'),'temporary');await c.release();await assert.rejects(fs.stat(c.dir),{code:'ENOENT'});await c.release();
 const shared=await fs.mkdtemp(path.join(os.tmpdir(),'inop-cache-test-shared-'));try{const other=await create(shared);await fs.writeFile(path.join(shared,'evidence'),'preserve');await other.release();assert.equal(await fs.readFile(path.join(shared,'evidence'),'utf8'),'preserve');
 const swapped=await create(),moved=swapped.dir+'-moved';await fs.rename(swapped.dir,moved);await fs.symlink(shared,swapped.dir);try{await assert.rejects(swapped.release(),/identity/);assert.equal(await fs.readFile(path.join(shared,'evidence'),'utf8'),'preserve');}finally{await fs.unlink(swapped.dir);await fs.rm(moved,{recursive:true});}
 }finally{await fs.rm(shared,{recursive:true});}
});
