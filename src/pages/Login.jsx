/**
 * Login page – email/password sign-in with role-based redirect.
 */
import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, useLocation, Link } from 'react-router-dom';
import { Mail, Lock, Building2 } from 'lucide-react';
import { useAuthContext } from '../auth/AuthContext';
import { ROLE_ROUTES } from '../utils/constants';
import { Button, Input, Card } from '../components/common';
import { usePlatformLoader } from '../context/LoaderContext';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [pendingRedirect, setPendingRedirect] = useState(false);
  const [localError, setLocalError] = useState('');
  const { signIn, profile, user, loading, error: authError, refreshProfile } = useAuthContext();
  const { showLoader, hideLoader } = usePlatformLoader();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const fromPath = location.state?.from?.pathname;
  const redirect = searchParams.get('redirect') || fromPath || '/';

  useEffect(() => {
    if (!pendingRedirect || !user || loading) return;

    if (profile?.password_expired) {
      setPendingRedirect(false);
      navigate('/change-password', { replace: true });
      return;
    }

    const path =
      profile?.role && ROLE_ROUTES[profile.role] ? ROLE_ROUTES[profile.role] : redirect;
    setPendingRedirect(false);
    navigate(path);
  }, [pendingRedirect, user, profile, loading, redirect, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLocalError('');
    showLoader('login');
    try {
      const { error } = await signIn(email, password);
      if (error) return;
      await refreshProfile();
      setPendingRedirect(true);
    } finally {
      hideLoader();
    }
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4"
      style={{
        background: `linear-gradient(to right, var(--color-bg-gradient-start), var(--color-bg-gradient-end))`,
      }}
    >
      <Card className="w-full max-w-md">
        <div className="flex flex-col items-center text-center mb-6">
          <div className="rounded-full bg-primary p-4 text-white mb-4">
            <Building2 className="h-10 w-10" />
          </div>
          <h1 className="text-xl font-bold text-text-primary sm:text-2xl">
            St. Dominic Care
          </h1>
          <p className="text-sm text-text-secondary mt-1">
            Sign in to access your dashboard
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Email Address"
            type="email"
            placeholder="admin@stdominiccare.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            leftIcon={<Mail className="h-5 w-5 text-text-muted" />}
            required
            autoComplete="email"
          />
          <Input
            label="Password"
            type="password"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            leftIcon={<Lock className="h-5 w-5 text-text-muted" />}
            required
            autoComplete="current-password"
          />
          {(authError || localError) && (
            <p className="text-sm text-error">{authError || localError}</p>
          )}
          <Button type="submit" variant="primary" fullWidth>
            Sign In
          </Button>
        </form>

        <p className="mt-6 text-center text-sm text-text-muted">
          Patient?{' '}
          <Link to="/signup" className="font-medium text-primary hover:underline">
            Sign up
          </Link>
          {' · '}Secure role-based access
        </p>
      </Card>
    </div>
  );
}
