import express from 'express';
import path from 'path';
import crypto from 'crypto';
import net from 'net';
import { getDatabase, readDoc, listQuery, writeDoc, updateDoc, deleteDoc, findUserByEmail, verifyPassword, createPublicBooking, getPublicTracking, resetUserPassword, DEFAULT_USER_PASSWORD, extractTableName } from './server/db.js';
import { repositories } from './server/db/repositories/index.js';
import { services } from './server/db/services/index.js';

const app = express();

const getAvailablePort = async (preferredPort: number): Promise<number> => {
  return new Promise((resolve, reject) => {
    const tryPort = (port: number) => {
      const tester = net.createServer();
      tester.once('error', (error: NodeJS.ErrnoException) => {
        if (error.code === 'EADDRINUSE') {
          tryPort(port + 1);
          return;
        }
        reject(error);
      });
      tester.once('listening', () => {
        tester.close(() => resolve(port));
      });
      tester.listen(port, '0.0.0.0');
    };

    tryPort(preferredPort);
  });
};

const PORT = Number(process.env.BACKEND_PORT || process.env.PORT || 4000);

const sessions = new Map<string, AuthContext & { createdAt: number }>();

const databaseReady = getDatabase();

type AuthContext = {
  userId: string;
  role: 'SUPER_ADMIN' | 'CLINIC_ADMIN' | 'DOCTOR' | 'STAFF';
  clinicId: string | null;
  doctorId: string | null;
  email: string;
};

// Session cleanup: evict expired sessions every 10 minutes
setInterval(() => {
  const now = Date.now();
  const TTL_MS = 8 * 60 * 60 * 1000;
  for (const [token, ctx] of sessions) {
    if (now - ctx.createdAt > TTL_MS) sessions.delete(token);
  }
}, 10 * 60 * 1000);

// Rate limiting: simple in-memory rate limiter
const rateLimitStore = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX = 30;

function checkRateLimit(key: string, max = RATE_LIMIT_MAX): boolean {
  const now = Date.now();
  const entry = rateLimitStore.get(key);
  if (!entry || now > entry.resetAt) {
    rateLimitStore.set(key, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return true;
  }
  entry.count++;
  return entry.count <= max;
}

setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of rateLimitStore) {
    if (now > entry.resetAt) rateLimitStore.delete(key);
  }
}, 60_000);

const cookieValue = (req: express.Request, name: string) => {
  const cookies = String(req.headers.cookie || '').split(';');
  const entry = cookies.find((item) => item.trim().startsWith(`${name}=`));
  return entry ? decodeURIComponent(entry.trim().slice(name.length + 1)) : '';
};

const authContext = (req: express.Request) => sessions.get(cookieValue(req, 'clinicflow_session'));

const getClinicAccessStatus = async (clinicId: string | null, clinicName?: string) => {
  let resolvedClinicId = clinicId;
  if (!resolvedClinicId && clinicName) {
    const clinic = await repositories.clinics.findOne({ name: clinicName });
    resolvedClinicId = clinic?.id || null;
  }
  if (!resolvedClinicId) return 'Granted';
  const record = await repositories.settings.findOne({ key: `clinic_access_${resolvedClinicId}`, clinic_id: null });
  return record?.value || 'Granted';
};
const serverTableMap: Record<string, string> = {
  clinics: 'clinics', doctors: 'doctors', users: 'staff_users', staff_users: 'staff_users', staff: 'staff_users',
  patients: 'patients', sessions: 'sessions', queue_sessions: 'sessions', appointments: 'appointments',
  tokens: 'tokens', queue_events: 'queue_events', doctor_status: 'doctor_status', settings: 'settings', whatsapp_logs: 'whatsapp_logs',
};
const tableForPath = (value: string) => {
  const raw = String(value).replace(/^\/+|\/+$/g, '').split('/')[0];
  return serverTableMap[raw] || raw;
};
const secureEqual = (left: string, right: string) => {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);
  return leftBuffer.length === rightBuffer.length && crypto.timingSafeEqual(leftBuffer, rightBuffer);
};

const canAccessRecord = (context: AuthContext, record: Record<string, any>, table: string) => {
  if (context.role === 'SUPER_ADMIN') return true;
  const recordClinicId = table === 'clinics' ? record.id : (record.clinicId || record.clinic_id);
  if (recordClinicId && recordClinicId !== context.clinicId) return false;
  if (context.role === 'DOCTOR' && table === 'doctors') {
    return (record.id || record.doctorId) === context.doctorId;
  }
  if (context.role === 'DOCTOR' && record.doctorId && record.doctorId !== context.doctorId) return false;
  return !recordClinicId || recordClinicId === context.clinicId;
};

const requireDatabaseAccess = (req: express.Request, res: express.Response, next: express.NextFunction) => {
  const context = authContext(req);
  const requestedPath = String(req.query.path || req.body?.path || '');
  if (!context) {
    res.status(401).json({ error: 'Authentication required.' });
    return;
  }
  (req as express.Request & { auth?: AuthContext }).auth = context;
  next();
};

app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true }));

app.use((req, res, next) => {
  res.removeHeader('X-Powered-By');
  next();
});

app.get('/api/health', (_req, res) => {
  res.status(200).json({
    status: 'ok',
    app: 'ClinicFlow Pro',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
  });
});

app.get('/api/status', (_req, res) => {
  res.status(200).json({
    service: 'clinic-queue-backend',
    mode: 'operational',
    platform: 'ClinicFlow Pro',
    features: [
      'Queue orchestration',
      'Patient intake',
      'WhatsApp automation',
      'Doctor and reception operations',
    ],
  });
});

const normalizeSettingKey = (key: string) => String(key || '')
  .replace(/_([a-z])/g, (_, letter: string) => letter.toUpperCase())
  .replace(/-([a-z])/g, (_, letter: string) => letter.toUpperCase());

const parseSpecializationList = (value: unknown): string[] => {
  if (Array.isArray(value)) return value.filter(Boolean).map(String);
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) return [];
    try {
      const parsed = JSON.parse(trimmed);
      if (Array.isArray(parsed)) return parsed.filter(Boolean).map(String);
    } catch {
      // Fall through to comma-splitting
    }
    return trimmed
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean);
  }
  return [];
};

app.get('/api/clinics', async (_req, res) => {
  try {
    const clinics = await repositories.clinics.findActive();
    const publicClinics = clinics.map((clinic) => ({
      id: clinic.id,
      name: clinic.name,
      address: clinic.address || '',
      phone: clinic.phone || '',
      email: clinic.email || '',
      specializations: parseSpecializationList(clinic.specializations),
      operatingHours: clinic.operatingHours || '',
    }));
    res.status(200).json(publicClinics);
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Unable to load clinics.' });
  }
});

app.get('/api/clinics/:clinicId/doctors', async (req, res) => {
  try {
    const { clinicId } = req.params;
    const specializationFilter = String(req.query.specialization || '').trim();
    const doctors = await repositories.doctors.findActiveByClinicId(clinicId);
    const publicDoctors = doctors
      .filter((doctor) => !specializationFilter || !doctor.specialization || doctor.specialization.toLowerCase() === specializationFilter.toLowerCase())
      .map((doctor) => ({
        id: doctor.id,
        clinicId: doctor.clinicId,
        name: doctor.name,
        specialization: doctor.specialization || '',
        consultationFee: Number(doctor.consultationFee || 0),
        availableDays: Array.isArray(doctor.availableDays) ? doctor.availableDays : [],
        availableHours: doctor.availableHours || '',
        rating: Number(doctor.rating || 0),
      }));
    res.status(200).json(publicDoctors);
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Unable to load doctors.' });
  }
});

app.get('/api/staff/queue/:clinicId', async (req, res) => {
  try {
    const context = authContext(req);
    const requestedClinicId = String(req.params.clinicId || '');
    if (!context || (context.role !== 'SUPER_ADMIN' && context.clinicId !== requestedClinicId)) {
      res.status(403).json({ error: 'Clinic access denied.' });
      return;
    }

    const clinic = await repositories.clinics.findById(requestedClinicId);
    if (!clinic) {
      res.status(404).json({ error: 'Clinic not found.' });
      return;
    }

    const session = await repositories.sessions.findActiveByClinicId(requestedClinicId);
    const doctors = await repositories.doctors.findActiveByClinicId(requestedClinicId);
    const scopedDoctors = context.role === 'DOCTOR'
      ? doctors.filter((doctor) => doctor.id === context.doctorId)
      : doctors;
    const tokens = session
      ? (await Promise.all(scopedDoctors.map((doctor) => repositories.tokens.findByDoctorAndSession(doctor.id, session.id)))).flat()
      : [];

    res.status(200).json({
      clinic: {
        id: clinic.id,
        name: clinic.name,
        doctorName: clinic.doctorName || '',
        specialty: clinic.specialty || '',
        cabinNumber: clinic.cabinNumber || '',
        doctorStatus: clinic.doctorStatus,
        delayMinutes: clinic.delayMinutes || 0,
        delayReason: clinic.delayReason || '',
        avgConsultationMinutes: clinic.avgConsultationMinutes || 0,
        consultationFee: clinic.consultationFee || 0,
        currentRunningToken: clinic.currentRunningToken || '',
        currentRunningTokenId: clinic.currentRunningTokenId || '',
        activeSessionId: clinic.activeSessionId || session?.id || '',
        totalPatientsToday: clinic.totalPatientsToday || 0,
        revenueToday: clinic.revenueToday || 0,
        featurePlan: clinic.featurePlan,
        whatsappNotificationsEnabled: clinic.whatsappNotificationsEnabled,
        hasPaymentGateway: clinic.hasPaymentGateway,
        clinicUpiId: clinic.clinicUpiId || '',
      },
      session: session ? {
        id: session.id,
        clinicId: session.clinicId,
        date: session.date.toISOString(),
        activeTokenId: session.activeTokenId || '',
        activeTokenNumber: session.activeTokenNumber || '',
        status: session.status,
        totalTokensIssued: session.totalTokensIssued,
        rollingAvgMinutes: session.rollingAvgMinutes,
        completedCount: session.completedCount,
        totalRevenue: session.totalRevenue,
      } : null,
      tokens: tokens.map((token) => ({
        id: token.id,
        clinicId: token.clinicId,
        sessionId: token.sessionId,
        tokenNumber: token.tokenNumber,
        sequenceNumber: token.sequenceNumber,
        patientId: token.patientId,
        patientName: token.patientName,
        patientPhone: token.patientPhone,
        patientAge: token.patientAge,
        patientGender: token.patientGender,
        tokenType: token.tokenType,
        status: token.status,
        isVip: token.isVip,
        isHold: token.isHold,
        priority: token.priority,
        amountPaid: token.amountPaid,
        paymentMode: token.paymentMode,
        paymentMethod: token.paymentMethod,
        paymentStatus: token.paymentStatus,
        createdAt: token.createdAt.toISOString(),
        calledAt: token.calledAt?.toISOString(),
        completedAt: token.completedAt?.toISOString(),
        consultationDurationSeconds: token.consultationDurationSeconds,
        preConsultationNotes: token.preConsultationNotes,
        weight: token.weight,
        temperature: token.temperature,
        bloodPressure: token.bloodPressure,
        triageNotes: token.triageNotes,
        doctorNotes: token.doctorNotes,
        whatsappSentCount: token.whatsappSentCount,
        whatsappLastSentAt: token.whatsappLastSentAt?.toISOString(),
      })),
    });
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Unable to load queue.' });
  }
});

app.post('/api/staff/queue/:tokenId/call', async (req, res) => {
  try {
    const context = authContext(req);
    if (!context || !context.clinicId) {
      res.status(401).json({ error: 'Authentication required.' });
      return;
    }
    const token = await services.queue.callTokenForClinic(
      String(req.params.tokenId || ''),
      context.clinicId,
      context.role === 'DOCTOR' ? context.doctorId || undefined : undefined
    );
    if (!token) {
      res.status(409).json({ error: 'Token is unavailable or has already been called.' });
      return;
    }
    res.status(200).json(token);
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Unable to call token.' });
  }
});

app.post('/api/staff/queue/:tokenId/start', async (req, res) => {
  try {
    const context = authContext(req);
    if (!context || !context.clinicId) {
      res.status(401).json({ error: 'Authentication required.' });
      return;
    }
    const token = await services.queue.startTokenForClinic(
      String(req.params.tokenId || ''),
      context.clinicId,
      context.role === 'DOCTOR' ? context.doctorId || undefined : undefined
    );
    if (!token) {
      res.status(409).json({ error: 'Token must be CALLED and available to start.' });
      return;
    }
    res.status(200).json(token);
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Unable to start consultation.' });
  }
});

app.post('/api/staff/queue/:tokenId/complete', async (req, res) => {
  try {
    const context = authContext(req);
    if (!context || !context.clinicId) {
      res.status(401).json({ error: 'Authentication required.' });
      return;
    }
    const token = await services.queue.completeTokenForClinic(
      String(req.params.tokenId || ''),
      context.clinicId,
      context.role === 'DOCTOR' ? context.doctorId || undefined : undefined,
      typeof req.body?.doctorNotes === 'string' ? req.body.doctorNotes : ''
    );
    if (!token) {
      res.status(409).json({ error: 'Token must be IN_CONSULTATION and available to complete.' });
      return;
    }
    res.status(200).json(token);
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Unable to complete consultation.' });
  }
});

app.post('/api/patient/book', async (req, res) => {
  try {
    const clientIp = req.ip || req.socket.remoteAddress || 'unknown';
    if (!checkRateLimit(`booking:${clientIp}`, 10)) {
      res.status(429).json({ error: 'Too many booking attempts. Please try again later.' });
      return;
    }
    const { clinicId, doctorId, patientName, phone, age, reason } = req.body || {};
    if (!clinicId || !doctorId || !String(patientName || '').trim() || !String(phone || '').trim()) {
      res.status(400).json({ error: 'Clinic, doctor, patient name, and mobile number are required.' });
      return;
    }
    const booking = await createPublicBooking({
      clinicId: String(clinicId),
      doctorId: String(doctorId),
      patientName: String(patientName),
      phone: String(phone),
      age: age ? Number(age) : undefined,
      reason: reason ? String(reason) : undefined,
    });
    res.status(201).json(booking);
  } catch (error) {
    res.status(400).json({ error: error instanceof Error ? error.message : 'Unable to create booking.' });
  }
});

app.get('/api/patient/track/:trackingId', async (req, res) => {
  try {
    const trackingId = String(req.params.trackingId || '');
    if (!/^[A-Za-z0-9_-]{12}$/.test(trackingId)) {
      res.status(404).json({ error: 'Tracking record not found.' });
      return;
    }
    const tracking = await getPublicTracking(trackingId);
    if (!tracking) {
      res.status(404).json({ error: 'Tracking record not found.' });
      return;
    }
    res.status(200).json({
      ...tracking,
      estimatedConsultationTime: tracking.estimatedConsultationMinutes,
    });
  } catch (error) {
    res.status(503).json({ error: 'Connection temporarily unavailable.' });
  }
});

app.patch('/api/patient/track/:trackingId/notes', async (req, res) => {
  try {
    const trackingId = String(req.params.trackingId || '');
    if (!/^[A-Za-z0-9_-]{12}$/.test(trackingId)) {
      res.status(400).json({ error: 'Invalid tracking ID.' });
      return;
    }

    const patient = await repositories.patients.findByTrackingId(trackingId);
    if (!patient) {
      res.status(404).json({ error: 'Tracking record not found.' });
      return;
    }

    const token = await repositories.tokens.findByPatientId(patient.id);
    if (!token) {
      res.status(404).json({ error: 'Tracking record not found.' });
      return;
    }

    const allowedKeys = new Set([
      'symptoms',
      'duration',
      'severity',
      'painScale',
      'allergies',
      'feverTemp',
      'temperature',
      'bpReading',
      'bloodPressure',
      'weight',
      'attachments',
      'submittedAt',
      'lastEditedBy',
    ]);

    const incoming = req.body || {};
    const notes = Object.keys(incoming || {}).reduce<Record<string, any>>((acc, key) => {
      if (allowedKeys.has(key)) {
        acc[key] = incoming[key];
      }
      return acc;
    }, {});

    if (!notes.symptoms || typeof notes.symptoms !== 'string' || !String(notes.symptoms).trim()) {
      res.status(400).json({ error: 'Symptoms are required.' });
      return;
    }

    if (notes.attachments !== undefined && !Array.isArray(notes.attachments)) {
      res.status(400).json({ error: 'Attachments must be an array.' });
      return;
    }

    const existingNotes = token.preConsultationNotes && typeof token.preConsultationNotes === 'object'
      ? token.preConsultationNotes
      : {};

    const nextNotes = {
      ...existingNotes,
      ...notes,
      submittedAt: new Date().toISOString(),
      lastEditedBy: 'PATIENT',
    };

    await repositories.tokens.update(token.id, { preConsultationNotes: nextNotes });
    res.status(200).json({
      ok: true,
      trackingId,
      notes: nextNotes,
    });
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Unable to update patient notes.' });
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const clientIp = req.ip || req.socket.remoteAddress || 'unknown';
    if (!checkRateLimit(`login:${clientIp}`, 10)) {
      res.status(429).json({ error: 'Too many login attempts. Please try again later.' });
      return;
    }
    const { email = '', password = '', role: requestedRole = '' } = req.body || {};
    const normalizedEmail = String(email).trim();
    const normalizedPassword = String(password);
    const normalizedRole = String(requestedRole).toUpperCase();
    
    if (process.env.DEBUG_MODE === 'true') console.log(`[LOGIN] Attempt: email=${normalizedEmail}, role=${normalizedRole}`);

    const superAdminPassword = process.env.SUPER_ADMIN_PASSWORD || '';
    const superAdminUsername = process.env.SUPER_ADMIN_USERNAME || 'admin';

    let context: AuthContext | null = null;
    let accountAccessStatus = 'Granted';
    let accountClinicName = '';
    
    // Check super admin credentials
    if (normalizedEmail === superAdminUsername && superAdminPassword && secureEqual(normalizedPassword, superAdminPassword)) {
      context = { userId: 'super-admin', role: 'SUPER_ADMIN', clinicId: null, doctorId: null, email: superAdminUsername };
      if (process.env.DEBUG_MODE === 'true') console.log('[LOGIN] Super admin authenticated');
    } else {
      // Check regular user credentials
      const account = await findUserByEmail(normalizedEmail);
      
      if (account && verifyPassword(normalizedPassword, account.passwordHash)) {
        accountAccessStatus = account.accessStatus || 'Granted';
        accountClinicName = account.clinicName || '';
        const role = String(account.role || 'CLINIC_ADMIN').toUpperCase() as AuthContext['role'];
        if (['CLINIC_ADMIN', 'DOCTOR', 'STAFF', 'SUPER_ADMIN'].includes(role)) {
          context = { userId: account.id, role, clinicId: account.clinicId || null, doctorId: account.doctorId || null, email: account.email };
        }
      }
    }

    if (!context) {
      res.status(401).json({ error: 'Invalid credentials or user not found.' });
      return;
    }

    if (context.role !== 'SUPER_ADMIN') {
      const clinicAccessStatus = await getClinicAccessStatus(context.clinicId, accountClinicName);
      if (['Hold', 'Denied'].includes(clinicAccessStatus) || ['Pending', 'Revoked'].includes(accountAccessStatus)) {
        res.status(403).json({ error: clinicAccessStatus === 'Denied' || accountAccessStatus === 'Revoked' ? 'Access denied.' : 'Clinic access is on hold.' });
        return;
      }
    }

    if (normalizedRole && normalizedRole !== context.role && !(normalizedRole === 'CLINIC-ADMIN' && context.role === 'CLINIC_ADMIN')) {
      console.log(`[LOGIN] Role mismatch: requested=${normalizedRole}, actual=${context.role}`);
      res.status(401).json({ error: 'Role mismatch.' });
      return;
    }

    const token = crypto.randomBytes(32).toString('hex');
    sessions.set(token, { ...context, createdAt: Date.now() });
    const isSecureCookie = process.env.NODE_ENV === 'production' || String(req.headers['x-forwarded-proto'] || '').toLowerCase() === 'https';
    const cookieAttributes = [
      'Path=/',
      'HttpOnly',
      isSecureCookie ? 'SameSite=None' : 'SameSite=Lax',
      `Max-Age=${8 * 60 * 60}`,
      ...(isSecureCookie ? ['Secure'] : []),
    ];
    res.setHeader('Set-Cookie', `clinicflow_session=${encodeURIComponent(token)}; ${cookieAttributes.join('; ')}`);

    const responseData = { 
      user: { 
        uid: context.userId, 
        email: context.email, 
        role: context.role, 
        clinicId: context.clinicId, 
        doctorId: context.doctorId,
        displayName: context.email 
      } 
    };
    res.status(200).json(responseData);
  } catch (error) {
    console.error('Authentication error:', error instanceof Error ? error.message : error);
    const errorMsg = error instanceof Error ? error.message : 'Login failed';
    res.status(500).json({ error: errorMsg });
  }
});

app.post('/api/auth/logout', (req, res) => {
  const token = cookieValue(req, 'clinicflow_session');
  sessions.delete(token);
  const isSecureCookie = process.env.NODE_ENV === 'production' || String(req.headers['x-forwarded-proto'] || '').toLowerCase() === 'https';
  res.setHeader('Set-Cookie', `clinicflow_session=; Path=/; HttpOnly; ${isSecureCookie ? 'SameSite=None; Secure' : 'SameSite=Lax'}; Max-Age=0`);
  res.status(204).end();
});

app.get('/api/audit', async (req, res) => {
  const context = authContext(req);
  if (!context || !['SUPER_ADMIN', 'CLINIC_ADMIN'].includes(context.role)) {
    res.status(401).json({ error: 'Authentication required.' });
    return;
  }

  try {
    const records = await repositories.settings.findAll({ where: { category: 'audit' }, orderBy: 'updated_at', orderDirection: 'DESC', limit: 100 });
    const visible = context.role === 'SUPER_ADMIN' ? records : records.filter((r) => {
      try {
        const parsed = JSON.parse(r.value || '{}');
        return !parsed.clinicId || parsed.clinicId === context.clinicId;
      } catch {
        return false;
      }
    });
    res.status(200).json(visible.map((record) => {
      try {
        return { id: record.id, ...(JSON.parse(record.value || '{}')), timestamp: record.updatedAt.toISOString() };
      } catch {
        return { id: record.id, title: 'Audit event', detail: record.value || '', timestamp: record.updatedAt.toISOString() };
      }
    }));
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Unable to load audit trail.' });
  }
});

app.post('/api/audit', async (req, res) => {
  const context = authContext(req);
  if (!context || !['SUPER_ADMIN', 'CLINIC_ADMIN'].includes(context.role)) {
    res.status(401).json({ error: 'Authentication required.' });
    return;
  }

  try {
    const { title = '', detail = '' } = req.body || {};
    if (!String(title).trim() || !String(detail).trim()) {
      res.status(400).json({ error: 'Audit title and detail are required.' });
      return;
    }
    const record = await repositories.settings.create({
      id: crypto.randomUUID(),
      key: `audit_${Date.now()}_${crypto.randomUUID()}`,
      value: JSON.stringify({ title: String(title), detail: String(detail), actor: context.email, role: context.role, clinicId: context.clinicId, time: new Date().toISOString() }),
      category: 'audit',
      clinicId: null,
    } as any);
    res.status(201).json({ ok: true, id: record.id });
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Unable to record audit event.' });
  }
});

app.get('/api/clinic-access', async (req, res) => {
  const context = authContext(req);
  if (!context || !['SUPER_ADMIN', 'CLINIC_ADMIN'].includes(context.role)) {
    res.status(401).json({ error: 'Authentication required.' });
    return;
  }

  try {
    const records = await repositories.settings.findAll({ where: { category: 'clinic_access' } });
    const access: Record<string, string> = {};
    records.forEach((record) => {
      if (record.value && (context.role === 'SUPER_ADMIN' || context.clinicId === record.key.replace(/^clinic_access_/, ''))) {
        access[record.key.replace(/^clinic_access_/, '')] = record.value;
      }
    });
    res.status(200).json(access);
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Unable to load clinic access.' });
  }
});

app.post('/api/clinic-access', async (req, res) => {
  const context = authContext(req);
  const clinicId = String(req.body?.clinicId || '').trim();
  const status = String(req.body?.status || '').trim();
  if (!context || !['SUPER_ADMIN', 'CLINIC_ADMIN'].includes(context.role)) {
    res.status(401).json({ error: 'Authentication required.' });
    return;
  }
  if (!clinicId || !['Granted', 'Hold', 'Denied'].includes(status)) {
    res.status(400).json({ error: 'Clinic and valid access status are required.' });
    return;
  }
  if (context.role === 'CLINIC_ADMIN' && context.clinicId !== clinicId) {
    res.status(403).json({ error: 'Clinic access denied.' });
    return;
  }

  try {
    const key = `clinic_access_${clinicId}`;
    const existing = await repositories.settings.findOne({ key, clinic_id: null });
    if (existing) await repositories.settings.update(existing.id, { value: status, category: 'clinic_access' });
    else await repositories.settings.create({ id: crypto.randomUUID(), key, value: status, category: 'clinic_access', clinicId: null } as any);
    const databaseStatus = status === 'Hold' ? 'Pending' : status === 'Denied' ? 'Revoked' : 'Granted';
    const clinic = await repositories.clinics.findById(clinicId);
    const linkedUsers = [
      ...(await repositories.staffUsers.findAll({ where: { clinic_id: clinicId } })),
      ...(await repositories.staffUsers.findAll({ where: { clinic_id: null } })).filter((user) => user.clinicName?.toLowerCase() === clinic?.name?.toLowerCase()),
    ];
    const uniqueUsers = linkedUsers.filter((user, index, all) => all.findIndex((candidate) => candidate.id === user.id) === index);
    await Promise.all(uniqueUsers.map((user) => repositories.staffUsers.update(user.id, { accessStatus: databaseStatus as any })));
    res.status(200).json({ ok: true, clinicId, status });
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Unable to update clinic access.' });
  }
});

app.post('/api/users/reset-password', async (req, res) => {
  try {
    const context = authContext(req);
    const userId = String(req.body?.userId || '').trim();
    const defaultPassword = String(req.body?.defaultPassword || DEFAULT_USER_PASSWORD).trim() || DEFAULT_USER_PASSWORD;

    if (!context || !['SUPER_ADMIN', 'CLINIC_ADMIN'].includes(context.role)) {
      res.status(403).json({ error: 'Only administrators can reset passwords.' });
      return;
    }

    if (!userId) {
      res.status(400).json({ error: 'User id is required.' });
      return;
    }

    if (context.role === 'CLINIC_ADMIN') {
      const targetUser = await repositories.staffUsers.findById(userId);
      if (!targetUser || targetUser.clinicId !== context.clinicId) {
        res.status(403).json({ error: 'Cannot reset passwords for users outside your clinic.' });
        return;
      }
    }

    const result = await resetUserPassword(userId, defaultPassword);
    res.status(200).json({ ...result, ok: true });
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Unable to reset password.' });
  }
});

app.get('/api/auth/me', (req, res) => {
  const context = authContext(req);
  if (!context) {
    res.status(401).json({ error: 'Authentication required.' });
    return;
  }
  res.status(200).json({ user: { uid: context.userId, email: context.email, role: context.role, clinicId: context.clinicId, doctorId: context.doctorId } });
});

app.get('/api/db/health', async (_req, res) => {
  try {
    await getDatabase();
    res.status(200).json({
      status: 'ok',
      database: 'mysql',
      engine: 'mysql',
      message: 'MySQL-backed database connection is active.',
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      database: 'mysql',
      message: error instanceof Error ? error.message : 'Database unavailable',
    });
  }
});

app.use('/api/db', requireDatabaseAccess);

app.get('/api/db/doc', async (req, res) => {
  try {
    const documentPath = String(req.query.path || '');
    if (!documentPath) {
      res.status(400).json({ error: 'Missing path query parameter.' });
      return;
    }

    const docResult = await readDoc(documentPath);
    if (!docResult) {
      res.status(200).json({ exists: false, data: null });
      return;
    }

    const context = (req as express.Request & { auth?: AuthContext }).auth;
    if (context && !canAccessRecord(context, docResult, tableForPath(documentPath))) {
      res.status(403).json({ error: 'Access denied.' });
      return;
    }
    res.status(200).json({ exists: true, data: docResult });
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Unable to load document.' });
  }
});

app.post('/api/db/doc', async (req, res) => {
  try {
    const { path: documentPath, value } = req.body || {};

    if (!documentPath) {
      res.status(400).json({ error: 'Document path is required.' });
      return;
    }

    const context = (req as express.Request & { auth?: AuthContext }).auth;
    if (context && context.role !== 'SUPER_ADMIN' && !canAccessRecord(context, value || {}, tableForPath(documentPath))) {
      res.status(403).json({ error: 'Access denied.' });
      return;
    }
    
    const result = await writeDoc(documentPath, value || {});
    if (tableForPath(documentPath) === 'clinics' && !String(documentPath).includes('/')) {
      const accessKey = `clinic_access_${result.id}`;
      const accessRecord = await repositories.settings.findOne({ key: accessKey, clinic_id: null });
      if (!accessRecord) {
        await repositories.settings.create({ id: crypto.randomUUID(), key: accessKey, value: 'Hold', category: 'clinic_access', clinicId: null } as any);
      }
    }
    res.status(200).json({ id: result.id });
  } catch (error) {
    console.error('Database write error:', error);
    const errorMsg = error instanceof Error ? error.message : String(error);
    res.status(500).json({ error: errorMsg });
  }
});

app.post('/api/db/doc/update', async (req, res) => {
  try {
    const { path: documentPath, value } = req.body || {};
    if (!documentPath) {
      res.status(400).json({ error: 'Document path is required.' });
      return;
    }

    const context = (req as express.Request & { auth?: AuthContext }).auth;
    const current = await readDoc(documentPath);
    if (context && (!current || !canAccessRecord(context, { ...current, ...value }, tableForPath(documentPath)))) {
      res.status(403).json({ error: 'Access denied.' });
      return;
    }
    await updateDoc(documentPath, value || {});
    res.status(200).json({ ok: true });
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Unable to update document.' });
  }
});

app.post('/api/db/doc/delete', async (req, res) => {
  try {
    const { path: documentPath } = req.body || {};
    if (!documentPath) {
      res.status(400).json({ error: 'Document path is required.' });
      return;
    }

    const context = (req as express.Request & { auth?: AuthContext }).auth;
    const current = await readDoc(documentPath);
    if (context && (!current || !canAccessRecord(context, current, tableForPath(documentPath)))) {
      res.status(403).json({ error: 'Access denied.' });
      return;
    }
    await deleteDoc(documentPath);
    res.status(200).json({ ok: true });
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Unable to delete document.' });
  }
});

app.post('/api/db/query', async (req, res) => {
  try {
    const { path: collectionPath, clauses = [] } = req.body || {};
    if (!collectionPath) {
      res.status(400).json({ error: 'Collection path is required.' });
      return;
    }

    const docs = await listQuery(collectionPath, clauses || []);
    const context = (req as express.Request & { auth?: AuthContext }).auth;
    const visibleDocs = context ? docs.filter((item: Record<string, any>) => canAccessRecord(context, item, tableForPath(collectionPath))) : docs;
    res.status(200).json({ docs: visibleDocs });
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Unable to query records.' });
  }
});

// Official Meta WhatsApp Cloud API Webhook Verification (GET)
// Meta sends hub.mode, hub.verify_token, hub.challenge
app.get('/api/whatsapp/webhook', (req, res) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  const VERIFY_TOKEN = process.env.WHATSAPP_VERIFY_TOKEN;
  if (!VERIFY_TOKEN) {
    console.warn('[WhatsApp Webhook] WHATSAPP_VERIFY_TOKEN not configured.');
    return res.sendStatus(503);
  }

  if (mode === 'subscribe' && token === VERIFY_TOKEN) {
    console.log('[WhatsApp Webhook] Verification successful!');
    return res.status(200).send(challenge);
  }
  return res.sendStatus(403);
});

// Official Meta WhatsApp Cloud API Webhook Inbound Events (POST)
// Receives delivery receipts, read receipts, inbound customer replies
app.post('/api/whatsapp/webhook', (req, res) => {
  const body = req.body;

  // Verify X-Hub-Signature-256 using the WhatsApp App Secret
  const signature = req.headers['x-hub-signature-256'];
  const appSecret = process.env.WHATSAPP_APP_SECRET;
  if (!appSecret) {
    console.warn('[WhatsApp Webhook] WHATSAPP_APP_SECRET not configured.');
    return res.sendStatus(503);
  }
  if (signature) {
    const expected = `sha256=${crypto.createHmac('sha256', appSecret).update(JSON.stringify(body)).digest('hex')}`;
    if (!secureEqual(String(signature), expected)) {
      console.warn('[WhatsApp Webhook] Invalid signature.');
      return res.sendStatus(403);
    }
  } else {
    console.warn('[WhatsApp Webhook] Missing signature header.');
    return res.sendStatus(403);
  }

  if (body.object === 'whatsapp_business_account') {
    return res.status(200).send('EVENT_RECEIVED');
  }
  return res.sendStatus(404);
});

app.post('/api/whatsapp/send-template', (_req, res) => {
  return res.status(503).json({
    success: false,
    status: 'not_configured',
    message: 'WhatsApp integration is not configured or active in this environment.',
  });
});

app.get('/api/queue-summary', async (req, res) => {
  try {
    const context = authContext(req);
    if (!context || !context.clinicId) {
      res.status(401).json({ error: 'Authentication required.' });
      return;
    }
    const session = await repositories.sessions.findActiveByClinicId(context.clinicId);
    const stats = session
      ? await repositories.tokens.getQueueStats('', session.id)
      : { waiting: 0, serving: 0, completed: 0, total: 0 };
    const clinic = await repositories.clinics.findById(context.clinicId);
    res.status(200).json({
      clinicName: clinic?.name || '',
      totalPatients: stats.total,
      waiting: stats.waiting,
      serving: stats.serving,
      completed: stats.completed,
      status: session ? 'live' : 'idle',
    });
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Unable to load queue summary.' });
  }
});

// Site Settings API
app.get('/api/site/settings', async (_req, res) => {
  try {
    const settings = await repositories.settings.findGlobal();
    const latestByKey = new Map<string, { value: string | null; updatedAt: Date }>();

    settings.forEach((setting) => {
      const key = normalizeSettingKey(setting.key || '');
      if (!key) return;
      const updatedAt = setting.updatedAt || new Date(0);
      const current = latestByKey.get(key);
      if (!current || updatedAt.getTime() > current.updatedAt.getTime()) {
        latestByKey.set(key, { value: setting.value ?? null, updatedAt });
      }
    });

    const settingsMap: Record<string, any> = {};
    latestByKey.forEach((entry, key) => {
      settingsMap[key] = entry.value;
    });

    res.status(200).json(settingsMap);
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to load site settings' });
  }
});

app.post('/api/site/settings', async (req, res) => {
  try {
    const context = authContext(req);
    if (!context || !['SUPER_ADMIN', 'CLINIC_ADMIN'].includes(context.role)) {
      res.status(401).json({ error: 'Authentication required.' });
      return;
    }
    const settings = req.body || {};
    for (const [key, value] of Object.entries(settings)) {
      const canonicalKey = normalizeSettingKey(key);
      await repositories.settings.setValue(canonicalKey, String(value), undefined, 'site');
    }
    res.status(200).json({ ok: true });
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to save site settings' });
  }
});

// Site Content Sections API
app.get('/api/site/content', async (_req, res) => {
  try {
    const settings = await repositories.settings.findGlobal();
    const latestByKey = new Map<string, { value: string | null; updatedAt: Date }>();

    settings.forEach((setting) => {
      if (setting.category !== 'content') return;
      const key = normalizeSettingKey(setting.key || '');
      if (!key) return;
      const updatedAt = setting.updatedAt || new Date(0);
      const current = latestByKey.get(key);
      if (!current || updatedAt.getTime() > current.updatedAt.getTime()) {
        latestByKey.set(key, { value: setting.value ?? null, updatedAt });
      }
    });

    const contentMap: Record<string, any> = {};
    latestByKey.forEach((entry, key) => {
      contentMap[key] = entry.value;
    });

    res.status(200).json(contentMap);
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to load site content' });
  }
});

app.post('/api/site/content', async (req, res) => {
  try {
    const context = authContext(req);
    if (!context || !['SUPER_ADMIN', 'CLINIC_ADMIN'].includes(context.role)) {
      res.status(401).json({ error: 'Authentication required.' });
      return;
    }
    const content = req.body || {};
    for (const [key, value] of Object.entries(content)) {
      const canonicalKey = normalizeSettingKey(key);
      await repositories.settings.setValue(canonicalKey, String(value), undefined, 'content');
    }
    res.status(200).json({ ok: true });
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to save site content' });
  }
});

if (process.env.NODE_ENV === 'production') {
  const frontendDirectory = path.join(process.cwd(), 'dist');
  app.use(express.static(frontendDirectory));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api/')) {
      next();
      return;
    }
    res.sendFile(path.join(frontendDirectory, 'index.html'));
  });
}

app.use((req, res) => {
  res.status(404).json({
    status: 'not_found',
    path: req.originalUrl,
    message: 'Route not found on ClinicFlow Pro backend',
  });
});

app.use((err: any, _req: any, res: any, _next: any) => {
  console.error('[Backend Error]', err);
  res.status(500).json({
    status: 'internal_error',
    message: 'Something went wrong on the server',
  });
});

const startServer = async () => {
  const availablePort = await getAvailablePort(PORT);
  app.listen(availablePort, '0.0.0.0', () => {
    console.log(`ClinicFlow Pro backend listening on port ${availablePort}`);
  });
};

databaseReady.then(() => startServer()).catch((error) => {
  console.error('Failed to start backend server:', error);
  process.exit(1);
});

// Graceful shutdown: close the database pool on SIGTERM/SIGINT
const shutdown = async () => {
  try {
    const { closeDatabase } = await import('./server/db.js');
    await closeDatabase();
  } catch {
    // Best-effort cleanup
  }
  process.exit(0);
};
process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

export default app;
