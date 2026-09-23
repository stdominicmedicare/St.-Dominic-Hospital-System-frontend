/**
 * Wraps routes that require authentication.
 * Enforces password expiry redirects.
 *
 * MFA / 2FA disabled for now (client request).
 * Previous Admin MFA enrollment / AAL2 gate is archived at:
 *   src/pages/_mfa_disabled/ProtectedRoute.withMfa.jsx
 */
import { Navigate, useLocation } from 'react-router-dom';
import { useAuthContext } from '../auth/AuthContext';
import PlatformLoader from '../components/common/PlatformLoader';

export default function ProtectedRoute({ children }) {
  const { isAuthenticated, loading, profile } = useAuthContext();
  const location = useLocation();
  const onChangePassword = location.pathname === '/change-password';
  // MFA disabled: const onSecurityPage = location.pathname === '/admin/security';
  // MFA disabled: mfaState check + redirect to /admin/security or login when AAL2 missing.

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
