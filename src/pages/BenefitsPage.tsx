import React from 'react';
import { Heart, Users, ChevronRight } from 'lucide-react';
import { useSiteConfig } from '../lib/siteConfig';

interface Props {
  onNavigate: (page: string) => void;
}

export const BenefitsPage: React.FC<Props> = ({ onNavigate }) => {
  const { content } = useSiteConfig();
  const clinics = [
    'Streamline operations with smart queue orchestration',
    'Manage multi-clinic workflows from one unified dashboard',
    'Track performance with real-time analytics and reports',
    'Reduce no-shows with clear queue status updates'
  ];

  const patients = [
    'Book appointments anytime without login friction',
    'Receive transparent queue updates and accurate wait-time estimates',
    'Get instant appointment status notifications through the queue',
    'Reduce unnecessary travel time and improve clinic experience'
  ];

  return (
    <div className="public-light-page">
      <section className="public-light-section max-w-7xl mx-auto px-4 pt-6 pb-16 sm:px-6 lg:px-8">
        <div className="mb-10 flex items-center justify-between gap-4 flex-wrap">
          <div>
            <p className="text-emerald-400 uppercase tracking-[0.2em] text-xs font-semibold mb-3">Benefits</p>
            <h1 className="text-4xl md:text-5xl font-bold">{content.benefitsTitle}</h1>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-8">
          <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
            <h2 className="text-2xl font-bold mb-6 flex items-center gap-3">
              <Heart className="w-6 h-6 text-emerald-400" />
              For Clinics & Hospitals
            </h2>
            <ul className="space-y-4 text-slate-600">
              {clinics.map((item) => (
                <li key={item} className="flex gap-3">
                  <ChevronRight className="w-5 h-5 text-emerald-400 mt-0.5 shrink-0" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
            <h2 className="text-2xl font-bold mb-6 flex items-center gap-3">
              <Users className="w-6 h-6 text-cyan-400" />
              For Patients
            </h2>
            <ul className="space-y-4 text-slate-600">
              {patients.map((item) => (
                <li key={item} className="flex gap-3">
                  <ChevronRight className="w-5 h-5 text-cyan-400 mt-0.5 shrink-0" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>
    </div>
  );
};
