const {auditError}=require('./auditTransaction.service');
const MAX_CELLS=250000,MAX_TEXT_BYTES=32*1024*1024;
// XLSX strings are explicit string cells, never formulas/hyperlinks. Keep exact text.
function finalize(XLSX,book){
 let count=0,bytes=0;const overflow=[];
 for(const name of book.SheetNames){const sheet=book.Sheets[name];
  for(const [address,cell]of Object.entries(sheet)){
   if(address.startsWith('!'))continue;if(++count>MAX_CELLS)throw auditError(422,'Audit workbook exceeds the safe export limit.');
   delete cell.f;delete cell.l;
   if(typeof cell.v==='string'){bytes+=Buffer.byteLength(cell.v);if(bytes>MAX_TEXT_BYTES)throw auditError(422,'Audit workbook text exceeds the safe export limit.');cell.t='s';
    if(cell.v.length>32000){const text=cell.v;cell.v='See Long Text: '+name+'!'+address;for(let i=0;i<text.length;i+=32000)overflow.push({Sheet:name,Cell:address,Part:1+i/32000,Text:text.slice(i,i+32000)});}
   }
  }
  const range=sheet['!ref']&&XLSX.utils.decode_range(sheet['!ref']);
  if(range){sheet['!cols']=Array.from({length:range.e.c+1},(_,col)=>({wch:col===0?25:38}));sheet['!rows']=[{hpt:30}];if(range.e.r>0)sheet['!autofilter']={ref:sheet['!ref']};}
 }
 if(overflow.length)XLSX.utils.book_append_sheet(book,XLSX.utils.json_to_sheet(overflow),'Long Text');
 return {cells:count,textBytes:bytes,overflowParts:overflow.length};
}
function csvText(value){const text=value==null?'':String(value);let start=0;while(start<text.length&&(text.charCodeAt(start)<=32||/\s/.test(text[start])))start++;return /^[=+@-]/.test(text.slice(start))?"'"+text:text;}
module.exports={finalize,csvText,MAX_CELLS,MAX_TEXT_BYTES};
