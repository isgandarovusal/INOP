import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../Context/useAuth';
import { useAuditAction } from '../Hooks/useAuditAction';
import AuditResourceState from './AuditResourceState';
import ConfirmDialog from './ConfirmDialog';
import api from '../api/axios';
export default function AuditTemplateLifecycle({id,status,reload}:{id:string;status:string;reload:()=>void}) {
 const {t}=useTranslation();const{user}=useAuth();const action=useAuditAction(id,'audit.template','update');const[confirm,setConfirm]=useState(false);
 const run=(operation:string)=>void action.run(async signal=>{await api.post(`/audit-templates/${id}/${operation}`,{}, {signal});},()=>{setConfirm(false);reload();});
 if(!action.allowed||!['admin','audit_manager'].includes(user?.role||''))return null;
 return <section className="audit-template-lifecycle"><p>{t('auditFoundation.immutable')}</p><div className="audit-control-row">{(status==='active'?['draft','retire']:status==='draft'?['publish']:[]).map(operation=><button key={operation} type="button" className={operation==='retire'?'btn-danger-solid':'btn-secondary'} disabled={action.busy} onClick={()=>operation==='retire'?setConfirm(true):run(operation)}>{t(`auditFoundation.${operation}`)}</button>)}</div>{action.status!=='ready'&&action.status!=='loading'&&<AuditResourceState status={action.status}/>}
 {confirm&&<ConfirmDialog title={t('auditFoundation.retire')} message={t('auditFoundation.retireConfirm')} loading={action.busy} onCancel={()=>setConfirm(false)} onConfirm={()=>run('retire')}/>}</section>;
}
