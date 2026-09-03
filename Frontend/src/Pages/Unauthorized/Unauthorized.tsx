import { Link } from "react-router-dom";
import { ShieldAlert } from "lucide-react";

const Unauthorized: React.FC = () => {
  return (
    <div className="state-page">
      <ShieldAlert size={40} />
      <h2>Access restricted</h2>
      <p>Your role doesn't have permission to view this page.</p>
      <Link to="/app/dashboard" className="btn-primary">
        Back to dashboard
      </Link>
    </div>
  );
};

export default Unauthorized;
