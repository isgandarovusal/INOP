import {readJson} from '../api/readRequest';
import api from '../api/axios';
import type {AuditExecution,AuditExecutionAnswer} from './auditExecutionService';
export interface ServiceSource {brandId:string;brandName:string;sha256:string;worksheet:string;worksheets:string[];scoringStatus:string;templateId:string|null;interviewGuide:{sheet:string;cells:{cell:string;text:string}[]}[]}
export interface ServiceRestaurant {id:string;name:string;brandId:string;organizationId:string}
export interface ServiceDetails {sectionPhotos?:Record<string,string>;referenceNotes?:Record<string,string>;editorialVersion?:string;roleAvailability?:Record<string,boolean>;finalEvidence?:{photoId?:string;documentIds?:string[]};restaurantManager?:string;shiftManager?:string;sectionNotes?:Record<string,string>;observations?:string;finalOpinion?:string;evidenceLinks?:{questionId:string;evidenceId:string}[]}
export interface ServiceGroup {id:string;label:string;count:number;scored:number;average:number|null;na?:number;nonconformities?:number}
export interface ServiceMetrics {filterOptions?:{auditors:{id:string;name:string}[];sections:{id:string;title:string;brandId:string}[]};legacyConformityExclusions?:number;statuses?:Record<string,number>;total:number;submitted:number;scored:number;unscored:number;average:number|null;nonconformities:number;brands:ServiceGroup[];restaurants:ServiceGroup[];sections:ServiceGroup[];criteria:ServiceGroup[];trend:ServiceGroup[];actions:{_id:string;count:number}[]|null;findings:{_id:string;count:number}[]|null;generatedAt:string}
export interface ServiceRow {id:string;_id:string;restaurantId:string;date:string;status:string;overallPercentage:number|null;assessmentStatus:string;templateSnapshot?:{brandId:string}}
export interface ServicePage {items:ServiceRow[];total:number;page:number;limit:number}
export const sources=(_id:string,signal?:AbortSignal,scopeKey?:string)=>readJson<{data:ServiceSource[]}>('/audit-service/sources',{signal,scopeKey,suppressErrorToast:true});
export const readService=(query:string,signal?:AbortSignal,scopeKey?:string)=>readJson<ServicePage>(`/audit-service/list?${query}`,{signal,scopeKey,suppressErrorToast:true});
export const readServiceAnalytics=(query:string,signal?:AbortSignal,scopeKey?:string)=>readJson<{data:ServiceMetrics}>(`/audit-service/analytics?${query}`,{signal,scopeKey,suppressErrorToast:true});
export const readServiceOptions=(analytics:boolean,signal?:AbortSignal,scopeKey?:string)=>readJson<{data:ServiceRestaurant[]}>(`/audit-service/${analytics?'analytics-options':'options'}`,{signal,scopeKey,suppressErrorToast:true});
export const readServiceCreateOptions=(signal?:AbortSignal)=>readJson<{data:ServiceRestaurant[]}>('/audit-service/restaurants',{signal,suppressErrorToast:true});
export const createService=async(body:{brandId:string;restaurantId:string;date:string},signal?:AbortSignal)=>(await api.post<{data:ServiceRow}>('/audit-service/audits',body,{signal,suppressErrorToast:true})).data;
export const provisionService=async(brandId:string,signal?:AbortSignal)=>api.post(`/audit-service/templates/${encodeURIComponent(brandId)}`,{},{signal,suppressErrorToast:true});
export const saveService=async(execution:AuditExecution,answers:AuditExecutionAnswer[],details:ServiceDetails,complete:boolean,signal?:AbortSignal)=>(await api.put<{data:AuditExecution}>(`/audit-execution/${execution._id}/${complete?'submit':'service-draft'}`,{answers,details,evidenceLinks:details.evidenceLinks||[],expectedVersion:execution.serviceVersion||0},{signal,suppressErrorToast:true})).data;
