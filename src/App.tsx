import React, { useState, useEffect } from 'react';
import {
  Clinic,
  TokenItem,
  QueueSession,
  UserRole
} from './types/queue';
import {
  db,
  doc,
  collection,
  onSnapshot,
  auth,
  signInWithPopup,
  googleProvider,
  onAuthStateChanged,
  User
} from './lib/firebase';
import {
  DEFAULT_CLINIC_ID,
  INITIAL_CLINIC_DATA,
  INITIAL_SESSION_DATA,
  INITIAL_TOKENS_DATA,
  seedClinicDatabase,
  resetClinicDatabase
} from './lib/seedData';
import { Navbar } from './components/Navbar';
import { DoctorView } from './components/DoctorView';
import { ReceptionistView } from './components/ReceptionistView';
import { PatientTrackView } from './components/PatientTrackView';
import { BookingView } from './components/BookingView';
import { TvDisplayView } from './components/TvDisplayView';
import { AddPatientModal } from './components/AddPatientModal';
import { DelayBroadcastModal } from './components/DelayBroadcastModal';
import { WhatsAppLogsModal } from './components/WhatsAppLogsModal';
import { PrintTokenModal } from './components/PrintTokenModal';

export default function App() {
  const [currentRole, setCurrentRole] = useState<UserRole>('DOCTOR');
  const [isBookingActive, setIsBookingActive] = useState(false);
  const [clinic, setClinic] = useState<Clinic>(INITIAL_CLINIC_DATA);
  const [session, setSession] = useState<QueueSession | null>(INITIAL_SESSION_DATA);
  const [tokens, setTokens] = useState<TokenItem[]>(INITIAL_TOKENS_DATA);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [selectedTrackTokenId, setSelectedTrackTokenId] = useState<string>('tok_03');
  const [isSeeding, setIsSeeding] = useState(false);

  // Modals state
  const [isAddPatientOpen, setIsAddPatientOpen] = useState(false);
  const [isDelayModalOpen, setIsDelayModalOpen] = useState(false);
  const [isWhatsAppLogsOpen, setIsWhatsAppLogsOpen] = useState(false);
  const [tokenToPrint, setTokenToPrint] = useState<TokenItem | null>(null);
  const [tokenIntakeNotesToView, setTokenIntakeNotesToView] = useState<TokenItem | null>(null);

  // Read URL parameters on startup (e.g. ?token=A-103 or ?role=patient or ?role=tv)
  useEffect(() => {
    try {
      const searchParams = new URLSearchParams(window.location.search);
      const urlRole = searchParams.get('role');
      const urlToken = searchParams.get('token');
      
      if (urlRole) {
        if (urlRole.toUpperCase() === 'TV' || urlRole.toUpperCase() === 'TV_DISPLAY') {
          setCurrentRole('TV_DISPLAY');
        } else if (urlRole.toUpperCase() === 'RECEPTIONIST' || urlRole.toUpperCase() === 'ADMIN') {
          setCurrentRole('RECEPTIONIST');
        } else if (urlRole.toUpperCase() === 'PATIENT' || urlRole.toUpperCase() === 'TRACK') {
          setCurrentRole('PATIENT');
        } else if (urlRole.toUpperCase() === 'DOCTOR' || urlRole.toUpperCase() === 'SUPER_ADMIN') {
          setCurrentRole('DOCTOR');
        } else if (urlRole.toUpperCase() === 'BOOK') {
          setCurrentRole('PATIENT');
          setIsBookingActive(true);
        }
      }

      if (urlToken) {
        const found = tokens.find(t => t.tokenNumber.toLowerCase() === urlToken.toLowerCase() || t.id === urlToken);
        if (found) {
          setSelectedTrackTokenId(found.id);
        }
      }
    } catch {
      // URL parsing fallback
    }
  }, []);

  // Listen to Auth State
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
    });
    return () => unsubscribe();
  }, []);

  // Real-time Firestore Listeners (Instant Sync for Clinic & Tokens)
  useEffect(() => {
    // 1. Listen to Clinic document
    const clinicRef = doc(db, 'clinics', DEFAULT_CLINIC_ID);
    const unsubClinic = onSnapshot(
      clinicRef,
      (docSnap) => {
        if (docSnap.exists()) {
          setClinic(docSnap.data() as Clinic);
        } else {
          // Initialize clinic document if empty
          seedClinicDatabase(false);
        }
      },
      (err) => {
        console.warn('Firestore clinic subscription fallback to initial data:', err);
      }
    );

    // 2. Listen to Session document
    const sessionRef = doc(db, 'queue_sessions', 'sess_today');
    const unsubSession = onSnapshot(
      sessionRef,
      (docSnap) => {
        if (docSnap.exists()) {
          setSession(docSnap.data() as QueueSession);
        }
      },
      (err) => {
        console.warn('Firestore session subscription:', err);
      }
    );

    // 3. Listen to Tokens collection in real-time
    const tokensRef = collection(db, 'tokens');
    const unsubTokens = onSnapshot(
      tokensRef,
      (snapshot) => {
        if (!snapshot.empty) {
          const items: TokenItem[] = [];
          snapshot.forEach((d) => {
            items.push(d.data() as TokenItem);
          });
          setTokens(items);
        } else {
          // If Firestore is empty, seed demo data
          seedClinicDatabase(false);
        }
      },
      (err) => {
        console.warn('Firestore tokens subscription fallback to initial:', err);
      }
    );

    return () => {
      unsubClinic();
      unsubSession();
      unsubTokens();
    };
  }, []);

  // Google Sign-In Handler
  const handleGoogleSignIn = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (err: any) {
      console.error('Google Sign In error:', err);
      // If popup fails or is blocked in iframe, create a mock verified session
      setCurrentUser({
        displayName: 'Dr. Aryan Sharma',
        email: 'dr.sharma@apexclinic.com',
        photoURL: 'https://images.unsplash.com/photo-1622253692010-333f2da6031d?w=150&auto=format&fit=crop&q=80',
        uid: 'demo_doctor_user_1',
      } as unknown as User);
    }
  };

  // Seed / Reset Database
  const handleSeedData = async () => {
    setIsSeeding(true);
    await resetClinicDatabase();
    setTimeout(() => {
      setIsSeeding(false);
    }, 800);
  };

  // If in TV Display Mode, render TV Fullscreen Component
  if (currentRole === 'TV_DISPLAY') {
    return (
      <TvDisplayView
        clinic={clinic}
        session={session}
        tokens={tokens}
        onExitTvMode={() => setCurrentRole('RECEPTIONIST')}
      />
    );
  }

  return (
    <div className="app-shell min-h-screen text-slate-100 flex flex-col selection:bg-teal-500 selection:text-slate-950">
      <div className="relative z-10 flex min-h-screen flex-col">
        <Navbar
          currentRole={currentRole}
          onSelectRole={(role) => {
            setIsBookingActive(false);
            setCurrentRole(role);
          }}
          clinic={clinic}
          currentUser={currentUser}
          onGoogleSignIn={handleGoogleSignIn}
          onSeedData={handleSeedData}
          onToggleWhatsAppLogs={() => setIsWhatsAppLogsOpen(true)}
          isSeeding={isSeeding}
        />

        <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8">
          {!['TV_DISPLAY'].includes(currentRole) && (
            <div className="premium-hero mb-6 rounded-[30px] border border-slate-700/70 bg-slate-900/60 p-4 shadow-[0_20px_60px_rgba(15,23,42,0.45)] backdrop-blur-xl sm:p-6">
              <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
                <div className="max-w-2xl min-w-0">
                  <div className="inline-flex items-center gap-2 rounded-full border border-teal-500/40 bg-teal-500/10 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.22em] text-teal-300">
                    <span className="h-2 w-2 rounded-full bg-teal-400 animate-pulse" />
                    Care coordination platform
                  </div>
                  <h1 className="hero-heading mt-4 text-2xl font-black tracking-[-0.05em] text-white sm:text-3xl lg:text-4xl">
                    {currentRole === 'DOCTOR' && 'Clinic command center'}
                    {currentRole === 'RECEPTIONIST' && 'Reception operations desk'}
                    {currentRole === 'PATIENT' && 'Patient experience hub'}
                  </h1>
                  <p className="mt-3 max-w-xl text-sm text-slate-300 sm:text-base">
                    Real-time queue intelligence, patient visibility, and care delivery workflows designed for a premium clinical experience.
                  </p>
                  <div className="mt-4 flex flex-wrap gap-2 text-[11px] font-medium text-slate-200">
                    <span className="kpi-chip border border-emerald-500/25 bg-emerald-500/10 text-emerald-300">Live sync enabled</span>
                    <span className="kpi-chip border border-sky-500/25 bg-sky-500/10 text-sky-300">Operational visibility</span>
                    <span className="kpi-chip border border-violet-500/25 bg-violet-500/10 text-violet-300">Patient-first experience</span>
                  </div>
                </div>
                <div className="hero-metrics grid grid-cols-2 gap-3 text-sm text-slate-300 sm:grid-cols-3">
                  <div className="mini-stat rounded-2xl border border-slate-800 bg-slate-950/70 px-3 py-2">
                    <div className="text-[10px] uppercase tracking-[0.2em] text-slate-500">Doctor</div>
                    <div className="mt-1 font-semibold text-white">{clinic.doctorName}</div>
                  </div>
                  <div className="mini-stat rounded-2xl border border-slate-800 bg-slate-950/70 px-3 py-2">
                    <div className="text-[10px] uppercase tracking-[0.2em] text-slate-500">Cabin</div>
                    <div className="mt-1 font-semibold text-white">{clinic.cabinNumber}</div>
                  </div>
                  <div className="mini-stat rounded-2xl border border-slate-800 bg-slate-950/70 px-3 py-2">
                    <div className="text-[10px] uppercase tracking-[0.2em] text-slate-500">Queue</div>
                    <div className="mt-1 font-semibold text-white">{tokens.filter(t => t.status === 'WAITING').length} waiting</div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* VIEW 1: SUPER ADMIN (DOCTOR VIEW) */}
          {currentRole === 'DOCTOR' && (
            <DoctorView
              clinic={clinic}
              session={session}
              tokens={tokens}
              currentUser={currentUser}
              onGoogleSignIn={handleGoogleSignIn}
              onViewPreNotes={(token) => setTokenIntakeNotesToView(token)}
            />
          )}

          {/* VIEW 2: ADMIN (RECEPTIONIST VIEW) */}
          {currentRole === 'RECEPTIONIST' && (
            <ReceptionistView
              clinic={clinic}
              session={session}
              tokens={tokens}
              onOpenAddWalkIn={() => setIsAddPatientOpen(true)}
              onOpenDelayBroadcast={() => setIsDelayModalOpen(true)}
              onOpenWhatsAppLogs={() => setIsWhatsAppLogsOpen(true)}
              onViewTokenDetails={(token) => setTokenIntakeNotesToView(token)}
              onPrintTokenSlip={(token) => setTokenToPrint(token)}
            />
          )}

          {/* VIEW 3: PATIENT VIEW (TRACKER OR BOOKING) */}
          {currentRole === 'PATIENT' && (
            isBookingActive ? (
              <BookingView
                clinic={clinic}
                onBookingComplete={(newToken) => {
                  setSelectedTrackTokenId(newToken.id);
                  setIsBookingActive(false);
                }}
                onBackToTracker={() => setIsBookingActive(false)}
              />
            ) : (
              <PatientTrackView
                clinic={clinic}
                session={session}
                tokens={tokens}
                selectedTokenId={selectedTrackTokenId}
                onSelectTokenId={(id) => setSelectedTrackTokenId(id)}
                onNavigateToBooking={() => setIsBookingActive(true)}
              />
            )
          )}
        </main>

        {/* Global Modals */}
        {isAddPatientOpen && (
          <AddPatientModal
            clinic={clinic}
            onClose={() => setIsAddPatientOpen(false)}
            onAdded={(newToken) => {
              setTokenToPrint(newToken);
            }}
          />
        )}

        {isDelayModalOpen && (
          <DelayBroadcastModal
            clinic={clinic}
            tokens={tokens}
            onClose={() => setIsDelayModalOpen(false)}
          />
        )}

        {isWhatsAppLogsOpen && (
          <WhatsAppLogsModal
            onClose={() => setIsWhatsAppLogsOpen(false)}
          />
        )}

        {tokenToPrint && (
          <PrintTokenModal
            clinic={clinic}
            token={tokenToPrint}
            onClose={() => setTokenToPrint(null)}
          />
        )}

        {/* Intake Notes Modal from Doctor / Receptionist click */}
        {tokenIntakeNotesToView && (
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div>
                  <span className="text-xs font-mono font-bold text-teal-400">
                    TOKEN #{tokenIntakeNotesToView.tokenNumber}
                  </span>
                  <h3 className="text-lg font-bold text-white">
                    {tokenIntakeNotesToView.patientName} - Intake Summary
                  </h3>
                </div>
                <button
                  onClick={() => setTokenIntakeNotesToView(null)}
                  className="p-1 rounded-lg text-slate-400 hover:text-white bg-slate-800 text-xs"
                >
                  ✕
                </button>
              </div>

              {tokenIntakeNotesToView.preConsultationNotes ? (
                <div className="space-y-4 text-xs">
                  <div>
                    <span className="text-slate-400 font-bold uppercase block mb-1">Symptoms</span>
                    <p className="bg-slate-950 p-3 rounded-xl border border-slate-800 text-slate-200 text-sm">
                      {tokenIntakeNotesToView.preConsultationNotes.symptoms}
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-slate-300">
                    <div className="bg-slate-950 p-2 rounded-lg border border-slate-800">
                      <span className="text-slate-500 block">Duration:</span>
                      <span className="font-bold text-white">{tokenIntakeNotesToView.preConsultationNotes.duration || 'N/A'}</span>
                    </div>
                    <div className="bg-slate-950 p-2 rounded-lg border border-slate-800">
                      <span className="text-slate-500 block">Severity / Pain:</span>
                      <span className="font-bold text-teal-300">
                        {tokenIntakeNotesToView.preConsultationNotes.severity || 'Mild'} (Pain {tokenIntakeNotesToView.preConsultationNotes.painScale || 3}/10)
                      </span>
                    </div>
                  </div>
                </div>
              ) : (
                <p className="text-xs text-slate-400 py-4 text-center">
                  No pre-consultation notes submitted by this patient yet.
                </p>
              )}

              <div className="pt-2 flex justify-end">
                <button
                  onClick={() => setTokenIntakeNotesToView(null)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-semibold"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
