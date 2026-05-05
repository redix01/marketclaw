import React, { useState } from 'react';
import { AlertCircle, Bot, Eye, EyeOff, Loader2, LogIn, UserPlus } from 'lucide-react';
import { authService } from '../services/authService';
import { ApiError } from '../services/api';

interface AuthProps {
  onAuthenticated: (session: { user: { id: number; name: string; email: string; avatar_url?: string | null } }) => void;
}

export default function Auth({ onAuthenticated }: AuthProps) {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirmation, setPasswordConfirmation] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showPasswordConfirmation, setShowPasswordConfirmation] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const session = mode === 'login'
        ? await authService.login(email, password)
        : await authService.register(name, email, password, passwordConfirmation);

      onAuthenticated(session);
    } catch (err) {
      if (err instanceof ApiError && typeof err.payload === 'object' && err.payload && 'errors' in err.payload) {
        const firstError = Object.values((err.payload as any).errors)[0];
        setError(Array.isArray(firstError) ? firstError[0] : err.message);
      } else if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Authentication failed.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0A0A0B] flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-12">
          <div className="w-16 h-16 bg-yellow-500 rounded-2xl flex items-center justify-center shadow-2xl shadow-yellow-500/20 mx-auto mb-6">
            <Bot className="text-black" size={32} />
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-white mb-2">Welcome to MarketClaw</h1>
          <p className="text-zinc-500">Agentic stock & crypto paper-trading platform</p>
        </div>

        <div className="bg-[#0F0F11] border border-zinc-800/50 rounded-3xl p-8 shadow-2xl">
          <div className="flex p-1 bg-zinc-900 rounded-xl mb-6">
            <button
              type="button"
              onClick={() => setMode('login')}
              className={`flex-1 py-2.5 rounded-lg text-sm font-bold transition-all ${mode === 'login' ? 'bg-yellow-500 text-black' : 'text-zinc-500 hover:text-zinc-300'}`}
            >
              Login
            </button>
            <button
              type="button"
              onClick={() => setMode('register')}
              className={`flex-1 py-2.5 rounded-lg text-sm font-bold transition-all ${mode === 'register' ? 'bg-yellow-500 text-black' : 'text-zinc-500 hover:text-zinc-300'}`}
            >
              Register
            </button>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-xl flex items-start gap-3 text-red-400 text-sm">
              <AlertCircle size={18} className="shrink-0 mt-0.5" />
              <p>{error}</p>
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
                className="w-full bg-zinc-900/50 border border-zinc-800 rounded-xl py-3 px-4 text-sm text-white placeholder:text-zinc-500 focus:outline-none focus:border-yellow-500/50 transition-all"
              />
            </div>

            <div>
              <label className="text-[10px] uppercase tracking-wider text-zinc-500 font-bold mb-1.5 block">Password</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  required
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

            {mode === 'register' && (
              <div>
                <label className="text-[10px] uppercase tracking-wider text-zinc-500 font-bold mb-1.5 block">Confirm Password</label>
                <div className="relative">
                  <input
                    type={showPasswordConfirmation ? 'text' : 'password'}
                    value={passwordConfirmation}
                    onChange={(event) => setPasswordConfirmation(event.target.value)}
                    required
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
              {loading ? <Loader2 size={20} className="animate-spin" /> : mode === 'login' ? <LogIn size={18} /> : <UserPlus size={18} />}
              {loading ? 'Please wait...' : mode === 'login' ? 'Login to Dashboard' : 'Create Account'}
            </button>
          </form>

          <div className="mt-8 pt-8 border-t border-zinc-800/50">
            <p className="text-[10px] text-center text-zinc-500 uppercase tracking-widest font-bold mb-4">Simulation Only</p>
            <p className="text-xs text-center text-zinc-600 leading-relaxed">
              By continuing, you acknowledge that MarketClaw is a paper trading simulator. No real money or actual brokerage accounts are involved.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
