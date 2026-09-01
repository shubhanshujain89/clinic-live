import React, { useState } from 'react';
import { Clock, AlertTriangle, Send, X, CheckCircle2 } from 'lucide-react';
import { Clinic, TokenItem } from '../types/queue';
import { db, doc, updateDoc } from '../lib/firebase';
import { soundManager } from '../lib/audio';
import { WhatsAppService } from '../lib/whatsappService';

interface DelayBroadcastModalProps {
  clinic: Clinic;
  tokens: TokenItem[];
  onClose: () => void;
}

export const DelayBroadcastModal: React.FC<DelayBroadcastModalProps> = ({
  clinic,
  tokens,
  onClose,
}) => {
  const [delayMinutes, setDelayMinutes] = useState(clinic.delayMinutes || 30);
  const [reason, setReason] = useState(clinic.delayReason || 'Emergency inpatient case attended by doctor');
  const [notifyWhatsApp, setNotifyWhatsApp] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);

  const waitingTokens = tokens.filter(t => t.status === 'WAITING');

  const handleApplyDelay = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsUpdating(true);
    try {
      await updateDoc(doc(db, 'clinics', clinic.id), {
        delayMinutes: Number(delayMinutes),
        delayReason: reason,
      });

      // Sound chime
      soundManager.playChime();

      // Dispatch delay broadcast WhatsApp notifications to ALL waiting patients
      if (notifyWhatsApp && delayMinutes > 0) {
        for (const token of waitingTokens) {
          await WhatsAppService.sendWhatsAppNotification(
            token,
            'DOCTOR_DELAY_ALERT',
            clinic.name,
            clinic.doctorName,
            clinic.cabinNumber,
            `${delayMinutes} mins`
          );
        }
      }

      onClose();
    } catch (err) {
      console.error('Error applying delay broadcast:', err);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleClearDelay = async () => {
    setIsUpdating(true);
    try {
      await updateDoc(doc(db, 'clinics', clinic.id), {
        delayMinutes: 0,
        delayReason: '',
      });
      onClose();
    } catch (err) {
      console.error('Error clearing delay:', err);
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-md w-full p-6 sm:p-8 shadow-2xl space-y-5">
        
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center space-x-2">
            <div className="p-2 rounded-xl bg-purple-500/10 text-purple-400">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">Broadcast Clinic Delay</h3>
              <p className="text-xs text-slate-400">Instantly recalculates all patient live ETAs</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-xl bg-slate-800 text-slate-400 hover:text-white"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleApplyDelay} className="space-y-4">
          
          {/* Quick preset buttons */}
          <div>
            <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider block mb-2">
              Select Delay Increment
            </label>
            <div className="grid grid-cols-4 gap-2">
              {[15, 30, 45, 60].map((mins) => (
                <button
                  key={mins}
                  type="button"
                  onClick={() => setDelayMinutes(mins)}
                  className={`py-2 rounded-xl text-xs font-bold transition-all border ${
                    delayMinutes === mins
                      ? 'bg-purple-500 text-slate-950 border-purple-400 shadow-md'
                      : 'bg-slate-950 border-slate-800 text-slate-300 hover:bg-slate-800'
                  }`}
                >
                  +{mins}m
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider block mb-1">
              Custom Delay (Minutes)
            </label>
            <input
              type="number"
              min="0"
              max="240"
              value={delayMinutes}
              onChange={(e) => setDelayMinutes(Number(e.target.value))}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-white font-mono focus:ring-2 focus:ring-purple-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider block mb-1">
              Reason for Delay
            </label>
            <textarea
              rows={2}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="E.g., Emergency inpatient surgery, traffic delay, complex procedure..."
              className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-white focus:ring-2 focus:ring-purple-500 focus:outline-none resize-none"
            />
          </div>

          {/* WhatsApp broadcast toggle */}
          <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 flex items-center justify-between text-xs">
            <span className="text-slate-300">
              Send WhatsApp Alert to {waitingTokens.length} waiting patients
            </span>
            <input
              type="checkbox"
              checked={notifyWhatsApp}
              onChange={(e) => setNotifyWhatsApp(e.target.checked)}
              className="w-4 h-4 rounded text-teal-500"
            />
          </div>

          <div className="flex space-x-2 pt-2">
            {clinic.delayMinutes > 0 && (
              <button
                type="button"
                onClick={handleClearDelay}
                className="px-4 py-3 bg-rose-500/20 text-rose-300 border border-rose-500/30 rounded-xl text-xs font-bold hover:bg-rose-500/30"
              >
                Clear Delay
              </button>
            )}

            <button
              type="submit"
              disabled={isUpdating}
              className="flex-1 py-3 bg-gradient-to-r from-purple-500 to-indigo-500 text-white rounded-xl text-xs font-black shadow-lg shadow-purple-500/20"
            >
              {isUpdating ? 'Broadcasting...' : `Apply +${delayMinutes}m Delay Broadcast`}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
