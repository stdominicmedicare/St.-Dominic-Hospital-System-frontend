/**
 * Force password change when password_expired or require_password_change is set by /api/auth/me.
 */
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Lock, Building2 } from 'lucide-react';
import { useAuthContext } from '../auth/AuthContext';
import { apiPost } from '../services/api';
import { validatePassword, PASSWORD_HINT } from '../utils/passwordPolicy';
import { ROLE_ROUTES } from '../utils/constants';
import { Button, Input, Card } from '../components/common';

export default function ChangePassword() {
  const { refreshProfile, signOut, profile } = useAuthContext();
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const firstLogin = Boolean(profile?.require_password_change);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    const check = validatePassword(password);
    if (!check.ok) {
      setError(check.error);
      return;
    }
    if (password !== confirm) {
      setError('Passwords do not match');
      return;
    }
    setLoading(true);
    try {
      await apiPost('/api/auth/change-password', { password });
      await refreshProfile();
      const path = ROLE_ROUTES[profile?.role] || '/hms';
      navigate(path, { replace: true });
    } catch (err) {
      setError(err.message || 'Failed to update password');
    } finally {
      setLoading(false);
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
          <h1 className="text-xl font-bold text-text-primary">
            {firstLogin ? 'Set your password' : 'Password expired'}
          </h1>
          <p className="text-sm text-text-secondary mt-1">
            {firstLogin
              ? 'Change your temporary password before using the system (first login).'
              : 'Passwords expire every 90 days. Set a new password to continue.'}
          </p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="New password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            leftIcon={<Lock className="h-5 w-5 text-text-muted" />}
            required
            autoComplete="new-password"
          />
          <Input
            label="Confirm password"
            type="password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            leftIcon={<Lock className="h-5 w-5 text-text-muted" />}
            required
            autoComplete="new-password"
          />
          <p className="text-xs text-text-muted">{PASSWORD_HINT}</p>
          {error && <p className="text-sm text-error">{error}</p>}
          <Button type="submit" variant="primary" fullWidth disabled={loading}>
            {loading ? 'Updating…' : 'Update password'}
          </Button>
          <Button type="button" variant="outline" fullWidth onClick={() => signOut()}>
            Sign out
          </Button>
        </form>
      </Card>
    </div>
  );
}
