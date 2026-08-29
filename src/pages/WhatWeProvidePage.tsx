import React from 'react';
import { Heart, Zap, Users, Shield, Phone, CheckCircle2 } from 'lucide-react';
import { useSiteConfig } from '../lib/siteConfig';

interface Props {
  onNavigate: (page: string) => void;
}

export const WhatWeProvidePage: React.FC<Props> = ({ onNavigate }) => {
  const { content } = useSiteConfig();
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
    <div className="bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 text-white">
      <section className="mx-auto max-w-7xl px-4 py-5 sm:px-6 lg:px-8">
        <div className="mb-5">
          <p className="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-emerald-400">What We Provide</p>
          <h1 className="text-2xl font-bold md:text-3xl">{content.whatWeProvideTitle}</h1>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          {features.map(({ icon: Icon, title, desc }) => (
            <div key={title} className="rounded-2xl border border-slate-700 bg-slate-800/50 p-4 transition hover:border-emerald-400/50">
              <Icon className="mb-3 h-8 w-8 text-emerald-400" />
              <h2 className="mb-2 text-base font-bold">{title}</h2>
              <p className="text-sm leading-relaxed text-slate-400">{desc}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
};
