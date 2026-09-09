import React from 'react';
import { ArrowRight } from 'lucide-react';

interface LandingPageProps {
  onNavigate: (page: string, role?: string) => void;
}

const workflows = [
  {
    role: 'PATIENT',
    title: 'From scan to turn',
    description: 'A patient can join the right queue in a few clear steps.',
    steps: ['Scan QR / Open Link', 'Book', 'Get Token', 'Track Turn'],
  },
  {
    role: 'RECEPTION',
    title: 'Keep the queue moving',
    description: 'The front desk sees the whole room and always knows what happens next.',
    steps: ['See Queue', 'Call Next', 'Manage Priority', 'Keep Queue Moving'],
  },
  {
    role: 'DOCTOR',
    title: 'A focused consultation flow',
    description: 'The doctor controls the active queue without extra steps around care.',
    steps: ['IN', 'Call / Serve', 'Complete', 'OUT'],
  },
  {
    role: 'TV',
    title: 'One calm view for everyone',
    description: 'A simple display keeps patients informed without exposing private details.',
    steps: ['Now Serving', 'Next Tokens', 'Queue Status'],
  },
];

export const LandingPage: React.FC<LandingPageProps> = ({ onNavigate }) => (
  <div className="landing-page-shell min-h-screen text-slate-900">
    <main className="landing-main mx-auto max-w-6xl px-5 pb-20 pt-16 sm:px-8 sm:pt-24 lg:px-10">
      <section className="landing-hero max-w-3xl">
        <p className="landing-kicker">NEXTQ · Clinic queue management</p>
        <h1 className="landing-title">Smart Queue. Less Waiting.</h1>
        <p className="landing-subtitle">Simple appointment and live queue management for clinics.</p>
        <p className="landing-note">No app. No signup. Just scan, book and track.</p>
      </section>

      <section className="landing-workflows" aria-labelledby="workflow-heading">
        <div className="landing-section-intro">
          <p className="landing-kicker">How NEXTQ works</p>
          <h2 id="workflow-heading">One clear flow for every part of the clinic.</h2>
        </div>

        <div className="workflow-list">
          {workflows.map((workflow) => (
            <article className="workflow-row" key={workflow.role}>
              <div className="workflow-copy">
                <p className="workflow-role">{workflow.role}</p>
                <h3>{workflow.title}</h3>
                <p>{workflow.description}</p>
              </div>
              <ol className="workflow-steps">
                {workflow.steps.map((step, index) => (
                  <li key={step}>
                    <span className="workflow-step-number">0{index + 1}</span>
                    <span>{step}</span>
                  </li>
                ))}
              </ol>
            </article>
          ))}
        </div>
      </section>

      <section className="landing-experiences" aria-labelledby="experiences-heading">
        <div>
          <p className="landing-kicker">Built around the clinic</p>
          <h2 id="experiences-heading">One clinic. Four simple experiences.</h2>
        </div>
        <p>
          Patients get clarity. Reception gets control. Doctors get focus. The waiting room gets one shared, reliable picture of what is happening now.
        </p>
      </section>

      <section className="landing-cta" aria-labelledby="cta-heading">
        <div>
          <p className="landing-kicker">Ready when your clinic is</p>
          <h2 id="cta-heading">Make the next visit easier.</h2>
        </div>
        <button type="button" onClick={() => onNavigate('booking')}>
          Start with NEXTQ
          <ArrowRight aria-hidden="true" />
        </button>
      </section>
    </main>
  </div>
);
