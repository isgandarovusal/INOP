import { useTranslation } from 'react-i18next';
import type { CvReview } from '../Types/recruitment';

export default function CvReviewEvidence({ review }: { review?: CvReview }) {
  const { t } = useTranslation();
  if (!review?.version) return null;
  return <section data-cv-review={review.processingStatus}>
    <h3>{t('cvReview.heading')}</h3><p>{t(review.provider==='tesseract-rules'?'cvReview.ocrBased':review.provider==='openai-professional-evidence'?'cvReview.aiBased':'cvReview.ruleBased')} · {review.version} · {t(`cvReview.${review.reviewStatus ?? 'pending'}`)}</p>
    {review.provenance&&<p>{t(review.provenance.mode==='mock_test_only'?'hrAi.mock':'hrAi.proposal')} · {review.provenance.provider} · {review.provenance.model}</p>}
    {review.processingStatus !== 'extracted' && <p role="alert">{t(`cvReview.${review.processingStatus ?? 'failed'}`)}</p>}
    {review.warnings?.filter(code => ['text_limit', 'page_limit'].includes(code)).map(code => <p role="alert" key={code}>{t(`cvReview.${code}`)}</p>)}
    <p>{t(review.provider==='tesseract-rules'?'cvReview.ocrConfidenceExplanation':review.provider==='openai-professional-evidence'?'cvReview.aiConfidenceExplanation':'cvReview.confidenceExplanation')}</p>
    {review.processingApproval && <p data-processing-approval>{t("hrApproval.receipt")} · {review.processingApproval.parserVersion} · {review.processingApproval.sourceHash.slice(0,12)} · {review.processingApproval.sourceRevision}</p>}
    <details><summary>{t('cvReview.evidence')}</summary>{Object.entries(review.fields ?? {}).map(([field, value]) => <div key={field}>
      <strong>{field}</strong>: {value.confidence == null ? t('cvReview.unknown') : `${Math.round(value.confidence * 100)}/100`}
      {review.correctedFields?.includes(field) && <span> · {t('cvReview.corrected')}</span>}
      {value.evidence.map((quote, i) => <blockquote key={i}>{quote}</blockquote>)}
    </div>)}</details>
  </section>;
}
