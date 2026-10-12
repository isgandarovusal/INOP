import { useEffect, useRef, useState } from "react";
import { isAxiosError, isCancel } from "axios";
import { useTranslation } from "react-i18next";
import { suggestCvReview, type CvFactProposal, type CvReviewProposal } from "../Services/hrAiService";
import AIAvailability from './AIAvailability';

export default function CvReviewAssistant({ id, hash, revision, onApprove, onAccessDenied }: {
  id: string; hash: string; revision: number; onApprove: (rows: CvFactProposal[]) => void;
  onAccessDenied: (status: "unauthenticated" | "forbidden" | "not-found") => void;
}) {
  const { t } = useTranslation(), request = useRef<{ sequence: number; controller?: AbortController }>({ sequence: 0 });
  const [pending, setPending] = useState(false), [error, setError] = useState("");
  const [proposal, setProposal] = useState<CvReviewProposal | null>(null), [selected, setSelected] = useState<number[]>([]);
  useEffect(() => () => { request.current.sequence++; request.current.controller?.abort(); }, []);
  async function generate() {
    if (pending) return;
    const controller = new AbortController(), sequence = ++request.current.sequence;
    request.current.controller?.abort(); request.current.controller = controller; setPending(true); setProposal(null); setError("");
    try {
      const result = await suggestCvReview(id, hash, revision, controller.signal);
      if (controller.signal.aborted || sequence !== request.current.sequence) return;
      setProposal(result); setSelected(result.proposals.map((_, index) => index));
    } catch (e) {
      if (controller.signal.aborted || sequence !== request.current.sequence || isCancel(e)) return;
      const status = isAxiosError(e) ? e.response?.status : undefined;
      const code = isAxiosError(e) ? e.response?.data?.code : e && typeof e === "object" && "code" in e ? e.code : undefined;
      if (code === "AI_AUTHORIZATION_CHANGED") { onAccessDenied("forbidden"); return; }
      if (status === 401 || status === 403 || status === 404 && code !== "AI_SOURCE_UNAVAILABLE") { onAccessDenied(status === 401 ? "unauthenticated" : status === 403 ? "forbidden" : "not-found"); return; }
      setError(code === "AI_CONFIGURATION_REQUIRED" ? "hrAi.setupState.configuration_required" : code === "AI_UNAVAILABLE" ? "hrCvAi.setupRequired" : code === "AI_SOURCE_UNAVAILABLE" ? "hrCvAi.sourceUnavailable" : code === "AI_NO_REVIEW_CONTEXT" ? "hrCvAi.noEvidence" : code === "AI_CONTEXT_CHANGED" ? "hrAi.changed" : code === "AI_TIMEOUT" ? "hrAi.timeout" : code === "AI_INVALID_OUTPUT" ? "hrAi.invalid" : status === 429 ? "hrAi.limited" : "hrAi.unavailable");
    } finally { if (!controller.signal.aborted && sequence === request.current.sequence) setPending(false); }
  }
  return <section data-cv-ai-assistant aria-label={t("hrCvAi.label")} aria-busy={pending}>
    <p>{t("hrCvAi.scope")}</p>
    <button type="button" className="btn-secondary" data-ai-action="cv-professional-review" disabled={pending} onClick={() => void generate()}>{t("hrCvAi.generate")}</button>
    <AIAvailability cv />
    {pending && <p role="status">{t("hrAi.processing")}</p>}
    {error && <p role="alert">{t(error)}</p>}
    {proposal && <div data-cv-ai-proposal>
      <p role="note">{t(proposal.provenance.mode === "mock_test_only" ? "hrAi.mock" : "hrAi.proposal")}</p>
      <p>{proposal.provenance.provider} · {proposal.provenance.model} · {proposal.version}</p>
      {proposal.status === "insufficient_context" && <p>{t("hrAi.insufficient")}</p>}
      {proposal.proposals.map((row, index) => <div key={`${row.field}:${row.value}`}>
        <label><input type="checkbox" checked={selected.includes(index)} onChange={e => setSelected(prev => e.target.checked ? [...prev, index] : prev.filter(i => i !== index))} />{t(`hrCvAi.fields.${row.field}`)}: {row.value}</label>
        <p>{row.reason} · {t("hrAi.confidence")}: {row.confidence === null ? t("hrAi.unknown") : `${Math.round(row.confidence * 100)}%`}</p>
        {row.evidenceIds.map(ref => <blockquote key={ref}>{proposal.evidence.find(f => f.id === ref)?.quote}</blockquote>)}
      </div>)}
      {proposal.uncertainty.map((note, index) => <p key={index}>{note}</p>)}
      {proposal.status === "suggested" && <button type="button" className="btn-secondary" disabled={!selected.length} onClick={() => { setProposal(null); onApprove(proposal.proposals.filter((_, index) => selected.includes(index))); }}>{t("hrCvAi.approve")}</button>}
      <button type="button" onClick={() => setProposal(null)}>{t("hrAi.dismiss")}</button>
    </div>}
  </section>;
}
