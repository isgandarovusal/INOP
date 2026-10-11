const {parentPort,workerData}=require('node:worker_threads');
(async()=>{
 const bytes=Buffer.from(workerData.bytes),{PDFParse}=require('pdf-parse');
 if(!bytes.length||bytes.length>5*1024*1024||!bytes.subarray(0,5).equals(Buffer.from('%PDF-')))throw Error('Invalid PDF');
 const parser=new PDFParse({data:bytes,verbosity:0,isEvalSupported:false,disableFontFace:true,useSystemFonts:false,maxImageSize:4000000});
 try{
  const info=await parser.getInfo({parsePageInfo:true});
  if(!Number.isInteger(info.total)||info.total<1||info.total>3||!Array.isArray(info.pages)||info.pages.length!==info.total)throw Object.assign(Error('Unsupported PDF bound'),{code:'OCR_LIMIT'});
  for(const page of info.pages){const scale=1200/page.width;if(!Number.isFinite(scale)||scale<=0||page.width<100||page.width>2000||page.height<100||page.height>4000||Math.ceil(1200*page.height*scale)>4000000)throw Object.assign(Error('Unsupported page bound'),{code:'OCR_LIMIT'});}
  const pages=[];for(let number=1;number<=info.total;number++){
   const result=await parser.getScreenshot({partial:[number],desiredWidth:1200,imageDataUrl:false,imageBuffer:true}),page=result.pages?.[0];
   if(!page||result.pages.length!==1||!page.data||page.data.length>4*1024*1024)throw Object.assign(Error('Unsupported image bound'),{code:'OCR_LIMIT'});
   pages.push({pageNumber:number,data:Uint8Array.from(page.data)});
  }
  parentPort.postMessage({ok:true,pages});
 }finally{await parser.destroy();}
})().catch(error=>parentPort.postMessage({ok:false,code:error.code==='OCR_LIMIT'?'OCR_LIMIT':'OCR_INVALID_DOCUMENT'}));
