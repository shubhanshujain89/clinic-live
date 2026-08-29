# ClinicFlow Pro

A premium clinic queue and token management platform for doctors, reception teams, and patients with real-time queue workflows, patient tracking, and comprehensive admin dashboard.

## Quick Start - Local Development

### Prerequisites
- Node.js 16+ 
- npm or yarn

### Installation

```bash
# Clone repository
git clone <repo-url>
cd clinicflow-pro

# Install dependencies
npm install

# Create .env file from example
cp .env.example .env
```

### Development Mode

```bash
# Terminal 1: Frontend (runs on port 3000)
npm run dev

# Terminal 2: Backend API (runs on port 4000)
npm run dev:server
```

Visit `http://localhost:3000` in your browser.

### Default Test Credentials

```
Email: admin@clinic.local
Password: admin
Role: Clinic Administrator

Email: doctor@clinic.local
Password: doctor
Role: Doctor

Email: staff@clinic.local
Password: staff
Role: Staff
```

## Production Build

```bash
# Build frontend assets
npm run build

# Start production server (both frontend + backend)
npm run start
```

## Deployment on Hostinger

### 1. Prepare Repository

```bash
npm run clean     # Remove build artifacts
npm run lint      # Verify code
npm run build     # Create production build
```

### 2. Push to GitHub

```bash
git add .
git commit -m "Production ready: ClinicFlow Pro v1.0"
git push origin main
```

### 3. Hostinger Deployment Steps

1. **Connect GitHub Repository**
   - Go to Hostinger Dashboard > Hosting > Git
   - Click "Connect Repository"
   - Select your GitHub account and repository
   - Choose `main` branch

2. **Configure Environment Variables**
   - In Hostinger Dashboard, set these variables:
     ```
     NODE_ENV=production
     PORT=<auto-assigned by Hostinger>
     SUPER_ADMIN_PASSWORD=<change_to_strong_password>
     DATABASE_PATH=./data/clinicflow.sqlite
     ```
   - **IMPORTANT**: Change default admin password before deploying

3. **Build & Deploy**
   - Set build command: `npm install && npm run build`
   - Set start command: `npm run start`
   - Enable automatic deployments on git push

4. **Database Persistence**
   - Hostinger will create `data/` directory automatically
   - Database persists between deployments
   - Backup `data/clinicflow.sqlite` regularly

### 4. Post-Deployment Verification

After deployment, test:

```bash
# Health check
curl https://your-domain.com/api/health

# Status endpoint
curl https://your-domain.com/api/status
```

## Project Structure

```
clinicflow-pro/
├── src/                    # React frontend components
│   ├── components/        # React components
│   ├── pages/            # Page components
│   ├── lib/              # Utilities and services
│   └── types/            # TypeScript types
├── server/               # Express backend
│   └── db.ts            # SQLite database layer
├── server.ts            # Express server entry point
├── index.html           # HTML template
├── vite.config.ts       # Vite configuration
├── tsconfig.json        # TypeScript configuration
├── package.json         # Dependencies
└── data/                # SQLite database (generated)
```

## Key Features

- **Real-time Queue Management**: Live doctor and receptionist workflows
- **Patient Tracking**: Track patient status from booking to consultation
- **Admin Dashboard**: Comprehensive clinic management with billing and user management
- **WhatsApp Integration**: Optional WhatsApp notifications (webhook ready)
- **Responsive UI**: Premium dark theme optimized for healthcare
- **Multi-user Support**: Clinic Admin, Doctor, Staff, and Super Admin roles

## API Endpoints

### Public Endpoints
- `GET /api/health` - Health check
- `GET /api/status` - Server status

### Authentication
- `POST /api/auth/login` - User login
- `POST /api/auth/logout` - User logout

### Database Operations
- `GET /api/db/collection/:path` - Read collection
- `GET /api/db/doc/:path` - Read document
- `POST /api/db/doc` - Create/update document

### WhatsApp Integration
- `GET /api/whatsapp/webhook` - Webhook verification
- `POST /api/whatsapp/webhook` - Receive WhatsApp messages
- `POST /api/whatsapp/send-template` - Send WhatsApp template

## Technology Stack

- **Frontend**: React 19, TypeScript, Tailwind CSS, Vite
- **Backend**: Express.js, Node.js
- **Database**: SQLite (sql.js)
- **UI Components**: Lucide React icons
- **Build Tool**: Vite 6.2.3
- **Package Manager**: npm

## Environment Variables

See `.env.example` for complete configuration. Key variables:

- `NODE_ENV` - Set to `production` for deployment
- `PORT` - Server port (default: 3000)
- `BACKEND_PORT` - API port (default: 4000)
- `SUPER_ADMIN_PASSWORD` - Change this in production!
- `DATABASE_PATH` - SQLite database file location

## Security Notes

⚠️ **IMPORTANT**: Before going live:

1. Change default admin password in `.env`
2. Enable HTTPS on Hostinger
3. Set `NODE_ENV=production`
4. Disable debug mode (`DEBUG_MODE=false`)
5. Use strong session secrets
6. Regularly backup database file

## Support & Issues

For issues or questions, please check:
1. Hostinger logs: Dashboard > Hosting > Logs
2. Server console output via Hostinger terminal
3. Browser console for frontend errors

---

**Version**: 1.0.0 | **License**: Proprietary | **Maintained**: Yes

