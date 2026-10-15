#!/usr/bin/env python3
"""Read-only verification: original workbook -> every source row -> Service criterion/reference."""
import hashlib,json,re,sys,zipfile
from pathlib import Path
from xml.etree import ElementTree as E
N={'s':'http://schemas.openxmlformats.org/spreadsheetml/2006/main'}
def workbook(path):
 with zipfile.ZipFile(path) as z:
  strings=[''.join(si.itertext()) for si in E.fromstring(z.read('xl/sharedStrings.xml')).findall('s:si',N)] if 'xl/sharedStrings.xml' in z.namelist() else []
  rel={r.attrib['Id']:r.attrib['Target'] for r in E.fromstring(z.read('xl/_rels/workbook.xml.rels'))};out={}
  for sheet in E.fromstring(z.read('xl/workbook.xml')).findall('s:sheets/s:sheet',N):
   target=rel[sheet.attrib['{http://schemas.openxmlformats.org/officeDocument/2006/relationships}id']];target=target.lstrip('/') if target.startswith('/') else 'xl/'+target
   tree=E.fromstring(z.read(target));cells={};formulas=[]
   for c in tree.findall('.//s:sheetData/s:row/s:c',N):
    v=c.find('s:v',N);f=c.find('s:f',N);value=v.text if v is not None else ''.join(c.find('s:is',N).itertext()) if c.find('s:is',N)is not None else ''
    if c.attrib.get('t')=='s':value=strings[int(value)]
    if f is not None:formulas.append((c.attrib['r'],'='+f.text))
    if value:cells[c.attrib['r']]=value
   out[sheet.attrib['name']]={'cells':cells,'formulas':formulas}
  return out
if __name__=='__main__':
 if len(sys.argv)!=4:raise SystemExit('Usage: verifyServiceAuditSources.py KFC.xlsx PizzaHut.xlsx SimitSarayi.xlsx')
 sources=json.loads((Path(__file__).parents[1]/'config/serviceAuditSources.json').read_text())
 for source,name in zip(sources,sys.argv[1:]):
  path=Path(name);assert hashlib.sha256(path.read_bytes()).hexdigest()==source['sha256'];book=workbook(path);assert list(book)==source['worksheets'];sheet=book[source['worksheet']];cells=sheet['cells'];assert not sheet['formulas'] and not source['formulas']
  expected=[];sections=[]
  for cell,value in cells.items():
   if cell.startswith('A') and re.fullmatch(r'\d+\.?',value) and 'B'+cell[1:] in cells:sections.append('B'+cell[1:])
   if cell.startswith('A') and re.fullmatch(r'\d+\.\d+',value) and 'B'+cell[1:] in cells:expected.append('B'+cell[1:])
  assert sections==[s['sourceCell'] for s in source['sections']]
  for index,section in enumerate(source['sections']):
   assert cells[section['sourceCell']]==section['sourceTitle'];assert section['title'].strip()
   lower=int(section['sourceCell'][1:]);upper=int(source['sections'][index+1]['sourceCell'][1:]) if index+1<len(source['sections']) else 10**9
   for q in section['questions']:
    assert lower<int(q['sourceCell'][1:])<upper
    assert cells[q['sourceCell']]==q['sourceText'];assert cells['A'+q['sourceCell'][1:]]==q['sourceNumber'];assert q['label'].strip();assert q['answerType']=='service-score'
  for row in source['referenceRows']:assert cells[row['sourceCell']]==row['sourceText'];assert row['kind']=='summary-no-formula'
  references={r['sourceCell'] for r in source['referenceRows']}
  assert [q['sourceCell'] for s in source['sections'] for q in s['questions']]==[c for c in expected if c not in references]
  actual=[q['sourceCell'] for s in source['sections'] for q in s['questions']]+[r['sourceCell'] for r in source['referenceRows']]
  assert len(actual)==len(set(actual)) and set(expected)==set(actual)
  for column,label in source['answerColumns'].items():assert label in [v for k,v in cells.items() if k.startswith(column)]
  assert any('≥ 90%'in v for v in cells.values())
  print(f"PASS {source['brandId']}: {len(book)} worksheet, {len(sections)} sections, {len(actual)-len(source['referenceRows'])} criteria, {len(source['referenceRows'])} summary reference; exact source cells/text/order/hash")
 print('PASS: all source numbered rows accounted for; original files unchanged; writes=0')
