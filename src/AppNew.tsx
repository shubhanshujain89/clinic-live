import React, { useState, useEffect } from 'react';
import { auth, onAuthStateChanged, User } from './lib/firebase';
import { GlobalHeader } from './components/GlobalHeader';
import { LandingPage } from './pages/LandingPage';
import { LoginPage } from './pages/LoginPage';
import { ClinicAdminDashboard } from './pages/ClinicAdminDashboard';
import { DoctorManagement } from './pages/DoctorManagement';
import { PatientBooking } from './pages/PatientBooking';
import { ClinicQueueApp } from './components/ClinicQueueApp';
import { WhatWeProvidePage } from './pages/WhatWeProvidePage';
import { WhyChooseUsPage } from './pages/WhyChooseUsPage';
import { BenefitsPage } from './pages/BenefitsPage';
import { ContactPage } from './pages/ContactPage';

type AppPage = 'landing' | 'what-we-provide' | 'why-choose-us' | 'benefits' | 'contact' | 'login' | 'clinic-admin' | 'doctor-management' | 'patient-booking' | 'clinic-queue';

interface UserSession {
  userId: string;
  role: string;
  clinicId?: string;
}

export default function App() {
  const [currentPage, setCurrentPage] = useState<AppPage>('landing');
  const [userSession, setUserSession] = useState<UserSession | null>(null);
  const [authUser, setAuthUser] = useState<User | null>(null);
  const [selectedClinicId, setSelectedClinicId] = useState<string>('');
  const [selectedClinicName, setSelectedClinicName] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);

  // Monitor auth state
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setAuthUser(user);
      if (!user) {
        setUserSession(null);
        setCurrentPage('landing');
      }
      setIsLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const handleNavigate = (page: string, role?: string) => {
    if (page === 'login') {
      setCurrentPage('login');
    } else if (page === 'booking') {
      setCurrentPage('patient-booking');
    } else if (page === 'what-we-provide') {
      setCurrentPage('what-we-provide');
    } else if (page === 'why-choose-us') {
      setCurrentPage('why-choose-us');
    } else if (page === 'benefits') {
      setCurrentPage('benefits');
    } else if (page === 'contact') {
      setCurrentPage('contact');
    } else if (page === 'landing') {
      setCurrentPage('landing');
      setUserSession(null);
    }
  };

  const handleLoginSuccess = (userId: string, role: string, clinicId?: string) => {
    const session: UserSession = { userId, role, clinicId };
    setUserSession(session);

    // Route to appropriate page based on role
    if (role === 'admin') {
      setCurrentPage('clinic-admin');
    } else if (role === 'clinic-admin') {
      setCurrentPage('clinic-admin');
    } else if (role === 'doctor' || role === 'staff') {
      setCurrentPage('clinic-queue');
    } else {
      setCurrentPage('landing');
    }
  };

  const handleLogout = () => {
    setUserSession(null);
    setCurrentPage('landing');
    setAuthUser(null);
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

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 text-white flex flex-col">
      {/* Global Header - Shows on all pages */}
      <GlobalHeader
        currentPage={currentPage}
        onNavigate={handleNavigate}
        onLogout={handleLogout}
        isLoggedIn={!!userSession}
        userName={userSession?.role ? userSession.role.replace('-', ' ').toUpperCase() : undefined}
      />

      {/* Page Content */}
      <div className="flex-1">
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

        {/* Admin Dashboard */}
        {currentPage === 'clinic-admin' && userSession && (
          <ClinicAdminDashboard
            adminId={userSession.userId}
            onLogout={handleLogout}
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

        {/* Clinic Queue App (for doctors and staff) */}
        {currentPage === 'clinic-queue' && userSession && (
          <ClinicQueueApp
            userId={userSession.userId}
            role={userSession.role}
            onLogout={handleLogout}
          />
        )}
      </div>
    </div>
  );
}
