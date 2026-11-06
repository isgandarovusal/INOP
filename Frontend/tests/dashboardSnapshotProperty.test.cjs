const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),Module=require('node:module'),ts=require('typescript'),fc=require('fast-check');
test('Generated Dashboard cache traces isolate scopes, revocation, expiry and stale writers',()=>{
 let epoch=0,reset,now=100000;const oldNow=Date.now;Date.now=()=>now;
 const filename=path.resolve(__dirname,'../src/api/dashboardSnapshot.ts'),m=new Module(filename,module);m.filename=filename;
 m.require=id=>id==='./aggregateCache'?{aggregateEpoch:()=>epoch}:id==='./clientSession'?{onClientSessionReset:f=>reset=f}:require(id);
 m._compile(ts.transpileModule(fs.readFileSync(filename,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,filename);
 const c=m.exports;
 try{fc.assert(fc.property(fc.array(fc.record({kind:fc.constantFrom('write','read','invalidate','logout','tick','stale'),scope:fc.constantFrom('user-A/token1/backend1','user-A/token2/backend1','user-B/token1/backend2'),value:fc.nat(10000),advance:fc.nat(70000)}),{minLength:1,maxLength:80}),ops=>{
  reset();epoch=0;now=100000;let expected;
  for(const op of ops){
   const valid=()=>expected&&expected.key===op.scope&&expected.epoch===epoch&&now-expected.at<60000;
   if(op.kind==='invalidate'){epoch++;}
   if(op.kind==='logout'){reset();expected=undefined;}
   if(op.kind==='tick'){now+=op.advance;}
   if(op.kind==='write'){c.keepDashboardSnapshot(op.scope,epoch,{jobs:{total:op.value}});expected={key:op.scope,epoch,at:now,value:op.value};}
   if(op.kind==='stale'){c.keepDashboardSnapshot(op.scope,epoch-1,{jobs:{total:op.value}});}
   if(op.kind==='read'){
    const got=c.dashboardSnapshot(op.scope);if(valid()){assert.equal(got.value.jobs.total,expected.value);assert.equal(got.fresh,now-expected.at<10000);got.value.jobs.total=-1;assert.equal(c.dashboardSnapshot(op.scope).value.jobs.total,expected.value);}else assert.equal(got,undefined);
   }
  }
 }),{seed:20261106,numRuns:500});}finally{Date.now=oldNow;reset();}
});
test('Partial refresh cannot extend the lifetime of another section',()=>{
 let epoch=0,now=100000;const old=Date.now;Date.now=()=>now;
 const filename=path.resolve(__dirname,'../src/api/dashboardSnapshot.ts'),m=new Module(filename,module);m.filename=filename;m.require=id=>id==='./aggregateCache'?{aggregateEpoch:()=>epoch}:id==='./clientSession'?{onClientSessionReset:()=>{}}:require(id);m._compile(ts.transpileModule(fs.readFileSync(filename,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,filename);
 try{const c=m.exports;c.keepDashboardSnapshot('owner',epoch,{jobs:{total:3},applications:{total:4}});now+=59000;c.keepDashboardSnapshot('owner',epoch,{jobs:{total:5}});now+=1001;const s=c.dashboardSnapshot('owner');assert.equal(s.value.jobs.total,5);assert.equal(s.value.applications,undefined);}finally{Date.now=old;}
});
