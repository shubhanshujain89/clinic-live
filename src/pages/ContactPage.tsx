import React from 'react';
import { Mail, MapPin, Phone } from 'lucide-react';

interface Props {
  onNavigate: (page: string) => void;
}

export const ContactPage: React.FC<Props> = ({ onNavigate }) => {
  const cards = [
    {
      icon: Phone,
      title: 'Phone',
      value: '+91 (555) 123-4567',
      note: 'Mon-Fri, 9AM-6PM IST'
    },
    {
      icon: Mail,
      title: 'Email',
      value: 'support@clinicflow.pro',
      note: 'We respond within 24 hours'
    },
    {
      icon: MapPin,
      title: 'Location',
      value: 'Bangalore, India',
      note: 'Enterprise HQ'
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 text-white">
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="mb-10 flex items-center justify-between gap-4 flex-wrap">
          <div>
            <p className="text-amber-400 uppercase tracking-[0.2em] text-xs font-semibold mb-3">Contact Us</p>
            <h1 className="text-4xl md:text-5xl font-bold">Let’s build a smarter clinic experience.</h1>
          </div>
          <button
            onClick={() => onNavigate('landing')}
            className="px-5 py-3 rounded-lg bg-amber-500 hover:bg-amber-600 font-semibold transition"
          >
            Back to Home
          </button>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          {cards.map(({ icon: Icon, title, value, note }) => (
            <div key={title} className="bg-slate-800/50 border border-slate-700 rounded-2xl p-8 text-center">
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
