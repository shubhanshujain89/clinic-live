import React from 'react';
import { Mail, MapPin, Phone } from 'lucide-react';
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
      <section className="public-light-section max-w-7xl mx-auto px-4 pt-6 pb-16 sm:px-6 lg:px-8">
        <div className="mb-10 flex items-center justify-between gap-4 flex-wrap">
          <div>
            <p className="text-amber-400 uppercase tracking-[0.2em] text-xs font-semibold mb-3">Contact Us</p>
            <h1 className="text-4xl md:text-5xl font-bold">{content.contactTitle}</h1>
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          {cards.map(({ icon: Icon, title, value, note }) => (
            <div key={title} className="rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
              <Icon className="w-12 h-12 text-amber-400 mx-auto mb-4" />
              <h2 className="text-xl font-bold mb-2">{title}</h2>
              <p className="text-slate-300 font-medium">{value}</p>
              <p className="text-slate-400 text-sm mt-2">{note}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
};
