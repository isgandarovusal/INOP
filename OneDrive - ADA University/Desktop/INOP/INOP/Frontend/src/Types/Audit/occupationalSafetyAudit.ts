import type { AuditMeta, AuditFinding } from "./common";

export interface SafetyCheckResult {
  checkId: string;
  note: string;
  score: number | null;
}

export interface OccupationalSafetyAudit extends AuditMeta {
  type: "occupational-safety";
  checks: SafetyCheckResult[];
  findings: AuditFinding[];
  totalScore: number;
  maxScore: number;
  scorePercentage: number;
}
