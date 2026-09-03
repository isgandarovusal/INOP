import { Link } from "react-router-dom";
import { CompassIcon } from "lucide-react";

const NotFound: React.FC = () => {
  return (
    <div className="state-page">
      <CompassIcon size={40} />
      <h2>Page not found</h2>
      <p>The page you're looking for doesn't exist or has moved.</p>
      <Link to="/app/dashboard" className="btn-primary">
        Back to dashboard
      </Link>
    </div>
  );
};

export default NotFound;
