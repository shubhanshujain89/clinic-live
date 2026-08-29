# ClinicFlow Pro

A premium clinic queue and token management platform for doctors, reception teams, and patients.

## Features

- Real-time doctor and receptionist queue workflows
- Live patient tracking and booking flow
- WhatsApp notifications and webhook integration endpoints
- Firebase-backed data layer for queue management
- Premium dark healthcare dashboard UI

## Run locally

1. Install dependencies
   - `npm install`
2. Run the frontend app
   - `npm run dev`
3. Run the backend service independently
   - `npm run dev:server`
4. Optional production-style start
   - `npm run start`

## API endpoints

- `GET /api/health`
- `GET /api/status`
- `GET /api/queue-summary`
- `GET /api/whatsapp/webhook`
- `POST /api/whatsapp/webhook`
- `POST /api/whatsapp/send-template`

## Production build

- `npm run build`

## Notes

- The frontend dev server runs on port `3000`.
- The backend service runs on port `4000` by default.
- Use `BACKEND_PORT` to override the backend port when needed.
