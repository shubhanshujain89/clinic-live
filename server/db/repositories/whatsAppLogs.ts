/**
 * WhatsApp Logs Repository
 * Handles WhatsApp message logging operations
 */

import { BaseRepository } from './base.js';

export interface WhatsAppLog {
  id: string;
  tokenId?: string;
  patientName?: string;
  phone?: string;
  templateName?: string;
  messageBody?: string;
  status: 'sent' | 'delivered' | 'read' | 'failed' | 'pending';
  timestamp: Date;
  metaMessageId?: string;
}

export class WhatsAppLogRepository extends BaseRepository<WhatsAppLog> {
  protected tableName = 'whatsapp_logs';
  protected primaryKey = 'id';

  protected mapRowToEntity(row: any): WhatsAppLog {
    return {
      id: row.id,
      tokenId: row.token_id,
      patientName: row.patient_name,
      phone: row.phone,
      templateName: row.template_name,
      messageBody: row.message_body,
      status: row.status,
      timestamp: new Date(row.timestamp),
      metaMessageId: row.meta_message_id,
    };
  }

  protected mapEntityToColumns(entity: Partial<WhatsAppLog>): Record<string, any> {
    const columns: Record<string, any> = {};
    
    if (entity.id !== undefined) columns.id = entity.id;
    if (entity.tokenId !== undefined) columns.token_id = entity.tokenId;
    if (entity.patientName !== undefined) columns.patient_name = entity.patientName;
    if (entity.phone !== undefined) columns.phone = entity.phone;
    if (entity.templateName !== undefined) columns.template_name = entity.templateName;
    if (entity.messageBody !== undefined) columns.message_body = entity.messageBody;
    if (entity.status !== undefined) columns.status = entity.status;
    if (entity.timestamp !== undefined) columns.timestamp = entity.timestamp instanceof Date ? entity.timestamp : entity.timestamp;
    if (entity.metaMessageId !== undefined) columns.meta_message_id = entity.metaMessageId;
    
    return columns;
  }

  /**
   * Log a WhatsApp message
   */
  async logMessage(data: Omit<WhatsAppLog, 'id' | 'timestamp'>): Promise<WhatsAppLog> {
    return this.create({
      ...data,
      timestamp: new Date(),
    } as any);
  }

  /**
   * Find logs by token ID
   */
  async findByTokenId(tokenId: string): Promise<WhatsAppLog[]> {
    return this.findAll({ 
      where: { token_id: tokenId },
      orderBy: 'timestamp',
      orderDirection: 'DESC'
    });
  }

  /**
   * Find logs by phone number
   */
  async findByPhone(phone: string): Promise<WhatsAppLog[]> {
    return this.findAll({ 
      where: { phone },
      orderBy: 'timestamp',
      orderDirection: 'DESC'
    });
  }

  /**
   * Find logs by status
   */
  async findByStatus(status: WhatsAppLog['status']): Promise<WhatsAppLog[]> {
    return this.findAll({ 
      where: { status },
      orderBy: 'timestamp',
      orderDirection: 'DESC'
    });
  }

  /**
   * Update log status
   */
  async updateStatus(id: string, status: WhatsAppLog['status'], metaMessageId?: string): Promise<WhatsAppLog | null> {
    const updates: Partial<WhatsAppLog> = { status };
    if (metaMessageId) updates.metaMessageId = metaMessageId;
    return this.update(id, updates);
  }
}

export const whatsAppLogRepository = new WhatsAppLogRepository();