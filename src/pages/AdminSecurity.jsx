/**
 * Admin MFA (TOTP) enrollment and status via Supabase Auth MFA.
 * Enable MFA in Supabase Dashboard → Authentication → Providers / Multi-Factor.
 */
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldCheck, QrCode } from 'lucide-react';
import { supabase } from '../services/supabase';
import { useAuthContext } from '../auth/AuthContext';
import { Button, Input, Card } from '../components/common';

const MFA_FRIENDLY_NAME = 'St. Dominic Care Admin';

export default function AdminSecurity() {
  const { role, refreshProfile } = useAuthContext();
  const navigate = useNavigate();
  const [factors, setFactors] = useState([]);
  const [unverifiedFactors, setUnverifiedFactors] = useState([]);
  const [enroll, setEnroll] = useState(null);
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(true);

  const loadFactors = async () => {
    setLoading(true);
    setError('');
    try {
      const { data, error: e } = await supabase.auth.mfa.listFactors();
      if (e) throw e;
      const verified = data?.totp || [];
      const unverified = (data?.all || []).filter(
        (f) => f.factor_type === 'totp' && f.status === 'unverified'
      );
      setFactors(verified);
      setUnverifiedFactors(unverified);
    } catch (err) {
      setError(err.message || 'Could not load MFA factors. Enable MFA in Supabase Auth settings.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadFactors();
  }, []);

  const removeFactor = async (factorId) => {
    const { error: e } = await supabase.auth.mfa.unenroll({ factorId });
    if (e) throw e;
  };

  const clearIncompleteEnrollments = async () => {
    for (const f of unverifiedFactors) {
      await removeFactor(f.id);
    }
    setUnverifiedFactors([]);
  };

  const startEnroll = async () => {
    setError('');
    setMessage('');
    try {
      // Leftover unverified factors block re-enroll with the same friendly name
      if (unverifiedFactors.length > 0) {
        await clearIncompleteEnrollments();
      }

      const { data, error: e } = await supabase.auth.mfa.enroll({
        factorType: 'totp',
        friendlyName: MFA_FRIENDLY_NAME,
      });
      if (e) {
        // If name still conflicts, strip matching leftovers and retry once
        if (/friendly name/i.test(e.message || '')) {
          const listed = await supabase.auth.mfa.listFactors();
          const leftovers = (listed.data?.all || []).filter(
            (f) =>
              f.factor_type === 'totp' &&
              f.status === 'unverified' &&
              (f.friendly_name === MFA_FRIENDLY_NAME || !f.friendly_name)
          );
          for (const f of leftovers) {
            await removeFactor(f.id);
          }
          const retry = await supabase.auth.mfa.enroll({
            factorType: 'totp',
            friendlyName: MFA_FRIENDLY_NAME,
          });
          if (retry.error) throw retry.error;
          setEnroll(retry.data);
          return;
        }
        throw e;
      }
      setEnroll(data);
    } catch (err) {
      setError(err.message || 'Enrollment failed');
    }
  };

  const verifyEnroll = async (e) => {
    e.preventDefault();
    if (!enroll?.id) return;
    setError('');
    try {
      const challenge = await supabase.auth.mfa.challenge({ factorId: enroll.id });
      if (challenge.error) throw challenge.error;
      const verified = await supabase.auth.mfa.verify({
        factorId: enroll.id,
        challengeId: challenge.data.id,
        code: code.trim(),
      });
      if (verified.error) throw verified.error;
      setEnroll(null);
      setCode('');
      setMessage('Two-factor authentication is now enabled for your admin account.');
      await loadFactors();
      await refreshProfile();
      navigate('/admin', { replace: true });
    } catch (err) {
      setError(err.message || 'Invalid code');
    }
  };

  const unenroll = async (factorId) => {
    setError('');
    const verified = factors.filter((f) => f.status === 'verified');
    if (verified.length <= 1) {
      setError('At least one authenticator must remain enrolled for admin accounts.');
      return;
    }
    try {
      await removeFactor(factorId);
      setMessage('Authenticator removed.');
      await loadFactors();
    } catch (err) {
      setError(err.message || 'Could not remove factor');
    }
  };

  const discardIncomplete = async () => {
    setError('');
    try {
      await clearIncompleteEnrollments();
      setMessage('Incomplete authenticator setup was removed. You can set up MFA again.');
      await loadFactors();
    } catch (err) {
      setError(err.message || 'Could not clear incomplete setup');
    }
  };

  if (role !== 'Admin') {
    return (
      <Card>
        <p className="text-text-secondary">MFA setup is required for Administrator accounts.</p>
      </Card>
    );
  }

  return (
    <div className="space-y-6 max-w-xl">
      <div>
        <h1 className="text-2xl font-bold text-text-primary">Security — Two-factor auth</h1>
        <p className="mt-1 text-text-secondary">
          Admin accounts require an authenticator app (TOTP). Admin APIs reject sessions without MFA.
          Shared front-desk PCs also auto-logout after 15 minutes idle.
        </p>
      </div>

      <Card className="space-y-4">
        <div className="flex items-center gap-2 text-text-primary font-medium">
          <ShieldCheck className="h-5 w-5 text-primary" />
          Current status
        </div>
        {loading ? (
          <p className="text-sm text-text-muted">Loading…</p>
        ) : factors.length === 0 ? (
          <p className="text-sm text-amber-700">
            MFA is not enrolled yet. Enroll an authenticator to secure this admin account.
          </p>
        ) : (
          <ul className="space-y-2">
            {factors.map((f) => (
              <li key={f.id} className="flex items-center justify-between text-sm">
                <span>
                  {f.friendly_name || 'Authenticator'} ({f.status})
                </span>
                <Button type="button" variant="outline" onClick={() => unenroll(f.id)}>
                  Remove
                </Button>
              </li>
            ))}
          </ul>
        )}

        {unverifiedFactors.length > 0 && !enroll && (
          <div className="rounded-button border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
            <p>
              An incomplete authenticator setup already exists
              {unverifiedFactors[0]?.friendly_name
                ? ` (“${unverifiedFactors[0].friendly_name}”)`
                : ''}
              . Remove it, then set up MFA again.
            </p>
            <Button type="button" variant="outline" className="mt-2" onClick={discardIncomplete}>
              Clear incomplete setup
            </Button>
          </div>
        )}

        {!enroll && factors.length === 0 && (
          <Button type="button" variant="primary" onClick={startEnroll}>
            <QrCode className="h-4 w-4 mr-2" />
            Set up authenticator
          </Button>
        )}

        {enroll && (
          <form onSubmit={verifyEnroll} className="space-y-3 border-t border-border pt-4">
            <p className="text-sm text-text-secondary">
              Scan this QR code in Google Authenticator, Authy, or 1Password, then enter the 6-digit
              code.
            </p>
            {enroll.totp?.qr_code && (
              <img
                src={enroll.totp.qr_code}
                alt="MFA QR code"
                className="mx-auto h-48 w-48 rounded border border-border bg-white p-2"
              />
            )}
            {enroll.totp?.secret && (
              <p className="text-xs text-text-muted break-all">Secret: {enroll.totp.secret}</p>
            )}
            <Input
              label="Verification code"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              required
              autoComplete="one-time-code"
            />
            <div className="flex gap-2">
              <Button type="submit" variant="primary">
                Verify &amp; enable
              </Button>
              <Button type="button" variant="outline" onClick={() => setEnroll(null)}>
                Cancel
              </Button>
            </div>
          </form>
        )}

        {error && <p className="text-sm text-error">{error}</p>}
        {message && <p className="text-sm text-primary">{message}</p>}
      </Card>
    </div>
  );
}
