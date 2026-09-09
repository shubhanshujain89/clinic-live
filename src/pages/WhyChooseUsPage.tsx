import React from 'react';
import { ArrowRight, Gauge, HeartPulse, ShieldCheck, Smartphone, TrendingUp, UsersRound } from 'lucide-react';
import { useSiteConfig } from '../lib/siteConfig';

interface Props {
  onNavigate: (page: string) => void;
}

export const WhyChooseUsPage: React.FC<Props> = ({ onNavigate }) => {
  const { content } = useSiteConfig();
  const points = [
    { title: 'Wait-time reduction', detail: 'Reduce average wait time by 60%', icon: Gauge },
    { title: 'Doctor productivity', detail: 'Increase doctor productivity by 40%', icon: HeartPulse },
    { title: 'Patient experience', detail: 'Improve patient satisfaction scores', icon: Smartphone },
    { title: 'Clinic confidence', detail: 'HIPAA and compliance-ready architecture', icon: ShieldCheck },
    { title: 'Growth-ready operations', detail: 'Scale smoothly across multi-clinic operations', icon: TrendingUp },
    { title: 'Patient-first design', detail: 'Deliver a mobile-first patient experience', icon: UsersRound },
  ];

  return (
    <div className="public-light-page">
      <section className="premium-why-section mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="premium-why-headline">
          <span className="premium-why-headline-text">Healthcare operations that feel effortless</span>
        </div>

        <div className="premium-cards-grid premium-cards-grid-single">
          {points.map((point, index) => {
            const Icon = point.icon;
            return (
              <article key={point.title} className="premium-point-card">
                <div className="premium-point-top">
                  <span className="premium-point-icon"><Icon className="h-5 w-5" /></span>
                  <span className="premium-point-index">0{index + 1}</span>
                </div>
                <div className="premium-point-content">
                  <h3>{point.title}</h3>
                  <p>{point.detail}</p>
                </div>
                <div className="premium-point-arrow">
                  <ArrowRight className="h-4 w-4" />
                </div>
              </article>
            );
          })}
        </div>
      </section>
    </div>
  );
};
