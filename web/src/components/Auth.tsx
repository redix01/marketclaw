import React, { useEffect, useState } from 'react';
import { AlertCircle, Bot, CheckCircle2, Eye, EyeOff, KeyRound, Loader2, LogIn, Mail, UserPlus } from 'lucide-react';
import { authService } from '../services/authService';
import { ApiError } from '../services/api';

type AuthMode = 'login' | 'register' | 'forgot' | 'reset';

interface AuthProps {
  onAuthenticated: (session: { user: { id: number; name: string; email: string; avatar_url?: string | null; status?: string; is_admin?: boolean } }) => void;
}

export default function Auth({ onAuthenticated }: AuthProps) {
  const [mode, setMode] = useState<AuthMode>('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirmation, setPasswordConfirmation] = useState('');
  const [resetToken, setResetToken] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showPasswordConfirmation, setShowPasswordConfirmation] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  // If the user lands here via a password-reset email link
  // (/auth?mode=reset&token=...&email=...), pre-fill the reset form.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const urlMode = params.get('mode');
    const token = params.get('token');
    const emailParam = params.get('email');
    if (urlMode === 'reset' && token) {
      setMode('reset');
      setResetToken(token);
      if (emailParam) setEmail(emailParam);
    }
  }, []);

  const switchMode = (next: AuthMode) => {
    setMode(next);
    setError(null);
    setInfo(null);
    setPassword('');
    setPasswordConfirmation('');
  };

  const reportError = (err: unknown, fallback: string) => {
    if (err instanceof ApiError && typeof err.payload === 'object' && err.payload && 'errors' in err.payload) {
      const firstError = Object.values((err.payload as any).errors)[0];
      setError(Array.isArray(firstError) ? firstError[0] : err.message);
    } else if (err instanceof Error) {
      setError(err.message);
    } else {
      setError(fallback);
    }
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setError(null);
    setInfo(null);

    try {
      if (mode === 'login') {
        const session = await authService.login(email, password);
        onAuthenticated(session);
      } else if (mode === 'register') {
        const session = await authService.register(name, email, password, passwordConfirmation);
        onAuthenticated(session);
      } else if (mode === 'forgot') {
        const response = await authService.forgotPassword(email);
        setInfo(response.message || 'If an account exists for that email, a password reset link has been sent.');
      } else if (mode === 'reset') {
        const response = await authService.resetPassword({
          token: resetToken,
          email,
          password,
          password_confirmation: passwordConfirmation,
        });
        setInfo(response.message || 'Your password has been reset. You can now log in.');
        setMode('login');
        setPassword('');
        setPasswordConfirmation('');
      }
    } catch (err) {
      reportError(err, 'Authentication failed.');
    } finally {
      setLoading(false);
    }
  };

  const showForgotLink = mode === 'login';
  const showTabs = mode === 'login' || mode === 'register';
  const heading = mode === 'forgot' ? 'Reset your password'
    : mode === 'reset' ? 'Choose a new password'
    : 'Welcome to MarketClaw';
  const subheading = mode === 'forgot' ? "Enter your email and we'll send you a reset link."
    : mode === 'reset' ? 'Set a new password to regain access to your account.'
    : 'Agentic stock & crypto trading platform';
  const submitLabel = loading ? 'Please wait...'
    : mode === 'login' ? 'Login to Dashboard'
    : mode === 'register' ? 'Create Account'
    : mode === 'forgot' ? 'Send reset link'
    : 'Reset password';
  const SubmitIcon = mode === 'login' ? LogIn
    : mode === 'register' ? UserPlus
    : mode === 'forgot' ? Mail
    : KeyRound;

  return (
    <div className="min-h-screen bg-[#0A0A0B] flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-12">
          <div className="w-16 h-16 bg-yellow-500 rounded-2xl flex items-center justify-center shadow-2xl shadow-yellow-500/20 mx-auto mb-6">
            <Bot className="text-black" size={32} />
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-white mb-2">{heading}</h1>
          <p className="text-zinc-500">{subheading}</p>
        </div>

        <div className="bg-[#0F0F11] border border-zinc-800/50 rounded-3xl p-8 shadow-2xl">
          {showTabs && (
            <div className="flex p-1 bg-zinc-900 rounded-xl mb-6">
              <button
                type="button"
                onClick={() => switchMode('login')}
                className={`flex-1 py-2.5 rounded-lg text-sm font-bold transition-all ${mode === 'login' ? 'bg-yellow-500 text-black' : 'text-zinc-500 hover:text-zinc-300'}`}
              >
                Login
              </button>
              <button
                type="button"
                onClick={() => switchMode('register')}
                className={`flex-1 py-2.5 rounded-lg text-sm font-bold transition-all ${mode === 'register' ? 'bg-yellow-500 text-black' : 'text-zinc-500 hover:text-zinc-300'}`}
              >
                Register
              </button>
            </div>
          )}

          {error && (
            <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-xl flex items-start gap-3 text-red-400 text-sm">
              <AlertCircle size={18} className="shrink-0 mt-0.5" />
              <p>{error}</p>
            </div>
          )}

          {info && (
            <div className="mb-6 p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-xl flex items-start gap-3 text-yellow-300 text-sm">
              <CheckCircle2 size={18} className="shrink-0 mt-0.5" />
              <p>{info}</p>
            </div>
          )}

          <form className="space-y-4" onSubmit={submit}>
            {mode === 'register' && (
              <div>
                <label className="text-[10px] uppercase tracking-wider text-zinc-500 font-bold mb-1.5 block">Full Name</label>
                <input
                  type="text"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  required
                  className="w-full bg-zinc-900/50 border border-zinc-800 rounded-xl py-3 px-4 text-sm text-white placeholder:text-zinc-500 focus:outline-none focus:border-yellow-500/50 transition-all"
                />
              </div>
            )}

            <div>
              <label className="text-[10px] uppercase tracking-wider text-zinc-500 font-bold mb-1.5 block">Email Address</label>
              <input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
                readOnly={mode === 'reset'}
                className="w-full bg-zinc-900/50 border border-zinc-800 rounded-xl py-3 px-4 text-sm text-white placeholder:text-zinc-500 focus:outline-none focus:border-yellow-500/50 transition-all disabled:opacity-60 read-only:opacity-70"
              />
            </div>

            {(mode === 'login' || mode === 'register' || mode === 'reset') && (
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-[10px] uppercase tracking-wider text-zinc-500 font-bold block">
                    {mode === 'reset' ? 'New Password' : 'Password'}
                  </label>
                  {showForgotLink && (
                    <button
                      type="button"
                      onClick={() => switchMode('forgot')}
                      className="text-[10px] uppercase tracking-wider text-yellow-400 hover:text-yellow-300 font-bold transition-colors"
                    >
                      Forgot password?
                    </button>
                  )}
                </div>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    required
                    minLength={mode === 'reset' || mode === 'register' ? 8 : undefined}
                    className="w-full bg-zinc-900/50 border border-zinc-800 rounded-xl py-3 pl-4 pr-12 text-sm text-white placeholder:text-zinc-500 focus:outline-none focus:border-yellow-500/50 transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((value) => !value)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300 transition-colors"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>
            )}

            {(mode === 'register' || mode === 'reset') && (
              <div>
                <label className="text-[10px] uppercase tracking-wider text-zinc-500 font-bold mb-1.5 block">Confirm Password</label>
                <div className="relative">
                  <input
                    type={showPasswordConfirmation ? 'text' : 'password'}
                    value={passwordConfirmation}
                    onChange={(event) => setPasswordConfirmation(event.target.value)}
                    required
                    minLength={8}
                    className="w-full bg-zinc-900/50 border border-zinc-800 rounded-xl py-3 pl-4 pr-12 text-sm text-white placeholder:text-zinc-500 focus:outline-none focus:border-yellow-500/50 transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPasswordConfirmation((value) => !value)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300 transition-colors"
                    aria-label={showPasswordConfirmation ? 'Hide password confirmation' : 'Show password confirmation'}
                  >
                    {showPasswordConfirmation ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-3 bg-white text-black py-3.5 rounded-xl font-bold hover:bg-zinc-200 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? <Loader2 size={20} className="animate-spin" /> : <SubmitIcon size={18} />}
              {submitLabel}
            </button>

            {(mode === 'forgot' || mode === 'reset') && (
              <button
                type="button"
                onClick={() => switchMode('login')}
                className="w-full text-xs text-zinc-500 hover:text-zinc-300 uppercase tracking-wider font-bold transition-colors"
              >
                ← Back to login
              </button>
            )}
          </form>


        </div>
      </div>
    </div>
  );
}
