// Safe scope: this existing HR-only sheet, no Audit/global selector rewrites.
const fs=require('node:fs'),path=require('node:path'),postcss=require('postcss');
const recruitment=process.argv.includes('--recruitment');
const file=path.resolve(__dirname,'../src/Styles/'+(recruitment?'recruitment':'hr-workspace')+'.css'),source=fs.readFileSync(file,'utf8'),root=postcss.parse(source),seen=new Map(),removed=[];
function context(rule){const parents=[];for(let p=rule.parent;p?.type!=='root';p=p.parent)parents.unshift([p.name,p.params]);return JSON.stringify(parents);}
const declarations=[];root.walkRules(rule=>{if(recruitment&&!rule.selectors.every(selector=>/\.(?:candidate-|candidate-fields|job-|recruitment-|hr-)/.test(selector)))return;rule.walkDecls(d=>declarations.push({d,key:context(rule)+'|'+rule.selector+'|'+d.prop}));});
for(let i=declarations.length-1;i>=0;i--){const {d,key}=declarations[i],later=seen.get(key);if(later&&(!d.important||later.important)){removed.push({selector:d.parent.selector,property:d.prop,value:d.value,line:d.source.start.line});d.remove();}else seen.set(key,d);}
root.walkRules(r=>{if(!r.nodes.length)r.remove();});
const report={file,shadowedDeclarations:removed.length,beforeBytes:Buffer.byteLength(source),afterBytes:Buffer.byteLength(root.toString()),removed};
if(process.argv.includes('--write'))fs.writeFileSync(file,root.toString());console.log(JSON.stringify(report,null,2));
