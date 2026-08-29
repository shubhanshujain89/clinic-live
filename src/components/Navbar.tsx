import React from 'react';
import { 
  Stethoscope, 
  Users, 
  Smartphone, 
  Tv, 
  CalendarPlus, 
  MessageSquare, 
  RotateCcw,
  Sparkles,
  LogOut,
  User as UserIcon,
  ShieldCheck,
  Building2
} from 'lucide-react';
import { UserRole, Clinic, DoctorStatus } from '../types/queue';
import { User, auth, signOut } from '../lib/firebase';
import { LiveClock } from './LiveClock';

interface NavbarProps {
  currentRole: UserRole;
  onSelectRole: (role: UserRole) => void;
  clinic: Clinic | null;
  currentUser: User | null;
  onGoogleSignIn: () => void;
  onSeedData: () => void;
  onToggleWhatsAppLogs: () => void;
  isSeeding?: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentRole,
  onSelectRole,
  clinic,
  currentUser,
  onGoogleSignIn,
  onSeedData,
  onToggleWhatsAppLogs,
  isSeeding = false,
}) => {
  const isDoctorIn = clinic?.doctorStatus === 'IN';

  return (
    <header className="sticky top-0 z-40 border-b border-slate-800/80 bg-slate-950/75 text-white shadow-[0_12px_40px_rgba(15,23,42,0.35)] backdrop-blur-xl">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
        <div className="flex flex-wrap items-center justify-between gap-3 py-2 sm:py-0 sm:h-18">
          
          {/* Brand Logo & Clinic Info */}
          <div className="flex min-w-0 items-center space-x-3">
            <div className="logo-glow flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-teal-400 via-cyan-400 to-emerald-300 text-slate-950 shadow-[0_14px_30px_rgba(45,212,191,0.35)]">
              <Stethoscope className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center space-x-2">
                <span className="truncate text-base font-black tracking-[-0.04em] text-white sm:text-lg">
                  {clinic?.name || 'Live Clinic Queue'}
                </span>
                <span className="hidden md:inline-flex items-center rounded-full border border-teal-500/30 bg-teal-500/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.18em] text-teal-300">
                  Live sync
                </span>
              </div>
              <p className="hidden items-center gap-1.5 text-[11px] text-slate-400 sm:flex">
                <span>{clinic?.doctorName || 'Dr. Aryan Sharma'}</span>
                <span>•</span>
                <span className="text-slate-300">{clinic?.cabinNumber || 'Cabin 1'}</span>
              </p>
            </div>
          </div>

          {/* Live Date & Time with Day - Top Center Pill */}
          <div className="hidden xl:flex items-center">
            <LiveClock variant="pill" showSeconds={true} />
          </div>

          {/* Center Navigation Tabs (Role Switcher) */}
          <nav className="hidden items-center rounded-2xl border border-slate-700/80 bg-slate-900/70 p-1 shadow-[inset_0_1px_0_rgba(148,163,184,0.08)] lg:flex">
            <button
              onClick={() => onSelectRole('DOCTOR')}
              className={`flex items-center space-x-2 rounded-xl px-3.5 py-1.5 text-xs font-semibold transition-all ${
                currentRole === 'DOCTOR'
                  ? 'bg-gradient-to-r from-teal-400 to-emerald-300 text-slate-950 shadow-lg shadow-teal-500/20 font-bold'
                  : 'text-slate-300 hover:text-white hover:bg-slate-700/50'
              }`}
            >
              <Stethoscope className="w-3.5 h-3.5" />
              <span>Doctor Console</span>
            </button>

            <button
              onClick={() => onSelectRole('RECEPTIONIST')}
              className={`flex items-center space-x-2 rounded-xl px-3.5 py-1.5 text-xs font-semibold transition-all ${
                currentRole === 'RECEPTIONIST'
                  ? 'bg-gradient-to-r from-teal-400 to-emerald-300 text-slate-950 shadow-lg shadow-teal-500/20 font-bold'
                  : 'text-slate-300 hover:text-white hover:bg-slate-700/50'
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              <span>Reception Desk</span>
            </button>

            <button
              onClick={() => onSelectRole('PATIENT')}
              className={`flex items-center space-x-2 rounded-xl px-3.5 py-1.5 text-xs font-semibold transition-all ${
                currentRole === 'PATIENT'
                  ? 'bg-gradient-to-r from-teal-400 to-emerald-300 text-slate-950 shadow-lg shadow-teal-500/20 font-bold'
                  : 'text-slate-300 hover:text-white hover:bg-slate-700/50'
              }`}
            >
              <Smartphone className="w-3.5 h-3.5" />
              <span>Patient Tracker</span>
            </button>

            <button
              onClick={() => onSelectRole('TV_DISPLAY')}
              className={`flex items-center space-x-2 rounded-xl px-3.5 py-1.5 text-xs font-semibold transition-all ${
                currentRole === 'TV_DISPLAY'
                  ? 'bg-gradient-to-r from-amber-300 to-orange-300 text-slate-950 shadow-lg shadow-amber-500/20 font-bold'
                  : 'text-slate-300 hover:text-white hover:bg-slate-700/50'
              }`}
            >
              <Tv className="w-3.5 h-3.5" />
              <span>TV Signage</span>
            </button>
          </nav>

          {/* Right Action Items */}
          <div className="flex max-w-full items-center justify-end gap-2 sm:gap-3">
            
            {/* Live Doctor Status Indicator */}
            <div className="flex items-center space-x-1.5 px-2.5 py-1 rounded-full bg-slate-800 border border-slate-700 text-xs">
              <span className={`w-2.5 h-2.5 rounded-full ${isDoctorIn ? 'bg-emerald-400 animate-pulse' : 'bg-rose-500'}`} />
              <span className="font-medium text-slate-200 hidden sm:inline">
                {isDoctorIn ? 'Doctor IN' : 'Doctor OUT'}
              </span>
            </div>

            {/* WhatsApp logs preview trigger */}
            <button
              onClick={onToggleWhatsAppLogs}
              title="Meta WhatsApp Cloud API Logs"
              className="relative p-2 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-emerald-400 transition-colors"
            >
              <MessageSquare className="w-4 h-4" />
              <span className="absolute -top-1 -right-1 w-2 h-2 bg-emerald-400 rounded-full" />
            </button>

            {/* Seed / Reset Demo Data */}
            <button
              onClick={onSeedData}
              disabled={isSeeding}
              title="Reset with realistic demo patient queue"
              className="flex items-center space-x-1 px-2.5 py-1.5 rounded-lg bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-300 border border-indigo-500/30 text-xs font-medium transition-all"
            >
              <RotateCcw className={`w-3.5 h-3.5 ${isSeeding ? 'animate-spin' : ''}`} />
              <span className="hidden md:inline">Seed Demo</span>
            </button>

            {/* Auth / User Pill */}
            {currentUser ? (
              <div className="flex items-center space-x-2 pl-2 border-l border-slate-700">
                <div className="w-7 h-7 rounded-full bg-teal-500/20 border border-teal-500/30 flex items-center justify-center text-teal-300 text-xs font-bold overflow-hidden">
                  {currentUser.photoURL ? (
                    <img src={currentUser.photoURL} alt="Avatar" className="w-full h-full object-cover" />
                  ) : (
                    <span>{currentUser.displayName ? currentUser.displayName[0] : 'U'}</span>
                  )}
                </div>
                <button
                  onClick={() => signOut(auth)}
                  title="Sign Out"
                  className="text-slate-400 hover:text-rose-400 text-xs p-1"
                >
                  <LogOut className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <button
                onClick={onGoogleSignIn}
                className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-teal-600 hover:bg-teal-500 text-slate-950 font-semibold text-xs transition-all shadow"
              >
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>Google Sign-In</span>
              </button>
            )}
          </div>
        </div>

        {/* Mobile View Navigation Bar */}
        <div className="lg:hidden flex items-center justify-between py-2 border-t border-slate-800/80 overflow-x-auto gap-2">
          <button
            onClick={() => onSelectRole('DOCTOR')}
            className={`flex items-center space-x-1.5 px-3 py-1 rounded-lg text-xs font-medium whitespace-nowrap ${
              currentRole === 'DOCTOR'
                ? 'bg-teal-500 text-slate-950 font-bold'
                : 'text-slate-300 bg-slate-800'
            }`}
          >
            <Stethoscope className="w-3.5 h-3.5" />
            <span>Doctor View</span>
          </button>

          <button
            onClick={() => onSelectRole('RECEPTIONIST')}
            className={`flex items-center space-x-1.5 px-3 py-1 rounded-lg text-xs font-medium whitespace-nowrap ${
              currentRole === 'RECEPTIONIST'
                ? 'bg-teal-500 text-slate-950 font-bold'
                : 'text-slate-300 bg-slate-800'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>Reception Desk</span>
          </button>

          <button
            onClick={() => onSelectRole('PATIENT')}
            className={`flex items-center space-x-1.5 px-3 py-1 rounded-lg text-xs font-medium whitespace-nowrap ${
              currentRole === 'PATIENT'
                ? 'bg-teal-500 text-slate-950 font-bold'
                : 'text-slate-300 bg-slate-800'
            }`}
          >
            <Smartphone className="w-3.5 h-3.5" />
            <span>Patient Tracker</span>
          </button>

          <button
            onClick={() => onSelectRole('TV_DISPLAY')}
            className={`flex items-center space-x-1.5 px-3 py-1 rounded-lg text-xs font-medium whitespace-nowrap ${
              currentRole === 'TV_DISPLAY'
                ? 'bg-amber-400 text-slate-950 font-bold'
                : 'text-slate-300 bg-slate-800'
            }`}
          >
            <Tv className="w-3.5 h-3.5" />
            <span>TV Display</span>
          </button>
        </div>

        {/* Live Date & Time ticker on smaller screens */}
        <div className="xl:hidden py-1.5 border-t border-slate-800/60 flex items-center justify-between text-xs">
          <LiveClock variant="compact" showSeconds={true} />
        </div>
      </div>
    </header>
  );
};
