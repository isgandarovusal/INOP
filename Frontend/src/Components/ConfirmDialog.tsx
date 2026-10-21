import { useId } from 'react';
import { useTranslation } from 'react-i18next';
import { Loader2 } from 'lucide-react';
import Modal from './Modal';

type ConfirmDialogProps = { title:string; message:string; confirmLabel?:string; error?:string; destructive?:boolean; loading?:boolean; onConfirm:()=>void; onCancel:()=>void };
export default function ConfirmDialog({ title, message, confirmLabel, error, destructive=true, loading=false, onConfirm, onCancel }: ConfirmDialogProps) {
  const { t } = useTranslation(), id = useId();
  return <Modal titleId={id} descriptionId={id+'-description'} busy={loading} onClose={onCancel} focusCancel>
    <h3 id={id} className="modal-card__title">{title}</h3>
    <p id={id+'-description'} className="modal-card__subtitle">{message}</p>
    {error && <p role="alert" className="form-error form-error--submit">{error}</p>}
    <div className="modal-card__actions">
      <button type="button" className={destructive ? "btn-danger-solid" : "btn-primary"} onClick={onConfirm} disabled={loading}>{loading && <Loader2 size={16} className="spin"/>}{confirmLabel ?? t('components.confirmDialog.defaultConfirm')}</button>
      <button type="button" className="btn-cancel" onClick={onCancel} disabled={loading}>{t('components.confirmDialog.cancel')}</button>
    </div>
  </Modal>;
}
