import React from 'react';
import { Mail, MapPin, Phone, ArrowRight, Headphones, Sparkles, MessageCircle, ShieldCheck, Zap, Users, TrendingUp } from 'lucide-react';
import { useSiteConfig } from '../lib/siteConfig';

interface Props {
  onNavigate: (page: string) => void;
}

export const ContactPage: React.FC<Props> = ({ onNavigate }) => {
  const { settings, content } = useSiteConfig();

  const cards = [
    {
      icon: Phone,
      title: 'Call Us',
      value: settings.contactPhone,
      note: 'Sales & Clinic Desk',
      action: 'Call Now',
      actionHref: `tel:${settings.contactPhone.replace(/\s/g, '')}`,
    },
    {
      icon: Mail,
      title: 'Email Us',
      value: settings.contactEmail,
      note: 'We respond within 24 hours',
      action: 'Send Email',
      actionHref: `mailto:${settings.contactEmail}`,
    },
    {
      icon: MapPin,
      title: 'Visit Us',
      value: 'Sector 168, Noida',
      note: 'Uttar Pradesh 201305, India',
      action: 'View on Map',
      actionHref: 'https://maps.google.com/?q=Sector%20168%20Noida',
    },
    {
      icon: TrendingUp,
      title: 'Growth Desk',
      value: 'Clinic Growth & Demo',
      note: 'Plan your smart queue rollout',
      action: 'Book Demo',
      actionHref: settings.salesFormUrl || 'https://forms.gle/your-clinic-sales-request',
    },
  ];

  return (
    <div className="public-light-page">
      <section className="premium-contact-page">
        <div className="premium-contact-wrapper">
          <section className="premium-contact-left-panel">
            <div className="premium-contact-left-inner">
              <h1 className="premium-contact-title">We’re here to help</h1>
              <p className="premium-contact-summary">
                Have a question or need support? Our team is just a call, message or email away.
              </p>

              <div className="premium-contact-card-grid">
                {cards.map(({ icon: Icon, title, value, note, action, actionHref }) => (
                  <article className="premium-contact-card" key={title}>
                    <div className="premium-contact-icon-wrap">
                      <span className="premium-contact-icon">
                        <Icon className="h-5 w-5" />
                      </span>
                    </div>
                    <div className="premium-contact-card-content">
                      <h3>{title}</h3>
                      <div className="premium-contact-card-value">{value}</div>
                      <div className="premium-contact-card-note">{note}</div>
                      <a className="premium-contact-card-action" href={actionHref} target={actionHref.startsWith('http') ? '_blank' : undefined} rel={actionHref.startsWith('http') ? 'noreferrer' : undefined}>
                        <ArrowRight className="h-4 w-4" /> {action}
                      </a>
                    </div>
                  </article>
                ))}
              </div>

              <div className="premium-contact-support">
                <div className="premium-contact-support-left">
                  <span className="premium-contact-support-icon"><Headphones className="h-5 w-5" /></span>
                  <div>
                    <strong>Need immediate assistance?</strong>
                    <span>Talk to our clinic support desk for quick help.</span>
                  </div>
                </div>
                <a href={`https://wa.me/${settings.whatsappNumber.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(settings.whatsappMessage || 'Hi NEXTQ, I would like to know more about your clinic queue and appointment management solution.')}`} target="_blank" rel="noreferrer" className="premium-contact-whatsapp">
                  <MessageCircle className="h-4 w-4" /> Chat on WhatsApp
                </a>
              </div>

              <div className="premium-contact-benefit-strip">
                <div className="premium-contact-benefit-item">
                  <span className="premium-contact-benefit-icon"><Zap className="h-5 w-5" /></span>
                  <span>Quick Response<br />We usually reply within a few hours</span>
                </div>
                <div className="premium-contact-benefit-item">
                  <span className="premium-contact-benefit-icon"><Users className="h-5 w-5" /></span>
                  <span>Dedicated Team<br />Experts to assist you</span>
                </div>
                <div className="premium-contact-benefit-item">
                  <span className="premium-contact-benefit-icon"><ShieldCheck className="h-5 w-5" /></span>
                  <span>Your Success Matters<br />We’re always here for you</span>
                </div>
              </div>
            </div>
          </section>


        </div>
      </section>
    </div>
  );
};
