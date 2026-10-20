import { useTranslation } from 'react-i18next';
import type { Permission, PermissionScope } from '../Types/auth';

const permissionGroups = [
  ...['hr','service','standard','occupational-safety'].map(direction => ({ key: direction, resources: [
    [`audit.${direction}`, ['read','create','update']],
    [`audit.${direction}.execution`, ['read','create','update']],
    [`audit.${direction}.analytics`, ['read']],
    [`audit.${direction}.report`, ['read']],
    [`audit.${direction}.export`, ['read']],
  ] as [string, string[]][] })),
  { key: 'recruitment', resources: [['recruitment',['read','create','update','delete']],['candidate',['read','create','update','delete']],['application',['read','create','update','delete']]] as [string,string[]][] },
  { key: 'administration', resources: [['user',['read','create','update','delete']],['department',['read','create','update','delete']],['role',['read','create','update','delete']],['activity_log',['read']],['dashboard',['read']]] as [string,string[]][] },
  { key: 'auditShared', resources: [['audit',['read','create','update','delete']],['audit.analytics',['read']],['audit.template',['read','create','update','delete']],['audit.notification',['read','update']],['restaurant',['read','create','update','delete']],['audit.assignment',['read','create','update']],['audit.approval',['read','create','update']],['audit.finding',['read','create','update']],['audit.action',['read','create','update']],['audit.workflow',['read','update']],['audit.closure',['read','create']],['audit.export',['read']],['audit.report',['read']]] as [string,string[]][] },
];
const scopes: PermissionScope[] = ['assigned','own','department','all','none'];
export function PermissionEditor({ value, onChange, disabled = false }: {value: Permission[]; onChange: (value: Permission[]) => void; disabled?: boolean}) {
  const {t} = useTranslation();
  const locked = value.some(p => p.resource === '*' || p.action === '*');
  const known = new Set(permissionGroups.flatMap(g => g.resources.flatMap(([resource,actions]) => actions.map(action => `${resource}:${action}`))));
  const legacy = value.filter(p => !known.has(`${p.resource}:${p.action}`));
  const set = (resource: string, action: string, scope?: PermissionScope) => {
    // Preserve every untouched permission, its order, and unfamiliar capabilities.
    const next = value.filter(p => p.resource !== resource || p.action !== action);
    onChange(scope ? [...next, {resource,action,scope}] : next);
  };
  const resourceLabel = (resource: string) => {
    const parts = resource.split('.');
    if (['hr','service','standard','occupational-safety'].includes(parts[1])) return t(`adminUI.capabilities.${parts[2] || 'audit'}`);
    return t(`adminUI.resources.${resource.replaceAll('.','_')}`, {defaultValue: resource});
  };
  return <div className="permission-editor">
    <p className="admin-help">{t('adminUI.permissionHelp')}</p>
    {locked && <p role="note" className="admin-notice">{t('adminUI.legacyLocked')}</p>}
    {permissionGroups.map(group => <details key={group.key} className="permission-group" open={undefined}>
      <summary>{t(`adminUI.groups.${group.key}`)}</summary>
      {group.resources.map(([resource,actions]) => <div key={resource} className="permission-resource">
        <h4>{resourceLabel(resource)}</h4>
        {actions.map(action => { const permission=value.find(p => p.resource===resource && p.action===action);return <div className="permission-option" key={action}>
          <label><input type="checkbox" checked={Boolean(permission)} disabled={disabled || locked} onChange={e => set(resource,action,e.target.checked?'assigned':undefined)}/>{t(`adminUI.actions.${action}`)}</label>
          {permission && <select aria-label={`${resourceLabel(resource)} — ${t(`adminUI.actions.${action}`)} — ${t('adminUI.visibility')}`} value={permission.scope} disabled={disabled || locked} onChange={e=>set(resource,action,e.target.value as PermissionScope)}>{scopes.map(scope=><option key={scope} value={scope}>{t(`roles.scopes.${scope}`)}</option>)}</select>}
        </div>})}
      </div>)}
    </details>)}
    {legacy.length > 0 && <details className="permission-group"><summary>{t('adminUI.retainedPermissions', {count:legacy.length})}</summary><ul>{legacy.map((p,i)=><li key={i}>{p.resource==='*'?t('adminUI.allSections'):resourceLabel(p.resource)} · {p.action==='*'?t('adminUI.allActions'):t(`adminUI.actions.${p.action}`,{defaultValue:p.action})} · {t(`roles.scopes.${p.scope}`)}</li>)}</ul></details>}
  </div>;
}
