"""Offline verification only. Usage: python scripts/verifyHrAuditSources.py FILE.xlsx ...
Reads supplied workbooks; never imports them into MongoDB or copies them to Git.
Uses only the Python standard library. Source text is not logged.
"""
import hashlib,json,sys,zipfile
from pathlib import Path
from xml.etree import ElementTree as ET
NS={'s':'http://schemas.openxmlformats.org/spreadsheetml/2006/main','r':'http://schemas.openxmlformats.org/officeDocument/2006/relationships'}
sources=json.loads((Path(__file__).resolve().parents[1]/'config/hrAuditSources.json').read_text())
paths={hashlib.sha256(Path(p).read_bytes()).hexdigest():Path(p) for p in sys.argv[1:]}
assert len(paths)==3,'Supply the three original workbooks.'
for source in sources:
 p=paths[source['sha256']]
 with zipfile.ZipFile(p) as z:
  assert sum(i.file_size for i in z.infolist())<50_000_000,'Workbook expansion exceeds verification limit'
  strings=[]
  if 'xl/sharedStrings.xml' in z.namelist():
   strings=[''.join(si.itertext()) for si in ET.fromstring(z.read('xl/sharedStrings.xml')).findall('s:si',NS)]
  rels={n.attrib['Id']:n.attrib['Target'].lstrip('/') for n in ET.fromstring(z.read('xl/_rels/workbook.xml.rels'))}
  sheets={}
  for n in ET.fromstring(z.read('xl/workbook.xml')).findall('s:sheets/s:sheet',NS):
   target=rels[n.attrib['{'+NS['r']+'}id']];target=target if target.startswith('xl/') else 'xl/'+target
   cells={}
   for c in ET.fromstring(z.read(target)).findall('.//s:sheetData/s:row/s:c',NS):
    f=c.find('s:f',NS);v=c.find('s:v',NS)
    if f is not None:value='='+f.text
    elif c.attrib.get('t')=='s':value=strings[int(v.text)] if v is not None else None
    elif c.attrib.get('t')=='inlineStr':value=''.join(c.find('s:is',NS).itertext())
    else:value=v.text if v is not None else None
    if value is not None:cells[c.attrib['r']]=value
   sheets[n.attrib['name']]=cells
  assert list(sheets)==source['worksheets']
  primary=sheets[source['worksheet']];count=0
  for section in source['sections']:
   row=section['id'].rsplit('s',1)[1];col='C' if source['brandId']=='kfc' else 'B'
   assert primary[col+row]==section['title']
   for q in section['questions']:
    assert primary[q['sourceCell']]==q['label'],q['id']
    if source['brandId']!='simit-sarayi':
     note=('D' if col=='C' else 'C')+q['sourceCell'][1:]
     assert primary.get(note,'')==q['guidance'],q['id']
    count+=1
  actual_formulas=[(name,cell,value) for name,cells in sheets.items() for cell,value in cells.items() if value.startswith('=')]
  assert actual_formulas==[(f['sheet'],f['cell'],f['formula']) for f in source['formulas']]
  for guide in source['interviewGuide']:assert list(sheets[guide['sheet']].items())==[(c['cell'],c['text']) for c in guide['cells']]
  print(f"PASS {source['brandId']}: {len(sheets)} worksheet(s), {len(source['sections'])} sections, {count} exact criteria; formulas and guidance match")
print('PASS original source SHA-256, source cell/order/text, all formulas and secondary worksheet content; writes=0')
