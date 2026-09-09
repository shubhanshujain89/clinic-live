import React from 'react';
import { useSiteConfig } from '../lib/siteConfig';

interface Props {
  onNavigate: (page: string) => void;
}

export const WhatWeProvidePage: React.FC<Props> = ({ onNavigate }) => {
  const { content } = useSiteConfig();
  return (
    <div className="public-light-page">
      <section className="public-light-section mx-auto max-w-4xl px-5 py-16 sm:px-8 lg:px-10">
        <p className="public-kicker">How NEXTQ works</p>
        <h1 className="public-page-title">{content.whatWeProvideTitle}</h1>
        <p className="public-page-lede">One clinic. Four simple experiences. Every role sees exactly what they need to keep the day moving.</p>
        <button type="button" onClick={() => onNavigate('booking')} className="public-text-link">Start with NEXTQ <span aria-hidden="true">→</span></button>
      </section>
    </div>
  );
};
