import "../Styles/audit-workspace.css";
import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../Context/AuthContext";
import { canAccessSection, canAccessAuditDirection, hasPermission, type Section } from "../Utils/permissions";

const RoleRoute: React.FC<{ section: Section }> = ({ section }) => {
  const { user } = useAuth();
  const { pathname } = useLocation();
  const direction = pathname.includes('/audit/service') ? 'service' : pathname.includes('/audit/standard') ? 'standard' : pathname.includes('/audit/safety') ? 'occupational-safety' : pathname.includes('/audit/hr') ? 'hr' : null;
  const resource = pathname.includes('analytics') ? 'audit.analytics' : pathname.includes('/restaurants') ? 'restaurant' : pathname.includes('/checklists') ? 'audit.template' : 'audit';
  const action = pathname.endsWith('/new') ? 'create' : pathname.endsWith('/edit') ? 'update' : 'read';
  if (!user) return null;
  if (!canAccessSection(user, section) || (section === "audit" && ((user.role === "auditor" && !user.auditDirection) || !hasPermission(user, resource, action) || (direction && !canAccessAuditDirection(user, direction, resource))))) {
    return <Navigate to="/unauthorized" replace />;
  }
  return section === "audit" ? <div className="audit-workspace"><Outlet /></div> : <Outlet />;
};

export default RoleRoute;
