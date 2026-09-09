import React from 'react';
import {
  Activity,
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  Clock3,
  Heart,
  Play,
  ShieldCheck,
  Sparkles,
  Stethoscope,
  Ticket,
  Users,
} from 'lucide-react';
import { useSiteConfig } from '../lib/siteConfig';

interface LandingPageProps {
  onNavigate: (page: string, role?: string) => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({ onNavigate }) => {
  const { settings } = useSiteConfig();

  const openForm = (url: string, label: string) => {
    if (!url.trim()) {
      window.alert(`${label} link is not configured yet.`);
      return;
    }

    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const featureCards = [
    {
      icon: Ticket,
      title: 'Appointments & tokens',
      text: 'Give patients a fast booking flow and keep every queue movement organised in one place.',
    },
    {
      icon: Users,
      title: 'Doctor visibility',
      text: 'See who is waiting, who is next, and where bottlenecks are forming in real time.',
    },
    {
      icon: Activity,
      title: 'Live patient tracking',
      text: 'Monitor queue status, waiting times, and progress without extra calls or manual follow-up.',
    },
  ];

  const workflowSteps = [
    {
      step: '01',
      title: 'Set up your clinic',
      desc: 'Create your clinic profile, add doctors, and configure queue rules in just a few clicks.',
      icon: Users,
    },
    {
      step: '02',
      title: 'Book and issue tokens',
      desc: 'Patients reserve visits online and your team can issue tokens quickly without added friction.',
      icon: Ticket,
    },
    {
      step: '03',
      title: 'Track and improve',
      desc: 'Review live queue activity, patient movement, and staff efficiency from a simple dashboard.',
      icon: Activity,
    },
  ];

  const trustPoints = [
    {
      icon: Stethoscope,
      title: 'Built for healthcare teams',
      text: 'Designed to support busy clinics and modern care environments with a professional patient experience.',
    },
    {
      icon: ShieldCheck,
      title: 'Simple and reliable',
      text: 'Keep operations steady with a clean system that gives your team confidence and clarity.',
    },
    {
      icon: Heart,
      title: 'Patient-friendly',
      text: 'Reduce uncertainty with clear updates, better communication, and a calmer front-desk flow.',
    },
  ];

  const stats = [
    { value: '400+', label: 'Clinics onboarded' },
    { value: '60%', label: 'Waiting stress reduced' },
    { value: '4.9/5', label: 'Patient experience' },
  ];

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <section className="mx-auto max-w-7xl px-4 pb-10 pt-8 sm:px-6 lg:px-8 lg:pb-14">
        <div className="grid items-center gap-12 lg:grid-cols-[1.12fr_0.88fr]">
          <div className="text-center lg:text-left">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-emerald-700">
              <Sparkles className="h-3.5 w-3.5" />
              Smarter healthcare operations
            </div>

            <h1 className="mb-5 text-5xl font-black leading-[0.96] tracking-[-0.06em] text-slate-900 md:text-6xl xl:text-[5.2rem]">
              Modern queue management
              <span className="mt-2 block text-slate-600">for calmer clinics.</span>
            </h1>

            <p className="mx-auto max-w-xl text-lg leading-8 text-slate-600 lg:mx-0">
              NEXTQ helps clinics manage appointments, tokens, and patient flow from one clean, easy-to-use platform.
            </p>

            <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row lg:items-start">
              <button
                onClick={() => onNavigate('booking')}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-7 py-3.75 text-base font-semibold text-white shadow-sm transition hover:bg-emerald-500"
              >
                Get Started
                <ArrowRight className="h-4 w-4" />
              </button>

              <button
                onClick={() => onNavigate('what-we-provide')}
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-7 py-3.75 text-base font-semibold text-slate-700 shadow-sm transition hover:border-slate-400 hover:bg-slate-50"
              >
                <Play className="h-4 w-4" />
                How it works
              </button>
            </div>

            <div className="mt-8 flex flex-wrap items-center justify-center gap-2.5 text-sm text-slate-600 lg:justify-start">
              {['Appointments', 'Token management', 'Live queue updates'].map((item) => (
                <div key={item} className="flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3.5 py-1.5 shadow-sm">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                  {item}
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-[30px] border border-slate-200 bg-white p-5 shadow-[0_28px_80px_rgba(15,23,42,0.08)] sm:p-6">
            <div className="mb-5 flex items-center justify-between border-b border-slate-200 pb-4">
              <div>
                <div className="text-[10px] font-semibold uppercase tracking-[0.24em] text-slate-500">Live operations</div>
                <div className="mt-1 text-2xl font-bold text-slate-900">Clinic queue</div>
              </div>
              <div className="rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-emerald-700">
                Active
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              {[
                { label: 'Queued', value: '18' },
                { label: 'In progress', value: '7' },
                { label: 'Completed', value: '42' },
              ].map((card) => (
                <div key={card.label} className="rounded-2xl border border-slate-200 bg-slate-50 p-3 text-center">
                  <div className="text-[10px] uppercase tracking-[0.18em] text-slate-500">{card.label}</div>
                  <div className="mt-2 text-2xl font-black text-slate-900">{card.value}</div>
                </div>
              ))}
            </div>

            <div className="mt-5 space-y-2.5">
              {[
                ['Patient 01', 'Consultation', '4 min'],
                ['Patient 02', 'Diagnostic review', '11 min'],
                ['Patient 03', 'Lab check-in', '8 min'],
              ].map(([name, stage, time]) => (
                <div key={name} className="flex items-center justify-between rounded-2xl bg-slate-50 px-3 py-2.5">
                  <div>
                    <div className="text-sm font-semibold text-slate-900">{name}</div>
                    <div className="text-xs text-slate-500">{stage}</div>
                  </div>
                  <div className="rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[10px] font-semibold text-emerald-700">
                    {time}
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-5 flex items-center justify-between rounded-2xl border border-emerald-100 bg-emerald-50 px-4 py-3.5">
              <div>
                <div className="text-[10px] uppercase tracking-[0.18em] text-emerald-700">Average wait</div>
                <div className="mt-1 text-lg font-bold text-slate-900">6.2 minutes</div>
              </div>
              <div className="flex items-center gap-2 rounded-full border border-emerald-200 bg-white px-2.5 py-1 text-xs font-semibold text-emerald-700">
                <Clock3 className="h-3.5 w-3.5" />
                58% faster
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-3 sm:px-6 lg:px-8">
        <div className="grid gap-4 md:grid-cols-3">
          {stats.map((stat) => (
            <div key={stat.label} className="rounded-2xl border border-slate-200/80 bg-white p-5 text-center shadow-[0_8px_22px_rgba(15,23,42,0.03)]">
              <div className="text-3xl font-black text-slate-900">{stat.value}</div>
              <div className="mt-1 text-sm text-slate-600">{stat.label}</div>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 lg:py-10">
        <div className="mb-6 text-center">
          <div className="text-[10px] font-semibold uppercase tracking-[0.24em] text-emerald-700">What you get</div>
          <h2 className="mt-2 text-4xl font-black tracking-[-0.04em] text-slate-900 md:text-5xl">Simple tools for a smoother clinic day</h2>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          {featureCards.map(({ icon: Icon, title, text }) => (
            <div key={title} className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-[0_8px_22px_rgba(15,23,42,0.03)] transition hover:-translate-y-1 hover:border-emerald-200/80 hover:shadow-[0_14px_28px_rgba(15,23,42,0.04)]">
              <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100">
                <Icon className="h-5 w-5" />
              </div>
              <h3 className="mb-2 text-xl font-bold text-slate-900">{title}</h3>
              <p className="text-sm leading-6 text-slate-600">{text}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 lg:py-10">
        <div className="mb-6 text-center">
          <div className="text-[10px] font-semibold uppercase tracking-[0.24em] text-emerald-700">How it works</div>
          <h2 className="mt-2 text-4xl font-black tracking-[-0.04em] text-slate-900 md:text-5xl">A simple flow from check-in to care</h2>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          {workflowSteps.map(({ step, title, desc, icon: Icon }) => (
            <div key={step} className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-[0_8px_22px_rgba(15,23,42,0.03)]">
              <div className="mb-4 flex items-center justify-between">
                <div className="text-xs font-semibold uppercase tracking-[0.22em] text-emerald-700">{step}</div>
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-700">
                  <Icon className="h-4 w-4" />
                </div>
              </div>
              <h3 className="mb-2 text-xl font-bold text-slate-900">{title}</h3>
              <p className="text-sm leading-6 text-slate-600">{desc}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 lg:py-10">
        <div className="mb-6 text-center">
          <div className="text-[10px] font-semibold uppercase tracking-[0.24em] text-emerald-700">Why clinics choose NEXTQ</div>
          <h2 className="mt-2 text-4xl font-black tracking-[-0.04em] text-slate-900 md:text-5xl">Reliable queue management that feels easy from day one</h2>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          {trustPoints.map(({ icon: Icon, title, text }) => (
            <div key={title} className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-[0_8px_22px_rgba(15,23,42,0.03)]">
              <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100">
                <Icon className="h-5 w-5" />
              </div>
              <h3 className="mb-2 text-xl font-bold text-slate-900">{title}</h3>
              <p className="text-sm leading-6 text-slate-600">{text}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 pb-8 pt-2 sm:px-6 lg:px-8 lg:pb-10">
        <div className="rounded-[28px] border border-slate-200/80 bg-white p-6 shadow-[0_8px_22px_rgba(15,23,42,0.03)] md:p-8">
          <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
            <div>
              <div className="text-[10px] font-semibold uppercase tracking-[0.24em] text-emerald-700">Ready to get started?</div>
              <h2 className="mt-3 text-4xl font-black tracking-[-0.04em] text-slate-900 md:text-5xl">Give your clinic a more organised day.</h2>
            </div>

            <div className="flex flex-col items-stretch gap-3 sm:flex-row">
              <button
                onClick={() => settings.freeTrialFormUrl.trim() ? openForm(settings.freeTrialFormUrl, 'Free trial form') : onNavigate('contact')}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-7 py-3.75 text-base font-semibold text-white shadow-sm transition hover:bg-emerald-500"
              >
                Get Started
                <ArrowRight className="h-4 w-4" />
              </button>

              <button
                onClick={() => settings.salesFormUrl.trim() ? openForm(settings.salesFormUrl, 'Sales form') : onNavigate('contact')}
                className="inline-flex items-center justify-center rounded-xl border border-slate-300 bg-slate-50 px-7 py-3.75 text-base font-semibold text-slate-700 transition hover:border-slate-400 hover:bg-slate-100"
              >
                Talk to sales
              </button>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};
