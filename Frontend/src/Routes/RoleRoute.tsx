import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../Context/AuthContext";
import { canAccessSection, type Section } from "../Utils/permissions";

const RoleRoute: React.FC<{ section: Section }> = ({ section }) => {
  const { user } = useAuth();
  if (!user) return null;
  if (!canAccessSection(user.role, section)) {
    return <Navigate to="/unauthorized" replace />;
  }
  return <Outlet />;
};

export default RoleRoute;
