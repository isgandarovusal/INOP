import { getCollection, delay } from "./storage";
import type { Audit } from "../Types/audit";
import type { Restaurant } from "../Types/audit";
import { overallScore } from "./auditsService";

const CRITICAL_THRESHOLD = 7;

export interface RestaurantScore {
  restaurantId: string;
  name: string;
  score: number;
}

export interface CategoryScore {
  category: string;
  score: number;
}

export interface TrendPoint {
  label: string;
  score: number;
}

export interface AuditAnalytics {
  overallScore: number;
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

export async function getAuditAnalytics(): Promise<AuditAnalytics> {
  const audits = getCollection<Audit>("audits");
  const restaurants = getCollection<Restaurant>("restaurants");

  if (audits.length === 0) {
    return delay({
      overallScore: 0,
      totalAudits: 0,
      restaurantsAudited: 0,
      criticalCount: 0,
      restaurantComparison: [],
      categoryAnalysis: [],
      historicalTrend: [],
    });
  }

  const overall = round1(
    audits.reduce((sum, a) => sum + overallScore(a), 0) / audits.length,
  );

  const criticalCount = audits.filter((a) => overallScore(a) < CRITICAL_THRESHOLD).length;
  const restaurantIds = new Set(audits.map((a) => a.restaurantId));

  const restaurantComparison: RestaurantScore[] = [...restaurantIds]
    .map((id) => {
      const restaurant = restaurants.find((r) => r.id === id);
      const restaurantAudits = audits.filter((a) => a.restaurantId === id);
      const score = round1(
        restaurantAudits.reduce((sum, a) => sum + overallScore(a), 0) / restaurantAudits.length,
      );
      return { restaurantId: id, name: restaurant?.name ?? "Unknown", score };
    })
    .sort((a, b) => b.score - a.score);

  const categories: (keyof Audit["scores"])[] = ["food", "cleanliness", "staff", "service"];
  const categoryAnalysis: CategoryScore[] = categories
    .map((category) => ({
      category: category.charAt(0).toUpperCase() + category.slice(1),
      score: round1(audits.reduce((sum, a) => sum + a.scores[category], 0) / audits.length),
    }))
    .sort((a, b) => b.score - a.score);

  const monthGroups = new Map<string, { sum: number; count: number; order: number }>();
  audits.forEach((audit) => {
    const d = new Date(audit.date);
    const key = d.toLocaleDateString(undefined, { month: "short", year: "2-digit" });
    const order = d.getFullYear() * 12 + d.getMonth();
    const existing = monthGroups.get(key);
    if (existing) {
      existing.sum += overallScore(audit);
      existing.count += 1;
    } else {
      monthGroups.set(key, { sum: overallScore(audit), count: 1, order });
    }
  });

  const historicalTrend: TrendPoint[] = [...monthGroups.entries()]
    .sort((a, b) => a[1].order - b[1].order)
    .map(([label, { sum, count }]) => ({ label, score: round1(sum / count) }));

  return delay({
    overallScore: overall,
    totalAudits: audits.length,
    restaurantsAudited: restaurantIds.size,
    criticalCount,
    restaurantComparison,
    categoryAnalysis,
    historicalTrend,
  });
}
