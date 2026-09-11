import { AlertTriangle, Loader2 } from "lucide-react";
import { useTranslation } from "react-i18next";

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
  confirmLabel,
  loading = false,
  onConfirm,
  onCancel,
}) => {
  const { t } = useTranslation();

  const resolvedConfirmLabel =
    confirmLabel ?? t("components.confirmDialog.defaultConfirm");

  return (
    <div className="modal-backdrop" onClick={onCancel}>
      <div
        className="modal-card anim-pop"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-card__icon modal-card__icon--danger">
          <AlertTriangle size={26} />
        </div>

        <h3 className="modal-card__title">{title}</h3>

        <p className="modal-card__subtitle">{message}</p>

        <div className="modal-card__actions">
          <button
            className="btn-danger-solid"
            onClick={onConfirm}
            disabled={loading}
          >
            {loading ? (
              <>
                <Loader2 size={15} className="spin" />
                {t("components.confirmDialog.deleting")}
              </>
            ) : (
              resolvedConfirmLabel
            )}
          </button>

          <button
            className="btn-cancel"
            onClick={onCancel}
            disabled={loading}
          >
            {t("components.confirmDialog.cancel")}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmDialog;
