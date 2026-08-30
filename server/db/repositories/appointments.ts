/**
 * Appointment Repository
 * Handles all appointment-related database operations
 */

import { BaseRepository } from './base.js';
import { executeQuery, executeQueryOne, executeTransaction } from '../connection.js';
import crypto from 'crypto';

export interface Appointment {
  id: string;
  clinicId: string;
  doctorId: string;
  sessionId: string;
  trackingId: string;
  patientName: string;
  patientPhone: string;
  patientAge?: number;
  visitReason?: string;
  appointmentType: 'ONLINE' | 'WALK_IN' | 'VIP';
  tokenNumber: string;
  tokenSequence: number;
  status: 'scheduled' | 'waiting' | 'serving' | 'completed' | 'cancelled' | 'no_show';
  scheduledTime?: Date;
  estimatedTime?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export class AppointmentRepository extends BaseRepository<Appointment> {
  protected tableName = 'appointments';
  protected primaryKey = 'id';

  protected mapRowToEntity(row: any): Appointment {
    return {
      id: row.id,
      clinicId: row.clinic_id,
      doctorId: row.doctor_id,
      sessionId: row.session_id,
      trackingId: row.tracking_id,
      patientName: row.patient_name,
      patientPhone: row.patient_phone,
      patientAge: row.patient_age,
      visitReason: row.visit_reason,
      appointmentType: row.appointment_type,
      tokenNumber: row.token_number,
      tokenSequence: row.token_sequence,
      status: row.status,
      scheduledTime: row.scheduled_time ? new Date(row.scheduled_time) : undefined,
      estimatedTime: row.estimated_time ? new Date(row.estimated_time) : undefined,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
    };
  }

  protected mapEntityToColumns(entity: Partial<Appointment>): Record<string, any> {
    const columns: Record<string, any> = {};
    
    if (entity.id !== undefined) columns.id = entity.id;
    if (entity.clinicId !== undefined) columns.clinic_id = entity.clinicId;
    if (entity.doctorId !== undefined) columns.doctor_id = entity.doctorId;
    if (entity.sessionId !== undefined) columns.session_id = entity.sessionId;
    if (entity.trackingId !== undefined) columns.tracking_id = entity.trackingId;
    if (entity.patientName !== undefined) columns.patient_name = entity.patientName;
    if (entity.patientPhone !== undefined) columns.patient_phone = entity.patientPhone;
    if (entity.patientAge !== undefined) columns.patient_age = entity.patientAge;
    if (entity.visitReason !== undefined) columns.visit_reason = entity.visitReason;
    if (entity.appointmentType !== undefined) columns.appointment_type = entity.appointmentType;
    if (entity.tokenNumber !== undefined) columns.token_number = entity.tokenNumber;
    if (entity.tokenSequence !== undefined) columns.token_sequence = entity.tokenSequence;
    if (entity.status !== undefined) columns.status = entity.status;
    if (entity.scheduledTime !== undefined) columns.scheduled_time = entity.scheduledTime instanceof Date ? entity.scheduledTime : entity.scheduledTime;
    if (entity.estimatedTime !== undefined) columns.estimated_time = entity.estimatedTime instanceof Date ? entity.estimatedTime : entity.estimatedTime;
    
    return columns;
  }

  /**
   * Find appointment by tracking ID
   */
  async findByTrackingId(trackingId: string): Promise<Appointment | null> {
    return this.findOne({ tracking_id: trackingId });
  }

  /**
   * Find appointments by clinic ID
   */
  async findByClinicId(clinicId: string): Promise<Appointment[]> {
    return this.findAll({ 
      where: { clinic_id: clinicId },
      orderBy: 'created_at',
      orderDirection: 'DESC'
    });
  }

  /**
   * Find appointments by doctor ID and session ID
   */
  async findByDoctorAndSession(doctorId: string, sessionId: string): Promise<Appointment[]> {
    return this.findAll({ 
      where: { doctor_id: doctorId, session_id: sessionId },
      orderBy: 'token_sequence',
      orderDirection: 'ASC'
    });
  }

  /**
   * Find appointments by status
   */
  async findByStatus(status: Appointment['status']): Promise<Appointment[]> {
    return this.findAll({ 
      where: { status },
      orderBy: 'created_at',
      orderDirection: 'DESC'
    });
  }

  /**
   * Get next token sequence number for a doctor/session/clinic combination
   * Uses a transaction to ensure atomicity
   */
  async getNextTokenSequence(clinicId: string, sessionId: string, doctorId: string, date: Date): Promise<number> {
    const dateStr = date.toISOString().split('T')[0];
    
    const sql = `
      SELECT COALESCE(MAX(token_sequence), 0) as max_sequence
      FROM \`appointments\`
      WHERE clinic_id = ? AND session_id = ? AND doctor_id = ? AND DATE(created_at) = ?
    `;
    
    const result = await executeQueryOne<{ max_sequence: number }>(sql, [clinicId, sessionId, doctorId, dateStr]);
    return (result?.max_sequence || 0) + 1;
  }

  /**
   * Create appointment with token generation in a transaction
   */
  async createWithToken(data: Omit<Appointment, 'id' | 'createdAt' | 'updatedAt'>): Promise<Appointment> {
    return executeTransaction(async (connection) => {
      // Get next sequence number
      const dateStr = new Date().toISOString().split('T')[0];
      const [seqResult] = await connection.execute(
        `SELECT COALESCE(MAX(token_sequence), 0) as max_sequence
         FROM \`appointments\`
         WHERE clinic_id = ? AND session_id = ? AND doctor_id = ? AND DATE(created_at) = ?`,
        [data.clinicId, data.sessionId, data.doctorId, dateStr]
      );
      const sequenceNumber = (seqResult as any[])[0]?.max_sequence + 1 || 1;
      
      // Generate token number (e.g., A-001, A-002)
      const tokenNumber = `A-${String(sequenceNumber).padStart(3, '0')}`;
      
      // Create appointment
      const id = crypto.randomUUID();
      const now = new Date();
      
      await connection.execute(
        `INSERT INTO \`appointments\` 
         (id, clinic_id, doctor_id, session_id, tracking_id, patient_name, patient_phone, patient_age, visit_reason, appointment_type, token_number, token_sequence, status, scheduled_time, estimated_time, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          id, data.clinicId, data.doctorId, data.sessionId, data.trackingId,
          data.patientName, data.patientPhone, data.patientAge, data.visitReason,
          data.appointmentType, tokenNumber, sequenceNumber, data.status,
          data.scheduledTime || now, data.estimatedTime || now, now, now
        ]
      );
      
      const appointment = await this.findById(id);
      if (!appointment) {
        throw new Error('Failed to create appointment');
      }
      
      return appointment;
    });
  }

  /**
   * Update appointment status
   */
  async updateStatus(id: string, status: Appointment['status']): Promise<Appointment | null> {
    return this.update(id, { status });
  }
}

export const appointmentRepository = new AppointmentRepository();