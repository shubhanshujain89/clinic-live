# Quick Start Guide - ClinicFlow Pro

## 🚀 One-Minute Start

```bash
# Terminal 1: Frontend
npm install
npm run dev
# App opens at http://localhost:3003/

# Terminal 2: Backend (Optional)
npm run dev:server
# Backend runs at http://localhost:4000/
```

---

## 🎭 Test the Platform

### 1. **Visit Landing Page**
```
URL: http://localhost:3003/
- View marketing content
- Explore features, benefits
- Click "Book Appointment" for no-login booking
```

### 2. **Patient Self-Booking (No Login)**
```
Landing → "Book Appointment Now" button
- Select clinic
- Choose doctor (by specialization)
- Fill appointment details
- Get confirmation with booking ID
```

### 3. **Admin Login**
```
URL: http://localhost:3003/
- Click "Login" → Select "Super Admin"
- Email: admin@clinicflow.pro
- Password: test123
- Access: Full clinic management
```

### 4. **Clinic Admin Login**
```
- Click "Login" → Select "Clinic Admin"
- Email: clinicadmin@clinicflow.pro
- Password: test123
- Access: Manage your clinic, add doctors
```

### 5. **Doctor Login**
```
- Click "Login" → Select "Doctor"
- Email: doctor@clinicflow.pro
- Password: test123
- Access: Queue management, patient tracking
```

### 6. **Staff/Receptionist Login**
```
- Click "Login" → Select "Staff"
- Email: staff@clinicflow.pro
- Password: test123
- Access: Reception desk, walk-in management
```

---

## 📱 Key Pages

| Page | URL | Access |
|------|-----|--------|
| Landing Page | `/` | Public |
| Patient Booking | `/patient-booking` | Public (no login) |
| Login | `/login` | Public |
| Admin Dashboard | `/clinic-admin` | Super Admin only |
| Doctor Management | `/doctor-management` | Admin only |
| Queue System | `/clinic-queue` | Doctor/Staff only |

---

## 🔧 Development Commands

```bash
# Development
npm run dev              # Start dev server on port 3000-3003

# Production Build
npm run build            # Create optimized bundle
npm run preview          # Preview production build locally
npm run start            # Start backend server

# Code Quality
npm run lint             # TypeScript validation
npm run clean            # Clear build artifacts

# Backend
npm run dev:server       # Start Express backend on port 4000
```

---

## 📊 Default Test Data

After login, you'll see:
- **Clinics**: Apex Super Specialty Care, City Medical Center
- **Doctors**: Dr. Aryan Sharma, Dr. Priya Singh, Dr. Rajesh Kumar
- **Tokens**: Queue with sample patients

All data is **real-time synced** from Firebase.

---

## 🎨 UI Highlights

✨ **Professional Dark Theme**
- Slate + Emerald + Cyan color scheme
- Smooth animations and transitions
- Mobile-first responsive design

✨ **Enterprise Features**
- Role-based role switching
- Real-time data updates
- WhatsApp integration ready
- Doctor availability management
- Professional doctor profiles

---

## 🐛 Troubleshooting

### Port Conflicts
```bash
# If port 3000 is busy, app tries 3001, 3002, 3003...
# Check active ports
netstat -ano | findstr :3000
```

### Build Issues
```bash
# Clear cache and rebuild
npm run clean
npm install
npm run build
```

### Firebase Connection
- Ensure `.env.local` has correct Firebase credentials
- Check Firestore is initialized with demo data
- Verify internet connection

---

## 📈 Performance

- **Page Load**: < 2 seconds
- **Bundle Size**: ~1MB (gzipped)
- **Real-time Sync**: < 100ms latency
- **Build Time**: ~12 seconds

---

## 🔐 Security Notes

✅ **In Development**:
- Local testing auth
- Demo Firebase project
- No real patient data

✅ **Before Production**:
- Set up proper Firebase security rules
- Enable HTTPS
- Use environment variables
- Add rate limiting
- Enable audit logging
- Set up monitoring

---

## 💡 Features Overview

### For Patients
- ✅ Book without login
- ✅ See doctor profiles & fees
- ✅ Check real-time wait times
- ✅ Receive WhatsApp updates

### For Clinics
- ✅ Manage multiple clinics
- ✅ Add doctors with profiles
- ✅ Track queue in real-time
- ✅ View analytics
- ✅ Broadcast delays to patients

### For Doctors
- ✅ See patient queue
- ✅ Manage consultations
- ✅ Add pre-consultation notes
- ✅ Track appointment history

### For Staff
- ✅ Check-in patients
- ✅ Add walk-in appointments
- ✅ Manage tokens
- ✅ Send WhatsApp notifications

---

## 📞 API Reference

### Health Check
```bash
curl http://localhost:4000/api/health
# Returns: { status: "ok", app: "ClinicFlow Pro", ... }
```

### Queue Summary
```bash
curl http://localhost:4000/api/queue-summary
# Returns: { clinicName, totalPatients, waiting, serving, completed }
```

### WhatsApp Send Template
```bash
curl -X POST http://localhost:4000/api/whatsapp/send-template \
  -H "Content-Type: application/json" \
  -d '{
    "to": "+919876543210",
    "templateName": "appointment_reminder",
    "patientName": "John",
    "tokenNumber": "A-101"
  }'
```

---

## 🎯 Next Demo Steps

1. **Create a Clinic** (Admin)
   - Name: "Apex Healthcare"
   - Add 3 doctors
   - Set specializations

2. **Book an Appointment** (Patient)
   - Select clinic
   - Choose doctor
   - Schedule appointment

3. **Manage Queue** (Doctor/Staff)
   - View patient queue
   - Call next patient
   - Complete consultation

4. **Send Notifications** (WhatsApp)
   - Trigger appointment reminder
   - Send delay broadcast

---

## 📚 Resources

- React 19 Docs: https://react.dev
- Firebase Docs: https://firebase.google.com/docs
- Tailwind CSS: https://tailwindcss.com
- Vite Docs: https://vitejs.dev

---

**Ready to go?** Open http://localhost:3003/ in your browser! 🎉

Version: 1.0.0 | Last Updated: 2026-08-29
