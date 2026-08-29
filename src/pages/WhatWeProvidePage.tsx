import React from 'react';
import { Heart, Zap, Users, Shield, Phone, CheckCircle2 } from 'lucide-react';

interface Props {
  onNavigate: (page: string) => void;
}

export const WhatWeProvidePage: React.FC<Props> = ({ onNavigate }) => {
  const features = [
    {
      icon: Zap,
      title: 'Real-time Queue Management',
      desc: 'Instant patient queue updates with live tracking and ETA calculations.'
    },
    {
      icon: Users,
      title: 'Multi-role Dashboard',
      desc: 'Dedicated interfaces for doctors, staff, admins, and patients in one system.'
    },
    {
      icon: Heart,
      title: 'Patient Care Focus',
      desc: 'WhatsApp notifications, appointment tracking, and streamlined symptom intake.'
    },
    {
      icon: Shield,
      title: 'Enterprise Security',
      desc: 'Role-based permissions, controlled access, and clinic-level data isolation.'
    },
    {
      icon: Phone,
      title: 'Multi-channel Communication',
      desc: 'Automated WhatsApp, SMS, and in-app alerts keep everyone informed.'
    },
    {
      icon: CheckCircle2,
      title: 'Analytics & Reports',
      desc: 'Monitor doctor performance, patient flow, and operational efficiency.'
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 text-white">
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="mb-10 flex items-center justify-between gap-4 flex-wrap">
          <div>
            <p className="text-emerald-400 uppercase tracking-[0.2em] text-xs font-semibold mb-3">What We Provide</p>
            <h1 className="text-4xl md:text-5xl font-bold">Complete clinic operations, simplified.</h1>
          </div>
          <button
            onClick={() => onNavigate('landing')}
            className="px-5 py-3 rounded-lg bg-emerald-500 hover:bg-emerald-600 font-semibold transition"
          >
            Back to Home
          </button>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          {features.map(({ icon: Icon, title, desc }) => (
            <div key={title} className="bg-slate-800/50 border border-slate-700 rounded-2xl p-6 hover:border-emerald-400/50 transition">
              <Icon className="w-10 h-10 text-emerald-400 mb-4" />
              <h2 className="text-xl font-bold mb-3">{title}</h2>
              <p className="text-slate-400 leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
};
