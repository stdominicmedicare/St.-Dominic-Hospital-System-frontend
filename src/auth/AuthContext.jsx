import { createContext, useContext, useEffect } from 'react';
import { useAuth } from './useAuth';
import { useIdleLogout } from '../hooks/useIdleLogout';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const auth = useAuth();

  useIdleLogout({
    enabled: !!auth.user,
    onIdle: () => {
      // Phase 5: 15-minute idle auto-logout (HTML screen 15)
      auth.signOut('idle');
    },
  });

  // Clear session if profile reports deactivated mid-session
  useEffect(() => {
    if (auth.profileError && String(auth.profileError).includes('deactivated')) {
      auth.signOut();
    }
  }, [auth.profileError, auth.signOut]);

  return (
    <AuthContext.Provider value={auth}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuthContext() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuthContext must be used within AuthProvider');
  }
  return ctx;
}
