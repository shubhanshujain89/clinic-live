import React from 'react';
import { LogOut } from 'lucide-react';
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
    { key: 'how-it-works', label: 'How It Works' },
    { key: 'why-choose-us', label: 'Why Choose Us' },
    { key: 'benefits', label: 'Benefits' },
    { key: 'contact', label: 'Contact Us' },
  ];

  return (
    <nav className="site-header sticky top-0 z-50 border-b border-slate-200 bg-white">
      <div className="mx-auto max-w-none px-2 py-3 sm:px-4 lg:px-5">
        <div className="relative flex items-center justify-between gap-4">
          <button
            onClick={() => onNavigate('landing')}
            className="group flex min-w-0 items-center"
          >
            <img src="/nextq-logo.png" alt="NEXTQ logo" className="h-14 w-24 shrink-0 object-contain object-left" />
          </button>

          <div className="absolute left-1/2 hidden -translate-x-1/2 items-center justify-center gap-1 xl:flex">
            {navTabs.map((tab) => (
              <button
                key={tab.key}
                onClick={() => onNavigate(tab.key)}
                className={`rounded-lg px-3 py-2 text-[13px] font-semibold transition-all duration-200 ${
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
            <button
              type="button"
              onClick={() => onNavigate('contact')}
              className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-bold text-white shadow-sm transition hover:bg-emerald-700"
            >
              Request a Demo →
            </button>
            {isLoggedIn && (
              <>
                <button
                  onClick={() => onNavigate('dashboard')}
                  className="rounded-lg bg-slate-900 px-3.5 py-2 text-sm font-semibold text-white transition hover:bg-slate-700"
                >
                  Dashboard
                </button>
                <button
                  onClick={onOpenProfile}
                  className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-slate-700 transition hover:border-slate-300 hover:bg-slate-100"
                >
                  <span className="text-sm font-semibold">{userName}</span>
                </button>
                <button
                  onClick={onLogout}
                  className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-sm font-semibold text-slate-700 transition hover:border-red-200 hover:bg-red-50 hover:text-red-600"
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
                  onClick={() => onNavigate('dashboard')}
                  className="rounded-lg bg-slate-900 px-3 py-2 text-sm font-semibold text-white"
                >
                  Dashboard
                </button>
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
