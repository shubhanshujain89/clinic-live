import React from 'react';
import { ArrowRight } from 'lucide-react';

interface Props {
  onNavigate: (page: string) => void;
}

const workflows = [
  {
    role: 'PATIENT',
    title: 'From scan to turn',
    description: 'A patient can join the right queue in a few clear steps.',
    steps: ['Scan QR / Open Link', 'Book', 'Get Token', 'Track Turn'],
    preview: {
      label: 'PATIENT TOKEN',
      title: 'Your visit is on track',
      metrics: [['Token', 'A-104'], ['Ahead', '3'], ['Est. wait', '12m']],
      focus: 'Now serving A-101',
      action: 'Track live turn',
    },
  },
  {
    role: 'RECEPTION',
    title: 'Keep the queue moving',
    description: 'The front desk sees the whole room and always knows what happens next.',
    steps: ['See Queue', 'Call Next', 'Manage Priority', 'Keep Queue Moving'],
    preview: {
      label: 'RECEPTION DESK',
      title: 'Queue control center',
      metrics: [['Waiting', '12'], ['Served', '38'], ['Priority', '2']],
      focus: 'Next in line: A-104',
      action: 'Call next patient',
    },
  },
  {
    role: 'DOCTOR',
    title: 'A focused consultation flow',
    description: 'The doctor controls the active queue without extra steps around care.',
    steps: ['IN', 'Call / Serve', 'Complete', 'OUT'],
    preview: {
      label: 'DOCTOR VIEW',
      title: 'Consultation in focus',
      metrics: [['Current', 'A-104'], ['Room', '02'], ['Status', 'IN']],
      focus: 'Patient A-104 is in consultation',
      action: 'Complete visit',
    },
  },
  {
    role: 'TV',
    title: 'One calm view for everyone',
    description: 'A simple display keeps patients informed without exposing private details.',
    steps: ['Now Serving', 'Next Tokens', 'Queue Status'],
    preview: {
      label: 'TV DISPLAY',
      title: 'Now serving',
      metrics: [['Token', 'A-101'], ['Next', 'A-104'], ['Desk', '02']],
      focus: 'Please wait for your token',
      action: 'Queue is live',
    },
  },
];

export const HowItWorksPage: React.FC<Props> = ({ onNavigate }) => (
  <div className="public-light-page">
    <main className="w-full px-4 pb-20 pt-12 sm:px-6 sm:pt-16 lg:px-8">
      <section className="border-b border-slate-200 pb-8">
        <div className="flex flex-col items-center gap-6">
          <p className="public-kicker self-start">How NEXTQ works</p>
          <h1 className="public-page-title max-w-4xl text-center">One clear flow for every part of the clinic.</h1>
        </div>
      </section>

      <section className="workflow-list" aria-label="How NEXTQ works">
        {workflows.map((workflow) => {
          const previewClass = workflow.role === 'RECEPTION'
            ? 'flow-dashboard flow-dashboard-reception'
            : workflow.role === 'DOCTOR'
              ? 'flow-dashboard flow-dashboard-doctor'
              : workflow.role === 'TV'
                ? 'flow-dashboard flow-dashboard-tv'
                : 'flow-dashboard';

          return (
            <article key={workflow.role} className="workflow-row">
              <div className="workflow-row-content">
                <section className="workflow-copy">
                  <div className="workflow-role">{workflow.role}</div>
                  <h3>{workflow.title}</h3>
                  <p>{workflow.description}</p>

                  <div className="workflow-steps">
                    {workflow.steps.map((step, stepIndex) => (
                      <div className="workflow-step-item" key={step}>
                        {stepIndex > 0 && <ArrowRight className="workflow-step-arrow" aria-hidden="true" />}
                        <span className="workflow-step-card">
                          <span className="workflow-step-number">{String(stepIndex + 1).padStart(2, '0')}</span>
                          <span>{step}</span>
                        </span>
                      </div>
                    ))}
                  </div>
                </section>

                <aside className={previewClass}>
                  <div className="flow-dashboard-topbar">
                    <span>{workflow.preview.label}</span>
                    <span className="flow-dashboard-live"><span />Live</span>
                  </div>
                  <h4>{workflow.preview.title}</h4>
                  <div className="flow-dashboard-metrics">
                    {workflow.preview.metrics.map(([label, value]) => (
                      <div key={label}>
                        <span>{label}</span>
                        <strong>{value}</strong>
                      </div>
                    ))}
                  </div>
                  <div className="flow-dashboard-focus">{workflow.preview.focus}</div>
                  <div className="flow-dashboard-action">
                    <button type="button" className="landing-secondary-cta small-cta" onClick={() => onNavigate('contact')}>{workflow.preview.action}</button>
                  </div>
                </aside>
              </div>
            </article>
          );
        })}
      </section>
    </main>
  </div>
);
