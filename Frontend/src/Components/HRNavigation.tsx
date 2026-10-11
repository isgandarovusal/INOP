import { NavLink } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { BarChart3, BriefcaseBusiness, UsersRound, Layers3 } from 'lucide-react';
import { useAuth } from '../Context/useAuth';
import { hasPermission } from '../Utils/permissions';
const sections = [
  { path: 'analytics', resource: 'application', label: 'hrAnalytics.title', Icon: BarChart3 },
  { path: 'jobs', resource: 'recruitment', label: 'navigation.jobs', Icon: BriefcaseBusiness },
  { path: 'candidates', resource: 'candidate', label: 'navigation.candidates', Icon: UsersRound },
  { path: 'applications', resource: 'application', label: 'navigation.applications', Icon: Layers3 },
];
export default function HRNavigation() {
  const { t } = useTranslation(), { user } = useAuth();
  const visible = sections.filter(s => hasPermission(user, s.resource, 'read'));
  if (!visible.length) return null;
  return <div className="hr-product-bar" data-hr-product-bar>
    <span className="hr-product-bar__identity"><span aria-hidden="true">GFC</span><span>{t('hrWorkspace.recruitment')}</span></span>
    <nav aria-label={t('hrWorkspace.navigation')} className="hr-product-nav">{visible.map(({ path, label, Icon }) =>
      <NavLink key={path} to={'/app/recruitment/' + path}><Icon size={16} aria-hidden="true" /><span>{t(label)}</span></NavLink>
    )}</nav>
  </div>;
}
