import React, { useState, useEffect } from 'react';
import {
  Clinic,
  TokenItem,
  QueueSession,
  UserRole
} from '../types/queue';
import {
  auth,
  signInWithPopup,
  googleProvider,
  onAuthStateChanged,
  User
} from '../lib/firebase';
import {
  DEFAULT_CLINIC_ID,
  INITIAL_CLINIC_DATA,
  INITIAL_SESSION_DATA,
  INITIAL_TOKENS_DATA,
  resetClinicDatabase
} from '../lib/seedData';
import { Navbar } from './Navbar';
import { DoctorView } from './DoctorView';
import { ReceptionistView } from './ReceptionistView';
import { PatientTrackView } from './PatientTrackView';
import { BookingView } from './BookingView';
import { TvDisplayView } from './TvDisplayView';
import { AddPatientModal } from './AddPatientModal';
import { DelayBroadcastModal } from './DelayBroadcastModal';
import { WhatsAppLogsModal } from './WhatsAppLogsModal';
import { PrintTokenModal } from './PrintTokenModal';
import { LogOut } from 'lucide-react';

interface ClinicQueueAppProps {
  userId: string;
  role: string;
  clinicId?: string;
  onLogout: () => void;
}

export function ClinicQueueApp({ userId, role, clinicId: selectedClinicId, onLogout }: ClinicQueueAppProps) {
  const [currentRole, setCurrentRole] = useState<UserRole>('DOCTOR');
  const [isBookingActive, setIsBookingActive] = useState(false);
  const [clinicId, setClinicId] = useState<string>(selectedClinicId || DEFAULT_CLINIC_ID);
  const [clinic, setClinic] = useState<Clinic>(INITIAL_CLINIC_DATA);
  const [session, setSession] = useState<QueueSession | null>(INITIAL_SESSION_DATA);
  const [tokens, setTokens] = useState<TokenItem[]>(INITIAL_TOKENS_DATA);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [selectedTrackTokenId, setSelectedTrackTokenId] = useState<string>('tok_03');
  const [isSeeding, setIsSeeding] = useState(false);
  const isStaffRole = role === 'staff';
  const roleSwitchOptions = isStaffRole ? ['RECEPTIONIST'] : ['DOCTOR', 'RECEPTIONIST', 'TV_DISPLAY'];

  // Modals state
  const [isAddPatientOpen, setIsAddPatientOpen] = useState(false);
  const [isDelayModalOpen, setIsDelayModalOpen] = useState(false);
  const [isWhatsAppLogsOpen, setIsWhatsAppLogsOpen] = useState(false);
  const [tokenToPrint, setTokenToPrint] = useState<TokenItem | null>(null);
  const [tokenIntakeNotesToView, setTokenIntakeNotesToView] = useState<TokenItem | null>(null);

  useEffect(() => {
    setClinicId(selectedClinicId || DEFAULT_CLINIC_ID);
  }, [selectedClinicId]);

  // Set role based on login
  useEffect(() => {
    if (role === 'doctor') {
      setCurrentRole('DOCTOR');
    } else if (role === 'staff') {
      setCurrentRole('RECEPTIONIST');
    }
  }, [role]);

  useEffect(() => {
    if (isStaffRole && currentRole === 'DOCTOR') {
      setCurrentRole('RECEPTIONIST');
    }
  }, [isStaffRole, currentRole]);

  // Get current user info
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
    });
    return () => unsubscribe();
  }, []);

  // Load the current clinic queue from MySQL. Queue mutations remain on Firebase until migrated.
  useEffect(() => {
    const controller = new AbortController();
    const loadQueue = async () => {
      try {
        const response = await fetch(`/api/staff/queue/${encodeURIComponent(clinicId)}`, {
          signal: controller.signal,
          credentials: 'include',
        });
        const payload = await response.json();
        if (!response.ok) throw new Error(payload.error || 'Unable to load queue.');
        setClinic(payload.clinic as Clinic);
        setSession(payload.session as QueueSession | null);
        setTokens((payload.tokens || []) as TokenItem[]);
      } catch (error) {
        if (!controller.signal.aborted) {
          console.warn('MySQL queue load failed:', error);
        }
      }
    };

    loadQueue();
    return () => controller.abort();
  }, [clinicId]);

  const handleGoogleSignIn = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (err: any) {
      console.error('Google Sign In error:', err);
    }
  };

  const handleSeedData = async () => {
    setIsSeeding(true);
    await resetClinicDatabase();
    setTimeout(() => {
      setIsSeeding(false);
    }, 800);
  };

  // TV Display Mode
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
        <div className="border-b border-slate-700/50 bg-slate-950/80 backdrop-blur-sm sticky top-0 z-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold">{clinic.name}</h1>
              <p className="text-sm text-slate-400">
                {currentRole === 'DOCTOR' ? 'Doctor Console' : 'Reception Desk'}
              </p>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex gap-2">
                {roleSwitchOptions.map(r => (
                  <button
                    key={r}
                    onClick={() => setCurrentRole(r as UserRole)}
                    className={`px-4 py-2 rounded-lg font-semibold transition ${
                      currentRole === r
                        ? 'bg-emerald-500 text-white'
                        : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                    }`}
                  >
                    {r === 'DOCTOR' ? 'Doctor' : r === 'RECEPTIONIST' ? 'Reception' : 'TV'}
                  </button>
                ))}
              </div>
              <button
                onClick={onLogout}
                className="px-4 py-2 bg-red-500/20 hover:bg-red-500/30 border border-red-400 rounded-lg flex items-center gap-2 transition"
              >
                <LogOut className="w-4 h-4" />
                Logout
              </button>
            </div>
          </div>
        </div>

        <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8">
          {!['TV_DISPLAY'].includes(currentRole) && (
            <div className="premium-hero mb-6 rounded-[30px] border border-slate-700/70 bg-slate-900/60 p-4 shadow-[0_20px_60px_rgba(15,23,42,0.45)] backdrop-blur-xl sm:p-6">
              <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
                <div className="max-w-2xl min-w-0">
                  <div className="inline-flex items-center gap-2 rounded-full border border-teal-500/40 bg-teal-500/10 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.22em] text-teal-300">
                    <span className="h-2 w-2 rounded-full bg-teal-400 animate-pulse" />
                    ClinicFlow Pro
                  </div>
                  <h1 className="hero-heading mt-4 text-2xl font-black tracking-[-0.05em] text-white sm:text-3xl lg:text-4xl">
                    {currentRole === 'DOCTOR' && 'Clinic Command Center'}
                    {currentRole === 'RECEPTIONIST' && 'Reception Operations Desk'}
                  </h1>
                  <p className="mt-3 max-w-xl text-sm text-slate-300 sm:text-base">
                    Real-time queue intelligence, patient visibility, and care delivery workflows designed for efficiency.
                  </p>
                </div>
                <div className="hero-metrics grid grid-cols-2 gap-3 text-sm text-slate-300 sm:grid-cols-3">
                  <div className="mini-stat rounded-2xl border border-slate-800 bg-slate-950/70 px-3 py-2">
                    <div className="text-[10px] uppercase tracking-[0.2em] text-slate-500">Doctor</div>
                    <div className="mt-1 font-semibold text-white">{clinic.doctorName}</div>
                  </div>
                  <div className="mini-stat rounded-2xl border border-slate-800 bg-slate-950/70 px-3 py-2">
                    <div className="text-[10px] uppercase tracking-[0.2em] text-slate-500">Queue</div>
                    <div className="mt-1 font-semibold text-white">{tokens.filter(t => t.status === 'WAITING').length}</div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Doctor View */}
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

          {/* Receptionist View */}
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
        </main>

        {/* Modals */}
        {isAddPatientOpen && (
          <AddPatientModal
            clinic={clinic}
            onClose={() => setIsAddPatientOpen(false)}
            onAdded={(token) => {
              setTokens((prev) => [token, ...prev]);
              setIsAddPatientOpen(false);
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
          <WhatsAppLogsModal onClose={() => setIsWhatsAppLogsOpen(false)} />
        )}

        {tokenToPrint && (
          <PrintTokenModal
            token={tokenToPrint}
            clinic={clinic}
            onClose={() => setTokenToPrint(null)}
          />
        )}
      </div>
    </div>
  );
}
