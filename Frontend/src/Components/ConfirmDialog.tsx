import { AlertTriangle, Loader2 } from "lucide-react";
import { useEffect, useRef } from "react";
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
  const confirmButtonRef = useRef<HTMLButtonElement>(null);

  const resolvedConfirmLabel =
    confirmLabel ?? t("components.confirmDialog.defaultConfirm");

  useEffect(() => {
    if (!loading) {
      confirmButtonRef.current?.focus();
    }
  }, []);

  useEffect(() => {
    if (loading) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onCancel();
      }
    };

    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [loading, onCancel]);

  return (
    <div
      className="modal-backdrop"
      onClick={() => {
        if (!loading) {
          onCancel();
        }
      }}
    >
      <div
        className="modal-card anim-pop"
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-dialog-title"
        aria-describedby="confirm-dialog-message"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-card__icon modal-card__icon--danger">
          <AlertTriangle size={26} aria-hidden="true" />
        </div>

        <h3 id="confirm-dialog-title" className="modal-card__title">
          {title}
        </h3>

        <p id="confirm-dialog-message" className="modal-card__subtitle">
          {message}
        </p>

        <div className="modal-card__actions">
          <button
            ref={confirmButtonRef}
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
