import { useTranslation } from 'react-i18next';
import { useId } from 'react';
import Modal from './Modal';
type Props = { url: string; type?: string; text?: string; name: string; onClose: () => void; onDownload?: () => void; downloading?: boolean };
export default function PrivateFilePreview({ url, type, text, name, onClose, onDownload, downloading }: Props) {
  const { t } = useTranslation();
  const titleId = useId();
  return <Modal titleId={titleId} className="file-preview-modal" onClose={onClose}>
    <div className="file-preview-modal__header"><h2 id={titleId}>{name}</h2><button className="btn-secondary" type="button" onClick={onClose}>{t('cvReview.close', { defaultValue: 'Bağla' })}</button></div>
    {type === "application/pdf" && <iframe referrerPolicy="no-referrer" src={url} title={name} style={{ width: "100%", height: "65vh" }} />}
    {text !== undefined && <><p>{t('cvReview.textPreview', { defaultValue: 'Extracted text preview; original layout may differ.' })}</p><pre style={{ whiteSpace: 'pre-wrap', maxHeight: '65vh', overflow: 'auto' }}>{text}</pre></>}
    <a className="btn-secondary" href={url} download={name} aria-disabled={downloading || undefined} onClick={event => { if (downloading) { event.preventDefault(); return; } if (onDownload) { event.preventDefault(); onDownload(); } }}>{t('cvReview.download', { defaultValue: 'Endir' })}: {name}</a>
  </Modal>;
}
