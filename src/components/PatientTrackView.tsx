import React, { useState, useEffect } from 'react';
import {
  Clock,
  Activity,
  AlertCircle,
  CheckCircle2,
  Calendar,
  Phone,
  FileText,
  Paperclip,
  Sparkles,
  Volume2,
  ShieldCheck,
  ChevronRight,
  Send,
  User,
  Flame,
  ArrowRight,
  Info,
  Hospital
} from 'lucide-react';
import { Clinic, TokenItem, QueueSession, PreConsultationNotes } from '../types/queue';
import { db, doc, updateDoc } from '../lib/firebase';
import { soundManager } from '../lib/audio';

interface PatientTrackViewProps {
  clinic: Clinic;
  session: QueueSession | null;
  tokens: TokenItem[];
  selectedTokenId?: string;
  onSelectTokenId: (tokenId: string) => void;
  onNavigateToBooking: () => void;
}

export const PatientTrackView: React.FC<PatientTrackViewProps> = ({
  clinic,
  session,
  tokens,
  selectedTokenId,
  onSelectTokenId,
  onNavigateToBooking,
}) => {
  // If no token is selected, default to the first waiting token or active token
  const currentToken = tokens.find(t => t.id === selectedTokenId) 
    || tokens.find(t => t.status === 'SERVING') 
    || tokens.find(t => t.status === 'WAITING') 
    || tokens[0];

  const activeToken = tokens.find(t => t.status === 'SERVING');

  // Form states for Pre-Consultation Symptoms submission
  const [symptoms, setSymptoms] = useState('');
  const [duration, setDuration] = useState('1-3 days');
  const [severity, setSeverity] = useState<'Mild' | 'Moderate' | 'Severe' | 'Critical'>('Mild');
  const [painScale, setPainScale] = useState(3);
  const [allergies, setAllergies] = useState('');
  const [feverTemp, setFeverTemp] = useState('');
  const [bpReading, setBpReading] = useState('');
  const [uploadedFiles, setUploadedFiles] = useState<Array<{ name: string; type: string; dataUrl?: string }>>([]);
  const [isSubmittingNotes, setIsSubmittingNotes] = useState(false);
  const [notesSubmittedSuccess, setNotesSubmittedSuccess] = useState(false);

  // Sync existing notes into form when currentToken changes
  useEffect(() => {
    if (currentToken?.preConsultationNotes) {
      const n = currentToken.preConsultationNotes;
      setSymptoms(n.symptoms || '');
      setDuration(n.duration || '1-3 days');
      setSeverity(n.severity || 'Mild');
      setPainScale(n.painScale || 3);
      setAllergies(n.allergies || '');
      setFeverTemp(n.feverTemp || '');
      setBpReading(n.bpReading || '');
      if (n.attachments) {
        setUploadedFiles(n.attachments);
      }
    } else {
      setSymptoms('');
      setAllergies('');
      setFeverTemp('');
      setBpReading('');
      setUploadedFiles([]);
    }
  }, [currentToken?.id]);

  // ETA Calculation Logic:
  // (Rolling average time of last 5 patients) * (Number of patients ahead in the queue) + (Broadcast Delay)
  const calculateEta = () => {
    if (!currentToken) return { mins: 0, text: 'N/A', patientsAhead: 0 };
    if (currentToken.status === 'SERVING') {
      return { mins: 0, text: 'You are currently being served!', patientsAhead: 0 };
    }
    if (currentToken.status === 'COMPLETED') {
      return { mins: 0, text: 'Consultation Completed', patientsAhead: 0 };
    }
    if (currentToken.status === 'HOLD') {
      return { mins: 0, text: 'Token on Hold (Report to Reception)', patientsAhead: 0 };
    }

    const waitingSorted = tokens
      .filter(t => t.status === 'WAITING')
      .sort((a, b) => {
        const pA = a.priority ?? 10;
        const pB = b.priority ?? 10;
        if (pA !== pB) return pA - pB;
        return a.sequenceNumber - b.sequenceNumber;
      });

    const currentIndex = waitingSorted.findIndex(t => t.id === currentToken.id);
    const patientsAhead = currentIndex >= 0 ? currentIndex : 0;
    const rollingAvg = clinic.avgConsultationMinutes || 8.5;
    const delay = clinic.delayMinutes || 0;

    // ETA in minutes
    const totalMinutes = Math.max(2, Math.round((patientsAhead * rollingAvg) + delay + (activeToken ? 4 : 0)));
    
    // Estimated Clock Time
    const estimatedDate = new Date(Date.now() + totalMinutes * 60000);
    const clockTime = estimatedDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    return {
      mins: totalMinutes,
      patientsAhead,
      clockTime,
      text: `~${totalMinutes} mins (approx ${clockTime})`,
    };
  };

  const eta = calculateEta();

  // Handle local file attachment upload
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const file = files[0];
    const reader = new FileReader();
    reader.onload = () => {
      const newFile = {
        name: file.name,
        type: file.type,
        dataUrl: reader.result as string,
      };
      setUploadedFiles(prev => [...prev, newFile]);
    };
    reader.readAsDataURL(file);
  };

  // Submit Pre-Consultation Symptoms to Firestore
  const handleSubmitNotes = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentToken) return;
    if (!symptoms.trim()) return;

    setIsSubmittingNotes(true);
    try {
      const payload: PreConsultationNotes = {
        symptoms,
        duration,
        severity,
        painScale,
        allergies: allergies.trim() || 'None',
        feverTemp: feverTemp.trim() || undefined,
        bpReading: bpReading.trim() || undefined,
        attachments: uploadedFiles,
        submittedAt: new Date().toISOString(),
      };

      await updateDoc(doc(db, 'tokens', currentToken.id), {
        preConsultationNotes: payload,
      });

      setNotesSubmittedSuccess(true);
      setTimeout(() => setNotesSubmittedSuccess(false), 4000);
    } catch (err) {
      console.error('Error submitting patient notes:', err);
    } finally {
      setIsSubmittingNotes(false);
    }
  };

  const isDoctorIn = clinic.doctorStatus === 'IN';

  return (
    <div className="max-w-3xl mx-auto space-y-6 pb-16 px-3 sm:px-0">
      
      {/* Dynamic Token Selector Pill (To easily test any patient link) */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-3 sm:p-4 shadow-lg flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center space-x-2">
          <span className="text-xs font-semibold text-slate-400">Tracking Patient:</span>
          <select
            value={currentToken?.id || ''}
            onChange={(e) => onSelectTokenId(e.target.value)}
            className="bg-slate-950 border border-slate-700 text-teal-300 font-bold text-xs rounded-xl px-3 py-1.5 focus:ring-2 focus:ring-teal-500 focus:outline-none"
          >
            {tokens.map(t => (
              <option key={t.id} value={t.id}>
                Token #{t.tokenNumber} - {t.patientName} ({t.status})
              </option>
            ))}
          </select>
        </div>

        <button
          onClick={onNavigateToBooking}
          className="text-xs font-bold text-teal-400 hover:text-teal-300 flex items-center gap-1 self-end sm:self-auto bg-teal-500/10 hover:bg-teal-500/20 px-3 py-1.5 rounded-xl border border-teal-500/20 transition-all"
        >
          <span>Book New Appointment</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Main Live Queue Status Card */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl relative overflow-hidden text-center sm:text-left">
        
        {/* Glow backdrop */}
        <div className="absolute top-0 right-0 w-72 h-72 bg-teal-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* Doctor Status Banner */}
        <div className="flex flex-wrap items-center justify-between gap-3 pb-6 border-b border-slate-800">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-teal-500/20 border border-teal-500/30 flex items-center justify-center text-teal-300">
              <Hospital className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">{clinic.doctorName}</h2>
              <p className="text-xs text-slate-400">{clinic.specialty} • {clinic.cabinNumber}</p>
            </div>
          </div>

          {/* Doctor Presence Badge */}
          <div className="flex items-center gap-2">
            <div className={`px-3 py-1.5 rounded-full text-xs font-bold flex items-center gap-2 border ${
              isDoctorIn
                ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
                : 'bg-rose-500/15 text-rose-300 border-rose-500/30'
            }`}>
              <span className={`w-2 h-2 rounded-full ${isDoctorIn ? 'bg-emerald-400 animate-pulse' : 'bg-rose-400'}`} />
              <span>{isDoctorIn ? 'Doctor IN Cabin' : 'Doctor Stepped Out'}</span>
            </div>

            {clinic.delayMinutes > 0 && (
              <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                +{clinic.delayMinutes}m delay
              </span>
            )}
          </div>
        </div>

        {/* Token Numbers Grid: Your Token vs Currently Serving */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 my-8">
          
          {/* Currently Serving Token */}
          <div className="bg-slate-950/80 rounded-2xl p-6 border border-slate-800 text-center relative overflow-hidden">
            <div className="text-xs font-bold uppercase tracking-wider text-teal-400 flex items-center justify-center gap-1.5">
              <Activity className="w-3.5 h-3.5 animate-pulse" />
              Currently Serving
            </div>
            <div className="mt-3 text-5xl sm:text-6xl font-black text-white tracking-tight">
              {activeToken ? activeToken.tokenNumber : '---'}
            </div>
            <p className="text-xs text-slate-400 mt-2 truncate">
              {activeToken ? `Inside ${clinic.cabinNumber}` : 'Waiting for next patient'}
            </p>
          </div>

          {/* Your Token Number */}
          <div className="bg-gradient-to-br from-teal-950/40 via-slate-900 to-slate-900 rounded-2xl p-6 border-2 border-teal-500/40 text-center relative shadow-lg shadow-teal-500/10">
            <div className="text-xs font-bold uppercase tracking-wider text-teal-300 flex items-center justify-center gap-1.5">
              <User className="w-3.5 h-3.5" />
              Your Token Number
            </div>
            <div className="mt-3 text-5xl sm:text-6xl font-black text-teal-300 tracking-tight">
              {currentToken ? currentToken.tokenNumber : 'A-100'}
            </div>
            <p className="text-xs font-bold text-teal-200 mt-2">
              {currentToken?.patientName || 'Patient'}
            </p>
            {currentToken && (
              <div className="mt-2 flex items-center justify-center">
                {currentToken.paymentStatus === 'PAID' ? (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" />
                    Pre-Paid Online (₹{currentToken.amountPaid})
                  </span>
                ) : (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    Pay ₹{clinic.consultationFee} at Reception Counter
                  </span>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Live Dynamic ETA Card */}
        <div className="bg-slate-950 rounded-2xl p-5 border border-slate-800 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center space-x-2.5">
              <div className="p-2 rounded-xl bg-teal-500/10 text-teal-400">
                <Clock className="w-5 h-5" />
              </div>
              <div>
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">
                  Dynamic Live ETA
                </span>
                <span className="text-xl sm:text-2xl font-black text-white">
                  {eta.text}
                </span>
              </div>
            </div>

            {currentToken?.status === 'WAITING' && (
              <div className="text-left sm:text-right">
                <span className="text-xs text-slate-400 block">Queue Position:</span>
                <span className="text-sm font-bold text-teal-300">
                  {eta.patientsAhead === 0 ? "You're NEXT!" : `${eta.patientsAhead} patient(s) ahead of you`}
                </span>
              </div>
            )}
          </div>

          {/* Formula explanation snippet */}
          <div className="text-[11px] text-slate-500 pt-2 border-t border-slate-800/80 flex items-center gap-1.5">
            <Info className="w-3.5 h-3.5 text-teal-400 flex-shrink-0" />
            <span>
              Calculated real-time via rolling avg ({clinic.avgConsultationMinutes || 8.5}m/patient) × {eta.patientsAhead} ahead {clinic.delayMinutes > 0 ? `+ ${clinic.delayMinutes}m delay` : ''}.
            </span>
          </div>
        </div>
      </div>

      {/* Pre-Consultation Symptoms Intake Form */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-xl space-y-6">
        <div>
          <div className="flex items-center space-x-2">
            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400">
              <Flame className="w-5 h-5" />
            </div>
            <h3 className="text-lg font-bold text-white">Pre-Consultation Intake Form</h3>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Save consultation time! Submit your symptoms and upload past reports while you wait in the lounge.
          </p>
        </div>

        {notesSubmittedSuccess && (
          <div className="p-4 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs font-semibold flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span>Pre-consultation notes submitted successfully to Dr. {clinic.doctorName}'s screen!</span>
          </div>
        )}

        <form onSubmit={handleSubmitNotes} className="space-y-4">
          
          {/* Primary Symptoms */}
          <div>
            <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider block mb-1.5">
              Primary Health Concern / Symptoms <span className="text-rose-400">*</span>
            </label>
            <textarea
              required
              rows={3}
              value={symptoms}
              onChange={(e) => setSymptoms(e.target.value)}
              placeholder="E.g., Mild headache and chest tightness for 2 days, slight fever in evening..."
              className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3.5 text-sm text-slate-200 focus:ring-2 focus:ring-teal-500 focus:outline-none placeholder-slate-600 resize-none"
            />
          </div>

          {/* Duration & Severity */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider block mb-1.5">
                How long have you had this?
              </label>
              <select
                value={duration}
                onChange={(e) => setDuration(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-slate-200 focus:ring-2 focus:ring-teal-500 focus:outline-none"
              >
                <option value="Since today">Since today</option>
                <option value="1-3 days">1 to 3 days</option>
                <option value="1-2 weeks">1 to 2 weeks</option>
                <option value="More than a month">More than a month (Chronic)</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider block mb-1.5">
                Severity Level
              </label>
              <select
                value={severity}
                onChange={(e) => setSeverity(e.target.value as any)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-slate-200 focus:ring-2 focus:ring-teal-500 focus:outline-none"
              >
                <option value="Mild">Mild (Manageable)</option>
                <option value="Moderate">Moderate (Interferes with daily work)</option>
                <option value="Severe">Severe (Intense discomfort)</option>
                <option value="Critical">Critical (Immediate attention needed)</option>
              </select>
            </div>
          </div>

          {/* Pain Scale Slider (1 to 10) */}
          <div className="bg-slate-950 p-4 rounded-xl border border-slate-800">
            <div className="flex justify-between items-center mb-2">
              <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
                Pain / Discomfort Scale (1 to 10)
              </label>
              <span className="text-sm font-bold text-teal-400">{painScale} / 10</span>
            </div>
            <input
              type="range"
              min="1"
              max="10"
              value={painScale}
              onChange={(e) => setPainScale(Number(e.target.value))}
              className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-teal-400"
            />
            <div className="flex justify-between text-[10px] text-slate-500 mt-1">
              <span>1 (No Pain)</span>
              <span>5 (Moderate)</span>
              <span>10 (Unbearable)</span>
            </div>
          </div>

          {/* Allergies & Temperature */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider block mb-1.5">
                Known Drug / Food Allergies
              </label>
              <input
                type="text"
                value={allergies}
                onChange={(e) => setAllergies(e.target.value)}
                placeholder="E.g., Penicillin, Sulfa, Dust..."
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-slate-200 focus:ring-2 focus:ring-teal-500 focus:outline-none placeholder-slate-600"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider block mb-1.5">
                Current Temperature / BP (If measured)
              </label>
              <input
                type="text"
                value={feverTemp}
                onChange={(e) => setFeverTemp(e.target.value)}
                placeholder="E.g., 99.2°F or 120/80"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-slate-200 focus:ring-2 focus:ring-teal-500 focus:outline-none placeholder-slate-600"
              />
            </div>
          </div>

          {/* Attachment Uploads */}
          <div>
            <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider block mb-1.5">
              Attach Prescription / Lab Report / Photo
            </label>
            
            <div className="flex items-center gap-3">
              <label className="cursor-pointer bg-slate-950 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 px-4 py-2.5 rounded-xl text-xs font-semibold text-teal-300 flex items-center gap-2 transition-all">
                <Paperclip className="w-3.5 h-3.5" />
                <span>Choose File (PDF/Image)</span>
                <input
                  type="file"
                  accept="image/*,application/pdf"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </label>
            </div>

            {uploadedFiles.length > 0 && (
              <div className="mt-3 space-y-1.5">
                {uploadedFiles.map((file, idx) => (
                  <div key={idx} className="flex items-center justify-between p-2.5 bg-slate-950 rounded-xl border border-slate-800 text-xs">
                    <span className="text-slate-300 truncate">{file.name}</span>
                    <button
                      type="button"
                      onClick={() => setUploadedFiles(prev => prev.filter((_, i) => i !== idx))}
                      className="text-rose-400 hover:text-rose-300 text-xs font-bold"
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isSubmittingNotes || !symptoms.trim()}
            className="w-full bg-gradient-to-r from-teal-500 to-emerald-400 hover:from-teal-400 hover:to-emerald-300 text-slate-950 font-black py-3.5 px-4 rounded-xl shadow-lg shadow-teal-500/20 transition-all flex items-center justify-center space-x-2 text-sm disabled:opacity-50"
          >
            <Send className="w-4 h-4" />
            <span>{isSubmittingNotes ? 'Transmitting to Doctor...' : 'Submit Symptoms to Doctor'}</span>
          </button>
        </form>
      </div>
    </div>
  );
};
