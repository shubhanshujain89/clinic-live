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

// Load from localStorage (immediate)
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
  saveToLocalStorage(SETTINGS_KEY, settings);
  saveToDatabase('site/settings', settings);
}

export function saveContentSections(sections: ContentSections) {
  saveToLocalStorage(CONTENT_KEY, sections);
  saveToDatabase('site/content', sections);
}

// Save to localStorage (immediate UI update)
function saveToLocalStorage(key: string, data: any) {
  if (typeof window !== 'undefined') {
    window.localStorage.setItem(key, JSON.stringify(data));
    window.dispatchEvent(new Event('site-config-changed'));
  }
}

// Save to database (persistent across devices)
async function saveToDatabase(path: string, data: any) {
  try {
    const endpoint = path === 'site/settings' ? '/api/site/settings' : '/api/site/content';
    const response = await fetch(endpoint, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      throw new Error(`Failed to save to database: ${response.status}`);
    }
  } catch (error) {
    console.error('Failed to save to database:', error);
  }
}

// Load from database (for cross-device sync)
export async function loadSiteSettingsFromDatabase(): Promise<SiteSettings> {
  try {
    const response = await fetch('/api/site/settings', {
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
    });
    if (response.ok) {
      const data = await response.json();
      return { ...defaultSiteSettings, ...data };
    }
  } catch (error) {
    console.error('Failed to load site settings from database:', error);
  }
  return defaultSiteSettings;
}

export async function loadContentSectionsFromDatabase(): Promise<ContentSections> {
  try {
    const response = await fetch('/api/site/content', {
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
    });
    if (response.ok) {
      const data = await response.json();
      return { ...defaultContentSections, ...data };
    }
  } catch (error) {
    console.error('Failed to load content sections from database:', error);
  }
  return defaultContentSections;
}

// Initialize site config from database on app startup
export async function initializeSiteConfig(): Promise<{ settings: SiteSettings; content: ContentSections }> {
  const [settings, content] = await Promise.all([
    loadSiteSettingsFromDatabase(),
    loadContentSectionsFromDatabase(),
  ]);
  
  // Also save to localStorage for immediate access
  saveToLocalStorage(SETTINGS_KEY, settings);
  saveToLocalStorage(CONTENT_KEY, content);
  
  return { settings, content };
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
