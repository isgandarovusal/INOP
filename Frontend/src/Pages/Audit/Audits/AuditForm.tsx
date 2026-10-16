import { Link, Navigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import PageHeader from '../../../Components/PageHeader';
import { SectionCard } from '../../../Components/HRSection';
import { useAuth } from '../../../Context/useAuth';
import { canAccessAuditDirection, hasPermission } from '../../../Utils/permissions';

const directions = [
 {id:'hr',path:'hr'}, {id:'service',path:'service'},
 {id:'standard',path:'standard'}, {id:'occupational-safety',path:'safety'},
];
// Compatibility entry point: never capture mixed answers or invented defaults.
export default function AuditForm(){
 const {user}=useAuth();const {t}=useTranslation();const [params]=useSearchParams();
 const requested=params.get('direction');
 const canonical=requested==='safety'?'occupational-safety':requested;
 const selected=directions.find(d=>d.id===(canonical||((user?.auditDirections?.length||1)===1?user?.auditDirection:null)));
 if(requested&&!selected)return <Navigate to="/unauthorized" replace/>;
 if(selected){
  if(!canAccessAuditDirection(user,selected.id)||!hasPermission(user,'audit','create'))return <Navigate to="/unauthorized" replace/>;
  const restaurant=params.get('restaurantId');
  return <Navigate to={`/app/audit/${selected.path}/new${restaurant?`?restaurantId=${encodeURIComponent(restaurant)}`:''}`} replace/>;
 }
 return <div className="audit-direction-page" data-audit-create="directions">
  <PageHeader title={t('auditSeparation.title')} subtitle={t('auditSeparation.subtitle')}/>
  <div className="audit-filter-grid">{directions.filter(d=>canAccessAuditDirection(user,d.id)).map(d=><SectionCard key={d.id}>
   <h2>{t(`auditFoundation.directions.${d.id}`)}</h2>
   <nav className="audit-control-row" aria-label={t(`auditFoundation.directions.${d.id}`)}>
    {hasPermission(user,'audit','create')&&<Link className="btn-primary" to={`/app/audit/${d.path}/new`}>{t('auditSeparation.create')}</Link>}
    <Link className="btn-secondary" to={`/app/audit/${d.path}`}>{t('auditSeparation.list')}</Link>
    {canAccessAuditDirection(user,d.id,'audit.analytics')&&<Link className="btn-secondary" to={`/app/audit/${d.path}/analytics`}>{t('auditSeparation.analytics')}</Link>}
   </nav>
  </SectionCard>)}</div>
 </div>;
}
