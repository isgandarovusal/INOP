import API from '../api/axios';

export type RecruitmentCloudStatus = {
 service: 'inop-recruitment';
 schemaVersion: number;
 cvIntake: 'disabled'|'quarantine-only';
 aiInference: 'disabled';
 scanner: string;
 humanReview: 'mandatory';
 connectionMode?: 'public-health-only';
};
const valid = (data:unknown):data is RecruitmentCloudStatus => {
 if(!data||typeof data!=='object'||Array.isArray(data))return false;
 const x=data as Partial<RecruitmentCloudStatus>;
 return x.service==='inop-recruitment'&&Number.isInteger(x.schemaVersion)&&x.schemaVersion===3&&
 (x.cvIntake==='disabled'||x.cvIntake==='quarantine-only')&&
 x.aiInference==='disabled'&&typeof x.scanner==='string'&&x.scanner.length<=64&&
 x.humanReview==='mandatory'&& (x.connectionMode===undefined||x.connectionMode==='public-health-only');
};
// Explicitly triggered, no background polling or browser-to-Cloudflare token.
export async function getRecruitmentCloudStatus(signal?:AbortSignal):Promise<RecruitmentCloudStatus>{
 const response=await API.get('/hr/recruitment-cloud/status',{signal,timeout:6000,suppressErrorToast:true});
 if(response.data?.success!==true||!valid(response.data?.data))throw new Error('INVALID_RECRUITMENT_CLOUD_STATUS');
 return response.data.data;
}
