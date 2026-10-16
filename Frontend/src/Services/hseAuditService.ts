import api from '../api/axios';
import {readJson} from '../api/readRequest';
import type {AuditExecution,AuditExecutionAnswer} from './auditExecutionService';
import type {StandardDetails} from './standardSourceService';
export type HseKind='restaurant'|'office'|'warehouse';
export interface HseObject{id:string;name:string;location?:string;organizationId:string;objectType:HseKind;brandId?:string}
export interface HseDetails extends StandardDetails{nextAuditDate?:string;criterionMetadata?:Record<string,{rootCause:string;sample:string;repeated:''|'yes'|'no'}>}
export interface HseCounts{total:number;applicable:number;na:number;unanswered:number;compliant:number;noncompliant:number;critical:number;weightTotal:number;weightEarned:number;percentage:number|null;weightedPercentage:number|null}
export interface HseAssessment extends HseCounts{passed:boolean|null;passThreshold:number|null;objectType:HseKind;complete:boolean;contract:string;catalogVersion:string;sections:(HseCounts&{id:string;title:string})[]}
export interface HseSource{objectType:HseKind;version:string;templateId:string|null;sections:{id:string;title:string}[]}
export interface HseAudit{_id:string;id:string;date:string;status:string;hseObjectType:HseKind;hseObjectId:string;hseObjectSnapshot:HseObject;hseAssessment:HseAssessment;overallPercentage:number|null}
export interface HseGroup extends HseCounts{id:string;label:string;objectType:HseKind}
export interface HseMetrics{total:number;completed:number;coverage:number;availableObjects:number;restaurantOutcomes:{passed:number;failed:number;unassessed:number};overallPercentage:null;groups:HseGroup[];sections:HseGroup[];trend:HseGroup[];criteria:HseGroup[];statuses:Record<string,number>;findings:{total:number;critical:number}|null;actions:{total:number;open:number;overdue:number;closed:number;byResponsible:Record<string,number>}|null}
export const readSources=(_id:string,signal?:AbortSignal,scopeKey?:string)=>readJson<{data:HseSource[]}>('/audit-hse/sources',{signal,scopeKey,suppressErrorToast:true});
export const readOptions=(_id:string,signal?:AbortSignal,scopeKey?:string)=>readJson<{data:HseObject[]}>('/audit-hse/options',{signal,scopeKey,suppressErrorToast:true});
export const readAnalyticsOptions=(_id:string,signal?:AbortSignal,scopeKey?:string)=>readJson<{data:HseObject[]}>('/audit-hse/analytics-options',{signal,scopeKey,suppressErrorToast:true});
export const readList=(query:string,signal?:AbortSignal,scopeKey?:string)=>readJson<{items:HseAudit[];total:number;page:number;limit:number}>(`/audit-hse/list?${query}`,{signal,scopeKey,suppressErrorToast:true});
export const readAnalytics=(query:string,signal?:AbortSignal,scopeKey?:string)=>readJson<{data:HseMetrics}>(`/audit-hse/analytics?${query}`,{signal,scopeKey,suppressErrorToast:true});
export const provision=(kind:string,signal?:AbortSignal)=>api.post(`/audit-hse/templates/${kind}`,{},{signal,suppressErrorToast:true});
export const create=(body:{objectType:string;objectId:string;brandId:string;date:string},signal?:AbortSignal)=>api.post<{data:HseAudit}>('/audit-hse/audits',body,{signal,suppressErrorToast:true});
export const saveHse=(execution:AuditExecution,answers:AuditExecutionAnswer[],details:HseDetails,complete:boolean,signal?:AbortSignal)=>api.put(`/audit-execution/${execution._id}/${complete?'submit':'hse-draft'}`,{answers,details,evidenceLinks:details.evidenceLinks||[],expectedVersion:execution.hseVersion||0},{signal,suppressErrorToast:true});

export const readAnalyticsSources=(_id:string,signal?:AbortSignal,scopeKey?:string)=>readJson<{data:HseSource[]}>('/audit-hse/analytics-sources',{signal,scopeKey,suppressErrorToast:true});
