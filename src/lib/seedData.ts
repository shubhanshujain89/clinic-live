import { db, doc, setDoc, collection, getDocs, deleteDoc } from './firebase';
import { Clinic, TokenItem, QueueSession } from '../types/queue';

export const DEFAULT_CLINIC_ID = 'clinic_basic_demo';

export const DEMO_CLINIC_ACCOUNTS = [
  { clinicId: 'clinic_basic_demo', clinicName: 'Primary Care Clinic', plan: 'TRIAL', role: 'doctor', email: 'doctor@clinic.local', label: 'Lead Doctor' },
  { clinicId: 'clinic_basic_demo', clinicName: 'Primary Care Clinic', plan: 'TRIAL', role: 'staff', email: 'staff@clinic.local', label: 'Front Desk' },
];

export const DEMO_CLINICS: Clinic[] = [
  {
    id: 'clinic_basic_demo',
    name: 'Primary Care Clinic',
    doctorName: 'Lead Doctor',
    specialty: 'General Medicine & Family Practice',
    cabinNumber: 'Cabin 1, Ground Floor',
    doctorStatus: 'IN',
    delayMinutes: 0,
    delayReason: '',
    avgConsultationMinutes: 12,
    consultationFee: 500,
    currentRunningToken: 'B-101',
    currentRunningTokenId: 'tok_basic_01',
    activeSessionId: 'sess_clinic_basic_demo',
    totalPatientsToday: 9,
    revenueToday: 4200,
    phone: '+91 98765 10001',
    address: 'Clinic address to be configured',
    featurePlan: 'TRIAL',
    whatsappNotificationsEnabled: false,
    clinicUpiId: 'clinic@upi',
  },
];

export const HOURS_OPTIONS = [
  '9:00 AM - 6:00 PM',
  '9:30 AM - 7:00 PM',
  '10:00 AM - 7:00 PM',
  '8:00 AM - 5:00 PM',
  '24 Hours',
];

export const DEMO_DOCTORS = [
  {
    id: 'doc_basic_01',
    name: 'Lead Doctor',
    specialization: 'General Medicine & Family Practice',
    clinicId: 'clinic_basic_demo',
    qualification: 'MBBS, MD',
    experience: '8',
    phone: '+91 98765 43210',
    email: 'doctor@clinic.local',
    bio: 'Experienced physician focused on preventive care and family health.',
    consultationFee: 500,
    availableDays: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
    availableHours: '9:00 AM - 6:00 PM',
    rating: 4.8,
    status: 'active',
    createdAt: new Date().toISOString(),
  },
];

export const INITIAL_CLINIC_DATA: Clinic = DEMO_CLINICS[0];

export const INITIAL_SESSION_DATA: QueueSession = {
  id: 'sess_today',
  clinicId: DEFAULT_CLINIC_ID,
  date: new Date().toISOString().split('T')[0],
  activeTokenId: 'tok_03',
  activeTokenNumber: 'A-103',
  status: 'ACTIVE',
  totalTokensIssued: 12,
  rollingAvgMinutes: 8.5,
  completedCount: 2,
  totalRevenue: 7850,
};

export const INITIAL_TOKENS_DATA: TokenItem[] = [
  {
    id: 'tok_01',
    clinicId: DEFAULT_CLINIC_ID,
    sessionId: 'sess_today',
    tokenNumber: 'A-101',
    sequenceNumber: 1,
    patientName: 'Ramesh Patel',
    patientPhone: '+91 98201 11223',
    patientAge: 52,
    patientGender: 'Male',
    tokenType: 'ONLINE',
    status: 'COMPLETED',
    isVip: false,
    isHold: false,
    priority: 10,
    amountPaid: 750,
    paymentMethod: 'UPI',
    paymentStatus: 'PAID',
    createdAt: new Date(Date.now() - 75 * 60000).toISOString(),
    calledAt: new Date(Date.now() - 65 * 60000).toISOString(),
    completedAt: new Date(Date.now() - 55 * 60000).toISOString(),
    consultationDurationSeconds: 600,
    doctorNotes: 'BP stable (128/82). Prescribed Telmisartan 40mg once daily. Follow-up in 4 weeks with lipid profile.',
    preConsultationNotes: {
      symptoms: 'Routine hypertension follow-up and slight morning dizziness.',
      duration: '4 days',
      severity: 'Mild',
      painScale: 2,
      allergies: 'None known',
      feverTemp: '98.4°F',
      bpReading: '130/84 mmHg',
      submittedAt: new Date(Date.now() - 70 * 60000).toISOString(),
    },
  },
  {
    id: 'tok_02',
    clinicId: DEFAULT_CLINIC_ID,
    sessionId: 'sess_today',
    tokenNumber: 'A-102',
    sequenceNumber: 2,
    patientName: 'Meera Deshmukh',
    patientPhone: '+91 98450 33445',
    patientAge: 38,
    patientGender: 'Female',
    tokenType: 'ONLINE',
    status: 'COMPLETED',
    isVip: false,
    isHold: false,
    priority: 10,
    amountPaid: 750,
    paymentMethod: 'CARD',
    paymentStatus: 'PAID',
    createdAt: new Date(Date.now() - 60 * 60000).toISOString(),
    calledAt: new Date(Date.now() - 54 * 60000).toISOString(),
    completedAt: new Date(Date.now() - 44 * 60000).toISOString(),
    consultationDurationSeconds: 580,
    doctorNotes: 'Sinus arrhythmia observed, benign. ECG normal. Advised hydration and sleep schedule.',
    preConsultationNotes: {
      symptoms: 'Palpitations after evening coffee and fatigue.',
      duration: '1 week',
      severity: 'Moderate',
      painScale: 3,
      allergies: 'Penicillin',
      feverTemp: '98.6°F',
      submittedAt: new Date(Date.now() - 58 * 60000).toISOString(),
    },
  },
  {
    id: 'tok_03',
    clinicId: DEFAULT_CLINIC_ID,
    sessionId: 'sess_today',
    tokenNumber: 'A-103',
    sequenceNumber: 3,
    patientName: 'Vikramaditya Rao',
    patientPhone: '+91 97110 55667',
    patientAge: 45,
    patientGender: 'Male',
    tokenType: 'ONLINE',
    status: 'SERVING',
    isVip: false,
    isHold: false,
    priority: 10,
    amountPaid: 750,
    paymentMethod: 'UPI',
    paymentStatus: 'PAID',
    createdAt: new Date(Date.now() - 40 * 60000).toISOString(),
    calledAt: new Date(Date.now() - 4 * 60000).toISOString(),
    preConsultationNotes: {
      symptoms: 'Mild chest tightness upon climbing stairs, shortness of breath.',
      duration: '2 weeks',
      severity: 'Severe',
      painScale: 6,
      allergies: 'Sulfa drugs',
      feverTemp: '98.8°F',
      bpReading: '142/90 mmHg',
      submittedAt: new Date(Date.now() - 35 * 60000).toISOString(),
      attachments: [
        {
          name: 'ecg_report_aug.pdf',
          type: 'application/pdf',
          size: 142000,
        },
      ],
    },
  },
  {
    id: 'tok_04',
    clinicId: DEFAULT_CLINIC_ID,
    sessionId: 'sess_today',
    tokenNumber: 'VIP-01',
    sequenceNumber: 4,
    patientName: 'Ananya Singhania (Emergency)',
    patientPhone: '+91 99220 88990',
    patientAge: 29,
    patientGender: 'Female',
    tokenType: 'VIP',
    status: 'WAITING',
    isVip: true,
    isHold: false,
    priority: 1,
    amountPaid: 1000,
    paymentMethod: 'CARD',
    paymentStatus: 'PAID',
    createdAt: new Date(Date.now() - 25 * 60000).toISOString(),
    preConsultationNotes: {
      symptoms: 'Acute migraine with visual aura and nausea.',
      duration: '6 hours',
      severity: 'Critical',
      painScale: 9,
      allergies: 'None',
      submittedAt: new Date(Date.now() - 20 * 60000).toISOString(),
    },
  },
  {
    id: 'tok_05',
    clinicId: DEFAULT_CLINIC_ID,
    sessionId: 'sess_today',
    tokenNumber: 'W-104',
    sequenceNumber: 5,
    patientName: 'Gurpreet Singh',
    patientPhone: '+91 98880 12345',
    patientAge: 61,
    patientGender: 'Male',
    tokenType: 'WALK_IN',
    status: 'WAITING',
    isVip: false,
    isHold: false,
    priority: 10,
    amountPaid: 750,
    paymentMethod: 'CASH',
    paymentStatus: 'PAID',
    createdAt: new Date(Date.now() - 20 * 60000).toISOString(),
    preConsultationNotes: {
      symptoms: 'Persistent joint aches and knee swelling.',
      duration: '3 weeks',
      severity: 'Moderate',
      painScale: 5,
      submittedAt: new Date(Date.now() - 15 * 60000).toISOString(),
    },
  },
  {
    id: 'tok_06',
    clinicId: DEFAULT_CLINIC_ID,
    sessionId: 'sess_today',
    tokenNumber: 'A-105',
    sequenceNumber: 6,
    patientName: 'Sneha Kulkarni',
    patientPhone: '+91 97660 44556',
    patientAge: 32,
    patientGender: 'Female',
    tokenType: 'ONLINE',
    status: 'HOLD',
    isVip: false,
    isHold: true,
    priority: 10,
    amountPaid: 750,
    paymentMethod: 'UPI',
    paymentStatus: 'PAID',
    createdAt: new Date(Date.now() - 18 * 60000).toISOString(),
    preConsultationNotes: {
      symptoms: 'Stepped out for diagnostic blood test. Will return in 10 mins.',
      duration: 'Today',
      severity: 'Mild',
      painScale: 1,
      submittedAt: new Date(Date.now() - 12 * 60000).toISOString(),
    },
  },
  {
    id: 'tok_07',
    clinicId: DEFAULT_CLINIC_ID,
    sessionId: 'sess_today',
    tokenNumber: 'W-106',
    sequenceNumber: 7,
    patientName: 'Mohammad Farooqi',
    patientPhone: '+91 98230 77889',
    patientAge: 44,
    patientGender: 'Male',
    tokenType: 'WALK_IN',
    status: 'WAITING',
    isVip: false,
    isHold: false,
    priority: 10,
    amountPaid: 750,
    paymentMethod: 'CASH',
    paymentStatus: 'PAID',
    createdAt: new Date(Date.now() - 10 * 60000).toISOString(),
  },
  {
    id: 'tok_08',
    clinicId: DEFAULT_CLINIC_ID,
    sessionId: 'sess_today',
    tokenNumber: 'A-107',
    sequenceNumber: 8,
    patientName: 'Pooja Bhattacharya',
    patientPhone: '+91 98110 99887',
    patientAge: 27,
    patientGender: 'Female',
    tokenType: 'ONLINE',
    status: 'WAITING',
    isVip: false,
    isHold: false,
    priority: 10,
    amountPaid: 750,
    paymentMethod: 'NETBANKING',
    paymentStatus: 'PAID',
    createdAt: new Date(Date.now() - 5 * 60000).toISOString(),
    preConsultationNotes: {
      symptoms: 'Seasonal allergic rhinitis and dry cough.',
      duration: '5 days',
      severity: 'Mild',
      painScale: 2,
      submittedAt: new Date(Date.now() - 3 * 60000).toISOString(),
    },
  },
];

export async function seedClinicDatabase(force: boolean = false) {
  try {
    const clinicEntries = DEMO_CLINICS;
    for (const clinic of clinicEntries) {
      const clinicRef = doc(db, 'clinics', clinic.id);
      await setDoc(clinicRef, clinic, { merge: !force });

      const sessionRef = doc(db, 'queue_sessions', clinic.activeSessionId || `sess_${clinic.id}`);
      await setDoc(sessionRef, {
        id: clinic.activeSessionId || `sess_${clinic.id}`,
        clinicId: clinic.id,
        date: new Date().toISOString().split('T')[0],
        activeTokenId: clinic.currentRunningTokenId,
        activeTokenNumber: clinic.currentRunningToken,
        status: 'ACTIVE',
        totalTokensIssued: clinic.totalPatientsToday || 10,
        rollingAvgMinutes: clinic.avgConsultationMinutes,
        completedCount: Math.max(2, Math.floor((clinic.totalPatientsToday || 10) * 0.5)),
        totalRevenue: clinic.revenueToday || 0,
      }, { merge: !force });
    }

    const tokenSeed = INITIAL_TOKENS_DATA.map((token) => ({
      ...token,
      clinicId: token.clinicId === DEFAULT_CLINIC_ID ? DEMO_CLINICS[0].id : token.clinicId,
    }));

    for (const token of tokenSeed) {
      const tokenRef = doc(db, 'tokens', token.id);
      await setDoc(tokenRef, token, { merge: !force });
    }

    // Seed doctors
    for (const doctor of DEMO_DOCTORS) {
      const doctorRef = doc(db, 'doctors', doctor.id);
      await setDoc(doctorRef, doctor, { merge: !force });
    }

    return { success: true, count: tokenSeed.length };
  } catch (err) {
    console.error('Failed to seed clinic database:', err);
    return { success: false, error: err };
  }
}

export async function resetClinicDatabase() {
  try {
    const tokensSnapshot = await getDocs(collection(db, 'tokens'));
    for (const d of tokensSnapshot.docs) {
      await deleteDoc(d.ref);
    }

    const sessionSnapshot = await getDocs(collection(db, 'queue_sessions'));
    for (const d of sessionSnapshot.docs) {
      await deleteDoc(d.ref);
    }

    const clinicSnapshot = await getDocs(collection(db, 'clinics'));
    for (const d of clinicSnapshot.docs) {
      await deleteDoc(d.ref);
    }

    const doctorSnapshot = await getDocs(collection(db, 'doctors'));
    for (const d of doctorSnapshot.docs) {
      await deleteDoc(d.ref);
    }

    await seedClinicDatabase(true);
    return { success: true };
  } catch (err) {
    console.error('Failed to reset database:', err);
    return { success: false, error: err };
  }
}
