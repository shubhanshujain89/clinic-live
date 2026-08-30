import React, { useState } from 'react';
import { PhoneInput } from './PhoneInput';
import {
  Calendar,
  Clock,
  CreditCard,
  CheckCircle2,
  ShieldCheck,
  Smartphone,
  IndianRupee,
  Sparkles,
  ArrowRight,
  User,
  Phone,
  FileText,
  Lock,
  QrCode,
  Printer,
  Building2,
  Wallet,
  Check,
  Copy,
  ExternalLink,
  ChevronRight,
  AlertCircle,
  Banknote
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { Clinic, TokenItem } from '../types/queue';
import { db, doc, setDoc } from '../lib/firebase';
import { WhatsAppService } from '../lib/whatsappService';
import { PaymentGatewayPage } from './PaymentGatewayPage';

interface BookingViewProps {
  clinic: Clinic;
  onBookingComplete: (newToken: TokenItem) => void;
  onBackToTracker: () => void;
}

export const BookingView: React.FC<BookingViewProps> = ({
  clinic,
  onBookingComplete,
  onBackToTracker,
}) => {
  const [patientName, setPatientName] = useState('');
  const [patientPhone, setPatientPhone] = useState('');
  const [patientAge, setPatientAge] = useState('34');
  const [patientGender, setPatientGender] = useState<'Male' | 'Female' | 'Other'>('Male');
  const [primaryConcern, setPrimaryConcern] = useState('');

  // Primary Payment Mode: 'PAY_NOW' | 'PAY_AT_CLINIC'
  const [paymentMode, setPaymentMode] = useState<'PAY_NOW' | 'PAY_AT_CLINIC'>('PAY_NOW');

  // If PAY_NOW selected, choose between QR Barcode OR Gateway
  const [payNowOption, setPayNowOption] = useState<'QR_BARCODE' | 'GATEWAY'>('QR_BARCODE');

  // Gateway redirection modal state
  const [showGatewayModal, setShowGatewayModal] = useState(false);

  // Direct QR barcode inputs
  const [utrRefNumber, setUtrRefNumber] = useState('');
  const [copiedUpi, setCopiedUpi] = useState(false);

  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [processingStatusText, setProcessingStatusText] = useState('Connecting to payment service...');
  const [confirmedToken, setConfirmedToken] = useState<TokenItem | null>(null);

  const consultationFee = clinic.consultationFee || 750;
  const platformFee = paymentMode === 'PAY_NOW' ? 25 : 0;
  const totalAmount = paymentMode === 'PAY_NOW' ? consultationFee + platformFee : consultationFee;
  const clinicVpa = clinic.clinicUpiId || 'carepoint.clinic@hdfcbank';

  const handleCopyUpi = () => {
    navigator.clipboard.writeText(clinicVpa);
    setCopiedUpi(true);
    setTimeout(() => setCopiedUpi(false), 2500);
  };

  // Called when patient completes checkout on the PaymentGatewayPage
  const handleGatewayPaymentSuccess = async (details: { paymentMethod: string; transactionId: string }) => {
    setIsProcessingPayment(true);
    try {
      const tokenId = 'tok_' + Date.now();
      const randSeq = Math.floor(Math.random() * 80) + 110;
      const tokenNumber = `A-${randSeq}`;

      const newToken: TokenItem = {
        id: tokenId,
        clinicId: clinic.id,
        sessionId: clinic.activeSessionId || 'sess_today',
        tokenNumber,
        sequenceNumber: randSeq,
        patientName: patientName.trim(),
        patientPhone: patientPhone.trim(),
        patientAge: Number(patientAge) || 30,
        patientGender,
        tokenType: 'ONLINE',
        status: 'WAITING',
        isVip: false,
        isHold: false,
        priority: 10,
        amountPaid: totalAmount,
        paymentMode: 'PAY_NOW',
        paymentMethod: (details.paymentMethod as any) || 'PAYMENT_GATEWAY',
        paymentStatus: 'PAID',
        createdAt: new Date().toISOString(),
        preConsultationNotes: primaryConcern.trim()
          ? {
              symptoms: primaryConcern.trim(),
              duration: '1-2 days',
              severity: 'Mild',
              painScale: 3,
              submittedAt: new Date().toISOString(),
              lastEditedBy: 'PATIENT',
            }
          : undefined,
      };

      // Write directly to Firestore
      await setDoc(doc(db, 'tokens', tokenId), newToken);

      // Send WhatsApp Utility Confirmation
      await WhatsAppService.sendWhatsAppNotification(
        newToken,
        'TOKEN_ISSUED',
        clinic.name,
        clinic.doctorName,
        clinic.cabinNumber,
        '15-25 mins'
      );

      // Burst Confetti animation
      try {
        confetti({
          particleCount: 110,
          spread: 80,
          origin: { y: 0.6 },
        });
      } catch {
        // Ignored
      }

      setShowGatewayModal(false);
      setConfirmedToken(newToken);
      onBookingComplete(newToken);
    } catch (err) {
      console.error('Error saving booking token from gateway:', err);
    } finally {
      setIsProcessingPayment(false);
    }
  };

  const handleProcessBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!patientName.trim() || !patientPhone.trim()) return;

    if (paymentMode === 'PAY_NOW' && payNowOption === 'GATEWAY') {
      // Redirect to Payment Gateway Page
      setShowGatewayModal(true);
      return;
    }

    setIsProcessingPayment(true);

    if (paymentMode === 'PAY_NOW') {
      setProcessingStatusText('Verifying UPI QR Payment reference...');
    } else {
      setProcessingStatusText('Registering appointment & queue pass...');
    }

    setTimeout(async () => {
      try {
        const tokenId = 'tok_' + Date.now();
        const randSeq = Math.floor(Math.random() * 80) + 110;
        const tokenNumber = `A-${randSeq}`;

        const isPaidOnline = paymentMode === 'PAY_NOW';

        const newToken: TokenItem = {
          id: tokenId,
          clinicId: clinic.id,
          sessionId: clinic.activeSessionId || 'sess_today',
          tokenNumber,
          sequenceNumber: randSeq,
          patientName: patientName.trim(),
          patientPhone: patientPhone.trim(),
          patientAge: Number(patientAge) || 30,
          patientGender,
          tokenType: 'ONLINE',
          status: 'WAITING',
          isVip: false,
          isHold: false,
          priority: 10,
          amountPaid: isPaidOnline ? totalAmount : 0,
          paymentMode,
          paymentMethod: isPaidOnline ? 'QR_BARCODE' : 'PAY_AT_CLINIC',
          paymentStatus: isPaidOnline ? 'PAID' : 'PAY_AT_CLINIC',
          createdAt: new Date().toISOString(),
          preConsultationNotes: primaryConcern.trim()
            ? {
                symptoms: primaryConcern.trim(),
                duration: '1-2 days',
                severity: 'Mild',
                painScale: 3,
                submittedAt: new Date().toISOString(),
                lastEditedBy: 'PATIENT',
              }
            : undefined,
        };

        // Write directly to Firestore
        await setDoc(doc(db, 'tokens', tokenId), newToken);

        // Send WhatsApp Utility Confirmation
        await WhatsAppService.sendWhatsAppNotification(
          newToken,
          'TOKEN_ISSUED',
          clinic.name,
          clinic.doctorName,
          clinic.cabinNumber,
          '15-25 mins'
        );

        // Burst Confetti animation
        try {
          confetti({
            particleCount: 110,
            spread: 80,
            origin: { y: 0.6 },
          });
        } catch {
          // Ignored
        }

        setConfirmedToken(newToken);
        onBookingComplete(newToken);
      } catch (err) {
        console.error('Error saving booking token:', err);
      } finally {
        setIsProcessingPayment(false);
      }
    }, 1300);
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6 pb-20 px-3 sm:px-0">
      {/* Header */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl relative overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-teal-400">
              Online Appointment & Instant Token Pass
            </span>
            <h1 className="text-2xl sm:text-3xl font-black text-white mt-1">
              Book Doctor Consultation
            </h1>
            <p className="text-xs sm:text-sm text-slate-400 mt-1">
              Doctor: <span className="text-slate-200 font-semibold">{clinic.doctorName}</span> • {clinic.specialty} • {clinic.cabinNumber}
            </p>
          </div>

          <button
            onClick={onBackToTracker}
            className="text-xs font-semibold text-slate-400 hover:text-white self-start sm:self-auto bg-slate-800 px-3.5 py-2 rounded-xl border border-slate-700 transition-all flex items-center gap-1.5"
          >
            ← Back to Live Queue
          </button>
        </div>
      </div>

      {confirmedToken ? (
        /* Booking Confirmation Receipt Card */
        <div className="bg-slate-900 border border-teal-500/40 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6 text-center">
          <div className="w-16 h-16 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center mx-auto shadow-lg shadow-emerald-500/20 animate-bounce">
            <CheckCircle2 className="w-8 h-8" />
          </div>

          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-teal-400">
              {confirmedToken.paymentMode === 'PAY_NOW'
                ? 'Prepayment Confirmed • Digital Fast-Track Pass'
                : 'Appointment Confirmed • Pay at Reception'}
            </span>
            <h2 className="text-2xl sm:text-3xl font-black text-white mt-1">
              Appointment Token Issued!
            </h2>
            <p className="text-xs sm:text-sm text-slate-400 mt-1 max-w-md mx-auto">
              Real-time token updates & WhatsApp confirmation have been dispatched to{' '}
              <span className="text-teal-300 font-semibold">{confirmedToken.patientPhone}</span>.
            </p>
          </div>

          {/* Generated Digital Pass */}
          <div className="bg-slate-950 border border-slate-800 rounded-2xl p-6 max-w-md mx-auto space-y-4 shadow-xl text-left">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <span className="text-xs font-mono text-slate-400">DIGITAL QUEUE PASS</span>
              {confirmedToken.paymentMode === 'PAY_NOW' ? (
                <span className="text-xs font-bold text-emerald-400 bg-emerald-500/10 px-2.5 py-0.5 rounded-full border border-emerald-500/20 flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" />
                  PAID ONLINE ₹{confirmedToken.amountPaid}
                </span>
              ) : (
                <span className="text-xs font-bold text-amber-300 bg-amber-500/10 px-2.5 py-0.5 rounded-full border border-amber-500/20 flex items-center gap-1">
                  <Banknote className="w-3 h-3" />
                  PAY ₹{consultationFee} AT CLINIC
                </span>
              )}
            </div>

            <div className="text-center py-3 bg-gradient-to-b from-teal-950/20 to-slate-950 rounded-xl border border-teal-500/20">
              <span className="text-xs text-teal-300 font-semibold block uppercase tracking-wider">
                Your Running Token Number
              </span>
              <span className="text-5xl font-black text-teal-300 tracking-tight block mt-1">
                {confirmedToken.tokenNumber}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs bg-slate-900/90 p-3.5 rounded-xl border border-slate-800">
              <div>
                <span className="text-slate-500 block">Patient Name:</span>
                <span className="text-white font-bold">{confirmedToken.patientName}</span>
              </div>
              <div>
                <span className="text-slate-500 block">Cabin / Doctor:</span>
                <span className="text-white font-bold">{clinic.cabinNumber}</span>
              </div>
              <div>
                <span className="text-slate-500 block">Queue Status:</span>
                <span className="text-teal-400 font-bold">Waiting in Queue</span>
              </div>
              <div>
                <span className="text-slate-500 block">Payment Mode:</span>
                <span className="text-slate-200 font-bold">
                  {confirmedToken.paymentMode === 'PAY_NOW'
                    ? `Prepaid (${confirmedToken.paymentMethod})`
                    : 'Pay at Counter'}
                </span>
              </div>
            </div>

            {confirmedToken.paymentMode === 'PAY_AT_CLINIC' && (
              <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl text-xs text-amber-300 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <span>
                  Please show this token at the clinic reception counter and pay ₹{consultationFee} via Cash, UPI, or Card upon arrival.
                </span>
              </div>
            )}
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
            <button
              onClick={onBackToTracker}
              className="w-full sm:w-auto px-6 py-3.5 bg-gradient-to-r from-teal-500 to-emerald-400 hover:from-teal-400 hover:to-emerald-300 text-slate-950 font-black rounded-xl text-sm shadow-lg shadow-teal-500/20 flex items-center justify-center gap-2"
            >
              <Smartphone className="w-4 h-4" />
              <span>Open Live Queue Tracker</span>
            </button>

            <button
              onClick={() => window.print()}
              className="w-full sm:w-auto px-5 py-3.5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold rounded-xl text-xs border border-slate-700 flex items-center justify-center gap-2"
            >
              <Printer className="w-4 h-4 text-teal-400" />
              <span>Print Token Slip</span>
            </button>
          </div>
        </div>
      ) : (
        /* Booking & Payment Form */
        <form onSubmit={handleProcessBooking} className="space-y-6">
          {/* Step 1: Patient Information */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-xl space-y-4">
            <div className="flex items-center space-x-2 border-b border-slate-800 pb-3">
              <span className="w-6 h-6 rounded-full bg-teal-500/20 text-teal-400 text-xs font-bold flex items-center justify-center border border-teal-500/30">
                1
              </span>
              <h3 className="text-base font-bold text-white">Patient Contact Details</h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider block mb-1.5">
                  Full Name <span className="text-rose-400">*</span>
                </label>
                <input
                  required
                  type="text"
                  placeholder="E.g. Siddharth Verma"
                  value={patientName}
                  onChange={(e) => setPatientName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-slate-200 focus:ring-2 focus:ring-teal-500 focus:outline-none placeholder-slate-600"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider block mb-1.5">
                  WhatsApp Phone Number <span className="text-rose-400">*</span>
                </label>
                <PhoneInput value={patientPhone} onChange={setPatientPhone} className="rounded-xl border-slate-800 bg-slate-950 text-xs text-slate-200" />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider block mb-1.5">
                  Age
                </label>
                <input
                  type="number"
                  placeholder="30"
                  value={patientAge}
                  onChange={(e) => setPatientAge(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-slate-200 focus:ring-2 focus:ring-teal-500 focus:outline-none placeholder-slate-600"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider block mb-1.5">
                  Gender
                </label>
                <select
                  value={patientGender}
                  onChange={(e) => setPatientGender(e.target.value as any)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-slate-200 focus:ring-2 focus:ring-teal-500 focus:outline-none"
                >
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Other">Other</option>
                </select>
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider block mb-1.5">
                Primary Health Concern (Optional Symptoms Pre-Note)
              </label>
              <textarea
                rows={2}
                placeholder="Briefly state your symptoms (e.g. routine checkup, seasonal flu, fever, back pain)..."
                value={primaryConcern}
                onChange={(e) => setPrimaryConcern(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-slate-200 focus:ring-2 focus:ring-teal-500 focus:outline-none placeholder-slate-600 resize-none"
              />
            </div>
          </div>

          {/* Step 2: Payment Mode Selection (Pay Now vs Pay at Clinic) */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-xl space-y-6">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center space-x-2">
                <span className="w-6 h-6 rounded-full bg-teal-500/20 text-teal-400 text-xs font-bold flex items-center justify-center border border-teal-500/30">
                  2
                </span>
                <h3 className="text-base font-bold text-white">Select Payment Mode</h3>
              </div>

              <span className="text-xs text-teal-400 font-semibold">
                Fee: ₹{consultationFee}
              </span>
            </div>

            {/* Primary Payment Mode Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              
              {/* Mode 1: Pay Now */}
              <div
                onClick={() => setPaymentMode('PAY_NOW')}
                className={`p-4 rounded-2xl border cursor-pointer transition-all ${
                  paymentMode === 'PAY_NOW'
                    ? 'bg-teal-950/30 border-teal-500 shadow-lg shadow-teal-500/10 ring-2 ring-teal-500/30'
                    : 'bg-slate-950 border-slate-800 hover:border-slate-700'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center space-x-3">
                    <div className={`p-2.5 rounded-xl ${paymentMode === 'PAY_NOW' ? 'bg-teal-500 text-slate-950 font-bold' : 'bg-slate-800 text-teal-400'}`}>
                      <CreditCard className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-white">Pay Now (Online)</h4>
                      <p className="text-xs text-slate-400 mt-0.5">UPI QR Barcode / Payment Gateway</p>
                    </div>
                  </div>
                  <div className={`w-5 h-5 rounded-full border flex items-center justify-center ${
                    paymentMode === 'PAY_NOW' ? 'border-teal-400 bg-teal-500 text-slate-950' : 'border-slate-700'
                  }`}>
                    {paymentMode === 'PAY_NOW' && <Check className="w-3 h-3 stroke-[3]" />}
                  </div>
                </div>
                <div className="mt-3 pt-3 border-t border-slate-800/80 flex items-center justify-between text-[11px]">
                  <span className="text-emerald-400 font-medium flex items-center gap-1">
                    <Sparkles className="w-3 h-3" />
                    Instant Priority Confirmation
                  </span>
                  <span className="text-slate-400 font-mono">₹{consultationFee + 25}</span>
                </div>
              </div>

              {/* Mode 2: Pay at Clinic */}
              <div
                onClick={() => setPaymentMode('PAY_AT_CLINIC')}
                className={`p-4 rounded-2xl border cursor-pointer transition-all ${
                  paymentMode === 'PAY_AT_CLINIC'
                    ? 'bg-amber-950/20 border-amber-500 shadow-lg shadow-amber-500/10 ring-2 ring-amber-500/30'
                    : 'bg-slate-950 border-slate-800 hover:border-slate-700'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center space-x-3">
                    <div className={`p-2.5 rounded-xl ${paymentMode === 'PAY_AT_CLINIC' ? 'bg-amber-500 text-slate-950 font-bold' : 'bg-slate-800 text-amber-400'}`}>
                      <Building2 className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-white">Pay at Clinic</h4>
                      <p className="text-xs text-slate-400 mt-0.5">Pay at reception desk upon arrival</p>
                    </div>
                  </div>
                  <div className={`w-5 h-5 rounded-full border flex items-center justify-center ${
                    paymentMode === 'PAY_AT_CLINIC' ? 'border-amber-400 bg-amber-500 text-slate-950' : 'border-slate-700'
                  }`}>
                    {paymentMode === 'PAY_AT_CLINIC' && <Check className="w-3 h-3 stroke-[3]" />}
                  </div>
                </div>
                <div className="mt-3 pt-3 border-t border-slate-800/80 flex items-center justify-between text-[11px]">
                  <span className="text-amber-300 font-medium flex items-center gap-1">
                    <Banknote className="w-3 h-3" />
                    Cash / UPI / Card at Counter
                  </span>
                  <span className="text-slate-400 font-mono">₹{consultationFee}</span>
                </div>
              </div>
            </div>

            {/* If PAY NOW is selected: Show QR Barcode OR Gateway Options */}
            {paymentMode === 'PAY_NOW' && (
              <div className="space-y-4 pt-2 border-t border-slate-800">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider block">
                    Choose Online Payment Option:
                  </label>
                  <span className="text-[11px] text-teal-400 flex items-center gap-1">
                    <Lock className="w-3 h-3" />
                    256-Bit SSL Encrypted
                  </span>
                </div>

                {/* Sub-Tabs: Clinic QR Barcode vs Payment Gateway */}
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setPayNowOption('QR_BARCODE')}
                    className={`py-3 px-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-2 transition-all ${
                      payNowOption === 'QR_BARCODE'
                        ? 'bg-teal-500/20 border-teal-500 text-teal-300 shadow'
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                    }`}
                  >
                    <QrCode className="w-4 h-4 text-teal-400" />
                    <span>Clinic UPI QR Barcode</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setPayNowOption('GATEWAY')}
                    className={`py-3 px-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-2 transition-all ${
                      payNowOption === 'GATEWAY'
                        ? 'bg-teal-500/20 border-teal-500 text-teal-300 shadow'
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                    }`}
                  >
                    <ExternalLink className="w-4 h-4 text-teal-400" />
                    <span>Payment Gateway (Cards/NetBanking)</span>
                  </button>
                </div>

                {/* Option 1: Direct Clinic UPI Barcode / QR Scanner */}
                {payNowOption === 'QR_BARCODE' && (
                  <div className="bg-slate-950 p-5 rounded-2xl border border-teal-500/30 space-y-4">
                    <div className="flex flex-col sm:flex-row items-center gap-5">
                      
                      {/* Interactive Simulated Barcode / QR Code Frame */}
                      <div className="p-3 bg-white rounded-2xl shadow-xl flex flex-col items-center justify-center shrink-0">
                        <div className="relative w-36 h-36 flex items-center justify-center bg-white p-1">
                          {/* SVG QR Code Pattern with UPI Center Icon */}
                          <svg className="w-full h-full text-slate-950" viewBox="0 0 100 100" fill="currentColor">
                            <path d="M0,0 h30 v30 h-30 z M10,10 h10 v10 h-10 z" />
                            <path d="M70,0 h30 v30 h-30 z M80,10 h10 v10 h-10 z" />
                            <path d="M0,70 h30 v30 h-30 z M10,80 h10 v10 h-10 z" />
                            <rect x="40" y="5" width="20" height="8" rx="2" />
                            <rect x="5" y="40" width="8" height="20" rx="2" />
                            <rect x="38" y="38" width="24" height="24" rx="4" fill="#0d9488" />
                            <circle cx="50" cy="50" r="6" fill="white" />
                            <rect x="70" y="45" width="10" height="10" />
                            <rect x="45" y="75" width="15" height="10" />
                            <rect x="75" y="75" width="18" height="18" />
                            <circle cx="20" cy="50" r="3" />
                            <circle cx="50" cy="20" r="3" />
                            <circle cx="85" cy="50" r="3" />
                          </svg>
                        </div>
                        <span className="text-[10px] font-black text-slate-900 uppercase tracking-wider mt-1 font-mono">
                          UPI QR SCANNER
                        </span>
                      </div>

                      {/* QR Instructions & VPA Copy */}
                      <div className="space-y-3 flex-1 text-left">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-white">{clinic.name}</span>
                            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-teal-500/20 text-teal-300 border border-teal-500/30">
                              Verified Clinic UPI
                            </span>
                          </div>
                          <p className="text-xs text-slate-400 mt-1">
                            Scan this QR using <span className="text-white font-medium">Google Pay, PhonePe, Paytm, BHIM, or CRED</span> to pay directly to the clinic account.
                          </p>
                        </div>

                        {/* Clinic VPA ID */}
                        <div className="bg-slate-900 p-2.5 rounded-xl border border-slate-800 flex items-center justify-between">
                          <div>
                            <span className="text-[10px] text-slate-500 block">Clinic Direct UPI ID:</span>
                            <span className="text-xs font-mono font-bold text-teal-300">{clinicVpa}</span>
                          </div>
                          <button
                            type="button"
                            onClick={handleCopyUpi}
                            className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-medium flex items-center gap-1 border border-slate-700"
                          >
                            {copiedUpi ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                            <span>{copiedUpi ? 'Copied!' : 'Copy UPI'}</span>
                          </button>
                        </div>

                        <div>
                          <label className="text-[11px] text-slate-400 block mb-1">
                            UTR / Transaction Reference Number (Optional)
                          </label>
                          <input
                            type="text"
                            placeholder="e.g. 429381048291 or leave empty"
                            value={utrRefNumber}
                            onChange={(e) => setUtrRefNumber(e.target.value)}
                            className="w-full bg-slate-900 border border-slate-800 rounded-xl p-2 text-xs text-slate-200 focus:ring-2 focus:ring-teal-500 focus:outline-none font-mono"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Option 2: Payment Gateway Redirect / Checkout */}
                {payNowOption === 'GATEWAY' && (
                  <div className="bg-slate-950 p-5 rounded-2xl border border-teal-500/30 space-y-4">
                    <div className="flex items-start justify-between">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-bold text-white">Online Payment Gateway</span>
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-bold">
                            Active Gateway
                          </span>
                        </div>
                        <p className="text-xs text-slate-400">
                          Click below to redirect to the secure payment checkout page. Supports all major payment modes:
                        </p>
                      </div>
                      <div className="p-2 rounded-xl bg-teal-500/10 text-teal-400">
                        <ShieldCheck className="w-6 h-6" />
                      </div>
                    </div>

                    {/* Supported channels showcase */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                      <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 flex items-center gap-2">
                        <Smartphone className="w-4 h-4 text-teal-400 shrink-0" />
                        <div>
                          <span className="text-white font-bold block text-[11px]">UPI / Apps</span>
                          <span className="text-[10px] text-slate-500">GPay, PhonePe, Paytm</span>
                        </div>
                      </div>
                      <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 flex items-center gap-2">
                        <CreditCard className="w-4 h-4 text-blue-400 shrink-0" />
                        <div>
                          <span className="text-white font-bold block text-[11px]">Cards</span>
                          <span className="text-[10px] text-slate-500">Credit & Debit</span>
                        </div>
                      </div>
                      <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 flex items-center gap-2">
                        <Building2 className="w-4 h-4 text-amber-400 shrink-0" />
                        <div>
                          <span className="text-white font-bold block text-[11px]">Net Banking</span>
                          <span className="text-[10px] text-slate-500">50+ Indian Banks</span>
                        </div>
                      </div>
                      <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 flex items-center gap-2">
                        <Wallet className="w-4 h-4 text-purple-400 shrink-0" />
                        <div>
                          <span className="text-white font-bold block text-[11px]">Wallets</span>
                          <span className="text-[10px] text-slate-500">Amazon, Mobikwik</span>
                        </div>
                      </div>
                    </div>

                    {/* Prominent Redirect Button */}
                    <button
                      type="button"
                      onClick={() => {
                        if (!patientName.trim() || !patientPhone.trim()) {
                          alert('Please enter your Patient Name and Phone Number first.');
                          return;
                        }
                        setShowGatewayModal(true);
                      }}
                      className="w-full py-3 px-4 bg-gradient-to-r from-teal-500 to-emerald-400 hover:from-teal-400 hover:to-emerald-300 text-slate-950 font-black rounded-xl text-xs shadow-lg shadow-teal-500/20 flex items-center justify-center gap-2 transition-all cursor-pointer"
                    >
                      <ExternalLink className="w-4 h-4" />
                      <span>Open Payment Gateway Checkout Page (₹{totalAmount})</span>
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* If PAY AT CLINIC is selected: Show friendly counter advice */}
            {paymentMode === 'PAY_AT_CLINIC' && (
              <div className="bg-slate-950 p-5 rounded-2xl border border-amber-500/30 space-y-3">
                <div className="flex items-center space-x-2 text-amber-300">
                  <Building2 className="w-5 h-5 text-amber-400" />
                  <h4 className="text-sm font-bold">Pay at Reception Counter</h4>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">
                  You do not need to make any payment right now. When you arrive at <span className="text-white font-semibold">{clinic.name}</span>, proceed to the reception desk and provide your token number to complete payment via <span className="text-amber-300 font-semibold">Cash, UPI QR, or Debit/Credit Card</span>.
                </p>
                <div className="pt-2 flex items-center justify-between text-xs text-slate-400 border-t border-slate-800">
                  <span>Consultation Fee Payable at Counter:</span>
                  <span className="text-base font-bold text-white">₹{consultationFee}</span>
                </div>
              </div>
            )}

            {/* Price Summary Breakdown */}
            <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-2 text-xs">
              <div className="flex justify-between text-slate-400">
                <span>Doctor Consultation Fee</span>
                <span>₹{consultationFee}</span>
              </div>
              {paymentMode === 'PAY_NOW' && (
                <div className="flex justify-between text-slate-400">
                  <span>Cloud Queue Real-Time SMS Pass</span>
                  <span>₹{platformFee}</span>
                </div>
              )}
              <div className="flex justify-between text-white font-bold text-sm pt-2 border-t border-slate-800">
                <span>{paymentMode === 'PAY_NOW' ? 'Total Amount Payable Online' : 'Payable at Clinic Reception'}</span>
                <span className={paymentMode === 'PAY_NOW' ? 'text-emerald-400 text-base' : 'text-amber-400 text-base'}>
                  ₹{totalAmount}
                </span>
              </div>
            </div>

            {/* Submit Payment & Issue Token Button */}
            <button
              type="submit"
              disabled={isProcessingPayment || !patientName.trim() || !patientPhone.trim()}
              className={`w-full font-black py-4 px-4 rounded-xl shadow-lg transition-all flex items-center justify-center space-x-2 text-sm disabled:opacity-50 cursor-pointer ${
                paymentMode === 'PAY_NOW'
                  ? 'bg-gradient-to-r from-teal-500 to-emerald-400 hover:from-teal-400 hover:to-emerald-300 text-slate-950 shadow-teal-500/20'
                  : 'bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 hover:to-amber-300 text-slate-950 shadow-amber-500/20'
              }`}
            >
              {paymentMode === 'PAY_NOW' ? (
                <>
                  <Lock className="w-4 h-4" />
                  <span>
                    {isProcessingPayment
                      ? processingStatusText
                      : payNowOption === 'QR_BARCODE'
                      ? `Confirm QR Payment & Generate Token (₹${totalAmount})`
                      : `Proceed to Gateway & Pay ₹${totalAmount}`}
                  </span>
                </>
              ) : (
                <>
                  <Building2 className="w-4 h-4" />
                  <span>
                    {isProcessingPayment
                      ? processingStatusText
                      : `Confirm Appointment & Generate Token (Pay ₹${consultationFee} at Clinic)`}
                  </span>
                </>
              )}
            </button>
          </div>
        </form>
      )}

      {/* Hosted Payment Gateway Overlay Modal */}
      {showGatewayModal && (
        <PaymentGatewayPage
          amount={totalAmount}
          doctorName={clinic.doctorName}
          clinicName={clinic.name}
          patientName={patientName}
          patientPhone={patientPhone}
          consultationFee={consultationFee}
          convenienceFee={platformFee}
          onPaymentSuccess={handleGatewayPaymentSuccess}
          onCancel={() => setShowGatewayModal(false)}
        />
      )}
    </div>
  );
};
