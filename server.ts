import express from 'express';
import path from 'path';
import crypto from 'crypto';
import { getDatabase, readDoc, listQuery, writeDoc, updateDoc, deleteDoc, findUserByEmail, verifyPassword, createPublicBooking, resetUserPassword, extractTableName } from './server/db.js';
import { executeQueryOne } from './server/db/connection.js';
import { repositories } from './server/db/repositories/index.js';
import { services } from './server/db/services/index.js';

const app = express();
app.set('trust proxy', process.env.TRUST_PROXY === 'true' ? 1 : false);

const PORT = Number(process.env.BACKEND_PORT || process.env.PORT || 4000);
const SESSION_TTL_SECONDS = Number(process.env.SESSION_MAX_AGE || 8 * 60 * 60);
const SESSION_SECRET = process.env.SESSION_SECRET || (process.env.NODE_ENV === 'production' ? '' : 'clinicflow-development-session-secret');

const databaseReady = getDatabase();
const rateLimitTableReady = databaseReady.then(async () => {
  await executeQueryOne(`
    CREATE TABLE IF NOT EXISTS rate_limits (
      rate_key VARCHAR(255) PRIMARY KEY,
      request_count INT NOT NULL DEFAULT 0,
      reset_at TIMESTAMP NOT NULL,
      INDEX idx_rate_limits_reset_at (reset_at)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);
}).catch((error) => {
  console.error('Rate limit table initialization failed:', error instanceof Error ? error.message : error);
});

const runQueueRetention = async () => {
  try {
    await services.retention.removeExpiredQueueData();
  } catch (error) {
    console.error('Queue retention cleanup failed:', error);
  }
};

setInterval(() => {
  void runQueueRetention();
}, 60 * 60 * 1000);

type AuthContext = {
  userId: string;
  role: 'SUPER_ADMIN' | 'CLINIC_ADMIN' | 'DOCTOR' | 'STAFF';
  clinicId: string | null;
  doctorId: string | null;
  email: string;
};

const RATE_LIMIT_MAX = 30;

app.use((_req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  res.setHeader('Content-Security-Policy', "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; media-src 'self' https:; connect-src 'self' https:; frame-ancestors 'none'; base-uri 'self'; form-action 'self'");
  if (process.env.NODE_ENV === 'production') {
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  }
  next();
});

const checkRateLimit = async (key: string, max = RATE_LIMIT_MAX): Promise<boolean> => {
  try {
    await rateLimitTableReady;
    await executeQueryOne(
      `INSERT INTO rate_limits (rate_key, request_count, reset_at)
       VALUES (?, 1, DATE_ADD(CURRENT_TIMESTAMP, INTERVAL 60 SECOND))
       ON DUPLICATE KEY UPDATE
         request_count = IF(reset_at <= CURRENT_TIMESTAMP, 1, request_count + 1),
         reset_at = IF(reset_at <= CURRENT_TIMESTAMP, DATE_ADD(CURRENT_TIMESTAMP, INTERVAL 60 SECOND), reset_at)`,
      [key]
    );
    const record = await executeQueryOne<{ request_count: number }>(
      'SELECT request_count FROM rate_limits WHERE rate_key = ?',
      [key]
    );
    return Number(record?.request_count || 0) <= max;
  } catch (error) {
    console.error('Rate limit storage unavailable:', error instanceof Error ? error.message : error);
    return false;
  }
};

const cookieValue = (req: express.Request, name: string) => {
  const cookies = String(req.headers.cookie || '').split(';');
  const entry = cookies.find((item) => item.trim().startsWith(`${name}=`));
  return entry ? decodeURIComponent(entry.trim().slice(name.length + 1)) : '';
};

const createSessionToken = (context: AuthContext) => {
  if (!SESSION_SECRET) throw new Error('SESSION_SECRET must be configured in production.');
  const payload = Buffer.from(JSON.stringify({ ...context, exp: Math.floor(Date.now() / 1000) + SESSION_TTL_SECONDS })).toString('base64url');
  const signature = crypto.createHmac('sha256', SESSION_SECRET).update(payload).digest('base64url');
  return `${payload}.${signature}`;
};

const authContext = (req: express.Request) => {
  const token = cookieValue(req, 'clinicflow_session');
  if (!token || !SESSION_SECRET) return undefined;
  const [payload, signature] = token.split('.');
  if (!payload || !signature) return undefined;
  const expectedSignature = crypto.createHmac('sha256', SESSION_SECRET).update(payload).digest('base64url');
  if (!secureEqual(signature, expectedSignature)) return undefined;
  try {
    const session = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')) as AuthContext & { exp?: number };
    if (!session.exp || session.exp <= Math.floor(Date.now() / 1000)) return undefined;
    if (!session.userId || !session.role || !session.email) return undefined;
    return session;
  } catch {
    return undefined;
  }
};

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
  if (context.role === 'DOCTOR' && !['doctors', 'tokens', 'appointments', 'queue_events', 'doctor_status'].includes(table)) return false;
  const recordClinicId = table === 'clinics' ? record.id : (record.clinicId || record.clinic_id);
  if (!recordClinicId) return false;
  if (recordClinicId && recordClinicId !== context.clinicId) return false;
  if (context.role === 'DOCTOR' && table === 'doctors') {
    return (record.id || record.doctorId) === context.doctorId;
  }
  if (context.role === 'DOCTOR' && record.doctorId && record.doctorId !== context.doctorId) return false;
  return recordClinicId === context.clinicId;
};

const canMutateGenericRecord = (context: AuthContext, table: string) => {
  if (context.role === 'SUPER_ADMIN') return true;
  if (context.role !== 'CLINIC_ADMIN') return false;
  return !['clinics', 'sessions', 'queue_events', 'doctor_status'].includes(table);
};

const prepareDatabaseMutation = (
  context: AuthContext,
  table: string,
  value: Record<string, any>,
  current?: Record<string, any> | null,
) => {
  if (context.role === 'SUPER_ADMIN') return value;
  if (table !== 'staff_users') return value;
  if (context.role !== 'CLINIC_ADMIN') {
    throw new Error('This role cannot modify staff users.');
  }

  const next = { ...value };
  if (current) {
    if (current.clinicId !== context.clinicId && current.clinic_id !== context.clinicId) {
      throw new Error('Access denied.');
    }
    delete next.passwordHash;
    delete next.password_hash;
  }
  if (next.role && !['CLINIC_ADMIN', 'DOCTOR', 'STAFF'].includes(String(next.role).toUpperCase())) {
    throw new Error('Invalid staff role.');
  }
  if (next.clinicId !== undefined && next.clinicId !== context.clinicId) {
    throw new Error('A clinic admin cannot assign another clinic.');
  }
  if (next.clinic_id !== undefined && next.clinic_id !== context.clinicId) {
    throw new Error('A clinic admin cannot assign another clinic.');
  }
  next.clinicId = context.clinicId;
  delete next.clinic_id;
  delete next.passwordReset;
  delete next.password_reset;
  delete next.accessStatus;
  delete next.access_status;
  return next;
};

const sanitizeDatabaseRecord = (table: string, record: Record<string, any>) => {
  if (table !== 'staff_users') return record;
  const { passwordHash, password_hash, passwordReset, password_reset, ...safeRecord } = record;
  return safeRecord;
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
  const stateChangingMethod = ['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method);
  const hasSessionCookie = Boolean(cookieValue(req, 'clinicflow_session'));
  const origin = String(req.headers.origin || '');
  if (stateChangingMethod && hasSessionCookie && origin) {
    const forwardedProto = String(req.headers['x-forwarded-proto'] || '').split(',')[0].trim();
    const protocol = forwardedProto || req.protocol;
    const forwardedHost = String(req.headers['x-forwarded-host'] || '').split(',')[0].trim();
    const host = forwardedHost || req.get('host');
    const expectedOrigin = `${protocol}://${host}`;
    if (origin !== expectedOrigin) {
      res.status(403).json({ error: 'Cross-site request blocked.' });
      return;
    }
  }
  next();
});

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

    const todaySession = await repositories.sessions.findByClinicAndDate(requestedClinicId, new Date());
    const session = todaySession?.status === 'ACTIVE' ? todaySession : null;
    const doctors = await repositories.doctors.findByClinicId(requestedClinicId);
    const activeDoctors = doctors.filter((doctor) => doctor.status === 'active');
    const scopedDoctors = context.role === 'DOCTOR'
      ? doctors.filter((doctor) => doctor.id === context.doctorId)
      : doctors;
    const scopedActiveDoctors = context.role === 'DOCTOR'
      ? activeDoctors.filter((doctor) => doctor.id === context.doctorId)
      : activeDoctors;
    const tokens = session
      ? (await Promise.all(scopedDoctors.map((doctor) => repositories.tokens.findByDoctorAndSession(doctor.id, session.id)))).flat()
      : [];
    const clinicRevenue = session
      ? await repositories.tokens.getCollectedRevenueByClinicAndSession(requestedClinicId, session.id)
      : 0;

    res.status(200).json({
      clinic: {
        id: clinic.id,
        name: clinic.name,
        doctorId: scopedActiveDoctors[0]?.id || '',
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
        revenueToday: clinicRevenue,
        featurePlan: clinic.featurePlan,
        whatsappNotificationsEnabled: clinic.whatsappNotificationsEnabled,
        hasPaymentGateway: clinic.hasPaymentGateway,
        clinicUpiId: clinic.clinicUpiId || '',
        qrCodeUrl: clinic.qrCodeUrl || '',
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
        isEmergency: token.isEmergency,
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

const queueMutationContext = (req: express.Request, res: express.Response) => {
  const context = authContext(req);
  if (!context || !context.clinicId || !['SUPER_ADMIN', 'CLINIC_ADMIN', 'DOCTOR', 'STAFF'].includes(context.role)) {
    res.status(403).json({ error: 'Queue access denied.' });
    return null;
  }
  return context;
};

app.post('/api/staff/queue/:tokenId/hold', async (req, res) => {
  try {
    const context = queueMutationContext(req, res);
    if (!context) return;
    const token = await services.queue.holdTokenForClinic(String(req.params.tokenId || ''), context.clinicId!, context.role === 'DOCTOR' ? context.doctorId || undefined : undefined);
    if (!token) {
      res.status(409).json({ error: 'Only an active consultation can be put on hold.' });
      return;
    }
    res.status(200).json(token);
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Unable to hold token.' });
  }
});

app.post('/api/staff/queue/:tokenId/resume', async (req, res) => {
  try {
    const context = queueMutationContext(req, res);
    if (!context) return;
    const token = await services.queue.resumeTokenForClinic(String(req.params.tokenId || ''), context.clinicId!, context.role === 'DOCTOR' ? context.doctorId || undefined : undefined);
    if (!token) {
      res.status(409).json({ error: 'Only a held token can be resumed.' });
      return;
    }
    res.status(200).json(token);
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Unable to resume token.' });
  }
});

app.post('/api/staff/queue/:tokenId/emergency', async (req, res) => {
  try {
    const context = queueMutationContext(req, res);
    if (!context) return;
    const token = await services.queue.promoteEmergencyForClinic(String(req.params.tokenId || ''), context.clinicId!, context.role === 'DOCTOR' ? context.doctorId || undefined : undefined);
    if (!token) {
      res.status(409).json({ error: 'Only waiting or held tokens can be made emergency priority.' });
      return;
    }
    res.status(200).json(token);
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Unable to set emergency priority.' });
  }
});

app.patch('/api/staff/clinic/:clinicId/status', async (req, res) => {
  try {
    const context = authContext(req);
    const clinicId = String(req.params.clinicId || '');
    if (!context || !context.clinicId || (context.role !== 'SUPER_ADMIN' && context.clinicId !== clinicId) || !['SUPER_ADMIN', 'CLINIC_ADMIN', 'DOCTOR', 'STAFF'].includes(context.role)) {
      res.status(403).json({ error: 'Clinic status access denied.' });
      return;
    }
    const status = String(req.body?.status || '').toUpperCase();
    if (!['IN', 'OUT'].includes(status)) {
      res.status(400).json({ error: 'Status must be IN or OUT.' });
      return;
    }
    const doctorId = context.role === 'DOCTOR' ? context.doctorId : String(req.body?.doctorId || '') || (await repositories.doctors.findByClinicId(clinicId))[0]?.id;
    if (!doctorId || (context.role === 'DOCTOR' && doctorId !== context.doctorId)) {
      res.status(403).json({ error: 'Doctor status access denied.' });
      return;
    }
    await repositories.doctorStatus.updateStatus(clinicId, doctorId, status as 'IN' | 'OUT');
    const clinic = await repositories.clinics.updateDoctorStatus(clinicId, status as 'IN' | 'OUT');
    res.status(200).json({ status, doctorId, clinic });
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Unable to update doctor status.' });
  }
});

app.patch('/api/staff/clinic/:clinicId/delay', async (req, res) => {
  try {
    const context = authContext(req);
    const clinicId = String(req.params.clinicId || '');
    if (!context || !context.clinicId || (context.role !== 'SUPER_ADMIN' && context.clinicId !== clinicId) || !['SUPER_ADMIN', 'CLINIC_ADMIN', 'DOCTOR', 'STAFF'].includes(context.role)) {
      res.status(403).json({ error: 'Clinic delay access denied.' });
      return;
    }
    const delayMinutes = Number(req.body?.delayMinutes);
    const delayReason = String(req.body?.delayReason || '').trim();
    if (!Number.isInteger(delayMinutes) || delayMinutes < 0 || delayMinutes > 240 || delayReason.length > 500) {
      res.status(400).json({ error: 'Delay must be a whole number from 0 to 240 minutes.' });
      return;
    }
    const clinic = await repositories.clinics.updateDoctorStatus(clinicId, (await repositories.clinics.findById(clinicId))?.doctorStatus || 'IN', delayMinutes, delayReason);
    res.status(200).json({ delayMinutes, delayReason, clinic });
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Unable to update clinic delay.' });
  }
});

app.delete('/api/staff/queue/:tokenId/cancel', async (req, res) => {
  try {
    const context = authContext(req);
    if (!context || !context.clinicId || context.role !== 'DOCTOR') {
      res.status(403).json({ error: 'Only the doctor can cancel a consultation.' });
      return;
    }
    const token = await services.queue.cancelTokenForClinic(
      String(req.params.tokenId || ''),
      context.clinicId,
      context.doctorId || undefined
    );
    if (!token) {
      res.status(409).json({ error: 'Only waiting or held patients can be cancelled.' });
      return;
    }
    res.status(200).json(token);
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Unable to cancel consultation.' });
  }
});

app.post('/api/patient/book', async (req, res) => {
  try {
    const clientIp = req.ip || req.socket.remoteAddress || 'unknown';
    if (!(await checkRateLimit(`booking:${clientIp}`, 10))) {
      res.status(429).json({ error: 'Too many booking attempts. Please try again later.' });
      return;
    }
    const { clinicId, doctorId, patientName, phone, age, reason } = req.body || {};
    const normalizedPatientName = String(patientName || '').trim();
    const normalizedPhone = String(phone || '').trim();
    const normalizedReason = String(reason || '').trim();
    const normalizedAge = age === undefined || age === null || age === '' ? undefined : Number(age);
    if (!clinicId || !doctorId || !normalizedPatientName || !normalizedPhone) {
      res.status(400).json({ error: 'Clinic, doctor, patient name, and mobile number are required.' });
      return;
    }
    if (!(await checkRateLimit(`booking-phone:${normalizedPhone}`, 3))) {
      res.status(429).json({ error: 'Too many bookings for this mobile number. Please try again later.' });
      return;
    }
    if (normalizedPatientName.length > 120 || normalizedPhone.length > 30 || normalizedReason.length > 500) {
      res.status(400).json({ error: 'Booking details exceed the allowed length.' });
      return;
    }
    if (normalizedAge !== undefined && (!Number.isInteger(normalizedAge) || normalizedAge < 0 || normalizedAge > 120)) {
      res.status(400).json({ error: 'Age must be a whole number between 0 and 120.' });
      return;
    }
    const booking = await createPublicBooking({
      clinicId: String(clinicId),
      doctorId: String(doctorId),
      patientName: normalizedPatientName,
      phone: normalizedPhone,
      age: normalizedAge,
      reason: normalizedReason || undefined,
    });
    res.status(201).json({
      tokenId: booking.tokenId,
      tokenNumber: booking.tokenNumber,
      clinicId: booking.clinicId,
      doctorId: booking.doctorId,
    });
  } catch (error) {
    res.status(400).json({ error: error instanceof Error ? error.message : 'Unable to create booking.' });
  }
});

app.post('/api/staff/queue/:clinicId/walk-in', async (req, res) => {
  try {
    const context = authContext(req);
    const clinicId = String(req.params.clinicId || '');
    if (!context || !context.clinicId || (context.role !== 'SUPER_ADMIN' && context.clinicId !== clinicId)) {
      res.status(403).json({ error: 'Clinic access denied.' });
      return;
    }

    const { doctorId, patientName, phone, age, reason, tokenType } = req.body || {};
    const normalizedPatientName = String(patientName || '').trim();
    const normalizedPhone = String(phone || '').trim();
    const normalizedAge = age === undefined || age === null || age === '' ? undefined : Number(age);
    const normalizedTokenType = tokenType === 'EMERGENCY' ? 'EMERGENCY' : 'WALK_IN';
    if (!doctorId || !normalizedPatientName || !normalizedPhone) {
      res.status(400).json({ error: 'Doctor, patient name, and mobile number are required.' });
      return;
    }
    if (normalizedPatientName.length > 120 || normalizedPhone.length > 30 || String(reason || '').length > 500) {
      res.status(400).json({ error: 'Walk-in details exceed the allowed length.' });
      return;
    }
    if (normalizedAge !== undefined && (!Number.isInteger(normalizedAge) || normalizedAge < 0 || normalizedAge > 120)) {
      res.status(400).json({ error: 'Age must be a whole number between 0 and 120.' });
      return;
    }

    const result = await services.booking.createWalkInToken({
      clinicId,
      doctorId: String(doctorId),
      patientName: normalizedPatientName,
      phone: normalizedPhone,
      age: normalizedAge,
      reason: undefined,
      tokenType: normalizedTokenType,
    });
    res.status(201).json(result);
  } catch (error) {
    res.status(400).json({ error: error instanceof Error ? error.message : 'Unable to issue walk-in token.' });
  }
});

app.post('/api/patient/track', async (req, res) => {
  try {
    const clientIp = req.ip || req.socket.remoteAddress || 'unknown';
    if (!(await checkRateLimit(`patient-track-ip:${clientIp}`, 30))) {
      res.status(429).json({ error: 'Too many tracking attempts. Please try again later.' });
      return;
    }
    res.setHeader('Cache-Control', 'no-store');
    const mobile = String(req.body?.mobile || '').replace(/\D/g, '').replace(/^91/, '').slice(-10);
    if (!/^\d{10}$/.test(mobile)) {
      res.status(400).json({ error: 'Enter a valid 10-digit mobile number.' });
      return;
    }
    const phoneKey = crypto.createHash('sha256').update(mobile).digest('hex');
    if (!(await checkRateLimit(`patient-track-phone:${phoneKey}`, 10))) {
      res.status(429).json({ error: 'Too many tracking attempts for this mobile number. Please try again later.' });
      return;
    }
    const tracking = await services.tracking.getPublicTrackingByPhone(mobile);
    if (!tracking) {
      res.status(404).json({ error: 'No booking found for this mobile number today.' });
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

app.post('/api/auth/login', async (req, res) => {
  try {
    const clientIp = req.ip || req.socket.remoteAddress || 'unknown';
    if (!(await checkRateLimit(`login:${clientIp}`, 10))) {
      res.status(429).json({ error: 'Too many login attempts. Please try again later.' });
      return;
    }
    const { email = '', password = '', role: requestedRole = '' } = req.body || {};
    const normalizedEmail = String(email).trim();
    const normalizedPassword = String(password);
    const normalizedRole = String(requestedRole).toUpperCase();
    
    if (process.env.DEBUG_MODE === 'true') console.log(`[LOGIN] Attempt: email=${normalizedEmail}, role=${normalizedRole}`);

    const superAdminPassword = process.env.SUPER_ADMIN_PASSWORD || '';
    const superAdminUsername = process.env.SUPER_ADMIN_USERNAME || 'superadmin@clinic.local';

    let context: AuthContext | null = null;
    let accountAccessStatus = 'Granted';
    let accountStatus = 'Active';
    let accountClinicName = '';
    
    // Database accounts take precedence over the bootstrap identity. This prevents
    // a misconfigured SUPER_ADMIN_USERNAME from promoting a seeded clinic account.
    const account = await findUserByEmail(normalizedEmail);
    if (account && verifyPassword(normalizedPassword, account.passwordHash)) {
      accountAccessStatus = account.accessStatus || 'Granted';
      accountStatus = String(account.status || 'Active');
      accountClinicName = account.clinicName || '';
      const role = String(account.role || 'CLINIC_ADMIN').toUpperCase() as AuthContext['role'];
      if (['CLINIC_ADMIN', 'DOCTOR', 'STAFF', 'SUPER_ADMIN'].includes(role)) {
        context = { userId: account.id, role, clinicId: account.clinicId || null, doctorId: account.doctorId || null, email: account.email };
      }
    }

    if (!context && normalizedEmail.toLowerCase() === superAdminUsername.trim().toLowerCase() && superAdminPassword && secureEqual(normalizedPassword, superAdminPassword)) {
      context = { userId: 'super-admin', role: 'SUPER_ADMIN', clinicId: null, doctorId: null, email: superAdminUsername };
      if (process.env.DEBUG_MODE === 'true') console.log('[LOGIN] Super admin bootstrap authenticated');
    }

    if (!context) {
      res.status(401).json({ error: 'Invalid credentials or user not found.' });
      return;
    }

    if (context.role !== 'SUPER_ADMIN') {
      if (!['active', 'enabled', 'granted'].includes(accountStatus.toLowerCase())) {
        res.status(403).json({ error: 'Account is not active.' });
        return;
      }
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

    const token = createSessionToken(context);
    const isSecureCookie = process.env.NODE_ENV === 'production' || String(req.headers['x-forwarded-proto'] || '').toLowerCase() === 'https';
    const cookieAttributes = [
      'Path=/',
      'HttpOnly',
      'SameSite=Lax',
      `Max-Age=${SESSION_TTL_SECONDS}`,
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
  res.setHeader('Set-Cookie', 'clinicflow_session=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0');
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
    const newPassword = String(req.body?.newPassword || '');

    if (!context || !['SUPER_ADMIN', 'CLINIC_ADMIN'].includes(context.role)) {
      res.status(403).json({ error: 'Only administrators can reset passwords.' });
      return;
    }

    if (!userId) {
      res.status(400).json({ error: 'User id is required.' });
      return;
    }
    if (newPassword.length < 12) {
      res.status(400).json({ error: 'New password must be at least 12 characters.' });
      return;
    }

    if (context.role === 'CLINIC_ADMIN') {
      const targetUser = await repositories.staffUsers.findById(userId);
      if (!targetUser || targetUser.clinicId !== context.clinicId) {
        res.status(403).json({ error: 'Cannot reset passwords for users outside your clinic.' });
        return;
      }
    }

    const result = await resetUserPassword(userId, newPassword);
    res.status(200).json(result);
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
    res.status(200).json({ exists: true, data: sanitizeDatabaseRecord(tableForPath(documentPath), docResult) });
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
    const table = tableForPath(documentPath);
    if (context && !canMutateGenericRecord(context, table)) {
      res.status(403).json({ error: 'This role cannot modify records through the generic data API.' });
      return;
    }
    const safeValue = context ? prepareDatabaseMutation(context, table, value || {}) : value || {};
    if (context && context.role !== 'SUPER_ADMIN' && !canAccessRecord(context, safeValue, table)) {
      res.status(403).json({ error: 'Access denied.' });
      return;
    }
    
    const result = await writeDoc(documentPath, safeValue);
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
    const table = tableForPath(documentPath);
    if (context && !canMutateGenericRecord(context, table)) {
      res.status(403).json({ error: 'This role cannot modify records through the generic data API.' });
      return;
    }
    const safeValue = context ? prepareDatabaseMutation(context, table, value || {}, current) : value || {};
    if (context && (!current || !canAccessRecord(context, { ...current, ...safeValue }, table))) {
      res.status(403).json({ error: 'Access denied.' });
      return;
    }
    await updateDoc(documentPath, safeValue);
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
    if (context && !canMutateGenericRecord(context, tableForPath(documentPath))) {
      res.status(403).json({ error: 'This role cannot modify records through the generic data API.' });
      return;
    }
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
    const table = tableForPath(collectionPath);
    const visibleDocs = (context ? docs.filter((item: Record<string, any>) => canAccessRecord(context, item, table)) : docs)
      .map((item: Record<string, any>) => sanitizeDatabaseRecord(table, item));
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
    const publicSettingKeys = new Set([
      'siteName', 'siteTagline', 'contactEmail', 'contactPhone', 'whatsappNumber',
      'supportAddress', 'facebookUrl', 'instagramUrl', 'linkedinUrl', 'xUrl',
      'youtubeUrl', 'freeTrialFormUrl', 'salesFormUrl', 'heroTitle', 'heroSubtitle',
      'whatsappEnabled', 'clinicAccessLabel',
    ]);
    const settings = await repositories.settings.findGlobal();
    const latestByKey = new Map<string, { value: string | null; updatedAt: Date }>();

    settings.forEach((setting) => {
      const key = normalizeSettingKey(setting.key || '');
      if (!key || !publicSettingKeys.has(key)) return;
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
    if (!context || context.role !== 'SUPER_ADMIN') {
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
    if (!context || context.role !== 'SUPER_ADMIN') {
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
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`ClinicFlow Pro backend listening on port ${PORT}`);
  });
};

databaseReady.then(async () => {
  await runQueueRetention();
  startServer();
}).catch((error) => {
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
