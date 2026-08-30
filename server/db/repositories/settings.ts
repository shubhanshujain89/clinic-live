/**
 * Settings Repository
 * Handles application settings operations
 */

import { BaseRepository } from './base.js';

export interface Setting {
  id: string;
  clinicId?: string;
  key: string;
  value?: string;
  category?: string;
  updatedAt: Date;
}

export class SettingsRepository extends BaseRepository<Setting> {
  protected tableName = 'settings';
  protected primaryKey = 'id';

  protected mapRowToEntity(row: any): Setting {
    return {
      id: row.id,
      clinicId: row.clinic_id,
      key: row.key,
      value: row.value,
      category: row.category,
      updatedAt: new Date(row.updated_at),
    };
  }

  protected mapEntityToColumns(entity: Partial<Setting>): Record<string, any> {
    const columns: Record<string, any> = {};
    
    if (entity.id !== undefined) columns.id = entity.id;
    if (entity.clinicId !== undefined) columns.clinic_id = entity.clinicId;
    if (entity.key !== undefined) columns.key = entity.key;
    if (entity.value !== undefined) columns.value = entity.value;
    if (entity.category !== undefined) columns.category = entity.category;
    
    return columns;
  }

  /**
   * Get setting by key (and optional clinic ID)
   */
  async getSetting(key: string, clinicId?: string): Promise<Setting | null> {
    const where: Record<string, any> = { key };
    if (clinicId) where.clinic_id = clinicId;
    else where.clinic_id = null;
    return this.findOne(where);
  }

  /**
   * Get setting value by key
   */
  async getValue(key: string, clinicId?: string): Promise<string | null> {
    const setting = await this.getSetting(key, clinicId);
    return setting?.value || null;
  }

  /**
   * Set setting value
   */
  async setValue(key: string, value: string, clinicId?: string, category?: string): Promise<Setting> {
    const where: Record<string, any> = { key };
    if (clinicId) where.clinic_id = clinicId;
    else where.clinic_id = null;
    
    const existing = await this.findOne(where);
    if (existing) {
      return this.update(existing.id, { value, category }) as Promise<Setting>;
    } else {
      return this.create({
        id: crypto.randomUUID(),
        key,
        value,
        clinicId: clinicId || null,
        category: category || 'general',
      } as any);
    }
  }

  /**
   * Get all settings for a clinic
   */
  async findByClinicId(clinicId: string): Promise<Setting[]> {
    return this.findAll({ 
      where: { clinic_id: clinicId },
      orderBy: 'category',
      orderDirection: 'ASC'
    });
  }

  /**
   * Get all global settings (clinic_id is null)
   */
  async findGlobal(): Promise<Setting[]> {
    return this.findAll({ 
      where: { clinic_id: null },
      orderBy: 'category',
      orderDirection: 'ASC'
    });
  }
}

export const settingsRepository = new SettingsRepository();