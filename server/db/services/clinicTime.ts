const DEFAULT_CLINIC_TIMEZONE = 'Asia/Kolkata';

export const getClinicTimezone = (timezone?: string) => timezone || DEFAULT_CLINIC_TIMEZONE;

export const getClinicBusinessDate = (now = new Date(), timezone = DEFAULT_CLINIC_TIMEZONE): string => {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: getClinicTimezone(timezone),
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(now);
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
};

export const getClinicDayStartUtc = (businessDate: string, timezone = DEFAULT_CLINIC_TIMEZONE): Date => {
  const [year, month, day] = businessDate.split('-').map(Number);
  const probe = new Date(Date.UTC(year, month - 1, day));
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: getClinicTimezone(timezone),
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(probe);
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  const localAsUtc = Date.UTC(Number(values.year), Number(values.month) - 1, Number(values.day), Number(values.hour), Number(values.minute), Number(values.second));
  const offsetMs = localAsUtc - probe.getTime();
  return new Date(Date.UTC(year, month - 1, day) - offsetMs);
};