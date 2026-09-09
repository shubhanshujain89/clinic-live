import React from 'react';
import { Heart, LogOut } from 'lucide-react';
import { useSiteConfig } from '../lib/siteConfig';

interface GlobalHeaderProps {
  currentPage: string;
  onNavigate: (page: string) => void;
  onLogout?: () => void;
  onOpenProfile?: () => void;
  isLoggedIn?: boolean;
  userName?: string;
}

export const GlobalHeader: React.FC<GlobalHeaderProps> = ({
  currentPage,
  onNavigate,
  onLogout,
  onOpenProfile,
  isLoggedIn,
  userName
}) => {
  const { settings } = useSiteConfig();
  const navTabs = [
    { key: 'landing', label: 'Home' },
    { key: 'what-we-provide', label: 'What We Provide' },
    { key: 'why-choose-us', label: 'Why Choose Us' },
    { key: 'benefits', label: 'Benefits' },
    { key: 'contact', label: 'Contact Us' },
  ];

  return (
    <nav className="sticky top-0 z-50 border-b border-slate-200 bg-white/90 backdrop-blur-xl shadow-sm">
      <div className="mx-auto max-w-7xl px-4 py-3.5 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between gap-4">
          <button
            onClick={() => onNavigate('landing')}
            className="group flex min-w-0 items-center gap-3"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 ring-1 ring-emerald-200">
              <Heart className="h-5 w-5 text-emerald-600 transition-transform group-hover:scale-110" />
            </div>
            <div className="min-w-0 text-left">
              <h1 className="text-lg font-bold text-slate-900 transition-colors group-hover:text-emerald-700">
                {settings.siteName}
              </h1>
              <p className="truncate text-[10px] uppercase tracking-[0.18em] text-slate-500">{settings.siteTagline}</p>
            </div>
          </button>

          <div className="hidden flex-1 items-center justify-center gap-2 xl:flex">
            {navTabs.map((tab) => (
              <button
                key={tab.key}
                onClick={() => onNavigate(tab.key)}
                className={`rounded-xl px-4 py-2 text-sm font-semibold transition-all duration-200 ${
                  currentPage === tab.key
                    ? 'border border-emerald-200 bg-emerald-50 text-emerald-700'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="hidden shrink-0 items-center gap-2.5 md:flex">
            {isLoggedIn && (
              <>
                <button
                  onClick={onOpenProfile}
                  className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-slate-700 transition hover:border-slate-300 hover:bg-slate-100"
                >
                  <Heart className="h-4 w-4 text-emerald-600" />
                  <span className="text-sm font-semibold">{userName}</span>
                </button>
                <button
                  onClick={onLogout}
                  className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 font-semibold text-slate-700 transition hover:border-red-200 hover:bg-red-50 hover:text-red-600"
                >
                  <LogOut className="h-4 w-4" />
                  Logout
                </button>
              </>
            )}
          </div>

          <div className="flex shrink-0 items-center gap-2 md:hidden">
            {isLoggedIn ? (
              <>
                <button
                  onClick={onOpenProfile}
                  className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-700"
                >
                  {userName || 'Profile'}
                </button>
                <button
                  onClick={onLogout}
                  className="rounded-xl px-3 py-2 text-slate-700 hover:bg-red-50 hover:text-red-600"
                >
                  <LogOut className="h-5 w-5" />
                </button>
              </>
            ) : null}
          </div>
        </div>

        <div className="mt-3 flex flex-wrap gap-2 xl:hidden">
          {navTabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => onNavigate(tab.key)}
              className={`rounded-lg px-3 py-1.5 text-[11px] font-semibold transition-all duration-200 ${
                currentPage === tab.key
                  ? 'border border-emerald-200 bg-emerald-50 text-emerald-700'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
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
