import React from 'react';
import {
  Activity,
  ArrowRight,
  BellRing,
  CheckCircle2,
  Clock3,
  Heart,
  ShieldCheck,
  Sparkles,
  Stethoscope,
  Users,
} from 'lucide-react';

interface LandingPageProps {
  onNavigate: (page: string, role?: string) => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({ onNavigate }) => {
  const quickLinks = [
    { key: 'what-we-provide', title: 'What We Provide', text: 'Queue, dashboards, notifications, reporting', accent: 'emerald' },
    { key: 'why-choose-us', title: 'Why Choose Us', text: 'Efficiency, visibility, and measurable outcomes', accent: 'cyan' },
    { key: 'benefits', title: 'Benefits', text: 'Results for clinics, doctors, and patients', accent: 'purple' },
    { key: 'contact', title: 'Contact Us', text: 'Talk to our team and plan your rollout', accent: 'amber' },
  ];

  const trustMetrics = [
    { value: '400+', label: 'Clinics worldwide' },
    { value: '60%', label: 'Faster patient flow' },
    { value: '4.9/5', label: 'Experience rating' },
    { value: '24/7', label: 'Operational support' },
  ];

  const featurePillars = [
    {
      icon: Stethoscope,
      title: 'Real-time queue visibility',
      text: 'Monitor patient status instantly across doctors, staff, and reception without gaps or confusion.',
      tone: 'emerald',
    },
    {
      icon: Heart,
      title: 'Patient-first design',
      text: 'Clear updates, transparent wait times, and a more reassuring experience for every visit.',
      tone: 'cyan',
    },
    {
      icon: ShieldCheck,
      title: 'Enterprise control',
      text: 'Multi-clinic support, granular access control, secure workflows, and operational consistency.',
      tone: 'purple',
    },
  ];

  const workflow = [
    {
      step: '01',
      title: 'Set up your clinic',
      desc: 'Configure doctors, departments, staff roles, and operational rules in guided steps.',
      icon: Users,
    },
    {
      step: '02',
      title: 'Automate patient flow',
      desc: 'Patients book, check in, and receive queue updates instantly without manual overhead.',
      icon: BellRing,
    },
    {
      step: '03',
      title: 'Measure and scale',
      desc: 'Track performance, identify bottlenecks, and optimize every aspect with live analytics.',
      icon: Activity,
    },
  ];

  const proof = [
    {
      quote: 'Patient wait times dropped by 58% in the first month. The team works with clarity.',
      name: 'Dr. Nisha Rao',
      role: 'Medical Director, CareNest',
    },
    {
      quote: 'Our reception team now runs with calm, confidence, and complete visibility.',
      name: 'Amit Verma',
      role: 'Operations Lead, PrimeCare',
    },
    {
      quote: 'Premium experience for patients. Powerful control for administrators. Simple for everyone.',
      name: 'Sonia Patel',
      role: 'Founder, Asteria Clinics',
    },
  ];

  return (
    <div className="relative min-h-screen overflow-hidden bg-[radial-gradient(circle_at_20%_50%,_rgba(16,185,129,0.08),transparent_18%),radial-gradient(circle_at_80%_80%,_rgba(34,211,238,0.1),transparent_22%),linear-gradient(180deg,#0a0e1a_0%,#050812_50%,#0a0e1a_100%)] text-white">
      <style>{`
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes fadeInScale {
          from { opacity: 0; transform: scale(0.95); }
          to { opacity: 1; transform: scale(1); }
        }
        @keyframes floatSlow {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-8px); }
        }
        @keyframes slideInRight {
          from { opacity: 0; transform: translateX(30px); }
          to { opacity: 1; transform: translateX(0); }
        }
        .animate-in-up { animation: fadeInUp 0.8s ease-out forwards; }
        .animate-in-scale { animation: fadeInScale 0.7s ease-out forwards; }
        .animate-float { animation: floatSlow 5s ease-in-out infinite; }
        .animate-slide-right { animation: slideInRight 0.9s ease-out forwards; }
        .delay-100 { animation-delay: 100ms; }
        .delay-200 { animation-delay: 200ms; }
        .delay-300 { animation-delay: 300ms; }
        .delay-400 { animation-delay: 400ms; }
      `}</style>
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(rgba(148,163,184,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(148,163,184,0.02)_1px,transparent_1px)] bg-[size:52px_52px] [mask-image:radial-gradient(circle_at_center,black,transparent_85%)]" />

      <section className="relative mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8 lg:py-32">
        <div className="grid items-center gap-12 lg:grid-cols-[1.3fr_0.7fr]">
          <div className="text-center lg:text-left">
            <div className="animate-in-up mb-8 inline-flex items-center gap-2.5 rounded-full border border-emerald-400/25 bg-emerald-500/8 px-4 py-2.5 text-sm font-medium text-emerald-200">
              <Sparkles className="h-4 w-4" />
              Trusted by global healthcare networks
            </div>

            <h1 className="animate-in-up delay-100 mb-8 text-6xl font-black leading-[1.15] tracking-tight text-white md:text-7xl xl:text-8xl">
              Healthcare queues,
              <span className="mt-3 block bg-gradient-to-r from-emerald-200 via-cyan-200 to-sky-100 bg-clip-text text-transparent">
                reimagined
              </span>
            </h1>

            <p className="animate-in-up delay-200 mx-auto max-w-3xl text-lg leading-8 text-slate-300 lg:mx-0">
              Transform clinic operations. Eliminate waiting frustration. Deliver a modern, frictionless patient experience at scale.
            </p>

            <div className="animate-in-up delay-300 mt-10 flex flex-col items-center gap-4 sm:flex-row lg:items-start">
              <button
                onClick={() => onNavigate('booking')}
                className="inline-flex items-center justify-center rounded-xl bg-gradient-to-r from-emerald-500 via-cyan-500 to-sky-500 px-8 py-5 text-base font-bold text-slate-950 shadow-[0_20px_60px_rgba(34,211,238,0.3)] transition duration-300 hover:-translate-y-1 hover:shadow-[0_24px_70px_rgba(16,185,129,0.35)]"
              >
                Book appointment now
              </button>
              <button
                onClick={() => onNavigate('login')}
                className="inline-flex items-center justify-center rounded-xl border border-slate-600 bg-slate-900/60 px-8 py-5 text-base font-bold text-white transition duration-300 hover:border-emerald-400/50 hover:bg-emerald-500/8"
              >
                Sign in
              </button>
            </div>

            <div className="animate-in-up delay-400 mt-8 flex flex-wrap items-center justify-center gap-3 text-xs font-medium text-slate-300 lg:justify-start">
              {['Real-time visibility', 'Zero setup delays', 'Enterprise security'].map((item) => (
                <div key={item} className="flex items-center gap-2 rounded-full border border-slate-700/60 bg-slate-900/40 px-3 py-2">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                  {item}
                </div>
              ))}
            </div>
          </div>

          <div className="animate-slide-right relative">
            <div className="absolute -inset-8 rounded-3xl bg-gradient-to-r from-emerald-500/10 via-cyan-500/10 to-violet-500/10 blur-3xl" />
            <div className="relative overflow-hidden rounded-3xl border border-slate-700/50 bg-slate-900/70 p-5 shadow-[0_40px_160px_rgba(2,6,23,0.95)] backdrop-blur-xl">
              <div className="mb-6 flex items-center justify-between border-b border-slate-700/50 pb-5">
                <div>
                  <div className="text-[10px] uppercase tracking-[0.28em] text-slate-500">Dashboard</div>
                  <div className="mt-1.5 text-2xl font-bold text-white">Live operations</div>
                </div>
                <div className="rounded-full border border-emerald-400/30 bg-emerald-500/12 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.2em] text-emerald-300">
                  Active
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3 mb-5">
                {[
                  { label: 'Queued', value: '18' },
                  { label: 'In progress', value: '7' },
                  { label: 'Completed', value: '42' },
                ].map((card) => (
                  <div key={card.label} className="rounded-2xl border border-slate-700/60 bg-slate-800/70 p-3 text-center">
                    <div className="text-[9px] uppercase tracking-[0.2em] text-slate-500">{card.label}</div>
                    <div className="mt-2.5 text-2xl font-black text-white">{card.value}</div>
                  </div>
                ))}
              </div>

              <div className="space-y-2.5">
                {[
                  ['Aisha Patel', 'Consultation', '4 min'],
                  ['Rohit Mehra', 'X-Ray', '11 min'],
                  ['Neha Shah', 'Lab', '8 min'],
                ].map(([name, stage, time]) => (
                  <div key={name} className="flex items-center justify-between rounded-2xl border border-slate-700/50 bg-slate-800/50 p-3">
                    <div>
                      <div className="text-sm font-bold text-white">{name}</div>
                      <div className="text-xs text-slate-400">{stage}</div>
                    </div>
                    <div className="rounded-full border border-cyan-400/25 bg-cyan-500/12 px-2.5 py-1 text-[10px] font-semibold text-cyan-300">
                      {time}
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-5 rounded-2xl border border-emerald-500/20 bg-emerald-500/8 p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-[9px] uppercase tracking-[0.2em] text-emerald-300/80">Average wait</div>
                    <div className="mt-1.5 text-lg font-bold text-emerald-200">6.2 minutes</div>
                  </div>
                  <div className="flex items-center gap-2 rounded-lg border border-emerald-400/20 bg-slate-900/80 px-2.5 py-1.5 text-xs font-semibold text-emerald-300">
                    <Clock3 className="h-3 w-3" />
                    ↓ 58% vs last month
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 pb-16 pt-8 sm:px-6 lg:px-8">
        <div className="grid gap-5 md:grid-cols-3">
          {featurePillars.map(({ icon: Icon, title, text, tone }) => (
            <div
              key={title}
              className={`group rounded-3xl border p-6 transition duration-300 hover:border-emerald-400/40 hover:-translate-y-1 ${
                tone === 'emerald'
                  ? 'border-emerald-500/20 bg-emerald-500/10'
                  : tone === 'cyan'
                    ? 'border-cyan-500/20 bg-cyan-500/10'
                    : 'border-violet-500/20 bg-violet-500/10'
              }`}
            >
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-950/60 ring-1 ring-white/10 group-hover:ring-2 group-hover:ring-emerald-400/40 transition">
                <Icon className={`h-6 w-6 transition ${
                  tone === 'emerald' ? 'text-emerald-300 group-hover:text-emerald-200' : tone === 'cyan' ? 'text-cyan-300 group-hover:text-cyan-200' : 'text-violet-300 group-hover:text-violet-200'
                }`} />
              </div>
              <h3 className="mb-2 text-2xl font-bold text-white">{title}</h3>
              <p className="text-base leading-7 text-slate-300">{text}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="rounded-3xl border border-slate-700/60 bg-slate-900/50 p-8 shadow-[0_20px_100px_rgba(15,23,42,0.3)]">
          <div className="mb-7 text-center text-[11px] font-bold uppercase tracking-[0.28em] text-slate-400">
            Trusted by leading healthcare networks worldwide
          </div>
          <div className="grid grid-cols-2 gap-4 text-center md:grid-cols-4">
            {['CareNest', 'Asteria', 'PrimeCare', 'Nova Health'].map((brand) => (
              <div key={brand} className="rounded-2xl border border-slate-700/50 bg-slate-800/60 px-4 py-6 text-sm font-bold text-slate-200 transition hover:border-emerald-400/30 hover:bg-slate-800/80">
                {brand}
              </div>
            ))}
          </div>
        </div>

        <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {trustMetrics.map((metric, idx) => (
            <div key={metric.label} className={`rounded-3xl border border-slate-700/60 bg-slate-900/50 p-6 text-center transition hover:border-emerald-400/30 hover:bg-slate-900/70 animate-in-up delay-${idx * 100}`}>
              <div className="text-4xl font-black text-white">{metric.value}</div>
              <div className="mt-2 text-sm text-slate-400">{metric.label}</div>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8 lg:py-20">
        <div className="mb-10 text-center">
          <div className="text-[11px] font-bold uppercase tracking-[0.28em] text-emerald-400">How it works</div>
          <h2 className="mt-4 text-4xl font-bold text-white md:text-5xl">Get started in three steps</h2>
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          {workflow.map(({ step, title, desc, icon: Icon }, idx) => (
            <div key={step} className={`rounded-3xl border border-slate-700/60 bg-slate-900/50 p-7 transition hover:border-emerald-400/30 hover:bg-slate-900/70 hover:-translate-y-1 animate-in-up delay-${idx * 100}`}>
              <div className="mb-5 flex items-center justify-between">
                <div className="text-sm font-bold tracking-[0.24em] text-emerald-400">{step}</div>
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-slate-600/60 bg-slate-800/70 group-hover:border-emerald-400/30">
                  <Icon className="h-5 w-5 text-cyan-300" />
                </div>
              </div>
              <h3 className="mb-3 text-2xl font-bold text-white">{title}</h3>
              <p className="leading-7 text-slate-300">{desc}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8 lg:py-20">
        <div className="mb-10 text-center">
          <div className="text-[11px] font-bold uppercase tracking-[0.28em] text-cyan-400">Trusted partners</div>
          <h2 className="mt-4 text-4xl font-bold text-white md:text-5xl">Why leading clinics choose us</h2>
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          {proof.map((card, idx) => (
            <div key={card.name} className={`rounded-3xl border border-slate-700/60 bg-gradient-to-b from-slate-900/70 to-slate-800/50 p-7 transition hover:border-emerald-400/30 hover:from-slate-900/80 hover:to-slate-800/70 animate-in-up delay-${idx * 100}`}>
              <div className="mb-5 text-5xl text-emerald-400/60">"</div>
              <p className="mb-7 text-lg leading-8 text-slate-200">{card.quote}</p>
              <div className="border-t border-slate-700/50 pt-5">
                <div className="font-bold text-white">{card.name}</div>
                <div className="text-sm text-slate-400">{card.role}</div>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 pb-24 pt-12 sm:px-6 lg:px-8">
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
          {quickLinks.map((item, idx) => (
            <button
              key={item.key}
              onClick={() => onNavigate(item.key)}
              className={`group text-left rounded-3xl border p-6 transition duration-300 hover:border-emerald-400/40 hover:-translate-y-2 animate-in-up delay-${idx * 100} ${
                item.accent === 'emerald'
                  ? 'border-emerald-500/25 bg-emerald-500/10'
                  : item.accent === 'cyan'
                    ? 'border-cyan-500/25 bg-cyan-500/10'
                    : item.accent === 'purple'
                      ? 'border-violet-500/25 bg-violet-500/10'
                      : 'border-amber-500/25 bg-amber-500/10'
              }`}
            >
              <h3 className="mb-3 text-2xl font-bold text-white group-hover:text-emerald-300 transition">{item.title}</h3>
              <p className="mb-5 text-base leading-7 text-slate-300">{item.text}</p>
              <span className="inline-flex items-center gap-2 text-sm font-semibold text-white group-hover:gap-3 transition">
                Explore
                <ArrowRight className="h-4 w-4" />
              </span>
            </button>
          ))}
        </div>
      </section>
    </div>
  );
};
