import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import AuditResourceState from './AuditResourceState';
import type { AuditLoadStatus } from '../Hooks/useAuditResource';

export interface DraftInput { brandId:string; restaurantId:string; date:string; objectType?:string }
interface Target { id:string; name:string; brandId?:string; objectType?:string }
interface Source { brandId?:string; brandName?:string; objectType?:string; templateId:string|null }
export default function AuditDraftForm({value,onChange,onSubmit,options,optionsStatus,sourceStatus,sources,busy,label,retryOptions,hse=false,allowedObjectTypes}: {
 value:DraftInput; onChange:(v:DraftInput)=>void; onSubmit:()=>void; options:Target[]; optionsStatus:AuditLoadStatus; sourceStatus:AuditLoadStatus; sources:Source[]; busy:boolean; label:string; retryOptions:()=>void; hse?:boolean; allowedObjectTypes?:readonly string[];
}) {
 const {t}=useTranslation();const [errors,setErrors]=useState<Record<string,string>>({});
 const restaurant=!hse||value.objectType==='restaurant';
 const targets=options.filter(o=>(!hse||o.objectType===value.objectType)&&(!restaurant||o.brandId===value.brandId));
 const selectedSource=sources.find(s=>hse?s.objectType===value.objectType:s.brandId===value.brandId);
 const change=(next:DraftInput)=>{setErrors({});onChange(next)};
 const submit=(e:React.FormEvent)=>{e.preventDefault();if(busy)return;const next:Record<string,string>={};
  if(hse&&!value.objectType)next.objectType=t('auditFlow.chooseType');
  if(restaurant&&!value.brandId)next.brandId=t('auditFlow.chooseBrand');
  if(!value.restaurantId||!targets.some(o=>o.id===value.restaurantId))next.restaurantId=t('auditFlow.chooseTarget');
  if(!/^\d{4}-\d{2}-\d{2}$/.test(value.date)||!Number.isFinite(Date.parse(value.date))||new Date(value.date).toISOString().slice(0,10)!==value.date)next.date=t('auditFlow.validDate');
  if(optionsStatus!=='ready'||sourceStatus!=='ready')next.form=t('auditFlow.waitForData');
  else if(!selectedSource?.templateId)next.form=t('auditFlow.templateRequired');
  setErrors(next);if(Object.keys(next).length){const field=Object.keys(next)[0];document.getElementById('audit-draft-'+field)?.focus();return;}onSubmit();
 };
 const fieldError=(field:string)=>errors[field]&&<span className="audit-field-error" id={'audit-draft-'+field+'-error'}>{errors[field]}</span>;
 const attrs=(field:string)=>({id:'audit-draft-'+field,'aria-invalid':Boolean(errors[field]),'aria-describedby':errors[field]?'audit-draft-'+field+'-error':undefined});
 return <form className="audit-draft-form" noValidate onSubmit={submit} aria-busy={busy}>
  {hse&&optionsStatus==='ready'&&allowedObjectTypes?.length===0&&<p className="audit-flow-notice" role="status">{t('auditFlow.noTargets')}</p>}
  <div className="audit-filter-grid">
   {hse&&<label>{t('hseAudit.objectType')}<select required {...attrs('objectType')} value={value.objectType||''} onChange={e=>change({...value,objectType:e.target.value,brandId:'',restaurantId:''})}><option value="">{t('auditFlow.choose')}</option>{(allowedObjectTypes||sources.map(s=>s.objectType!)).map(k=><option key={k} value={k}>{t(`hseAudit.kinds.${k}`)}</option>)}</select>{fieldError('objectType')}</label>}
   {restaurant&&<label>{t('auditFoundation.brand')}<select required {...attrs('brandId')} disabled={hse?optionsStatus!=='ready':sourceStatus!=='ready'} value={value.brandId} onChange={e=>change({...value,brandId:e.target.value,restaurantId:''})}><option value="">{t('auditFlow.choose')}</option>{(hse?[...new Set(options.filter(o=>o.objectType==='restaurant').map(o=>o.brandId!))].map(id=>[id,id==='kfc'?'KFC':id==='pizza-hut'?'Pizza Hut':'Simit Sarayı']):sources.map(s=>[s.brandId!,s.brandName||s.brandId!])).map(([id,name])=><option key={id} value={id}>{name}</option>)}</select>{fieldError('brandId')}</label>}
   <label>{t(hse?'hseAudit.object':'navigation.restaurants')}<select required {...attrs('restaurantId')} value={value.restaurantId} disabled={optionsStatus!=='ready'||(restaurant&&!value.brandId)||(hse&&!value.objectType)} onChange={e=>change({...value,restaurantId:e.target.value})}><option value="">{t('auditFlow.choose')}</option>{targets.map(o=><option key={o.id} value={o.id}>{o.name}</option>)}</select>{fieldError('restaurantId')}</label>
   <label>{t('hrAudit.date')}<input required {...attrs('date')} type="date" value={value.date} onChange={e=>change({...value,date:e.target.value})}/>{fieldError('date')}</label>
  </div>
  {optionsStatus!=='ready'?<AuditResourceState status={optionsStatus} retry={retryOptions}/>:((restaurant&&(value.brandId||(hse&&value.objectType==='restaurant'&&!options.some(o=>o.objectType==='restaurant'))))||(!restaurant&&value.objectType))&&!targets.length&&<p className="audit-flow-notice" role="status">{t('auditFlow.noTargets')}</p>}
  {sourceStatus==='ready'&&selectedSource&&<p className="audit-flow-notice" role="status">{t(selectedSource.templateId?'auditFlow.templateActive':'auditFlow.sourceAvailable')}{!selectedSource.templateId&&<> {t('auditFlow.templateNextStep')}</>}</p>}
  {errors.form&&<p className="audit-field-error" role="alert">{errors.form}</p>}
  <button className="btn-primary" type="submit" disabled={busy||optionsStatus==='loading'||sourceStatus==='loading'}>{busy?t('auditFlow.creating'):label}</button>
 </form>;
}
