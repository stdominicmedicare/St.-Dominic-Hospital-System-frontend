/**
 * Wraps routes that require authentication.
 * Enforces password expiry redirect.
 */
import { Navigate, useLocation } from 'react-router-dom';
import { useAuthContext } from '../auth/AuthContext';

export default function ProtectedRoute({ children }) {
  const { isAuthenticated, loading, profile } = useAuthContext();
  const location = useLocation();
  const onChangePassword = location.pathname === '/change-password';

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background-light">
        <p className="text-text-secondary">Loading...</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (profile?.password_expired && !onChangePassword) {
    return <Navigate to="/change-password" replace />;
  }

  return children;
}
