import type { ReactNode } from "react";

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  icon?: ReactNode;
}

const PageHeader: React.FC<PageHeaderProps> = ({ title, subtitle, actions, icon }) => {
  return (
    <div className="page-header anim-in">
      {icon ? <div className="page-header__identity">
        <span className="page-header__icon" aria-hidden="true">{icon}</span>
        <div><h2 className="page-header__title">{title}</h2>
          {subtitle && <p className="page-header__subtitle">{subtitle}</p>}
        </div>
      </div> : <div>
        <h2 className="page-header__title">{title}</h2>
        {subtitle && <p className="page-header__subtitle">{subtitle}</p>}
      </div>}
      {actions && <div className="page-header__actions">{actions}</div>}
    </div>
  );
};

export default PageHeader;
