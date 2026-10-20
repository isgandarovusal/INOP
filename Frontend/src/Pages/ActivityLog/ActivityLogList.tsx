import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import PageHeader from '../../Components/PageHeader';
import SearchInput from '../../Components/SearchInput';
import PageState from '../../Components/PageState';
import Badge from '../../Components/Badge';
import { getActivityLogs } from '../../Services/activityLogService';
import type { ActivityLogEntry } from '../../Types/core';
export default function ActivityLogList(){
 const {t,i18n}=useTranslation();const [logs,setLogs]=useState<ActivityLogEntry[]>([]),[loading,setLoading]=useState(true),[error,setError]=useState(false),[revision,setRevision]=useState(0);
 const [query,setQuery]=useState(''),[action,setAction]=useState(''),[actor,setActor]=useState(''),[from,setFrom]=useState(''),[to,setTo]=useState('');
 useEffect(()=>{let active=true;getActivityLogs().then(v=>{if(active){setLogs(v);setError(false)}}).catch(()=>{if(active)setError(true)}).finally(()=>{if(active)setLoading(false)});return()=>{active=false};},[revision]);
 const filtered=useMemo(()=>logs.filter(l=>(!action||l.action===action)&&(!actor||l.userId===actor)&&(!from||new Date(l.createdAt)>=new Date(from+'T00:00:00'))&&(!to||new Date(l.createdAt)<=new Date(to+'T23:59:59.999'))&&`${l.description} ${l.userName} ${l.entityType}`.toLocaleLowerCase().includes(query.toLocaleLowerCase())),[logs,query,action,actor,from,to]);
 const retry=()=>{setLoading(true);setRevision(v=>v+1)};
 return <div className="administration-page"><PageHeader title={t('activityLog.title')} subtitle={t('adminUI.logLimit')}/>
 <div className="filter-bar administration-filters"><SearchInput value={query} onChange={setQuery} placeholder={t('activityLog.search')}/>
 <select className="input-field" aria-label={t('adminUI.eventType')} value={action} onChange={e=>setAction(e.target.value)}><option value="">{t('adminUI.eventType')}</option>{[...new Set(logs.map(l=>l.action))].sort().map(a=><option key={a} value={a}>{t(`adminUI.actions.${a}`,{defaultValue:a})}</option>)}</select>
 <select className="input-field" aria-label={t('users.name')} value={actor} onChange={e=>setActor(e.target.value)}><option value="">{t('adminUI.allUsers')}</option>{[...new Map(logs.filter(l=>l.userId).map(l=>[l.userId,l.userName])).entries()].map(([id,name])=><option key={id} value={id}>{name}</option>)}</select>
 <label className="admin-help">{t('adminUI.from')}<input className="input-field" type="date" value={from} onChange={e=>setFrom(e.target.value)}/></label><label className="admin-help">{t('adminUI.to')}<input className="input-field" type="date" value={to} min={from} onChange={e=>setTo(e.target.value)}/></label>
 </div>
 <div className="detail-card">{loading?<PageState type="loading"/>:error?<PageState type="error" title={t('auth.somethingWentWrong')} action={<button className="btn-secondary" onClick={retry}>{t('common.retry')}</button>}/>:!filtered.length?<PageState type="empty" title={t('activityLog.noSearchResults')}/>:<div className="recent-list">{filtered.map(log=><article className="recent-row" key={log.id}><div className="recent-row__info"><p className="recent-row__title">{log.description}</p><div className="admin-help"><Badge tone="neutral">{t(`adminUI.entities.${log.entityType.toLowerCase()}`,{defaultValue:log.entityType})}</Badge> · {log.userName} · {t(`adminUI.actions.${log.action}`,{defaultValue:log.action})}</div></div><time className="recent-row__time" dateTime={log.createdAt}>{new Date(log.createdAt).toLocaleString(i18n.language,{dateStyle:'medium',timeStyle:'short'})}</time></article>)}</div>}</div></div>;
}
