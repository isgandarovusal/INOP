// Explicit inventory and owned-loopback preparation only. Never loaded at boot.
const models = ['auditDepartmentSnapshot','application','recruitmentBrand','recruitmentBranch','hrAiUsage','hrCvOriginalManifest','hrCvProcessingJob','hrCvIntake','hrGraphSync','hrGraphReceipt','hrExternalReceipt','hrExternalRate'].map(name => require('../models/'+name+'.model'));
const keys = ['unique','sparse','partialFilterExpression','collation','expireAfterSeconds'];
function stable(value){return Array.isArray(value)?value.map(stable):value&&typeof value==='object'?Object.fromEntries(Object.keys(value).sort().map(k=>[k,stable(value[k])])):value;}
const equal=(a,b)=>JSON.stringify(stable(a))===JSON.stringify(stable(b));
function catalog(){return models.map(model=>({collection:model.collection.name,indexes:model.schema.indexes().map(([key,options])=>({name:options.name||Object.entries(key).map(([k,v])=>k+'_'+v).join('_'),key:{...key},...Object.fromEntries(keys.filter(k=>options[k]!==undefined).map(k=>[k,structuredClone(options[k])]))}))}));}
function local(connection,ownedDatabase){if(!connection||connection.host!=='127.0.0.1'||connection.name!==ownedDatabase||!/^inop_audit_test_\d+_[a-f0-9]{12}$/.test(ownedDatabase||''))throw Object.assign(new Error('Only an explicitly owned loopback test database is supported.'),{code:'HR_DDL_LOCAL_ONLY'});}
function option(row,key){if(key==='collation'&&(!row[key]||row[key].locale==='simple'))return undefined;return row[key]??(['unique','sparse'].includes(key)?false:undefined);}
function compatible(a,b){return equal(a.key,b.key)&&keys.every(k=>equal(option(a,k),option(b,k)));}
async function inspect(connection,{ownedDatabase}={}){
 local(connection,ownedDatabase);const collections=new Set((await connection.db.listCollections({},{nameOnly:true}).toArray()).map(v=>v.name)),items=[];
 for(const row of catalog()){
  const current=collections.has(row.collection)?await connection.db.collection(row.collection).indexes():[];
  for(const index of row.indexes){const named=current.find(v=>v.name===index.name),same=current.find(v=>compatible(v,index)),conflict=named&&!compatible(named,index)||current.some(v=>equal(v.key,index.key)&&!compatible(v,index));items.push({collection:row.collection,index,status:conflict?'conflict':same?'compatible':'missing'});}
 }
 return{version:'hr-release-ddl-v1',mode:'owned-local-dry-run',items};
}
async function prepareLocal(connection,{ownedDatabase,apply=false}={}){
 const report=await inspect(connection,{ownedDatabase});if(!apply)return{...report,created:0};
 if(report.items.some(v=>v.status==='conflict'))throw Object.assign(new Error('Index options conflict; no automatic index replacement is allowed.'),{code:'HR_DDL_CONFLICT'});
 let created=0;
 for(const row of report.items.filter(v=>v.status==='missing')){
  const {key,...options}=row.index;
  try{await connection.db.collection(row.collection).createIndex(key,options);created++;}
  catch{throw Object.assign(new Error('Local index preparation failed; preserve data and inspect completed index metadata before retry.'),{code:'HR_DDL_PREPARE_FAILED',created});}
 }
 return{...await inspect(connection,{ownedDatabase}),mode:'owned-local-apply',created};
}
module.exports={catalog,inspect,prepareLocal};
