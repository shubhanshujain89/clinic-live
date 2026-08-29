import React from 'react';
import { Check, TrendingUp, Clock3, Sparkles } from 'lucide-react';

interface Props {
  onNavigate: (page: string) => void;
}

export const WhyChooseUsPage: React.FC<Props> = ({ onNavigate }) => {
  const points = [
    'Reduce average wait time by 60%',
    'Increase doctor productivity by 40%',
    'Improve patient satisfaction scores',
    'HIPAA and compliance-ready architecture',
    'Scale smoothly across multi-clinic operations',
    'Deliver a mobile-first patient experience'
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 text-white">
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="mb-10 flex items-center justify-between gap-4 flex-wrap">
          <div>
            <p className="text-cyan-400 uppercase tracking-[0.2em] text-xs font-semibold mb-3">Why Choose Us</p>
            <h1 className="text-4xl md:text-5xl font-bold">Built for smarter clinic operations.</h1>
          </div>
          <button
            onClick={() => onNavigate('landing')}
            className="px-5 py-3 rounded-lg bg-cyan-500 hover:bg-cyan-600 font-semibold transition"
          >
            Back to Home
          </button>
        </div>

        <div className="grid lg:grid-cols-2 gap-8 items-start">
          <div className="space-y-5">
            {points.map((point) => (
              <div key={point} className="flex gap-4 items-start bg-slate-800/40 border border-slate-700 rounded-xl p-4">
                <div className="w-7 h-7 rounded-full bg-emerald-500/15 border border-emerald-400 flex items-center justify-center flex-shrink-0 mt-1">
                  <Check className="w-4 h-4 text-emerald-400" />
                </div>
                <span className="text-lg text-slate-200">{point}</span>
              </div>
            ))}
          </div>

          <div className="bg-gradient-to-br from-emerald-900/30 to-cyan-900/30 border border-emerald-400/30 rounded-2xl p-8">
            <div className="flex items-center gap-3 mb-6">
              <TrendingUp className="w-8 h-8 text-emerald-400" />
              <h2 className="text-2xl font-bold">Operational Impact</h2>
            </div>
            <div className="space-y-5">
              <div className="flex items-center justify-between border-b border-slate-700 pb-3">
                <span className="text-slate-300">Wait time reduction</span>
                <span className="text-emerald-400 font-bold">60%</span>
              </div>
              <div className="flex items-center justify-between border-b border-slate-700 pb-3">
                <span className="text-slate-300">Staff productivity</span>
                <span className="text-cyan-400 font-bold">+40%</span>
              </div>
              <div className="flex items-center justify-between border-b border-slate-700 pb-3">
                <span className="text-slate-300">Patient satisfaction</span>
                <span className="text-emerald-400 font-bold">4.9/5</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-300">No-show reduction</span>
                <span className="text-cyan-400 font-bold">35%</span>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};
