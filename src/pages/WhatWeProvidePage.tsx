import React from 'react';
import { useSiteConfig } from '../lib/siteConfig';

interface Props {
  onNavigate: (page: string) => void;
}

export const WhatWeProvidePage: React.FC<Props> = ({ onNavigate }) => {
  const { content } = useSiteConfig();
    return ( 
    <div className="public-light-page"> 
      <main className="mx-auto max-w-7xl px-4 pb-20 pt-12 sm:px-6 sm:pt-16 lg:px-8"> 
        <section className="border-b border-slate-200 pb-14 lg:pb-20"> 
          <p className="public-kicker">How NEXTQ works</p> 
          <div className="mt-4 grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(18rem,0.55fr)] lg:items-end"> 
            <div> 
              <h1 className="public-page-title max-w-4xl">{content.whatWeProvideTitle}</h1> 
              <p className="public-page-lede max-w-2xl">One connected system for the patient journey, the reception desk, the consultation room, and the waiting-room display.</p> 
            </div> 
            <div className="border-l-2 border-emerald-500 pl-5 text-sm leading-7 text-slate-600"> 
              <p className="font-semibold text-slate-900">Simple on the outside. Powerful underneath.</p> 
              <p>No app downloads, no complicated handoffs, and no guesswork about what happens next.</p> 
            </div> 
          </div> 
          <div className="mt-8 flex flex-wrap gap-3"> 
            <button type="button" onClick={() => onNavigate('booking')} className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-5 py-3 text-sm font-bold text-white transition hover:bg-slate-700"> 
              Start with NEXTQ <ArrowRight className="h-4 w-4" aria-hidden="true" /> 
            </button> 
            <button type="button" onClick={() => onNavigate('contact')} className="rounded-lg border border-slate-300 bg-white px-5 py-3 text-sm font-bold text-slate-700 transition hover:border-emerald-400 hover:text-emerald-700"> 
              Talk to our team 
            </button> 
          </div> 
        </section> 
        <section className="py-14 lg:py-20" aria-labelledby="experience-heading"> 
          <div className="max-w-2xl"> 
            <p className="public-kicker">Four connected experiences</p> 
            <h2 id="experience-heading" className="mt-3 text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl">Every role knows what to do next.</h2> 
            <p className="mt-4 leading-7 text-slate-600">NEXTQ keeps each workflow focused while sharing one reliable source of queue truth across the clinic.</p> 
          </div> 
          <div className="mt-10 grid gap-5 lg:grid-cols-2"> 
            {experiences.map((experience) => { 
              const Icon = experience.icon; 
              return ( 
                <article key={experience.role} className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-0.5 hover:border-emerald-300 hover:shadow-md sm:p-8"> 
                  <div className="flex items-start gap-4"> 
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700"> 
                      <Icon className="h-5 w-5" aria-hidden="true" /> 
                    </div> 
                    <div> 
                      <p className="public-kicker">{experience.role}</p> 
                      <h3 className="mt-2 text-2xl font-extrabold tracking-tight text-slate-900">{experience.title}</h3> 
                      <p className="mt-2 text-sm leading-6 text-slate-600">{experience.description}</p> 
                    </div> 
                  </div> 
                  <ol className="mt-7 space-y-4 border-t border-slate-100 pt-5"> 
                    {experience.steps.map(([title, text], index) => ( 
                      <li key={title} className="flex gap-3"> 
                        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-slate-100 text-[11px] font-extrabold text-slate-500">{index + 1}</span> 
                        <span> 
                          <strong className="block text-sm font-bold text-slate-900">{title}</strong> 
                          <span className="mt-1 block text-sm leading-5 text-slate-600">{text}</span> 
                        </span> 
                      </li> 
                    ))} 
                  </ol> 
                </article> 
              ); 
            })} 
          </div> 
        </section> 
        <section className="border-t border-slate-200 py-14 lg:py-20" aria-labelledby="capabilities-heading"> 
          <div className="grid gap-10 lg:grid-cols-[minmax(15rem,0.65fr)_minmax(0,1.35fr)]"> 
            <div> 
              <p className="public-kicker">What NEXTQ provides</p> 
              <h2 id="capabilities-heading" className="mt-3 text-3xl font-extrabold tracking-tight text-slate-900">The essentials for a smoother clinic day.</h2> 
            </div> 
            <div className="grid gap-4 sm:grid-cols-2"> 
              {capabilities.map((capability) => { 
                const Icon = capability.icon; 
                return ( 
                  <div key={capability.title} className="border-l-2 border-emerald-200 bg-white p-5 shadow-sm"> 
                    <Icon className="h-5 w-5 text-emerald-700" aria-hidden="true" /> 
                    <h3 className="mt-4 font-bold text-slate-900">{capability.title}</h3> 
                    <p className="mt-2 text-sm leading-6 text-slate-600">{capability.text}</p> 
                  </div> 
                ); 
              })} 
            </div> 
          </div> 
        </section> 
        <section className="flex flex-col gap-5 border-t border-emerald-200 bg-emerald-50 px-5 py-8 sm:flex-row sm:items-center sm:justify-between sm:px-8" aria-label="Get started with NEXTQ"> 
          <div> 
            <p className="public-kicker">Ready when your clinic is</p> 
            <h2 className="mt-2 text-2xl font-extrabold tracking-tight text-slate-900">Make the next visit easier.</h2> 
          </div> 
          <div className="flex items-center gap-2 text-sm font-bold text-emerald-800"><CheckCircle2 className="h-5 w-5" aria-hidden="true" /> App-free for patients</div> 
        </section> 
      </main> 
    </div> 
  ); 
};
