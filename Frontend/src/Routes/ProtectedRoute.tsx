import { Navigate, Outlet, useLocation } from "react-router-dom";
import RouteLoading from "../Components/RouteLoading";
import { useAuth } from "../Context/AuthContext";

const ProtectedRoute: React.FC = () => {
  const { user, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return <RouteLoading />;
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <Outlet />;
};

export default ProtectedRoute;
