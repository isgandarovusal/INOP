import { readJson } from '../api/readRequest';
export interface AuditCatalog {data:{organizations:{id:string;name:string}[];brands:{id:string;name:string;organizationId:string}[]}}
export const getAuditCatalog=(_id:string,signal?:AbortSignal,scopeKey?:string)=>readJson<AuditCatalog>('/audit-catalog',{signal,scopeKey});
