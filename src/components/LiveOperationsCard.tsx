import React, { useState } from 'react';
import { Activity, CheckCircle2, ChevronDown, Clock, Users } from 'lucide-react';
import type { TokenItem } from '../types/queue';

interface LiveOperationsCardProps {
  tokens: TokenItem[];
  onSelectToken?: (token: TokenItem) => void;
}

export const LiveOperationsCard: React.FC<LiveOperationsCardProps> = ({ tokens, onSelectToken }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const waitingTokens = tokens
    .filter((token) => token.status === 'WAITING')
    .sort((a, b) => (a.priority ?? 10) - (b.priority ?? 10) || a.sequenceNumber - b.sequenceNumber);
  const activeTokens = tokens.filter((token) => (
    token.status === 'CALLED' || token.status === 'SERVING' || token.status === 'IN_CONSULTATION'
  ));
  const completedTokens = tokens.filter((token) => token.status === 'COMPLETED');
  const averageWaitMinutes = waitingTokens.length
    ? Number((waitingTokens.reduce((total, token) => {
        const createdAt = token.createdAt ? new Date(token.createdAt).getTime() : Date.now();
        return total + Math.max(0, (Date.now() - createdAt) / 60000);
      }, 0) / waitingTokens.length).toFixed(1))
    : 0;
  const visibleTokens = [...activeTokens, ...waitingTokens].slice(0, 3);

  return (
    <section className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/90 shadow-lg">
      <button
        type="button"
        onClick={() => setIsExpanded((expanded) => !expanded)}
        className="w-full text-left transition hover:bg-slate-800/40 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-inset"
        aria-expanded={isExpanded}
        aria-controls="live-operations-details"
      >
        <div className="flex items-center justify-between gap-3 border-b border-slate-800 px-4 py-3 sm:px-5">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">Dashboard</p>
            <h2 className="mt-1 text-lg font-bold text-white">Live operations</h2>
          </div>
          <div className="flex items-center gap-2">
            <span className="rounded-full border border-emerald-400/40 bg-emerald-400/10 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-emerald-300">
              Active
            </span>
            <ChevronDown className={`h-4 w-4 text-slate-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
          </div>
        </div>
        <div className="grid grid-cols-3 gap-2 px-4 py-4 sm:gap-3 sm:px-5">
          <Metric icon={<Users className="h-4 w-4" />} label="Queued" value={waitingTokens.length} />
          <Metric icon={<Activity className="h-4 w-4" />} label="In progress" value={activeTokens.length} />
          <Metric icon={<CheckCircle2 className="h-4 w-4" />} label="Completed" value={completedTokens.length} />
        </div>
      </button>

      {isExpanded && (
        <div id="live-operations-details" className="border-t border-slate-800 px-4 pb-4 sm:px-5">
          <div className="mt-3 space-y-2">
            {visibleTokens.length > 0 ? visibleTokens.map((token) => (
              <button
                key={token.id}
                type="button"
                onClick={() => onSelectToken?.(token)}
                className="flex w-full items-center justify-between rounded-xl border border-slate-800 bg-slate-950/50 px-3 py-2 text-left transition hover:border-teal-500/40 hover:bg-slate-800/50"
              >
                <span className="min-w-0">
                  <span className="block truncate text-sm font-semibold text-white">{token.patientName}</span>
                  <span className="block text-xs text-slate-400">{token.tokenNumber} · {token.status.replaceAll('_', ' ')}</span>
                </span>
                <span className="ml-3 shrink-0 rounded-full border border-teal-500/40 bg-teal-500/10 px-2 py-1 text-xs font-semibold text-teal-300">
                  {token.status === 'WAITING' ? 'Waiting' : 'Active'}
                </span>
              </button>
            )) : (
              <p className="py-3 text-sm text-slate-400">No patients in the live queue.</p>
            )}
          </div>
          <div className="mt-3 flex items-center justify-between rounded-xl border border-teal-500/20 bg-teal-500/10 px-3 py-2 text-sm">
            <span className="flex items-center gap-2 text-teal-200"><Clock className="h-4 w-4" />Average wait</span>
            <strong className="text-teal-300">{averageWaitMinutes} minutes</strong>
          </div>
        </div>
      )}
    </section>
  );
};

interface MetricProps {
  icon: React.ReactNode;
  label: string;
  value: number;
}

const Metric: React.FC<MetricProps> = ({ icon, label, value }) => (
  <div className="rounded-xl border border-slate-800 bg-slate-950/50 px-2 py-3 text-center sm:px-3">
    <span className="mx-auto flex h-7 w-7 items-center justify-center rounded-lg bg-slate-800 text-teal-300">{icon}</span>
    <span className="mt-2 block text-[10px] uppercase tracking-wider text-slate-500">{label}</span>
    <strong className="mt-1 block text-2xl font-black text-white">{value}</strong>
  </div>
);
