export const buildTrackingHref = (mobile: string = '') => {
  const digits = String(mobile || '').replace(/\D/g, '').slice(-10);
  return digits ? `/track?mobile=${encodeURIComponent(digits)}` : '/track';
};
