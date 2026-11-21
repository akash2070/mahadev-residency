import { useState, useEffect } from 'react';
import { Lock, ArrowLeft, Eye, EyeOff, ShieldCheck, Mail } from 'lucide-react';

interface StaffLoginGateProps {
  onAuthenticated: (token: string) => void;
  onBackToSite: () => void;
}

type GateMode = 'login' | 'setup' | 'forgot-email' | 'forgot-verify';

export function StaffLoginGate({ onAuthenticated, onBackToSite }: StaffLoginGateProps) {
  const [loadingStatus, setLoadingStatus] = useState(true);
  const [mode, setMode] = useState<GateMode>('login');
  const [envConfigured, setEnvConfigured] = useState(false);
  const [hasRecoveryEmail, setHasRecoveryEmail] = useState(false);
  const [emailDeliveryMode, setEmailDeliveryMode] = useState<'email' | 'server-console'>(
    'server-console'
  );

  const [recoveryEmail, setRecoveryEmail] = useState('');
  const [passcode, setPasscode] = useState('');
  const [confirmPasscode, setConfirmPasscode] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [showPasscode, setShowPasscode] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [infoNotice, setInfoNotice] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/staff/status')
      .then((res) => res.json())
      .then((data) => {
        setEnvConfigured(Boolean(data.envConfigured));
        setHasRecoveryEmail(Boolean(data.hasRecoveryEmail));
        setEmailDeliveryMode(data.emailDeliveryMode === 'email' ? 'email' : 'server-console');
        if (data.requiresSetup) {
          setMode('setup');
        } else {
          setMode('login');
        }
      })
      .catch(() => {
        setError('Unable to reach server authentication status.');
      })
      .finally(() => setLoadingStatus(false));
  }, []);

  const handleSetup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!recoveryEmail.trim() || !recoveryEmail.includes('@')) {
      setError('Please enter a valid recovery email address.');
      return;
    }
    if (passcode.trim().length < 6) {
      setError('Please choose a staff passcode of at least 6 characters.');
      return;
    }
    if (passcode !== confirmPasscode) {
      setError('Passcodes do not match.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/staff/setup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ passcode, recoveryEmail }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Could not configure staff passcode.');
      } else if (data.token) {
        onAuthenticated(data.token);
      }
    } catch {
      setError('Network error while setting up staff passcode.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!passcode.trim()) {
      setError('Enter your staff passcode.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/staff/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ passcode }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Invalid staff passcode.');
      } else if (data.token) {
        onAuthenticated(data.token);
      }
    } catch {
      setError('Network error while signing in.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleRequestResetOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setInfoNotice(null);
    if (!recoveryEmail.trim() || !recoveryEmail.includes('@')) {
      setError('Enter your registered staff recovery email address.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/staff/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: recoveryEmail.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Could not initiate passcode reset.');
      } else {
        setInfoNotice(data.message);
        setOtpCode('');
        setPasscode('');
        setConfirmPasscode('');
        setMode('forgot-verify');
      }
    } catch {
      setError('Network error while requesting verification code.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleResetWithOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!/^\d{6}$/.test(otpCode.trim())) {
      setError('Enter the 6-digit verification code.');
      return;
    }
    if (passcode.trim().length < 6) {
      setError('New passcode must be at least 6 characters.');
      return;
    }
    if (passcode !== confirmPasscode) {
      setError('New passcodes do not match.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/staff/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: recoveryEmail.trim(),
          code: otpCode.trim(),
          newPasscode: passcode.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Could not reset passcode.');
      } else if (data.token) {
        onAuthenticated(data.token);
      }
    } catch {
      setError('Network error while resetting passcode.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col justify-center items-center p-4">
      <div className="w-full max-w-md bg-white border border-[#E2E8F0] rounded-xl overflow-hidden">
        <div className="px-6 py-5 border-b border-[#E2E8F0] bg-[#FAF9F6]">
          <div className="flex items-center gap-2 text-xs font-medium text-[#0F5257] mb-1">
            <Lock className="w-3.5 h-3.5" />
            <span>Protected Front Desk Access</span>
          </div>
          <h1 className="font-display text-2xl font-semibold text-[#0F172A]">
            {loadingStatus && 'Mahadev Residency Staff Portal'}
            {!loadingStatus && mode === 'setup' && 'Set Up Staff Passcode'}
            {!loadingStatus && mode === 'login' && 'Staff Portal Sign-In'}
            {!loadingStatus && mode === 'forgot-email' && 'Reset Passcode with Email'}
            {!loadingStatus && mode === 'forgot-verify' && 'Enter Email Verification Code'}
          </h1>
        </div>

        <div className="p-6">
          {loadingStatus ? (
            <p className="text-sm text-[#64748B] py-4">Checking staff portal security...</p>
          ) : mode === 'setup' ? (
            <form onSubmit={handleSetup} className="space-y-4">
              <div className="p-3.5 rounded-lg bg-[#F0FDF4] border border-[#BBF7D0] text-xs text-[#15803D] flex items-start gap-2.5">
                <ShieldCheck className="w-4 h-4 shrink-0 mt-0.5" />
                <span>
                  First-time setup: Register your recovery email and create a private staff
                  passcode so customers cannot access reservations or room logs.
                </span>
              </div>

              {error && (
                <div className="p-3 rounded-lg bg-[#FEF2F2] border border-[#FECACA] text-xs text-[#DC2626]">
                  {error}
                </div>
              )}

              <div>
                <label className="block text-xs font-medium text-[#475569] mb-1">
                  Recovery Email Address (for resetting forgotten passcodes)
                </label>
                <input
                  required
                  type="email"
                  value={recoveryEmail}
                  onChange={(e) => setRecoveryEmail(e.target.value)}
                  placeholder="manager@example.com"
                  className="w-full px-3 py-2.5 text-sm border border-[#E2E8F0] rounded-lg focus:outline-none focus:border-[#0F5257]"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-[#475569] mb-1">
                  Create Staff Passcode (min 6 characters)
                </label>
                <div className="relative">
                  <input
                    required
                    type={showPasscode ? 'text' : 'password'}
                    value={passcode}
                    onChange={(e) => setPasscode(e.target.value)}
                    placeholder="Enter new staff passcode"
                    className="w-full px-3 py-2.5 pr-10 text-sm border border-[#E2E8F0] rounded-lg focus:outline-none focus:border-[#0F5257]"
                  />
                  <button
                    type="button"
                    aria-label={showPasscode ? 'Hide passcode' : 'Show passcode'}
                    onClick={() => setShowPasscode((v) => !v)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#64748B] hover:text-[#0F172A] cursor-pointer"
                  >
                    {showPasscode ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-[#475569] mb-1">
                  Confirm Staff Passcode
                </label>
                <input
                  required
                  type={showPasscode ? 'text' : 'password'}
                  value={confirmPasscode}
                  onChange={(e) => setConfirmPasscode(e.target.value)}
                  placeholder="Re-enter passcode"
                  className="w-full px-3 py-2.5 text-sm border border-[#E2E8F0] rounded-lg focus:outline-none focus:border-[#0F5257]"
                />
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full py-2.5 text-sm font-semibold text-white bg-[#0F5257] hover:bg-[#0B3E42] rounded-lg transition-colors cursor-pointer disabled:opacity-60"
              >
                {submitting ? 'Saving Passcode...' : 'Activate Staff Portal'}
              </button>
            </form>
          ) : mode === 'login' ? (
            <form onSubmit={handleLogin} className="space-y-4">
              <p className="text-sm text-[#64748B]">
                Enter the hotel staff passcode to manage incoming reservations, the 49-room rack,
                and guest confirmation emails.
              </p>

              {error && (
                <div className="p-3 rounded-lg bg-[#FEF2F2] border border-[#FECACA] text-xs text-[#DC2626]">
                  {error}
                </div>
              )}

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-medium text-[#475569]">
                    Staff Passcode
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      setError(null);
                      setInfoNotice(null);
                      setMode('forgot-email');
                    }}
                    className="text-xs font-medium text-[#0F5257] hover:underline cursor-pointer"
                  >
                    Forgot passcode?
                  </button>
                </div>
                <div className="relative">
                  <input
                    required
                    type={showPasscode ? 'text' : 'password'}
                    value={passcode}
                    onChange={(e) => setPasscode(e.target.value)}
                    placeholder="Enter staff passcode"
                    className="w-full px-3 py-2.5 pr-10 text-sm border border-[#E2E8F0] rounded-lg focus:outline-none focus:border-[#0F5257]"
                  />
                  <button
                    type="button"
                    aria-label={showPasscode ? 'Hide passcode' : 'Show passcode'}
                    onClick={() => setShowPasscode((v) => !v)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#64748B] hover:text-[#0F172A] cursor-pointer"
                  >
                    {showPasscode ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {envConfigured && (
                <p className="text-xs text-[#64748B]">
                  Passcode is managed via server secret <span className="font-mono">STAFF_PASSCODE</span>.
                </p>
              )}

              <button
                type="submit"
                disabled={submitting}
                className="w-full py-2.5 text-sm font-semibold text-white bg-[#0F5257] hover:bg-[#0B3E42] rounded-lg transition-colors cursor-pointer disabled:opacity-60"
              >
                {submitting ? 'Verifying...' : 'Sign In to Staff Portal'}
              </button>
            </form>
          ) : mode === 'forgot-email' ? (
            envConfigured ? (
              <div className="space-y-4">
                <div className="p-4 rounded-lg bg-[#FAF9F6] border border-[#E2E8F0] text-sm text-[#475569] space-y-2">
                  <p className="font-semibold text-[#0F172A]">
                    Managed by Server Secret (STAFF_PASSCODE)
                  </p>
                  <p className="text-xs leading-relaxed">
                    A server-side <span className="font-mono">STAFF_PASSCODE</span> is currently
                    active in <strong>Settings → Secrets</strong>, which overrides email-based
                    passcode resets.
                  </p>
                  <p className="text-xs leading-relaxed">
                    To change your passcode immediately, update{' '}
                    <span className="font-mono">STAFF_PASSCODE</span> in{' '}
                    <strong>Settings → Secrets</strong>. To use email-based passcode recovery
                    instead, remove or clear <span className="font-mono">STAFF_PASSCODE</span> in
                    Secrets.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setError(null);
                    setMode('login');
                  }}
                  className="w-full py-2.5 text-sm font-semibold text-white bg-[#0F5257] hover:bg-[#0B3E42] rounded-lg cursor-pointer"
                >
                  Back to Sign In
                </button>
              </div>
            ) : (
            <form onSubmit={handleRequestResetOtp} className="space-y-4">
              <div className="p-3.5 rounded-lg bg-[#FAF9F6] border border-[#E2E8F0] text-xs text-[#475569] flex items-start gap-2.5">
                <Mail className="w-4 h-4 text-[#0F5257] shrink-0 mt-0.5" />
                <span>
                  {hasRecoveryEmail
                    ? emailDeliveryMode === 'email'
                      ? 'Enter your registered recovery email to receive a 6-digit verification code via email.'
                      : 'Enter your registered recovery email to generate a 6-digit reset code (logged securely in your server console until RESEND_API_KEY is configured in Secrets).'
                    : 'No recovery email was registered during initial setup. Set STAFF_RECOVERY_EMAIL in Settings → Secrets or sign in to add one.'}
                </span>
              </div>

              {error && (
                <div className="p-3 rounded-lg bg-[#FEF2F2] border border-[#FECACA] text-xs text-[#DC2626]">
                  {error}
                </div>
              )}

              <div>
                <label className="block text-xs font-medium text-[#475569] mb-1">
                  Registered Recovery Email
                </label>
                <input
                  required
                  type="email"
                  value={recoveryEmail}
                  onChange={(e) => setRecoveryEmail(e.target.value)}
                  placeholder="Enter your recovery email"
                  className="w-full px-3 py-2.5 text-sm border border-[#E2E8F0] rounded-lg focus:outline-none focus:border-[#0F5257]"
                />
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full py-2.5 text-sm font-semibold text-white bg-[#0F5257] hover:bg-[#0B3E42] rounded-lg transition-colors cursor-pointer disabled:opacity-60"
              >
                {submitting ? 'Sending Code...' : 'Send 6-Digit Reset Code'}
              </button>

              <button
                type="button"
                onClick={() => {
                  setError(null);
                  setMode('login');
                }}
                className="w-full py-1.5 text-xs font-medium text-[#475569] hover:text-[#0F172A] cursor-pointer"
              >
                Back to Sign In
              </button>
            </form>
            )
          ) : (
            <form onSubmit={handleResetWithOtp} className="space-y-4">
              {infoNotice && (
                <div className="p-3 rounded-lg bg-[#F0FDF4] border border-[#BBF7D0] text-xs text-[#15803D]">
                  {infoNotice}
                </div>
              )}

              {error && (
                <div className="p-3 rounded-lg bg-[#FEF2F2] border border-[#FECACA] text-xs text-[#DC2626]">
                  {error}
                </div>
              )}

              <div>
                <label className="block text-xs font-medium text-[#475569] mb-1">
                  6-Digit Verification Code
                </label>
                <input
                  required
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  value={otpCode}
                  onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  placeholder="123456"
                  className="w-full px-3 py-2.5 text-sm font-mono tracking-widest border border-[#E2E8F0] rounded-lg focus:outline-none focus:border-[#0F5257]"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-[#475569] mb-1">
                  New Staff Passcode (min 6 characters)
                </label>
                <input
                  required
                  type={showPasscode ? 'text' : 'password'}
                  value={passcode}
                  onChange={(e) => setPasscode(e.target.value)}
                  placeholder="Enter new passcode"
                  className="w-full px-3 py-2.5 text-sm border border-[#E2E8F0] rounded-lg focus:outline-none focus:border-[#0F5257]"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-[#475569] mb-1">
                  Confirm New Passcode
                </label>
                <input
                  required
                  type={showPasscode ? 'text' : 'password'}
                  value={confirmPasscode}
                  onChange={(e) => setConfirmPasscode(e.target.value)}
                  placeholder="Re-enter new passcode"
                  className="w-full px-3 py-2.5 text-sm border border-[#E2E8F0] rounded-lg focus:outline-none focus:border-[#0F5257]"
                />
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full py-2.5 text-sm font-semibold text-white bg-[#0F5257] hover:bg-[#0B3E42] rounded-lg transition-colors cursor-pointer disabled:opacity-60"
              >
                {submitting ? 'Updating Passcode...' : 'Reset Passcode & Sign In'}
              </button>

              <button
                type="button"
                onClick={() => {
                  setError(null);
                  setMode('forgot-email');
                }}
                className="w-full py-1.5 text-xs font-medium text-[#475569] hover:text-[#0F172A] cursor-pointer"
              >
                Request Another Code
              </button>
            </form>
          )}

          <div className="mt-5 pt-4 border-t border-[#E2E8F0]">
            <button
              type="button"
              onClick={onBackToSite}
              className="w-full py-2 text-xs font-medium text-[#475569] hover:text-[#0F172A] inline-flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Return to Guest Website</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
