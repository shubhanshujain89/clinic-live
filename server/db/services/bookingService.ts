/**
 * Booking Service
 * Handles patient booking business logic
 */

import { repositories } from '../repositories/index.js';
import { executeTransaction } from '../connection.js';
import crypto from 'crypto';

export interface BookingInput {
  clinicId: string;
  doctorId: string;
  patientName: string;
  phone: string;
  age?: number;
  reason?: string;
}

export interface BookingResult {
  trackingId: string;
  tokenId: string;
  tokenNumber: string;
  clinicName: string;
  doctorName: string;
}

export class BookingService {
  /**
   * Create a public booking (patient self-booking)
   */
  async createPublicBooking(input: BookingInput): Promise<BookingResult> {
    // Validate clinic exists
    const clinic = await repositories.clinics.findById(input.clinicId);
    if (!clinic) {
      throw new Error('Clinic not found');
    }

    // Validate doctor exists and is active
    const doctor = await repositories.doctors.findById(input.doctorId);
    if (!doctor || doctor.clinicId !== input.clinicId || doctor.status !== 'active') {
      throw new Error('Doctor not available');
    }

    // Get or create active session for today
    const today = new Date();
    let session = await repositories.sessions.findActiveByClinicId(input.clinicId);
    if (!session) {
      session = await repositories.sessions.create({
        id: crypto.randomUUID(),
        clinicId: input.clinicId,
        date: today,
        status: 'ACTIVE',
      } as any);
      
      // Update clinic's active session
      await repositories.clinics.update(input.clinicId, { activeSessionId: session.id });
    }

    // Generate tracking ID
    const trackingId = crypto.randomBytes(9).toString('base64url');
    const patientId = crypto.randomUUID();
    const tokenId = crypto.randomUUID();
    const now = new Date();

    // Create patient, token, and appointment in a transaction
    return executeTransaction(async (connection) => {
      // Get next token sequence atomically
      const dateStr = today.toISOString().split('T')[0];
      const [seqResult] = await connection.execute(
        `SELECT COALESCE(MAX(sequence_number), 0) as max_sequence
         FROM \`tokens\`
         WHERE clinic_id = ? AND session_id = ? AND doctor_id = ? AND DATE(created_at) = ?`,
        [input.clinicId, session.id, input.doctorId, dateStr]
      );
      const sequenceNumber = (seqResult as any[])[0]?.max_sequence + 1 || 1;
      const tokenNumber = `A-${String(sequenceNumber).padStart(3, '0')}`;

      // Create patient
      await connection.execute(
        `INSERT INTO \`patients\` (id, clinic_id, tracking_id, name, phone, age, gender, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [patientId, input.clinicId, trackingId, input.patientName.trim(), input.phone.trim(), input.age || null, null, now, now]
      );

      // Create token
      await connection.execute(
        `INSERT INTO \`tokens\` 
         (id, clinic_id, session_id, doctor_id, token_number, sequence_number, patient_id, patient_name, patient_phone, patient_age, token_type, status, is_vip, is_hold, priority, amount_paid, payment_status, created_at, pre_consultation_notes)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          tokenId, input.clinicId, session.id, input.doctorId, tokenNumber, sequenceNumber,
          patientId, input.patientName.trim(), input.phone.trim(), input.age || null,
          'ONLINE', 'WAITING', 0, 0, 10, 0, 'PENDING', now,
          input.reason?.trim() ? JSON.stringify({ symptoms: input.reason.trim() }) : null
        ]
      );

      // Create appointment
      await connection.execute(
        `INSERT INTO \`appointments\` 
         (id, clinic_id, doctor_id, session_id, tracking_id, patient_name, patient_phone, patient_age, visit_reason, appointment_type, token_number, token_sequence, status, scheduled_time, estimated_time, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          crypto.randomUUID(), input.clinicId, input.doctorId, session.id, trackingId,
          input.patientName.trim(), input.phone.trim(), input.age || null, input.reason?.trim(),
          'ONLINE', tokenNumber, sequenceNumber, 'scheduled', now, now, now, now
        ]
      );

      // Update session token count
      await connection.execute(
        `UPDATE \`sessions\` SET total_tokens_issued = total_tokens_issued + 1, updated_at = ? WHERE id = ?`,
        [now, session.id]
      );

      return {
        trackingId,
        tokenId,
        tokenNumber,
        clinicName: clinic.name,
        doctorName: doctor.name,
      };
    });
  }

  /**
   * Create a walk-in token (receptionist booking)
   */
  async createWalkInToken(input: BookingInput & { tokenType: 'WALK_IN' | 'VIP' }): Promise<BookingResult> {
    // Similar to public booking but with different token type
    const clinic = await repositories.clinics.findById(input.clinicId);
    if (!clinic) throw new Error('Clinic not found');

    const doctor = await repositories.doctors.findById(input.doctorId);
    if (!doctor || doctor.clinicId !== input.clinicId || doctor.status !== 'active') {
      throw new Error('Doctor not available');
    }

    const today = new Date();
    let session = await repositories.sessions.findActiveByClinicId(input.clinicId);
    if (!session) {
      session = await repositories.sessions.create({
        id: crypto.randomUUID(),
        clinicId: input.clinicId,
        date: today,
        status: 'ACTIVE',
      } as any);
      await repositories.clinics.update(input.clinicId, { activeSessionId: session.id });
    }

    const trackingId = crypto.randomBytes(9).toString('base64url');
    const patientId = crypto.randomUUID();
    const tokenId = crypto.randomUUID();
    const now = new Date();

    return executeTransaction(async (connection) => {
      const dateStr = today.toISOString().split('T')[0];
      const [seqResult] = await connection.execute(
        `SELECT COALESCE(MAX(sequence_number), 0) as max_sequence
         FROM \`tokens\`
         WHERE clinic_id = ? AND session_id = ? AND doctor_id = ? AND DATE(created_at) = ?`,
        [input.clinicId, session.id, input.doctorId, dateStr]
      );
      const sequenceNumber = (seqResult as any[])[0]?.max_sequence + 1 || 1;
      
      // VIP tokens get a different prefix
      const prefix = input.tokenType === 'VIP' ? 'VIP' : 'W';
      const tokenNumber = `${prefix}-${String(sequenceNumber).padStart(3, '0')}`;

      await connection.execute(
        `INSERT INTO \`patients\` (id, clinic_id, tracking_id, name, phone, age, gender, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [patientId, input.clinicId, trackingId, input.patientName.trim(), input.phone.trim(), input.age || null, null, now, now]
      );

      await connection.execute(
        `INSERT INTO \`tokens\` 
         (id, clinic_id, session_id, doctor_id, token_number, sequence_number, patient_id, patient_name, patient_phone, patient_age, token_type, status, is_vip, is_hold, priority, amount_paid, payment_status, created_at, pre_consultation_notes)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          tokenId, input.clinicId, session.id, input.doctorId, tokenNumber, sequenceNumber,
          patientId, input.patientName.trim(), input.phone.trim(), input.age || null,
          input.tokenType, 'WAITING', input.tokenType === 'VIP' ? 1 : 0, 0, 
          input.tokenType === 'VIP' ? 1 : 10, 0, 'PENDING', now,
          input.reason?.trim() ? JSON.stringify({ symptoms: input.reason.trim() }) : null
        ]
      );

      await connection.execute(
        `INSERT INTO \`appointments\` 
         (id, clinic_id, doctor_id, session_id, tracking_id, patient_name, patient_phone, patient_age, visit_reason, appointment_type, token_number, token_sequence, status, scheduled_time, estimated_time, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          crypto.randomUUID(), input.clinicId, input.doctorId, session.id, trackingId,
          input.patientName.trim(), input.phone.trim(), input.age || null, input.reason?.trim(),
          input.tokenType, tokenNumber, sequenceNumber, 'scheduled', now, now, now, now
        ]
      );

      await connection.execute(
        `UPDATE \`sessions\` SET total_tokens_issued = total_tokens_issued + 1, updated_at = ? WHERE id = ?`,
        [now, session.id]
      );

      return {
        trackingId,
        tokenId,
        tokenNumber,
        clinicName: clinic.name,
        doctorName: doctor.name,
      };
    });
  }
}

export const bookingService = new BookingService();