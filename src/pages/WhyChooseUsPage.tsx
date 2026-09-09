import React from 'react';
import { Check, TrendingUp } from 'lucide-react';
import { useSiteConfig } from '../lib/siteConfig';

interface Props {
  onNavigate: (page: string) => void;
}

export const WhyChooseUsPage: React.FC<Props> = ({ onNavigate }) => {
  const { content } = useSiteConfig();
  const points = [
    'Reduce average wait time by 60%',
    'Increase doctor productivity by 40%',
    'Improve patient satisfaction scores',
    'HIPAA and compliance-ready architecture',
    'Scale smoothly across multi-clinic operations',
    'Deliver a mobile-first patient experience'
  ];

  return (
    <div className="public-light-page">
      <section className="public-light-section mx-auto max-w-7xl px-4 py-5 sm:px-6 lg:px-8">
        <div className="mb-5">
          <p className="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-cyan-400">Why Choose Us</p>
          <h1 className="text-2xl font-bold md:text-3xl">{content.whyChooseTitle}</h1>
        </div>

        <div className="grid items-start gap-4 lg:grid-cols-2">
          <div className="space-y-3">
            {points.map((point) => (
              <div key={point} className="flex items-start gap-3 rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
                <div className="mt-0.5 flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full border border-emerald-300 bg-emerald-50">
                  <Check className="h-3.5 w-3.5 text-emerald-600" />
                </div>
                <span className="text-sm text-slate-700">{point}</span>
              </div>
            ))}
          </div>

          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5">
            <div className="mb-4 flex items-center gap-3">
              <TrendingUp className="h-6 w-6 text-emerald-400" />
              <h2 className="text-lg font-bold">Operational Impact</h2>
            </div>
            <div className="space-y-3 text-sm">
              <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                <span className="text-slate-600">Wait time reduction</span>
                <span className="font-bold text-emerald-700">60%</span>
              </div>
              <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                <span className="text-slate-600">Staff productivity</span>
                <span className="font-bold text-teal-700">+40%</span>
              </div>
              <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                <span className="text-slate-600">Patient satisfaction</span>
                <span className="font-bold text-emerald-700">4.9/5</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-600">No-show reduction</span>
                <span className="font-bold text-teal-700">35%</span>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};
