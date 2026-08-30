/**
 * Session Repository
 * Handles all session-related database operations
 */

import { BaseRepository } from './base.js';
import { executeQuery, executeQueryOne } from '../connection.js';

export interface Session {
  id: string;
  clinicId: string;
  date: Date;
  status: 'ACTIVE' | 'COMPLETED' | 'CANCELLED';
  totalTokensIssued: number;
  rollingAvgMinutes: number;
  completedCount: number;
  totalRevenue: number;
  activeTokenId?: string;
  activeTokenNumber?: string;
  createdAt: Date;
  updatedAt: Date;
}

export class SessionRepository extends BaseRepository<Session> {
  protected tableName = 'sessions';
  protected primaryKey = 'id';

  protected mapRowToEntity(row: any): Session {
    return {
      id: row.id,
      clinicId: row.clinic_id,
      date: new Date(row.date),
      status: row.status,
      totalTokensIssued: row.total_tokens_issued,
      rollingAvgMinutes: parseFloat(row.rolling_avg_minutes),
      completedCount: row.completed_count,
      totalRevenue: parseFloat(row.total_revenue),
      activeTokenId: row.active_token_id,
      activeTokenNumber: row.active_token_number,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
    };
  }

  protected mapEntityToColumns(entity: Partial<Session>): Record<string, any> {
    const columns: Record<string, any> = {};
    
    if (entity.id !== undefined) columns.id = entity.id;
    if (entity.clinicId !== undefined) columns.clinic_id = entity.clinicId;
    if (entity.date !== undefined) columns.date = entity.date instanceof Date ? entity.date.toISOString().split('T')[0] : entity.date;
    if (entity.status !== undefined) columns.status = entity.status;
    if (entity.totalTokensIssued !== undefined) columns.total_tokens_issued = entity.totalTokensIssued;
    if (entity.rollingAvgMinutes !== undefined) columns.rolling_avg_minutes = entity.rollingAvgMinutes;
    if (entity.completedCount !== undefined) columns.completed_count = entity.completedCount;
    if (entity.totalRevenue !== undefined) columns.total_revenue = entity.totalRevenue;
    if (entity.activeTokenId !== undefined) columns.active_token_id = entity.activeTokenId;
    if (entity.activeTokenNumber !== undefined) columns.active_token_number = entity.activeTokenNumber;
    
    return columns;
  }

  /**
   * Find session by clinic ID and date
   */
  async findByClinicAndDate(clinicId: string, date: Date): Promise<Session | null> {
    const dateStr = date.toISOString().split('T')[0];
    return this.findOne({ clinic_id: clinicId, date: dateStr });
  }

  /**
   * Find active session for a clinic
   */
  async findActiveByClinicId(clinicId: string): Promise<Session | null> {
    return this.findOne({ clinic_id: clinicId, status: 'ACTIVE' });
  }

  /**
   * Find sessions by clinic ID
   */
  async findByClinicId(clinicId: string): Promise<Session[]> {
    return this.findAll({ 
      where: { clinic_id: clinicId },
      orderBy: 'date',
      orderDirection: 'DESC'
    });
  }

  /**
   * Increment token count
   */
  async incrementTokenCount(id: string): Promise<Session | null> {
    const sql = `
      UPDATE \`sessions\` 
      SET total_tokens_issued = total_tokens_issued + 1,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `;
    await executeQuery(sql, [id]);
    return this.findById(id);
  }

  /**
   * Update session stats after completion
   */
  async updateStats(id: string, avgMinutes: number, revenue: number): Promise<Session | null> {
    const sql = `
      UPDATE \`sessions\` 
      SET rolling_avg_minutes = ?,
          completed_count = completed_count + 1,
          total_revenue = total_revenue + ?,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `;
    await executeQuery(sql, [avgMinutes, revenue, id]);
    return this.findById(id);
  }

  /**
   * Update active token
   */
  async updateActiveToken(id: string, tokenId: string, tokenNumber: string): Promise<Session | null> {
    return this.update(id, { activeTokenId: tokenId, activeTokenNumber: tokenNumber });
  }
}

export const sessionRepository = new SessionRepository();