import { onClientSessionReset } from './clientSession';
export function isAggregateMutation(method = 'get', url = '') { return !['get','head','options'].includes(method) && /^\/(?:jobs|candidates|applications|hr|auth|users|roles|departments|brands|branches)(?:[/?]|$)/.test(url); }
let epoch = 0;
const entries = new Map<string, { expires: number; data: unknown }>();
export function invalidateAggregates() { epoch++; entries.clear(); }
onClientSessionReset(invalidateAggregates);
export function aggregateEpoch() { return epoch; }
const allowed = (url: string) => ['/jobs/dashboard-summary','/applications/dashboard-summary'].includes(url);
const count = (value: unknown) => typeof value === 'number' && Number.isSafeInteger(value) && value >= 0;
const record = (value: unknown): value is Record<string,unknown> => !!value && typeof value === 'object' && !Array.isArray(value);
const exact = (value: Record<string,unknown>, keys: string[]) => Object.keys(value).length === keys.length && keys.every(key => Object.hasOwn(value,key));
function numericOnly(url: string, data: unknown) {
  if (!record(data) || !count(data.total)) return false;
  if (url === '/jobs/dashboard-summary') return exact(data,['total']);
  if (!exact(data,['total','pipeline'])) return false;
  const p = data.pipeline;
  return p === null || record(p) && exact(p,['version','unit','includesArchivedParents','total','shortlistedCount','statusBreakdown','unknownCount']) && p.version === 'application-stages-v1' && p.unit === 'application' && p.includesArchivedParents === true && count(p.total) && count(p.shortlistedCount) && count(p.unknownCount) && Array.isArray(p.statusBreakdown) && p.statusBreakdown.length <= 7 && p.statusBreakdown.every(row => record(row) && exact(row,['status','count']) && ['Applied','Screening','Shortlisted','Interview','Offered','Hired','Rejected'].includes(String(row.status)) && count(row.count));
}
const key = (url: string, scope: string, token: string, server: string) => JSON.stringify([server,url,scope,token]);
export function takeAggregate(url: string, scope?: string, server = '') {
  const token = localStorage.getItem('inop_auth_token');
  if (!scope || !token || !allowed(url)) return undefined;
  const id = key(url,scope,token,server), entry = entries.get(id);
  if (!entry || entry.expires <= Date.now()) { entries.delete(id); return undefined; }
  return structuredClone(entry.data);
}
export function keepAggregate(url: string, scope: string | undefined, token: string | null, started: number, data: unknown, server = '') {
  if (!scope || !token || token !== localStorage.getItem('inop_auth_token') || started !== epoch || !allowed(url) || !numericOnly(url,data)) return;
  if (entries.size >= 8) entries.delete(entries.keys().next().value!);
  entries.set(key(url,scope,token,server),{expires:Date.now()+10000,data:structuredClone(data)});
}
