import React, { useState, useEffect, useRef } from 'react';
import {
  Tv,
  Maximize2,
  Minimize2,
  Volume2,
  VolumeX,
  Activity,
  QrCode,
  Clock,
  Stethoscope,
  Sparkles,
  ArrowRight
} from 'lucide-react';
import { Clinic, TokenItem, QueueSession } from '../types/queue';
import { soundManager } from '../lib/audio';

interface TvDisplayViewProps {
  clinic: Clinic;
  session: QueueSession | null;
  tokens: TokenItem[];
  onExitTvMode?: () => void;
}

export const TvDisplayView: React.FC<TvDisplayViewProps> = ({
  clinic,
  session,
  tokens,
  onExitTvMode,
}) => {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [currentTime, setCurrentTime] = useState(new Date().toLocaleTimeString());
  const prevTokenRef = useRef<string | null>(null);

  const activeToken = tokens.find(t => t.status === 'SERVING');
  const waitingTokens = tokens
    .filter(t => t.status === 'WAITING')
    .sort((a, b) => {
      const pA = a.priority ?? 10;
      const pB = b.priority ?? 10;
      if (pA !== pB) return pA - pB;
      return a.sequenceNumber - b.sequenceNumber;
    });

  // Clock ticker
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Voice Announcement on token change
  useEffect(() => {
    if (activeToken && activeToken.tokenNumber !== prevTokenRef.current) {
      if (prevTokenRef.current !== null && soundEnabled) {
        soundManager.announceToken(activeToken.tokenNumber, activeToken.patientName, clinic.cabinNumber);
      }
      prevTokenRef.current = activeToken.tokenNumber;
    }
  }, [activeToken?.tokenNumber, soundEnabled, clinic.cabinNumber]);

  // Fullscreen trigger
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch(() => {});
      setIsFullscreen(false);
    }
  };

  const isDoctorIn = clinic.doctorStatus === 'IN';

  return (
    <div className="fixed inset-0 z-50 bg-slate-950 text-white flex flex-col justify-between p-6 sm:p-10 lg:p-12 overflow-hidden select-none font-sans">
      
      {/* Top TV Header Bar */}
      <header className="flex items-center justify-between border-b border-slate-800/80 pb-6">
        
        {/* Clinic Name & Doctor Details */}
        <div className="flex items-center space-x-5">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-teal-400 to-emerald-400 p-1 shadow-xl shadow-teal-500/20 flex-shrink-0">
            <div className="w-full h-full bg-slate-950 rounded-[12px] flex items-center justify-center">
              <Stethoscope className="w-8 h-8 text-teal-400" />
            </div>
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black tracking-tight text-white">
              {clinic.name}
            </h1>
            <div className="flex items-center space-x-3 mt-1 text-sm sm:text-base text-slate-400">
              <span className="text-teal-300 font-bold">{clinic.doctorName}</span>
              <span>•</span>
              <span className="text-slate-300 font-semibold">{clinic.cabinNumber}</span>
            </div>
          </div>
        </div>

        {/* Right Side: Doctor Status & Clock & Controls */}
        <div className="flex items-center space-x-4 sm:space-x-6">
          
          {/* Doctor Status Banner */}
          <div className={`px-4 sm:px-6 py-2 rounded-2xl border text-sm sm:text-base font-black flex items-center gap-3 shadow-lg ${
            isDoctorIn
              ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
              : 'bg-rose-500/20 text-rose-300 border-rose-500/40'
          }`}>
            <span className={`w-3.5 h-3.5 rounded-full ${isDoctorIn ? 'bg-emerald-400 animate-ping' : 'bg-rose-400'}`} />
            <span>{isDoctorIn ? 'DOCTOR IN CABIN' : 'DOCTOR AWAY'}</span>
          </div>

          {/* Current Live Time with Day & Date */}
          <div className="hidden md:flex flex-col text-right font-mono bg-slate-900/80 px-4 py-2 rounded-2xl border border-slate-800">
            <div className="text-xs text-teal-300 font-bold tracking-wider uppercase">
              {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric', year: 'numeric' })}
            </div>
            <span className="text-2xl font-black text-white">{currentTime}</span>
          </div>

          {/* Audio Toggle */}
          <button
            onClick={() => {
              setSoundEnabled(!soundEnabled);
              if (!soundEnabled && activeToken) {
                soundManager.announceToken(activeToken.tokenNumber, activeToken.patientName, clinic.cabinNumber);
              }
            }}
            title={soundEnabled ? 'Mute Chimes' : 'Enable Chimes'}
            className="p-3 rounded-2xl bg-slate-900 border border-slate-800 text-slate-300 hover:text-white transition-all shadow"
          >
            {soundEnabled ? <Volume2 className="w-6 h-6 text-teal-400" /> : <VolumeX className="w-6 h-6 text-slate-500" />}
          </button>

          {/* Fullscreen Button */}
          <button
            onClick={toggleFullscreen}
            title="Toggle Fullscreen"
            className="p-3 rounded-2xl bg-slate-900 border border-slate-800 text-slate-300 hover:text-white transition-all shadow"
          >
            {isFullscreen ? <Minimize2 className="w-6 h-6" /> : <Maximize2 className="w-6 h-6" />}
          </button>

          {/* Exit TV Mode Button */}
          {onExitTvMode && (
            <button
              onClick={onExitTvMode}
              className="px-4 py-2 rounded-2xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-xs font-bold text-slate-400 hover:text-white transition-all"
            >
              Exit Signage
            </button>
          )}
        </div>
      </header>

      {/* Main Massive Center Display: Currently Serving */}
      <main className="grid grid-cols-1 lg:grid-cols-12 gap-8 my-auto items-center">
        
        {/* Massive Center Token (Col Span 8) */}
        <div className="lg:col-span-8 bg-gradient-to-br from-slate-900 via-slate-900 to-teal-950/40 border-2 border-teal-500/40 rounded-[3rem] p-8 sm:p-12 lg:p-16 text-center shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-96 h-96 bg-teal-500/10 rounded-full blur-3xl pointer-events-none" />

          {/* Serving Pill */}
          <div className="inline-flex items-center space-x-2 px-6 py-2 rounded-full bg-teal-500/20 text-teal-300 border border-teal-500/40 font-mono text-sm sm:text-base font-bold uppercase tracking-widest mb-4">
            <Activity className="w-4 h-4 animate-pulse" />
            <span>NOW CONSULTING IN CABIN</span>
          </div>

          {/* Massive Number */}
          <div className="text-[7rem] sm:text-[10rem] lg:text-[13rem] font-black tracking-tighter text-white leading-none my-2 drop-shadow-[0_15px_30px_rgba(20,184,166,0.3)]">
            {activeToken ? activeToken.tokenNumber : '---'}
          </div>

          {/* Patient Details */}
          <div className="space-y-2 mt-4">
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black text-teal-300">
              {activeToken ? activeToken.patientName : 'Waiting for next patient'}
            </h2>
            <p className="text-base sm:text-xl text-slate-400 font-medium">
              Please proceed inside <span className="text-white font-bold">{clinic.cabinNumber}</span>
            </p>
          </div>
        </div>

        {/* Next Up Tokens Column (Col Span 4) */}
        <div className="lg:col-span-4 space-y-6">
          
          {/* Upcoming Tokens Box */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-xl">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800">
              <span className="text-sm sm:text-base font-black uppercase tracking-wider text-slate-300">
                UPCOMING NEXT
              </span>
              <span className="text-xs font-mono font-bold px-2.5 py-1 rounded-full bg-teal-500/10 text-teal-300 border border-teal-500/20">
                {waitingTokens.length} in queue
              </span>
            </div>

            <div className="mt-4 space-y-3">
              {waitingTokens.length > 0 ? (
                waitingTokens.slice(0, 4).map((tok, idx) => (
                  <div
                    key={tok.id}
                    className="p-4 rounded-2xl bg-slate-950 border border-slate-800/80 flex items-center justify-between shadow"
                  >
                    <div className="flex items-center space-x-3">
                      <span className="w-8 h-8 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 font-bold text-xs flex items-center justify-center">
                        #{idx + 1}
                      </span>
                      <div>
                        <div className="font-bold text-base text-white">{tok.patientName}</div>
                        <div className="text-xs text-slate-500">{tok.tokenType}</div>
                      </div>
                    </div>

                    <div className="text-right">
                      <span className={`font-mono text-xl font-black px-3 py-1 rounded-xl border ${
                        tok.isVip
                          ? 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                          : 'bg-teal-950/40 text-teal-300 border-teal-500/30'
                      }`}>
                        {tok.tokenNumber}
                      </span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="py-8 text-center text-slate-500 text-sm">
                  No other patients in queue.
                </div>
              )}
            </div>
          </div>

          {/* QR Code Tracker for Waiting Room Patients */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-5 flex items-center justify-between gap-4">
            <div>
              <span className="text-xs font-black uppercase tracking-wider text-teal-400 block">
                Track On Your Phone
              </span>
              <p className="text-xs text-slate-400 mt-1">
                Scan this QR code to view real-time countdown & submit symptoms.
              </p>
            </div>
            
            {/* SVG Stylized QR Code */}
            <div className="w-20 h-20 bg-white p-2 rounded-2xl flex-shrink-0 flex items-center justify-center shadow-lg">
              <QrCode className="w-full h-full text-slate-950" />
            </div>
          </div>
        </div>
      </main>

      {/* Bottom Signage Footer Ticker */}
      <footer className="border-t border-slate-800/80 pt-4 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs sm:text-sm text-slate-400 font-medium">
        <div className="flex items-center space-x-2">
          <span className="w-2 h-2 rounded-full bg-teal-400 animate-pulse" />
          <span>Live Queue Display System • Instant Cloud Synchronization</span>
        </div>
        <div>
          <span>Estimated Pacing: ~{clinic.avgConsultationMinutes || 8.5} mins/patient</span>
          {clinic.delayMinutes > 0 && (
            <span className="text-amber-400 font-bold ml-2">
              (⚠️ Delay Broadcast: +{clinic.delayMinutes} mins)
            </span>
          )}
        </div>
      </footer>
    </div>
  );
};
