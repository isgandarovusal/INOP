import { Link } from "react-router-dom";
import { ShieldAlert } from "lucide-react";
import { useTranslation } from "react-i18next";

const Unauthorized: React.FC = () => {
  const { t } = useTranslation();

  return (
    <div className="state-page">
      <ShieldAlert size={40} />
      <h2>{t("unauthorized.title")}</h2>
      <p>{t("unauthorized.message")}</p>
      <Link to="/app/dashboard" className="btn-primary">
        {t("unauthorized.backToDashboard")}
      </Link>
    </div>
  );
};

export default Unauthorized;
