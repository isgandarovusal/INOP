import type { ReactNode } from "react";

const EmptyState: React.FC<{ icon: ReactNode; title: string; hint: string }> = ({
  icon,
  title,
  hint,
}) => {
  return (
    <div className="empty-state">
      {icon}
      <p className="empty-state__title">{title}</p>
      <p className="empty-state__hint">{hint}</p>
    </div>
  );
};

export default EmptyState;
