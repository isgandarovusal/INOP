import type { ReactNode } from "react";
import { AlertCircle, Loader2 } from "lucide-react";

type PageStateProps = {
  type: "loading" | "error" | "empty";
  title?: string;
  message?: string;
  action?: ReactNode;
};

const PageState: React.FC<PageStateProps> = ({
  type,
  title,
  message,
  action,
}) => {
  if (type === "loading") {
    return (
      <div className="state-page">
        <Loader2 size={32} className="spin" aria-hidden="true" />
        {title && <p className="state-page__title">{title}</p>}
        {message && <p className="state-page__message">{message}</p>}
      </div>
    );
  }

  if (type === "error") {
    return (
      <div className="state-page state-page--error">
        <AlertCircle size={32} aria-hidden="true" />
        {title && <p className="state-page__title">{title}</p>}
        {message && <p className="state-page__message">{message}</p>}
        {action && <div className="state-page__action">{action}</div>}
      </div>
    );
  }

  return (
    <div className="state-page">
      {title && <p className="state-page__title">{title}</p>}
      {message && <p className="state-page__message">{message}</p>}
      {action && <div className="state-page__action">{action}</div>}
    </div>
  );
};

export default PageState;
