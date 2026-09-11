import type { AuditMeta, AuditFinding } from "./common";

export type StandardResult =
  | "compliant"
  | "minor"
  | "major"
  | "critical";

export interface StandardChecklistResult {
  checkId: string;
  categoryId: string;
  subsectionId: string;
  result: StandardResult;
  finding: string;
  correctiveAction: string;
}

export interface StandardSubsectionStats {
  id: string;
  name: string;
  total: number;
  critical: number;
  major: number;
  minor: number;
}

export interface StandardCategoryStats {
  id: string;
  name: string;
  total: number;
  critical: number;
  major: number;
  minor: number;
  subsections: StandardSubsectionStats[];
}

export interface StandardAudit extends AuditMeta {
  type: "standard";
  results: StandardChecklistResult[];
  categories: StandardCategoryStats[];
  findings: AuditFinding[];
  foundCritical: number;
  foundMajor: number;
  foundMinor: number;
  foundTotal: number;
  compliancePercentage: number;
  passed: boolean;
}
