import React, { useState } from 'react';
import { LogIn, Lock, Mail, Eye, EyeOff } from 'lucide-react';
import { auth, signInWithEmailAndPassword } from '../lib/firebase';

interface LoginPageProps {
  onLoginSuccess: (userId: string, role: string, clinicId?: string) => void;
  onBack: () => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({ onLoginSuccess, onBack }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const normalizedEmail = email.trim().toLowerCase();
      const normalizedPassword = password.trim();

      if (!normalizedEmail || !normalizedPassword) {
        setError('Email and password are required.');
        setLoading(false);
        return;
      }

      if (normalizedEmail.length < 3) {
        setError('Enter your assigned email or administrator username.');
        setLoading(false);
        return;
      }

      const result = await signInWithEmailAndPassword(auth, normalizedEmail, normalizedPassword);
      const user = result.user;
      if (user) {
        onLoginSuccess(user.uid, user.role || 'CLINIC_ADMIN', user.clinicId);
      }
    } catch (err: any) {
      setError(err.message || 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-1 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-white items-start justify-center p-3 pt-4 pb-0">
      <div className="w-full max-w-md">
        <button
          onClick={onBack}
          className="mb-3 flex items-center gap-2 text-slate-400 hover:text-white transition"
        >
          ← Back
        </button>

        <div className="rounded-2xl border border-slate-800 bg-slate-900/75 p-5 shadow-2xl shadow-slate-950/40">
          <div className="text-center mb-5">
            <div className="mb-3 flex items-center justify-center">
              <img src="/nextq-logo.png" alt="NEXTQ" className="h-24 w-64 object-contain" />
            </div>
            <p className="text-slate-400">Smart Queue. Less Waiting.</p>
          </div>

          {error && (
            <div className="mb-4 rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-200">
              {error}
            </div>
          )}

          <form onSubmit={(e) => {
            e.preventDefault();
            void handleEmailLogin(e);
          }} className="space-y-3" noValidate>
            <div>
                <label className="block text-sm font-semibold mb-1.5">Email or username</label>
              <div className="relative">
                <Mail className="absolute left-3 top-3 w-5 h-5 text-slate-400" />
                <input
                  type="text"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg pl-10 pr-4 py-2 text-white placeholder-slate-500 focus:border-emerald-400 focus:outline-none"
                  placeholder="your@email.com or admin"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold mb-1.5">Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 w-5 h-5 text-slate-400" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg pl-10 pr-10 py-2 text-white placeholder-slate-500 focus:border-emerald-400 focus:outline-none"
                  placeholder="••••••••"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((value) => !value)}
                  className="absolute right-3 top-3 text-slate-400 hover:text-white"
                  aria-label="Toggle password visibility"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full px-6 py-3 rounded-xl border border-emerald-400/40 bg-emerald-500 text-slate-950 font-extrabold shadow-[0_10px_24px_rgba(16,185,129,0.22)] transition hover:bg-emerald-400 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <div className="w-5 h-5 border-2 border-slate-900/30 border-t-slate-900 rounded-full animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <LogIn className="w-5 h-5" />
                  Login
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
