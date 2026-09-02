import { AlertTriangle, Loader2 } from "lucide-react";

interface ConfirmDialogProps {
  title: string;
  message: string;
  confirmLabel?: string;
  loading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  title,
  message,
  confirmLabel = "Yes, delete it",
  loading = false,
  onConfirm,
  onCancel,
}) => {
  return (
    <div className="modal-backdrop" onClick={onCancel}>
      <div className="modal-card anim-pop" onClick={(e) => e.stopPropagation()}>
        <div className="modal-card__icon modal-card__icon--danger">
          <AlertTriangle size={26} />
        </div>
        <h3 className="modal-card__title">{title}</h3>
        <p className="modal-card__subtitle">{message}</p>
        <div className="modal-card__actions">
          <button className="btn-danger-solid" onClick={onConfirm} disabled={loading}>
            {loading ? (
              <>
                <Loader2 size={15} className="spin" /> Deleting…
              </>
            ) : (
              confirmLabel
            )}
          </button>
          <button className="btn-cancel" onClick={onCancel} disabled={loading}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmDialog;
