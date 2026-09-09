export const NEXTQ_SITE_URL = 'https://nextq.app';
export const NEXTQ_LOGO_URL = `${NEXTQ_SITE_URL}/nextq-logo.png`;

export interface SeoRouteMetadata {
  title: string;
  description: string;
  canonical: string;
  ogTitle: string;
  ogDescription: string;
  ogUrl: string;
  ogImage: string;
  twitterTitle: string;
  twitterDescription: string;
  twitterImage: string;
}

const routeMetadata: Record<string, SeoRouteMetadata> = {
  '/': {
    title: 'NEXTQ — Smart Queue. Less Waiting.',
    description: 'NEXTQ is a smart, app-free clinic appointment and queue management platform for patients, reception teams, doctors, and waiting rooms.',
    canonical: `${NEXTQ_SITE_URL}/`,
    ogTitle: 'NEXTQ — Smart Queue. Less Waiting.',
    ogDescription: 'NEXTQ is a smart, app-free clinic appointment and queue management platform for patients, reception teams, doctors, and waiting rooms.',
    ogUrl: `${NEXTQ_SITE_URL}/`,
    ogImage: NEXTQ_LOGO_URL,
    twitterTitle: 'NEXTQ — Smart Queue. Less Waiting.',
    twitterDescription: 'NEXTQ is a smart, app-free clinic appointment and queue management platform for patients, reception teams, doctors, and waiting rooms.',
    twitterImage: NEXTQ_LOGO_URL,
  },
  '/what-we-provide': {
    title: 'What NEXTQ Provides — Clinic Queue Management',
    description: 'Learn how NEXTQ connects patients, reception, doctors, and TV displays with one live queue flow for clinic appointments and tokens.',
    canonical: `${NEXTQ_SITE_URL}/what-we-provide`,
    ogTitle: 'What NEXTQ Provides — Clinic Queue Management',
    ogDescription: 'Learn how NEXTQ connects patients, reception, doctors, and TV displays with one live queue flow for clinic appointments and tokens.',
    ogUrl: `${NEXTQ_SITE_URL}/what-we-provide`,
    ogImage: NEXTQ_LOGO_URL,
    twitterTitle: 'What NEXTQ Provides — Clinic Queue Management',
    twitterDescription: 'Learn how NEXTQ connects patients, reception, doctors, and TV displays with one live queue flow for clinic appointments and tokens.',
    twitterImage: NEXTQ_LOGO_URL,
  },
  '/why-choose-us': {
    title: 'Why Choose NEXTQ — Smart Clinic Operations',
    description: 'NEXTQ helps clinics turn appointments, tokens, and live queue visibility into a calmer patient and staff experience.',
    canonical: `${NEXTQ_SITE_URL}/why-choose-us`,
    ogTitle: 'Why Choose NEXTQ — Smart Clinic Operations',
    ogDescription: 'NEXTQ helps clinics turn appointments, tokens, and live queue visibility into a calmer patient and staff experience.',
    ogUrl: `${NEXTQ_SITE_URL}/why-choose-us`,
    ogImage: NEXTQ_LOGO_URL,
    twitterTitle: 'Why Choose NEXTQ — Smart Clinic Operations',
    twitterDescription: 'NEXTQ helps clinics turn appointments, tokens, and live queue visibility into a calmer patient and staff experience.',
    twitterImage: NEXTQ_LOGO_URL,
  },
  '/benefits': {
    title: 'NEXTQ Benefits — Faster Waiting Rooms and Better Flow',
    description: 'From patient booking to token tracking and live clinic flow visibility, NEXTQ improves appointment clarity and queue efficiency.',
    canonical: `${NEXTQ_SITE_URL}/benefits`,
    ogTitle: 'NEXTQ Benefits — Faster Waiting Rooms and Better Flow',
    ogDescription: 'From patient booking to token tracking and live clinic flow visibility, NEXTQ improves appointment clarity and queue efficiency.',
    ogUrl: `${NEXTQ_SITE_URL}/benefits`,
    ogImage: NEXTQ_LOGO_URL,
    twitterTitle: 'NEXTQ Benefits — Faster Waiting Rooms and Better Flow',
    twitterDescription: 'From patient booking to token tracking and live clinic flow visibility, NEXTQ improves appointment clarity and queue efficiency.',
    twitterImage: NEXTQ_LOGO_URL,
  },
  '/contact': {
    title: 'Contact NEXTQ — Clinic Queue Support',
    description: 'Talk with NEXTQ about smart clinic queue management, appointment flow, token operations, and better patient visibility.',
    canonical: `${NEXTQ_SITE_URL}/contact`,
    ogTitle: 'Contact NEXTQ — Clinic Queue Support',
    ogDescription: 'Talk with NEXTQ about smart clinic queue management, appointment flow, token operations, and better patient visibility.',
    ogUrl: `${NEXTQ_SITE_URL}/contact`,
    ogImage: NEXTQ_LOGO_URL,
    twitterTitle: 'Contact NEXTQ — Clinic Queue Support',
    twitterDescription: 'Talk with NEXTQ about smart clinic queue management, appointment flow, token operations, and better patient visibility.',
    twitterImage: NEXTQ_LOGO_URL,
  },
};

const defaultMeta = routeMetadata['/'];

export const getRouteMetadata = (pathname: string): SeoRouteMetadata => {
  const normalized = pathname === '' || pathname === '/' ? '/' : pathname;
  return routeMetadata[normalized] || defaultMeta;
};

export const buildJsonLd = (pathname: string) => {
  const meta = getRouteMetadata(pathname);
  const organization = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: 'NEXTQ',
    url: NEXTQ_SITE_URL,
    logo: NEXTQ_LOGO_URL,
    description: meta.description,
    sameAs: [
      'https://linkedin.com/company/nextq',
      'https://facebook.com/nextq',
      'https://instagram.com/nextq',
      'https://x.com/nextq',
      'https://youtube.com/@nextq',
    ],
    contactPoint: {
      '@type': 'ContactPoint',
      contactType: 'sales',
      email: 'hello@nextq.app',
      areaServed: 'IN',
      availableLanguage: ['English'],
    },
  };

  const softwareApplication = {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: 'NEXTQ',
    applicationCategory: 'Healthcare',
    operatingSystem: 'Web',
    description: meta.description,
    url: NEXTQ_SITE_URL,
    offers: {
      '@type': 'Offer',
      priceCurrency: 'INR',
      price: '0',
      availability: 'https://schema.org/InStock',
    },
    featureList: [
      'Clinic booking',
      'Patient token tracking',
      'Live queue management',
      'Reception desk workflow',
      'Doctor consultation workflow',
      'TV waiting room display',
    ],
  };

  const website = {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: 'NEXTQ',
    url: NEXTQ_SITE_URL,
    description: meta.description,
    potentialAction: {
      '@type': 'SearchAction',
      target: `${NEXTQ_SITE_URL}/?q={search_term_string}`,
      'query-input': 'required name=search_term_string',
    },
  };

  return {
    '@context': 'https://schema.org',
    '@graph': [organization, softwareApplication, website],
  };
};

export const applyRouteMetadata = (pathname = '/') => {
  const meta = getRouteMetadata(pathname);

  const updateTag = (selector: string, attributes: Record<string, string>) => {
    let element = document.head.querySelector(selector) as HTMLMetaElement | HTMLLinkElement | null;
    if (!element) {
      element = selector === 'link[rel="canonical"]'
        ? document.createElement('link')
        : document.createElement('meta');
      if (selector === 'link[rel="canonical"]') {
        element.setAttribute('rel', 'canonical');
      }
      document.head.appendChild(element);
    }

    for (const [key, value] of Object.entries(attributes)) {
      if (key === 'rel' || key === 'href' || key === 'property') {
        continue;
      }
      element.setAttribute(key, value);
    }
  };

  document.title = meta.title;

  const setMetaDescription = (key: string, content: string) => {
    let existing = document.head.querySelector(`meta[name="${key}"]`);
    if (!existing) {
      existing = document.createElement('meta');
      existing.setAttribute('name', key);
      document.head.appendChild(existing);
    }
    existing.setAttribute('content', content);
  };

  const setMetaProperty = (property: string, content: string) => {
    let existing = document.head.querySelector(`meta[property="${property}"]`);
    if (!existing) {
      existing = document.createElement('meta');
      existing.setAttribute('property', property);
      document.head.appendChild(existing);
    }
    existing.setAttribute('content', content);
  };

  const setTwitter = (name: string, content: string) => {
    let existing = document.head.querySelector(`meta[name="${name}"]`);
    if (!existing) {
      existing = document.createElement('meta');
      existing.setAttribute('name', name);
      document.head.appendChild(existing);
    }
    existing.setAttribute('content', content);
  };

  setMetaDescription('description', meta.description);
  setMetaProperty('og:title', meta.ogTitle);
  setMetaProperty('og:description', meta.ogDescription);
  setMetaProperty('og:site_name', 'NEXTQ');
  setMetaProperty('og:url', meta.ogUrl);
  setMetaProperty('og:image', meta.ogImage);
  setMetaProperty('og:type', 'website');

  setTwitter('twitter:title', meta.twitterTitle);
  setTwitter('twitter:description', meta.twitterDescription);
  setTwitter('twitter:image', meta.twitterImage);
  setTwitter('twitter:card', 'summary_large_image');

  const canonical = document.head.querySelector('link[rel="canonical"]') || document.createElement('link');
  canonical.setAttribute('rel', 'canonical');
  canonical.setAttribute('href', meta.canonical);
  if (!document.head.querySelector('link[rel="canonical"]')) {
    document.head.appendChild(canonical);
  }

  const jsonLd = buildJsonLd(pathname);
  let script = document.getElementById('nextq-schema') as HTMLScriptElement | null;
  if (!script) {
    script = document.createElement('script');
    script.id = 'nextq-schema';
    script.type = 'application/ld+json';
    document.head.appendChild(script);
  }
  script.textContent = JSON.stringify(jsonLd);
};
