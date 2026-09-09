export const NEXTQ_SITE_URL = 'https://nextq.in';
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
    description: 'NEXTQ is a clinic queue management software and appointment scheduling platform that helps clinics manage appointment flow, patient queue tracking, and live token visibility without an app.',
    canonical: `${NEXTQ_SITE_URL}/`,
    ogTitle: 'NEXTQ — Smart Queue. Less Waiting.',
    ogDescription: 'NEXTQ is a clinic queue management software and appointment scheduling platform that helps clinics manage appointment flow, patient queue tracking, and live token visibility without an app.',
    ogUrl: `${NEXTQ_SITE_URL}/`,
    ogImage: NEXTQ_LOGO_URL,
    twitterTitle: 'NEXTQ — Smart Queue. Less Waiting.',
    twitterDescription: 'NEXTQ is a clinic queue management software and appointment scheduling platform that helps clinics manage appointment flow, patient queue tracking, and live token visibility without an app.',
    twitterImage: NEXTQ_LOGO_URL,
  },
  '/what-we-provide': {
    title: 'What NEXTQ Provides — Clinic Queue Management',
    description: 'Learn how NEXTQ brings appointment scheduling, patient queue management, digital token systems, reception workflow, doctor consultation flow, and clinic TV display visibility together.',
    canonical: `${NEXTQ_SITE_URL}/what-we-provide`,
    ogTitle: 'What NEXTQ Provides — Clinic Queue Management',
    ogDescription: 'Learn how NEXTQ brings appointment scheduling, patient queue management, digital token systems, reception workflow, doctor consultation flow, and clinic TV display visibility together.',
    ogUrl: `${NEXTQ_SITE_URL}/what-we-provide`,
    ogImage: NEXTQ_LOGO_URL,
    twitterTitle: 'What NEXTQ Provides — Clinic Queue Management',
    twitterDescription: 'Learn how NEXTQ brings appointment scheduling, patient queue management, digital token systems, reception workflow, doctor consultation flow, and clinic TV display visibility together.',
    twitterImage: NEXTQ_LOGO_URL,
  },
  '/why-choose-us': {
    title: 'Why Choose NEXTQ — Smart Clinic Operations',
    description: 'NEXTQ helps clinics reduce patient waiting, improve patient flow, support reception queue management, and create a more confident healthcare queue management experience.',
    canonical: `${NEXTQ_SITE_URL}/why-choose-us`,
    ogTitle: 'Why Choose NEXTQ — Smart Clinic Operations',
    ogDescription: 'NEXTQ helps clinics reduce patient waiting, improve patient flow, support reception queue management, and create a more confident healthcare queue management experience.',
    ogUrl: `${NEXTQ_SITE_URL}/why-choose-us`,
    ogImage: NEXTQ_LOGO_URL,
    twitterTitle: 'Why Choose NEXTQ — Smart Clinic Operations',
    twitterDescription: 'NEXTQ helps clinics reduce patient waiting, improve patient flow, support reception queue management, and create a more confident healthcare queue management experience.',
    twitterImage: NEXTQ_LOGO_URL,
  },
  '/benefits': {
    title: 'NEXTQ Benefits — Faster Waiting Rooms and Better Flow',
    description: 'From appointment scheduling and digital queue management to patient token tracking and waiting room visibility, NEXTQ improves clinic efficiency and patient flow.',
    canonical: `${NEXTQ_SITE_URL}/benefits`,
    ogTitle: 'NEXTQ Benefits — Faster Waiting Rooms and Better Flow',
    ogDescription: 'From appointment scheduling and digital queue management to patient token tracking and waiting room visibility, NEXTQ improves clinic efficiency and patient flow.',
    ogUrl: `${NEXTQ_SITE_URL}/benefits`,
    ogImage: NEXTQ_LOGO_URL,
    twitterTitle: 'NEXTQ Benefits — Faster Waiting Rooms and Better Flow',
    twitterDescription: 'From appointment scheduling and digital queue management to patient token tracking and waiting room visibility, NEXTQ improves clinic efficiency and patient flow.',
    twitterImage: NEXTQ_LOGO_URL,
  },
  '/contact': {
    title: 'Contact NEXTQ — Clinic Queue Support',
    description: 'Talk with NEXTQ about clinic queue management software, patient appointment software, live queue tracking, patient token tracking, and smarter clinic waiting room operations.',
    canonical: `${NEXTQ_SITE_URL}/contact`,
    ogTitle: 'Contact NEXTQ — Clinic Queue Support',
    ogDescription: 'Talk with NEXTQ about clinic queue management software, patient appointment software, live queue tracking, patient token tracking, and smarter clinic waiting room operations.',
    ogUrl: `${NEXTQ_SITE_URL}/contact`,
    ogImage: NEXTQ_LOGO_URL,
    twitterTitle: 'Contact NEXTQ — Clinic Queue Support',
    twitterDescription: 'Talk with NEXTQ about clinic queue management software, patient appointment software, live queue tracking, patient token tracking, and smarter clinic waiting room operations.',
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
      email: 'hello@nextq.in',
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
