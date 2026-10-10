import { useTranslation } from 'react-i18next';
import type { CvHistoryEntry } from '../Types/recruitment';

export default function CvHistoryEditor({ label, entries, onChange }: { label: string; entries: CvHistoryEntry[]; onChange: (entries: CvHistoryEntry[]) => void }) {
  const { t } = useTranslation();
  const update = (index: number, change: Partial<CvHistoryEntry>) => onChange(entries.map((entry, i) => i === index ? { ...entry, ...change } : entry));
  return <section><h4>{label}</h4>{entries.map((entry, i) => <fieldset key={i}>
    <label>{t('cvReview.originalText')}<textarea aria-label={`${label} ${i + 1} ${t('cvReview.originalText')}`} value={entry.raw} onChange={e => update(i, { raw: e.target.value })} maxLength={500} /></label>
    <label>{t('cvReview.organization')}<input value={entry.organization ?? ''} onChange={e => update(i, { organization: e.target.value || null })} maxLength={500} /></label>
    <label>{t('cvReview.title')}<input value={entry.title ?? ''} onChange={e => update(i, { title: e.target.value || null })} maxLength={500} /></label>
    {(['start', 'end'] as const).map(field => <label key={field}>{t(`cvReview.${field}`)}
      <input type="number" min={1900} max={2100} aria-label={`${label} ${i + 1} ${t(`cvReview.${field}`)} ${t('cvReview.year')}`} value={entry[field]?.year ?? ''} onChange={e => update(i, { [field]: e.target.value ? { year: Number(e.target.value), month: entry[field]?.month ?? null } : null })} />
      <select aria-label={`${label} ${i + 1} ${t(`cvReview.${field}`)} ${t('cvReview.month')}`} disabled={!entry[field]} value={entry[field]?.month ?? ''} onChange={e => update(i, { [field]: { year: entry[field]!.year, month: e.target.value ? Number(e.target.value) : null } })}>
        <option value="">{t('cvReview.unknown')}</option>{Array.from({ length: 12 }, (_, m) => <option key={m} value={m + 1}>{m + 1}</option>)}
      </select></label>)}
    <label><input type="checkbox" checked={entry.ongoing} onChange={e => update(i, { ongoing: e.target.checked })} />{t('cvReview.ongoing')}</label>
    <button type="button" onClick={() => onChange(entries.filter((_, index) => index !== i))}>{t('cvReview.remove')}</button>
  </fieldset>)}<button type="button" disabled={entries.length >= 50} onClick={() => onChange([...entries, { raw: '', organization: null, title: null, start: null, end: null, ongoing: false }])}>{t('cvReview.add')}</button></section>;
}
