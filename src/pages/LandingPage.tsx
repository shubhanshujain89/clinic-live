import React from 'react';
import {
  Activity,
  ArrowRight,
  BellRing,
  CheckCircle2,
  Clock3,
  Heart,
  Play,
  ShieldCheck,
  Sparkles,
  Stethoscope,
  Users,
} from 'lucide-react';
import { useSiteConfig } from '../lib/siteConfig';

interface LandingPageProps {
  onNavigate: (page: string, role?: string) => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({ onNavigate }) => {
  const { content } = useSiteConfig();
  const trustMetrics = [
    { value: '400+', label: 'Clinics onboarded' },
    { value: '60%', label: 'Less waiting stress' },
    { value: '4.9/5', label: 'Patient experience' },
    { value: '24/7', label: 'Live operational view' },
  ];

  const featurePillars = [
    {
      icon: Stethoscope,
      title: 'Real-time queue visibility',
      text: 'Track every token, doctor, and waiting room update instantly with a calm, transparent workflow.',
      tone: 'emerald',
    },
    {
      icon: Heart,
      title: 'Patient-first experience',
      text: 'Give patients clarity, faster movement, and confidence with live wait updates and WhatsApp alerts.',
      tone: 'cyan',
    },
    {
      icon: ShieldCheck,
      title: 'Operational control',
      text: 'Manage multi-doctor clinics, reception flow, and queue rules from one secure dashboard.',
      tone: 'purple',
    },
  ];

  const workflow = [
    {
      step: '01',
      title: 'Set up your clinic',
      desc: 'Add doctors, assign departments, and configure your queue flow in a few guided steps.',
      icon: Users,
    },
    {
      step: '02',
      title: 'Scan and book',
      desc: 'Patients scan the QR code, choose a doctor, and receive a token without app downloads.',
      icon: BellRing,
    },
    {
      step: '03',
      title: 'Monitor and improve',
      desc: 'Track turn times, patient flow, and clinic activity with live insights and reporting.',
      icon: Activity,
    },
  ];

  const proof = [
    {
      quote: 'Wait times came down immediately. Patients feel informed, and our reception team finally has control.',
      name: 'Clinic Director',
      role: 'Multi-location healthcare team',
    },
    {
      quote: 'We replaced chaos with a structured queue. The system is simple for patients and effortless for staff.',
      name: 'Operations Lead',
      role: 'Care delivery operations',
    },
    {
      quote: 'Our experience now feels premium. Patients notice the clarity, and the clinic runs smoother every day.',
      name: 'Healthcare Partner',
      role: 'Clinic experience team',
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

      <section className="relative mx-auto max-w-7xl px-4 pb-10 pt-5 sm:px-6 lg:px-8 lg:pb-10">
        <div className="grid items-center gap-8 lg:grid-cols-[1.3fr_0.7fr]">
          <div className="text-center lg:text-left">
            <div className="animate-in-up mb-5 inline-flex items-center gap-2.5 rounded-full border border-emerald-400/25 bg-emerald-500/8 px-3 py-2 text-xs font-medium text-emerald-200 sm:text-sm">
              <Sparkles className="h-4 w-4" />
              Trusted by global healthcare networks
            </div>

            <h1 className="animate-in-up delay-100 mb-5 text-4xl font-black leading-[1.1] tracking-tight text-white md:text-5xl xl:text-6xl">
              {content.heroTitle.split(',')[0] || 'Healthcare queues'}
              <span className="mt-2 block bg-gradient-to-r from-emerald-200 via-cyan-200 to-sky-100 bg-clip-text text-transparent">
                {content.heroTitle.includes(',') ? content.heroTitle.split(',').slice(1).join(',').trim() || 'reimagined' : 'reimagined'}
              </span>
            </h1>

            <p className="animate-in-up delay-200 mx-auto max-w-2xl text-base leading-7 text-slate-300 lg:mx-0 lg:text-lg">
              {content.heroSubtitle}
            </p>

            <div className="animate-in-up delay-300 mt-6 flex flex-col items-center gap-3 sm:flex-row lg:items-start">
              <button
                onClick={() => onNavigate('booking')}
                className="inline-flex items-center justify-center rounded-xl bg-gradient-to-r from-emerald-500 via-cyan-500 to-sky-500 px-6 py-3.5 text-sm font-bold text-slate-950 shadow-[0_20px_60px_rgba(34,211,238,0.3)] transition duration-300 hover:-translate-y-1 hover:shadow-[0_24px_70px_rgba(16,185,129,0.35)]"
              >
                Book appointment now
              </button>
              <button
                onClick={() => onNavigate('login')}
                className="inline-flex items-center justify-center rounded-xl border border-slate-600 bg-slate-900/60 px-6 py-3.5 text-sm font-bold text-white transition duration-300 hover:border-emerald-400/50 hover:bg-emerald-500/8"
              >
                Sign in
              </button>
            </div>

            <div className="animate-in-up delay-400 mt-6 flex flex-wrap items-center justify-center gap-2 text-[11px] font-medium text-slate-300 lg:justify-start">
              {['Real-time visibility', 'Zero setup delays', 'Enterprise security'].map((item) => (
                <div key={item} className="flex items-center gap-2 rounded-full border border-slate-700/60 bg-slate-900/40 px-3 py-1.5">
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
                  ['Patient 01', 'Consultation', '4 min'],
                  ['Patient 02', 'Diagnostic review', '11 min'],
                  ['Patient 03', 'Lab check-in', '8 min'],
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

      <section className="mx-auto max-w-7xl px-4 pb-10 pt-6 sm:px-6 lg:px-8">
        <div className="grid gap-4 md:grid-cols-3">
          {featurePillars.map(({ icon: Icon, title, text, tone }) => (
            <div
              key={title}
              className={`group rounded-2xl border p-4 transition duration-300 hover:border-emerald-400/40 hover:-translate-y-1 ${
                tone === 'emerald'
                  ? 'border-emerald-500/20 bg-emerald-500/10'
                  : tone === 'cyan'
                    ? 'border-cyan-500/20 bg-cyan-500/10'
                    : 'border-violet-500/20 bg-violet-500/10'
              }`}
            >
              <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-slate-950/60 ring-1 ring-white/10 transition group-hover:ring-2 group-hover:ring-emerald-400/40">
                <Icon className={`h-5 w-5 transition ${
                  tone === 'emerald' ? 'text-emerald-300 group-hover:text-emerald-200' : tone === 'cyan' ? 'text-cyan-300 group-hover:text-cyan-200' : 'text-violet-300 group-hover:text-violet-200'
                }`} />
              </div>
              <h3 className="mb-1.5 text-lg font-bold text-white">{title}</h3>
              <p className="text-sm leading-6 text-slate-300">{text}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {trustMetrics.map((metric, idx) => (
            <div key={metric.label} className={`rounded-2xl border border-slate-700/60 bg-slate-900/50 p-4 text-center transition hover:border-emerald-400/30 hover:bg-slate-900/70 animate-in-up delay-${idx * 100}`}>
              <div className="text-2xl font-black text-white">{metric.value}</div>
              <div className="mt-1 text-xs text-slate-400">{metric.label}</div>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="mb-6 text-center">
          <div className="text-[10px] font-bold uppercase tracking-[0.28em] text-emerald-400">How it works</div>
          <h2 className="mt-2 text-3xl font-bold text-white md:text-4xl">Get started in three steps</h2>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          {workflow.map(({ step, title, desc, icon: Icon }, idx) => (
            <div key={step} className={`rounded-2xl border border-slate-700/60 bg-slate-900/50 p-5 transition hover:border-emerald-400/30 hover:bg-slate-900/70 hover:-translate-y-1 animate-in-up delay-${idx * 100}`}>
              <div className="mb-4 flex items-center justify-between">
                <div className="text-xs font-bold tracking-[0.24em] text-emerald-400">{step}</div>
                <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-600/60 bg-slate-800/70">
                  <Icon className="h-4 w-4 text-cyan-300" />
                </div>
              </div>
              <h3 className="mb-2 text-xl font-bold text-white">{title}</h3>
              <p className="text-sm leading-6 text-slate-300">{desc}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <div className="grid items-center gap-8 lg:grid-cols-[1.1fr_0.9fr]">
          <div>
            <div className="mb-4 text-[10px] font-bold uppercase tracking-[0.28em] text-emerald-400">Built for outpatient clinics</div>
            <h2 className="mb-4 text-3xl font-black text-white md:text-4xl">Queue management that feels calm, fast, and patient-friendly.</h2>
            <p className="mb-6 max-w-xl text-base leading-7 text-slate-300">
              From the moment a patient scans a QR code to the final consultation, every step is visible, organised, and low-friction.
            </p>

            <div className="space-y-3">
              {[
                'No patient app downloads required',
                'Real-time queue sync across reception, doctor, and waiting area',
                'Instant WhatsApp updates when it is time to enter the clinic',
                'Multi-doctor support and live operational insights',
              ].map((item) => (
                <div key={item} className="flex items-start gap-3 rounded-2xl border border-slate-700/50 bg-slate-900/50 p-3 text-slate-200">
                  <CheckCircle2 className="mt-0.5 h-5 w-5 text-emerald-400" />
                  <span className="text-sm leading-6">{item}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="relative overflow-hidden rounded-[28px] border border-slate-700/60 bg-slate-900/70 p-4 shadow-[0_35px_120px_rgba(15,23,42,0.8)]">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <div className="text-[10px] uppercase tracking-[0.24em] text-slate-500">Patient flow</div>
                <div className="mt-1 text-xl font-bold text-white">Live queue status</div>
              </div>
              <div className="rounded-full border border-cyan-400/30 bg-cyan-500/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.2em] text-cyan-300">
                Live
              </div>
            </div>

            <div className="rounded-2xl border border-slate-700/50 bg-slate-950/80 p-4">
              <div className="mb-4 flex items-center justify-between rounded-xl border border-slate-700/60 bg-slate-900/80 px-3 py-2">
                <div>
                  <div className="text-xs text-slate-400">Current token</div>
                  <div className="text-lg font-bold text-white">A-014</div>
                </div>
                <div className="rounded-full border border-emerald-400/30 bg-emerald-500/10 px-2 py-1 text-[10px] font-semibold text-emerald-300">
                  4 waiting
                </div>
              </div>

              <div className="space-y-2">
                {[
                  ['Priya Sharma', 'Now consulting'],
                  ['Arjun Nair', 'Waiting'],
                  ['Meera Iyer', 'Next up'],
                ].map(([name, status]) => (
                  <div key={name} className="flex items-center justify-between rounded-xl border border-slate-700/60 bg-slate-900/70 px-3 py-2.5">
                    <div className="font-medium text-white">{name}</div>
                    <div className="text-xs text-slate-300">{status}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-6 text-center">
          <div className="text-[10px] font-bold uppercase tracking-[0.28em] text-cyan-400">See it in action</div>
          <h2 className="mt-2 text-3xl font-bold text-white md:text-4xl">Watch how a modern clinic queue works</h2>
        </div>

        <div className="overflow-hidden rounded-[32px] border border-slate-700/60 bg-slate-900/70 p-3 shadow-[0_40px_120px_rgba(15,23,42,0.6)]">
          <div className="relative overflow-hidden rounded-[24px] border border-slate-700/60 bg-slate-950/80">
            <video
              className="block h-[360px] w-full object-cover md:h-[500px]"
              poster="https://images.unsplash.com/photo-1584515933487-779824d29309?auto=format&fit=crop&w=1200&q=80"
              controls
              preload="metadata"
            >
              <source src="https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4" type="video/mp4" />
            </video>
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-slate-950/80 via-slate-950/10 to-slate-950/30" />
            <div className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-4 p-5 md:p-7">
              <div>
                <div className="text-[10px] font-bold uppercase tracking-[0.28em] text-emerald-300">QCare-style demo</div>
                <div className="mt-2 text-xl font-bold text-white md:text-2xl">Scan • Queue • Notify</div>
              </div>
              <div className="flex items-center gap-2 rounded-full border border-white/10 bg-slate-950/60 px-3 py-2 text-xs font-medium text-slate-100 backdrop-blur-sm">
                <Play className="h-3.5 w-3.5 text-emerald-300" />
                1-minute overview
              </div>
            </div>
          </div>
        </div>
      </section>


      <section className="mx-auto max-w-7xl px-4 pb-12 pt-4 sm:px-6 lg:px-8">
        <div className="rounded-[28px] border border-emerald-400/20 bg-gradient-to-r from-emerald-500/10 via-slate-900/80 to-cyan-500/10 p-6 md:p-8">
          <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
            <div>
              <div className="text-[10px] font-bold uppercase tracking-[0.28em] text-emerald-300">Ready to modernise queue flow?</div>
              <h2 className="mt-3 text-3xl font-black text-white md:text-4xl">Turn every wait into a smoother patient experience.</h2>
            </div>
            <div className="flex flex-col items-stretch gap-3 sm:flex-row">
              <button
                onClick={() => onNavigate('booking')}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-emerald-500 via-cyan-500 to-sky-500 px-6 py-3.5 text-sm font-bold text-slate-950 shadow-[0_18px_60px_rgba(34,211,238,0.3)] transition hover:-translate-y-1"
              >
                Start free trial
                <ArrowRight className="h-4 w-4" />
              </button>
              <button
                onClick={() => onNavigate('login')}
                className="inline-flex items-center justify-center rounded-xl border border-slate-600 bg-slate-900/60 px-6 py-3.5 text-sm font-bold text-white transition hover:border-emerald-400/50 hover:bg-emerald-500/8"
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
