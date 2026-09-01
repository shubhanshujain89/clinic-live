export type DashboardMode = 'site-admin' | 'clinic-admin';

export const getDashboardTabs = (mode: DashboardMode) => {
  const commonTabs = [
    { key: 'dashboard', label: 'Dashboard' },
    { key: 'clinic-summary', label: 'Clinic Wise Summary' },
    { key: 'clinics', label: 'Clinics' },
    { key: 'users', label: 'Users' },
    { key: 'security', label: 'Access & Security' },
    { key: 'billing', label: 'Billing & Packs' },
    { key: 'audit', label: 'Audit Trail' },
    { key: 'recent-activity', label: 'Recent Activity' },
  ] as const;

  if (mode === 'site-admin') {
    return [
      ...commonTabs.slice(0, 2),
      { key: 'content', label: 'Website Content' },
      ...commonTabs.slice(2),
    ];
  }

  return commonTabs;
};
