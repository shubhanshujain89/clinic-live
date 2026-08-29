import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = Number(process.env.PORT || process.env.BACKEND_PORT || 4000);

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

app.listen(PORT, '0.0.0.0', () => {
  console.log(`ClinicFlow Pro backend listening on port ${PORT}`);
});

export default app;
