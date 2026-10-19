const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs/promises'),os=require('node:os'),path=require('node:path'),{spawnSync}=require('node:child_process');
const tables=require('../services/spreadsheet.service'),reader=require('./helpers/spreadsheet.cjs'),golden=require('./helpers/spreadsheetGolden.json');
test('ExcelJS preserves the original official SheetJS synthetic six-sheet semantic baseline',async()=>{
 const rows=golden.rows.map(row=>({...row,Date:new Date(row.Date)})),book=tables.utils.book_new();
 for(const name of golden.names)tables.utils.book_append_sheet(book,tables.utils.json_to_sheet(rows),name);
 require('../services/auditWorkbook.service').finalize(tables,book);
 const bytes=await tables.write(book),parsed=await reader.read(bytes);assert.deepEqual(parsed.SheetNames,golden.names);
 for(const name of golden.names){const actual=JSON.parse(JSON.stringify(reader.utils.sheet_to_json(parsed.Sheets[name])));for(let i=0;i<actual.length;i++){assert.equal(actual[i].Date,golden.rows[i].Date);assert.ok(Math.abs(Date.parse(actual[i].Date)-Date.parse(golden.expected[name][i].Date))<=1,'Excel serial dates preserve their timestamp within the original writer’s 1ms rounding');}assert.deepEqual(actual.map(({Date:date,...row})=>({...row,Date:Math.round(Date.parse(date)/1000)})),golden.expected[name].map(({Date:date,...row})=>({...row,Date:Math.round(Date.parse(date)/1000)})));for(const cell of Object.values(parsed.Sheets[name]))assert.equal(cell.f,undefined);}
 const native=new(require('exceljs').Workbook)();await native.xlsx.load(bytes);
 for(const sheet of native.worksheets){assert.ok(sheet.autoFilter);assert.equal(sheet.getColumn(1).width,25);assert.equal(sheet.getCell('E2').value,0);assert.equal(sheet.getCell('G2').value,false);assert.equal(sheet.getCell('I2').type,require('exceljs').ValueType.String);}
});
test('Mammoth patched CLI parser preserves help, HTML, Markdown and API DOCX extraction',async()=>{
 const root=await fs.mkdtemp(path.join(os.tmpdir(),'inop-mammoth-compat-'));
 try{const file=path.join(root,'synthetic.docx'),bytes=require('./helpers/cvDocuments.cjs').docx('Peşəkar HR audit');await fs.writeFile(file,bytes);
  const bin=path.resolve(__dirname,'../node_modules/mammoth/bin/mammoth');
  for(const args of [['--help'],[file],[file,'--output-format','markdown']]){const r=spawnSync(process.execPath,[bin,...args],{encoding:'utf8',timeout:10000});assert.equal(r.status,0,r.stderr);assert.match(r.stdout,args[0]==='--help'?/output-format/:/Peşəkar HR audit/);}
  assert.match((await require('mammoth').extractRawText({buffer:bytes})).value,/Peşəkar HR audit/);
 }finally{await fs.rm(root,{recursive:true});}
});
