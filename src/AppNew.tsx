import React, { useState, useEffect } from 'react';
import { auth, onAuthStateChanged, User, signInWithEmailAndPassword, signOut } from './lib/firebase';
import { GlobalHeader } from './components/GlobalHeader';
import { useSiteConfig } from './lib/siteConfig';
import { LandingPage } from './pages/LandingPage';
import { LoginPage } from './pages/LoginPage';
import { ClinicAdminDashboard } from './pages/ClinicAdminDashboard';
import { DoctorManagement } from './pages/DoctorManagement';
import { PatientBooking } from './pages/PatientBooking';
import { PatientTracking } from './pages/PatientTracking';
import { ClinicQueueApp } from './components/ClinicQueueApp';
import { WhatWeProvidePage } from './pages/WhatWeProvidePage';
import { WhyChooseUsPage } from './pages/WhyChooseUsPage';
import { BenefitsPage } from './pages/BenefitsPage';
import { ContactPage } from './pages/ContactPage';

type AppPage = 'landing' | 'what-we-provide' | 'why-choose-us' | 'benefits' | 'contact' | 'login' | 'clinic-admin' | 'site-admin' | 'doctor-management' | 'patient-booking' | 'patient-tracking' | 'clinic-queue';

interface UserSession {
  userId: string;
  role: string;
  clinicId?: string;
}

export const resolveAppPageForRoute = (path: string, userRole?: string | null): AppPage => {
  const normalizedRole = String(userRole || '').toUpperCase();

  if (path === '/site/admin') {
    if (normalizedRole === 'SUPER_ADMIN') return 'site-admin';
    if (normalizedRole === 'CLINIC_ADMIN') return 'clinic-admin';
    return 'site-admin';
  }

  if ((path === '/site/login' || path === '/login') && normalizedRole) {
    if (normalizedRole === 'SUPER_ADMIN') return 'site-admin';
    if (normalizedRole === 'CLINIC_ADMIN') return 'clinic-admin';
    if (normalizedRole === 'DOCTOR' || normalizedRole === 'STAFF') return 'clinic-queue';
    return 'landing';
  }

  if (path === '/site/login') return 'login';

  if (path.startsWith('/track/')) return 'patient-tracking';
  if (path === '/booking') return 'patient-booking';
  if (path === '/login') return 'login';
  if (path === '/what-we-provide') return 'what-we-provide';
  if (path === '/why-choose-us') return 'why-choose-us';
  if (path === '/benefits') return 'benefits';
  if (path === '/contact') return 'contact';
  return 'landing';
};

const isPublicRoute = (path: string) => {
  return path === '/login' || path === '/booking' || path.startsWith('/track/') || path === '/what-we-provide' || path === '/why-choose-us' || path === '/benefits' || path === '/contact';
};

export default function App() {
  const { settings, content } = useSiteConfig();
  const [currentPage, setCurrentPage] = useState<AppPage>('landing');
  const [userSession, setUserSession] = useState<UserSession | null>(null);
  const [authUser, setAuthUser] = useState<User | null>(null);
  const [selectedClinicId, setSelectedClinicId] = useState<string>('');
  const [selectedClinicName, setSelectedClinicName] = useState<string>('');
  const [trackingId, setTrackingId] = useState('');
  const [siteAdminLogin, setSiteAdminLogin] = useState({ username: '', password: '' });
  const [siteAdminError, setSiteAdminError] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [profileOpen, setProfileOpen] = useState(false);
  const [profileForm, setProfileForm] = useState({ displayName: '', photoURL: '', password: '', confirmPassword: '' });

  // Monitor auth state
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setAuthUser(user);
      if (!user) {
        setUserSession((current) => current ?? null);
        const path = window.location.pathname;
        const isPublicPage = isPublicRoute(path);
        if (path === '/site/admin') {
          setCurrentPage('site-admin');
          window.history.replaceState({}, '', '/login');
        } else if (path === '/site/login' || path === '/login' || isPublicPage) {
          setCurrentPage(resolveAppPageForRoute(path, null));
        } else {
          setCurrentPage('landing');
        }
      } else {
        const nextSession = {
          userId: user.uid,
          role: user.role || 'CLINIC_ADMIN',
          clinicId: user.clinicId,
        };
        setUserSession((current) => {
          if (current && current.userId === nextSession.userId && current.role === nextSession.role) {
            return current;
          }
          return nextSession;
        });
      }
      setIsLoading(false);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const path = window.location.pathname;
    const nextPage = resolveAppPageForRoute(path, userSession?.role);
    if (path.startsWith('/track/')) {
      const id = path.slice('/track/'.length);
      setTrackingId(id);
    }
    if (userSession && (path === '/login' || path === '/site/login')) {
      const securePath = userSession.role === 'SUPER_ADMIN' ? '/site/admin' : '/site/admin';
      if (window.location.pathname !== securePath) {
        window.history.replaceState({}, '', securePath);
      }
      setCurrentPage(nextPage);
      return;
    }
    if (path === '/site/login') {
      window.history.replaceState({}, '', '/login');
    }
    setCurrentPage(nextPage);
  }, [userSession]);

  // Sync UI with browser back/forward navigation
  useEffect(() => {
    const handlePopState = () => {
      const path = window.location.pathname;
      const nextPage = resolveAppPageForRoute(path, userSession?.role);
      if (path.startsWith('/track/')) {
        const id = path.slice('/track/'.length);
        setTrackingId(id);
      }
      if (path === '/site/login') {
        window.history.replaceState({}, '', '/login');
      }
      setCurrentPage(nextPage);
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [userSession]);

  useEffect(() => {
    if (!userSession) return;
    const savedProfile = localStorage.getItem(`clinicflow-profile-${userSession.userId}`);
    const existing = savedProfile ? JSON.parse(savedProfile) : null;
    setProfileForm({
      displayName: existing?.displayName || authUser?.displayName || userSession.role || 'User',
      photoURL: existing?.photoURL || authUser?.photoURL || '',
      password: '',
      confirmPassword: '',
    });
  }, [userSession, authUser]);

  const handleNavigate = (page: string, role?: string) => {
    const effectiveRole = role || userSession?.role || '';

    if (page === 'login') {
      if (userSession) {
        if (userSession.role === 'SUPER_ADMIN') {
          setCurrentPage('site-admin');
          window.history.replaceState({}, '', '/site/admin');
        } else if (userSession.role === 'CLINIC_ADMIN') {
          setCurrentPage('clinic-admin');
          window.history.replaceState({}, '', '/site/admin');
        } else if (userSession.role === 'DOCTOR' || userSession.role === 'STAFF') {
          setCurrentPage('clinic-queue');
          window.history.replaceState({}, '', '/site/admin');
        }
        return;
      }
      setCurrentPage('login');
      window.history.pushState({}, '', '/login');
    } else if (page === 'booking') {
      setCurrentPage('patient-booking');
      window.history.pushState({}, '', '/booking');
    } else if (page === 'what-we-provide') {
      setCurrentPage('what-we-provide');
      window.history.pushState({}, '', '/what-we-provide');
    } else if (page === 'why-choose-us') {
      setCurrentPage('why-choose-us');
      window.history.pushState({}, '', '/why-choose-us');
    } else if (page === 'benefits') {
      setCurrentPage('benefits');
      window.history.pushState({}, '', '/benefits');
    } else if (page === 'contact') {
      setCurrentPage('contact');
      window.history.pushState({}, '', '/contact');
    } else if (page === 'site-admin') {
      if (effectiveRole === 'SUPER_ADMIN') {
        setCurrentPage('site-admin');
        window.history.pushState({}, '', '/site/admin');
      } else if (effectiveRole === 'CLINIC_ADMIN') {
        setCurrentPage('clinic-admin');
        window.history.pushState({}, '', '/site/admin');
      } else if (effectiveRole === 'DOCTOR' || effectiveRole === 'STAFF') {
        setCurrentPage('clinic-queue');
        window.history.pushState({}, '', '/site/admin');
      } else {
        setCurrentPage('site-admin');
        window.history.pushState({}, '', '/site/admin');
      }
    } else if (page === 'landing') {
      setCurrentPage('landing');
      // Do NOT log the user out when navigating Home — only clear the loaded page.
      window.history.pushState({}, '', '/');
    }
  };

  const handleLoginSuccess = (userId: string, role: string, clinicId?: string) => {
    const normalizedRole = String(role || '').toUpperCase();
    const uiRole = normalizedRole === 'SUPER_ADMIN' ? 'SUPER_ADMIN' : normalizedRole === 'CLINIC_ADMIN' ? 'CLINIC_ADMIN' : normalizedRole === 'DOCTOR' ? 'DOCTOR' : normalizedRole === 'STAFF' ? 'STAFF' : 'CLINIC_ADMIN';
    const session: UserSession = { userId, role: uiRole, clinicId };
    setUserSession(session);

    if (uiRole === 'SUPER_ADMIN') {
      setCurrentPage('site-admin');
      window.history.replaceState({}, '', '/site/admin');
      return;
    }

    if (uiRole === 'CLINIC_ADMIN') {
      setCurrentPage('clinic-admin');
      window.history.replaceState({}, '', '/site/admin');
    } else if (uiRole === 'DOCTOR' || uiRole === 'STAFF') {
      setCurrentPage('clinic-queue');
      window.history.replaceState({}, '', '/site/admin');
    } else {
      setCurrentPage('landing');
      window.history.replaceState({}, '', '/');
    }
  };

  const handleLogout = () => {
    void signOut(auth);
    setUserSession(null);
    setAuthUser(null);
    setProfileOpen(false);
    setSiteAdminLogin({ username: '', password: '' });
    setSiteAdminError('');
    setCurrentPage('login');
    window.history.replaceState({}, '', '/login');
  };

  const handleSaveProfile = () => {
    if (!userSession) return;
    if (profileForm.password && profileForm.password !== profileForm.confirmPassword) {
      window.alert('Passwords do not match.');
      return;
    }
    // Do not store plaintext passwords in localStorage. Password changes are
    // handled server-side by an administrator via the reset-password flow.
    const nextProfile = {
      displayName: profileForm.displayName || 'User',
      photoURL: profileForm.photoURL || '',
    };
    localStorage.setItem(`clinicflow-profile-${userSession.userId}`, JSON.stringify(nextProfile));
    if (profileForm.password) {
      void fetch('/api/users/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ userId: userSession.userId, defaultPassword: profileForm.password }),
      }).catch(() => {});
    }
    setProfileOpen(false);
    if (authUser) {
      setAuthUser({ ...authUser, displayName: nextProfile.displayName, photoURL: nextProfile.photoURL });
    }
    window.alert('Profile updated successfully.');
  };

  const handleBackFromClinicAdmin = () => {
    setCurrentPage('landing');
  };

  const handleManageDoctors = (clinicId: string, clinicName: string) => {
    setSelectedClinicId(clinicId);
    setSelectedClinicName(clinicName);
    setCurrentPage('doctor-management');
  };

  const handleBackFromDoctorManagement = () => {
    setCurrentPage('clinic-admin');
    setSelectedClinicId('');
    setSelectedClinicName('');
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 text-white flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-emerald-400/30 border-t-emerald-400 rounded-full animate-spin mx-auto mb-4" />
          <p className="text-slate-400">Loading...</p>
        </div>
      </div>
    );
  }

  const isAdminArea = currentPage === 'site-admin' || currentPage === 'clinic-admin' || currentPage === 'doctor-management';
  const showPublicHeader = !userSession && !isAdminArea;

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 text-white flex flex-col">
      {showPublicHeader && (
        <GlobalHeader
          currentPage={currentPage}
          onNavigate={handleNavigate}
          onLogout={handleLogout}
          onOpenProfile={() => setProfileOpen(true)}
          isLoggedIn={!!userSession}
          userName={userSession?.role ? userSession.role.replace('-', ' ').toUpperCase() : undefined}
        />
      )}

      {/* Page Content */}
      <div className="flex-1 min-h-0">
        {/* Landing Page */}
        {currentPage === 'landing' && (
          <LandingPage onNavigate={handleNavigate} />
        )}

        {currentPage === 'what-we-provide' && (
          <WhatWeProvidePage onNavigate={handleNavigate} />
        )}

        {currentPage === 'why-choose-us' && (
          <WhyChooseUsPage onNavigate={handleNavigate} />
        )}

        {currentPage === 'benefits' && (
          <BenefitsPage onNavigate={handleNavigate} />
        )}

        {currentPage === 'contact' && (
          <ContactPage onNavigate={handleNavigate} />
        )}

        {/* Login Page */}
        {currentPage === 'login' && (
          <LoginPage
            onLoginSuccess={handleLoginSuccess}
            onBack={() => handleNavigate('landing')}
          />
        )}

        {/* Site Admin Login */}
        {currentPage === 'site-admin' && (!userSession || userSession.role !== 'SUPER_ADMIN') && (
          <div className="min-h-screen flex items-center justify-center bg-slate-950 px-4">
            <div className="w-full max-w-md rounded-2xl border border-slate-700 bg-slate-900/80 p-8 shadow-2xl">
              <div className="mb-6 text-center">
                <div className="text-4xl mb-3">👑</div>
                <h2 className="text-2xl font-bold">Site Admin</h2>
                <p className="text-slate-400">Manage the website, hero content, and access controls</p>
              </div>

              {siteAdminError && (
                <div className="mb-4 rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-200">
                  {siteAdminError}
                </div>
              )}

              <div className="space-y-4">
                <div>
                  <label className="mb-2 block text-sm font-medium">Username</label>
                  <input
                    type="text"
                    value={siteAdminLogin.username}
                    onChange={(e) => setSiteAdminLogin({ ...siteAdminLogin, username: e.target.value })}
                    className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-white outline-none focus:border-emerald-400"
                    placeholder="admin"
                  />
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium">Password</label>
                  <input
                    type="password"
                    value={siteAdminLogin.password}
                    onChange={(e) => setSiteAdminLogin({ ...siteAdminLogin, password: e.target.value })}
                    className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-white outline-none focus:border-emerald-400"
                    placeholder="Enter password"
                  />
                </div>
                <button
                  type="button"
                  onClick={async () => {
                    try {
                      const result = await signInWithEmailAndPassword(auth, siteAdminLogin.username, siteAdminLogin.password, 'SUPER_ADMIN');
                      handleLoginSuccess(result.user.uid, result.user.role || 'SUPER_ADMIN');
                      setSiteAdminError('');
                    } catch {
                      setSiteAdminError('Invalid site admin credentials.');
                    }
                  }}
                  className="w-full rounded-lg bg-gradient-to-r from-emerald-500 to-cyan-500 px-4 py-3 font-bold text-slate-950"
                >
                  Access Admin Panel
                </button>
              </div>
            </div>
          </div>
        )}

        {currentPage === 'site-admin' && userSession && userSession.role === 'SUPER_ADMIN' && (
          <ClinicAdminDashboard
            adminId={userSession.userId}
            onLogout={handleLogout}
            onManageDoctors={handleManageDoctors}
            mode="site-admin"
          />
        )}

        {/* Admin Dashboard */}
        {currentPage === 'clinic-admin' && userSession && (
          <ClinicAdminDashboard
            adminId={userSession.userId}
            onLogout={handleLogout}
            onManageDoctors={handleManageDoctors}
            mode="clinic-admin"
          />
        )}

        {/* Doctor Management */}
        {currentPage === 'doctor-management' && (
          <DoctorManagement
            clinicId={selectedClinicId}
            clinicName={selectedClinicName}
            onBack={handleBackFromDoctorManagement}
          />
        )}

        {/* Patient Booking */}
        {currentPage === 'patient-booking' && (
          <PatientBooking onBack={() => handleNavigate('landing')} />
        )}

        {currentPage === 'patient-tracking' && trackingId && (
          <PatientTracking trackingId={trackingId} onBack={() => handleNavigate('landing')} />
        )}

        {/* Clinic Queue App (for doctors and staff) */}
        {currentPage === 'clinic-queue' && userSession && (
          <ClinicQueueApp
            userId={userSession.userId}
            role={userSession.role}
            clinicId={userSession.clinicId}
            onLogout={handleLogout}
          />
        )}
      </div>

      {profileOpen && userSession && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-md rounded-2xl border border-slate-700 bg-slate-900 p-6">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-xl font-bold text-white">My Profile</h3>
              <button onClick={() => setProfileOpen(false)} className="text-slate-400 hover:text-white">✕</button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-300">Display name</label>
                <input value={profileForm.displayName} onChange={(e) => setProfileForm({ ...profileForm, displayName: e.target.value })} className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-white" />
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-300">Profile photo URL</label>
                <input value={profileForm.photoURL} onChange={(e) => setProfileForm({ ...profileForm, photoURL: e.target.value })} className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-white" placeholder="https://..." />
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-300">New password</label>
                <input type="password" value={profileForm.password} onChange={(e) => setProfileForm({ ...profileForm, password: e.target.value })} className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-white" placeholder="Leave blank to keep current" />
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-300">Confirm password</label>
                <input type="password" value={profileForm.confirmPassword} onChange={(e) => setProfileForm({ ...profileForm, confirmPassword: e.target.value })} className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-white" placeholder="Confirm new password" />
              </div>
              <div className="flex gap-3 pt-2">
                <button onClick={() => setProfileOpen(false)} className="flex-1 rounded-lg border border-slate-600 px-4 py-2 text-slate-200">Cancel</button>
                <button onClick={handleSaveProfile} className="flex-1 rounded-lg bg-emerald-500 px-4 py-2 font-semibold text-slate-950">Save Profile</button>
              </div>
            </div>
          </div>
        </div>
      )}

      <footer className="border-t border-slate-700/60 bg-slate-950/80">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-4 text-[11px] font-medium uppercase tracking-[0.18em] text-slate-400 sm:px-6 lg:px-8">
          <span>{settings.siteName}</span>
          <span className="text-slate-500">{content.footerText}</span>
        </div>
      </footer>
    </div>
  );
}
