import React, { useEffect, useState } from 'react';

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
  trackingId?: string;
  onBack: () => void;
}

export const PatientTracking: React.FC<PatientTrackingProps> = ({ trackingId, onBack }) => {
  const [tracking, setTracking] = useState<TrackingData | null>(null);
  const [unavailable, setUnavailable] = useState(false);
  const [lookupId, setLookupId] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  useEffect(() => {
    if (!trackingId) return;
    let disposed = false;
    const loadTracking = async () => {
      try {
        const response = await fetch(`/api/patient/track/${encodeURIComponent(trackingId)}`, { cache: 'no-store' });
        if (!response.ok) throw new Error('Tracking unavailable');
        const data = await response.json() as TrackingData;
        if (!disposed) {
          setTracking(data);
          setUnavailable(false);
        }
      } catch {
        if (!disposed) {
          setTracking(null);
          setUnavailable(true);
        }
      }
    };

    loadTracking();
    const interval = window.setInterval(loadTracking, 10000);
    return () => {
      disposed = true;
      window.clearInterval(interval);
    };
  }, [trackingId]);

  const findBooking = async (event: React.FormEvent) => {
    event.preventDefault();
    const normalizedId = lookupId.trim();
    if (!normalizedId) return;
    setIsSearching(true);
    setUnavailable(false);
    try {
      const response = await fetch(`/api/patient/track/${encodeURIComponent(normalizedId)}`, { cache: 'no-store' });
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
        {!trackingId && !tracking && (
          <form onSubmit={findBooking} className="rounded-2xl border border-slate-800 bg-slate-900 p-6 space-y-4">
            <div>
              <h1 className="text-2xl font-bold">Track your booking</h1>
              <p className="mt-1 text-sm text-slate-400">Enter the tracking ID from your booking confirmation.</p>
            </div>
            <input
              value={lookupId}
              onChange={(event) => setLookupId(event.target.value)}
              placeholder="Tracking ID"
              autoComplete="off"
              className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white placeholder-slate-500 focus:border-teal-400 focus:outline-none"
            />
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
