/**
 * HMS portal guard — hides route when role/flag has no access (mirrors API 403).
 */
import { Navigate, useLocation } from 'react-router-dom';
import { useAuthContext } from '../auth/AuthContext';
import { canSeePortal } from '../permissions/hmsPermissions';
import { ROLE_ROUTES } from '../utils/constants';

export default function PortalGuard({ portal, children }) {
  const { role, profile, loading, isAuthenticated } = useAuthContext();
  const location = useLocation();

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <p className="text-text-secondary">Loading...</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  if (!canSeePortal(role, portal, profile)) {
    const home = ROLE_ROUTES[role] || '/hms';
    return <Navigate to={home} replace />;
  }

  return children;
}
