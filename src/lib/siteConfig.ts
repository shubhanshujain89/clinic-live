import { useEffect, useState } from 'react';

export interface SiteSettings {
  siteName: string;
  siteTagline: string;
  contactEmail: string;
  contactPhone: string;
  whatsappNumber: string;
  supportAddress: string;
  facebookUrl: string;
  instagramUrl: string;
  linkedinUrl: string;
  xUrl: string;
  youtubeUrl: string;
  heroTitle: string;
  heroSubtitle: string;
  whatsappEnabled: boolean;
  verificationKey: string;
  accessMode: string;
  clinicAccessLabel: string;
}

export interface ContentSections {
  heroTitle: string;
  heroSubtitle: string;
  whatWeProvideTitle: string;
  whyChooseTitle: string;
  benefitsTitle: string;
  contactTitle: string;
  footerText: string;
}

export const defaultSiteSettings: SiteSettings = {
  siteName: 'ClinicFlow Pro',
  siteTagline: 'Digital Queue Management for OPD Clinics',
  contactEmail: 'hello@clinicflow.pro',
  contactPhone: '+91 98765 43210',
  whatsappNumber: '+91 98765 43210',
  supportAddress: '12, Sunrise Avenue, Whitefield',
  facebookUrl: 'https://facebook.com/clinicflow',
  instagramUrl: 'https://instagram.com/clinicflow',
  linkedinUrl: 'https://linkedin.com/company/clinicflow',
  xUrl: 'https://x.com/clinicflow',
  youtubeUrl: 'https://youtube.com/@clinicflow',
  heroTitle: 'Digital Queue Management, built for modern clinics',
  heroSubtitle: 'Patients scan a QR code, get a numbered token instantly, and know exactly when their turn arrives. No chaos, no overcrowding, no missed calls.',
  whatsappEnabled: true,
  verificationKey: 'CFP-2026-ENTERPRISE',
  accessMode: 'restricted',
  clinicAccessLabel: 'Approved clinic access only',
};

export const defaultContentSections: ContentSections = {
  heroTitle: 'Digital Queue Management, built for modern clinics',
  heroSubtitle: 'Patients scan a QR code, get a numbered token instantly, and know exactly when their turn arrives. No chaos, no overcrowding, no missed calls.',
  whatWeProvideTitle: 'Built for smarter, calmer patient journeys.',
  whyChooseTitle: 'Built for smarter clinic operations.',
  benefitsTitle: 'What you gain with ClinicFlow Pro.',
  contactTitle: 'Let’s modernise your clinic flow.',
  footerText: 'Digital Queue Management for OPD Clinics',
};

const SETTINGS_KEY = 'clinicflow-site-settings';
const CONTENT_KEY = 'clinicflow-site-content';

export function loadSiteSettings(): SiteSettings {
  if (typeof window === 'undefined') return defaultSiteSettings;
  const raw = window.localStorage.getItem(SETTINGS_KEY);
  if (!raw) return defaultSiteSettings;
  try {
    return { ...defaultSiteSettings, ...JSON.parse(raw) };
  } catch {
    return defaultSiteSettings;
  }
}

export function loadContentSections(): ContentSections {
  if (typeof window === 'undefined') return defaultContentSections;
  const raw = window.localStorage.getItem(CONTENT_KEY);
  if (!raw) return defaultContentSections;
  try {
    return { ...defaultContentSections, ...JSON.parse(raw) };
  } catch {
    return defaultContentSections;
  }
}

export function saveSiteSettings(settings: SiteSettings) {
  if (typeof window !== 'undefined') {
    window.localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
    window.dispatchEvent(new Event('site-config-changed'));
  }
}

export function saveContentSections(sections: ContentSections) {
  if (typeof window !== 'undefined') {
    window.localStorage.setItem(CONTENT_KEY, JSON.stringify(sections));
    window.dispatchEvent(new Event('site-config-changed'));
  }
}

export function useSiteConfig() {
  const [settings, setSettings] = useState<SiteSettings>(loadSiteSettings);
  const [content, setContent] = useState<ContentSections>(loadContentSections);

  useEffect(() => {
    const syncConfig = () => {
      setSettings(loadSiteSettings());
      setContent(loadContentSections());
    };

    syncConfig();
    window.addEventListener('site-config-changed', syncConfig);

    return () => {
      window.removeEventListener('site-config-changed', syncConfig);
    };
  }, []);

  return { settings, content };
}
