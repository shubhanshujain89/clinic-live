export const makeDoctorBookingQrCodeUrl = (
  clinicId: string,
  doctorId: string,
  baseUrl = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:5173'
): string => {
  const bookingUrl = `${baseUrl.replace(/\/$/, '')}/booking?clinicId=${encodeURIComponent(clinicId)}&doctorId=${encodeURIComponent(doctorId)}`;
  const encodedBookingUrl = encodeURIComponent(bookingUrl);
  return `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodedBookingUrl}`;
};

export const extractBookingTokenNumber = (
  payload: { tokenNumber?: string | null } | null | undefined
): string => {
  const tokenNumber = payload?.tokenNumber;
  return typeof tokenNumber === 'string' ? tokenNumber.trim() : '';
};
