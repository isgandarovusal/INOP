import { useTranslation } from 'react-i18next';
type Props = { url: string; type?: string; text?: string; name: string; onClose: () => void; onDownload?: () => void; downloading?: boolean };
export default function PrivateFilePreview({ url, type, text, name, onClose, onDownload, downloading }: Props) {
  const { t } = useTranslation();
  return <div role="dialog" aria-label={name} className="audit-card">
    <button type="button" onClick={onClose}>{t('cvReview.close', { defaultValue: 'Bağla' })}</button>
    {type === "application/pdf" && <iframe referrerPolicy="no-referrer" src={url} title={name} style={{ width: "100%", height: "65vh" }} />}
    {text !== undefined && <><p>{t('cvReview.textPreview', { defaultValue: 'Extracted text preview; original layout may differ.' })}</p><pre style={{ whiteSpace: 'pre-wrap', maxHeight: '65vh', overflow: 'auto' }}>{text}</pre></>}
    <a href={url} download={name} aria-disabled={downloading || undefined} onClick={onDownload ? event => { event.preventDefault(); if (!downloading) onDownload(); } : undefined}>{t('cvReview.download', { defaultValue: 'Endir' })}: {name}</a>
  </div>;
}
