import React, { useState } from 'react';
import { LogIn, Lock, Mail, Eye, EyeOff, Heart, ChevronRight } from 'lucide-react';
import { auth, db } from '../lib/firebase';
import { signInWithEmailAndPassword, GoogleAuthProvider, signInWithPopup, createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';

interface LoginPageProps {
  onLoginSuccess: (userId: string, role: string, clinicId?: string) => void;
  onBack: () => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({ onLoginSuccess, onBack }) => {
  const [mode, setMode] = useState<'role-select' | 'login' | 'signup'>('role-select');
  const [selectedRole, setSelectedRole] = useState<'admin' | 'clinic-admin' | 'doctor' | 'staff' | ''>('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const roles = [
    {
      id: 'admin',
      name: 'Super Admin',
      desc: 'Manage all clinics and global access',
      icon: '👑',
      color: 'from-purple-600 to-pink-600'
    },
    {
      id: 'clinic-admin',
      name: 'Clinic Admin',
      desc: 'Manage your clinic and doctors',
      icon: '🏥',
      color: 'from-emerald-600 to-cyan-600'
    },
    {
      id: 'doctor',
      name: 'Doctor',
      desc: 'View patients and manage queue',
      icon: '👨‍⚕️',
      color: 'from-blue-600 to-indigo-600'
    },
    {
      id: 'staff',
      name: 'Staff',
      desc: 'Receptionist and support staff',
      icon: '👤',
      color: 'from-orange-600 to-yellow-600'
    }
  ];

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (!selectedRole) {
        setError('Please select a role');
        setLoading(false);
        return;
      }

      if (mode === 'signup') {
        if (password !== confirmPassword) {
          setError('Passwords do not match');
          setLoading(false);
          return;
        }
        await createUserWithEmailAndPassword(auth, email, password);
      } else {
        await signInWithEmailAndPassword(auth, email, password);
      }

      const user = auth.currentUser;
      if (user) {
        // Check if user profile exists
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        
        if (!userDoc.exists()) {
          // Create user profile
          await setDoc(doc(db, 'users', user.uid), {
            role: selectedRole,
            email: user.email,
            createdAt: new Date().toISOString(),
            status: 'active'
          });
        }

        onLoginSuccess(user.uid, selectedRole);
      }
    } catch (err: any) {
      setError(err.message || 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setError('');
    setLoading(true);

    try {
      if (!selectedRole) {
        setError('Please select a role');
        setLoading(false);
        return;
      }

      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      const user = result.user;

      if (user) {
        // Check if user profile exists
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        
        if (!userDoc.exists()) {
          // Create user profile
          await setDoc(doc(db, 'users', user.uid), {
            role: selectedRole,
            email: user.email,
            displayName: user.displayName,
            photoURL: user.photoURL,
            createdAt: new Date().toISOString(),
            status: 'active'
          });
        }

        onLoginSuccess(user.uid, selectedRole);
      }
    } catch (err: any) {
      setError(err.message || 'Google login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-white flex items-center justify-center p-4">
      {/* Back to home link at top */}
      <button
        onClick={onBack}
        className="absolute top-6 left-6 text-slate-400 hover:text-white transition flex items-center gap-2"
      >
        ← Back to Home
      </button>

      <div className="w-full max-w-md">
        {/* Back Button inside modal for other modes */}
        {(mode !== 'role-select') && (
          <button
            onClick={() => {
              if (mode === 'login' || mode === 'signup') {
                setMode('role-select');
                setEmail('');
                setPassword('');
                setConfirmPassword('');
                setError('');
              }
            }}
            className="mb-6 flex items-center gap-2 text-slate-400 hover:text-white transition"
          >
            ← Back
          </button>
        )}

        {mode === 'role-select' && (
          <div className="space-y-6">
            <div className="text-center mb-8">
              <div className="flex items-center justify-center gap-2 mb-4">
                <Heart className="w-10 h-10 text-emerald-400" />
                <h1 className="text-3xl font-bold">ClinicFlow Pro</h1>
              </div>
              <p className="text-slate-400">Select your role to continue</p>
            </div>

            <div className="space-y-4">
              {roles.map(role => (
                <button
                  key={role.id}
                  onClick={() => {
                    setSelectedRole(role.id as any);
                    setMode('login');
                  }}
                  className={`w-full p-6 rounded-xl border-2 transition text-left group ${
                    selectedRole === role.id
                      ? 'border-emerald-400 bg-emerald-400/10'
                      : 'border-slate-700 bg-slate-800/50 hover:border-slate-600'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-2xl mb-2">{role.icon}</p>
                      <h3 className="text-lg font-bold group-hover:text-emerald-400 transition">{role.name}</h3>
                      <p className="text-sm text-slate-400">{role.desc}</p>
                    </div>
                    <ChevronRight className="w-5 h-5 text-slate-400 group-hover:text-emerald-400 group-hover:translate-x-1 transition" />
                  </div>
                </button>
              ))}
            </div>

            <button
              onClick={onBack}
              className="w-full px-6 py-3 bg-slate-700 hover:bg-slate-600 rounded-lg font-semibold transition"
            >
              Back to Home
            </button>
          </div>
        )}

        {(mode === 'login' || mode === 'signup') && (
          <div className="space-y-6">
            <div className="text-center mb-8">
              <div className="text-4xl mb-3">
                {roles.find(r => r.id === selectedRole)?.icon}
              </div>
              <h2 className="text-2xl font-bold mb-2">
                {mode === 'login' ? 'Login' : 'Create Account'}
              </h2>
              <p className="text-slate-400">
                {roles.find(r => r.id === selectedRole)?.name}
              </p>
            </div>

            {error && (
              <div className="bg-red-500/20 border border-red-400 text-red-200 px-4 py-3 rounded-lg text-sm">
                {error}
              </div>
            )}

            <form onSubmit={handleEmailLogin} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold mb-2">Email</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 w-5 h-5 text-slate-400" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg pl-10 pr-4 py-2 text-white placeholder-slate-500 focus:border-emerald-400 focus:outline-none"
                    placeholder="your@email.com"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold mb-2">Password</label>
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
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-3 text-slate-400 hover:text-white"
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              {mode === 'signup' && (
                <div>
                  <label className="block text-sm font-semibold mb-2">Confirm Password</label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-3 w-5 h-5 text-slate-400" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="w-full bg-slate-800 border border-slate-700 rounded-lg pl-10 pr-10 py-2 text-white placeholder-slate-500 focus:border-emerald-400 focus:outline-none"
                      placeholder="••••••••"
                      required
                    />
                  </div>
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full px-6 py-3 bg-gradient-to-r from-emerald-500 to-cyan-500 rounded-lg font-bold hover:shadow-lg hover:shadow-emerald-500/50 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <LogIn className="w-5 h-5" />
                    {mode === 'login' ? 'Login' : 'Create Account'}
                  </>
                )}
              </button>
            </form>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-slate-700"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-slate-950 text-slate-400">or</span>
              </div>
            </div>

            <button
              onClick={handleGoogleLogin}
              disabled={loading}
              className="w-full px-6 py-3 bg-slate-800 border border-slate-700 hover:border-emerald-400/50 rounded-lg font-semibold transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              <span className="text-xl">🔐</span>
              Google Sign-in
            </button>

            <button
              type="button"
              onClick={() => {
                setMode(mode === 'login' ? 'signup' : 'login');
                setError('');
              }}
              className="w-full text-center text-slate-400 hover:text-white transition text-sm"
            >
              {mode === 'login' ? "Don't have an account? " : 'Already have an account? '}
              <span className="text-emerald-400 font-semibold">
                {mode === 'login' ? 'Sign up' : 'Login'}
              </span>
            </button>

            <button
              onClick={() => {
                setMode('role-select');
                setSelectedRole('');
                setEmail('');
                setPassword('');
                setConfirmPassword('');
                setError('');
              }}
              className="w-full px-6 py-2 text-slate-400 hover:text-white transition text-sm"
            >
              Change Role
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
