import React, { useState } from 'react';
import {
  Users,
  UserPlus,
  Play,
  Pause,
  Clock,
  Sparkles,
  AlertTriangle,
  Search,
  CheckCircle2,
  Phone,
  MessageSquare,
  Printer,
  ChevronRight,
  ShieldAlert,
  Power,
  RotateCw,
  Eye,
  Filter,
  MoreVertical,
  Volume2,
  Calendar,
  Activity,
  Scale,
  Thermometer,
  FileText,
  X,
  Save
} from 'lucide-react';
import { Clinic, TokenItem, QueueSession, DoctorStatus } from '../types/queue';
import { db, doc, updateDoc } from '../lib/firebase';
import { soundManager } from '../lib/audio';
import { WhatsAppService } from '../lib/whatsappService';

interface ReceptionistViewProps {
  clinic: Clinic;
  session: QueueSession | null;
  tokens: TokenItem[];
  onOpenAddWalkIn: () => void;
  onOpenDelayBroadcast: () => void;
  onOpenWhatsAppLogs: () => void;
  onViewTokenDetails: (token: TokenItem) => void;
  onPrintTokenSlip: (token: TokenItem) => void;
}

export const ReceptionistView: React.FC<ReceptionistViewProps> = ({
  clinic,
  session,
  tokens,
  onOpenAddWalkIn,
  onOpenDelayBroadcast,
  onOpenWhatsAppLogs,
  onViewTokenDetails,
  onPrintTokenSlip,
}) => {
  const isBasicPlan = clinic.featurePlan === 'BASIC';
  const [filterTab, setFilterTab] = useState<'ALL' | 'WAITING' | 'SERVING' | 'HOLD' | 'COMPLETED'>('WAITING');
  const [searchQuery, setSearchQuery] = useState('');
  const [isAdvancing, setIsAdvancing] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Vitals & Triage Note editing state
  const [vitalsToken, setVitalsToken] = useState<TokenItem | null>(null);
  const [vitalsWeight, setVitalsWeight] = useState('');
  const [vitalsTemp, setVitalsTemp] = useState('');
  const [vitalsBpSys, setVitalsBpSys] = useState('');
  const [vitalsBpDia, setVitalsBpDia] = useState('');
  const [vitalsNotes, setVitalsNotes] = useState('');
  const [isSavingVitals, setIsSavingVitals] = useState(false);

  const openVitalsModal = (token: TokenItem) => {
    setVitalsToken(token);
    
    // Parse weight clean number
    const rawWeight = token.weight || token.preConsultationNotes?.weight || '';
    setVitalsWeight(rawWeight.replace(/[^\d.]/g, ''));

    // Parse temp clean number
    const rawTemp = token.temperature || token.preConsultationNotes?.temperature || token.preConsultationNotes?.feverTemp || '';
    setVitalsTemp(rawTemp.replace(/[^\d.]/g, ''));

    // Parse BP into Systolic and Diastolic
    const rawBp = token.bloodPressure || token.preConsultationNotes?.bloodPressure || token.preConsultationNotes?.bpReading || '';
    if (rawBp.includes('/')) {
      const parts = rawBp.split('/');
      setVitalsBpSys(parts[0].replace(/\D/g, ''));
      setVitalsBpDia(parts[1].replace(/\D/g, ''));
    } else {
      setVitalsBpSys(rawBp.replace(/\D/g, ''));
      setVitalsBpDia('');
    }

    setVitalsNotes(token.triageNotes || token.preConsultationNotes?.triageNotes || token.preConsultationNotes?.receptionNotes || '');
  };

  const handleSaveVitals = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!vitalsToken) return;

    setIsSavingVitals(true);
    try {
      const existingNotes = vitalsToken.preConsultationNotes || {
        symptoms: 'Walk-in consultation',
        duration: '1 day',
        severity: 'Mild',
        submittedAt: new Date().toISOString(),
      };

      const formattedWeight = vitalsWeight.trim() ? `${vitalsWeight.trim()} kg` : undefined;
      const formattedTemp = vitalsTemp.trim() ? `${vitalsTemp.trim()} °F` : undefined;
      const formattedBp =
        vitalsBpSys.trim() && vitalsBpDia.trim()
          ? `${vitalsBpSys.trim()}/${vitalsBpDia.trim()} mmHg`
          : vitalsBpSys.trim()
          ? `${vitalsBpSys.trim()} mmHg`
          : undefined;

      const updatedPreNotes = {
        ...existingNotes,
        weight: formattedWeight,
        temperature: formattedTemp,
        feverTemp: formattedTemp,
        bloodPressure: formattedBp,
        bpReading: formattedBp,
        triageNotes: vitalsNotes.trim() || undefined,
        receptionNotes: vitalsNotes.trim() || undefined,
        lastEditedBy: 'RECEPTIONIST' as const,
      };

      await updateDoc(doc(db, 'tokens', vitalsToken.id), {
        weight: formattedWeight,
        temperature: formattedTemp,
        bloodPressure: formattedBp,
        triageNotes: vitalsNotes.trim() || undefined,
        preConsultationNotes: updatedPreNotes,
      });

      showToast(`Vitals & Reception Notes saved for #${vitalsToken.tokenNumber} (${vitalsToken.patientName})`);
      setVitalsToken(null);
    } catch (err) {
      console.error('Error saving vitals:', err);
      showToast('Failed to save vitals. Please retry.');
    } finally {
      setIsSavingVitals(false);
    }
  };

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const activeToken = tokens.find(t => t.status === 'SERVING');
  const waitingTokens = tokens.filter(t => t.status === 'WAITING').sort((a, b) => {
    const pA = a.priority ?? 10;
    const pB = b.priority ?? 10;
    if (pA !== pB) return pA - pB;
    return a.sequenceNumber - b.sequenceNumber;
  });
  const holdTokens = tokens.filter(t => t.status === 'HOLD');
  const completedTokens = tokens.filter(t => t.status === 'COMPLETED');
  const averageWaitMinutes = waitingTokens.length
    ? Number((waitingTokens.reduce((sum, token) => {
        const tokenCreatedAt = token.createdAt ? new Date(token.createdAt).getTime() : Date.now();
        const elapsedMinutes = Math.max(0, (Date.now() - tokenCreatedAt) / 60000);
        return sum + elapsedMinutes;
      }, 0) / waitingTokens.length).toFixed(1))
    : 0;

  // Filter list
  const filteredTokens = tokens.filter(token => {
    // Tab filter
    if (filterTab === 'WAITING' && token.status !== 'WAITING') return false;
    if (filterTab === 'SERVING' && token.status !== 'SERVING') return false;
    if (filterTab === 'HOLD' && token.status !== 'HOLD') return false;
    if (filterTab === 'COMPLETED' && token.status !== 'COMPLETED') return false;

    // Search filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchName = token.patientName.toLowerCase().includes(q);
      const matchPhone = token.patientPhone.includes(q);
      const matchToken = token.tokenNumber.toLowerCase().includes(q);
      return matchName || matchPhone || matchToken;
    }
    return true;
  }).sort((a, b) => {
    if (filterTab === 'WAITING') {
      const pA = a.priority ?? 10;
      const pB = b.priority ?? 10;
      if (pA !== pB) return pA - pB;
      return a.sequenceNumber - b.sequenceNumber;
    }
    return b.sequenceNumber - a.sequenceNumber;
  });

  // Toggle Doctor Status IN / OUT
  const handleToggleDoctorStatus = async () => {
    const newStatus: DoctorStatus = clinic.doctorStatus === 'IN' ? 'OUT' : 'IN';
    try {
      await updateDoc(doc(db, 'clinics', clinic.id), {
        doctorStatus: newStatus,
      });
      soundManager.playChime();
      showToast(`Doctor status updated to ${newStatus === 'IN' ? '🟢 IN CABIN' : '🔴 OUT / STEPPED AWAY'}`);
    } catch (err) {
      console.error('Error toggling doctor status:', err);
    }
  };

  // Call Next Token
  const handleCallNextToken = async () => {
    if (waitingTokens.length === 0) {
      showToast('No patients currently waiting in queue!');
      return;
    }

    setIsAdvancing(true);
    try {
      // If there is an active token, complete it
      if (activeToken) {
        await updateDoc(doc(db, 'tokens', activeToken.id), {
          status: 'COMPLETED',
          completedAt: new Date().toISOString(),
          consultationDurationSeconds: 480,
        });
      }

      // Pick next token (VIP priority honored)
      const nextToken = waitingTokens[0];
      const response = await fetch(`/api/staff/queue/${encodeURIComponent(nextToken.id)}/call`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || 'Unable to call next token.');

      // Sound announcement & Meta WhatsApp message
      soundManager.announceToken(nextToken.tokenNumber, nextToken.patientName, clinic.cabinNumber);
      await WhatsAppService.sendWhatsAppNotification(
        nextToken,
        'TOKEN_CALLED_NOW',
        clinic.name,
        clinic.doctorName,
        clinic.cabinNumber
      );

      // Notify the subsequent patient
      if (waitingTokens.length > 1) {
        const nextInLine = waitingTokens[1];
        await WhatsAppService.sendWhatsAppNotification(
          nextInLine,
          'QUEUE_APPROACHING',
          clinic.name,
          clinic.doctorName,
          clinic.cabinNumber,
          '1'
        );
      }

      showToast(`Called Token #${nextToken.tokenNumber} (${nextToken.patientName}) to Cabin!`);
    } catch (err) {
      console.error('Error calling next token:', err);
      showToast('Failed to advance token. Check connection.');
    } finally {
      setIsAdvancing(false);
    }
  };

  // Hold / No-Show active token
  const handleHoldActiveToken = async () => {
    if (!activeToken) {
      showToast('No active token in cabin to put on hold.');
      return;
    }
    try {
      await updateDoc(doc(db, 'tokens', activeToken.id), {
        status: 'HOLD',
        isHold: true,
      });

      await WhatsAppService.sendWhatsAppNotification(
        activeToken,
        'TOKEN_HOLD_ALERT',
        clinic.name,
        clinic.doctorName,
        clinic.cabinNumber
      );

      // Now call next immediately if available
      if (waitingTokens.length > 0) {
        const nextToken = waitingTokens[0];
        await updateDoc(doc(db, 'tokens', nextToken.id), {
          status: 'SERVING',
          calledAt: new Date().toISOString(),
        });
        await updateDoc(doc(db, 'clinics', clinic.id), {
          currentRunningToken: nextToken.tokenNumber,
          currentRunningTokenId: nextToken.id,
        });
        soundManager.announceToken(nextToken.tokenNumber, nextToken.patientName, clinic.cabinNumber);
      } else {
        await updateDoc(doc(db, 'clinics', clinic.id), {
          currentRunningToken: 'None',
          currentRunningTokenId: '',
        });
      }

      showToast(`Token #${activeToken.tokenNumber} placed ON HOLD. Queue advanced.`);
    } catch (err) {
      console.error('Error putting token on hold:', err);
    }
  };

  // Reactivate Hold Token back to front of waiting list
  const handleReactivateHold = async (token: TokenItem) => {
    try {
      await updateDoc(doc(db, 'tokens', token.id), {
        status: 'WAITING',
        isHold: false,
        priority: 2, // Placed ahead of normal waiting
      });
      showToast(`Token #${token.tokenNumber} reactivated at the top of the waiting queue!`);
    } catch (err) {
      console.error('Error reactivating token:', err);
    }
  };

  // VIP / Emergency Override for a waiting patient
  const handleMakeVipOverride = async (token: TokenItem) => {
    try {
      await updateDoc(doc(db, 'tokens', token.id), {
        isVip: true,
        priority: 1, // Highest priority
        tokenNumber: token.tokenNumber.startsWith('VIP') ? token.tokenNumber : `VIP-${token.tokenNumber}`,
      });
      soundManager.playEmergencyChime();
      showToast(`🚨 Priority Override: ${token.patientName} pushed to #1 in queue!`);
    } catch (err) {
      console.error('Error making VIP override:', err);
    }
  };

  // Direct Call specific token right now
  const handleDirectCallToken = async (token: TokenItem) => {
    try {
      if (activeToken && activeToken.id !== token.id) {
        await updateDoc(doc(db, 'tokens', activeToken.id), {
          status: 'COMPLETED',
          completedAt: new Date().toISOString(),
          consultationDurationSeconds: 450,
        });
      }

      await updateDoc(doc(db, 'tokens', token.id), {
        status: 'SERVING',
        calledAt: new Date().toISOString(),
      });

      await updateDoc(doc(db, 'clinics', clinic.id), {
        currentRunningToken: token.tokenNumber,
        currentRunningTokenId: token.id,
      });

      soundManager.announceToken(token.tokenNumber, token.patientName, clinic.cabinNumber);
      await WhatsAppService.sendWhatsAppNotification(
        token,
        'TOKEN_CALLED_NOW',
        clinic.name,
        clinic.doctorName,
        clinic.cabinNumber
      );

      showToast(`Directly calling Token #${token.tokenNumber} to Cabin!`);
    } catch (err) {
      console.error('Error direct calling token:', err);
    }
  };

  // Send Manual WhatsApp Alert
  const handleSendWhatsAppAlert = async (token: TokenItem) => {
    if (isBasicPlan) {
      showToast('WhatsApp alerts are not included in the Basic plan.');
      return;
    }
    try {
      await WhatsAppService.sendWhatsAppNotification(
        token,
        'QUEUE_APPROACHING',
        clinic.name,
        clinic.doctorName,
        clinic.cabinNumber,
        '2'
      );
      showToast(`WhatsApp reminder dispatched to ${token.patientPhone}`);
    } catch (err) {
      console.error('Error sending WhatsApp alert:', err);
    }
  };

  if (isBasicPlan) {
    return (
      <div className="space-y-6 max-w-5xl mx-auto pb-12">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <div className="text-xs uppercase tracking-[0.2em] text-violet-300 font-bold">Basic plan</div>
              <h1 className="text-2xl font-black text-white mt-2">Reception minimal queue</h1>
            </div>
            <div className="rounded-full border border-violet-500/30 bg-violet-500/10 px-3 py-1 text-xs font-semibold text-violet-300">
              Only core queue tools enabled
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <button
            onClick={onOpenAddWalkIn}
            className="bg-slate-900 hover:bg-slate-800 border border-slate-700 text-white font-bold p-4 rounded-2xl"
          >
            <UserPlus className="w-5 h-5 mb-2 text-teal-400 mx-auto" />
            <div>Add Patient</div>
          </button>
          <button
            onClick={handleCallNextToken}
            disabled={isAdvancing || waitingTokens.length === 0}
            className="bg-gradient-to-r from-teal-500 to-emerald-400 hover:from-teal-400 hover:to-emerald-300 text-slate-950 font-black p-4 rounded-2xl disabled:opacity-50"
          >
            <Play className="w-5 h-5 mb-2 mx-auto" />
            <div>Next</div>
          </button>
          <button
            onClick={handleHoldActiveToken}
            disabled={!activeToken}
            className="bg-slate-900 hover:bg-slate-800 border border-slate-700 text-white font-bold p-4 rounded-2xl disabled:opacity-50"
          >
            <Pause className="w-5 h-5 mb-2 text-amber-400 mx-auto" />
            <div>Skip</div>
          </button>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800">
            <h2 className="text-lg font-bold text-white">Live tracking</h2>
            <span className="text-xs text-slate-400">Name & mobile only</span>
          </div>
          <div className="divide-y divide-slate-800">
            {tokens.filter(token => token.status !== 'COMPLETED').map(token => (
              <div key={token.id} className="flex items-center justify-between px-4 py-3">
                <div>
                  <div className="font-semibold text-white">{token.patientName}</div>
                  <div className="text-xs text-slate-400">{token.patientPhone}</div>
                </div>
                <div className="text-right">
                  <div className="text-xs uppercase tracking-wider text-teal-300">{token.status}</div>
                  <div className="text-xs text-slate-400">{token.tokenNumber}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      
      {/* Toast Alert */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-teal-500 text-slate-950 font-bold px-4 py-3 rounded-xl shadow-2xl flex items-center gap-2 border border-teal-400 animate-bounce">
          <Sparkles className="w-4 h-4" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Reception Queue Header Bar */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-6 shadow-xl relative overflow-hidden">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          
          <div>
            <div className="flex items-center space-x-2">
              <span className="p-2 rounded-xl bg-teal-500/10 text-teal-400">
                <Users className="w-5 h-5" />
              </span>
              <h1 className="text-xl sm:text-2xl font-black text-white">
                Reception Queue Management Desk
              </h1>
            </div>
            <p className="text-xs sm:text-sm text-slate-400 mt-1">
              Active Doctor: <span className="text-slate-200 font-semibold">{clinic.doctorName}</span> ({clinic.cabinNumber})
              {clinic.delayMinutes > 0 && (
                <span className="ml-2 text-amber-400 font-bold">
                  • ⚠️ Running +{clinic.delayMinutes} mins delay
                </span>
              )}
            </p>
          </div>

          {/* Quick Doctor Status Toggle on Reception Desk */}
          <div className="flex items-center gap-3 bg-slate-950 p-2 sm:p-2.5 rounded-xl border border-slate-800 self-start lg:self-auto">
            <div className="text-right pr-1 hidden sm:block">
              <div className="text-[11px] text-slate-400">Doctor Presence</div>
              <div className={`text-xs font-bold ${clinic.doctorStatus === 'IN' ? 'text-emerald-400' : 'text-rose-400'}`}>
                {clinic.doctorStatus === 'IN' ? 'IN CABIN' : 'AWAY / OUT'}
              </div>
            </div>

            <button
              onClick={handleToggleDoctorStatus}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all ${
                clinic.doctorStatus === 'IN'
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 hover:bg-emerald-500/30'
                  : 'bg-rose-500/20 text-rose-300 border border-rose-500/40 hover:bg-rose-500/30'
              }`}
            >
              <Power className="w-3.5 h-3.5" />
              <span>Toggle Status ({clinic.doctorStatus})</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Control Action Bar (Big Buttons) */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        
        {/* Button 1: Call Next Token */}
        <button
          onClick={handleCallNextToken}
          disabled={isAdvancing || waitingTokens.length === 0}
          className="col-span-2 md:col-span-1 bg-gradient-to-r from-teal-500 to-emerald-400 hover:from-teal-400 hover:to-emerald-300 text-slate-950 font-black p-4 rounded-2xl shadow-lg shadow-teal-500/25 flex flex-col items-center justify-center text-center transition-all disabled:opacity-50 disabled:cursor-not-allowed group"
        >
          <Play className="w-6 h-6 mb-1 text-slate-950 group-hover:scale-110 transition-transform" />
          <span className="text-sm font-black">CALL NEXT</span>
          <span className="text-[10px] text-slate-900/80 font-bold mt-0.5">
            {waitingTokens.length > 0 ? `Next: #${waitingTokens[0].tokenNumber}` : 'Queue Empty'}
          </span>
        </button>

        {/* Button 2: Add Walk-In Patient */}
        <button
          onClick={onOpenAddWalkIn}
          className="bg-slate-900 hover:bg-slate-800 border border-slate-700/80 text-white font-bold p-4 rounded-2xl shadow-md flex flex-col items-center justify-center text-center transition-all group"
        >
          <UserPlus className="w-5 h-5 mb-1 text-teal-400 group-hover:scale-110 transition-transform" />
          <span className="text-xs sm:text-sm">Add Walk-In</span>
          <span className="text-[10px] text-slate-400 font-normal">Generate Slip & Token</span>
        </button>

        {/* Button 3: Hold / No-Show */}
        <button
          onClick={handleHoldActiveToken}
          disabled={!activeToken}
          className="bg-slate-900 hover:bg-slate-800 border border-slate-700/80 text-white font-bold p-4 rounded-2xl shadow-md flex flex-col items-center justify-center text-center transition-all disabled:opacity-40 disabled:cursor-not-allowed group"
        >
          <Pause className="w-5 h-5 mb-1 text-amber-400 group-hover:scale-110 transition-transform" />
          <span className="text-xs sm:text-sm">Hold / No-Show</span>
          <span className="text-[10px] text-slate-400 font-normal">Skip Active Token</span>
        </button>

        {/* Button 4: Delay Broadcast */}
        <button
          onClick={onOpenDelayBroadcast}
          className="bg-slate-900 hover:bg-slate-800 border border-slate-700/80 text-white font-bold p-4 rounded-2xl shadow-md flex flex-col items-center justify-center text-center transition-all group"
        >
          <Clock className="w-5 h-5 mb-1 text-purple-400 group-hover:scale-110 transition-transform" />
          <span className="text-xs sm:text-sm">Delay Broadcast</span>
          <span className="text-[10px] text-slate-400 font-normal">
            {clinic.delayMinutes > 0 ? `+${clinic.delayMinutes}m Active` : 'Add Delay to ETAs'}
          </span>
        </button>

      </div>

      {/* Active Serving Banner (If Any) */}
      {activeToken && (
        <div className="bg-gradient-to-r from-teal-950/80 via-slate-900 to-slate-900 border border-teal-500/40 rounded-2xl p-4 sm:p-5 shadow-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center space-x-4">
            <div className="w-12 h-12 rounded-xl bg-teal-500 flex items-center justify-center text-slate-950 font-black text-xl shadow-lg shadow-teal-500/30 flex-shrink-0">
              {activeToken.tokenNumber}
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-xs font-bold uppercase tracking-wider text-teal-400">Currently Inside Cabin</span>
                {activeToken.isVip && (
                  <span className="text-[10px] px-1.5 py-0.2 bg-rose-500/20 text-rose-300 rounded font-bold">VIP</span>
                )}
              </div>
              <h3 className="text-lg font-bold text-white mt-0.5">{activeToken.patientName}</h3>
              <p className="text-xs text-slate-400">{activeToken.patientPhone} • {activeToken.tokenType}</p>
            </div>
          </div>

          <div className="flex items-center space-x-2 self-end sm:self-auto">
            <button
              onClick={() => onViewTokenDetails(activeToken)}
              className="px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-medium text-slate-200 border border-slate-700 flex items-center gap-1.5"
            >
              <Eye className="w-3.5 h-3.5 text-teal-400" />
              <span>Intake Notes</span>
            </button>
            <button
              onClick={() => onPrintTokenSlip(activeToken)}
              className="px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-medium text-slate-200 border border-slate-700 flex items-center gap-1.5"
            >
              <Printer className="w-3.5 h-3.5 text-teal-400" />
              <span>Print Slip</span>
            </button>
            <button
              onClick={handleHoldActiveToken}
              className="px-3 py-2 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-xs font-bold text-amber-300 border border-amber-500/30 flex items-center gap-1"
            >
              <Pause className="w-3.5 h-3.5" />
              <span>Hold</span>
            </button>
          </div>
        </div>
      )}

      {/* Merged Queue Center (Tabs + Table) */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-xl overflow-hidden">
        
        {/* Table Filter Tabs and Search Toolbar */}
        <div className="p-4 sm:p-5 border-b border-slate-800 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          
          {/* Tabs */}
          <div className="flex items-center space-x-1 sm:space-x-2 overflow-x-auto pb-1 sm:pb-0">
            <button
              onClick={() => setFilterTab('WAITING')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-all ${
                filterTab === 'WAITING'
                  ? 'bg-teal-500 text-slate-950 shadow-md'
                  : 'text-slate-400 hover:text-white bg-slate-800/60'
              }`}
            >
              Waiting ({waitingTokens.length})
            </button>

            <button
              onClick={() => setFilterTab('SERVING')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-all ${
                filterTab === 'SERVING'
                  ? 'bg-teal-500 text-slate-950 shadow-md'
                  : 'text-slate-400 hover:text-white bg-slate-800/60'
              }`}
            >
              Serving ({activeToken ? 1 : 0})
            </button>

            <button
              onClick={() => setFilterTab('HOLD')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-all ${
                filterTab === 'HOLD'
                  ? 'bg-teal-500 text-slate-950 shadow-md'
                  : 'text-slate-400 hover:text-white bg-slate-800/60'
              }`}
            >
              On Hold ({holdTokens.length})
            </button>

            <button
              onClick={() => setFilterTab('COMPLETED')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-all ${
                filterTab === 'COMPLETED'
                  ? 'bg-teal-500 text-slate-950 shadow-md'
                  : 'text-slate-400 hover:text-white bg-slate-800/60'
              }`}
            >
              Completed ({completedTokens.length})
            </button>

            <button
              onClick={() => setFilterTab('ALL')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-all ${
                filterTab === 'ALL'
                  ? 'bg-teal-500 text-slate-950 shadow-md'
                  : 'text-slate-400 hover:text-white bg-slate-800/60'
              }`}
            >
              All ({tokens.length})
            </button>
          </div>

          {/* Search Box */}
          <div className="relative w-full md:w-64">
            <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search token, name, phone..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-teal-500"
            />
          </div>
        </div>

        {/* Queue Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950/60 text-slate-400 uppercase font-semibold border-b border-slate-800">
              <tr>
                <th className="py-3 px-4">Token</th>
                <th className="py-3 px-4">Patient Name & Contact</th>
                <th className="py-3 px-4">Type</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Payment</th>
                <th className="py-3 px-4">Symptoms / Notes</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-300">
              {filteredTokens.length > 0 ? (
                filteredTokens.map((token, index) => {
                  const isServing = token.status === 'SERVING';
                  const isHold = token.status === 'HOLD';
                  const isCompleted = token.status === 'COMPLETED';

                  return (
                    <tr
                      key={token.id}
                      className={`hover:bg-slate-800/40 transition-colors ${
                        isServing ? 'bg-teal-950/20 font-medium' : ''
                      }`}
                    >
                      {/* Token # */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <div className="flex items-center space-x-2">
                          <span className={`font-mono font-black text-sm px-2.5 py-1 rounded-lg border ${
                            token.isVip
                              ? 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                              : isServing
                              ? 'bg-teal-500 text-slate-950 border-teal-400'
                              : 'bg-slate-800 text-teal-300 border-slate-700'
                          }`}>
                            {token.tokenNumber}
                          </span>
                          {token.isVip && (
                            <span className="text-[10px] bg-rose-500/20 text-rose-300 px-1 py-0.5 rounded font-bold">
                              VIP
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Patient Name */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <div>
                          <div className="font-bold text-white text-sm">{token.patientName}</div>
                          <div className="text-[11px] text-slate-400 flex items-center gap-1 mt-0.5">
                            <Phone className="w-3 h-3 text-slate-500" />
                            <span>{token.patientPhone}</span>
                            {token.patientAge && <span>• {token.patientAge}y</span>}
                          </div>
                        </div>
                      </td>

                      {/* Token Type */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          token.tokenType === 'ONLINE'
                            ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                            : token.tokenType === 'WALK_IN'
                            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                            : 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                        }`}>
                          {token.tokenType}
                        </span>
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                          isServing
                            ? 'bg-teal-500 text-slate-950 font-black'
                            : isHold
                            ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                            : isCompleted
                            ? 'bg-slate-800 text-slate-400'
                            : 'bg-blue-500/15 text-blue-300'
                        }`}>
                          {token.status}
                        </span>
                      </td>

                      {/* Payment */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span className="text-emerald-400 font-bold">₹{token.amountPaid}</span>
                        <span className="text-slate-500 text-[10px] block">{token.paymentMethod}</span>
                      </td>

                      {/* Symptoms & Notes & Vitals */}
                      <td className="py-3.5 px-4 max-w-xs">
                        <div>
                          {token.preConsultationNotes ? (
                            <button
                              onClick={() => onViewTokenDetails(token)}
                              className="text-left group/note block"
                            >
                              <span className="text-xs text-slate-300 group-hover/note:text-teal-300 underline decoration-dotted truncate block">
                                {token.preConsultationNotes.symptoms}
                              </span>
                              <span className="text-[10px] text-teal-400 font-semibold">
                                {token.preConsultationNotes.severity || 'Reported'}
                              </span>
                            </button>
                          ) : (
                            <span className="text-slate-600 text-xs italic block">No chief complaint</span>
                          )}

                          {/* Vitals Badges */}
                          {(token.weight || token.temperature || token.bloodPressure || token.triageNotes || token.preConsultationNotes?.weight || token.preConsultationNotes?.feverTemp || token.preConsultationNotes?.bloodPressure || token.preConsultationNotes?.receptionNotes) && (
                            <div className="flex flex-wrap items-center gap-1 mt-1.5 text-[10px]">
                              {(token.weight || token.preConsultationNotes?.weight) && (
                                <span className="bg-teal-950/60 text-teal-300 border border-teal-500/20 px-1.5 py-0.5 rounded font-mono">
                                  ⚖️ {token.weight || token.preConsultationNotes?.weight}
                                </span>
                              )}
                              {(token.temperature || token.preConsultationNotes?.temperature || token.preConsultationNotes?.feverTemp) && (
                                <span className="bg-amber-950/60 text-amber-300 border border-amber-500/20 px-1.5 py-0.5 rounded font-mono">
                                  🌡️ {token.temperature || token.preConsultationNotes?.temperature || token.preConsultationNotes?.feverTemp}
                                </span>
                              )}
                              {(token.bloodPressure || token.preConsultationNotes?.bloodPressure || token.preConsultationNotes?.bpReading) && (
                                <span className="bg-rose-950/60 text-rose-300 border border-rose-500/20 px-1.5 py-0.5 rounded font-mono">
                                  💓 {token.bloodPressure || token.preConsultationNotes?.bloodPressure || token.preConsultationNotes?.bpReading}
                                </span>
                              )}
                              {(token.triageNotes || token.preConsultationNotes?.triageNotes || token.preConsultationNotes?.receptionNotes) && (
                                <span className="bg-slate-800 text-slate-300 border border-slate-700 px-1.5 py-0.5 rounded italic truncate max-w-[140px]" title={token.triageNotes || token.preConsultationNotes?.triageNotes || token.preConsultationNotes?.receptionNotes}>
                                  📝 {token.triageNotes || token.preConsultationNotes?.triageNotes || token.preConsultationNotes?.receptionNotes}
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                      </td>

                      {/* Action Buttons */}
                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end space-x-1.5">
                          
                          {/* Call Now */}
                          {!isServing && !isCompleted && (
                            <button
                              onClick={() => handleDirectCallToken(token)}
                              title="Directly Call to Cabin"
                              className="p-1.5 rounded-lg bg-teal-500/20 hover:bg-teal-500 text-teal-300 hover:text-slate-950 transition-colors"
                            >
                              <Play className="w-3.5 h-3.5" />
                            </button>
                          )}

                          {/* Record / Edit Vitals */}
                          <button
                            onClick={() => openVitalsModal(token)}
                            title="Record / Edit Patient Vitals (Weight, Temp, BP, Triage Note)"
                            className="p-1.5 rounded-lg bg-teal-500/10 hover:bg-teal-500/20 text-teal-300 border border-teal-500/20 transition-colors"
                          >
                            <Activity className="w-3.5 h-3.5 text-teal-400" />
                          </button>

                          {/* VIP Emergency Override */}
                          {!token.isVip && !isCompleted && (
                            <button
                              onClick={() => handleMakeVipOverride(token)}
                              title="VIP / Emergency Priority"
                              className="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 transition-colors"
                            >
                              <ShieldAlert className="w-3.5 h-3.5" />
                            </button>
                          )}

                          {/* Re-activate Hold */}
                          {isHold && (
                            <button
                              onClick={() => handleReactivateHold(token)}
                              title="Re-activate back to queue"
                              className="px-2 py-1 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 text-[10px] font-bold"
                            >
                              Re-queue
                            </button>
                          )}

                          {/* Send WhatsApp Alert */}
                          <button
                            onClick={() => handleSendWhatsAppAlert(token)}
                            title="Dispatch WhatsApp Alert"
                            className="p-1.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 transition-colors"
                          >
                            <MessageSquare className="w-3.5 h-3.5" />
                          </button>

                          {/* Print Token */}
                          <button
                            onClick={() => onPrintTokenSlip(token)}
                            title="Print Token Slip"
                            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
                          >
                            <Printer className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={7} className="py-10 text-center text-slate-500">
                    No tokens found matching the selected filter.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Vitals & Reception Note Intake Modal */}
      {vitalsToken && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-lg w-full p-6 sm:p-7 shadow-2xl space-y-5">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center space-x-2">
                <div className="p-2 rounded-xl bg-teal-500/10 text-teal-400">
                  <Activity className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-xs font-mono font-bold text-teal-400">
                    TOKEN #{vitalsToken.tokenNumber}
                  </div>
                  <h3 className="text-lg font-bold text-white">
                    Record Vitals & Triage: {vitalsToken.patientName}
                  </h3>
                </div>
              </div>

              <button
                onClick={() => setVitalsToken(null)}
                className="p-1.5 rounded-xl bg-slate-800 text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveVitals} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {/* Weight with predefined kg */}
                <div>
                  <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider block mb-1 flex items-center gap-1">
                    <Scale className="w-3.5 h-3.5 text-teal-400" />
                    Weight
                  </label>
                  <div className="relative flex items-center">
                    <input
                      type="number"
                      step="0.1"
                      placeholder="70"
                      value={vitalsWeight}
                      onChange={(e) => setVitalsWeight(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2.5 pl-3 pr-10 text-xs text-white placeholder-slate-600 focus:ring-2 focus:ring-teal-500 focus:outline-none font-mono"
                    />
                    <span className="absolute right-3 text-xs font-bold text-teal-400 select-none pointer-events-none">
                      kg
                    </span>
                  </div>
                </div>

                {/* Temperature with predefined °F */}
                <div>
                  <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider block mb-1 flex items-center gap-1">
                    <Thermometer className="w-3.5 h-3.5 text-amber-400" />
                    Temperature
                  </label>
                  <div className="relative flex items-center">
                    <input
                      type="number"
                      step="0.1"
                      placeholder="98.6"
                      value={vitalsTemp}
                      onChange={(e) => setVitalsTemp(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2.5 pl-3 pr-10 text-xs text-white placeholder-slate-600 focus:ring-2 focus:ring-teal-500 focus:outline-none font-mono"
                    />
                    <span className="absolute right-3 text-xs font-bold text-amber-400 select-none pointer-events-none">
                      °F
                    </span>
                  </div>
                </div>

                {/* Blood Pressure with 2 columns and / in between */}
                <div>
                  <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider block mb-1 flex items-center justify-between">
                    <span className="flex items-center gap-1">
                      <Activity className="w-3.5 h-3.5 text-rose-400" />
                      Blood Pressure
                    </span>
                    <span className="text-[10px] text-slate-500 font-mono">mmHg</span>
                  </label>
                  <div className="flex items-center gap-1.5">
                    <div className="flex-1">
                      <input
                        type="number"
                        placeholder="120"
                        value={vitalsBpSys}
                        onChange={(e) => setVitalsBpSys(e.target.value)}
                        title="Systolic (SYS)"
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white text-center placeholder-slate-600 focus:ring-2 focus:ring-teal-500 focus:outline-none font-mono"
                      />
                    </div>
                    <span className="text-slate-500 font-black text-base select-none">/</span>
                    <div className="flex-1">
                      <input
                        type="number"
                        placeholder="80"
                        value={vitalsBpDia}
                        onChange={(e) => setVitalsBpDia(e.target.value)}
                        title="Diastolic (DIA)"
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white text-center placeholder-slate-600 focus:ring-2 focus:ring-teal-500 focus:outline-none font-mono"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider block mb-1 flex items-center gap-1">
                  <FileText className="w-3.5 h-3.5 text-teal-400" />
                  Receptionist Triage Note (Optional)
                </label>
                <textarea
                  rows={3}
                  placeholder="e.g. Patient feeling dizziness, assisted to wheelchair, high fever reported since morning..."
                  value={vitalsNotes}
                  onChange={(e) => setVitalsNotes(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-white placeholder-slate-600 focus:ring-2 focus:ring-teal-500 focus:outline-none resize-none"
                />
              </div>

              <div className="flex space-x-3 pt-2">
                <button
                  type="button"
                  onClick={() => setVitalsToken(null)}
                  className="flex-1 py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSavingVitals}
                  className="flex-1 py-3 bg-teal-500 hover:bg-teal-400 text-slate-950 rounded-xl text-xs font-black shadow-lg shadow-teal-500/20 flex items-center justify-center gap-1.5"
                >
                  <Save className="w-4 h-4" />
                  <span>{isSavingVitals ? 'Saving...' : 'Save Vitals & Notes'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
