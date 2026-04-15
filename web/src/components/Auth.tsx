import React, { useState } from 'react';
import { Bot, LogIn, Github, Mail, AlertCircle, Loader2 } from 'lucide-react';
import { signInWithPopup, GoogleAuthProvider } from 'firebase/auth';
import { auth } from '../firebase';

export default function Auth() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleGoogleLogin = async () => {
    setLoading(true);
    setError(null);
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
    } catch (err: any) {
      console.error("Login failed:", err);
      if (err.code === 'auth/popup-closed-by-user') {
        setError("Login was cancelled. Please try again.");
      } else if (err.code === 'auth/popup-blocked') {
        setError("The login popup was blocked by your browser. Please allow popups for this site.");
      } else {
        setError("An error occurred during login. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0A0A0B] flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-12">
          <div className="w-16 h-16 bg-emerald-500 rounded-2xl flex items-center justify-center shadow-2xl shadow-emerald-500/20 mx-auto mb-6">
            <Bot className="text-black" size={32} />
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-white mb-2">Welcome to OpenClaw</h1>
          <p className="text-zinc-500">Agentic stock & crypto paper-trading platform</p>
        </div>

        <div className="bg-[#0F0F11] border border-zinc-800/50 rounded-3xl p-8 shadow-2xl">
          {error && (
            <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-xl flex items-start gap-3 text-red-400 text-sm">
              <AlertCircle size={18} className="shrink-0 mt-0.5" />
              <p>{error}</p>
            </div>
          )}

          <div className="space-y-4">
            <button 
              onClick={handleGoogleLogin}
              disabled={loading}
              className="w-full flex items-center justify-center gap-3 bg-white text-black py-3.5 rounded-xl font-bold hover:bg-zinc-200 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <Loader2 size={20} className="animate-spin" />
              ) : (
                <Mail size={20} />
              )}
              {loading ? 'Connecting...' : 'Continue with Google'}
            </button>
            
            <button 
              disabled={loading}
              className="w-full flex items-center justify-center gap-3 bg-zinc-800 text-white py-3.5 rounded-xl font-bold hover:bg-zinc-700 transition-all border border-zinc-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Github size={20} />
              Continue with GitHub
            </button>
          </div>

          <div className="mt-8 pt-8 border-t border-zinc-800/50">
            <p className="text-[10px] text-center text-zinc-500 uppercase tracking-widest font-bold mb-4">Simulation Only</p>
            <p className="text-xs text-center text-zinc-600 leading-relaxed">
              By continuing, you acknowledge that OpenClaw is a paper trading simulator. No real money or actual brokerage accounts are involved.
            </p>
          </div>
        </div>

        <p className="mt-8 text-center text-xs text-zinc-500">
          Don't have an account? <span className="text-emerald-400 font-bold cursor-pointer hover:underline">Sign up for free</span>
        </p>
      </div>
    </div>
  );
}
