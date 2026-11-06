"""Synthetic PDF-only experiment. No installation, providers or network."""
import sys,json,hashlib,time,resource,socket
from pathlib import Path
mode,folder=sys.argv[1:3];root=Path(folder).resolve()
if not str(root).startswith('/tmp/'):raise SystemExit('Temporary synthetic fixtures only')
phrases={'en':['Experience','No forklift certificate','Training','HACCP'],'az':['İş təcrübəsi','Forklift sertifikatı yoxdur','Təlim','HACCP'],'ru':['Опыт работы','Нет сертификата погрузчика','Обучение','HACCP']}
if mode=='fixtures':
 from reportlab.pdfgen import canvas
 from reportlab.pdfbase import pdfmetrics
 from reportlab.pdfbase.ttfonts import TTFont
 from reportlab.lib.utils import ImageReader
 import subprocess
 pdfmetrics.registerFont(TTFont('Synthetic','/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf'))
 rows=[]
 for language,expected in phrases.items():
  file=root/(language+'.pdf');c=canvas.Canvas(str(file),pagesize=(595,842));c.setFont('Synthetic',18)
  for i,text in enumerate(expected):c.drawString(50,760-i*60,text)
  c.line(45,550,540,550);c.line(45,610,540,610);c.line(250,550,250,610);c.showPage();c.save()
  subprocess.run(['pdftoppm','-singlefile','-scale-to','1400','-png',str(file),str(root/language)],check=True,stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL,timeout=15)
  scan=root/(language+'-scan.pdf');c=canvas.Canvas(str(scan),pagesize=(595,842));c.drawImage(ImageReader(str(root/(language+'.png'))),0,0,width=595,height=842);c.showPage();c.save()
  for name,path in [('vector',file),('scan',scan)]:rows.append({'language':language,'kind':name,'file':str(path),'expected':expected,'sha256':hashlib.sha256(path.read_bytes()).hexdigest()})
 (root/'manifest.json').write_text(json.dumps(rows,ensure_ascii=False));print(json.dumps(rows));sys.exit()
socket.socket.connect=lambda *a,**k:(_ for _ in ()).throw(RuntimeError('OFFLINE_ONLY'))
import importlib.metadata as md
assert md.version('markitdown')=='0.1.9'
import importlib.util
assert md.version('magika')=='1.0.3'
model=Path(importlib.util.find_spec('magika').origin).parent/'models/standard_v3_3/model.onnx'
assert hashlib.sha256(model.read_bytes()).hexdigest()=='fe2d2eb49c5f88a9e0a6c048e15d6ffdf86235519c2afc535044de433169ec8c'
import onnxruntime
onnxruntime.disable_telemetry_events()
from markitdown import MarkItDown
start=time.perf_counter();converter=MarkItDown(enable_plugins=False);init=(time.perf_counter()-start)*1000;results=[]
for row in json.loads((root/'manifest.json').read_text()):
 file=Path(row['file']);assert file.parent==root and hashlib.sha256(file.read_bytes()).hexdigest()==row['sha256']
 start=time.perf_counter();text=converter.convert_local(file).text_content
 results.append({'language':row['language'],'kind':row['kind'],'sourceHash':row['sha256'],'markers':sum(p in text for p in row['expected']),'expectedMarkers':4,'latencyMs':round((time.perf_counter()-start)*1000,2),'characters':len(text),'structuredTables':False,'pageAttribution':False})
invalid=root/'invalid.pdf';invalid.write_bytes(b'%PDF-Synthetic invalid')
try:converter.convert_local(invalid);rejected=False
except Exception:rejected=True
print(json.dumps({'tool':'markitdown-0.1.9','results':results,'invalidPdfRejected':rejected,'initMs':round(init,2),'peakRssMiB':resource.getrusage(resource.RUSAGE_SELF).ru_maxrss/1024,'networkDisabled':True,'semanticInference':False}))
