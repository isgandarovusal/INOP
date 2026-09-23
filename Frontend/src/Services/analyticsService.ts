import { getAudits } from "./auditsService";
import { getRestaurants } from "./restaurantsService";
import type { Audit } from "../Types/audit";
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
  const [auditResult, restaurantResult] = await Promise.all([
    getAudits(),
    getRestaurants(),
  ]);

  const audits = Array.isArray(auditResult) ? auditResult : [];
  const restaurants = Array.isArray(restaurantResult)
    ? restaurantResult
    : [];

  if (audits.length === 0) {
    return {
      overallScore: 0,
      totalAudits: 0,
      restaurantsAudited: 0,
      criticalCount: 0,
      restaurantComparison: [],
      categoryAnalysis: [],
      historicalTrend: [],
    };
  }

  const restaurantMap = new Map(restaurants.map((restaurant) => [restaurant.id, restaurant]));
  const restaurantGroups = new Map<string, { sum: number; count: number }>();
  const monthGroups = new Map<string, { sum: number; count: number; order: number }>();

  let totalScore = 0;
  let criticalCount = 0;

  const categoryTotals: Record<keyof Audit["scores"], number> = {
    food: 0,
    cleanliness: 0,
    staff: 0,
    service: 0,
  };

  audits.forEach((audit) => {
    const score = overallScore(audit);

    totalScore += score;

    if (score < CRITICAL_THRESHOLD) {
      criticalCount += 1;
    }

    categoryTotals.food += audit.scores.food;
    categoryTotals.cleanliness += audit.scores.cleanliness;
    categoryTotals.staff += audit.scores.staff;
    categoryTotals.service += audit.scores.service;

    const restaurantGroup = restaurantGroups.get(audit.restaurantId);

    if (restaurantGroup) {
      restaurantGroup.sum += score;
      restaurantGroup.count += 1;
    } else {
      restaurantGroups.set(audit.restaurantId, {
        sum: score,
        count: 1,
      });
    }

    const d = new Date(audit.date);
    const key = d.toLocaleDateString(undefined, {
      month: "short",
      year: "2-digit",
    });
    const order = d.getFullYear() * 12 + d.getMonth();
    const monthGroup = monthGroups.get(key);

    if (monthGroup) {
      monthGroup.sum += score;
      monthGroup.count += 1;
    } else {
      monthGroups.set(key, {
        sum: score,
        count: 1,
        order,
      });
    }
  });

  const overall = round1(totalScore / audits.length);

  const restaurantComparison: RestaurantScore[] = [...restaurantGroups.entries()]
    .map(([id, group]) => ({
      restaurantId: id,
      name: restaurantMap.get(id)?.name ?? "Unknown",
      score: round1(group.sum / group.count),
    }))
    .sort((a, b) => b.score - a.score);

  const categories: (keyof Audit["scores"])[] = [
    "food",
    "cleanliness",
    "staff",
    "service",
  ];

  const categoryAnalysis: CategoryScore[] = categories
    .map((category) => ({
      category: category.charAt(0).toUpperCase() + category.slice(1),
      score: round1(categoryTotals[category] / audits.length),
    }))
    .sort((a, b) => b.score - a.score);

  const historicalTrend: TrendPoint[] = [...monthGroups.entries()]
    .sort((a, b) => a[1].order - b[1].order)
    .map(([label, { sum, count }]) => ({
      label,
      score: round1(sum / count),
    }));

  return {
    overallScore: overall,
    totalAudits: audits.length,
    restaurantsAudited: restaurantGroups.size,
    criticalCount,
    restaurantComparison,
    categoryAnalysis,
    historicalTrend,
  };
}
