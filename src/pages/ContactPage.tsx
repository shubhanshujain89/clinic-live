import React from 'react';
import { Mail, MapPin, Phone, ArrowRight, Headphones, Sparkles } from 'lucide-react';
import { useSiteConfig } from '../lib/siteConfig';

interface Props {
  onNavigate: (page: string) => void;
}

export const ContactPage: React.FC<Props> = ({ onNavigate }) => {
  const { settings, content } = useSiteConfig();
  const cards = [
    {
      icon: Phone,
      title: 'Phone',
      value: settings.contactPhone,
      note: 'Mon-Fri, 9AM-6PM IST'
    },
    {
      icon: Mail,
      title: 'Email',
      value: settings.contactEmail,
      note: 'We respond within 24 hours'
    },
    {
      icon: MapPin,
      title: 'Location',
      value: settings.supportAddress,
      note: 'Enterprise HQ'
    }
  ];

  return (
    <div className="public-light-page">
      <section className="premium-contact-section mx-auto max-w-7xl px-4 pt-6 pb-16 sm:px-6 lg:px-8">
        <div className="premium-contact-header">
          <div className="premium-contact-heading">
            <p className="public-kicker premium-kicker">Contact Us</p>
            <h1 className="premium-contact-title">{content.contactTitle}</h1>
            <p className="premium-contact-summary">
              Our care team helps clinics, patients, and hospital operations connect with a faster queue experience.
            </p>
          </div>
          <div className="premium-contact-aside">
            <span className="premium-contact-aside-small">NEXTQ Care</span>
            <span className="premium-contact-aside-score">
              <Headphones className="h-6 w-6" />
            </span>
          </div>
        </div>

        <div className="premium-contact-grid">
          {cards.map(({ icon: Icon, title, value, note }) => (
            <article key={title} className="premium-contact-card">
              <div className="premium-contact-card-top">
                <span className="premium-contact-icon">
                  <Icon className="h-5 w-5" />
                </span>
                <span className="premium-contact-tag">{title}</span>
              </div>
              <div className="premium-contact-content">
                <h2>{title}</h2>
                <p className="premium-contact-value">{value}</p>
                <p className="premium-contact-note">{note}</p>
              </div>
              <div className="premium-contact-arrow">
                <ArrowRight className="h-4 w-4" />
              </div>
            </article>
          ))}
        </div>

        <div className="premium-contact-footer">
          <span className="premium-contact-chip">
            <Sparkles className="h-4 w-4" />
            Clinic support desk
          </span>
          <span className="premium-contact-chip">
            <Phone className="h-4 w-4" />
            Available 24/7 for queue assistance
          </span>
        </div>
      </section>
    </div>
  );
};
