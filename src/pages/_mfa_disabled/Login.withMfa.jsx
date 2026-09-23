/** DISABLED — MFA Login variant. Not imported. See README.md. */

/**
 * Login page – email/password + Admin MFA challenge when required.
 */
import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, useLocation, Link } from 'react-router-dom';
import { Mail, Lock, Building2, ShieldCheck } from 'lucide-react';
import { supabase } from '../services/supabase';
import { useAuthContext } from '../auth/AuthContext';
import { ROLE_ROUTES } from '../utils/constants';
import { Button, Input, Card } from '../components/common';
import { usePlatformLoader } from '../context/LoaderContext';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [mfaCode, setMfaCode] = useState('');
  const [mfaFactorId, setMfaFactorId] = useState(null);
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

    let cancelled = false;
    (async () => {
      if (profile?.password_expired) {
        setPendingRedirect(false);
        navigate('/change-password', { replace: true });
        return;
      }

      if (profile?.role === 'Admin') {
        try {
          const { data: aal } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
          const factors = await supabase.auth.mfa.listFactors();
          const totp = factors.data?.totp?.filter((f) => f.status === 'verified') || [];
          if (cancelled) return;
          setPendingRedirect(false);
          if (totp.length === 0 || aal?.currentLevel !== 'aal2') {
            navigate('/admin/security', { replace: true });
          } else {
            navigate(ROLE_ROUTES.Admin || '/admin', { replace: true });
          }
          return;
        } catch {
          if (cancelled) return;
          setPendingRedirect(false);
          navigate('/admin/security', { replace: true });
          return;
        }
      }

      const path = profile?.role && ROLE_ROUTES[profile?.role]
        ? ROLE_ROUTES[profile.role]
        : redirect;
      setPendingRedirect(false);
      navigate(path);
    })();

    return () => {
      cancelled = true;
    };
  }, [pendingRedirect, user, profile, loading, redirect, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLocalError('');
    showLoader('login');
    try {
      const { error, data } = await signIn(email, password);
      if (error) return;

      // After password auth, Admin must enroll MFA or complete AAL2 challenge
      try {
        await refreshProfile();
        const { data: aal } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
        const factors = await supabase.auth.mfa.listFactors();
        const totp = factors.data?.totp?.filter((f) => f.status === 'verified') || [];

        if (aal?.currentLevel === 'aal1' && totp.length > 0) {
          setMfaFactorId(totp[0].id);
          return;
        }

        if (totp.length === 0) {
          setPendingRedirect(true);
          return;
        }
      } catch {
        /* MFA not enabled in project — continue */
      }

      void data;
      setPendingRedirect(true);
    } finally {
      hideLoader();
    }
  };

  const handleMfa = async (e) => {
    e.preventDefault();
    setLocalError('');
    showLoader('login', { title: 'Verifying code', message: 'Checking your authenticator…' });
    try {
      const challenge = await supabase.auth.mfa.challenge({ factorId: mfaFactorId });
      if (challenge.error) throw challenge.error;
      const verified = await supabase.auth.mfa.verify({
        factorId: mfaFactorId,
        challengeId: challenge.data.id,
        code: mfaCode.trim(),
      });
      if (verified.error) throw verified.error;
      await refreshProfile();
      setMfaFactorId(null);
      setPendingRedirect(true);
    } catch (err) {
      setLocalError(err.message || 'Invalid verification code');
    } finally {
      hideLoader();
    }
  };

  if (mfaFactorId) {
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
              <ShieldCheck className="h-10 w-10" />
            </div>
            <h1 className="text-xl font-bold text-text-primary">Two-factor authentication</h1>
            <p className="text-sm text-text-secondary mt-1">
              Enter the 6-digit code from your authenticator app
            </p>
          </div>
          <form onSubmit={handleMfa} className="space-y-4">
            <Input
              label="Authentication code"
              value={mfaCode}
              onChange={(e) => setMfaCode(e.target.value)}
              required
              autoComplete="one-time-code"
              autoFocus
            />
            {(localError || authError) && (
              <p className="text-sm text-error">{localError || authError}</p>
            )}
            <Button type="submit" variant="primary" fullWidth>
              Verify
            </Button>
          </form>
        </Card>
      </div>
    );
  }

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
