import { Link } from "react-router-dom";
import { CompassIcon } from "lucide-react";
import { useTranslation } from "react-i18next";

const NotFound: React.FC = () => {
  const { t } = useTranslation();

  return (
    <div className="state-page">
      <CompassIcon size={40} />
      <h2>{t("notFound.title")}</h2>
      <p>{t("notFound.message")}</p>
      <Link to="/app/dashboard" className="btn-primary">
        {t("notFound.backToDashboard")}
      </Link>
    </div>
  );
};

export default NotFound;
