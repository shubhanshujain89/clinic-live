/**
 * Clinic Repository
 * Handles all clinic-related database operations
 */

import { BaseRepository } from './base.js';
import { executeQuery, executeQueryOne, executeTransaction } from '../connection.js';

export interface Clinic {
  id: string;
  name: string;
  doctorName?: string;
  specialty?: string;
  cabinNumber?: string;
  doctorStatus: 'IN' | 'OUT' | 'ON_BREAK' | 'EMERGENCY';
  delayMinutes: number;
  delayReason?: string;
  avgConsultationMinutes: number;
  consultationFee: number;
  currentRunningToken?: string;
  currentRunningTokenId?: string;
  activeSessionId?: string;
  totalPatientsToday: number;
  revenueToday: number;
  phone?: string;
  address?: string;
  email?: string;
  logo?: string;
  operatingHours?: string;
  specializations?: string;
  qrCodeUrl?: string;
  featurePlan: 'TRIAL' | 'BASIC' | 'STANDARD' | 'PREMIUM' | 'ENTERPRISE';
  whatsappNotificationsEnabled: boolean;
  hasPaymentGateway: boolean;
  clinicUpiId?: string;
  createdAt: Date;
  updatedAt: Date;
}

export class ClinicRepository extends BaseRepository<Clinic> {
  protected tableName = 'clinics';
  protected primaryKey = 'id';

  protected mapRowToEntity(row: any): Clinic {
    return {
      id: row.id,
      name: row.name,
      doctorName: row.doctor_name,
      specialty: row.specialty,
      cabinNumber: row.cabin_number,
      doctorStatus: row.doctor_status,
      delayMinutes: row.delay_minutes,
      delayReason: row.delay_reason,
      avgConsultationMinutes: parseFloat(row.avg_consultation_minutes),
      consultationFee: parseFloat(row.consultation_fee),
      currentRunningToken: row.current_running_token,
      currentRunningTokenId: row.current_running_token_id,
      activeSessionId: row.active_session_id,
      totalPatientsToday: row.total_patients_today,
      revenueToday: parseFloat(row.revenue_today),
      phone: row.phone,
      address: row.address,
      email: row.email,
      logo: row.logo,
      operatingHours: row.operating_hours,
      specializations: row.specializations,
      qrCodeUrl: row.qr_code_url,
      featurePlan: row.feature_plan,
      whatsappNotificationsEnabled: Boolean(row.whatsapp_notifications_enabled),
      hasPaymentGateway: Boolean(row.has_payment_gateway),
      clinicUpiId: row.clinic_upi_id,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
    };
  }

  protected mapEntityToColumns(entity: Partial<Clinic>): Record<string, any> {
    const columns: Record<string, any> = {};
    
    if (entity.id !== undefined) columns.id = entity.id;
    if (entity.name !== undefined) columns.name = entity.name;
    if (entity.doctorName !== undefined) columns.doctor_name = entity.doctorName;
    if (entity.specialty !== undefined) columns.specialty = entity.specialty;
    if (entity.cabinNumber !== undefined) columns.cabin_number = entity.cabinNumber;
    if (entity.doctorStatus !== undefined) columns.doctor_status = entity.doctorStatus;
    if (entity.delayMinutes !== undefined) columns.delay_minutes = entity.delayMinutes;
    if (entity.delayReason !== undefined) columns.delay_reason = entity.delayReason;
    if (entity.avgConsultationMinutes !== undefined) columns.avg_consultation_minutes = entity.avgConsultationMinutes;
    if (entity.consultationFee !== undefined) columns.consultation_fee = entity.consultationFee;
    if (entity.currentRunningToken !== undefined) columns.current_running_token = entity.currentRunningToken;
    if (entity.currentRunningTokenId !== undefined) columns.current_running_token_id = entity.currentRunningTokenId;
    if (entity.activeSessionId !== undefined) columns.active_session_id = entity.activeSessionId;
    if (entity.totalPatientsToday !== undefined) columns.total_patients_today = entity.totalPatientsToday;
    if (entity.revenueToday !== undefined) columns.revenue_today = entity.revenueToday;
    if (entity.phone !== undefined) columns.phone = entity.phone;
    if (entity.address !== undefined) columns.address = entity.address;
    if (entity.email !== undefined) columns.email = entity.email;
    if (entity.logo !== undefined) columns.logo = entity.logo;
    if (entity.operatingHours !== undefined) columns.operating_hours = entity.operatingHours;
    if (entity.specializations !== undefined) columns.specializations = entity.specializations;
    if (entity.qrCodeUrl !== undefined) columns.qr_code_url = entity.qrCodeUrl;
    if (entity.featurePlan !== undefined) columns.feature_plan = entity.featurePlan;
    if (entity.whatsappNotificationsEnabled !== undefined) columns.whatsapp_notifications_enabled = entity.whatsappNotificationsEnabled ? 1 : 0;
    if (entity.hasPaymentGateway !== undefined) columns.has_payment_gateway = entity.hasPaymentGateway ? 1 : 0;
    if (entity.clinicUpiId !== undefined) columns.clinic_upi_id = entity.clinicUpiId;
    
    return columns;
  }

  /**
   * Find clinic by ID with all related data
   */
  async findByIdWithRelations(id: string): Promise<Clinic | null> {
    return this.findById(id);
  }

  /**
   * Get all active clinics
   * A clinic is considered "active" if it is not explicitly denied/gated via clinic_access settings
   */
  async findActive(): Promise<Clinic[]> {
    const sql = `
      SELECT c.* FROM \`clinics\` c
      LEFT JOIN \`settings\` s
        ON s.\`key\` = CONCAT('clinic_access_', c.id) AND s.clinic_id IS NULL
      WHERE c.\`feature_plan\` IN (?, ?, ?, ?, ?)
        AND (s.value IS NULL OR s.value NOT IN ('Denied'))
      ORDER BY c.\`name\` ASC
    `;
    const rows = await executeQuery(sql, ['TRIAL', 'BASIC', 'STANDARD', 'PREMIUM', 'ENTERPRISE']);
    return rows.map(row => this.mapRowToEntity(row));
  }

  /**
   * Update clinic status (IN/OUT/ON_BREAK/EMERGENCY)
   */
  async updateDoctorStatus(id: string, status: Clinic['doctorStatus'], delayMinutes?: number, delayReason?: string): Promise<Clinic | null> {
    const updates: Partial<Clinic> = { doctorStatus: status };
    if (delayMinutes !== undefined) updates.delayMinutes = delayMinutes;
    if (delayReason !== undefined) updates.delayReason = delayReason;
    return this.update(id, updates);
  }

  /**
   * Update current running token
   */
  async updateCurrentToken(id: string, tokenNumber: string, tokenId: string): Promise<Clinic | null> {
    return this.update(id, { 
      currentRunningToken: tokenNumber, 
      currentRunningTokenId: tokenId 
    });
  }

  /**
   * Increment patient count and revenue
   */
  async incrementStats(id: string, revenue: number): Promise<Clinic | null> {
    const sql = `
      UPDATE \`clinics\` 
      SET total_patients_today = total_patients_today + 1,
          revenue_today = revenue_today + ?,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `;
    await executeQuery(sql, [revenue, id]);
    return this.findById(id);
  }
}

export const clinicRepository = new ClinicRepository();