import { readJson } from "../api/readRequest";
import type { Audit } from "../Types/audit";
import { overallScore } from "./auditsService";
import { categoryScores, scoreCategories } from "../Utils/auditScore";

const CRITICAL_THRESHOLD = 7;

export interface RestaurantScore {
  restaurantId: string;
  name: string;
  score: number | null;
}

export interface CategoryScore {
  category: string;
  score: number | null;
}

export interface TrendPoint {
  label: string;
  score: number | null;
}

export interface AuditAnalytics {
  overallScore: number | null;
  totalAudits: number;
  restaurantsAudited: number;
  criticalCount: number;
  restaurantComparison: RestaurantScore[];
  categoryAnalysis: CategoryScore[];
  historicalTrend: TrendPoint[];
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

export async function getAuditAnalytics(signal?: AbortSignal, scopeKey?: string): Promise<AuditAnalytics> {
  const data=await readJson<AuditAnalytics>("/audits/dashboard-summary",{signal,scopeKey});
  return {...data,historicalTrend:data.historicalTrend.map(item=>({...item,label:new Date(`${item.label}-01T00:00:00Z`).toLocaleDateString(undefined,{month:"short",year:"2-digit",timeZone:"UTC"})}))};
}

export function calculateAuditAnalytics(audits: Audit[], restaurants: { id: string; name: string }[]): AuditAnalytics {
  const names = new Map(restaurants.map(item => [item.id, item.name]));
  const restaurantGroups = new Map<string, {sum:number; count:number}>();
  const months = new Map<string, {sum:number; count:number; order:number}>();
  const categories = new Map<string, {sum:number; count:number}>();
  let sum = 0, scored = 0, criticalCount = 0;
  for (const audit of audits) {
    const score = overallScore(audit);
    const restaurant = restaurantGroups.get(audit.restaurantId) || {sum:0,count:0};
    restaurantGroups.set(audit.restaurantId, restaurant);
    const date = new Date(audit.date);
    const key = date.toLocaleDateString(undefined, {month:"short",year:"2-digit"});
    const month = months.get(key) || {sum:0,count:0,order:date.getFullYear()*12+date.getMonth()};
    if (!Number.isNaN(date.getTime())) months.set(key, month);
    if (score !== null) {
      sum += score; scored += 1;
      if (score < CRITICAL_THRESHOLD) criticalCount += 1;
      restaurant.sum += score; restaurant.count += 1;
      month.sum += score; month.count += 1;
    }
    const values = categoryScores(audit);
    for (const key of scoreCategories) {
      const value = values[key]; if (value === undefined) continue;
      const category = categories.get(key) || {sum:0,count:0};
      category.sum += value; category.count += 1; categories.set(key,category);
    }
  }
  const average = (group:{sum:number;count:number}) => group.count ? round1(group.sum/group.count) : null;
  return {
    overallScore: scored ? round1(sum/scored) : null,
    totalAudits: audits.length, restaurantsAudited: restaurantGroups.size, criticalCount,
    restaurantComparison: [...restaurantGroups].map(([id,group]) => ({restaurantId:id,name:names.get(id)||"Unknown",score:average(group)}))
      .sort((a,b)=>(b.score ?? -1)-(a.score ?? -1)),
    categoryAnalysis: scoreCategories.flatMap(key => {const group=categories.get(key);return group ? [{category:key.charAt(0).toUpperCase()+key.slice(1),score:average(group)}] : [];})
      .sort((a,b)=>(b.score ?? -1)-(a.score ?? -1)),
    historicalTrend: [...months].sort((a,b)=>a[1].order-b[1].order).map(([label,group])=>({label,score:average(group)})),
  };
}
