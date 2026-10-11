// Explicit local test preparation only; never imported by runtime/startup.
const fs=require('node:fs/promises'),path=require('node:path'),os=require('node:os'),crypto=require('node:crypto');
const versions={aze:'a365310848aecb739f19369cb3831d4660fcd9345d798e91a3042455f9ccc9f0',rus:'e16e5e036cce1d9ec2b00063cf8b54472625b9e14d893a169e2b0dedeb4df225',eng:'7d4322bd2a7749724879683fc3912cb542f19906c83bcc1a52132556427170b2'};
const directory=path.join(os.tmpdir(),'inop-hr-ocr-models');
async function prepare(){
 try{await fs.mkdir(directory,{mode:0o700});}catch(error){if(error.code!=='EEXIST')throw error;}
 const root=await fs.lstat(directory);if(!root.isDirectory()||root.isSymbolicLink())throw Error('Test model directory is unsafe.');
 for(const [language,sha]of Object.entries(versions)){
  const file=path.join(directory,language+'.traineddata');
  try{const st=await fs.lstat(file);if(!st.isFile()||st.isSymbolicLink()||st.size>10*1024*1024||crypto.createHash('sha256').update(await fs.readFile(file)).digest('hex')!==sha)throw Error('Refusing an existing incompatible test model.');continue;}catch(error){if(error.code!=='ENOENT')throw error;}
  const response=await fetch('https://raw.githubusercontent.com/tesseract-ocr/tessdata_fast/4.1.0/'+language+'.traineddata',{signal:AbortSignal.timeout(15000),redirect:'error'});
  if(response.status!==200||!response.body)throw Error('Official test model download failed.');
  const chunks=[];let size=0;for await(const chunk of response.body){size+=chunk.length;if(size>10*1024*1024)throw Error('Test model size exceeded.');chunks.push(Buffer.from(chunk));}
  const bytes=Buffer.concat(chunks);if(crypto.createHash('sha256').update(bytes).digest('hex')!==sha)throw Error('Pinned test model identity mismatched.');await fs.writeFile(file,bytes,{flag:'wx',mode:0o600});
 }
 return{languages:Object.keys(versions),tag:'tessdata_fast/4.1.0',sha256:versions,testArtifactsOnly:true};
}
if(require.main===module)prepare().then(result=>console.log(JSON.stringify(result))).catch(()=>{console.error('OCR test models require safe explicit preparation.');process.exitCode=1;});
module.exports={directory,versions,prepare};
