export const makeDoctorBookingQrCodeUrl = (
  clinicId: string,
  doctorId: string,
  baseUrl = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:5173'
): string => {
  const bookingUrl = `${baseUrl.replace(/\/$/, '')}/booking?clinicId=${encodeURIComponent(clinicId)}&doctorId=${encodeURIComponent(doctorId)}`;
  const encodedBookingUrl = encodeURIComponent(bookingUrl);
  return `https://chart.googleapis.com/chart?cht=qr&chs=220x220&chl=${encodedBookingUrl}`;
};
