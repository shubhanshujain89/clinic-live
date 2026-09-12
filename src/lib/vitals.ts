export const formatOxygenSaturation = (value?: string | null): string | undefined => {
  if (!value) return undefined;
  const trimmed = String(value).trim();
  if (!trimmed) return undefined;
  const normalized = trimmed.replace(/[%\s]/g, '');
  if (!normalized) return undefined;
  const numeric = Number(normalized);
  if (!Number.isFinite(numeric)) return undefined;
  return `${numeric}%`;
};

export const readOxygenSaturationValue = (value?: string | null): string => {
  if (!value) return '';
  const formatted = formatOxygenSaturation(value);
  return formatted ? formatted.replace(/%$/, '') : value.replace(/[^\d.]/g, '');
};
