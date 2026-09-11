/**
 * Tracking Service
 * Handles public patient tracking (no authentication required)
 */

import { repositories } from '../repositories/index.js';
import { executeQuery, executeQueryOne } from '../connection.js';
import { getClinicBusinessDate } from './clinicTime.js';
import { getPublicTrackingEstimatedWaitMinutes, QueueService } from './queueService.js';

export interface TrackingResult {
  clinic: string;
  doctor: string;
  token: string;
  status: string;
  patientsAhead: number;
  estimatedWaitMinutes: number;
  estimatedConsultationMinutes: number;
  doctorStatus: string;
  delayMinutes: number;
}

export class TrackingService {
  /**
   * Get public tracking information using the patient's mobile number.
   * This endpoint intentionally returns queue status only.
   */
  async getPublicTrackingByPhone(phone: string): Promise<TrackingResult | null> {
    const normalizedPhone = phone.replace(/\D/g, '').replace(/^91/, '').slice(-10);
    if (!/^\d{10}$/.test(normalizedPhone)) {
      return null;
    }

    const sql = `
      SELECT
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
        c.operating_hours,
        t.session_id,
        t.clinic_id,
        t.doctor_id,
        s.date AS session_date,
        c.timezone
      FROM patients p
      JOIN tokens t ON t.patient_id = p.id
      JOIN sessions s ON s.id = t.session_id
      JOIN clinics c ON c.id = t.clinic_id
      JOIN doctors d ON d.id = t.doctor_id
      WHERE (p.phone = ? OR p.phone = ? OR p.phone = ?)
      ORDER BY p.created_at DESC LIMIT 20
    `;

    const candidates = await executeQuery<any>(sql, [normalizedPhone, `+91${normalizedPhone}`, `91${normalizedPhone}`]);
    const result = candidates.find((candidate) =>
      getClinicBusinessDate(new Date(candidate.session_date), candidate.timezone) === getClinicBusinessDate(new Date(), candidate.timezone)
    );
    if (!result) return null;

    await new QueueService().syncDoctorStatusForEmptyQueue(result.clinic_id, result.doctor_id, new Date());

    // Calculate patients ahead (waiting tokens with lower sequence number)
    const waitingStates = ['WAITING'];
    const aheadResult = await executeQueryOne<{ count: number }>(
      `SELECT COUNT(*) AS count FROM tokens 
       WHERE clinic_id = ? AND session_id = ? AND doctor_id = ? 
       AND status IN (?) AND sequence_number < ?`,
      [result.clinic_id, result.session_id, result.doctor_id, waitingStates, result.sequence_number]
    );
    const patientsAhead = Number(aheadResult?.count || 0);

    // Get average consultation duration from recent completed tokens
    const completedResult = await executeQuery<{ consultation_duration_seconds: number }>(
      `SELECT consultation_duration_seconds FROM tokens 
       WHERE clinic_id = ? AND session_id = ? AND doctor_id = ? 
       AND status = ? AND consultation_duration_seconds > 0 
       ORDER BY completed_at DESC LIMIT 10`,
      [result.clinic_id, result.session_id, result.doctor_id, 'COMPLETED']
    );
    
    const durations = completedResult
      .map(item => Number(item.consultation_duration_seconds) / 60)
      .filter(value => Number.isFinite(value) && value > 0);
    
    const averageMinutes = durations.length 
      ? durations.reduce((sum, value) => sum + value, 0) / durations.length 
      : Number(result.avg_consultation_minutes) || 10;

    // Calculate elapsed time for currently serving patient
    const activeStates = ['CALLED', 'IN_CONSULTATION', 'SERVING'];
    const calledAt = result.called_at ? Date.parse(result.called_at) : NaN;
    const elapsedMinutes = Number.isFinite(calledAt) 
      ? Math.max(0, (Date.now() - calledAt) / 60000) 
      : 0;
    
    const currentRemaining = activeStates.includes(result.status) 
      ? Math.max(0, averageMinutes - elapsedMinutes) 
      : 0;

    const rawEstimatedWaitMinutes = Math.max(0, Math.round(
      currentRemaining + (patientsAhead * averageMinutes) + (Number(result.delay_minutes) || 0)
    ));

    const estimatedWaitMinutes = getPublicTrackingEstimatedWaitMinutes({
      doctorStatus: result.doctor_status,
      status: result.status,
      operatingHours: result.operating_hours,
      queueWaitMinutes: rawEstimatedWaitMinutes,
      now: new Date(),
    });

    // Map status for public display
    const publicStatus = result.status === 'SERVING' ? 'IN_CONSULTATION' : result.status;

    return {
      clinic: result.clinic_name,
      doctor: /^Dr\.\s*/i.test(result.doctor_name)
        ? result.doctor_name
        : `Dr. ${result.doctor_name}`,
      token: result.token_number,
      status: publicStatus,
      patientsAhead,
      estimatedWaitMinutes,
      estimatedConsultationMinutes: Math.max(1, Math.round(averageMinutes)),
      doctorStatus: result.doctor_status,
      delayMinutes: Number(result.delay_minutes) || 0,
    };
  }
}

export const trackingService = new TrackingService();