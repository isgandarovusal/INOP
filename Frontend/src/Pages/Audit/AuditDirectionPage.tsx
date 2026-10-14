import { useCallback, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ClipboardCheck, BarChart3 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import PageHeader from '../../Components/PageHeader';
import { SectionCard } from '../../Components/HRSection';
import Badge from '../../Components/Badge';
import AuditResourceState from '../../Components/AuditResourceState';
import { useAuditResource } from '../../Hooks/useAuditResource';
import { useAuth } from '../../Context/useAuth';
import { hasPermission, getPermissionScope } from '../../Utils/permissions';
import { useAuditAction } from '../../Hooks/useAuditAction';
import api from '../../api/axios';
import { readJson } from '../../api/readRequest';
import { auditScore } from '../../Utils/auditScore';
import type { Audit, Restaurant } from '../../Types/audit';
interface AuditPage {items:Audit[];total:number;page:number;limit:number}
interface Catalog {data:{organizations:{id:string;name:string}[];brands:{id:string;name:string;organizationId:string}[]}}
interface Metrics {total:number;completed:number;scored:number;unscored:number;averageScore:number|null;scoreUnit:string}
export default function AuditDirectionPage({direction,analytics=false}:{direction?:string;analytics?:boolean}) {
  const {t,i18n}=useTranslation();const {user}=useAuth();const [brand,setBrand]=useState('');const [restaurant,setRestaurant]=useState('');const [page,setPage]=useState(1);
  const canCatalog=getPermissionScope(user,'restaurant','read')==='all';
  const canTemplates=getPermissionScope(user,'audit.template','read')==='all';const navigate=useNavigate();const [template,setTemplate]=useState('');const create=useAuditAction(JSON.stringify([direction,brand,restaurant]),'audit','create');
  const load=useCallback(async(key:string,signal?:AbortSignal,scopeKey?:string)=>{
    const [direction,brandId,restaurantId,page]=JSON.parse(key) as [string,string,string,number];
    const query=new URLSearchParams();if(direction)query.set('direction',direction);if(brandId)query.set('brandId',brandId);if(restaurantId)query.set('restaurantId',restaurantId);
    const dataPath=analytics?'/audit-analytics/overview':'/audits';if(!analytics){query.set('format','page');query.set('page',String(page));query.set('limit','25');}
    const [result,catalog,restaurants,templates]=await Promise.all([
      readJson<Audit[]|AuditPage|{data:Metrics}>(`${dataPath}?${query}`,{signal,scopeKey}),
      canCatalog?readJson<Catalog>('/audit-catalog',{signal,scopeKey}):Promise.resolve(null),
      canCatalog?readJson<Restaurant[]>('/restaurants',{signal,scopeKey}):Promise.resolve([]),
      canTemplates&&direction&&brandId?readJson<{id:string;name:string;publishedRevisionId?:string}[]>(`/audit-templates?auditType=${encodeURIComponent(direction)}&brandId=${encodeURIComponent(brandId)}&status=active`,{signal,scopeKey}):Promise.resolve([]),
    ]);
    return {result,catalog,restaurants,templates};
  },[analytics,canCatalog,canTemplates]);
  const resource=useAuditResource(JSON.stringify([direction||'',brand,restaurant,page]),analytics?'audit.analytics':'audit',load);
  const data=resource.data;
  const title=direction?t(`auditFoundation.directions.${direction}`):t('auditFoundation.analytics');
  const rows=data?(Array.isArray(data.result)?data.result:'items' in data.result?data.result.items:[]):[];
  const total=data&&!Array.isArray(data.result)&&'items' in data.result?data.result.total:rows.length;
  const metrics=data&&!Array.isArray(data.result)&&'data' in data.result?data.result.data:null;
  return <div className="audit-direction-page" data-audit-direction={direction||'all'}>
    <PageHeader title={analytics&&direction?t(`auditFoundation.analyticsDirections.${direction}`):title} subtitle={t('auditFoundation.structure')} icon={analytics?<BarChart3/>:<ClipboardCheck/>} actions={<Link className="btn-secondary" to="/app/audit">{t('auditFoundation.center')}</Link>}/>
    <SectionCard><div className="audit-filter-grid">
      <label>{t('auditFoundation.brand')}<select value={brand} disabled={!canCatalog||resource.status==='loading'} onChange={event=>{setBrand(event.target.value);setRestaurant('');setTemplate('');setPage(1);}}><option value="">{t('auditFoundation.allBrands')}</option>{data?.catalog?.data.brands.map(item=><option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
      <label>{t('navigation.restaurants')}<select value={restaurant} disabled={!brand||resource.status==='loading'} onChange={event=>{setRestaurant(event.target.value);setPage(1);}}><option value="">{t('auditFoundation.allRestaurants')}</option>{data?.restaurants.filter(item=>item.brandId===brand&&item.organizationId==='gfc').map(item=><option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
      <button type="button" className="btn-secondary" disabled={resource.status==='loading'} onClick={resource.reload}>{t('auditFoundation.refresh')}</button>
    </div>{!canCatalog&&<p>{t('auditFoundation.catalogPermission')}</p>}</SectionCard>
    {resource.status!=='ready'?<AuditResourceState status={resource.status} retry={resource.reload}/>:analytics&&metrics?<>
      <div className="audit-foundation-kpis">{(['total','completed','scored','unscored'] as const).map(key=><article key={key}><span>{t(`auditFoundation.metrics.${key}`)}</span><strong>{metrics[key].toLocaleString(i18n.language)}</strong></article>)}</div>
      <SectionCard><h3>{t('auditFoundation.average')}</h3><strong>{metrics.averageScore===null?'—':`${metrics.averageScore.toFixed(1)} / 10`}</strong>{metrics.averageScore===null&&<p>{t('auditFoundation.noScores')}</p>}</SectionCard>
    </>:<SectionCard>{rows.length?<div className="audit-table-scroll"><table className="admin-table"><thead><tr><th>{t('auditFoundation.audit')}</th><th>{t('navigation.restaurants')}</th><th>{t('auditFoundation.date')}</th><th>{t('auditFoundation.status')}</th><th>{t('auditFoundation.result')}</th><th>{t('auditFoundation.open')}</th></tr></thead><tbody>{rows.map(row=><tr key={row.id}><th scope="row">{row.id}</th><td>{data?.restaurants.find(item=>item.id===row.restaurantId)?.name||row.restaurantId}</td><td>{row.date}</td><td><Badge tone="neutral">{t(`auditFoundation.statusLabels.${row.status}`,{defaultValue:row.status})}</Badge></td><td>{auditScore(row)?.toFixed(1)??'—'}</td><td><Link to={`/app/audit/audits/${encodeURIComponent(row.id)}`}>{t('auditFoundation.open')}</Link></td></tr>)}</tbody></table></div>:<div className="audit-foundation-empty" role="status"><ClipboardCheck aria-hidden="true" size={32}/><h3>{t('auditFoundation.emptyTitle')}</h3><p>{t('auditFoundation.emptyDescription')}</p></div>}
    {total>25&&<nav className="audit-control-row" aria-label={t('auditFoundation.pagination')}><button type="button" className="btn-secondary" disabled={page<=1||resource.status!=='ready'} onClick={()=>setPage(value=>value-1)}>{t('auditFoundation.previous')}</button><span>{page} / {Math.ceil(total/25)}</span><button type="button" className="btn-secondary" disabled={page*25>=total||resource.status!=='ready'} onClick={()=>setPage(value=>value+1)}>{t('auditFoundation.next')}</button></nav>}
    {direction&&brand&&restaurant&&create.allowed&&<div className="audit-control-row"><label>{t('auditFoundation.chooseTemplate')}<select value={template} onChange={event=>setTemplate(event.target.value)}><option value="">{t('auditFoundation.chooseTemplate')}</option>{data?.templates.filter(item=>item.publishedRevisionId).map(item=><option key={item.id} value={item.id}>{item.name}</option>)}</select></label><button type="button" className="btn-primary" disabled={!template||create.busy} onClick={()=>void create.run(async signal=>{const response=await api.post('/audits',{id:`audit-${crypto.randomUUID()}`,restaurantId:restaurant,auditType:direction,date:new Date().toISOString().slice(0,10),templateId:template},{signal});navigate(`/app/audit/audits/${response.data.id}`);})}>{t('auditFoundation.createDraft')}</button>{!data?.templates.some(item=>item.publishedRevisionId)&&<p>{t('auditFoundation.noTemplates')}</p>}</div>}
    {create.status!=='ready'&&create.status!=='loading'&&<AuditResourceState status={create.status}/>}
    {hasPermission(user,'audit.template','read')&&<Link className="btn-secondary" to="/app/audit/checklists">{t('navigation.checklists')}</Link>}</SectionCard>}
  </div>;
}
