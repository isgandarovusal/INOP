import {useState} from 'react';
import {useAuth} from '../Context/useAuth';
import {getPermissionScope} from '../Utils/permissions';
import {useTranslation} from 'react-i18next';
import {useAuditResource} from '../Hooks/useAuditResource';
import HRResourceState from './HRResourceState';
import {readJson} from '../api/readRequest';
import type {HRAnalytics} from '../Services/hrAnalyticsService';
type Row={id:string;name:string;metrics:Omit<NonNullable<HRAnalytics['workload']>,'scope'>&{scope:'assigned-to-recruiter'}};
interface Report{version:'hr-team-workload-v1';items:Row[];page:number;total:number;hasMore:boolean;asOf:string}
const load=(key:string,signal?:AbortSignal,scopeKey?:string)=>{const[filters,page]=JSON.parse(key) as [string,number];const query=new URLSearchParams({...JSON.parse(filters),page:String(page),limit:'20'});return readJson<Report>('/hr/analytics/workload?'+query,{signal,scopeKey,suppressErrorToast:true});};
export default function RecruiterTeamWorkload({filters,revision=0}:{filters:string;revision?:number}){
 const{user}=useAuth(),{t}=useTranslation(),[position,setPosition]=useState({filters,page:1}),page=position.filters===filters?position.page:1;
 const allowed=['application','recruitment','user'].every(resource=>getPermissionScope(user,resource,'read')==='all');
 const report=useAuditResource(allowed?JSON.stringify([filters,page,revision]):undefined,'application',load,{refreshOnFocus:false,retainOnReload:true});
 const columns=['assigned','active','pendingReviews','overdue','upcomingInterviews','completed','aging'] as const;
 if(!allowed)return null;
 return <section data-team-workload><h2>{t('integrationAcceptance.team')}</h2><p>{t('integrationAcceptance.teamHelp')}</p>
 {report.status!=='ready'||!report.data?<HRResourceState status={report.status} retry={report.reload}/>:<>
 <div className='admin-table-container' role='region' tabIndex={0} aria-label={t('integrationAcceptance.team')}><table style={{minWidth:1024}}><thead><tr><th scope='col'>{t('integrationAcceptance.recruiter')}</th>{columns.map(c=><th key={c} scope='col'>{t('recruiterWorkload.'+c)}</th>)}</tr></thead><tbody>{report.data.items.map(row=><tr key={row.id}><th scope='row'>{row.name}</th>{columns.map(c=><td key={c}>{row.metrics[c]}</td>)}</tr>)}</tbody></table></div>
 <p>{t('integrationAcceptance.page',{page,total:report.data.total})}</p><button type='button' className='btn-secondary' disabled={page===1} onClick={()=>setPosition({filters,page:page-1})}>{t('auditFoundation.previous')}</button><button type='button' className='btn-secondary' disabled={!report.data.hasMore} onClick={()=>setPosition({filters,page:page+1})}>{t('auditFoundation.next')}</button><button type='button' className='btn-secondary' onClick={report.reload}>{t('common.actions.refresh')}</button></>}
 </section>;
}
