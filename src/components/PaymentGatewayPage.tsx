import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  Lock,
  CreditCard,
  Smartphone,
  Building2,
  Wallet,
  Clock,
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
  QrCode,
  Check,
  ChevronRight,
  Sparkles,
  RefreshCw,
  ExternalLink,
  Shield,
  HelpCircle
} from 'lucide-react';
import { Clinic, TokenItem } from '../types/queue';

interface PaymentGatewayPageProps {
  clinic: Clinic;
  patientName: string;
  patientPhone: string;
  patientAge: string;
  patientGender: 'Male' | 'Female' | 'Other';
  primaryConcern?: string;
  amount: number;
  consultationFee: number;
  platformFee: number;
  onSuccess: (paymentMethodUsed: string, transactionId: string) => void;
  onCancel: () => void;
}

export const PaymentGatewayPage: React.FC<PaymentGatewayPageProps> = ({
  clinic,
  patientName,
  patientPhone,
  amount,
  consultationFee,
  platformFee,
  onSuccess,
  onCancel,
}) => {
  const [activeTab, setActiveTab] = useState<'UPI' | 'CARDS' | 'NETBANKING' | 'WALLETS'>('UPI');
  
  // Timer countdown: 10 minutes
  const [timeLeft, setTimeLeft] = useState(600);

  // UPI State
  const [upiOption, setUpiOption] = useState<'QR' | 'APP' | 'VPA'>('QR');
  const [upiVpa, setUpiVpa] = useState('');
  const [vpaVerified, setVpaVerified] = useState(false);
  const [selectedUpiApp, setSelectedUpiApp] = useState('Google Pay');

  // Card State
  const [cardNumber, setCardNumber] = useState('');
  const [cardHolder, setCardHolder] = useState(patientName || '');
  const [cardExpiry, setCardExpiry] = useState('');
  const [cardCvv, setCardCvv] = useState('');
  const [saveCard, setSaveCard] = useState(true);

  // Netbanking State
  const [selectedBank, setSelectedBank] = useState('HDFC Bank');
  const [otherBank, setOtherBank] = useState('');

  // Wallets State
  const [selectedWallet, setSelectedWallet] = useState('Amazon Pay');

  // Payment Processing & 3D Secure Simulation
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingStage, setProcessingStage] = useState<'INITIAL' | 'OTP' | 'SUCCESS'>('INITIAL');
  const [otpValue, setOtpValue] = useState('');
  const [orderId] = useState(() => 'ORD-CARE-' + Math.floor(100000 + Math.random() * 900000));
  const [txId] = useState(() => 'TXN_' + Date.now().toString(36).toUpperCase() + Math.floor(1000 + Math.random() * 9000));

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const formatTimer = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleCardNumberChange = (val: string) => {
    const cleaned = val.replace(/\D/g, '').slice(0, 16);
    const formatted = cleaned.match(/.{1,4}/g)?.join(' ') || cleaned;
    setCardNumber(formatted);
  };

  const handleExpiryChange = (val: string) => {
    const cleaned = val.replace(/\D/g, '').slice(0, 4);
    if (cleaned.length >= 2) {
      setCardExpiry(`${cleaned.slice(0, 2)}/${cleaned.slice(2)}`);
    } else {
      setCardExpiry(cleaned);
    }
  };

  const handleVerifyVpa = () => {
    if (upiVpa.includes('@')) {
      setVpaVerified(true);
    }
  };

  const handleInitiatePay = (methodName: string) => {
    setIsProcessing(true);
    
    // If card payment, simulate 3D Secure OTP step
    if (activeTab === 'CARDS') {
      setTimeout(() => {
        setProcessingStage('OTP');
      }, 1200);
    } else {
      // Simulate direct bank confirmation
      setTimeout(() => {
        setProcessingStage('SUCCESS');
        setTimeout(() => {
          onSuccess(methodName, txId);
        }, 1200);
      }, 2000);
    }
  };

  const handleVerifyOtp = (e: React.FormEvent) => {
    e.preventDefault();
    setProcessingStage('SUCCESS');
    setTimeout(() => {
      onSuccess('CARD', txId);
    }, 1200);
  };

  const popularBanks = [
    { name: 'HDFC Bank', code: 'HDFC', badge: 'Popular' },
    { name: 'State Bank of India', code: 'SBI', badge: 'High Success' },
    { name: 'ICICI Bank', code: 'ICICI', badge: 'Instant' },
    { name: 'Axis Bank', code: 'AXIS', badge: 'Fast' },
    { name: 'Kotak Mahindra', code: 'KOTAK', badge: '' },
    { name: 'Punjab National Bank', code: 'PNB', badge: '' },
  ];

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/95 backdrop-blur-md overflow-y-auto flex items-center justify-center p-3 sm:p-6 animate-in fade-in duration-200">
      <div className="w-full max-w-4xl bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col my-auto">
        
        {/* Gateway Top Bar */}
        <div className="bg-gradient-to-r from-slate-950 via-slate-900 to-slate-950 p-4 sm:p-5 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <button
              onClick={onCancel}
              className="p-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 transition-colors"
              title="Cancel and return"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm sm:text-base font-black text-white">{clinic.name}</span>
                <span className="bg-emerald-500/20 text-emerald-300 text-[10px] font-bold px-2 py-0.5 rounded-full border border-emerald-500/30 flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3" />
                  Verified Merchant
                </span>
              </div>
              <p className="text-[11px] text-slate-400 font-mono mt-0.5">
                Order ID: <span className="text-slate-300">{orderId}</span>
              </p>
            </div>
          </div>

          <div className="text-right">
            <div className="text-xs text-slate-400 font-medium">Amount to Pay</div>
            <div className="text-xl sm:text-2xl font-black text-teal-300 font-mono">
              ₹{amount.toFixed(2)}
            </div>
          </div>
        </div>

        {/* Security & Timer Bar */}
        <div className="bg-slate-950 px-4 py-2 border-b border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
          <div className="flex items-center gap-1.5 text-emerald-400 font-semibold">
            <Lock className="w-3.5 h-3.5" />
            <span>256-Bit SSL Secured Payment Gateway</span>
          </div>
          <div className="flex items-center gap-1.5 font-mono">
            <Clock className="w-3.5 h-3.5 text-amber-400" />
            <span className="text-slate-300">Session expires in:</span>
            <span className="text-amber-400 font-bold">{formatTimer(timeLeft)}</span>
          </div>
        </div>

        {/* Gateway Body */}
        {processingStage === 'OTP' ? (
          /* 3D Secure / OTP Simulation Screen */
          <div className="p-8 sm:p-12 text-center space-y-6 max-w-md mx-auto">
            <div className="w-14 h-14 rounded-2xl bg-teal-500/10 text-teal-400 border border-teal-500/30 flex items-center justify-center mx-auto shadow-lg">
              <Shield className="w-7 h-7" />
            </div>
            <div>
              <h3 className="text-xl font-black text-white">3D Secure Bank Verification</h3>
              <p className="text-xs text-slate-400 mt-1">
                Enter the One-Time Password (OTP) sent to registered mobile linked with your card.
              </p>
            </div>

            <form onSubmit={handleVerifyOtp} className="space-y-4 text-left bg-slate-950 p-5 rounded-2xl border border-slate-800">
              <div className="flex justify-between text-xs text-slate-400 border-b border-slate-800 pb-2">
                <span>Merchant:</span>
                <span className="text-white font-bold">{clinic.name}</span>
              </div>
              <div className="flex justify-between text-xs text-slate-400 border-b border-slate-800 pb-2">
                <span>Transaction Amount:</span>
                <span className="text-emerald-400 font-bold font-mono">₹{amount.toFixed(2)}</span>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider block mb-1.5">
                  Enter 6-Digit OTP (Test Simulator: Any 6 Digits)
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    maxLength={6}
                    autoFocus
                    placeholder="789421"
                    value={otpValue}
                    onChange={(e) => setOtpValue(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 text-center text-lg font-mono tracking-widest text-teal-300 focus:ring-2 focus:ring-teal-500 focus:outline-none"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => setOtpValue('842915')}
                  className="text-[11px] text-teal-400 hover:text-teal-300 underline mt-1.5 block"
                >
                  ⚡ Auto-fill sample OTP (842915)
                </button>
              </div>

              <div className="flex space-x-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsProcessing(false);
                    setProcessingStage('INITIAL');
                  }}
                  className="flex-1 py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-3 bg-teal-500 hover:bg-teal-400 text-slate-950 rounded-xl text-xs font-black shadow-lg shadow-teal-500/20"
                >
                  Authorize & Pay
                </button>
              </div>
            </form>
          </div>
        ) : processingStage === 'SUCCESS' ? (
          /* Success Screen */
          <div className="p-8 sm:p-12 text-center space-y-4 max-w-md mx-auto">
            <div className="w-16 h-16 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center mx-auto animate-bounce">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <h3 className="text-2xl font-black text-white">Payment Authorized!</h3>
            <p className="text-xs text-slate-400">
              Transaction ID: <span className="font-mono text-teal-300">{txId}</span>
            </p>
            <p className="text-xs text-slate-300">
              Generating your live queue token and dispatching WhatsApp confirmation...
            </p>
          </div>
        ) : (
          /* Normal Gateway UI */
          <div className="grid grid-cols-1 md:grid-cols-12 min-h-[460px]">
            
            {/* Left Column: Payment Methods Nav */}
            <div className="md:col-span-4 bg-slate-950/70 border-r border-slate-800 p-3 sm:p-4 space-y-1.5">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block px-3 py-1">
                Payment Options
              </span>

              <button
                onClick={() => setActiveTab('UPI')}
                className={`w-full text-left p-3.5 rounded-2xl font-semibold text-xs flex items-center justify-between transition-all ${
                  activeTab === 'UPI'
                    ? 'bg-teal-500 text-slate-950 shadow-md font-bold'
                    : 'text-slate-300 hover:bg-slate-800/60'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Smartphone className="w-4 h-4" />
                  <div>
                    <span className="block">UPI / QR Code</span>
                    <span className={`text-[10px] ${activeTab === 'UPI' ? 'text-slate-900 font-medium' : 'text-slate-500'}`}>
                      GPay, PhonePe, Paytm, BHIM
                    </span>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 opacity-70" />
              </button>

              <button
                onClick={() => setActiveTab('CARDS')}
                className={`w-full text-left p-3.5 rounded-2xl font-semibold text-xs flex items-center justify-between transition-all ${
                  activeTab === 'CARDS'
                    ? 'bg-teal-500 text-slate-950 shadow-md font-bold'
                    : 'text-slate-300 hover:bg-slate-800/60'
                }`}
              >
                <div className="flex items-center gap-3">
                  <CreditCard className="w-4 h-4" />
                  <div>
                    <span className="block">Credit / Debit Card</span>
                    <span className={`text-[10px] ${activeTab === 'CARDS' ? 'text-slate-900 font-medium' : 'text-slate-500'}`}>
                      Visa, MasterCard, RuPay
                    </span>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 opacity-70" />
              </button>

              <button
                onClick={() => setActiveTab('NETBANKING')}
                className={`w-full text-left p-3.5 rounded-2xl font-semibold text-xs flex items-center justify-between transition-all ${
                  activeTab === 'NETBANKING'
                    ? 'bg-teal-500 text-slate-950 shadow-md font-bold'
                    : 'text-slate-300 hover:bg-slate-800/60'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Building2 className="w-4 h-4" />
                  <div>
                    <span className="block">Net Banking</span>
                    <span className={`text-[10px] ${activeTab === 'NETBANKING' ? 'text-slate-900 font-medium' : 'text-slate-500'}`}>
                      All Indian Banks
                    </span>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 opacity-70" />
              </button>

              <button
                onClick={() => setActiveTab('WALLETS')}
                className={`w-full text-left p-3.5 rounded-2xl font-semibold text-xs flex items-center justify-between transition-all ${
                  activeTab === 'WALLETS'
                    ? 'bg-teal-500 text-slate-950 shadow-md font-bold'
                    : 'text-slate-300 hover:bg-slate-800/60'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Wallet className="w-4 h-4" />
                  <div>
                    <span className="block">Wallets</span>
                    <span className={`text-[10px] ${activeTab === 'WALLETS' ? 'text-slate-900 font-medium' : 'text-slate-500'}`}>
                      Amazon Pay, Paytm, Mobikwik
                    </span>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 opacity-70" />
              </button>

              {/* Order Breakdown on side */}
              <div className="pt-4 mt-4 border-t border-slate-800 px-3 text-xs space-y-1.5">
                <div className="flex justify-between text-slate-400 text-[11px]">
                  <span>Patient:</span>
                  <span className="text-white font-medium truncate max-w-[120px]">{patientName}</span>
                </div>
                <div className="flex justify-between text-slate-400 text-[11px]">
                  <span>Consultation Fee:</span>
                  <span className="text-slate-200">₹{consultationFee}</span>
                </div>
                <div className="flex justify-between text-slate-400 text-[11px]">
                  <span>Platform & SMS:</span>
                  <span className="text-slate-200">₹{platformFee}</span>
                </div>
                <div className="flex justify-between text-white font-bold text-xs pt-1.5 border-t border-slate-800/80">
                  <span>Total Amount:</span>
                  <span className="text-teal-300 font-mono">₹{amount.toFixed(2)}</span>
                </div>
              </div>
            </div>

            {/* Right Column: Selected Payment Method Screen */}
            <div className="md:col-span-8 p-5 sm:p-7 flex flex-col justify-between">
              
              {/* TAB 1: UPI */}
              {activeTab === 'UPI' && (
                <div className="space-y-5">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-bold text-white flex items-center gap-2">
                      <Smartphone className="w-4 h-4 text-teal-400" />
                      Pay via Unified Payments Interface (UPI)
                    </h4>
                    <span className="text-[10px] text-teal-400 bg-teal-500/10 px-2 py-0.5 rounded border border-teal-500/20 font-semibold">
                      Zero Surcharge
                    </span>
                  </div>

                  {/* UPI Sub-selector: QR vs Apps vs VPA */}
                  <div className="grid grid-cols-3 gap-2">
                    <button
                      type="button"
                      onClick={() => setUpiOption('QR')}
                      className={`p-2.5 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 ${
                        upiOption === 'QR'
                          ? 'bg-teal-500/20 border-teal-500 text-teal-300'
                          : 'bg-slate-950 border-slate-800 text-slate-400'
                      }`}
                    >
                      <QrCode className="w-3.5 h-3.5" />
                      <span>Instant QR</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setUpiOption('APP')}
                      className={`p-2.5 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 ${
                        upiOption === 'APP'
                          ? 'bg-teal-500/20 border-teal-500 text-teal-300'
                          : 'bg-slate-950 border-slate-800 text-slate-400'
                      }`}
                    >
                      <Smartphone className="w-3.5 h-3.5" />
                      <span>UPI Apps</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setUpiOption('VPA')}
                      className={`p-2.5 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 ${
                        upiOption === 'VPA'
                          ? 'bg-teal-500/20 border-teal-500 text-teal-300'
                          : 'bg-slate-950 border-slate-800 text-slate-400'
                      }`}
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>UPI ID / VPA</span>
                    </button>
                  </div>

                  {/* QR Option */}
                  {upiOption === 'QR' && (
                    <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 flex flex-col sm:flex-row items-center gap-4 text-center sm:text-left">
                      <div className="bg-white p-2.5 rounded-2xl shadow-xl shrink-0">
                        <svg className="w-32 h-32 text-slate-950" viewBox="0 0 100 100" fill="currentColor">
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
                        </svg>
                      </div>

                      <div className="space-y-2">
                        <div className="text-xs font-bold text-white">Scan & Pay using Any UPI App</div>
                        <p className="text-xs text-slate-400">
                          Scan the QR Code with PhonePe, Google Pay, Paytm, BHIM or Cred to complete ₹{amount.toFixed(2)} payment.
                        </p>
                        <div className="flex items-center gap-2 pt-1">
                          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                          <span className="text-[11px] text-emerald-400 font-medium">Listening for live incoming payment...</span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* UPI Apps option */}
                  {upiOption === 'APP' && (
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                      {['Google Pay', 'PhonePe', 'Paytm', 'BHIM UPI'].map((appName) => (
                        <div
                          key={appName}
                          onClick={() => setSelectedUpiApp(appName)}
                          className={`p-3 rounded-2xl border text-center cursor-pointer transition-all ${
                            selectedUpiApp === appName
                              ? 'bg-teal-500/20 border-teal-500 text-teal-300 shadow'
                              : 'bg-slate-950 border-slate-800 text-slate-300 hover:border-slate-700'
                          }`}
                        >
                          <Smartphone className="w-5 h-5 mx-auto text-teal-400 mb-1" />
                          <span className="text-xs font-bold block">{appName}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* UPI VPA input */}
                  {upiOption === 'VPA' && (
                    <div className="space-y-2">
                      <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider block">
                        Enter UPI ID / VPA
                      </label>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          placeholder="e.g. mobile@upi or name@okhdfcbank"
                          value={upiVpa}
                          onChange={(e) => {
                            setUpiVpa(e.target.value);
                            setVpaVerified(false);
                          }}
                          className="flex-1 bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-teal-300 font-mono focus:ring-2 focus:ring-teal-500 focus:outline-none"
                        />
                        <button
                          type="button"
                          onClick={handleVerifyVpa}
                          className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-bold border border-slate-700"
                        >
                          {vpaVerified ? 'Verified ✓' : 'Verify'}
                        </button>
                      </div>
                      <div className="flex flex-wrap gap-1.5 pt-1">
                        {['@okhdfcbank', '@okaxis', '@ybl', '@paytm', '@ibl'].map((handle) => (
                          <button
                            key={handle}
                            type="button"
                            onClick={() => {
                              const base = upiVpa.split('@')[0] || 'patient';
                              setUpiVpa(base + handle);
                              setVpaVerified(true);
                            }}
                            className="text-[10px] bg-slate-950 hover:bg-slate-800 text-slate-400 hover:text-teal-300 px-2 py-1 rounded-md border border-slate-800"
                          >
                            {handle}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* TAB 2: CARDS */}
              {activeTab === 'CARDS' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-bold text-white flex items-center gap-2">
                      <CreditCard className="w-4 h-4 text-teal-400" />
                      Enter Credit / Debit Card Details
                    </h4>
                    <div className="flex items-center gap-1.5 text-[10px] text-slate-400">
                      <span className="px-1.5 py-0.5 bg-slate-950 rounded border border-slate-800 font-bold text-white">VISA</span>
                      <span className="px-1.5 py-0.5 bg-slate-950 rounded border border-slate-800 font-bold text-white">Mastercard</span>
                      <span className="px-1.5 py-0.5 bg-slate-950 rounded border border-slate-800 font-bold text-white">RuPay</span>
                    </div>
                  </div>

                  <div className="space-y-3 bg-slate-950 p-4 rounded-2xl border border-slate-800">
                    <div>
                      <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-1">
                        Card Number
                      </label>
                      <input
                        type="text"
                        placeholder="4532 8901 2345 6789"
                        value={cardNumber}
                        onChange={(e) => handleCardNumberChange(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-800 rounded-xl p-2.5 text-xs text-white font-mono tracking-wider focus:ring-2 focus:ring-teal-500 focus:outline-none"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-1">
                          Expiry Date
                        </label>
                        <input
                          type="text"
                          placeholder="MM/YY"
                          value={cardExpiry}
                          onChange={(e) => handleExpiryChange(e.target.value)}
                          className="w-full bg-slate-900 border border-slate-800 rounded-xl p-2.5 text-xs text-white font-mono focus:ring-2 focus:ring-teal-500 focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-1 flex items-center justify-between">
                          <span>CVV / CVC</span>
                          <span className="text-[9px] text-slate-500">3 or 4 digits</span>
                        </label>
                        <input
                          type="password"
                          maxLength={4}
                          placeholder="•••"
                          value={cardCvv}
                          onChange={(e) => setCardCvv(e.target.value.replace(/\D/g, ''))}
                          className="w-full bg-slate-900 border border-slate-800 rounded-xl p-2.5 text-xs text-white font-mono focus:ring-2 focus:ring-teal-500 focus:outline-none"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-1">
                        Cardholder Name
                      </label>
                      <input
                        type="text"
                        placeholder="Name on card"
                        value={cardHolder}
                        onChange={(e) => setCardHolder(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-800 rounded-xl p-2.5 text-xs text-white focus:ring-2 focus:ring-teal-500 focus:outline-none"
                      />
                    </div>

                    <div className="flex items-center space-x-2 pt-1">
                      <input
                        type="checkbox"
                        id="saveCardBox"
                        checked={saveCard}
                        onChange={(e) => setSaveCard(e.target.checked)}
                        className="rounded bg-slate-900 border-slate-700 text-teal-500 focus:ring-teal-500"
                      />
                      <label htmlFor="saveCardBox" className="text-[11px] text-slate-400">
                        Securely tokenize this card for instant checkouts (as per RBI guidelines)
                      </label>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 3: NETBANKING */}
              {activeTab === 'NETBANKING' && (
                <div className="space-y-4">
                  <h4 className="text-sm font-bold text-white flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-teal-400" />
                    Select Your Bank
                  </h4>

                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                    {popularBanks.map((bank) => (
                      <div
                        key={bank.name}
                        onClick={() => setSelectedBank(bank.name)}
                        className={`p-3 rounded-2xl border text-left cursor-pointer transition-all ${
                          selectedBank === bank.name
                            ? 'bg-teal-500/20 border-teal-500 text-teal-300 ring-1 ring-teal-500/30'
                            : 'bg-slate-950 border-slate-800 text-slate-300 hover:border-slate-700'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-mono font-bold text-xs">{bank.code}</span>
                          {bank.badge && (
                            <span className="text-[9px] text-emerald-400 bg-emerald-500/10 px-1 rounded">
                              {bank.badge}
                            </span>
                          )}
                        </div>
                        <span className="text-xs font-semibold block mt-1 truncate">{bank.name}</span>
                      </div>
                    ))}
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-1">
                      Or Select Other Bank
                    </label>
                    <select
                      value={otherBank}
                      onChange={(e) => {
                        setOtherBank(e.target.value);
                        setSelectedBank(e.target.value);
                      }}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white focus:ring-2 focus:ring-teal-500 focus:outline-none"
                    >
                      <option value="">-- Choose from all Indian Banks --</option>
                      <option value="Bank of Baroda">Bank of Baroda</option>
                      <option value="Canara Bank">Canara Bank</option>
                      <option value="Union Bank of India">Union Bank of India</option>
                      <option value="IndusInd Bank">IndusInd Bank</option>
                      <option value="IDFC FIRST Bank">IDFC FIRST Bank</option>
                      <option value="Federal Bank">Federal Bank</option>
                      <option value="Yes Bank">Yes Bank</option>
                    </select>
                  </div>
                </div>
              )}

              {/* TAB 4: WALLETS */}
              {activeTab === 'WALLETS' && (
                <div className="space-y-4">
                  <h4 className="text-sm font-bold text-white flex items-center gap-2">
                    <Wallet className="w-4 h-4 text-teal-400" />
                    Select Digital Wallet
                  </h4>

                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                    {['Amazon Pay', 'Paytm Wallet', 'Mobikwik', 'PhonePe Wallet', 'Freecharge', 'Airtel Money'].map(
                      (walletName) => (
                        <div
                          key={walletName}
                          onClick={() => setSelectedWallet(walletName)}
                          className={`p-3.5 rounded-2xl border text-center cursor-pointer transition-all ${
                            selectedWallet === walletName
                              ? 'bg-teal-500/20 border-teal-500 text-teal-300 ring-1 ring-teal-500/30'
                              : 'bg-slate-950 border-slate-800 text-slate-300 hover:border-slate-700'
                          }`}
                        >
                          <Wallet className="w-5 h-5 mx-auto text-teal-400 mb-1" />
                          <span className="text-xs font-bold block">{walletName}</span>
                        </div>
                      )
                    )}
                  </div>
                </div>
              )}

              {/* Bottom Payment Action Button */}
              <div className="pt-6 mt-6 border-t border-slate-800/80 flex flex-col sm:flex-row items-center justify-between gap-3">
                <div className="text-xs text-slate-400 flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  <span>Encrypted 256-bit bank handshake</span>
                </div>

                <button
                  type="button"
                  disabled={isProcessing}
                  onClick={() => handleInitiatePay(activeTab)}
                  className="w-full sm:w-auto px-8 py-3.5 bg-gradient-to-r from-teal-500 to-emerald-400 hover:from-teal-400 hover:to-emerald-300 text-slate-950 font-black rounded-xl text-sm shadow-xl shadow-teal-500/20 flex items-center justify-center gap-2 disabled:opacity-50 transition-all cursor-pointer"
                >
                  {isProcessing ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Connecting to Bank Gateway...</span>
                    </>
                  ) : (
                    <>
                      <Lock className="w-4 h-4" />
                      <span>Pay ₹{amount.toFixed(2)} Securely</span>
                    </>
                  )}
                </button>
              </div>

            </div>

          </div>
        )}

      </div>
    </div>
  );
};
