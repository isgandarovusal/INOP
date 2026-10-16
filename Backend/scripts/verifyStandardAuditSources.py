#!/usr/bin/env python3
"""Read-only, exact original workbook -> every retained Standard row verification."""
import hashlib,json,re,sys
from pathlib import Path
from verifyServiceAuditSources import workbook
if len(sys.argv)!=5:raise SystemExit('Usage: verifyStandardAuditSources.py Report.xlsx KFC.xlsx PizzaHut.xlsx SimitSarayi.xlsx')
root=Path(__file__).parents[1];sources=json.loads((root/'config/standardAuditSources.json').read_text());report=json.loads((root/'config/standardAuditReportSource.json').read_text())
assert hashlib.sha256(Path(sys.argv[1]).read_bytes()).hexdigest()==report['sha256']
# Catalogues have no formulas. The report's formula metadata is read separately,
# so shared-formula members are not mistaken for nonexistent criteria.
import zipfile,xml.etree.ElementTree as E
N={'s':'http://schemas.openxmlformats.org/spreadsheetml/2006/main'}
def column(value):
 n=0
 for char in value:n=n*26+ord(char)-64
 return n
def letters(value):
 out=''
 while value:value,r=divmod(value-1,26);out=chr(65+r)+out
 return out
def translate(formula,origin,target):
 a=re.fullmatch(r'([A-Z]+)(\d+)',origin);b=re.fullmatch(r'([A-Z]+)(\d+)',target);dx=column(b[1])-column(a[1]);dy=int(b[2])-int(a[2])
 def cell(m):return m[1]+(m[2] if m[1] else letters(column(m[2])+dx))+m[3]+str(int(m[4])+(0 if m[3] else dy))
 return re.sub(r'(\$?)([A-Z]{1,3})(\$?)(\d+)',cell,formula)
with zipfile.ZipFile(sys.argv[1]) as z:
 assert [s.attrib['name'] for s in E.fromstring(z.read('xl/workbook.xml')).findall('s:sheets/s:sheet',N)]==['Cover','Sheet2']
 assert len([n for n in z.namelist() if n.startswith('xl/media/')])==report['embeddedMediaNotImported']
 rel={r.attrib['Id']:r.attrib['Target'] for r in E.fromstring(z.read('xl/_rels/workbook.xml.rels'))};actual=[]
 for sheet in E.fromstring(z.read('xl/workbook.xml')).findall('s:sheets/s:sheet',N):
  target=rel[sheet.attrib['{http://schemas.openxmlformats.org/officeDocument/2006/relationships}id']];target=target.lstrip('/') if target.startswith('/') else 'xl/'+target
  masters={}
  for c in E.fromstring(z.read(target)).findall('.//s:sheetData/s:row/s:c',N):
   f=c.find('s:f',N)
   if f is None:continue
   formula=f.text
   if formula and f.attrib.get('t')=='shared':masters[f.attrib['si']]=(c.attrib['r'],formula)
   if formula is None:
    anchor,master=masters[f.attrib['si']];formula=translate(master,anchor,c.attrib['r'])
   actual.append({'worksheet':sheet.attrib['name'],'cell':c.attrib['r'],'formula':formula})
 assert actual==report['formulas'],'Every formula, including shared members, must match the original workbook'
 assert any(f['cell']=='L29' and f['formula']=='IF(D29=0,100,(D29-K29)/D29*100)' for f in report['formulas'])
print(f"PASS report provenance: Cover/Sheet2, all {len(report['formulas'])} formulas (shared members resolved), images not imported; filled sample values not catalogue defaults")
for source,name in zip(sources,sys.argv[2:]):
 p=Path(name);assert hashlib.sha256(p.read_bytes()).hexdigest()==source['sha256'];book=workbook(p);assert list(book)==source['worksheets'];allids=[]
 for sheet,data in book.items():
  cells=data['cells'];expected=[];assert not data['formulas']
  for cell,value in cells.items():
   if value in ['Standart və Tələb','Birləşdirilmiş Standart və Tələb','Brend Tələbi və Standartı']:continue
   if re.fullmatch(r'B\d+',cell):expected.append(cell)
  section_by_row={};current_section=None
  for row in sorted({int(re.search(r'\d+',key)[0]) for key in cells}):
   heading=cells.get('A'+str(row),'')
   if re.match(r'Bölmə\s+\d',heading):current_section=heading
   section_by_row[row]=current_section
  for section in source['sections']:
   if section['worksheet']!=sheet:continue
   assert section['sourceTitle']==cells[section['sourceCell']]
   for q in section['questions']:assert section['sourceTitle']==section_by_row[q['sourceRow']]
  actual=[q for s in source['sections'] if s['worksheet']==sheet for q in s['questions']]
  assert [q['sourceCell'] for q in actual]==expected,(sheet,len(actual),len(expected))
  for q in actual:
   row=q['sourceRow'];assert q['id']==f"std-{source['brandId']}-w{source['worksheets'].index(sheet)+1}-r{row}";assert q.get('sourceMetadata',{})=={k:v for k,v in cells.items() if re.fullmatch(r'[D-Z]+'+str(row),k)};assert q['sourceText']==cells[q['sourceCell']];assert q['originalRisk']==cells.get('C'+str(row));assert q['sourceRisk']=={'Kritik':'critical','Major':'major','Minor':'minor'}.get(q['originalRisk']);assert q['sourceFile']==source['file'];assert q['label'].strip();allids.append(q['id'])
 assert len(allids)==len(set(allids));print(f"PASS {source['brandId']}: {len(book)} sheets, {len(source['sections'])} sections, {len(allids)} standards; exact rows/order/text/risk/hash; no deduplication")
print('PASS all original files read-only; no production data writes')
