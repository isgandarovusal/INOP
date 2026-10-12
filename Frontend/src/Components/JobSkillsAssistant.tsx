import { useEffect, useRef, useState } from "react";
import { isAxiosError, isCancel } from "axios";
import { useTranslation } from "react-i18next";
import { Loader2, Sparkles } from "lucide-react";
import TagInput from "./TagInput";
import { suggestJobSkills, type JobSkillsContext, type JobSkillsProposal } from "../Services/hrAiService";

// Parent keys this component by the immutable professional draft and auth/route
// identity. Late results from a previous draft can never approve new criteria.
export default function JobSkillsAssistant({ context, jobId, onApprove, onAccessDenied }: {
  context: JobSkillsContext; jobId?: string;
  onApprove: (required: string[], preferred: string[]) => void;
  onAccessDenied: (status: "unauthenticated" | "forbidden" | "not-found") => void;
}) {
  const { t } = useTranslation();
  const request = useRef<{ sequence: number; controller?: AbortController }>({ sequence: 0 });
  const [pending, setPending] = useState(false), [proposal, setProposal] = useState<JobSkillsProposal | null>(null);
  const [error, setError] = useState(""), [required, setRequired] = useState<string[]>([]), [preferred, setPreferred] = useState<string[]>([]);
  useEffect(() => () => { request.current.sequence++; request.current.controller?.abort(); }, []);
  async function generate() {
    if (pending || !context.title.trim() || !context.description.trim()) return;
    request.current.controller?.abort();
    const controller = new AbortController(), sequence = ++request.current.sequence;
    request.current.controller = controller; setPending(true); setError(""); setProposal(null);
    try {
      const result = await suggestJobSkills(context, jobId, controller.signal);
      if (controller.signal.aborted || sequence !== request.current.sequence) return;
      setProposal(result); setRequired(result.requiredSkills.map(row => row.name)); setPreferred(result.preferredSkills.map(row => row.name));
    } catch (e) {
      if (controller.signal.aborted || sequence !== request.current.sequence || isCancel(e)) return;
      const status = isAxiosError(e) ? e.response?.status : undefined;
      if (status === 401 || status === 403 || status === 404) { onAccessDenied(status === 401 ? "unauthenticated" : status === 403 ? "forbidden" : "not-found"); return; }
      const code = isAxiosError(e) ? e.response?.data?.code : e && typeof e === "object" && "code" in e ? e.code : undefined;
      if (code === "AI_AUTHORIZATION_CHANGED") { onAccessDenied("forbidden"); return; }
      const message = code === "AI_CONFIGURATION_REQUIRED" ? "setupState.configuration_required" : code === "AI_UNAVAILABLE" ? "setupState.not_configured" : code === "AI_CONTEXT_CHANGED" ? "changed" : code === "AI_TIMEOUT" ? "timeout" : code === "AI_INVALID_OUTPUT" ? "invalid" : code === "AI_INVALID_CONTEXT" ? "context" : status === 429 ? "limited" : "unavailable";
      setError(message);
    } finally { if (!controller.signal.aborted && sequence === request.current.sequence) setPending(false); }
  }
  return <section aria-label={t("hrAi.label")} aria-busy={pending} className="form-group form-group--full" data-job-skills-assistant>
    <p>{t("hrAi.notice")}</p>
    {(!context.title.trim() || !context.description.trim()) && <p>{t('hrAi.contextRequired')}</p>}
    <button type="button" className="btn-secondary" data-ai-action="job-skills" disabled={pending || !context.title.trim() || !context.description.trim()} onClick={() => void generate()}>
      {pending ? <Loader2 size={14} className="spin" /> : <Sparkles size={14} />}{t("hrAi.generate")}
    </button>
    {pending && <p role="status">{t("hrAi.processing")}</p>}
    {error && <p role="alert">{t(`hrAi.${error}`)}</p>}
    {proposal && <div data-ai-proposal>
      <p role="note">{t(proposal.provenance.mode === "mock_test_only" ? "hrAi.mock" : "hrAi.proposal")}</p>
      <p>{proposal.provenance.provider} · {proposal.provenance.model} · {proposal.version}</p>
      {proposal.status === "insufficient_context" ? <p>{t("hrAi.insufficient")}</p> : <>
        {[...proposal.requiredSkills, ...proposal.preferredSkills].map(row => <p key={row.name}><strong>{row.name}</strong> — {row.reason} · {t("hrAi.confidence")}: {row.confidence === null ? t("hrAi.unknown") : `${Math.round(row.confidence * 100)}%`}</p>)}
        <TagInput label={t("hrAi.required")} values={required} onChange={setRequired} />
        <TagInput label={t("hrAi.preferred")} values={preferred} onChange={setPreferred} />
        <button type="button" className="btn-secondary" onClick={() => { setProposal(null); onApprove(required, preferred); }}>{t("hrAi.approve")}</button>
      </>}
      {proposal.uncertainty.map((note, index) => <p key={index}>{note}</p>)}
      <button type="button" onClick={() => setProposal(null)}>{t("hrAi.dismiss")}</button>
    </div>}
  </section>;
}
