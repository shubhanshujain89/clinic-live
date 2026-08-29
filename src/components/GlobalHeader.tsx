import React from 'react';
import { Heart, LogIn, Calendar, LogOut } from 'lucide-react';

interface GlobalHeaderProps {
  currentPage: string;
  onNavigate: (page: string) => void;
  onLogout?: () => void;
  isLoggedIn?: boolean;
  userName?: string;
}

export const GlobalHeader: React.FC<GlobalHeaderProps> = ({
  currentPage,
  onNavigate,
  onLogout,
  isLoggedIn,
  userName
}) => {
  const navTabs = [
    { key: 'landing', label: 'Home' },
    { key: 'what-we-provide', label: 'What We Provide' },
    { key: 'why-choose-us', label: 'Why Choose Us' },
    { key: 'benefits', label: 'Benefits' },
    { key: 'contact', label: 'Contact Us' },
  ];

  return (
    <nav className="sticky top-0 z-50 border-b border-slate-700/60 bg-slate-950/85 backdrop-blur-xl shadow-[0_10px_30px_rgba(15,23,42,0.45)]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5">
        <div className="flex items-center justify-between gap-4">
          <button
            onClick={() => onNavigate('landing')}
            className="flex items-center gap-3 group shrink-0"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/10 ring-1 ring-emerald-400/40">
              <Heart className="w-5 h-5 text-emerald-400 group-hover:scale-110 transition-transform" />
            </div>
            <div className="text-left">
              <h1 className="text-lg font-bold text-white group-hover:text-emerald-400 transition-colors">
                ClinicFlow Pro
              </h1>
              <p className="text-[10px] uppercase tracking-[0.18em] text-slate-400">Enterprise Healthcare</p>
            </div>
          </button>

          <div className="hidden xl:flex items-center justify-center flex-1 gap-2">
            {navTabs.map((tab) => (
              <button
                key={tab.key}
                onClick={() => onNavigate(tab.key)}
                className={`relative px-4 py-2 rounded-xl text-sm font-semibold transition-all duration-200 ${
                  currentPage === tab.key
                    ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-400/40 shadow-[0_0_0_1px_rgba(52,211,153,0.12)]'
                    : 'text-slate-300 hover:text-white hover:bg-slate-800/80'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="hidden md:flex items-center gap-2.5 shrink-0">
            <button
              onClick={() => onNavigate('booking')}
              className={`px-4 py-2 rounded-xl font-semibold transition-all duration-200 flex items-center gap-2 ${
                currentPage === 'patient-booking'
                  ? 'bg-cyan-500/15 text-cyan-300 border border-cyan-400/40'
                  : 'text-slate-200 hover:text-white hover:bg-slate-800/80'
              }`}
            >
              <Calendar className="w-4 h-4" />
              Book Appointment
            </button>

            {!isLoggedIn && (
              <button
                onClick={() => onNavigate('login')}
                className={`px-4 py-2 rounded-xl font-semibold transition-all duration-200 flex items-center gap-2 ${
                  currentPage === 'login'
                    ? 'bg-purple-500/15 text-purple-300 border border-purple-400/40'
                    : 'text-slate-200 hover:text-white hover:bg-slate-800/80'
                }`}
              >
                <LogIn className="w-4 h-4" />
                Login
              </button>
            )}

            {isLoggedIn && (
              <>
                <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-slate-800/80 ring-1 ring-slate-700 text-slate-200">
                  <Heart className="w-4 h-4 text-emerald-400" />
                  <span className="text-sm font-semibold">{userName}</span>
                </div>
                <button
                  onClick={onLogout}
                  className="px-4 py-2 rounded-xl font-semibold text-slate-200 hover:text-white hover:bg-red-500/10 hover:border hover:border-red-400/40 transition-all duration-200 flex items-center gap-2"
                >
                  <LogOut className="w-4 h-4" />
                  Logout
                </button>
              </>
            )}
          </div>

          <div className="md:hidden flex items-center gap-2 shrink-0">
            <button
              onClick={() => onNavigate('booking')}
              className="p-2 rounded-xl text-slate-200 hover:bg-slate-800/80 transition-colors"
            >
              <Calendar className="w-5 h-5" />
            </button>
            <button
              onClick={() => onNavigate('login')}
              className="p-2 rounded-xl text-slate-200 hover:bg-slate-800/80 transition-colors"
            >
              <LogIn className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="mt-3 flex flex-wrap gap-2 xl:hidden">
          {navTabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => onNavigate(tab.key)}
              className={`px-3 py-1.5 rounded-lg text-[11px] font-semibold transition-all duration-200 ${
                currentPage === tab.key
                  ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-400/40'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800/80'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>
    </nav>
  );
};
