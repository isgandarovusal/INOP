import type { ReactNode } from "react";
import { AlertCircle, Loader2 } from "lucide-react";
import { useTranslation } from "react-i18next";

type PageStateProps = {
  type: "loading" | "error" | "empty";
  title?: string;
  message?: string;
  action?: ReactNode;
  embedded?: boolean;
};

const PageState: React.FC<PageStateProps> = ({
  type,
  title,
  message,
  action,
  embedded = false,
}) => {
  const { t } = useTranslation();
  const className = `state-page${embedded ? ' state-page--embedded' : ''}`;
  if (type === "loading") {
    return (
      <div className={className} role="status" aria-live="polite" aria-busy="true">
        <Loader2 size={32} className="spin" aria-hidden="true" />
        <p className="state-page__title">{title || t('common.loading')}</p>
        {message && <p className="state-page__message">{message}</p>}
      </div>
    );
  }

  if (type === "error") {
    return (
      <div className={`${className} state-page--error`} role="alert">
        <AlertCircle size={32} aria-hidden="true" />
        {title && <p className="state-page__title">{title}</p>}
        {message && <p className="state-page__message">{message}</p>}
        {action && <div className="state-page__action">{action}</div>}
      </div>
    );
  }

  return (
    <div className={className}>
      {title && <p className="state-page__title">{title}</p>}
      {message && <p className="state-page__message">{message}</p>}
      {action && <div className="state-page__action">{action}</div>}
    </div>
  );
};

export default PageState;
