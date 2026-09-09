import React, { useEffect, useState } from 'react';
import { PhoneInput } from '../components/PhoneInput';

const getTrackingMobileFromQuery = () => {
  const params = new URLSearchParams(window.location.search);
  const mobile = params.get('mobile') || '';
  return mobile.replace(/\D/g, '').slice(0, 10);
};

interface TrackingData {
  clinic: string;
  doctor: string;
  token: string;
  status: string;
  patientsAhead: number;
  estimatedWaitMinutes: number;
  doctorStatus: string;
  delayMinutes: number;
  estimatedConsultationMinutes: number;
}

interface PatientTrackingProps {
  onBack: () => void;
}

export const PatientTracking: React.FC<PatientTrackingProps> = ({ onBack }) => {
  const [tracking, setTracking] = useState<TrackingData | null>(null);
  const [unavailable, setUnavailable] = useState(false);
  const [mobile, setMobile] = useState(getTrackingMobileFromQuery());
  const [isSearching, setIsSearching] = useState(false);

  useEffect(() => {
    if (!mobile.trim()) return;
    void findBooking();
  }, []);

  useEffect(() => {
    if (!tracking) return;
    const interval = window.setInterval(() => {
      void findBooking();
    }, 30000);
    return () => window.clearInterval(interval);
  }, [tracking]);

  const findBooking = async (event?: React.FormEvent) => {
    event?.preventDefault();
    const normalizedMobile = mobile.trim();
    if (!normalizedMobile) return;
    setIsSearching(true);
    setUnavailable(false);
    try {
      const response = await fetch('/api/patient/track', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mobile: normalizedMobile }),
        cache: 'no-store',
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || 'No booking found for this mobile number today.');
      setTracking(data as TrackingData);
    } catch (error) {
      setTracking(null);
      setUnavailable(true);
    } finally {
      setIsSearching(false);
    }
  };

  return (
    <div className="text-white px-4 py-6">
      <div className="max-w-xl mx-auto space-y-6">
        <button onClick={onBack} className="text-sm text-slate-400 hover:text-white">Back</button>
        {unavailable && (
          <div className="rounded-xl border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm text-amber-200">
            Connection temporarily unavailable.
          </div>
        )}
        {!tracking && (
          <form onSubmit={findBooking} className="rounded-2xl border border-slate-800 bg-slate-900 p-6 space-y-4">
            <div>
              <h1 className="text-2xl font-bold">Track your booking</h1>
              <p className="mt-1 text-sm text-slate-400">Enter the mobile number used for today&apos;s booking.</p>
            </div>
            <PhoneInput value={mobile} onChange={setMobile} className="!bg-slate-950" />
            <button
              type="submit"
              disabled={isSearching}
              className="w-full rounded-xl bg-teal-500 px-4 py-3 font-bold text-slate-950 transition hover:bg-teal-400 disabled:opacity-50"
            >
              {isSearching ? 'Searching...' : 'Track booking'}
            </button>
          </form>
        )}
        {tracking && (
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-6">
            <div>
              <p className="text-sm text-slate-400">{tracking.clinic}</p>
              <h1 className="text-2xl font-bold mt-1">Live queue tracker</h1>
              <p className="text-sm text-slate-400 mt-1">{tracking.doctor}</p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="rounded-xl bg-slate-950 p-4">
                <p className="text-xs text-slate-400 uppercase">Your token</p>
                <p className="text-3xl font-black text-teal-300 mt-2">{tracking.token}</p>
              </div>
              <div className="rounded-xl bg-slate-950 p-4">
                <p className="text-xs text-slate-400 uppercase">Status</p>
                <p className="text-lg font-bold text-white mt-2">{tracking.status}</p>
              </div>
              <div className="rounded-xl bg-slate-950 p-4">
                <p className="text-xs text-slate-400 uppercase">Patients ahead</p>
                <p className="text-2xl font-bold text-white mt-2">{tracking.patientsAhead}</p>
              </div>
              <div className="rounded-xl bg-slate-950 p-4">
                <p className="text-xs text-slate-400 uppercase">Estimated wait</p>
                <p className="text-2xl font-bold text-white mt-2">{tracking.estimatedWaitMinutes} min</p>
              </div>
            </div>
            <div className="border-t border-slate-800 pt-4 space-y-2 text-sm">
              <p className="text-slate-300">Estimated consultation: about {tracking.estimatedConsultationMinutes} min</p>
              <p className="text-slate-300">Doctor status: {tracking.doctorStatus}</p>
              {tracking.delayMinutes > 0 && <p className="text-amber-300">Current delay: +{tracking.delayMinutes} min</p>}
              <p className="text-xs text-slate-500">All times are estimates and may change as the queue moves.</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
