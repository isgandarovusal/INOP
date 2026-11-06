"""Offline, synthetic-only converter benchmark. Optional reviewed runtimes, no install."""
import sys, json, time, resource, hashlib, socket, importlib.metadata
from pathlib import Path
mode, directory = sys.argv[1:3]
root = Path(directory).resolve()
if not str(root).startswith('/tmp/'):
    raise SystemExit('Synthetic benchmark output must be in /tmp')
root.mkdir(parents=True, exist_ok=True)
phrases = {'en': ('Experience', 'No forklift certificate', 'Training'), 'az': ('İş təcrübəsi', 'Forklift sertifikatı yoxdur', 'Təlim'), 'ru': ('Опыт работы', 'Нет сертификата погрузчика', 'Обучение')}
if mode == 'fixtures':
    from docx import Document
    rows=[]
    for lang, (heading, negative, table) in phrases.items():
        doc=Document(); doc.add_heading(heading, 1); doc.add_paragraph(negative); doc.add_heading('HACCP', 2)
        t=doc.add_table(rows=2, cols=2); t.cell(0,0).text='Skill'; t.cell(0,1).text='Evidence'; t.cell(1,0).text='HACCP'; t.cell(1,1).text=table
        file=root/(lang+'.docx'); doc.save(file); rows.append({'lang':lang,'file':str(file),'expected':[heading,negative,table,'HACCP'],'sha256':hashlib.sha256(file.read_bytes()).hexdigest()})
    (root/'manifest.json').write_text(json.dumps(rows,ensure_ascii=False)); print(json.dumps(rows,ensure_ascii=False));sys.exit()
if mode not in ['docling','markitdown']:
    raise SystemExit('Unknown converter')
# No provider, URL or model download may occur in this experiment.
def offline(*a, **k): raise RuntimeError('BENCHMARK_NETWORK_DISABLED')
socket.socket.connect=offline;socket.create_connection=offline
start=time.perf_counter()
if mode=='docling':
    assert importlib.metadata.version('docling-slim')=='2.148.0'
    from docling.document_converter import DocumentConverter,InputFormat
    converter=DocumentConverter(allowed_formats=[InputFormat.DOCX]);version='docling-slim-2.148.0'
else:
    assert importlib.metadata.version('markitdown')=='0.1.9'
    assert importlib.metadata.version('magika')=='1.0.3'
    import importlib.util
    model=Path(importlib.util.find_spec('magika').origin).parent/'models/standard_v3_3/model.onnx'
    assert hashlib.sha256(model.read_bytes()).hexdigest()=='fe2d2eb49c5f88a9e0a6c048e15d6ffdf86235519c2afc535044de433169ec8c'
    import onnxruntime
    onnxruntime.disable_telemetry_events()
    from markitdown import MarkItDown
    converter=MarkItDown(enable_plugins=False);version='markitdown-0.1.9'
init=(time.perf_counter()-start)*1000;rows=[]
for item in json.loads((root/'manifest.json').read_text()):
    file=Path(item['file']); assert file.parent==root and hashlib.sha256(file.read_bytes()).hexdigest()==item['sha256']
    at=time.perf_counter()
    if mode=='docling':
        result=converter.convert(file);text=result.document.export_to_markdown();tables=len(result.document.tables);provenance=sum(bool(t.prov) for t in result.document.texts)
    else:
        result=converter.convert_local(file);text=result.text_content;tables=int('| Skill' in text);provenance=0
    rows.append({'language':item['lang'],'sourceHash':item['sha256'],'tokensPreserved':[p in text for p in item['expected']],'tables':tables,'itemsWithPageProvenance':provenance,'latencyMs':round((time.perf_counter()-at)*1000,2),'characters':len(text)})
invalid=root/'invalid.docx';invalid.write_bytes(b'Synthetic invalid zip')
try:
    result=converter.convert(invalid) if mode=='docling' else converter.convert_local(invalid)
    invalid_rejected=False
except Exception: invalid_rejected=True
print(json.dumps({'tool':version,'initMs':round(init,2),'peakRssMiB':round(resource.getrusage(resource.RUSAGE_SELF).ru_maxrss/1024,2),'results':rows,'invalidDocxRejected':invalid_rejected,'networkDisabled':True,'semanticInference':False}))
