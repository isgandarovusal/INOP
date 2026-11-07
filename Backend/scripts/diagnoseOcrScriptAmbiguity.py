"""Bounded synthetic OCR diagnostic; alternatives are never extraction or qualifications."""
import csv,hashlib,io,json,os,resource,subprocess,tempfile,time
from pathlib import Path
from PIL import Image,ImageDraw,ImageFont
root=Path(tempfile.mkdtemp(prefix='inop-ocr-crop-'));models=Path(tempfile.gettempdir())/'inop-hr-ocr-models'
expected={'aze':'a365310848aecb739f19369cb3831d4660fcd9345d798e91a3042455f9ccc9f0','rus':'e16e5e036cce1d9ec2b00063cf8b54472625b9e14d893a169e2b0dedeb4df225','eng':'7d4322bd2a7749724879683fc3912cb542f19906c83bcc1a52132556427170b2'}
for lang,digest in expected.items():assert hashlib.sha256((models/(lang+'.traineddata')).read_bytes()).hexdigest()==digest
run=lambda args:subprocess.run(args,check=True,timeout=15,capture_output=True,text=True)
# Regenerate the repository's existing synthetic layout. The lost original PDF is NOT recovered.
fixtures=json.loads(run(['python3',str(Path(__file__).with_name('benchmarkPdfOcr.py')),'fixtures',str(root)]).stdout)
rows=[];start=time.perf_counter()
for fixture in fixtures:
 if fixture['kind']!='scan':continue
 image=root/(fixture['language']+'.png');before=hashlib.sha256(image.read_bytes()).hexdigest();out=root/(fixture['language']+'-primary')
 run(['tesseract',str(image),str(out),'--tessdata-dir',str(models),'-l','aze+eng+rus','--psm','6','-c','tessedit_create_tsv=1','-c','tessedit_create_txt=1'])
 raw=out.with_suffix('.txt').read_text();alternatives=[]
 for word in csv.DictReader(io.StringIO(out.with_suffix('.tsv').read_text()),delimiter='\t'):
  token=word['text'].strip('.,:;!?()');ambiguous=set('АВСЕНКМОРТХУІ')
  if not (3<=len(token)<=12 and any(c in ambiguous for c in token) and all(c in ambiguous or 'A'<=c<='Z' for c in token)):continue
  if len(alternatives)>=4:break
  x,y,w,h=[int(word[k]) for k in ('left','top','width','height')];im=Image.open(image);crop=im.crop((max(0,x-4),max(0,y-4),min(im.width,x+w+4),min(im.height,y+h+4)));crop=crop.resize((crop.width*3,crop.height*3));file=root/(fixture['language']+'-crop-'+str(len(alternatives))+'.png');crop.save(file)
  at=time.perf_counter();alt=run(['tesseract',str(file),'stdout','--tessdata-dir',str(models),'-l','eng','--psm','7']).stdout.strip()
  alternatives.append({'primaryToken':token,'alternative':alt,'confidence':float(word['conf']),'box':[x,y,w,h],'latencyMs':round((time.perf_counter()-at)*1000),'authoritative':False,'requiresHumanReview':True})
 assert hashlib.sha256(image.read_bytes()).hexdigest()==before
 rows.append({'language':fixture['language'],'sourceImageSha256':before,'regeneratedPdfSha256':fixture['sha256'],'markers':sum(s in raw for s in fixture['expected']),'expectedMarkers':4,'primaryUnchanged':True,'alternatives':alternatives})
# Adverse content remains in the full primary transcript; cropped words MUST NOT become qualifications.
neg=Image.new('RGB',(1600,260),'white');draw=ImageDraw.Draw(neg);font=ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf',36)
for i,line in enumerate(['No НАССР certification','Нет сертификата НАССР','HACCP sertifikatı yoxdur']):draw.text((40,20+i*70),line,font=font,fill='black')
f=root/'adverse.png';neg.save(f);adverse=run(['tesseract',str(f),'stdout','--tessdata-dir',str(models),'-l','aze+eng+rus','--psm','6']).stdout
assert 'No' in adverse and 'Нет' in adverse and 'yoxdur' in adverse
report={'syntheticOnly':True,'semanticInference':False,'originalPinnedScanRecovered':False,'engine':run(['tesseract','--version']).stdout.splitlines()[0],'models':expected,'results':rows,'adverseStatementsPreserved':True,'automaticQualification':False,'primaryTranscriptionCorrected':False,'elapsedMs':round((time.perf_counter()-start)*1000),'pythonPeakRssMiB':round(resource.getrusage(resource.RUSAGE_SELF).ru_maxrss/1024,2),'childPeakRssMiB':round(resource.getrusage(resource.RUSAGE_CHILDREN).ru_maxrss/1024,2),'artifacts':str(root)}
(root/'diagnostic.json').write_text(json.dumps(report,ensure_ascii=False,indent=2));print(json.dumps(report,ensure_ascii=False))
