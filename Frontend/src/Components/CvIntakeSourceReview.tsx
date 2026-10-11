import {useCallback} from 'react';
import {Link} from 'react-router-dom';
import {useTranslation} from 'react-i18next';
import {useAuditResource} from '../Hooks/useAuditResource';
import HRResourceState from './HRResourceState';
import {getCvIntakeDuplicates} from '../Services/cvIntakeService';
import type {CvIntakeSource} from '../Services/cvIntakeService';
export default function CvIntakeSourceReview({source,linkedJob=false,recovering=false}:{source:CvIntakeSource;linkedJob?:boolean;recovering?:boolean}){
 const {t}=useTranslation();
 const load=useCallback((key:string,signal?:AbortSignal,scopeKey?:string)=>getCvIntakeDuplicates(JSON.parse(key)[0],signal,scopeKey),[]);
 const review=useAuditResource(JSON.stringify([source.id,source.updatedAt]),'candidate',load,{refreshOnFocus:false});
 return <section data-intake-source-review>
  {source.origin&&<div data-intake-origin><p>{t('hrIntake.source')}: {source.origin.key}</p><p>{t('hrIntake.matches.'+source.origin.matchReason)}</p>{source.origin.suggestedJobId&&!linkedJob&&!recovering&&<Link data-intake-job-suggestion to={'/app/recruitment/candidates/new?'+new URLSearchParams({intakeId:source.id,jobId:source.origin.suggestedJobId})}>{t('hrIntake.chooseSuggestedJob')}</Link>}</div>}
  <h3>{t('hrIntake.duplicates')}</h3><p>{t('hrIntake.noAutomaticMerge')}</p>
  {review.status!=='ready'?<HRResourceState status={review.status} retry={review.reload}/>:review.data?.items.length?<ul>{review.data.items.map(item=><li key={item.candidateId}><Link to={'/app/recruitment/candidates/'+item.candidateId}>{t('hrIntake.reviewExisting')}</Link> — {item.reasons.map(r=>t('hrIntake.duplicateReasons.'+r)).join(', ')}</li>)}</ul>:<p>{t('hrIntake.noVisibleDuplicate')}</p>}
 </section>;
}
