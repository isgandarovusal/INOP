// QA-only real provider: no externally selectable endpoint or production credentials.
const fs=require('node:fs/promises'),crypto=require('node:crypto'),path=require('node:path'),os=require('node:os'),https=require('node:https');
const {spawn,spawnSync}=require('node:child_process');
const SHA='ce138fc99edc946ebd4d38589543f717e388bfe0b45186c06cff6ee6734ee8df';
const HOST='storage.inop-qa.example.com',PORT=18443;
function guard(env=process.env){
 if(env.NODE_ENV==='production'||env.RENDER==='true'||env.MONGO_URI||env.HR_CV_STORAGE_ENDPOINT||env.INOP_AUDIT_TEST_PORT!=='27018')throw Error('STAGING_ISOLATION_REQUIRED');
 for(const key of ['DURABLE_INTAKE','SCAN','INTAKE_WORKER','OCR','PROCESSING','AI_PROCESSING'])if(env['HR_CV_'+key+'_ENABLED']&&!['false','0','disabled'].includes(env['HR_CV_'+key+'_ENABLED']))throw Error('STAGING_GATES_MUST_BE_DISABLED');
}
async function validate(binary){
 if(!binary||!path.isAbsolute(binary))throw Error('VERIFIED_BINARY_REQUIRED');
 const st=await fs.lstat(binary);if(!st.isFile()||st.isSymbolicLink()||st.size>200000000)throw Error('VERIFIED_BINARY_REQUIRED');
 if(crypto.createHash('sha256').update(await fs.readFile(binary)).digest('hex')!==SHA)throw Error('BINARY_DIGEST_MISMATCH');
 const space=await fs.statfs(os.tmpdir());if(space.bavail*space.bsize<256*1024*1024)throw Error('TEMP_CAPACITY_REQUIRED');
}
async function start(binary){
 await validate(binary);
 const dir=await fs.mkdtemp(path.join(os.tmpdir(),'inop-owned-s3-'));await fs.chmod(dir,0o700);
 const key=path.join(dir,'tls.key'),cert=path.join(dir,'tls.crt'),conf=path.join(dir,'s3.json');
 const tls=spawnSync('openssl',['req','-x509','-newkey','rsa:2048','-nodes','-keyout',key,'-out',cert,'-days','1','-subj','/CN='+HOST,'-addext','subjectAltName=DNS:'+HOST],{timeout:10000,stdio:'ignore'});
 if(tls.status!==0)throw Error('LOCAL_TLS_SETUP_FAILED');await fs.chmod(key,0o600);
 const accessKeyId=crypto.randomBytes(16).toString('hex'),secretAccessKey=crypto.randomBytes(32).toString('hex');
 await fs.writeFile(conf,JSON.stringify({identities:[{name:'owned-qa',credentials:[{accessKey:accessKeyId,secretKey:secretAccessKey}],actions:['Admin','Read','Write','List','Tagging']}]}),{mode:0o600});
 const ca=await fs.readFile(cert),log=await fs.open(path.join(dir,'provider.log'),'ax',0o600);
 const args=['mini','-dir='+dir,'-ip=127.0.0.1','-ip.bind=127.0.0.1','-s3.config='+conf,'-s3.port=18333','-s3.port.https='+PORT,'-s3.cert.file='+cert,'-s3.key.file='+key,'-s3.port.iceberg=0','-s3.port.lance=0','-s3.iam=false','-admin.ui=false','-master.volumeSizeLimitMB=8','-volume.max=1','-s3.readerCacheSizeMB=16'];
 let child,spawnError;
 const transport=({url,method,headers,body,signal})=>new Promise((resolve,reject)=>{
  url=new URL(url);if(url.origin!=='https://'+HOST)return reject(Error('NON_OWNED_ENDPOINT'));
  const req=https.request({hostname:'127.0.0.1',port:PORT,servername:HOST,ca,rejectUnauthorized:true,path:url.pathname+url.search,method,headers,signal,agent:false},res=>resolve({status:res.statusCode,headers:res.headers,body:res}));req.on('error',reject);req.end(body);
 });
 async function stop(){if(!child||child.exitCode!==null)return;const current=child;await new Promise(resolve=>{const timer=setTimeout(()=>current.kill('SIGKILL'),5000);current.once('exit',()=>{clearTimeout(timer);resolve();});current.kill('SIGTERM');});}
 async function launch(){spawnError=undefined;child=spawn(binary,args,{env:{PATH:process.env.PATH,HOME:dir,GOMEMLIMIT:'256MiB',GOMAXPROCS:'2'},stdio:['ignore',log.fd,log.fd]});child.once('error',e=>spawnError=e);
  for(let i=0;i<100;i++){if(spawnError||child.exitCode!==null)throw Error('PROVIDER_START_FAILED');try{const r=await transport({url:'https://'+HOST,method:'GET',signal:AbortSignal.timeout(500)});r.body.destroy();return;}catch{}await new Promise(r=>setTimeout(r,100));}throw Error('PROVIDER_START_TIMEOUT');
 }
 try{await launch();}catch(e){await stop();await log.close();throw e;}
 return{dir,config:{provider:'s3',endpoint:'https://'+HOST,bucket:'inop-qa-'+crypto.randomUUID(),region:'us-east-1',accessKeyId,secretAccessKey},transport,stop,restart:launch,close:async()=>{await stop();await log.close();},identity:{version:'SeaweedFS 4.52',binarySha256:SHA}};
}
module.exports={guard,validate,start};
