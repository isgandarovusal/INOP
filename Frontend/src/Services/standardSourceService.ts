import {readJson} from '../api/readRequest';
import api from '../api/axios';
import type {AuditExecution,AuditExecutionAnswer} from './auditExecutionService';
import type {ServiceDetails,ServiceRestaurant,ServicePage} from './serviceAuditService';
export interface StandardCounts {total:number;applicable:number;na:number;unanswered:number;compliant:number;critical:number;major:number;minor:number;percentage:number|null;sourceRisk?:{critical:number;major:number;minor:number;unspecified:number}}
export interface StandardAssessment extends StandardCounts {contract:string;complete:boolean;reason:string|null;catalogVersion:string;sections:(StandardCounts&{id:string;title:string;category:string})[]}
export interface StandardDetails extends ServiceDetails {naReasons?:Record<string,string>;criterionObservations?:{id:string;standardId:string;description:string;evidenceIds:string[]}[]}
export interface StandardSource {brandId:string;brandName:string;version:string;templateId:string|null;sections:{id:string;title:string;category:string;questions:{id:string;sourceRisk:string|null}[]}[]}
export interface StandardGroup extends StandardCounts {id:string;label:string}
export interface StandardMetrics {counts:StandardCounts;total:number;completed:number;coverage:{restaurants:number;brands:number};statuses:Record<string,number>;brands:StandardGroup[];restaurants:StandardGroup[];sections:StandardGroup[];criteria:StandardGroup[];trend:StandardGroup[];actions:{_id:{status:string;responsible?:string};count:number;responsibleName?:string}[]|null;findings:{_id:{status:string};count:number}[]|null;reason:string|null}
export const readSources=(_id:string,signal?:AbortSignal,scopeKey?:string)=>readJson<{data:StandardSource[]}>('/audit-standard/sources',{signal,scopeKey,suppressErrorToast:true});
export const readOptions=(_id:string,signal?:AbortSignal,scopeKey?:string)=>readJson<{data:ServiceRestaurant[]}>('/audit-standard/options',{signal,scopeKey,suppressErrorToast:true});
export const readAnalyticsSources=(_id:string,signal?:AbortSignal,scopeKey?:string)=>readJson<{data:StandardSource[]}>('/audit-standard/analytics-sources',{signal,scopeKey,suppressErrorToast:true});
export const readAnalyticsOptions=(_id:string,signal?:AbortSignal,scopeKey?:string)=>readJson<{data:ServiceRestaurant[]}>('/audit-standard/analytics-options',{signal,scopeKey,suppressErrorToast:true});
export const readList=(query:string,signal?:AbortSignal,scopeKey?:string)=>readJson<ServicePage>(`/audit-standard/list?${query}`,{signal,scopeKey,suppressErrorToast:true});
export const readAnalytics=(query:string,signal?:AbortSignal,scopeKey?:string)=>readJson<{data:StandardMetrics}>(`/audit-standard/analytics?${query}`,{signal,scopeKey,suppressErrorToast:true});
export const provision=async(brand:string,signal?:AbortSignal)=>api.post(`/audit-standard/templates/${brand}`,{},{signal,suppressErrorToast:true});
export const create=async(body:{brandId:string;restaurantId:string;date:string},signal?:AbortSignal)=>(await api.post('/audit-standard/audits',body,{signal,suppressErrorToast:true})).data;
export const saveStandard=async(execution:AuditExecution,answers:AuditExecutionAnswer[],details:StandardDetails,complete:boolean,signal?:AbortSignal)=>(await api.put(`/audit-execution/${execution._id}/${complete?'submit':'standard-draft'}`,{answers,details,evidenceLinks:details.evidenceLinks||[],expectedVersion:execution.standardVersion||0},{signal,suppressErrorToast:true})).data;
