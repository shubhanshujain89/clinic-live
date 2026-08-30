/**
 * Queue Service
 * Handles active queue management operations
 */

import { repositories } from '../repositories/index.js';
import type { Token } from '../repositories/tokens.js';
import { executeQuery, executeQueryOne, executeTransaction } from '../connection.js';

export interface QueueStats {
  waiting: number;
  serving: number;
  completed: number;
  total: number;
}

export interface TokenWithDetails {
  id: string;
  tokenNumber: string;
  sequenceNumber: number;
  patientName: string;
  patientPhone: string;
  patientAge?: number;
  tokenType: Token['tokenType'];
  status: Token['status'];
  isVip: boolean;
  isHold: boolean;
  priority: number;
  createdAt: Date;
  calledAt?: Date;
  completedAt?: Date;
  consultationDurationSeconds?: number;
  preConsultationNotes?: any;
  doctorNotes?: string;
}

export interface CalledTokenResult {
  id: string;
  clinicId: string;
  sessionId: string;
  doctorId: string;
  tokenNumber: string;
  status: Token['status'];
  patientName: string;
}

export interface CompletedTokenResult {
  id: string;
  clinicId: string;
  sessionId: string;
  doctorId: string;
  tokenNumber: string;
  status: Token['status'];
  completedAt: Date;
  consultationDurationSeconds: number;
  nextTokenNumber?: string;
}

export class QueueService {
  /**
   * Get all tokens for a doctor/session with details
   */
  async getQueueTokens(doctorId: string, sessionId: string): Promise<TokenWithDetails[]> {
    const tokens = await repositories.tokens.findByDoctorAndSession(doctorId, sessionId);
    return tokens.map(t => ({
      id: t.id,
      tokenNumber: t.tokenNumber,
      sequenceNumber: t.sequenceNumber,
      patientName: t.patientName,
      patientPhone: t.patientPhone,
      patientAge: t.patientAge,
      tokenType: t.tokenType,
      status: t.status,
      isVip: t.isVip,
      isHold: t.isHold,
      priority: t.priority,
      createdAt: t.createdAt,
      calledAt: t.calledAt,
      completedAt: t.completedAt,
      consultationDurationSeconds: t.consultationDurationSeconds,
      preConsultationNotes: t.preConsultationNotes,
      doctorNotes: t.doctorNotes,
    }));
  }

  /**
   * Get queue statistics
   */
  async getQueueStats(doctorId: string, sessionId: string): Promise<QueueStats> {
    return repositories.tokens.getQueueStats(doctorId, sessionId);
  }

  /**
   * Call next token in queue
   */
  async callNextToken(doctorId: string, sessionId: string): Promise<TokenWithDetails | null> {
    const token = await repositories.tokens.callNextToken(doctorId, sessionId);
    if (!token) return null;

    // Log queue event
    await repositories.queueEvents.logEvent({
      clinicId: token.clinicId,
      tokenId: token.id,
      eventType: 'TOKEN_CALLED',
      details: { tokenNumber: token.tokenNumber, sequenceNumber: token.sequenceNumber },
    });

    return {
      id: token.id,
      tokenNumber: token.tokenNumber,
      sequenceNumber: token.sequenceNumber,
      patientName: token.patientName,
      patientPhone: token.patientPhone,
      patientAge: token.patientAge,
      tokenType: token.tokenType,
      status: token.status,
      isVip: token.isVip,
      isHold: token.isHold,
      priority: token.priority,
      createdAt: token.createdAt,
      calledAt: token.calledAt,
      completedAt: token.completedAt,
      consultationDurationSeconds: token.consultationDurationSeconds,
      preConsultationNotes: token.preConsultationNotes,
      doctorNotes: token.doctorNotes,
    };
  }

  async callTokenForClinic(tokenId: string, clinicId: string, doctorId?: string): Promise<CalledTokenResult | null> {
    return executeTransaction(async (connection) => {
      const [tokenRows] = await connection.execute(
        `SELECT t.id, t.clinic_id, t.session_id, t.doctor_id, t.token_number,
                t.status, t.patient_name
         FROM \`tokens\` t
         JOIN \`sessions\` s ON s.id = t.session_id
         WHERE t.id = ? AND t.clinic_id = ? AND s.clinic_id = ? AND s.status = 'ACTIVE'
         FOR UPDATE`,
        [tokenId, clinicId, clinicId]
      );
      const token = (tokenRows as any[])[0];
      if (!token || (doctorId && token.doctor_id !== doctorId) || token.status !== 'WAITING') return null;

      const [updateResult] = await connection.execute(
        `UPDATE \`tokens\`
         SET status = 'CALLED', called_at = CURRENT_TIMESTAMP
         WHERE id = ? AND clinic_id = ? AND session_id = ? AND status = 'WAITING'`,
        [tokenId, clinicId, token.session_id]
      );
      if ((updateResult as any).affectedRows !== 1) return null;

      await connection.execute(
        `UPDATE \`clinics\`
         SET current_running_token = ?, current_running_token_id = ?
         WHERE id = ?`,
        [token.token_number, token.id, clinicId]
      );

      return {
        id: token.id,
        clinicId: token.clinic_id,
        sessionId: token.session_id,
        doctorId: token.doctor_id,
        tokenNumber: token.token_number,
        status: 'CALLED',
        patientName: token.patient_name,
      };
    });
  }

  async startTokenForClinic(tokenId: string, clinicId: string, doctorId?: string): Promise<CalledTokenResult | null> {
    return executeTransaction(async (connection) => {
      const [tokenRows] = await connection.execute(
        `SELECT t.id, t.clinic_id, t.session_id, t.doctor_id, t.token_number,
                t.status, t.patient_name
         FROM \`tokens\` t
         JOIN \`sessions\` s ON s.id = t.session_id
         WHERE t.id = ? AND t.clinic_id = ? AND s.clinic_id = ? AND s.status = 'ACTIVE'
         FOR UPDATE`,
        [tokenId, clinicId, clinicId]
      );
      const token = (tokenRows as any[])[0];
      if (!token || (doctorId && token.doctor_id !== doctorId) || token.status !== 'CALLED') return null;

      const [updateResult] = await connection.execute(
        `UPDATE \`tokens\`
         SET status = 'IN_CONSULTATION', called_at = CURRENT_TIMESTAMP
         WHERE id = ? AND clinic_id = ? AND session_id = ? AND status = 'CALLED'`,
        [tokenId, clinicId, token.session_id]
      );
      if ((updateResult as any).affectedRows !== 1) return null;

      await connection.execute(
        `UPDATE \`clinics\`
         SET current_running_token = ?, current_running_token_id = ?
         WHERE id = ?`,
        [token.token_number, token.id, clinicId]
      );

      return {
        id: token.id,
        clinicId: token.clinic_id,
        sessionId: token.session_id,
        doctorId: token.doctor_id,
        tokenNumber: token.token_number,
        status: 'IN_CONSULTATION',
        patientName: token.patient_name,
      };
    });
  }

  async completeTokenForClinic(
    tokenId: string,
    clinicId: string,
    doctorId?: string,
    doctorNotes = ''
  ): Promise<CompletedTokenResult | null> {
    return executeTransaction(async (connection) => {
      const [tokenRows] = await connection.execute(
        `SELECT t.id, t.clinic_id, t.session_id, t.doctor_id, t.token_number,
                t.status, t.called_at
         FROM \`tokens\` t
         JOIN \`sessions\` s ON s.id = t.session_id
         WHERE t.id = ? AND t.clinic_id = ? AND s.clinic_id = ? AND s.status = 'ACTIVE'
         FOR UPDATE`,
        [tokenId, clinicId, clinicId]
      );
      const token = (tokenRows as any[])[0];
      if (!token || (doctorId && token.doctor_id !== doctorId) || token.status !== 'IN_CONSULTATION') return null;

      const startedAt = token.called_at ? new Date(token.called_at).getTime() : 0;
      const consultationDurationSeconds = startedAt > 0
        ? Math.max(1, Math.floor((Date.now() - startedAt) / 1000))
        : 480;
      const [updateResult] = await connection.execute(
        `UPDATE \`tokens\`
         SET status = 'COMPLETED', completed_at = CURRENT_TIMESTAMP,
             consultation_duration_seconds = ?, doctor_notes = ?
         WHERE id = ? AND clinic_id = ? AND session_id = ? AND status = 'IN_CONSULTATION'`,
        [consultationDurationSeconds, doctorNotes, tokenId, clinicId, token.session_id]
      );
      if ((updateResult as any).affectedRows !== 1) return null;

      const [durationRows] = await connection.execute(
        `SELECT consultation_duration_seconds
         FROM \`tokens\`
         WHERE clinic_id = ? AND session_id = ? AND doctor_id = ?
           AND status = 'COMPLETED' AND consultation_duration_seconds > 0
         ORDER BY completed_at DESC LIMIT 5`,
        [clinicId, token.session_id, token.doctor_id]
      );
      const durations = (durationRows as any[]).map((row) => Number(row.consultation_duration_seconds) / 60);
      const rollingAverage = durations.length
        ? Number((durations.reduce((sum, value) => sum + value, 0) / durations.length).toFixed(1))
        : 8;

      const [nextRows] = await connection.execute(
        `SELECT id, token_number
         FROM \`tokens\`
         WHERE clinic_id = ? AND session_id = ? AND doctor_id = ? AND status = 'WAITING'
         ORDER BY priority ASC, sequence_number ASC
         LIMIT 1
         FOR UPDATE`,
        [clinicId, token.session_id, token.doctor_id]
      );
      const nextToken = (nextRows as any[])[0];
      if (nextToken) {
        await connection.execute(
          `UPDATE \`tokens\` SET status = 'SERVING', called_at = CURRENT_TIMESTAMP
           WHERE id = ? AND status = 'WAITING'`,
          [nextToken.id]
        );
        await connection.execute(
          `UPDATE \`clinics\`
           SET current_running_token = ?, current_running_token_id = ?, avg_consultation_minutes = ?
           WHERE id = ?`,
          [nextToken.token_number, nextToken.id, rollingAverage, clinicId]
        );
      } else {
        await connection.execute(
          `UPDATE \`clinics\`
           SET current_running_token = 'None', current_running_token_id = '', avg_consultation_minutes = ?
           WHERE id = ?`,
          [rollingAverage, clinicId]
        );
      }

      return {
        id: token.id,
        clinicId: token.clinic_id,
        sessionId: token.session_id,
        doctorId: token.doctor_id,
        tokenNumber: token.token_number,
        status: 'COMPLETED',
        completedAt: new Date(),
        consultationDurationSeconds,
        nextTokenNumber: nextToken?.token_number,
      };
    });
  }

  /**
   * Update token status (e.g., start consultation, complete, hold)
   */
  async updateTokenStatus(
    tokenId: string, 
    status: Token['status'],
    additionalData?: {
      consultationDurationSeconds?: number;
      doctorNotes?: string;
    }
  ): Promise<TokenWithDetails | null> {
    const token = await repositories.tokens.findById(tokenId);
    if (!token) return null;

    const updatedToken = await repositories.tokens.updateStatus(tokenId, status, additionalData);
    if (!updatedToken) return null;

    // Log queue event
    await repositories.queueEvents.logEvent({
      clinicId: updatedToken.clinicId,
      tokenId: updatedToken.id,
      eventType: `TOKEN_${status.toUpperCase()}`,
      details: { 
        tokenNumber: updatedToken.tokenNumber, 
        sequenceNumber: updatedToken.sequenceNumber,
        ...additionalData 
      },
    });

    // If completed, update session stats
    if (status === 'COMPLETED' && additionalData?.consultationDurationSeconds) {
      const session = await repositories.sessions.findById(updatedToken.sessionId);
      if (session) {
        const avgDuration = await repositories.tokens.getAverageConsultationDuration(
          updatedToken.doctorId, 
          updatedToken.sessionId
        );
        await repositories.sessions.updateStats(session.id, avgDuration, updatedToken.amountPaid);
      }
    }

    return {
      id: updatedToken.id,
      tokenNumber: updatedToken.tokenNumber,
      sequenceNumber: updatedToken.sequenceNumber,
      patientName: updatedToken.patientName,
      patientPhone: updatedToken.patientPhone,
      patientAge: updatedToken.patientAge,
      tokenType: updatedToken.tokenType,
      status: updatedToken.status,
      isVip: updatedToken.isVip,
      isHold: updatedToken.isHold,
      priority: updatedToken.priority,
      createdAt: updatedToken.createdAt,
      calledAt: updatedToken.calledAt,
      completedAt: updatedToken.completedAt,
      consultationDurationSeconds: updatedToken.consultationDurationSeconds,
      preConsultationNotes: updatedToken.preConsultationNotes,
      doctorNotes: updatedToken.doctorNotes,
    };
  }

  /**
   * Get average consultation duration
   */
  async getAverageConsultationDuration(doctorId: string, sessionId: string): Promise<number> {
    return repositories.tokens.getAverageConsultationDuration(doctorId, sessionId);
  }

  /**
   * Reorder queue (change priority/sequence)
   */
  async reorderQueue(tokenId: string, newPriority: number): Promise<TokenWithDetails | null> {
    const token = await repositories.tokens.findById(tokenId);
    if (!token) return null;

    const updatedToken = await repositories.tokens.update(tokenId, { priority: newPriority });
    if (!updatedToken) return null;

    await repositories.queueEvents.logEvent({
      clinicId: updatedToken.clinicId,
      tokenId: updatedToken.id,
      eventType: 'TOKEN_REORDERED',
      details: { tokenNumber: updatedToken.tokenNumber, newPriority },
    });

    return {
      id: updatedToken.id,
      tokenNumber: updatedToken.tokenNumber,
      sequenceNumber: updatedToken.sequenceNumber,
      patientName: updatedToken.patientName,
      patientPhone: updatedToken.patientPhone,
      patientAge: updatedToken.patientAge,
      tokenType: updatedToken.tokenType,
      status: updatedToken.status,
      isVip: updatedToken.isVip,
      isHold: updatedToken.isHold,
      priority: updatedToken.priority,
      createdAt: updatedToken.createdAt,
      calledAt: updatedToken.calledAt,
      completedAt: updatedToken.completedAt,
      consultationDurationSeconds: updatedToken.consultationDurationSeconds,
      preConsultationNotes: updatedToken.preConsultationNotes,
      doctorNotes: updatedToken.doctorNotes,
    };
  }

  /**
   * Get current running token for a clinic
   */
  async getCurrentRunningToken(clinicId: string): Promise<TokenWithDetails | null> {
    const clinic = await repositories.clinics.findById(clinicId);
    if (!clinic || !clinic.currentRunningTokenId) return null;

    const token = await repositories.tokens.findById(clinic.currentRunningTokenId);
    if (!token) return null;

    return {
      id: token.id,
      tokenNumber: token.tokenNumber,
      sequenceNumber: token.sequenceNumber,
      patientName: token.patientName,
      patientPhone: token.patientPhone,
      patientAge: token.patientAge,
      tokenType: token.tokenType,
      status: token.status,
      isVip: token.isVip,
      isHold: token.isHold,
      priority: token.priority,
      createdAt: token.createdAt,
      calledAt: token.calledAt,
      completedAt: token.completedAt,
      consultationDurationSeconds: token.consultationDurationSeconds,
      preConsultationNotes: token.preConsultationNotes,
      doctorNotes: token.doctorNotes,
    };
  }
}

export const queueService = new QueueService();