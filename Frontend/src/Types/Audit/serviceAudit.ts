import type { AuditMeta, AuditFinding } from "./common";

export type ServiceAnswer = "yes" | "no" | "na";

export interface ServiceCheckResult {
  checkId: string;
  answer: ServiceAnswer;
  comment: string;
}

export interface ServiceTimeObservation {
  guestNumber: number;
  seconds: number | null;
  comment: string;
}

export interface ServiceAuditTemplateSnapshot {
  id: string;
  name: string;
  version: string;
  sections: Array<{
    id: string;
    title: string;
    questions: Array<{
      id: string;
      label: string;
      answerType: string;
    }>;
  }>;
}

export interface ServiceAudit extends AuditMeta {
  type: "service";

  templateId?: string;

  templateSnapshot?: ServiceAuditTemplateSnapshot;

  checks: ServiceCheckResult[];
  serviceTimeObservations: ServiceTimeObservation[];
  findings: AuditFinding[];
  overallPercentage: number;
  recommendations: string[];
}
