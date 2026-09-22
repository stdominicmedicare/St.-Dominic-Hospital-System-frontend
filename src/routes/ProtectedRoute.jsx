/**
 * Wraps routes that require authentication.
 * Enforces password expiry redirects.
 */
import { Navigate, useLocation } from 'react-router-dom';
import { useAuthContext } from '../auth/AuthContext';
import PlatformLoader from '../components/common/PlatformLoader';

export default function ProtectedRoute({ children }) {
  const { isAuthenticated, loading, profile } = useAuthContext();
  const location = useLocation();
  const onChangePassword = location.pathname === '/change-password';

  if (loading) {
    return <PlatformLoader visible event="session" />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (profile?.password_expired && !onChangePassword) {
    return <Navigate to="/change-password" replace />;
  }

  return children;
}
