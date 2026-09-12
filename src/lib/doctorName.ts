export const formatDoctorName = (value?: string | null): string => {
  const trimmed = (value ?? '').trim();
  if (!trimmed) return 'Doctor';

  const cleaned = trimmed
    .replace(/^\s+/, '')
    .replace(/\s+$/, '')
    .replace(/^Dr\.?\s+/i, '')
    .replace(/^Doctor\s+/i, '');

  return `Dr. ${cleaned}`;
};
