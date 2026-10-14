import { Link } from 'react-router-dom';
import { ClipboardCheck, BarChart3, Store, ArrowRight, BookOpen } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../../Context/useAuth';
import { canAccessAuditDirection, hasPermission } from '../../../Utils/permissions';
import PageHeader from '../../../Components/PageHeader';
import { SectionCard } from '../../../Components/HRSection';
import './auditHome.css';
const directions = [{key:'hr',path:'hr'},{key:'service',path:'service'},{key:'standard',path:'standard'},{key:'occupational-safety',path:'safety'}];
export default function AuditHome() {
  const {t}=useTranslation(); const {user}=useAuth();
  return <div className="audit-home">
    <PageHeader title={t('auditFoundation.center')} subtitle={t('auditFoundation.structure')} icon={<ClipboardCheck/>}/>
    <SectionCard className="audit-organization"><strong>GFC</strong><span>{t('auditFoundation.parent')}</span><p>KFC · Pizza Hut · Simit Sarayı</p></SectionCard>
    <div className="audit-home-grid">{directions.filter(item=>canAccessAuditDirection(user,item.key)).map(item=><section key={item.key} className="audit-home-card">
      <div className="audit-home-card-icon"><ClipboardCheck aria-hidden="true" size={24}/></div><h3>{t(`auditFoundation.directions.${item.key}`)}</h3><p>{t('auditFoundation.directionDescription')}</p>
      <div className="audit-home-card-action"><Link to={`/app/audit/${item.path}`}>{t('auditFoundation.open')} <ArrowRight aria-hidden="true" size={16}/></Link>
      {hasPermission(user,'audit.analytics','read')&&<Link to={`/app/audit/${item.path}/analytics`}>{t('auditFoundation.analytics')}</Link>}</div>
    </section>)}</div>
    <SectionCard><h3>{t('auditFoundation.management')}</h3><nav className="audit-management-links" aria-label={t('auditFoundation.management')}>
      {hasPermission(user,'restaurant','read')&&<Link to="/app/audit/restaurants"><Store size={18}/>{t('navigation.restaurants')}</Link>}
      {hasPermission(user,'audit.analytics','read')&&<Link to="/app/audit/analytics"><BarChart3 size={18}/>{t('auditFoundation.analytics')}</Link>}
      {hasPermission(user,'audit.template','read')&&<Link to="/app/audit/checklists"><BookOpen size={18}/>{t('navigation.checklists')}</Link>}
      {['admin','audit_manager'].includes(user?.role||'')&&hasPermission(user,'audit.assignment','read')&&<Link to="/app/audit/auditors">{t('auditFoundation.profiles')}</Link>}
      <Link to="/app/audit/audits">{t('auditFoundation.history')}</Link>
      {hasPermission(user,'audit.notification','read')&&<Link to="/app/audit/notifications">{t('auditFoundation.notifications')}</Link>}
    </nav></SectionCard>
  </div>;
}
