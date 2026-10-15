import {readJson} from '../api/readRequest';
import api from '../api/axios';
import type {AuditExecution,AuditExecutionAnswer} from './auditExecutionService';
export interface HRSource {brandId:string;brandName:string;sha256:string;worksheet:string;worksheets:string[];scoringStatus:string;templateId:string|null;interviewGuide:{sheet:string;cells:{cell:string;text:string}[]}[]}
export interface HRRestaurant {id:string;name:string;brandId:string;organizationId:string}
export interface HRDetails {editorialVersion?:string;roleAvailability?:Record<string,boolean>;finalEvidence?:{photoId?:string;documentIds?:string[]};restaurantManager?:string;shiftManager?:string;sectionNotes?:Record<string,string>;observations?:string;finalOpinion?:string;evidenceLinks?:{questionId:string;evidenceId:string}[]}
export interface HRGroup {id:string;label:string;count:number;scored:number;average:number|null;na?:number;nonconformities?:number}
export interface HRMetrics {total:number;submitted:number;scored:number;unscored:number;average:number|null;nonconformities:number;brands:HRGroup[];restaurants:HRGroup[];sections:HRGroup[];criteria:HRGroup[];trend:HRGroup[];actions:{_id:string;count:number}[]|null;findings:{_id:string;count:number}[]|null;generatedAt:string}
export interface HRRow {id:string;_id:string;restaurantId:string;date:string;status:string;overallPercentage:number|null;assessmentStatus:string;templateSnapshot?:{brandId:string}}
export interface HRPage {items:HRRow[];total:number;page:number;limit:number}
export const sources=(_id:string,signal?:AbortSignal,scopeKey?:string)=>readJson<{data:HRSource[]}>('/audit-hr/sources',{signal,scopeKey,suppressErrorToast:true});
export const readHR=(query:string,signal?:AbortSignal,scopeKey?:string)=>readJson<HRPage>(`/audit-hr/list?${query}`,{signal,scopeKey,suppressErrorToast:true});
export const readHRAnalytics=(query:string,signal?:AbortSignal,scopeKey?:string)=>readJson<{data:HRMetrics}>(`/audit-hr/analytics?${query}`,{signal,scopeKey,suppressErrorToast:true});
export const readHROptions=(analytics:boolean,signal?:AbortSignal,scopeKey?:string)=>readJson<{data:HRRestaurant[]}>(`/audit-hr/${analytics?'analytics-options':'options'}`,{signal,scopeKey,suppressErrorToast:true});
export const readHRCreateOptions=(signal?:AbortSignal)=>readJson<{data:HRRestaurant[]}>('/audit-hr/restaurants',{signal,suppressErrorToast:true});
export const createHR=async(body:{brandId:string;restaurantId:string;date:string},signal?:AbortSignal)=>(await api.post<{data:HRRow}>('/audit-hr/audits',body,{signal,suppressErrorToast:true})).data;
export const provisionHR=async(brandId:string,signal?:AbortSignal)=>api.post(`/audit-hr/templates/${encodeURIComponent(brandId)}`,{},{signal,suppressErrorToast:true});
export const saveHR=async(execution:AuditExecution,answers:AuditExecutionAnswer[],details:HRDetails,complete:boolean,signal?:AbortSignal)=>(await api.put<{data:AuditExecution}>(`/audit-execution/${execution._id}/${complete?'submit':'draft'}`,{answers,details,evidenceLinks:details.evidenceLinks||[],expectedVersion:execution.hrVersion||0},{signal,suppressErrorToast:true})).data;
