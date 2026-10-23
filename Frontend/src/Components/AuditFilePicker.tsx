import {useId, useRef, useState, type ChangeEventHandler} from 'react';
import type {TFunction} from 'i18next';
import type {AuditLoadStatus} from '../Hooks/useAuditResource';

// Presentation-side checks mirror the upload contract. The server still verifies
// file content, authority and storage availability independently.
const extensions = ['pdf','docx','xlsx','doc','xls','txt','csv','png','jpg','jpeg','gif','webp'];
export default function AuditFilePicker({label, accept, multiple=false, disabled, busy=false, status='ready', onChange, translate:t}: {
 translate:TFunction; label:string; accept?:string; multiple?:boolean; disabled?:boolean; busy?:boolean; status?:AuditLoadStatus; onChange:ChangeEventHandler<HTMLInputElement>;
}) {
 const id=useId();const input=useRef<HTMLInputElement>(null);
 const [name,setName]=useState('');const [invalid,setInvalid]=useState(false);
 const choose:ChangeEventHandler<HTMLInputElement>=event=>{
  const files=Array.from(event.currentTarget.files||[]);if(!files.length)return;
  const file=files[0];
  const ext=file.name.split('.').pop()?.toLowerCase()||'';
  const image=accept==='image/*';
  if(!multiple&&(files.some(f=>!f.size||f.size>5*1024*1024||!extensions.includes(f.name.split('.').pop()?.toLowerCase()||''))||(image&&!['png','jpg','jpeg','gif','webp'].includes(ext)))){
   setInvalid(true);event.currentTarget.value='';return;
  }
  setName(files.map(f=>f.name).join(', '));setInvalid(false);onChange(event);
 };
 return <div className="audit-file-picker" aria-busy={busy}>
  <span id={id+'-label'} className="audit-file-picker__label">{label}</span>
  <input ref={input} hidden type="file" multiple={multiple} accept={accept||extensions.map(e=>'.'+e).join(',')} disabled={disabled||busy} aria-labelledby={id+'-label'} onChange={choose}/>
  <button type="button" className="btn-secondary" disabled={disabled||busy} aria-labelledby={id+'-label '+id+'-button'} aria-describedby={id+'-hint '+id+'-name'} onClick={()=>input.current?.click()}><span id={id+'-button'}>{t(busy?'auditFiles.uploading':'auditFiles.choose')}</span></button>
  <span id={id+'-name'} className="audit-file-picker__name" role="status">{name||t('auditFiles.none')}</span>
  <small id={id+'-hint'}>{t(accept==='image/*'?'auditFiles.imageLimit':'auditFiles.limit')}</small>
  {invalid&&<p role="alert" className="audit-field-error">{t('auditFiles.invalid')}</p>}
  {name&&!invalid&&!['ready','loading'].includes(status)&&<p className="audit-field-error">{t('auditFiles.retry')}</p>}
 </div>;
}
