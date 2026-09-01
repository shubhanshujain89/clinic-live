/**
 * MySQL Schema Definitions for ClinicFlow Pro
 * 
 * This file contains the SQL statements to create all required tables
 * with proper primary keys, foreign keys, indexes, and constraints.
 */

export const SCHEMA_SQL = `
-- Clinics table
CREATE TABLE IF NOT EXISTS clinics (
    id VARCHAR(64) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    doctor_name VARCHAR(255),
    specialty VARCHAR(255),
    cabin_number VARCHAR(100),
    doctor_status ENUM('IN', 'OUT', 'ON_BREAK', 'EMERGENCY') DEFAULT 'IN',
    delay_minutes INT DEFAULT 0,
    delay_reason TEXT,
    avg_consultation_minutes DECIMAL(5,2) DEFAULT 12.00,
    consultation_fee DECIMAL(10,2) DEFAULT 0.00,
    current_running_token VARCHAR(50),
    current_running_token_id VARCHAR(64),
    active_session_id VARCHAR(64),
    total_patients_today INT DEFAULT 0,
    revenue_today DECIMAL(12,2) DEFAULT 0.00,
    phone VARCHAR(50),
    address TEXT,
    email VARCHAR(255),
    logo TEXT,
    operating_hours TEXT,
    specializations TEXT,
    qr_code_url TEXT,
    feature_plan ENUM('TRIAL', 'BASIC', 'STANDARD', 'PREMIUM', 'ENTERPRISE') DEFAULT 'TRIAL',
    whatsapp_notifications_enabled TINYINT(1) DEFAULT 0,
    has_payment_gateway TINYINT(1) DEFAULT 0,
    clinic_upi_id VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    INDEX idx_clinics_feature_plan (feature_plan),
    INDEX idx_clinics_active_session (active_session_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Support doctor profile photos on existing installations
ALTER TABLE doctors ADD COLUMN photo_url TEXT;

-- Doctors table
CREATE TABLE IF NOT EXISTS doctors (
    id VARCHAR(64) PRIMARY KEY,
    clinic_id VARCHAR(64) NOT NULL,
    name VARCHAR(255) NOT NULL,
    specialization VARCHAR(255),
    qualification VARCHAR(255),
    experience VARCHAR(50),
    phone VARCHAR(50),
    email VARCHAR(255),
    photo_url TEXT,
    bio TEXT,
    consultation_fee DECIMAL(10,2) DEFAULT 0.00,
    available_days JSON,
    available_hours VARCHAR(100),
    rating DECIMAL(3,2) DEFAULT 0.00,
    status ENUM('active', 'inactive', 'on_leave') DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (clinic_id) REFERENCES clinics(id) ON DELETE CASCADE,
    INDEX idx_doctors_clinic_id (clinic_id),
    INDEX idx_doctors_status (status),
    INDEX idx_doctors_email (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Staff/Users table
CREATE TABLE IF NOT EXISTS staff_users (
    id VARCHAR(64) PRIMARY KEY,
    clinic_id VARCHAR(64),
    doctor_id VARCHAR(64),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role ENUM('SUPER_ADMIN', 'CLINIC_ADMIN', 'DOCTOR', 'STAFF') NOT NULL,
    display_name VARCHAR(255),
    name VARCHAR(255),
    phone VARCHAR(50),
    status ENUM('Active', 'Inactive', 'Pending') DEFAULT 'Active',
    clinic_name VARCHAR(255),
    access_status ENUM('Granted', 'Pending', 'Revoked') DEFAULT 'Granted',
    photo_url TEXT,
    password_reset VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (clinic_id) REFERENCES clinics(id) ON DELETE SET NULL,
    FOREIGN KEY (doctor_id) REFERENCES doctors(id) ON DELETE SET NULL,
    INDEX idx_staff_users_clinic_id (clinic_id),
    INDEX idx_staff_users_doctor_id (doctor_id),
    INDEX idx_staff_users_email (email),
    INDEX idx_staff_users_role (role)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Patients table
CREATE TABLE IF NOT EXISTS patients (
    id VARCHAR(64) PRIMARY KEY,
    clinic_id VARCHAR(64) NOT NULL,
    tracking_id VARCHAR(64) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    phone VARCHAR(50),
    age INT,
    gender ENUM('Male', 'Female', 'Other'),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (clinic_id) REFERENCES clinics(id) ON DELETE CASCADE,
    INDEX idx_patients_clinic_id (clinic_id),
    INDEX idx_patients_tracking_id (tracking_id),
    INDEX idx_patients_phone (phone)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Sessions table
CREATE TABLE IF NOT EXISTS sessions (
    id VARCHAR(64) PRIMARY KEY,
    clinic_id VARCHAR(64) NOT NULL,
    date DATE NOT NULL,
    status ENUM('ACTIVE', 'COMPLETED', 'CANCELLED') DEFAULT 'ACTIVE',
    total_tokens_issued INT DEFAULT 0,
    rolling_avg_minutes DECIMAL(5,2) DEFAULT 0.00,
    completed_count INT DEFAULT 0,
    total_revenue DECIMAL(12,2) DEFAULT 0.00,
    active_token_id VARCHAR(64),
    active_token_number VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (clinic_id) REFERENCES clinics(id) ON DELETE CASCADE,
    INDEX idx_sessions_clinic_id (clinic_id),
    INDEX idx_sessions_date (date),
    INDEX idx_sessions_status (status),
    UNIQUE KEY uk_sessions_clinic_date (clinic_id, date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Appointments table
CREATE TABLE IF NOT EXISTS appointments (
    id VARCHAR(64) PRIMARY KEY,
    clinic_id VARCHAR(64) NOT NULL,
    doctor_id VARCHAR(64) NOT NULL,
    session_id VARCHAR(64) NOT NULL,
    tracking_id VARCHAR(64) NOT NULL,
    patient_name VARCHAR(255) NOT NULL,
    patient_phone VARCHAR(50) NOT NULL,
    patient_age INT,
    visit_reason TEXT,
    appointment_type ENUM('ONLINE', 'WALK_IN', 'VIP') DEFAULT 'ONLINE',
    token_number VARCHAR(50) NOT NULL,
    token_sequence INT NOT NULL,
    status ENUM('scheduled', 'waiting', 'serving', 'completed', 'cancelled', 'no_show') DEFAULT 'scheduled',
    scheduled_time TIMESTAMP NULL,
    estimated_time TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (clinic_id) REFERENCES clinics(id) ON DELETE CASCADE,
    FOREIGN KEY (doctor_id) REFERENCES doctors(id) ON DELETE CASCADE,
    FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE,
    INDEX idx_appointments_clinic_id (clinic_id),
    INDEX idx_appointments_doctor_id (doctor_id),
    INDEX idx_appointments_session_id (session_id),
    INDEX idx_appointments_tracking_id (tracking_id),
    INDEX idx_appointments_status (status),
    INDEX idx_appointments_token_sequence (token_sequence),
    UNIQUE KEY uk_appointments_tracking_id (tracking_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Tokens table (for queue management)
CREATE TABLE IF NOT EXISTS tokens (
    id VARCHAR(64) PRIMARY KEY,
    clinic_id VARCHAR(64) NOT NULL,
    session_id VARCHAR(64) NOT NULL,
    doctor_id VARCHAR(64) NOT NULL,
    token_number VARCHAR(50) NOT NULL,
    sequence_number INT NOT NULL,
    patient_id VARCHAR(64),
    patient_name VARCHAR(255) NOT NULL,
    patient_phone VARCHAR(50) NOT NULL,
    patient_age INT,
    patient_gender ENUM('Male', 'Female', 'Other'),
    token_type ENUM('ONLINE', 'WALK_IN', 'VIP') DEFAULT 'ONLINE',
    status ENUM('WAITING', 'CALLED', 'IN_CONSULTATION', 'SERVING', 'COMPLETED', 'HOLD', 'CANCELLED', 'NO_SHOW') DEFAULT 'WAITING',
    is_vip TINYINT(1) DEFAULT 0,
    is_hold TINYINT(1) DEFAULT 0,
    priority INT DEFAULT 10,
    amount_paid DECIMAL(10,2) DEFAULT 0.00,
    payment_mode VARCHAR(50),
    payment_method VARCHAR(50),
    payment_status ENUM('PENDING', 'PAID', 'FAILED', 'REFUNDED') DEFAULT 'PENDING',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    called_at TIMESTAMP NULL,
    completed_at TIMESTAMP NULL,
    consultation_duration_seconds INT,
    pre_consultation_notes JSON,
    weight VARCHAR(20),
    temperature VARCHAR(20),
    blood_pressure VARCHAR(50),
    triage_notes TEXT,
    doctor_notes TEXT,
    whatsapp_sent_count INT DEFAULT 0,
    whatsapp_last_sent_at TIMESTAMP NULL,
    
    FOREIGN KEY (clinic_id) REFERENCES clinics(id) ON DELETE CASCADE,
    FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE,
    FOREIGN KEY (doctor_id) REFERENCES doctors(id) ON DELETE CASCADE,
    FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE SET NULL,
    INDEX idx_tokens_clinic_id (clinic_id),
    INDEX idx_tokens_session_id (session_id),
    INDEX idx_tokens_doctor_id (doctor_id),
    INDEX idx_tokens_status (status),
    INDEX idx_tokens_sequence_number (sequence_number),
    INDEX idx_tokens_patient_id (patient_id),
    UNIQUE KEY uk_tokens_clinic_session_doctor_seq (clinic_id, session_id, doctor_id, sequence_number)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Queue Events table
CREATE TABLE IF NOT EXISTS queue_events (
    id VARCHAR(64) PRIMARY KEY,
    clinic_id VARCHAR(64) NOT NULL,
    token_id VARCHAR(64),
    patient_id VARCHAR(64),
    event_type VARCHAR(100) NOT NULL,
    details JSON,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (clinic_id) REFERENCES clinics(id) ON DELETE CASCADE,
    FOREIGN KEY (token_id) REFERENCES tokens(id) ON DELETE SET NULL,
    FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE SET NULL,
    INDEX idx_queue_events_clinic_id (clinic_id),
    INDEX idx_queue_events_token_id (token_id),
    INDEX idx_queue_events_patient_id (patient_id),
    INDEX idx_queue_events_event_type (event_type),
    INDEX idx_queue_events_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Doctor Status table
CREATE TABLE IF NOT EXISTS doctor_status (
    id VARCHAR(64) PRIMARY KEY,
    clinic_id VARCHAR(64) NOT NULL,
    doctor_id VARCHAR(64) NOT NULL,
    status ENUM('IN', 'OUT', 'ON_BREAK', 'EMERGENCY') DEFAULT 'IN',
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (clinic_id) REFERENCES clinics(id) ON DELETE CASCADE,
    FOREIGN KEY (doctor_id) REFERENCES doctors(id) ON DELETE CASCADE,
    INDEX idx_doctor_status_clinic_id (clinic_id),
    INDEX idx_doctor_status_doctor_id (doctor_id),
    UNIQUE KEY uk_doctor_status_clinic_doctor (clinic_id, doctor_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Settings table
CREATE TABLE IF NOT EXISTS settings (
    id VARCHAR(64) PRIMARY KEY,
    clinic_id VARCHAR(64),
    \`key\` VARCHAR(100) NOT NULL,
    value TEXT,
    category VARCHAR(50),
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (clinic_id) REFERENCES clinics(id) ON DELETE CASCADE,
    INDEX idx_settings_clinic_id (clinic_id),
    INDEX idx_settings_key (\`key\`),
    UNIQUE KEY uk_settings_clinic_key (clinic_id, \`key\`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- WhatsApp Logs table
CREATE TABLE IF NOT EXISTS whatsapp_logs (
    id VARCHAR(64) PRIMARY KEY,
    token_id VARCHAR(64),
    patient_name VARCHAR(255),
    phone VARCHAR(50),
    template_name VARCHAR(100),
    message_body TEXT,
    status ENUM('sent', 'delivered', 'read', 'failed', 'pending') DEFAULT 'pending',
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    meta_message_id VARCHAR(100),
    
    FOREIGN KEY (token_id) REFERENCES tokens(id) ON DELETE SET NULL,
    INDEX idx_whatsapp_logs_token_id (token_id),
    INDEX idx_whatsapp_logs_phone (phone),
    INDEX idx_whatsapp_logs_status (status),
    INDEX idx_whatsapp_logs_timestamp (timestamp)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
`;

export const SEED_DATA_SQL = `
-- Seed data for development/testing
-- This should only be run on fresh databases

-- Insert default clinic
INSERT IGNORE INTO clinics (
    id, name, doctor_name, specialty, cabin_number, doctor_status, 
    delay_minutes, delay_reason, avg_consultation_minutes, consultation_fee,
    current_running_token, current_running_token_id, active_session_id,
    total_patients_today, revenue_today, phone, address, email, logo,
    operating_hours, specializations, qr_code_url, feature_plan,
    whatsapp_notifications_enabled, has_payment_gateway, clinic_upi_id,
    created_at, updated_at
) VALUES (
    'clinic_basic_demo', 'Primary Care Clinic', 'Lead Doctor', 
    'General Medicine & Family Practice', 'Cabin 1, Ground Floor', 'IN',
    0, '', 12.00, 500.00,
    'B-101', 'tok_basic_01', 'sess_clinic_basic_demo',
    9, 4200.00, '+91 98765 10001', 'Clinic address to be configured', 
    'clinic@example.com', '', '9:00 AM - 6:00 PM', 
    'General Medicine, Family Practice', '', 'TRIAL',
    0, 0, 'clinic@upi',
    NOW(), NOW()
);

-- Insert default doctor
INSERT IGNORE INTO doctors (
    id, clinic_id, name, specialization, qualification, experience,
    phone, email, bio, consultation_fee, available_days, available_hours,
    rating, status, created_at
) VALUES (
    'doc_basic_01', 'clinic_basic_demo', 'Lead Doctor',
    'General Medicine & Family Practice', 'MBBS, MD', '8',
    '+91 98765 43210', 'doctor@clinic.local',
    'Experienced physician focused on preventive care and family health.',
    500.00, '["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"]',
    '9:00 AM - 6:00 PM', 4.80, 'active', NOW()
);

-- Insert default session
INSERT IGNORE INTO sessions (
    id, clinic_id, date, status, total_tokens_issued, rolling_avg_minutes,
    completed_count, total_revenue, active_token_id, active_token_number,
    created_at, updated_at
) VALUES (
    'sess_clinic_basic_demo', 'clinic_basic_demo', CURDATE(), 'ACTIVE',
    8, 8.50, 2, 4200.00, 'tok_basic_01', 'B-101', NOW(), NOW()
);

-- Insert default settings
INSERT IGNORE INTO settings (id, clinic_id, \`key\`, value, category, updated_at) VALUES
('site_settings', NULL, 'site_name', 'ClinicFlow Pro', 'site', NOW()),
('site_contact', NULL, 'contact_email', 'hello@clinicflow.local', 'site', NOW()),
('site_banner', NULL, 'hero_title', 'Smarter queues, calmer clinics', 'site', NOW());

-- Insert default users (passwords are hashed versions of 'admin', 'doctor', 'staff')
-- These use the same password hashing as the original SQLite implementation
INSERT IGNORE INTO staff_users (
    id, clinic_id, doctor_id, email, password_hash, role, display_name,
    name, phone, status, clinic_name, access_status, password_reset, created_at
) VALUES
('superadmin_001', NULL, NULL, 'superadmin@clinic.local', 
 '__SUPER_ADMIN_PASSWORD_HASH__',
 'SUPER_ADMIN', 'Super Admin', 'Super Admin', '+91 90000 00001', 'Active', '', 'Granted', 'Default: admin', NOW()),
('clinic_basic_admin', 'clinic_basic_demo', NULL, 'admin@clinic.local',
 '__ADMIN_PASSWORD_HASH__',
 'CLINIC_ADMIN', 'Clinic Admin', 'Clinic Admin', '+91 90000 00002', 'Active', 'Primary Care Clinic', 'Granted', 'Default: admin', NOW()),
('staff_basic_doctor', 'clinic_basic_demo', 'doc_basic_01', 'doctor@clinic.local',
 '__DOCTOR_PASSWORD_HASH__',
 'DOCTOR', 'Lead Doctor', 'Lead Doctor', '+91 90000 00003', 'Active', 'Primary Care Clinic', 'Granted', 'Default: doctor', NOW()),
('staff_basic_reception', 'clinic_basic_demo', NULL, 'staff@clinic.local',
 '__STAFF_PASSWORD_HASH__',
 'STAFF', 'Front Desk Staff', 'Front Desk Staff', '+91 90000 00004', 'Active', 'Primary Care Clinic', 'Granted', 'Default: staff', NOW());
`;