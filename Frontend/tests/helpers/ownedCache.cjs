const fs=require('node:fs/promises'),path=require('node:path'),os=require('node:os');
// Never infer ownership from an old prefix or remove an operator-supplied cache.
exports.create=async supplied=>{
 const owned=!supplied,dir=supplied||await fs.mkdtemp(path.join(os.tmpdir(),'inop-owned-vite-'));
 await fs.mkdir(dir,{recursive:true});const identity=await fs.lstat(dir);let released=false;
 return{dir,async release(){if(!owned||released)return;const current=await fs.lstat(dir).catch(e=>{if(e.code==='ENOENT')return null;throw e;});
  if(current&&(current.isSymbolicLink()||current.dev!==identity.dev||current.ino!==identity.ino))throw Error('Owned cache identity changed; refusing cleanup.');
  if(current)await fs.rm(dir,{recursive:true,force:false});released=true;
 }};
};
