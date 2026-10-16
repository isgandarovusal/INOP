
import {useCallback,useState} from 'react';
import {Link,useNavigate} from 'react-router-dom';
import {useTranslation} from 'react-i18next';
import {ClipboardCheck,BarChart3} from 'lucide-react';
import PageHeader from '../../../Components/PageHeader';
import {SectionCard} from '../../../Components/HRSection';
import AuditResourceState from '../../../Components/AuditResourceState';
import {useAuditResource} from '../../../Hooks/useAuditResource';
import {useAuditAction} from '../../../Hooks/useAuditAction';
import {useAuth} from '../../../Context/useAuth';
import {hasPermission} from '../../../Utils/permissions';
import * as service from '../../../Services/serviceAuditService';
const brands=[['kfc','KFC'],['pizza-hut','Pizza Hut'],['simit-sarayi','Simit Sarayı']];
export default function ServiceAuditPage({analytics=false,createOnly=false}:{analytics?:boolean;createOnly?:boolean}){
 const{t}=useTranslation();const{user}=useAuth();const navigate=useNavigate();
 const[filters,setFilters]=useState({brandId:'',restaurantId:'',dateFrom:'',dateTo:'',status:''});const[page,setPage]=useState(1);
 const[createInput,setCreateInput]=useState({brandId:'',restaurantId:'',date:new Date().toISOString().slice(0,10)});
 const update=(key:keyof typeof filters,value:string)=>{setFilters(p=>({...p,[key]:value,...(key==='brandId'?{restaurantId:''}:{})}));setPage(1);};
 const query=new URLSearchParams(Object.fromEntries(Object.entries(filters).filter(([,v])=>v)));query.set('page',String(page));query.set('limit','25');
 const load=useCallback(async(key:string,signal?:AbortSignal,scopeKey?:string)=>{
  const [result,options]=await Promise.all([analytics?service.readServiceAnalytics(key,signal,scopeKey):service.readService(key,signal,scopeKey),service.readServiceOptions(analytics,signal,scopeKey)]);return{result,options:options.data};
 },[analytics]);
 const resource=useAuditResource(query.toString(),analytics?'audit.analytics':'audit',load,{refreshOnFocus:false,deadlineMs:15000});
 const sourceResource=useAuditResource(analytics?undefined:'sources','audit',service.sources,{refreshOnFocus:false});
 const create=useAuditAction('service-create','audit','create');const provision=useAuditAction('service-source','audit.template','update');
 const canProvision=['admin','audit_manager'].includes(user?.role||'')&&hasPermission(user,'audit.template','create')&&provision.allowed;
 const data=resource.data;const metrics=data&&'data'in data.result?data.result.data:null;const list=data&&'items'in data.result?data.result:null;
 const [createOptions,setCreateOptions]=useState<service.ServiceRestaurant[]>([]);
 const groups:([keyof Pick<service.ServiceMetrics,'brands'|'restaurants'|'sections'|'criteria'|'trend'>,service.ServiceGroup[]])[]=metrics?(['brands','restaurants','sections','criteria','trend'] as const).map(k=>[k,metrics[k]]):[];
 const average=(v:number|null)=>v===null?t('serviceAudit.notAssessed'):`${v.toFixed(1)}%`;
 return <div className="audit-direction-page audit-hr-page">
  <PageHeader title={t(analytics?'serviceAudit.analytics':'serviceAudit.title')} subtitle={t('serviceAudit.subtitle')} icon={analytics?<BarChart3/>:<ClipboardCheck/>} actions={<Link className="btn-secondary" to="/app/audit">{t('auditFoundation.center')}</Link>}/>
  <nav className="audit-management-links" aria-label={t('serviceAudit.navigation')}>{create.allowed&&<Link to="/app/audit/service/new">{t('serviceAudit.create')}</Link>}{hasPermission(user,'audit','read')&&<Link to="/app/audit/service" aria-current={!analytics?'page':undefined}>{t('serviceAudit.title')}</Link>}{hasPermission(user,'audit.analytics','read')&&<Link to="/app/audit/service/analytics" aria-current={analytics?'page':undefined}>{t('serviceAudit.analytics')}</Link>}</nav>
  {!createOnly&&<>
  <SectionCard><h2>{t('serviceAudit.filters')}</h2><div className="audit-filter-grid">
   <label>{t('auditFoundation.brand')}<select value={filters.brandId} onChange={e=>update('brandId',e.target.value)}><option value="">{t('auditFoundation.allBrands')}</option>{brands.filter(([id])=>!user?.auditDirection||(analytics?data?.options.some(r=>r.brandId===id):sourceResource.data?.data.some(source=>source.brandId===id))).map(([id,name])=><option key={id} value={id}>{name}</option>)}</select></label>
   <label>{t('navigation.restaurants')}<select value={filters.restaurantId} onChange={e=>update('restaurantId',e.target.value)}><option value="">{t('auditFoundation.allRestaurants')}</option>{data?.options.filter(r=>!filters.brandId||r.brandId===filters.brandId).map(r=><option key={r.id} value={r.id}>{r.name}</option>)}</select></label>
   {(['dateFrom','dateTo'] as const).map(k=><label key={k}>{t(`serviceAudit.${k}`)}<input type="date" value={filters[k]} onChange={e=>update(k,e.target.value)}/></label>)}
   <label>{t('auditFoundation.status')}<select value={filters.status} onChange={e=>update('status',e.target.value)}><option value="">{t('serviceAudit.allStatuses')}</option>{['draft','scheduled','in-progress','completed','cancelled','failed'].map(s=><option key={s} value={s}>{t(`auditFoundation.statusLabels.${s}`,{defaultValue:s})}</option>)}</select></label>
   <button className="btn-secondary" type="button" onClick={resource.reload}>{t('auditFoundation.refresh')}</button>
  </div></SectionCard>
  <p className="audit-hr-notice" role="note">{t('serviceAudit.scoringNotice')}</p>
  {resource.status!=='ready'?<AuditResourceState status={resource.status} retry={resource.reload}/>:metrics?<>
   <p>{t('serviceAudit.analyticsScope')}</p>{!!metrics.legacyConformityExclusions&&<p role="note" className="audit-hr-notice">{t('serviceAudit.legacyAnalytics',{count:metrics.legacyConformityExclusions})}</p>}<div className="audit-foundation-kpis">{(['total','submitted','scored','unscored'] as const).map(k=><article key={k}><span>{t(`serviceAudit.${k}`)}</span><strong>{metrics[k]}</strong></article>)}</div>
   <SectionCard><h2>{t('serviceAudit.status')}</h2>{Object.entries(metrics.statuses||{}).map(([status,count])=><p key={status}>{t(`auditFoundation.statusLabels.${status}`,{defaultValue:status})}: {count}</p>)}</SectionCard>
   <SectionCard><h2>{t('serviceAudit.average')}</h2><strong>{average(metrics.average)}</strong><p>{t('serviceAudit.nonconformities')}: {metrics.nonconformities}</p>{!metrics.total&&<p role="status">{t('serviceAudit.empty')}</p>}</SectionCard>
   {groups.map(([key,rows])=><SectionCard key={key}><h2>{t(`serviceAudit.${key}`)}</h2>{rows.length?<div className="audit-table-scroll"><table className="admin-table"><thead><tr><th>{t('serviceAudit.criterion')}</th><th>{t('serviceAudit.count')}</th><th>{t('serviceAudit.scored')}</th><th>{t('serviceAudit.average')}</th>{key==='criteria'&&<><th>N/A</th><th>{t('serviceAudit.nonconformities')}</th></>}</tr></thead><tbody>{rows.map(r=><tr key={r.id}><th scope="row">{r.label}</th><td>{r.count}</td><td>{r.scored}</td><td>{average(r.average)}</td>{key==='criteria'&&<><td>{r.na||0}</td><td>{r.nonconformities||0}</td></>}</tr>)}</tbody></table></div>:<p>{t('serviceAudit.empty')}</p>}</SectionCard>)}
   <SectionCard><h2>{t('serviceAudit.recurring')}</h2>{metrics.criteria.filter(r=>(r.nonconformities||0)>1).length?metrics.criteria.filter(r=>(r.nonconformities||0)>1).map(r=><p key={r.id}>{r.label}: {r.nonconformities}</p>):<p>{t('serviceAudit.empty')}</p>}</SectionCard>
   {(['actions','findings'] as const).map(k=><SectionCard key={k}><h2>{t(`serviceAudit.${k}`)}</h2>{metrics[k]===null?<p>{t('serviceAudit.restricted')}</p>:metrics[k]?.length?metrics[k]?.map(r=><p key={r._id}>{t(`auditFoundation.statusLabels.${r._id}`,{defaultValue:r._id})}: {r.count}</p>):<p>{t('serviceAudit.empty')}</p>}</SectionCard>)}
  </>:list?<SectionCard><h2>{t('serviceAudit.title')}</h2>{list.items.length?<div className="audit-table-scroll"><table className="admin-table"><thead><tr>{['restaurant','date','status','result','open'].map(k=><th key={k}>{t(`serviceAudit.${k}`)}</th>)}</tr></thead><tbody>{list.items.map(r=><tr key={r.id}><th scope="row">{data?.options.find(o=>o.id===r.restaurantId)?.name||r.restaurantId}</th><td>{r.date}</td><td>{t(`auditFoundation.statusLabels.${r.status}`,{defaultValue:r.status})}</td><td>{average(r.assessmentStatus==='scored'?r.overallPercentage:null)}</td><td><Link to={`/app/audit/audits/${encodeURIComponent(r.id)}`}>{t('serviceAudit.open')}</Link></td></tr>)}</tbody></table></div>:<p role="status">{t('serviceAudit.empty')}</p>}
   <nav className="audit-control-row" aria-label={t('auditFoundation.pagination')}><button className="btn-secondary" disabled={page<=1} onClick={()=>setPage(p=>p-1)}>{t('auditFoundation.previous')}</button><span>{page} / {Math.max(1,Math.ceil(list.total/25))}</span><button className="btn-secondary" disabled={page*25>=list.total} onClick={()=>setPage(p=>p+1)}>{t('auditFoundation.next')}</button></nav>
  </SectionCard>:null}
  </>}
  {createOnly&&create.allowed&&<SectionCard><h2>{t('serviceAudit.create')}</h2><form className="audit-filter-grid" onSubmit={e=>{e.preventDefault();void create.run(async signal=>{const result=await service.createService(createInput,signal);navigate(`/app/audit/audits/${result.data.id}`);});}}>
   <label>{t('auditFoundation.brand')}<select required value={createInput.brandId} onChange={e=>{setCreateInput(p=>({...p,brandId:e.target.value,restaurantId:''}));void create.run(async signal=>{setCreateOptions((await service.readServiceCreateOptions(signal)).data);});}}><option value="">{t('serviceAudit.choose')}</option>{brands.filter(([id])=>!user?.auditDirection||(analytics?data?.options.some(r=>r.brandId===id):sourceResource.data?.data.some(source=>source.brandId===id))).map(([id,name])=><option value={id} key={id}>{name}</option>)}</select></label>
   <label>{t('navigation.restaurants')}<select required value={createInput.restaurantId} onChange={e=>setCreateInput(p=>({...p,restaurantId:e.target.value}))}><option value="">{t('serviceAudit.choose')}</option>{createOptions.filter(r=>r.brandId===createInput.brandId).map(r=><option value={r.id} key={r.id}>{r.name}</option>)}</select></label>
   <label>{t('serviceAudit.date')}<input required type="date" value={createInput.date} onChange={e=>setCreateInput(p=>({...p,date:e.target.value}))}/></label>
   <button className="btn-primary" disabled={create.busy||!sourceResource.data?.data.find(s=>s.brandId===createInput.brandId)?.templateId}>{t('serviceAudit.create')}</button>
  </form>{create.status!=='ready'&&<AuditResourceState status={create.status}/>}
  {sourceResource.status!=='ready'&&<AuditResourceState status={sourceResource.status} retry={sourceResource.reload}/>}<p>{t('serviceAudit.provisionHint')}</p>{canProvision&&<div className="audit-control-row">{sourceResource.data?.data.map(s=><button type="button" className="btn-secondary" key={s.brandId} disabled={provision.busy||Boolean(s.templateId)} onClick={()=>void provision.run(signal=>service.provisionService(s.brandId,signal),sourceResource.reload)}>{t(s.templateId?'serviceAudit.sourceReady':'serviceAudit.provision')} · {s.brandName}</button>)}</div>}{provision.status!=='ready'&&<AuditResourceState status={provision.status}/>}
  </SectionCard>}
 </div>;
}
