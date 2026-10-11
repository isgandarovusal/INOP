const PDFDocument=require('pdfkit'),{PDFParse}=require('pdf-parse');
async function document(draw){const doc=new PDFDocument(),chunks=[],ready=new Promise(r=>{doc.on('data',c=>chunks.push(c));doc.on('end',()=>r(Buffer.concat(chunks)));});draw(doc);doc.end();return ready;}
exports.scanned=async text=>{
 const original=await document(doc=>doc.font('/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf').fontSize(17).text(text));
 const p=new PDFParse({data:original,verbosity:0,isEvalSupported:false});let image;try{image=(await p.getScreenshot({partial:[1],desiredWidth:1200,imageBuffer:true,imageDataUrl:false})).pages[0].data;}finally{await p.destroy();}
 return document(doc=>doc.image(image,0,0,{width:612,height:792}));
};
