import React, { useState, useEffect } from 'react';
import {
  Stethoscope,
  Activity,
  Users,
  IndianRupee,
  Clock,
  CheckCircle2,
  AlertCircle,
  FileText,
  Paperclip,
  Flame,
  ChevronRight,
  TrendingUp,
  UserCheck,
  ShieldCheck,
  Power,
  Sparkles,
  Phone,
  Calendar,
  Eye,
  Check,
  Volume2,
  Edit3,
  Scale,
  Thermometer,
  Save,
  X
} from 'lucide-react';
import { Clinic, TokenItem, QueueSession, DoctorStatus } from '../types/queue';
import { db, doc, updateDoc, collection, setDoc } from '../lib/firebase';
import { soundManager } from '../lib/audio';
import { WhatsAppService } from '../lib/whatsappService';

interface DoctorViewProps {
  clinic: Clinic;
  session: QueueSession | null;
  tokens: TokenItem[];
  currentUser: any;
  onGoogleSignIn: () => void;
  onViewPreNotes?: (token: TokenItem) => void;
}

export const DoctorView: React.FC<DoctorViewProps> = ({
  clinic,
  session,
  tokens,
  currentUser,
  onGoogleSignIn,
  onViewPreNotes,
}) => {
  const isBasicPlan = clinic.featurePlan === 'BASIC';
  const [doctorRxNotes, setDoctorRxNotes] = useState('');
  const [isSavingNotes, setIsSavingNotes] = useState(false);
  const [selectedTokenForModal, setSelectedTokenForModal] = useState<TokenItem | null>(null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Doctor editing patient details state
  const [editingToken, setEditingToken] = useState<TokenItem | null>(null);
  const [editName, setEditName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editAge, setEditAge] = useState('');
  const [editGender, setEditGender] = useState<'Male' | 'Female' | 'Other'>('Male');
  const [editSymptoms, setEditSymptoms] = useState('');
  const [editDuration, setEditDuration] = useState('');
  const [editSeverity, setEditSeverity] = useState<'Mild' | 'Moderate' | 'Severe' | 'Critical'>('Mild');
  const [editPainScale, setEditPainScale] = useState(3);
  const [editAllergies, setEditAllergies] = useState('');
  const [editTemp, setEditTemp] = useState('');
  const [editBpSys, setEditBpSys] = useState('');
  const [editBpDia, setEditBpDia] = useState('');
  const [editWeight, setEditWeight] = useState('');
  const [editNotes, setEditNotes] = useState('');
  const [isSavingEdit, setIsSavingEdit] = useState(false);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const openEditModal = (token: TokenItem) => {
    setEditingToken(token);
    setEditName(token.patientName || '');
    setEditPhone(token.patientPhone || '');
    setEditAge(token.patientAge ? String(token.patientAge) : '35');
    setEditGender(token.patientGender || 'Male');
    
    const preNotes = token.preConsultationNotes;
    setEditSymptoms(preNotes?.symptoms || 'General Consultation');
    setEditDuration(preNotes?.duration || '2 days');
    setEditSeverity(preNotes?.severity || 'Mild');
    setEditPainScale(preNotes?.painScale || 3);
    setEditAllergies(preNotes?.allergies || '');

    const rawWeight = token.weight || preNotes?.weight || '';
    setEditWeight(rawWeight.replace(/[^\d.]/g, ''));

    const rawTemp = token.temperature || preNotes?.temperature || preNotes?.feverTemp || '';
    setEditTemp(rawTemp.replace(/[^\d.]/g, ''));

    const rawBp = token.bloodPressure || preNotes?.bloodPressure || preNotes?.bpReading || '';
    if (rawBp.includes('/')) {
      const parts = rawBp.split('/');
      setEditBpSys(parts[0].replace(/\D/g, ''));
      setEditBpDia(parts[1].replace(/\D/g, ''));
    } else {
      setEditBpSys(rawBp.replace(/\D/g, ''));
      setEditBpDia('');
    }

    setEditNotes(token.triageNotes || preNotes?.triageNotes || preNotes?.receptionNotes || '');
  };

  const handleSavePatientEdits = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingToken) return;

    setIsSavingEdit(true);
    try {
      const formattedWeight = editWeight.trim() ? `${editWeight.trim()} kg` : undefined;
      const formattedTemp = editTemp.trim() ? `${editTemp.trim()} Â°F` : undefined;
      const formattedBp =
        editBpSys.trim() && editBpDia.trim()
          ? `${editBpSys.trim()}/${editBpDia.trim()} mmHg`
          : editBpSys.trim()
          ? `${editBpSys.trim()} mmHg`
          : undefined;

      const updatedPreNotes = {
        ...(editingToken.preConsultationNotes || {}),
        symptoms: editSymptoms.trim(),
        duration: editDuration.trim() || undefined,
        severity: editSeverity,
        painScale: Number(editPainScale) || 0,
        allergies: editAllergies.trim() || undefined,
        temperature: formattedTemp,
        feverTemp: formattedTemp,
        bloodPressure: formattedBp,
        bpReading: formattedBp,
        weight: formattedWeight,
        triageNotes: editNotes.trim() || undefined,
        receptionNotes: editNotes.trim() || undefined,
        lastEditedBy: 'DOCTOR' as const,
        submittedAt: editingToken.preConsultationNotes?.submittedAt || new Date().toISOString(),
      };

      await updateDoc(doc(db, 'tokens', editingToken.id), {
        patientName: editName.trim(),
        patientPhone: editPhone.trim(),
        patientAge: Number(editAge) || undefined,
        patientGender: editGender,
        weight: formattedWeight,
        temperature: formattedTemp,
        bloodPressure: formattedBp,
        triageNotes: editNotes.trim() || undefined,
        preConsultationNotes: updatedPreNotes,
      });

      showToast(`Updated details & symptoms for #${editingToken.tokenNumber} (${editName})`);
      setEditingToken(null);
      if (selectedTokenForModal && selectedTokenForModal.id === editingToken.id) {
        setSelectedTokenForModal(null);
      }
    } catch (err) {
      console.error('Error saving patient edits:', err);
      showToast('Failed to save patient details. Please retry.');
    } finally {
      setIsSavingEdit(false);
    }
  };

  // Filter queues
  const activeToken = tokens.find(t => t.status === 'SERVING');
  const waitingTokens = tokens.filter(t => t.status === 'WAITING');
  const completedTokens = tokens.filter(t => t.status === 'COMPLETED');
  const holdTokens = tokens.filter(t => t.status === 'HOLD');

  const averageWaitMinutes = waitingTokens.length
    ? Number((waitingTokens.reduce((sum, token) => {
        const tokenCreatedAt = token.createdAt ? new Date(token.createdAt).getTime() : Date.now();
        const elapsedMinutes = Math.max(0, (Date.now() - tokenCreatedAt) / 60000);
        return sum + elapsedMinutes;
      }, 0) / waitingTokens.length).toFixed(1))
    : 0;

  const totalPatientsToday = tokens.length;
  const totalRevenue = tokens
    .filter(t => t.paymentStatus === 'PAID')
    .reduce((sum, t) => sum + (t.amountPaid || 0), 0);

  // Active consultation duration timer
  useEffect(() => {
    if (!activeToken || !activeToken.calledAt) {
      setElapsedSeconds(0);
      return;
    }
    const calledTime = new Date(activeToken.calledAt).getTime();
    const updateTimer = () => {
      const now = Date.now();
      const diff = Math.max(0, Math.floor((now - calledTime) / 1000));
      setElapsedSeconds(diff);
    };
    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [activeToken]);

  // Set prescription notes when active token changes
  useEffect(() => {
    if (activeToken) {
      setDoctorRxNotes(activeToken.doctorNotes || '');
    }
  }, [activeToken?.id]);

  // Toggle Doctor Status IN / OUT
  const handleToggleDoctorStatus = async () => {
    const newStatus: DoctorStatus = clinic.doctorStatus === 'IN' ? 'OUT' : 'IN';
    try {
      await updateDoc(doc(db, 'clinics', clinic.id), {
        doctorStatus: newStatus,
      });
      soundManager.playChime();
    } catch (err) {
      console.error('Error toggling doctor status:', err);
    }
  };

  // Complete consultation and advance queue
  const handleCompleteConsultation = async () => {
    if (!activeToken) return;
    setIsSavingNotes(true);
    try {
      const completedTime = new Date().toISOString();
      const durationSecs = elapsedSeconds > 0 ? elapsedSeconds : 480;

      // Update current token as completed
      await updateDoc(doc(db, 'tokens', activeToken.id), {
        status: 'COMPLETED',
        completedAt: completedTime,
        consultationDurationSeconds: durationSecs,
        doctorNotes: doctorRxNotes,
      });

      // Calculate rolling average
      const recentDurations = [
        ...completedTokens.slice(-4).map(t => (t.consultationDurationSeconds || 480) / 60),
        durationSecs / 60,
      ];
      const newRollingAvg = Number(
        (recentDurations.reduce((a, b) => a + b, 0) / recentDurations.length).toFixed(1)
      );

      // Find next waiting token
      const nextToken = waitingTokens.sort((a, b) => {
        // VIP first, then sequence
        const pA = a.priority ?? 10;
        const pB = b.priority ?? 10;
        if (pA !== pB) return pA - pB;
        return a.sequenceNumber - b.sequenceNumber;
      })[0];

      if (nextToken) {
        await updateDoc(doc(db, 'tokens', nextToken.id), {
          status: 'SERVING',
          calledAt: new Date().toISOString(),
        });

        await updateDoc(doc(db, 'clinics', clinic.id), {
          currentRunningToken: nextToken.tokenNumber,
          currentRunningTokenId: nextToken.id,
          avgConsultationMinutes: newRollingAvg,
        });

        // Trigger TV audio & WhatsApp
        soundManager.announceToken(nextToken.tokenNumber, nextToken.patientName, clinic.cabinNumber);
        await WhatsAppService.sendWhatsAppNotification(
          nextToken,
          'TOKEN_CALLED_NOW',
          clinic.name,
          clinic.doctorName,
          clinic.cabinNumber
        );

        // Notify the second patient that their turn is approaching
        const followingToken = waitingTokens.find(t => t.id !== nextToken.id);
        if (followingToken) {
          await WhatsAppService.sendWhatsAppNotification(
            followingToken,
            'QUEUE_APPROACHING',
            clinic.name,
            clinic.doctorName,
            clinic.cabinNumber,
            '1'
          );
        }
      } else {
        await updateDoc(doc(db, 'clinics', clinic.id), {
          currentRunningToken: 'None',
          currentRunningTokenId: '',
          avgConsultationMinutes: newRollingAvg,
        });
      }

      setDoctorRxNotes('');
    } catch (err) {
      console.error('Failed to complete consultation:', err);
    } finally {
      setIsSavingNotes(false);
    }
  };

  // Quick save prescription notes
  const handleSaveNotes = async () => {
    if (!activeToken) return;
    setIsSavingNotes(true);
    try {
      await updateDoc(doc(db, 'tokens', activeToken.id), {
        doctorNotes: doctorRxNotes,
      });
    } catch (err) {
      console.error('Error saving notes:', err);
    } finally {
      setIsSavingNotes(false);
    }
  };

  const formatTimer = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const remSecs = secs % 60;
    return `${mins.toString().padStart(2, '0')}:${remSecs.toString().padStart(2, '0')}`;
  };

  const nextToken = [...waitingTokens].sort((a, b) => {
    const pA = a.priority ?? 10;
    const pB = b.priority ?? 10;
    if (pA !== pB) return pA - pB;
    return (a.sequenceNumber || 0) - (b.sequenceNumber || 0);
  })[0];

  const handleCallNextToken = async () => {
    if (activeToken || !nextToken) return;
    await updateDoc(doc(db, 'tokens', nextToken.id), {
      status: 'SERVING',
      calledAt: new Date().toISOString(),
    });
    await updateDoc(doc(db, 'clinics', clinic.id), {
      currentRunningToken: nextToken.tokenNumber,
      currentRunningTokenId: nextToken.id,
    });
  };

  const handleStartConsultation = async () => {
    if (activeToken || !nextToken) return;
    await updateDoc(doc(db, 'tokens', nextToken.id), {
      status: 'SERVING',
      calledAt: new Date().toISOString(),
    });
    await updateDoc(doc(db, 'clinics', clinic.id), {
      currentRunningToken: nextToken.tokenNumber,
      currentRunningTokenId: nextToken.id,
    });
  };

  const handleHoldConsultation = async () => {
    if (!activeToken) return;
    await updateDoc(doc(db, 'tokens', activeToken.id), { status: 'HOLD', isHold: true });
    await updateDoc(doc(db, 'clinics', clinic.id), { currentRunningToken: 'None', currentRunningTokenId: '' });
  };

  const handleAddDelay = async () => {
    const delaySteps = [0, 5, 10, 15, 30];
    const currentDelay = clinic.delayMinutes || 0;
    const index = delaySteps.indexOf(currentDelay);
    const nextDelay = index >= 0
      ? delaySteps[index + 1] ?? currentDelay
      : delaySteps.find((step) => step > currentDelay) ?? currentDelay;
    await updateDoc(doc(db, 'clinics', clinic.id), { delayMinutes: nextDelay });
  };

  const handleToggleBreak = async () => {
    await updateDoc(doc(db, 'clinics', clinic.id), {
      doctorStatus: clinic.doctorStatus === 'OUT' ? 'IN' : 'OUT',
    });
  };
  if (isBasicPlan) {
    return (
      <div className="space-y-6 max-w-5xl mx-auto pb-12">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <div className="text-xs uppercase tracking-[0.2em] text-violet-300 font-bold">Basic plan</div>
              <h1 className="text-2xl font-black text-white mt-2">Doctor live tracking</h1>
            </div>
            <div className="rounded-full border border-violet-500/30 bg-violet-500/10 px-3 py-1 text-xs font-semibold text-violet-300">
              Active queue only
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
            <div className="text-xs uppercase tracking-wider text-teal-300 font-bold">Currently running</div>
            <div className="mt-4 text-4xl font-black text-white">{activeToken ? activeToken.tokenNumber : 'None'}</div>
            <div className="mt-2 text-sm text-slate-300">{activeToken ? activeToken.patientName : 'No patient in consultation'}</div>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
            <div className="text-xs uppercase tracking-wider text-sky-300 font-bold">In queue</div>
            <div className="mt-4 space-y-2">
              {waitingTokens.length > 0 ? waitingTokens.slice(0, 5).map(token => (
                <div key={token.id} className="flex items-center justify-between rounded-xl bg-slate-950 px-3 py-2 border border-slate-800">
                  <div>
                    <div className="font-semibold text-white">{token.patientName}</div>
                    <div className="text-xs text-slate-400">{token.patientPhone}</div>
                  </div>
                  <div className="text-sm font-bold text-teal-300">{token.tokenNumber}</div>
                </div>
              )) : (
                <div className="text-sm text-slate-400 py-2">No patients waiting.</div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      
      {/* Top Banner / Doctor Profile Header */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-6 shadow-xl relative overflow-hidden">
        <div className="absolute -right-10 -bottom-10 w-64 h-64 bg-teal-500/10 rounded-full blur-3xl pointer-events-none" />
        
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 relative z-10">
          <div className="flex items-start sm:items-center space-x-4">
            <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-gradient-to-tr from-teal-500 to-emerald-400 p-0.5 shadow-lg shadow-teal-500/20 flex-shrink-0">
              <div className="w-full h-full bg-slate-950 rounded-[14px] flex items-center justify-center">
                <Stethoscope className="w-8 h-8 text-teal-400" />
              </div>
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white">
                  {clinic.doctorName}
                </h1>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-teal-500/15 text-teal-300 border border-teal-500/30">
                  Super Admin
                </span>
              </div>
              <p className="text-sm text-slate-400 mt-0.5">{clinic.specialty}</p>
              <p className="text-xs text-slate-500 font-mono mt-1">{clinic.cabinNumber}</p>
            </div>
          </div>

          {/* Doctor Status Toggle Switch */}
          <div className="flex flex-wrap items-center gap-3 bg-slate-950/80 p-2 sm:p-3 rounded-xl border border-slate-800 self-start lg:self-auto">
            <div className="text-left sm:text-right pr-2">
              <div className="text-xs font-medium text-slate-400">Doctor Presence Status</div>
              <div className={`text-sm font-bold flex items-center gap-1.5 ${clinic.doctorStatus === 'IN' ? 'text-emerald-400' : 'text-rose-400'}`}>
                <span className={`w-2 h-2 rounded-full ${clinic.doctorStatus === 'IN' ? 'bg-emerald-400 animate-ping' : 'bg-rose-400'}`} />
                {clinic.doctorStatus === 'IN' ? 'AVAILABLE IN CABIN' : 'DOCTOR STEPPED OUT'}
              </div>
            </div>

            <button
              onClick={handleToggleDoctorStatus}
              className={`relative inline-flex h-10 w-20 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2 focus:ring-offset-slate-900 ${
                clinic.doctorStatus === 'IN' ? 'bg-emerald-600' : 'bg-rose-900/60'
              }`}
            >
              <span className="sr-only">Toggle doctor status</span>
              <span
                className={`inline-block h-8 w-8 transform rounded-full bg-white shadow-lg transition duration-200 ease-in-out flex items-center justify-center ${
                  clinic.doctorStatus === 'IN' ? 'translate-x-11 text-emerald-600' : 'translate-x-1 text-rose-500'
                }`}
              >
                <Power className="w-4 h-4" />
              </span>
            </button>
          </div>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4">
        
        {/* Metric 1: Total Patients Today */}
        <div className="bg-slate-900/90 border border-slate-800/90 rounded-2xl p-4 sm:p-5 shadow-lg">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total Patients</span>
            <div className="p-2 rounded-xl bg-blue-500/10 text-blue-400">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-2xl sm:text-3xl font-black text-white">{totalPatientsToday}</span>
            <span className="text-xs text-slate-400">
              <span className="text-emerald-400 font-bold">{completedTokens.length}</span> done
            </span>
          </div>
          <div className="mt-2 text-xs text-slate-500 flex items-center gap-1">
            <span>{waitingTokens.length} in queue</span>
            <span>â€¢</span>
            <span>{holdTokens.length} on hold</span>
          </div>
        </div>

        {/* Metric 2: Current Running Token */}
        <div className="bg-gradient-to-br from-teal-950/40 to-slate-900 border border-teal-500/30 rounded-2xl p-4 sm:p-5 shadow-lg relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-teal-300 uppercase tracking-wider">Active Token</span>
            <div className="p-2 rounded-xl bg-teal-500/20 text-teal-300">
              <Activity className="w-4 h-4 animate-pulse" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-2xl sm:text-3xl font-black text-teal-300">
              {activeToken ? activeToken.tokenNumber : 'None'}
            </span>
            {activeToken && (
              <span className="text-xs font-mono px-2 py-0.5 rounded-md bg-teal-500/20 text-teal-200 border border-teal-500/30">
                {formatTimer(elapsedSeconds)}
              </span>
            )}
          </div>
          <div className="mt-2 text-xs text-slate-400 truncate">
            {activeToken ? activeToken.patientName : 'No patient in cabin right now'}
          </div>
        </div>

        {/* Metric 3: Average Wait Time */}
        <div className="bg-slate-900/90 border border-slate-800/90 rounded-2xl p-4 sm:p-5 shadow-lg">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Avg Wait</span>
            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-2xl sm:text-3xl font-black text-white">{averageWaitMinutes}</span>
            <span className="text-xs text-slate-400">mins</span>
          </div>
          <div className="mt-2 text-xs text-slate-500">Queue pacing</div>
        </div>

        {/* Metric 4: Today's Revenue */}
        <div className="bg-slate-900/90 border border-slate-800/90 rounded-2xl p-4 sm:p-5 shadow-lg">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Clinic Revenue</span>
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400">
              <IndianRupee className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-2xl sm:text-3xl font-black text-emerald-400">
              â‚¹{totalRevenue.toLocaleString()}
            </span>
            <span className="text-xs text-emerald-500/80 font-medium">100% Pre-paid</span>
          </div>
          <div className="mt-2 text-xs text-slate-500">
            Avg Fee: â‚¹{clinic.consultationFee} / patient
          </div>
        </div>

        {/* Metric 5: Rolling Consultation Speed */}
        <div className="bg-slate-900/90 border border-slate-800/90 rounded-2xl p-4 sm:p-5 shadow-lg">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Avg Consultation</span>
            <div className="p-2 rounded-xl bg-purple-500/10 text-purple-400">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-2xl sm:text-3xl font-black text-white">
              {clinic.avgConsultationMinutes || 8.5}
              <span className="text-sm font-normal text-slate-400 ml-1">mins</span>
            </span>
            <span className="text-xs text-purple-400 font-medium">5-patient avg</span>
          </div>
          <div className="mt-2 text-xs text-slate-500">
            Pacing: Optimum tempo
          </div>
        </div>
      </div>

      {/* Main Consultation Desk Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left 7 Columns: Active Patient In Cabin & Clinical Prescription Notes */}
        <div className="lg:col-span-7 space-y-6">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 sm:p-6 shadow-xl">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800">
              <div className="flex items-center space-x-2">
                <span className="w-3 h-3 rounded-full bg-teal-400 animate-ping" />
                <h2 className="text-lg font-bold text-white">Active Consultation In Cabin</h2>
              </div>
              {activeToken && (
                <div className="flex items-center space-x-2 bg-slate-800 px-3 py-1 rounded-full text-xs font-mono text-teal-300 border border-slate-700">
                  <Clock className="w-3.5 h-3.5" />
                  <span>Time Elapsed: {formatTimer(elapsedSeconds)}</span>
                </div>
              )}
            </div>

            {activeToken ? (
              <div className="mt-5 space-y-5">
                {/* Patient Summary Header */}
                <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <div className="flex items-center space-x-2">
                      <span className="text-xl font-bold text-white">{activeToken.patientName}</span>
                      {activeToken.isVip && (
                        <span className="px-2 py-0.5 rounded text-xs font-bold bg-rose-500/20 text-rose-300 border border-rose-500/40">
                          VIP / Emergency
                        </span>
                      )}
                      <span className="px-2 py-0.5 rounded text-xs font-medium bg-slate-800 text-slate-300 border border-slate-700">
                        {activeToken.tokenType}
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 mt-1 flex items-center gap-3">
                      <span>Phone: {activeToken.patientPhone}</span>
                      {activeToken.patientAge && <span>Age: {activeToken.patientAge}y</span>}
                      {activeToken.patientGender && <span>Gender: {activeToken.patientGender}</span>}
                    </p>
                  </div>

                  <div className="flex sm:flex-col items-center sm:items-end justify-between gap-2">
                    <div className="text-right">
                      <span className="text-xs text-slate-500 block">Token ID</span>
                      <span className="text-2xl font-black text-teal-400 tracking-wider">
                        {activeToken.tokenNumber}
                      </span>
                    </div>
                    <button
                      onClick={() => openEditModal(activeToken)}
                      className="px-2.5 py-1.5 rounded-lg bg-teal-500/15 hover:bg-teal-500/25 text-teal-300 border border-teal-500/30 text-xs font-semibold flex items-center gap-1.5 transition-colors"
                      title="Edit patient name, phone, symptoms, and vitals"
                    >
                      <Edit3 className="w-3.5 h-3.5 text-teal-400" />
                      <span>Edit Patient</span>
                    </button>
                  </div>
                </div>

                {/* Pre-Consultation Summary of Active Patient */}
                <div className="bg-teal-950/20 border border-teal-500/30 rounded-xl p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold uppercase tracking-wider text-teal-300 flex items-center gap-1.5">
                      <Activity className="w-3.5 h-3.5" />
                      Symptoms & Clinical Intake
                    </span>
                    <div className="flex items-center gap-2">
                      {activeToken.preConsultationNotes?.severity && (
                        <span className={`text-xs px-2 py-0.5 rounded font-bold ${
                          activeToken.preConsultationNotes.severity === 'Critical' || activeToken.preConsultationNotes.severity === 'Severe'
                            ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                            : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                        }`}>
                          {activeToken.preConsultationNotes.severity} Severity
                        </span>
                      )}
                      <button
                        onClick={() => openEditModal(activeToken)}
                        className="text-xs text-teal-400 hover:text-teal-300 flex items-center gap-1 bg-slate-900/80 px-2 py-0.5 rounded border border-teal-500/30 font-medium"
                      >
                        <Edit3 className="w-3 h-3" />
                        <span>Edit Symptoms</span>
                      </button>
                    </div>
                  </div>

                  <p className="text-sm text-slate-200 leading-relaxed font-medium">
                    "{activeToken.preConsultationNotes?.symptoms || 'General Consultation / Checkup'}"
                  </p>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-3 pt-3 border-t border-teal-500/20 text-xs">
                    <div>
                      <span className="text-slate-400 block">Duration:</span>
                      <span className="text-slate-200 font-semibold">{activeToken.preConsultationNotes?.duration || '1-2 days'}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block">Pain Scale:</span>
                      <span className="text-slate-200 font-semibold">{activeToken.preConsultationNotes?.painScale ? `${activeToken.preConsultationNotes.painScale}/10` : 'None'}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block">Allergies:</span>
                      <span className="text-rose-300 font-semibold">{activeToken.preConsultationNotes?.allergies || 'No known'}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block">Vitals (BP/Temp/Wt):</span>
                      <span className="text-slate-200 font-semibold">
                        {[
                          activeToken.bloodPressure || activeToken.preConsultationNotes?.bloodPressure || activeToken.preConsultationNotes?.bpReading,
                          activeToken.temperature || activeToken.preConsultationNotes?.temperature || activeToken.preConsultationNotes?.feverTemp,
                          activeToken.weight || activeToken.preConsultationNotes?.weight
                        ].filter(Boolean).join(' â€¢ ') || 'Normal'}
                      </span>
                    </div>
                  </div>

                  {(activeToken.triageNotes || activeToken.preConsultationNotes?.triageNotes || activeToken.preConsultationNotes?.receptionNotes) && (
                    <div className="mt-2.5 pt-2 border-t border-teal-500/20 text-xs text-slate-300 flex items-start gap-1.5">
                      <span className="text-teal-400 font-semibold">Reception Note:</span>
                      <span className="italic">{activeToken.triageNotes || activeToken.preConsultationNotes?.triageNotes || activeToken.preConsultationNotes?.receptionNotes}</span>
                    </div>
                  )}

                  {activeToken.preConsultationNotes?.attachments && activeToken.preConsultationNotes.attachments.length > 0 && (
                    <div className="mt-3 flex items-center gap-2 pt-2 border-t border-teal-500/20">
                      <span className="text-xs text-slate-400 flex items-center gap-1">
                        <Paperclip className="w-3.5 h-3.5 text-teal-400" />
                        Attached Lab/Files:
                      </span>
                      {activeToken.preConsultationNotes.attachments.map((att, i) => (
                        <button
                          key={i}
                          onClick={() => setSelectedTokenForModal(activeToken)}
                          className="text-xs bg-slate-900 hover:bg-slate-800 text-teal-300 px-2 py-1 rounded border border-teal-500/30 flex items-center gap-1"
                        >
                          <FileText className="w-3 h-3" />
                          <span>{att.name}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Doctor Prescription & Clinical Notes Box */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                      <FileText className="w-3.5 h-3.5 text-teal-400" />
                      Doctor's Clinical Notes / Rx Advice
                    </label>
                    <button
                      onClick={handleSaveNotes}
                      disabled={isSavingNotes}
                      className="text-xs text-teal-400 hover:text-teal-300 flex items-center gap-1 font-medium"
                    >
                      <Check className="w-3 h-3" />
                      <span>{isSavingNotes ? 'Saving...' : 'Save Draft'}</span>
                    </button>
                  </div>
                  <textarea
                    rows={4}
                    value={doctorRxNotes}
                    onChange={(e) => setDoctorRxNotes(e.target.value)}
                    placeholder="Enter diagnosis, prescribed medicines, lab test orders, or follow-up dates..."
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-500 font-mono resize-none placeholder-slate-600"
                  />
                </div>

                {/* Action Buttons */}
                <div className="flex flex-col sm:flex-row gap-3 pt-2">
                  <button
                    onClick={handleCompleteConsultation}
                    disabled={isSavingNotes}
                    className="flex-1 bg-gradient-to-r from-teal-500 to-emerald-500 hover:from-teal-400 hover:to-emerald-400 text-slate-950 font-bold py-3.5 px-4 rounded-xl shadow-lg shadow-teal-500/20 transition-all flex items-center justify-center space-x-2 text-sm"
                  >
                    <CheckCircle2 className="w-5 h-5" />
                    <span>Complete Consultation & Call Next Token</span>
                  </button>

                  <button
                    onClick={() => soundManager.announceToken(activeToken.tokenNumber, activeToken.patientName, clinic.cabinNumber)}
                    className="px-4 py-3.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl border border-slate-700 text-xs font-semibold flex items-center justify-center space-x-1.5"
                    title="Re-announce token on waiting room speakers"
                  >
                    <Volume2 className="w-4 h-4 text-teal-400" />
                    <span>Re-Announce</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="text-center py-16 px-4">
                <div className="w-16 h-16 rounded-full bg-slate-800/80 border border-slate-700 flex items-center justify-center mx-auto text-slate-500 mb-4">
                  <Stethoscope className="w-8 h-8" />
                </div>
                <h3 className="text-lg font-bold text-slate-200">No Patient Currently In Cabin</h3>
                <p className="text-sm text-slate-400 max-w-md mx-auto mt-1">
                  {waitingTokens.length > 0
                    ? `${waitingTokens.length} patient(s) waiting in queue. Click below to call the next patient into Cabin 2.`
                    : 'The queue is currently empty. Patients will appear as they book online or check in at the reception desk.'}
                </p>

                {waitingTokens.length > 0 && (
                  <button
                    onClick={handleCompleteConsultation}
                    className="mt-6 bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold py-3 px-6 rounded-xl shadow-lg transition-all inline-flex items-center space-x-2 text-sm"
                  >
                    <Activity className="w-4 h-4" />
                    <span>Call Next Patient ({waitingTokens[0]?.tokenNumber})</span>
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Upcoming Queue Preview */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 sm:p-6 shadow-xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="text-sm font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
                <Users className="w-4 h-4 text-teal-400" />
                Next Up In Queue ({waitingTokens.length} waiting)
              </h3>
            </div>

            <div className="mt-4 divide-y divide-slate-800/80">
              {waitingTokens.length > 0 ? (
                waitingTokens.slice(0, 5).map((tok, idx) => (
                  <div key={tok.id} className="py-3 flex items-center justify-between group hover:bg-slate-800/30 px-2 rounded-lg transition-colors">
                    <div className="flex items-center space-x-3">
                      <span className="w-6 text-xs font-mono font-bold text-slate-500">#{idx + 1}</span>
                      <span className="font-bold text-sm text-teal-300 font-mono bg-teal-950/40 px-2 py-0.5 rounded border border-teal-500/20">
                        {tok.tokenNumber}
                      </span>
                      <div>
                        <div className="text-sm font-semibold text-slate-200">{tok.patientName}</div>
                        <div className="text-xs text-slate-500">
                          {tok.tokenType} â€¢ {tok.patientAge ? `${tok.patientAge}y` : 'Adult'}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center space-x-2">
                      {tok.isVip && (
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-rose-500/20 text-rose-300 border border-rose-500/30">
                          VIP
                        </span>
                      )}
                      {tok.preConsultationNotes && (
                        <button
                          onClick={() => setSelectedTokenForModal(tok)}
                          className="text-xs text-teal-400 hover:text-teal-300 flex items-center gap-1 bg-slate-800 px-2 py-1 rounded"
                        >
                          <FileText className="w-3 h-3" />
                          <span>Notes</span>
                        </button>
                      )}
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-6 text-slate-500 text-xs">
                  No upcoming patients waiting in queue.
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right 5 Columns: Feed of Pre-Consultation Notes (Symptoms submitted by patients) */}
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 sm:p-6 shadow-xl flex flex-col h-full">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800">
              <div className="flex items-center space-x-2">
                <Flame className="w-4 h-4 text-amber-400" />
                <h3 className="text-base font-bold text-white">Pre-Consultation Intake Feed</h3>
              </div>
              <span className="text-xs font-semibold px-2 py-0.5 rounded bg-amber-500/10 text-amber-300 border border-amber-500/20">
                Live Patient Uploads
              </span>
            </div>

            <p className="text-xs text-slate-400 mt-2">
              Patients submit symptoms and attach lab reports from their phones while waiting.
            </p>

            <div className="mt-4 space-y-3.5 flex-1 overflow-y-auto max-h-[620px] pr-1">
              {tokens.filter(t => t.preConsultationNotes).length > 0 ? (
                tokens
                  .filter(t => t.preConsultationNotes)
                  .map((tokenItem) => {
                    const notes = tokenItem.preConsultationNotes!;
                    const isCurrent = tokenItem.id === activeToken?.id;

                    return (
                      <div
                        key={tokenItem.id}
                        onClick={() => setSelectedTokenForModal(tokenItem)}
                        className={`p-4 rounded-xl border cursor-pointer transition-all ${
                          isCurrent
                            ? 'bg-teal-950/30 border-teal-500/50 shadow-md shadow-teal-500/10 ring-1 ring-teal-500/30'
                            : 'bg-slate-950/80 border-slate-800 hover:border-slate-700 hover:bg-slate-800/40'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-2">
                            <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-slate-800 text-teal-300 border border-slate-700">
                              {tokenItem.tokenNumber}
                            </span>
                            <span className="text-sm font-bold text-slate-200">
                              {tokenItem.patientName}
                            </span>
                          </div>

                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase ${
                            tokenItem.status === 'SERVING'
                              ? 'bg-teal-500 text-slate-950'
                              : tokenItem.status === 'COMPLETED'
                              ? 'bg-slate-800 text-slate-400'
                              : 'bg-blue-500/20 text-blue-300'
                          }`}>
                            {tokenItem.status}
                          </span>
                        </div>

                        <p className="text-xs text-slate-300 mt-2 line-clamp-2 italic">
                          "{notes.symptoms}"
                        </p>

                        <div className="flex flex-wrap items-center gap-2 mt-3 text-[11px]">
                          {notes.severity && (
                            <span className={`px-1.5 py-0.5 rounded font-semibold ${
                              notes.severity === 'Critical' || notes.severity === 'Severe'
                                ? 'bg-rose-500/20 text-rose-300'
                                : 'bg-amber-500/20 text-amber-300'
                            }`}>
                              {notes.severity}
                            </span>
                          )}

                          {notes.duration && (
                            <span className="text-slate-400 bg-slate-900 px-1.5 py-0.5 rounded border border-slate-800">
                              â±ï¸ {notes.duration}
                            </span>
                          )}

                          {notes.painScale && (
                            <span className="text-slate-400 bg-slate-900 px-1.5 py-0.5 rounded border border-slate-800">
                              Pain: {notes.painScale}/10
                            </span>
                          )}

                          {notes.attachments && notes.attachments.length > 0 && (
                            <span className="text-teal-300 font-semibold flex items-center gap-1 bg-teal-950/40 px-1.5 py-0.5 rounded border border-teal-500/30">
                              <Paperclip className="w-3 h-3" />
                              {notes.attachments.length} file(s)
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })
              ) : (
                <div className="text-center py-12 text-slate-500 text-xs">
                  No pre-consultation notes submitted yet today.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Pre-Consultation Details Modal */}
      {selectedTokenForModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <span className="text-xs font-mono font-bold text-teal-400">
                  TOKEN #{selectedTokenForModal.tokenNumber}
                </span>
                <h3 className="text-lg font-bold text-white">
                  {selectedTokenForModal.patientName} - Intake Notes
                </h3>
              </div>
              <button
                onClick={() => setSelectedTokenForModal(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-white bg-slate-800 text-xs"
              >
                âœ•
              </button>
            </div>

            {selectedTokenForModal.preConsultationNotes ? (
              <div className="space-y-4 text-sm">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">
                      Chief Complaint / Symptoms
                    </span>
                    <button
                      onClick={() => openEditModal(selectedTokenForModal)}
                      className="text-xs text-teal-400 hover:text-teal-300 font-semibold flex items-center gap-1"
                    >
                      <Edit3 className="w-3 h-3" />
                      <span>Edit Intake Info</span>
                    </button>
                  </div>
                  <p className="text-slate-200 mt-1 bg-slate-950 p-3 rounded-xl border border-slate-800">
                    {selectedTokenForModal.preConsultationNotes.symptoms}
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div className="bg-slate-950 p-2.5 rounded-lg border border-slate-800">
                    <span className="text-slate-400 block">Symptom Duration:</span>
                    <span className="text-white font-bold">{selectedTokenForModal.preConsultationNotes.duration || 'N/A'}</span>
                  </div>
                  <div className="bg-slate-950 p-2.5 rounded-lg border border-slate-800">
                    <span className="text-slate-400 block">Pain Severity Scale:</span>
                    <span className="text-white font-bold">{selectedTokenForModal.preConsultationNotes.painScale ? `${selectedTokenForModal.preConsultationNotes.painScale}/10` : 'None'}</span>
                  </div>
                  <div className="bg-slate-950 p-2.5 rounded-lg border border-slate-800">
                    <span className="text-slate-400 block">Known Allergies:</span>
                    <span className="text-rose-300 font-bold">{selectedTokenForModal.preConsultationNotes.allergies || 'No known allergies'}</span>
                  </div>
                  <div className="bg-slate-950 p-2.5 rounded-lg border border-slate-800">
                    <span className="text-slate-400 block">Vitals (BP / Temp / Wt):</span>
                    <span className="text-white font-bold">
                      {[
                        selectedTokenForModal.bloodPressure || selectedTokenForModal.preConsultationNotes.bloodPressure || selectedTokenForModal.preConsultationNotes.bpReading,
                        selectedTokenForModal.temperature || selectedTokenForModal.preConsultationNotes.temperature || selectedTokenForModal.preConsultationNotes.feverTemp,
                        selectedTokenForModal.weight || selectedTokenForModal.preConsultationNotes.weight
                      ].filter(Boolean).join(' â€¢ ') || 'Normal'}
                    </span>
                  </div>
                </div>

                {selectedTokenForModal.preConsultationNotes.attachments && (
                  <div>
                    <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-1.5">
                      Attached Lab Documents / Photos
                    </span>
                    <div className="space-y-1.5">
                      {selectedTokenForModal.preConsultationNotes.attachments.map((att, i) => (
                        <div key={i} className="flex items-center justify-between p-2.5 bg-slate-950 rounded-lg border border-slate-800 text-xs">
                          <span className="flex items-center gap-2 text-slate-200">
                            <FileText className="w-4 h-4 text-teal-400" />
                            {att.name}
                          </span>
                          <span className="text-[10px] text-teal-400 font-mono bg-teal-950/60 px-2 py-0.5 rounded">
                            Verified Upload
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-sm text-slate-400">No pre-consultation notes recorded.</p>
            )}

            <div className="pt-2 flex justify-between items-center">
              <button
                onClick={() => openEditModal(selectedTokenForModal)}
                className="px-4 py-2 bg-teal-500 hover:bg-teal-400 text-slate-950 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow"
              >
                <Edit3 className="w-3.5 h-3.5" />
                <span>Edit Patient & Symptoms</span>
              </button>

              <button
                onClick={() => setSelectedTokenForModal(null)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-semibold"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Doctor Full Patient & Symptoms Editor Modal */}
      {editingToken && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-xl w-full p-6 sm:p-7 shadow-2xl space-y-5 my-8">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center space-x-2">
                <div className="p-2 rounded-xl bg-teal-500/10 text-teal-400">
                  <Edit3 className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-xs font-mono font-bold text-teal-400">
                    TOKEN #{editingToken.tokenNumber}
                  </span>
                  <h3 className="text-lg font-bold text-white">
                    Edit Patient Details & Symptoms
                  </h3>
                </div>
              </div>

              <button
                onClick={() => setEditingToken(null)}
                className="p-1.5 rounded-xl bg-slate-800 text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSavePatientEdits} className="space-y-4">
              
              {/* Patient Demographics */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider block mb-1">
                    Patient Name <span className="text-rose-400">*</span>
                  </label>
                  <input
                    required
                    type="text"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white focus:ring-2 focus:ring-teal-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider block mb-1">
                    Phone Number <span className="text-rose-400">*</span>
                  </label>
                  <input
                    required
                    type="tel"
                    value={editPhone}
                    onChange={(e) => setEditPhone(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white focus:ring-2 focus:ring-teal-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider block mb-1">
                    Age
                  </label>
                  <input
                    type="number"
                    value={editAge}
                    onChange={(e) => setEditAge(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white focus:ring-2 focus:ring-teal-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider block mb-1">
                    Gender
                  </label>
                  <select
                    value={editGender}
                    onChange={(e) => setEditGender(e.target.value as any)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white focus:ring-2 focus:ring-teal-500 focus:outline-none"
                  >
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
              </div>

              {/* Symptoms / Chief Complaint */}
              <div>
                <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider block mb-1">
                  Chief Complaint / Symptoms <span className="text-rose-400">*</span>
                </label>
                <textarea
                  required
                  rows={2}
                  value={editSymptoms}
                  onChange={(e) => setEditSymptoms(e.target.value)}
                  placeholder="e.g. Acute high fever with throat irritation and fatigue"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white focus:ring-2 focus:ring-teal-500 focus:outline-none resize-none"
                />
              </div>

              {/* Duration & Severity & Pain Scale */}
              <div className="grid grid-cols-3 gap-2.5">
                <div>
                  <label className="text-[11px] text-slate-400 font-medium block mb-1">
                    Duration
                  </label>
                  <input
                    type="text"
                    value={editDuration}
                    onChange={(e) => setEditDuration(e.target.value)}
                    placeholder="e.g. 3 days"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2 text-xs text-white focus:ring-2 focus:ring-teal-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="text-[11px] text-slate-400 font-medium block mb-1">
                    Severity
                  </label>
                  <select
                    value={editSeverity}
                    onChange={(e) => setEditSeverity(e.target.value as any)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2 text-xs text-white focus:ring-2 focus:ring-teal-500 focus:outline-none"
                  >
                    <option value="Mild">Mild</option>
                    <option value="Moderate">Moderate</option>
                    <option value="Severe">Severe</option>
                    <option value="Critical">Critical</option>
                  </select>
                </div>

                <div>
                  <label className="text-[11px] text-slate-400 font-medium block mb-1 flex items-center justify-between">
                    <span>Pain Scale</span>
                    <span className="text-teal-300 font-bold">{editPainScale}/10</span>
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="10"
                    value={editPainScale}
                    onChange={(e) => setEditPainScale(Number(e.target.value))}
                    className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-teal-400 mt-2"
                  />
                </div>
              </div>

              {/* Vitals with predefined units */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {/* Weight with predefined kg */}
                <div>
                  <label className="text-[11px] text-slate-400 font-medium block mb-1 flex items-center gap-1">
                    <Scale className="w-3 h-3 text-teal-400" />
                    Weight
                  </label>
                  <div className="relative flex items-center">
                    <input
                      type="number"
                      step="0.1"
                      placeholder="68"
                      value={editWeight}
                      onChange={(e) => setEditWeight(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2 pl-3 pr-10 text-xs text-white placeholder-slate-600 focus:ring-2 focus:ring-teal-500 focus:outline-none font-mono"
                    />
                    <span className="absolute right-3 text-xs font-bold text-teal-400 select-none pointer-events-none">
                      kg
                    </span>
                  </div>
                </div>

                {/* Temperature with predefined Â°F */}
                <div>
                  <label className="text-[11px] text-slate-400 font-medium block mb-1 flex items-center gap-1">
                    <Thermometer className="w-3 h-3 text-amber-400" />
                    Temperature
                  </label>
                  <div className="relative flex items-center">
                    <input
                      type="number"
                      step="0.1"
                      placeholder="98.6"
                      value={editTemp}
                      onChange={(e) => setEditTemp(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2 pl-3 pr-10 text-xs text-white placeholder-slate-600 focus:ring-2 focus:ring-teal-500 focus:outline-none font-mono"
                    />
                    <span className="absolute right-3 text-xs font-bold text-amber-400 select-none pointer-events-none">
                      Â°F
                    </span>
                  </div>
                </div>

                {/* Blood Pressure with 2 columns and / in between */}
                <div>
                  <label className="text-[11px] text-slate-400 font-medium block mb-1 flex items-center justify-between">
                    <span className="flex items-center gap-1">
                      <Activity className="w-3 h-3 text-rose-400" />
                      Blood Pressure
                    </span>
                    <span className="text-[10px] text-slate-500 font-mono">mmHg</span>
                  </label>
                  <div className="flex items-center gap-1.5">
                    <div className="flex-1">
                      <input
                        type="number"
                        placeholder="120"
                        value={editBpSys}
                        onChange={(e) => setEditBpSys(e.target.value)}
                        title="Systolic (SYS)"
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2 text-xs text-white text-center placeholder-slate-600 focus:ring-2 focus:ring-teal-500 focus:outline-none font-mono"
                      />
                    </div>
                    <span className="text-slate-500 font-black text-sm select-none">/</span>
                    <div className="flex-1">
                      <input
                        type="number"
                        placeholder="80"
                        value={editBpDia}
                        onChange={(e) => setEditBpDia(e.target.value)}
                        title="Diastolic (DIA)"
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2 text-xs text-white text-center placeholder-slate-600 focus:ring-2 focus:ring-teal-500 focus:outline-none font-mono"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Allergies */}
              <div>
                <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider block mb-1">
                  Known Allergies (Penicillin, Sulfa, Dust, etc.)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Penicillin, Peanuts, Pollen"
                  value={editAllergies}
                  onChange={(e) => setEditAllergies(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white focus:ring-2 focus:ring-teal-500 focus:outline-none"
                />
              </div>

              <div className="flex space-x-3 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingToken(null)}
                  className="flex-1 py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSavingEdit}
                  className="flex-1 py-3 bg-teal-500 hover:bg-teal-400 text-slate-950 rounded-xl text-xs font-black shadow-lg shadow-teal-500/20 flex items-center justify-center gap-1.5"
                >
                  <Save className="w-4 h-4" />
                  <span>{isSavingEdit ? 'Updating...' : 'Save Patient Intake'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Toast alert */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-teal-500 text-slate-950 font-bold px-4 py-3 rounded-2xl shadow-2xl flex items-center space-x-2 text-xs animate-bounce">
          <CheckCircle2 className="w-4 h-4" />
          <span>{toastMessage}</span>
        </div>
      )}
    </div>
  );
};
