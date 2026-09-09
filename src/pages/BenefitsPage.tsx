import React from 'react';
import { Heart, Users, ChevronRight, Sparkles, Stethoscope } from 'lucide-react';
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
      <section className="premium-benefits-section mx-auto max-w-7xl px-4 pt-6 pb-16 sm:px-6 lg:px-8">
        <div className="premium-benefits-header">
          <div className="premium-benefits-heading">
            <p className="public-kicker premium-kicker">Benefits</p>
            <h1 className="premium-benefits-title">{content.benefitsTitle}</h1>
            <p className="premium-benefits-summary">
              From appointment scheduling to live tracking and waiting room visibility, NEXTQ turns healthcare queue management into a calmer, faster patient flow experience.
            </p>
          </div>
          <div className="premium-benefits-aside">
            <span className="premium-benefits-aside-small">NEXTQ impact</span>
            <span className="premium-benefits-aside-score">360°</span>
          </div>
        </div>

        <div className="premium-benefits-grid">
          <article className="premium-benefit-card premium-benefit-card-clinic">
            <div className="premium-benefit-card-top">
              <span className="premium-benefit-icon premium-benefit-icon-clinic">
                <Heart className="h-5 w-5" />
              </span>
              <span className="premium-benefit-tag">Clinic OS</span>
            </div>
            <h2 className="premium-benefit-card-title">For Clinics & Hospitals</h2>
            <ul className="premium-benefit-list">
              {clinics.map((item) => (
                <li key={item}>
                  <ChevronRight className="premium-benefit-icon-arrow" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </article>

          <article className="premium-benefit-card premium-benefit-card-patient">
            <div className="premium-benefit-card-top">
              <span className="premium-benefit-icon premium-benefit-icon-patient">
                <Users className="h-5 w-5" />
              </span>
              <span className="premium-benefit-tag">Patient Flow</span>
            </div>
            <h2 className="premium-benefit-card-title">For Patients</h2>
            <ul className="premium-benefit-list">
              {patients.map((item) => (
                <li key={item}>
                  <ChevronRight className="premium-benefit-icon-arrow" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </article>
        </div>

        <div className="premium-benefits-footer">
          <span className="premium-benefits-footer-chip">
            <Sparkles className="h-4 w-4" />
            Healthcare experience built for clarity
          </span>
          <span className="premium-benefits-footer-chip">
            <Stethoscope className="h-4 w-4" />
            Smart queue operational flow
          </span>
        </div>
      </section>
    </div>
  );
};
