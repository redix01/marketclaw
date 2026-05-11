import React, { useState } from 'react';
import { AlertCircle, Eye, EyeOff, Loader2, Shield } from 'lucide-react';
import { authService } from '../services/authService';
import { ApiError } from '../services/api';

interface AdminAuthProps {
  onAuthenticated: (session: { user: { id: number; name: string; email: string; avatar_url?: string | null; is_admin?: boolean } }) => void;
}

export default function AdminAuth({ onAuthenticated }: AdminAuthProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const session = await authService.loginAdmin(email, password);
      onAuthenticated(session);
    } catch (err) {
      if (err instanceof ApiError && typeof err.payload === 'object' && err.payload && 'errors' in err.payload) {
        const firstError = Object.values((err.payload as any).errors)[0];
        setError(Array.isArray(firstError) ? firstError[0] : err.message);
      } else if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Admin authentication failed.');
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
            <Shield className="text-black" size={32} />
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-white mb-2">MarketClaw Admin</h1>
          <p className="text-zinc-500">Secure admin console for platform operations</p>
        </div>

        <div className="bg-[#0F0F11] border border-zinc-800/50 rounded-3xl p-8 shadow-2xl">
          {error && (
            <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-xl flex items-start gap-3 text-red-400 text-sm">
              <AlertCircle size={18} className="shrink-0 mt-0.5" />
              <p>{error}</p>
            </div>
          )}

          <form className="space-y-4" onSubmit={submit}>
            <div>
              <label className="text-[10px] uppercase tracking-wider text-zinc-500 font-bold mb-1.5 block">Admin Email</label>
              <input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
                className="w-full bg-zinc-900/50 border border-zinc-800 rounded-xl py-3 px-4 text-sm text-white focus:outline-none focus:border-yellow-500/50 transition-all"
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
                  className="w-full bg-zinc-900/50 border border-zinc-800 rounded-xl py-3 pl-4 pr-12 text-sm text-white focus:outline-none focus:border-yellow-500/50 transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((value) => !value)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300 transition-colors"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-3 bg-yellow-500 text-black py-3.5 rounded-xl font-bold hover:bg-yellow-400 transition-all disabled:opacity-50"
            >
              {loading ? <Loader2 size={20} className="animate-spin" /> : <Shield size={18} />}
              {loading ? 'Please wait...' : 'Login to Admin'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
