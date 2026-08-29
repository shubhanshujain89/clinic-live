import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import crypto from 'crypto';
import net from 'net';
import { getDatabase, readDoc, listQuery, writeDoc, updateDoc, deleteDoc, findUserByEmail, verifyPassword, createPublicBooking, getPublicTracking, resetUserPassword, DEFAULT_USER_PASSWORD } from './server/db';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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

const PORT = Number(process.env.PORT || process.env.BACKEND_PORT || 4000);

await getDatabase();

type AuthContext = {
  userId: string;
  role: 'SUPER_ADMIN' | 'CLINIC_ADMIN' | 'DOCTOR' | 'STAFF';
  clinicId: string | null;
  doctorId: string | null;
  email: string;
};

const sessions = new Map<string, AuthContext>();
const cookieValue = (req: express.Request, name: string) => {
  const cookies = String(req.headers.cookie || '').split(';');
  const entry = cookies.find((item) => item.trim().startsWith(`${name}=`));
  return entry ? decodeURIComponent(entry.trim().slice(name.length + 1)) : '';
};

const authContext = (req: express.Request) => sessions.get(cookieValue(req, 'clinicflow_session'));
const publicCollections = new Set(['clinics', 'doctors']);
const tableForPath = (value: string) => String(value).replace(/^\/+|\/+$/g, '').split('/')[0];
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
  const table = tableForPath(requestedPath);
  if (!context && !publicCollections.has(table)) {
    res.status(401).json({ error: 'Authentication required.' });
    return;
  }
  (req as express.Request & { auth?: AuthContext }).auth = context;
  next();
};

app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true }));

app.use((req, res, next) => {
  res.setHeader('X-Powered-By', 'ClinicFlow Pro');
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

app.post('/api/patient/book', async (req, res) => {
  try {
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
    res.status(200).json(tracking);
  } catch (error) {
    res.status(503).json({ error: 'Connection temporarily unavailable.' });
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { email = '', password = '', role: requestedRole = '' } = req.body || {};
    const normalizedEmail = String(email).trim();
    const normalizedPassword = String(password);
    const normalizedRole = String(requestedRole).toUpperCase();
    
    if (process.env.DEBUG_MODE === 'true') console.log(`[LOGIN] Attempt: email=${normalizedEmail}, role=${normalizedRole}`);

    const superAdminPassword = process.env.SUPER_ADMIN_PASSWORD || (process.env.NODE_ENV === 'production' ? '' : 'admin@123');
    const superAdminUsername = process.env.SUPER_ADMIN_USERNAME || 'admin';

    let context: AuthContext | null = null;
    
    // Check super admin credentials
    if (normalizedEmail === superAdminUsername && superAdminPassword && secureEqual(normalizedPassword, superAdminPassword)) {
      context = { userId: 'super-admin', role: 'SUPER_ADMIN', clinicId: null, doctorId: null, email: superAdminUsername };
      if (process.env.DEBUG_MODE === 'true') console.log('[LOGIN] Super admin authenticated');
    } else {
      // Check regular user credentials
      const account = await findUserByEmail(normalizedEmail);
      
      if (account && verifyPassword(normalizedPassword, account.passwordHash)) {
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

    if (normalizedRole && normalizedRole !== context.role && !(normalizedRole === 'CLINIC-ADMIN' && context.role === 'CLINIC_ADMIN')) {
      console.log(`[LOGIN] Role mismatch: requested=${normalizedRole}, actual=${context.role}`);
      res.status(401).json({ error: 'Role mismatch.' });
      return;
    }

    const token = crypto.randomBytes(32).toString('hex');
    sessions.set(token, context);
    res.setHeader('Set-Cookie', `clinicflow_session=${encodeURIComponent(token)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${8 * 60 * 60}${process.env.NODE_ENV === 'production' ? '; Secure' : ''}`);
    
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
  res.setHeader('Set-Cookie', 'clinicflow_session=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0');
  res.status(204).end();
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

    const result = await resetUserPassword(userId, defaultPassword);
    res.status(200).json({ ok: true, ...result });
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
      database: 'sqlite',
      path: path.join(process.cwd(), 'data', 'clinicflow.sqlite'),
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
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
    console.log('POST /api/db/doc - path:', documentPath, 'value keys:', Object.keys(value || {}));
    
    if (!documentPath) {
      res.status(400).json({ error: 'Document path is required.' });
      return;
    }

    const context = (req as express.Request & { auth?: AuthContext }).auth;
    if (context && context.role !== 'SUPER_ADMIN' && !canAccessRecord(context, value || {}, tableForPath(documentPath))) {
      res.status(403).json({ error: 'Access denied.' });
      return;
    }
    
    console.log('Calling writeDoc for:', documentPath);
    const result = await writeDoc(documentPath, value || {});
    console.log('writeDoc result:', result);
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
    const visibleDocs = context ? docs.filter((item) => canAccessRecord(context, item, tableForPath(collectionPath))) : docs;
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

  const VERIFY_TOKEN = process.env.WHATSAPP_VERIFY_TOKEN || 'clinic_meta_verify_secret_token';

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
  console.log('[WhatsApp Webhook] Inbound Payload received:', JSON.stringify(body, null, 2));

  if (body.object === 'whatsapp_business_account') {
    return res.status(200).send('EVENT_RECEIVED');
  }
  return res.sendStatus(404);
});

app.post('/api/whatsapp/send-template', (req, res) => {
  const { to, templateName, components, tokenNumber, patientName } = req.body;
  console.log(`[WhatsApp API] Triggering template "${templateName}" to ${to} for token #${tokenNumber}`);

  const mockMetaResponse = {
    messaging_product: 'whatsapp',
    contacts: [
      {
        input: to,
        wa_id: to.replace(/[^0-9]/g, ''),
      },
    ],
    messages: [
      {
        id: `wamid.HBgL${Date.now()}${Math.random().toString(36).substring(2, 8).toUpperCase()}`,
        message_status: 'accepted',
      },
    ],
  };

  return res.status(200).json({
    success: true,
    metaResponse: mockMetaResponse,
    deliveredTo: patientName,
    phone: to,
    timestamp: new Date().toISOString(),
  });
});

app.get('/api/queue-summary', (_req, res) => {
  res.status(200).json({
    clinicName: 'Apex Super Specialty Care & Cardiology',
    totalPatients: 2,
    waiting: 0,
    serving: 0,
    completed: 2,
    status: 'live',
  });
});

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

if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, 'dist')));
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'dist', 'index.html'));
  });
}

const startServer = async () => {
  const availablePort = await getAvailablePort(PORT);
  app.listen(availablePort, '0.0.0.0', () => {
    console.log(`ClinicFlow Pro backend listening on port ${availablePort}`);
  });
};

startServer().catch((error) => {
  console.error('Failed to start backend server:', error);
  process.exit(1);
});

export default app;
