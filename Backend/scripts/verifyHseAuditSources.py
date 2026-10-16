#!/usr/bin/env python3
"""Read-only verification of all HSE workbook rows, structural metadata and formulas.
Requires openpyxl in the QA environment. Original workbook files are not repository assets.
"""
import hashlib,json,re,sys
from pathlib import Path
import openpyxl
import xml.etree.ElementTree as E
if len(sys.argv)!=4:raise SystemExit('Usage: verifyHseAuditSources.py Restaurant.xlsx Office.xlsx Warehouse.xlsx')
sources=json.loads((Path(__file__).parents[1]/'config/hseAuditSources.json').read_text())
for kind,path in zip(['restaurant','office','warehouse'],sys.argv[1:]):
 source=next(s for s in sources if s['objectType']==kind);p=Path(path);assert hashlib.sha256(p.read_bytes()).hexdigest()==source['sha256']
 book=openpyxl.load_workbook(p,data_only=False);assert book.sheetnames==[s['name'] for s in source['sheets']];ids=[];actual_count=0
 for wi,sheet in enumerate(book,1):
  meta=source['sheets'][wi-1];assert sheet.sheet_state==meta['state'];assert [str(r) for r in sheet.merged_cells.ranges]==meta['merged'];assert [k for k,v in sheet.row_dimensions.items() if v.hidden]==meta['hiddenRows'];assert [k for k,v in sheet.column_dimensions.items() if v.hidden]==meta['hiddenCols']
  assert [{'range':str(v.sqref),'formula1':v.formula1,'type':v.type} for v in sheet.data_validations.dataValidation]==meta['validations']
  assert [{'range':str(k),'rules':[{'type':r.type,'formula':r.formula} for r in v]} for k,v in sheet.conditional_formatting._cf_rules.items()]==meta['conditionalFormats']
  assert [{'range':str(k.sqref),'rules':[E.tostring(r.to_tree(),encoding='unicode') for r in rules],'styles':[E.tostring(book._differential_styles.styles[r.dxfId].to_tree(),encoding='unicode') if r.dxfId is not None else '' for r in rules]} for k,rules in sheet.conditional_formatting._cf_rules.items()]==meta['conditionalFormattingXml']
  formulas=[{'cell':c.coordinate,'formula':c.value} for row in sheet for c in row if c.data_type=='f'];assert formulas==meta['formulas']
  expected=[r for r in range(1,sheet.max_row+1) if re.fullmatch('[A-Z][0-9]+',str(sheet[f'B{r}'].value or '')) and isinstance(sheet[f'D{r}'].value,str)]
  sections=[s for s in source['sections'] if s['worksheet']==sheet.title];rows=[q['sourceRow'] for s in sections for q in s['questions']];assert rows==expected,(kind,sheet.title,rows,expected)
  for sec in sections:
   assert sec['sourceTitle']==sheet[f"A{sec['sourceRow']}"].value
   next_head=next((r for r in range(sec['sourceRow']+1,sheet.max_row+1) if isinstance(sheet[f'A{r}'].value,str) and '│' in sheet[f'A{r}'].value),sheet.max_row+1)
   for q in sec['questions']:
    row=q['sourceRow'];assert sec['sourceRow']<row<next_head;assert q['sourceText']==sheet[f'D{row}'].value;assert q['sourceCode']==sheet[f'B{row}'].value;assert q['id']==f'hse-{kind}-w{wi}-r{row}';assert q['sourceCell']==f'D{row}';assert q['sourceFile']==p.name;assert q['category']==sheet[f'C{row}'].value
    original=sheet[f'E{row}'].value if kind!='restaurant' else None;assert q['originalRisk']==original;assert q['weight']=={'Kritik':5,'Mühüm':3,'Kiçik':1}.get(original);assert q['sourceRisk']=={'Kritik':'critical','Mühüm':'important','Kiçik':'small'}.get(original)
    assert q.get('formulas',{})=={c.column_letter:c.value for c in sheet[row] if c.data_type=='f'};assert q['required'] and q['answerType']=='hse-result';ids.append(q['id']);actual_count+=1
 assert len(ids)==len(set(ids));assert source['responses']==['compliant','noncompliant','na'];print(f'PASS {kind}: {len(book.sheetnames)} sheets / {len(source["sections"])} sections / {actual_count} criteria / {sum(len(s["formulas"]) for s in source["sheets"])} formulas; hash, original rows/order/text, risk/weights, merges/hidden/validation/conditional formats match')
print('PASS original workbooks read-only; no filled auditor names or sample answers imported')
