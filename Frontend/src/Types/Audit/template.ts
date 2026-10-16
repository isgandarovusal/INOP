export type AuditTemplateType =
  | "hr"
  | "service"
  | "standard"
  | "occupational-safety";

export type AuditTemplateStatus =
  | "draft"
  | "active"
  | "archived";

export type AuditQuestionAnswerType =
  | "yes-no-na"
  | "severity"
  | "score"
  | "hr-score" | "service-score" | "standard-result" | "hse-result"
  | "text";

export interface AuditTemplateQuestion {
  id: string;
  label: string;
  clarification?:string;
  guidance?: string;
  sourceCell?: string;
  sourceRisk?: string|null;
  sourceCode?:string;
  weight?:number|null;
  normativeReference?:string|null;
  sourceMetadata?:Record<string,string>;
  worksheet?: string;
  answerType: AuditQuestionAnswerType;
  required: boolean;
  active: boolean;
  order: number;
}

export interface AuditTemplateSubsection {
  id: string;
  title: string;
  active: boolean;
  order: number;
  questions: AuditTemplateQuestion[];
}

export interface AuditTemplateSection {
  id: string;
  title: string;
  active: boolean;
  order: number;
  subsections: AuditTemplateSubsection[];
  questions: AuditTemplateQuestion[];
}

export interface AuditTemplate {
  hseSource?:{objectType:import('../../Services/hseAuditService').HseKind;sha256:string;version:string;contract:string};
  standardSource?: {sha256:string;version:string;scoringStatus:string};
  serviceSource?: {sha256:string;version:string;scoringStatus:string};
  hrSource?: {sha256:string;version:string;scoringStatus:string};
  id: string;
  organizationId: string;
  brandId: string;
  brandName: string;
  auditType: AuditTemplateType;
  name: string;
  version: string;
  status: AuditTemplateStatus;
  sections: AuditTemplateSection[];
  sourceDocumentIds: string[];
  createdBy: string;
  updatedBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface AuditSourceDocument {
  id: string;
  organizationId: string;
  brandId: string;
  auditType: AuditTemplateType;
  fileName: string;
  originalName: string;
  mimeType: string;
  size: number;
  storageKey: string;
  status:
    | "uploaded"
    | "processing"
    | "processed"
    | "failed";
  extractedData: unknown;
  uploadedBy: string;
  createdAt: string;
  updatedAt: string;
}
