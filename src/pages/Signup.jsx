/**
 * Public signup – Patients ONLY. Creates auth user; trigger creates profile with role = Patient.
 * Collects phone + DOB for search and duplicate detection.
 * Requires explicit data-storage consent (compliance).
 */
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Mail, Lock, User, Building2, Phone, Calendar } from 'lucide-react';
import { supabase } from '../services/supabase';
import { Button, Input, Card } from '../components/common';

export default function Signup() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [dataConsent, setDataConsent] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!dataConsent) {
      setError('Please confirm consent to store your personal and health data.');
      return;
    }
    setLoading(true);
    try {
      const { data, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName || email,
            phone: phone || null,
            date_of_birth: dateOfBirth || null,
            role: 'Patient',
            data_consent: true,
            data_consent_method: 'self_signup',
          },
          emailRedirectTo: undefined,
        },
      });
      if (signUpError) {
        setError(signUpError.message);
        return;
      }
      setSuccess(true);
      if (data?.session) {
        navigate('/patient');
      }
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div
        className="min-h-screen flex items-center justify-center p-4"
        style={{
          background: `linear-gradient(to right, var(--color-bg-gradient-start), var(--color-bg-gradient-end))`,
        }}
      >
        <Card className="w-full max-w-md text-center">
          <div className="rounded-full bg-primary p-4 text-white mb-4 mx-auto w-fit">
            <Building2 className="h-10 w-10" />
          </div>
          <h1 className="text-xl font-bold text-text-primary">Account created</h1>
          <p className="text-sm text-text-secondary mt-2">
            You can now sign in. Check your email if confirmation is required.
          </p>
          <Button variant="primary" className="mt-6 w-full" onClick={() => navigate('/login')}>
            Sign in
          </Button>
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
          <h1 className="text-xl font-bold text-text-primary">
            Patient registration
          </h1>
          <p className="text-sm text-text-secondary mt-1">
            Create an account to access patient services
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Full name"
            placeholder="Your name"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            leftIcon={<User className="h-5 w-5 text-text-muted" />}
            autoComplete="name"
            required
          />
          <Input
            label="Email"
            type="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            leftIcon={<Mail className="h-5 w-5 text-text-muted" />}
            required
            autoComplete="email"
          />
          <Input
            label="Phone"
            type="tel"
            placeholder="03XX-XXXXXXX"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            leftIcon={<Phone className="h-5 w-5 text-text-muted" />}
            autoComplete="tel"
          />
          <Input
            label="Date of birth"
            type="date"
            value={dateOfBirth}
            onChange={(e) => setDateOfBirth(e.target.value)}
            leftIcon={<Calendar className="h-5 w-5 text-text-muted" />}
          />
          <Input
            label="Password"
            type="password"
            placeholder="Min 6 characters"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            leftIcon={<Lock className="h-5 w-5 text-text-muted" />}
            required
            minLength={6}
            autoComplete="new-password"
          />
          <label className="flex items-start gap-2 text-sm text-text-secondary cursor-pointer">
            <input
              type="checkbox"
              className="mt-1"
              checked={dataConsent}
              onChange={(e) => setDataConsent(e.target.checked)}
              required
            />
            <span>
              I consent to St. Dominic Care storing my personal and health-related
              information for care delivery, appointments, and hospital records, in line with
              applicable data-protection requirements.
            </span>
          </label>
          {error && <p className="text-sm text-error">{error}</p>}
          <Button type="submit" variant="primary" fullWidth disabled={loading || !dataConsent}>
            {loading ? 'Creating…' : 'Create account'}
          </Button>
        </form>

        <p className="mt-6 text-center text-sm text-text-muted">
          Already have an account?{' '}
          <Link to="/login" className="font-medium text-primary hover:underline">
            Sign in
          </Link>
        </p>
      </Card>
    </div>
  );
}
