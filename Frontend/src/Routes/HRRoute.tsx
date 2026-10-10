import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../Context/useAuth';
import { hasPermission } from '../Utils/permissions';
import HRResourceState from '../Components/HRResourceState';

export default function HRRoute({ resource, action = 'read' }: { resource: string; action?: string }) {
  const { user, isLoading } = useAuth();
  const location = useLocation();
  const context = JSON.stringify([location.pathname, user?.id, user?.role, user?.departmentId, user?.permissions]);
  if (isLoading) return <HRResourceState status="loading" />;
  if (!user) return <Navigate to="/login" replace />;
  if (!hasPermission(user, resource, action)) return <HRResourceState status="forbidden" />;
  return <Outlet key={context} />;
}
