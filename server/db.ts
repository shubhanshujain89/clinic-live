import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import initSqlJs, { Database as SqlJsDatabase } from 'sql.js';

const dbDir = path.join(process.cwd(), 'data');
const dbPath = path.join(dbDir, 'clinicflow.sqlite');

let db: SqlJsDatabase | null = null;

export const DEFAULT_USER_PASSWORD = 'Clinic@123';

const hashPassword = (password: string, salt = crypto.randomBytes(16).toString('hex')) => {
  const hash = crypto.scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${hash}`;
};

export const verifyPassword = (password: string, storedHash: string) => {
  const [salt, expected] = String(storedHash || '').split(':');
  if (!salt || !expected) return false;
  const actual = crypto.scryptSync(password, salt, 64).toString('hex');
  return crypto.timingSafeEqual(Buffer.from(actual, 'hex'), Buffer.from(expected, 'hex'));
};

const normalizeKey = (key: string) => key.replace(/([a-z0-9])([A-Z])/g, '$1_$2').toLowerCase();

const safeJsonParse = (value: string | null | undefined) => {
  if (value === null || value === undefined || value === '') return undefined;
  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
};

const hydrateRow = (row: Record<string, any>) => {
  const output: Record<string, any> = { ...row };

  Object.entries(output).forEach(([key, value]) => {
    if (typeof value === 'string') {
      const parsed = safeJsonParse(value);
      if (parsed !== undefined && typeof parsed !== 'string') {
        output[key] = parsed;
      }
    }
  });

  return output;
};

const toCamelCase = (key: string) => {
  const parts = key.split('_');
  const [first, ...rest] = parts;
  return first + rest.map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join('');
};

const rowToObject = (row: Record<string, any>) => {
  const object: Record<string, any> = {};
  Object.entries(row).forEach(([key, value]) => {
    object[toCamelCase(key)] = value;
  });
  return hydrateRow(object);
};

const tableMap: Record<string, string> = {
  clinics: 'clinics',
  doctors: 'doctors',
  users: 'staff_users',
  staff_users: 'staff_users',
  staff: 'staff_users',
  patients: 'patients',
  sessions: 'sessions',
  queue_sessions: 'sessions',
  appointments: 'appointments',
  tokens: 'tokens',
  queue_events: 'queue_events',
  doctor_status: 'doctor_status',
  settings: 'settings',
  whatsapp_logs: 'whatsapp_logs',
};

const extractTableName = (pathValue: string) => {
  const cleaned = pathValue.replace(/^\/+|\/+$/g, '').trim();
  const firstSegment = cleaned.split('/')[0] || '';
  return tableMap[firstSegment] || firstSegment || 'settings';
};

const extractRecordId = (pathValue: string) => {
  const cleaned = pathValue.replace(/^\/+|\/+$/g, '').trim();
  const segments = cleaned.split('/').filter(Boolean);
  return segments[1] || segments[0] || null;
};

const query = (queryString: string, params: any[] = []) => {
  if (!db) {
    throw new Error('Database is not initialized.');
  }

  const normalizedParams = params.map((param) => {
    if (typeof param === 'boolean') return Number(param);
    return param;
  });
  const statement = db.prepare(queryString);
  statement.bind(normalizedParams);
  const rows: any[] = [];
  while (statement.step()) {
    rows.push(statement.getAsObject());
  }
  statement.free();
  return rows;
};

const run = async (queryString: string, params: any[] = []) => {
  query(queryString, params);
};

const seedClinics = [
  { id: 'clinic_basic_demo', name: 'Primary Care Clinic', doctor_name: 'Lead Doctor', specialty: 'General Medicine & Family Practice', cabin_number: 'Cabin 1, Ground Floor', doctor_status: 'IN', delay_minutes: 0, delay_reason: '', avg_consultation_minutes: 12, consultation_fee: 500, current_running_token: 'B-101', current_running_token_id: 'tok_basic_01', active_session_id: 'sess_clinic_basic_demo', total_patients_today: 9, revenue_today: 4200, phone: '+91 98765 10001', address: 'Clinic address to be configured', feature_plan: 'TRIAL', whatsapp_notifications_enabled: 0, has_payment_gateway: 0, clinic_upi_id: 'clinic@upi', created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
];

const seedDoctors = [
  { id: 'doc_basic_01', clinic_id: 'clinic_basic_demo', name: 'Lead Doctor', specialization: 'General Medicine & Family Practice', qualification: 'MBBS, MD', experience: '8', phone: '+91 98765 43210', email: 'doctor@clinic.local', bio: 'Experienced physician focused on preventive care and family health.', consultation_fee: 500, available_days: JSON.stringify(['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']), available_hours: '9:00 AM - 6:00 PM', rating: 4.8, status: 'active', created_at: new Date().toISOString() },
];

const seedSessions = [
  { id: 'sess_clinic_basic_demo', clinic_id: 'clinic_basic_demo', date: new Date().toISOString().split('T')[0], status: 'ACTIVE', total_tokens_issued: 8, rolling_avg_minutes: 8.5, completed_count: 2, total_revenue: 4200, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
];

const seedSettings = [
  { id: 'site_settings', clinic_id: null, key: 'site_name', value: 'ClinicFlow Pro', category: 'site', updated_at: new Date().toISOString() },
  { id: 'site_contact', clinic_id: null, key: 'contact_email', value: 'hello@clinicflow.local', category: 'site', updated_at: new Date().toISOString() },
  { id: 'site_banner', clinic_id: null, key: 'hero_title', value: 'Smarter queues, calmer clinics', category: 'site', updated_at: new Date().toISOString() },
];

const PRE_NOTE = (partial: any) => JSON.stringify({ submittedAt: new Date(Date.now() - 60 * 60000).toISOString(), ...partial });

const seedTokens = [
  {
    id: 'tok_01', clinic_id: 'clinic_basic_demo', session_id: 'sess_clinic_basic_demo', doctor_id: 'doc_basic_01',
    token_number: 'A-101', sequence_number: 1, patient_name: 'Ramesh Patel', patient_phone: '+91 98201 11223',
    patient_age: 52, patient_gender: 'Male', token_type: 'ONLINE', status: 'COMPLETED', is_vip: 0, is_hold: 0, priority: 10,
    amount_paid: 500, payment_method: 'UPI', payment_status: 'PAID',
    created_at: new Date(Date.now() - 75 * 60000).toISOString(), called_at: new Date(Date.now() - 65 * 60000).toISOString(),
    completed_at: new Date(Date.now() - 55 * 60000).toISOString(), consultation_duration_seconds: 600,
    doctor_notes: 'BP stable (128/82). Prescribed Telmisartan 40mg once daily. Follow-up in 4 weeks with lipid profile.',
    pre_consultation_notes: PRE_NOTE({ symptoms: 'Routine hypertension follow-up and slight morning dizziness.', duration: '4 days', severity: 'Mild', painScale: 2, allergies: 'None known', feverTemp: '98.4°F', bpReading: '130/84 mmHg' }),
  },
  {
    id: 'tok_02', clinic_id: 'clinic_basic_demo', session_id: 'sess_clinic_basic_demo', doctor_id: 'doc_basic_01',
    token_number: 'A-102', sequence_number: 2, patient_name: 'Meera Deshmukh', patient_phone: '+91 98450 33445',
    patient_age: 38, patient_gender: 'Female', token_type: 'ONLINE', status: 'COMPLETED', is_vip: 0, is_hold: 0, priority: 10,
    amount_paid: 500, payment_method: 'CARD', payment_status: 'PAID',
    created_at: new Date(Date.now() - 60 * 60000).toISOString(), called_at: new Date(Date.now() - 54 * 60000).toISOString(),
    completed_at: new Date(Date.now() - 44 * 60000).toISOString(), consultation_duration_seconds: 580,
    doctor_notes: 'Sinus arrhythmia observed, benign. ECG normal. Advised hydration and sleep schedule.',
    pre_consultation_notes: PRE_NOTE({ symptoms: 'Palpitations after evening coffee and fatigue.', duration: '1 week', severity: 'Moderate', painScale: 3, allergies: 'Penicillin', feverTemp: '98.6°F' }),
  },
  {
    id: 'tok_03', clinic_id: 'clinic_basic_demo', session_id: 'sess_clinic_basic_demo', doctor_id: 'doc_basic_01',
    token_number: 'A-103', sequence_number: 3, patient_name: 'Vikramaditya Rao', patient_phone: '+91 97110 55667',
    patient_age: 45, patient_gender: 'Male', token_type: 'ONLINE', status: 'SERVING', is_vip: 0, is_hold: 0, priority: 10,
    amount_paid: 500, payment_method: 'UPI', payment_status: 'PAID',
    created_at: new Date(Date.now() - 40 * 60000).toISOString(), called_at: new Date(Date.now() - 4 * 60000).toISOString(),
    pre_consultation_notes: PRE_NOTE({ symptoms: 'Mild chest tightness upon climbing stairs, shortness of breath.', duration: '2 weeks', severity: 'Severe', painScale: 6, allergies: 'Sulfa drugs', feverTemp: '98.8°F', bpReading: '142/90 mmHg', attachments: [{ name: 'ecg_report_aug.pdf', type: 'application/pdf', size: 142000 }] }),
  },
  {
    id: 'tok_04', clinic_id: 'clinic_basic_demo', session_id: 'sess_clinic_basic_demo', doctor_id: 'doc_basic_01',
    token_number: 'VIP-01', sequence_number: 4, patient_name: 'Ananya Singhania (Emergency)', patient_phone: '+91 99220 88990',
    patient_age: 29, patient_gender: 'Female', token_type: 'VIP', status: 'WAITING', is_vip: 1, is_hold: 0, priority: 1,
    amount_paid: 1000, payment_method: 'CARD', payment_status: 'PAID',
    created_at: new Date(Date.now() - 25 * 60000).toISOString(),
    pre_consultation_notes: PRE_NOTE({ symptoms: 'Acute migraine with visual aura and nausea.', duration: '6 hours', severity: 'Critical', painScale: 9, allergies: 'None' }),
  },
  {
    id: 'tok_05', clinic_id: 'clinic_basic_demo', session_id: 'sess_clinic_basic_demo', doctor_id: 'doc_basic_01',
    token_number: 'W-104', sequence_number: 5, patient_name: 'Gurpreet Singh', patient_phone: '+91 98880 12345',
    patient_age: 61, patient_gender: 'Male', token_type: 'WALK_IN', status: 'WAITING', is_vip: 0, is_hold: 0, priority: 10,
    amount_paid: 500, payment_method: 'CASH', payment_status: 'PAID',
    created_at: new Date(Date.now() - 20 * 60000).toISOString(),
    pre_consultation_notes: PRE_NOTE({ symptoms: 'Persistent joint aches and knee swelling.', duration: '3 weeks', severity: 'Moderate', painScale: 5 }),
  },
  {
    id: 'tok_06', clinic_id: 'clinic_basic_demo', session_id: 'sess_clinic_basic_demo', doctor_id: 'doc_basic_01',
    token_number: 'A-105', sequence_number: 6, patient_name: 'Sneha Kulkarni', patient_phone: '+91 97660 44556',
    patient_age: 32, patient_gender: 'Female', token_type: 'ONLINE', status: 'HOLD', is_vip: 0, is_hold: 1, priority: 10,
    amount_paid: 500, payment_method: 'UPI', payment_status: 'PAID',
    created_at: new Date(Date.now() - 18 * 60000).toISOString(),
    pre_consultation_notes: PRE_NOTE({ symptoms: 'Stepped out for diagnostic blood test. Will return in 10 mins.', duration: 'Today', severity: 'Mild', painScale: 1 }),
  },
  {
    id: 'tok_07', clinic_id: 'clinic_basic_demo', session_id: 'sess_clinic_basic_demo', doctor_id: 'doc_basic_01',
    token_number: 'W-106', sequence_number: 7, patient_name: 'Mohammad Farooqi', patient_phone: '+91 98230 77889',
    patient_age: 44, patient_gender: 'Male', token_type: 'WALK_IN', status: 'WAITING', is_vip: 0, is_hold: 0, priority: 10,
    amount_paid: 500, payment_method: 'CASH', payment_status: 'PAID',
    created_at: new Date(Date.now() - 10 * 60000).toISOString(),
  },
  {
    id: 'tok_08', clinic_id: 'clinic_basic_demo', session_id: 'sess_clinic_basic_demo', doctor_id: 'doc_basic_01',
    token_number: 'A-107', sequence_number: 8, patient_name: 'Pooja Bhattacharya', patient_phone: '+91 98110 99887',
    patient_age: 27, patient_gender: 'Female', token_type: 'ONLINE', status: 'WAITING', is_vip: 0, is_hold: 0, priority: 10,
    amount_paid: 500, payment_method: 'NETBANKING', payment_status: 'PAID',
    created_at: new Date(Date.now() - 5 * 60000).toISOString(),
    pre_consultation_notes: PRE_NOTE({ symptoms: 'Seasonal allergic rhinitis and dry cough.', duration: '5 days', severity: 'Mild', painScale: 2 }),
  },
];

export const getDatabase = async () => {
  if (db) return db;

  if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
  }

  const SQL = await initSqlJs({ locateFile: (file: string) => path.join(process.cwd(), 'node_modules', 'sql.js', 'dist', file) });
  if (fs.existsSync(dbPath)) {
    const buffer = fs.readFileSync(dbPath);
    db = new SQL.Database(buffer);
  } else {
    db = new SQL.Database();
  }

  const exec = (sql: string) => db?.exec(sql);

  exec(`CREATE TABLE IF NOT EXISTS clinics (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      doctor_name TEXT,
      specialty TEXT,
      cabin_number TEXT,
      doctor_status TEXT,
      delay_minutes INTEGER DEFAULT 0,
      delay_reason TEXT,
      avg_consultation_minutes REAL DEFAULT 12,
      consultation_fee REAL DEFAULT 0,
      current_running_token TEXT,
      current_running_token_id TEXT,
      active_session_id TEXT,
      total_patients_today INTEGER DEFAULT 0,
      revenue_today REAL DEFAULT 0,
      phone TEXT,
      address TEXT,
      email TEXT,
      logo TEXT,
      operating_hours TEXT,
      specializations TEXT,
      qr_code_url TEXT,
      feature_plan TEXT,
      whatsapp_notifications_enabled INTEGER DEFAULT 0,
      has_payment_gateway INTEGER DEFAULT 0,
      clinic_upi_id TEXT,
      created_at TEXT,
      updated_at TEXT
    );`);
  try { exec('ALTER TABLE clinics ADD COLUMN email TEXT;'); } catch { /* existing database already has the column */ }
  try { exec('ALTER TABLE clinics ADD COLUMN logo TEXT;'); } catch { /* existing database already has the column */ }
  try { exec('ALTER TABLE clinics ADD COLUMN operating_hours TEXT;'); } catch { /* existing database already has the column */ }
  try { exec('ALTER TABLE clinics ADD COLUMN specializations TEXT;'); } catch { /* existing database already has the column */ }
  try { exec('ALTER TABLE clinics ADD COLUMN subscription_pack TEXT;'); } catch { /* existing database already has the column */ }

  exec(`CREATE TABLE IF NOT EXISTS doctors (id TEXT PRIMARY KEY, clinic_id TEXT NOT NULL, name TEXT, specialization TEXT, qualification TEXT, experience TEXT, phone TEXT, email TEXT, bio TEXT, consultation_fee REAL, available_days TEXT, available_hours TEXT, rating REAL, status TEXT, created_at TEXT, FOREIGN KEY (clinic_id) REFERENCES clinics(id) ON DELETE CASCADE);`);
  exec(`CREATE TABLE IF NOT EXISTS staff_users (id TEXT PRIMARY KEY, clinic_id TEXT, doctor_id TEXT, email TEXT UNIQUE, password_hash TEXT, role TEXT NOT NULL, display_name TEXT, name TEXT, phone TEXT, status TEXT, clinic_name TEXT, created_at TEXT, FOREIGN KEY (clinic_id) REFERENCES clinics(id) ON DELETE CASCADE);`);
  try { exec('ALTER TABLE staff_users ADD COLUMN doctor_id TEXT;'); } catch { /* existing database already has the column */ }
  try { exec('ALTER TABLE staff_users ADD COLUMN name TEXT;'); } catch { /* existing database already has the column */ }
  try { exec('ALTER TABLE staff_users ADD COLUMN phone TEXT;'); } catch { /* existing database already has the column */ }
  try { exec('ALTER TABLE staff_users ADD COLUMN status TEXT;'); } catch { /* existing database already has the column */ }
  try { exec('ALTER TABLE staff_users ADD COLUMN clinic_name TEXT;'); } catch { /* existing database already has the column */ }
  try { exec('ALTER TABLE staff_users ADD COLUMN access_status TEXT;'); } catch { /* existing database already has the column */ }
  try { exec('ALTER TABLE staff_users ADD COLUMN photo_url TEXT;'); } catch { /* existing database already has the column */ }
  try { exec('ALTER TABLE staff_users ADD COLUMN password_reset TEXT;'); } catch { /* existing database already has the column */ }
  exec(`CREATE TABLE IF NOT EXISTS patients (id TEXT PRIMARY KEY, clinic_id TEXT NOT NULL, tracking_id TEXT UNIQUE, name TEXT, phone TEXT, age INTEGER, gender TEXT, created_at TEXT, updated_at TEXT, FOREIGN KEY (clinic_id) REFERENCES clinics(id) ON DELETE CASCADE);`);
  exec(`CREATE TABLE IF NOT EXISTS sessions (id TEXT PRIMARY KEY, clinic_id TEXT NOT NULL, date TEXT, status TEXT, total_tokens_issued INTEGER DEFAULT 0, rolling_avg_minutes REAL DEFAULT 0, completed_count INTEGER DEFAULT 0, total_revenue REAL DEFAULT 0, active_token_id TEXT, active_token_number TEXT, created_at TEXT, updated_at TEXT, FOREIGN KEY (clinic_id) REFERENCES clinics(id) ON DELETE CASCADE);`);
  try { exec('ALTER TABLE sessions ADD COLUMN active_token_id TEXT;'); } catch { /* existing database already has the column */ }
  try { exec('ALTER TABLE sessions ADD COLUMN active_token_number TEXT;'); } catch { /* existing database already has the column */ }
  exec(`CREATE TABLE IF NOT EXISTS appointments (id TEXT PRIMARY KEY, clinic_id TEXT NOT NULL, patient_id TEXT, tracking_id TEXT, doctor_id TEXT, appointment_date TEXT, status TEXT, token_number TEXT, token_id TEXT, created_at TEXT, updated_at TEXT, FOREIGN KEY (clinic_id) REFERENCES clinics(id) ON DELETE CASCADE, FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE SET NULL);`);
  exec(`CREATE TABLE IF NOT EXISTS tokens (id TEXT PRIMARY KEY, clinic_id TEXT NOT NULL, session_id TEXT, doctor_id TEXT, token_number TEXT, sequence_number INTEGER, patient_id TEXT, patient_name TEXT, patient_phone TEXT, patient_age INTEGER, patient_gender TEXT, token_type TEXT, status TEXT, is_vip INTEGER DEFAULT 0, is_hold INTEGER DEFAULT 0, priority INTEGER, amount_paid REAL DEFAULT 0, payment_mode TEXT, payment_method TEXT, payment_status TEXT, created_at TEXT, called_at TEXT, completed_at TEXT, consultation_duration_seconds INTEGER, pre_consultation_notes TEXT, weight TEXT, temperature TEXT, blood_pressure TEXT, triage_notes TEXT, doctor_notes TEXT, whatsapp_sent_count INTEGER DEFAULT 0, whatsapp_last_sent_at TEXT, FOREIGN KEY (clinic_id) REFERENCES clinics(id) ON DELETE CASCADE);`);
  try { exec('ALTER TABLE tokens ADD COLUMN doctor_id TEXT;'); } catch { /* existing database already has the column */ }
  exec(`CREATE TABLE IF NOT EXISTS queue_events (id TEXT PRIMARY KEY, clinic_id TEXT NOT NULL, token_id TEXT, patient_id TEXT, event_type TEXT, details TEXT, created_at TEXT, FOREIGN KEY (clinic_id) REFERENCES clinics(id) ON DELETE CASCADE);`);
  exec(`CREATE TABLE IF NOT EXISTS doctor_status (id TEXT PRIMARY KEY, clinic_id TEXT NOT NULL, doctor_id TEXT, status TEXT, updated_at TEXT, FOREIGN KEY (clinic_id) REFERENCES clinics(id) ON DELETE CASCADE);`);
  exec(`CREATE TABLE IF NOT EXISTS settings (id TEXT PRIMARY KEY, clinic_id TEXT, key TEXT NOT NULL, value TEXT, category TEXT, updated_at TEXT, UNIQUE(clinic_id, key));`);
  exec(`CREATE TABLE IF NOT EXISTS whatsapp_logs (id TEXT PRIMARY KEY, token_id TEXT, patient_name TEXT, phone TEXT, template_name TEXT, message_body TEXT, status TEXT, timestamp TEXT, meta_message_id TEXT);`);

  const stalePlanClinics = query("SELECT id FROM clinics WHERE feature_plan IS NOT NULL AND feature_plan NOT IN ('TRIAL', 'BASIC', 'STANDARD', 'PREMIUM', 'ENTERPRISE', '');");
  if (stalePlanClinics.length > 0) {
    const staleIds = stalePlanClinics.map((row) => row.id);
    if (staleIds.length > 0) {
      const placeholders = staleIds.map(() => '?').join(', ');
      query(`DELETE FROM doctors WHERE clinic_id IN (${placeholders});`, staleIds);
      query(`DELETE FROM staff_users WHERE clinic_id IN (${placeholders});`, staleIds);
      query(`DELETE FROM sessions WHERE clinic_id IN (${placeholders});`, staleIds);
      query(`DELETE FROM clinics WHERE id IN (${placeholders});`, staleIds);
    }
  }

  query("UPDATE clinics SET feature_plan = 'TRIAL' WHERE feature_plan IS NULL OR feature_plan = '';");

  const clinicCount = query('SELECT COUNT(*) as count FROM clinics;')[0]?.count || 0;
  if (Number(clinicCount) === 0) {
    for (const clinic of seedClinics) {
      const columns = Object.keys(clinic);
      const placeholders = columns.map(() => '?').join(', ');
      query(`INSERT INTO clinics (${columns.join(', ')}) VALUES (${placeholders});`, Object.values(clinic));
    }
    for (const doctor of seedDoctors) {
      const columns = Object.keys(doctor);
      const placeholders = columns.map(() => '?').join(', ');
      query(`INSERT INTO doctors (${columns.join(', ')}) VALUES (${placeholders});`, Object.values(doctor));
    }
    for (const session of seedSessions) {
      const columns = Object.keys(session);
      const placeholders = columns.map(() => '?').join(', ');
      query(`INSERT INTO sessions (${columns.join(', ')}) VALUES (${placeholders});`, Object.values(session));
    }
    for (const setting of seedSettings) {
      const columns = Object.keys(setting);
      const placeholders = columns.map(() => '?').join(', ');
      query(`INSERT INTO settings (${columns.join(', ')}) VALUES (${placeholders});`, Object.values(setting));
    }
  }

  const tokenCount = query('SELECT COUNT(*) as count FROM tokens;')[0]?.count || 0;
  if (Number(tokenCount) === 0) {
    for (const token of seedTokens) {
      const columns = Object.keys(token);
      const placeholders = columns.map(() => '?').join(', ');
      query(`INSERT INTO tokens (${columns.join(', ')}) VALUES (${placeholders});`, Object.values(token));
    }
  }

  const userCount = query('SELECT COUNT(*) as count FROM staff_users;')[0]?.count || 0;
  if (Number(userCount) === 0) {
    const developmentPassword = (value: string) => process.env.NODE_ENV === 'production' ? '' : value;
    const defaultUsers = [
      // Super Admin Account
      { id: 'superadmin_001', clinic_id: null, doctor_id: null, email: 'superadmin@clinic.local', password_hash: hashPassword(developmentPassword('admin')), role: 'SUPER_ADMIN', display_name: 'Super Admin', name: 'Super Admin', phone: '+91 90000 00001', status: 'Active', clinic_name: '', access_status: 'Granted', password_reset: 'Default: admin', created_at: new Date().toISOString() },
      
      // Clinic Admin Account
      { id: 'clinic_basic_admin', clinic_id: 'clinic_basic_demo', doctor_id: null, email: 'admin@clinic.local', password_hash: hashPassword(developmentPassword('admin')), role: 'CLINIC_ADMIN', display_name: 'Clinic Admin', name: 'Clinic Admin', phone: '+91 90000 00002', status: 'Active', clinic_name: 'Primary Care Clinic', access_status: 'Granted', password_reset: 'Default: admin', created_at: new Date().toISOString() },
      
      // Doctor Account
      { id: 'staff_basic_doctor', clinic_id: 'clinic_basic_demo', doctor_id: 'doc_basic_01', email: 'doctor@clinic.local', password_hash: hashPassword(developmentPassword('doctor')), role: 'DOCTOR', display_name: 'Lead Doctor', name: 'Lead Doctor', phone: '+91 90000 00003', status: 'Active', clinic_name: 'Primary Care Clinic', access_status: 'Granted', password_reset: 'Default: doctor', created_at: new Date().toISOString() },
      
      // Staff/Reception Account
      { id: 'staff_basic_reception', clinic_id: 'clinic_basic_demo', doctor_id: null, email: 'staff@clinic.local', password_hash: hashPassword(developmentPassword('staff')), role: 'STAFF', display_name: 'Front Desk Staff', name: 'Front Desk Staff', phone: '+91 90000 00004', status: 'Active', clinic_name: 'Primary Care Clinic', access_status: 'Granted', password_reset: 'Default: staff', created_at: new Date().toISOString() },
    ];
    for (const user of defaultUsers) {
      const columns = Object.keys(user);
      query(`INSERT INTO staff_users (${columns.join(', ')}) VALUES (${columns.map(() => '?').join(', ')});`, Object.values(user));
    }
  }

  fs.writeFileSync(dbPath, Buffer.from(db.export()));
  return db;
};

export const findUserByEmail = async (email: string) => {
  await getDatabase();
  const rows = query('SELECT id, clinic_id, doctor_id, email, password_hash, role, display_name FROM staff_users WHERE lower(email) = lower(?) LIMIT 1;', [email.trim()]);
  return rows[0] ? rowToObject(rows[0]) : null;
};

export const createPublicBooking = async (input: {
  clinicId: string;
  doctorId: string;
  patientName: string;
  phone: string;
  age?: number;
  reason?: string;
}) => {
  await getDatabase();
  const clinic = query('SELECT * FROM clinics WHERE id = ? LIMIT 1;', [input.clinicId])[0];
  const doctor = query('SELECT * FROM doctors WHERE id = ? AND clinic_id = ? AND status = ? LIMIT 1;', [input.doctorId, input.clinicId, 'active'])[0];
  if (!clinic || !doctor) throw new Error('Clinic or doctor is unavailable.');

  const sessionId = clinic.active_session_id || `sess_${input.clinicId}`;
  const today = new Date().toISOString().split('T')[0];
  const latest = query('SELECT COALESCE(MAX(sequence_number), 0) AS sequence FROM tokens WHERE clinic_id = ? AND session_id = ? AND doctor_id = ? AND substr(created_at, 1, 10) = ?;', [input.clinicId, sessionId, input.doctorId, today])[0];
  const sequenceNumber = Number(latest?.sequence || 0) + 1;
  const tokenNumber = `A-${String(sequenceNumber).padStart(3, '0')}`;
  const patientId = crypto.randomUUID();
  const tokenId = crypto.randomUUID();
  const trackingId = crypto.randomBytes(9).toString('base64url');
  const now = new Date().toISOString();

  db!.exec('BEGIN TRANSACTION;');
  try {
    query('INSERT INTO patients (id, clinic_id, tracking_id, name, phone, age, gender, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?);', [patientId, input.clinicId, trackingId, input.patientName.trim(), input.phone.trim(), input.age || null, null, now, now]);
    query('INSERT INTO tokens (id, clinic_id, session_id, doctor_id, token_number, sequence_number, patient_id, patient_name, patient_phone, patient_age, token_type, status, is_vip, is_hold, priority, amount_paid, payment_status, created_at, pre_consultation_notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);', [tokenId, input.clinicId, sessionId, input.doctorId, tokenNumber, sequenceNumber, patientId, input.patientName.trim(), input.phone.trim(), input.age || null, 'ONLINE', 'WAITING', 0, 0, 10, 0, 'PENDING', now, input.reason?.trim() ? JSON.stringify({ symptoms: input.reason.trim() }) : null]);
    query('INSERT INTO appointments (id, clinic_id, patient_id, tracking_id, doctor_id, appointment_date, status, token_number, token_id, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);', [crypto.randomUUID(), input.clinicId, patientId, trackingId, input.doctorId, today, 'scheduled', tokenNumber, tokenId, now, now]);
    db!.exec('COMMIT;');
  } catch (error) {
    db!.exec('ROLLBACK;');
    throw error;
  }

  fs.writeFileSync(dbPath, Buffer.from(db!.export()));
  return { trackingId, tokenId, tokenNumber, clinicName: clinic.name, doctorName: doctor.name };
};

export const getPublicTracking = async (trackingId: string) => {
  await getDatabase();
  const result = query(`SELECT
      p.tracking_id,
      c.name AS clinic_name,
      d.name AS doctor_name,
      t.token_number,
      t.status,
      t.sequence_number,
      t.called_at,
      t.consultation_duration_seconds,
      c.doctor_status,
      c.delay_minutes,
      c.avg_consultation_minutes,
      t.session_id,
      t.clinic_id,
      t.doctor_id
    FROM patients p
    JOIN tokens t ON t.patient_id = p.id
    JOIN clinics c ON c.id = t.clinic_id
    JOIN doctors d ON d.id = t.doctor_id
    WHERE p.tracking_id = ? LIMIT 1;`, [trackingId])[0];
  if (!result) return null;

  const activeStates = ['CALLED', 'IN_CONSULTATION', 'SERVING'];
  const waitingStates = ['WAITING'];
  const ahead = query('SELECT COUNT(*) AS count FROM tokens WHERE clinic_id = ? AND session_id = ? AND doctor_id = ? AND status IN (?) AND sequence_number < ?;', [result.clinic_id, result.session_id, result.doctor_id, waitingStates[0], result.sequence_number])[0];
  const completed = query('SELECT consultation_duration_seconds FROM tokens WHERE clinic_id = ? AND session_id = ? AND doctor_id = ? AND status = ? AND consultation_duration_seconds > 0 ORDER BY completed_at DESC LIMIT 10;', [result.clinic_id, result.session_id, result.doctor_id, 'COMPLETED']);
  const durations = completed.map((item) => Number(item.consultation_duration_seconds) / 60).filter((value) => Number.isFinite(value) && value > 0);
  const averageMinutes = durations.length ? durations.reduce((sum, value) => sum + value, 0) / durations.length : Number(result.avg_consultation_minutes) || 10;
  const calledAt = result.called_at ? Date.parse(result.called_at) : NaN;
  const elapsedMinutes = Number.isFinite(calledAt) ? Math.max(0, (Date.now() - calledAt) / 60000) : 0;
  const currentRemaining = activeStates.includes(result.status) ? Math.max(0, averageMinutes - elapsedMinutes) : 0;
  const patientsAhead = Number(ahead?.count || 0);
  const estimatedWaitMinutes = Math.max(0, Math.round(currentRemaining + (patientsAhead * averageMinutes) + (Number(result.delay_minutes) || 0)));

  return {
    clinic: result.clinic_name,
    doctor: `Dr. ${result.doctor_name}`,
    token: result.token_number,
    status: result.status === 'SERVING' ? 'IN_CONSULTATION' : result.status,
    patientsAhead,
    estimatedWaitMinutes,
    doctorStatus: result.doctor_status,
    delayMinutes: Number(result.delay_minutes) || 0,
    estimatedConsultationMinutes: Math.max(1, Math.round(averageMinutes)),
  };
};

export const listQuery = async (pathValue: string, clauses: Array<{ field: string; op?: string; value?: any }> = []) => {
  await getDatabase();
  const table = extractTableName(pathValue);
  const params: any[] = [];
  const conditions: string[] = [];

  clauses.forEach((clause) => {
    const field = normalizeKey(clause.field);
    const op = clause.op || '==';
    const value = clause.value;

    if (op === '==') {
      conditions.push(`${field} = ?`);
      params.push(value);
    }
    if (op === '!=') {
      conditions.push(`${field} != ?`);
      params.push(value);
    }
    if (op === '>') {
      conditions.push(`${field} > ?`);
      params.push(value);
    }
    if (op === '<') {
      conditions.push(`${field} < ?`);
      params.push(value);
    }
  });

  const rows = query(`SELECT * FROM ${table}${conditions.length ? ` WHERE ${conditions.join(' AND ')}` : ''};`, params);
  return rows.map((row) => rowToObject(row));
};

export const readDoc = async (pathValue: string) => {
  await getDatabase();
  const table = extractTableName(pathValue);
  const id = extractRecordId(pathValue);
  if (!id) return null;

  const rows = query(`SELECT * FROM ${table} WHERE id = ? LIMIT 1;`, [id]);
  if (!rows.length) return null;
  return rowToObject(rows[0]);
};

export const writeDoc = async (pathValue: string, value: Record<string, any>) => {
  await getDatabase();
  const table = extractTableName(pathValue);
  const id = value?.id || extractRecordId(pathValue) || `gen-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const payload = { ...value, id };
  
  console.log(`writeDoc: table=${table}, id=${id}, columns=${Object.keys(payload).join(',')}`);
  
  try {
    // Get table schema to validate columns
    const schemaResult = query(`PRAGMA table_info(${table});`);
    const validColumns = new Set(schemaResult.map((col: any) => col.name));
    
    console.log(`Valid columns for ${table}:`, Array.from(validColumns).join(','));
    
    const serializedValues = Object.keys(payload).map((column) => {
      const raw = payload[column];
      if (typeof raw === 'object' && raw !== null) {
        return JSON.stringify(raw);
      }
      return raw;
    });
    const columns = Object.keys(payload);
    const normalizedColumns = columns.map((column) => normalizeKey(column));
    
    // Filter columns to only those that exist in the table
    const validPayloadColumns: string[] = [];
    const validPayloadValues: any[] = [];
    
    columns.forEach((col, idx) => {
      const normalized = normalizeKey(col);
      if (validColumns.has(normalized)) {
        validPayloadColumns.push(normalized);
        validPayloadValues.push(serializedValues[idx]);
      } else {
        console.log(`Skipping invalid column: ${normalized}`);
      }
    });
    
    if (validPayloadColumns.length === 0) {
      throw new Error(`No valid columns found for table ${table}`);
    }
    
    const placeholders = validPayloadColumns.map(() => '?').join(', ');
    const updateSet = validPayloadColumns
      .filter((col) => col !== 'id')
      .map((col) => `${col} = excluded.${col}`)
      .join(', ');
    
    const sql = `INSERT INTO ${table} (${validPayloadColumns.join(', ')}) VALUES (${placeholders}) ON CONFLICT(id) DO UPDATE SET ${updateSet};`;
    
    console.log(`Executing SQL for ${table}: columns=[${validPayloadColumns.join(',')}]`);
    query(sql, validPayloadValues);
    console.log(`Successfully inserted/updated ${table}/${id}`);
  } catch (error) {
    console.error(`Error in writeDoc for ${table}/${id}:`, error);
    throw error;
  }

  fs.writeFileSync(dbPath, Buffer.from(db!.export()));
  return { id, path: `${table}/${id}` };
};

export const updateDoc = async (pathValue: string, value: Record<string, any>) => {
  await getDatabase();
  const table = extractTableName(pathValue);
  const id = extractRecordId(pathValue) || value?.id;
  if (!id) throw new Error(`Cannot update document without an id: ${pathValue}`);

  const current = await readDoc(`${table}/${id}`);
  const merged = { ...(current || {}), ...value };
  await writeDoc(`${table}/${id}`, merged);
  return { id };
};

export const deleteDoc = async (pathValue: string) => {
  await getDatabase();
  const table = extractTableName(pathValue);
  const id = extractRecordId(pathValue);
  if (!id) return;
  query(`DELETE FROM ${table} WHERE id = ?;`, [id]);
  fs.writeFileSync(dbPath, Buffer.from(db!.export()));
};

export const resetUserPassword = async (userId: string, defaultPassword: string = DEFAULT_USER_PASSWORD) => {
  await getDatabase();
  const passwordHash = hashPassword(defaultPassword);
  query('UPDATE staff_users SET password_hash = ?, password_reset = ? WHERE id = ?;', [passwordHash, `Default: ${defaultPassword}`, userId]);
  fs.writeFileSync(dbPath, Buffer.from(db!.export()));
  return { ok: true, defaultPassword };
};

export const closeDatabase = async () => {
  if (!db) return;
  db.close();
  db = null;
};
