import React, { useState, useEffect } from 'react';
import { Calendar, Clock, MapPin, Stethoscope, ChevronRight, Check, Heart } from 'lucide-react';

interface Clinic {
  id: string;
  name: string;
  address: string;
  phone: string;
  email: string;
  specializations: string[];
  operatingHours: string;
}

interface Doctor {
  id: string;
  name: string;
  specialization: string;
  clinicId: string;
  consultationFee: number;
  availableDays: string[];
  availableHours: string;
  rating: number;
}

interface PatientBookingProps {
  onBack: () => void;
}

export const PatientBooking: React.FC<PatientBookingProps> = ({ onBack }) => {
  const [step, setStep] = useState<'clinic' | 'doctor' | 'booking' | 'confirm'>('clinic');
  const [clinics, setClinics] = useState<Clinic[]>([]);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [selectedClinic, setSelectedClinic] = useState<Clinic | null>(null);
  const [selectedDoctor, setSelectedDoctor] = useState<Doctor | null>(null);
  const [selectedSpecialization, setSelectedSpecialization] = useState('');
  
  const [bookingData, setBookingData] = useState({
    patientName: '',
    phone: '',
    age: '',
    symptoms: '',
  });

  const [bookingId, setBookingId] = useState('');

  useEffect(() => {
    fetchClinics();
  }, []);

  const fetchClinics = async () => {
    try {
      const response = await fetch('/api/clinics');
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || 'Unable to load clinics.');
      setClinics((payload || []) as Clinic[]);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching clinics:', error);
      setLoading(false);
    }
  };

  const fetchDoctors = async (clinicId: string, specialization?: string) => {
    try {
      const url = new URL(`/api/clinics/${clinicId}/doctors`, window.location.origin);
      if (specialization) {
        url.searchParams.set('specialization', specialization);
      }
      const response = await fetch(url.toString());
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || 'Unable to load doctors.');
      setDoctors((payload || []) as Doctor[]);
    } catch (error) {
      console.error('Error fetching doctors:', error);
    }
  };

  const handleClinicSelect = (clinic: Clinic) => {
    setSelectedClinic(clinic);
    fetchDoctors(clinic.id);
    setStep('doctor');
  };

  const handleSpecializationFilter = (spec: string) => {
    setSelectedSpecialization(spec);
    if (selectedClinic) {
      fetchDoctors(selectedClinic.id, spec);
    }
  };

  const handleDoctorSelect = (doctor: Doctor) => {
    setSelectedDoctor(doctor);
    setStep('booking');
  };

  const handleBookAppointment = async () => {
    if (!selectedClinic || !selectedDoctor || !bookingData.patientName.trim() || !bookingData.phone.trim()) {
      alert('Patient name and mobile number are required.');
      return;
    }

    try {
      const response = await fetch('/api/patient/book', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clinicId: selectedClinic.id,
          doctorId: selectedDoctor.id,
          patientName: bookingData.patientName,
          phone: bookingData.phone,
          age: bookingData.age ? Number(bookingData.age) : undefined,
          reason: bookingData.symptoms,
        }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || 'Unable to book appointment.');

      setBookingId(payload.trackingId);
      setStep('confirm');
    } catch (error) {
      console.error('Error booking appointment:', error);
      alert('Failed to book appointment. Please try again.');
    }
  };

  if (loading) {
    return (
      <div className="bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 text-white flex items-center justify-center py-8">
        <p className="text-slate-400">Loading clinics...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen text-white">
      {/* Stepper */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Page Title */}
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold mb-2">Book Your Appointment</h1>
          <p className="text-slate-400">Quick and easy appointment scheduling</p>
        </div>
        <div className="flex items-center justify-between mb-12">
          {['clinic', 'doctor', 'booking', 'confirm'].map((s, i) => (
            <React.Fragment key={s}>
              <div className={`flex flex-col items-center ${['clinic', 'doctor', 'booking', 'confirm'].indexOf(step) >= i ? 'opacity-100' : 'opacity-50'}`}>
                <div className={`w-12 h-12 rounded-full flex items-center justify-center font-bold mb-2 ${
                  ['clinic', 'doctor', 'booking', 'confirm'].indexOf(step) > i ? 'bg-emerald-500' :
                  step === s ? 'bg-emerald-400 border-2 border-emerald-300' :
                  'bg-slate-700 border-2 border-slate-600'
                }`}>
                  {['clinic', 'doctor', 'booking', 'confirm'].indexOf(step) > i ? <Check className="w-6 h-6" /> : i + 1}
                </div>
                <span className="text-xs font-semibold text-center">
                  {s === 'clinic' && 'Select Clinic'}
                  {s === 'doctor' && 'Choose Doctor'}
                  {s === 'booking' && 'Book Appointment'}
                  {s === 'confirm' && 'Confirmation'}
                </span>
              </div>
              {i < 3 && <div className={`flex-1 h-1 mx-4 ${['clinic', 'doctor', 'booking', 'confirm'].indexOf(step) > i ? 'bg-emerald-500' : 'bg-slate-700'}`} />}
            </React.Fragment>
          ))}
        </div>

        {/* Step 1: Select Clinic */}
        {step === 'clinic' && (
          <div className="space-y-6">
            <h2 className="text-3xl font-bold">Select a Clinic</h2>
            <div className="grid md:grid-cols-2 gap-6">
              {clinics.map(clinic => (
                <button
                  key={clinic.id}
                  onClick={() => handleClinicSelect(clinic)}
                  className="bg-slate-800/50 border border-slate-700 rounded-xl p-6 hover:border-emerald-400/50 hover:bg-slate-800 transition text-left group"
                >
                  <h3 className="text-xl font-bold group-hover:text-emerald-400 transition mb-2">{clinic.name}</h3>
                  <div className="space-y-2 text-slate-400 text-sm mb-4">
                    <div className="flex items-center gap-2">
                      <MapPin className="w-4 h-4 text-emerald-400" />
                      {clinic.address}
                    </div>
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-emerald-400" />
                      {clinic.operatingHours}
                    </div>
                    <p>{clinic.phone}</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {clinic.specializations?.slice(0, 3).map((spec, i) => (
                      <span key={i} className="px-2 py-1 bg-emerald-400/20 text-emerald-400 rounded text-xs">
                        {spec}
                      </span>
                    ))}
                    {clinic.specializations?.length > 3 && (
                      <span className="px-2 py-1 bg-slate-700 text-slate-300 rounded text-xs">
                        +{clinic.specializations.length - 3}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center justify-between mt-4 pt-4 border-t border-slate-700">
                    <span className="text-emerald-400 font-semibold">Select Clinic</span>
                    <ChevronRight className="w-5 h-5 text-emerald-400 group-hover:translate-x-1 transition" />
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Step 2: Choose Doctor */}
        {step === 'doctor' && selectedClinic && (
          <div className="space-y-6">
            <div>
              <h2 className="text-3xl font-bold mb-2">Choose a Doctor</h2>
              <p className="text-slate-400">{selectedClinic.name}</p>
            </div>

            {/* Specialization Filter */}
            <div>
              <h3 className="text-lg font-semibold mb-3">Filter by Specialization</h3>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => handleSpecializationFilter('')}
                  className={`px-4 py-2 rounded-lg transition ${selectedSpecialization === '' ? 'bg-emerald-500 text-white' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'}`}
                >
                  All
                </button>
                {selectedClinic.specializations?.map(spec => (
                  <button
                    key={spec}
                    onClick={() => handleSpecializationFilter(spec)}
                    className={`px-4 py-2 rounded-lg transition ${selectedSpecialization === spec ? 'bg-emerald-500 text-white' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'}`}
                  >
                    {spec}
                  </button>
                ))}
              </div>
            </div>

            {/* Doctors List */}
            <div className="grid md:grid-cols-2 gap-6">
              {doctors.length === 0 ? (
                <div className="col-span-2 text-center py-12">
                  <Stethoscope className="w-16 h-16 text-slate-600 mx-auto mb-4 opacity-50" />
                  <p className="text-slate-400">No doctors available for this specialization</p>
                </div>
              ) : (
                doctors.map(doctor => (
                  <button
                    key={doctor.id}
                    onClick={() => handleDoctorSelect(doctor)}
                    className="bg-slate-800/50 border border-slate-700 rounded-xl p-6 hover:border-emerald-400/50 hover:bg-slate-800 transition text-left group"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <h3 className="text-xl font-bold group-hover:text-emerald-400 transition">Dr. {doctor.name}</h3>
                        <p className="text-emerald-400 text-sm">{doctor.specialization}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-emerald-400 font-bold">₹{doctor.consultationFee}</p>
                        <p className="text-xs text-slate-400">per consultation</p>
                      </div>
                    </div>

                    <div className="space-y-2 text-slate-400 text-sm mb-4">
                      <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4 text-emerald-400" />
                        {doctor.availableHours}
                      </div>
                      <p>{doctor.availableDays?.slice(0, 3).join(', ')}{doctor.availableDays?.length > 3 ? ', +more' : ''}</p>
                    </div>

                    <div className="flex items-center justify-between pt-4 border-t border-slate-700">
                      <span className="text-emerald-400 font-semibold">Select Doctor</span>
                      <ChevronRight className="w-5 h-5 text-emerald-400 group-hover:translate-x-1 transition" />
                    </div>
                  </button>
                ))
              )}
            </div>

            <button
              onClick={() => setStep('clinic')}
              className="w-full px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg transition"
            >
              Back to Clinics
            </button>
          </div>
        )}

        {/* Step 3: Book Appointment */}
        {step === 'booking' && selectedClinic && selectedDoctor && (
          <div className="space-y-6 max-w-2xl">
            <div>
              <h2 className="text-3xl font-bold mb-2">Appointment Details</h2>
              <p className="text-slate-400">Dr. {selectedDoctor.name} at {selectedClinic.name}</p>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold mb-2">Full Name *</label>
                  <input
                    type="text"
                    value={bookingData.patientName}
                    onChange={(e) => setBookingData({ ...bookingData, patientName: e.target.value })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2 text-white focus:border-emerald-400 focus:outline-none"
                    placeholder="Your name"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold mb-2">Mobile Number *</label>
                  <input
                    type="tel"
                    value={bookingData.phone}
                    onChange={(e) => setBookingData({ ...bookingData, phone: e.target.value })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2 text-white focus:border-emerald-400 focus:outline-none"
                    placeholder="Your phone"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold mb-2">Age (optional)</label>
                <input
                  type="number"
                  min="0"
                  max="120"
                  value={bookingData.age}
                  onChange={(e) => setBookingData({ ...bookingData, age: e.target.value })}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2 text-white focus:border-emerald-400 focus:outline-none"
                  placeholder="Age"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold mb-2">Short reason for visit (optional)</label>
                <textarea
                  value={bookingData.symptoms}
                  onChange={(e) => setBookingData({ ...bookingData, symptoms: e.target.value })}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2 text-white focus:border-emerald-400 focus:outline-none resize-none"
                  rows={3}
                  maxLength={240}
                  placeholder="Brief reason for your visit"
                />
              </div>
            </div>

            <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-4">
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-400">Consultation Fee:</span>
                  <span className="font-bold text-emerald-400">₹{selectedDoctor.consultationFee}</span>
                </div>
              </div>
            </div>

            <div className="flex gap-4">
              <button
                onClick={() => setStep('doctor')}
                className="flex-1 px-4 py-3 bg-slate-700 hover:bg-slate-600 rounded-lg transition"
              >
                Back
              </button>
              <button
                onClick={handleBookAppointment}
                className="flex-1 px-4 py-3 bg-gradient-to-r from-emerald-500 to-cyan-500 rounded-lg font-semibold hover:shadow-lg hover:shadow-emerald-500/50 transition"
              >
                Confirm Booking
              </button>
            </div>
          </div>
        )}

        {/* Step 4: Confirmation */}
        {step === 'confirm' && (
          <div className="space-y-6 max-w-2xl">
            <div className="text-center py-12">
              <div className="w-16 h-16 rounded-full bg-emerald-400/20 border-2 border-emerald-400 flex items-center justify-center mx-auto mb-6">
                <Check className="w-8 h-8 text-emerald-400" />
              </div>
              <h2 className="text-3xl font-bold mb-2">Appointment Confirmed!</h2>
              <p className="text-slate-400 mb-6">Your appointment has been successfully booked.</p>
            </div>

            <div className="bg-slate-800/50 border border-emerald-400/30 rounded-xl p-6 space-y-4">
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-slate-400">Tracking ID:</span>
                  <span className="font-mono font-bold">{bookingId}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Doctor:</span>
                  <span className="font-bold">Dr. {selectedDoctor?.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Clinic:</span>
                  <span className="font-bold">{selectedClinic?.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Consultation Fee:</span>
                  <span className="font-bold text-emerald-400">₹{selectedDoctor?.consultationFee}</span>
                </div>
              </div>

              <div className="border-t border-slate-700 pt-4">
                <p className="text-sm text-slate-400">Use this tracking ID to view your live queue status.</p>
                <a className="text-sm text-emerald-400 font-semibold" href={`/track/${bookingId}`}>Open live tracker</a>
              </div>
            </div>

          </div>
        )}
      </div>
    </div>
  );
};
