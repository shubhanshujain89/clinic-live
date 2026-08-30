/**
 * Doctor Status Repository
 * Handles doctor status operations
 */

import { BaseRepository } from './base.js';

export interface DoctorStatus {
  id: string;
  clinicId: string;
  doctorId: string;
  status: 'IN' | 'OUT' | 'ON_BREAK' | 'EMERGENCY';
  updatedAt: Date;
}

export class DoctorStatusRepository extends BaseRepository<DoctorStatus> {
  protected tableName = 'doctor_status';
  protected primaryKey = 'id';

  protected mapRowToEntity(row: any): DoctorStatus {
    return {
      id: row.id,
      clinicId: row.clinic_id,
      doctorId: row.doctor_id,
      status: row.status,
      updatedAt: new Date(row.updated_at),
    };
  }

  protected mapEntityToColumns(entity: Partial<DoctorStatus>): Record<string, any> {
    const columns: Record<string, any> = {};
    
    if (entity.id !== undefined) columns.id = entity.id;
    if (entity.clinicId !== undefined) columns.clinic_id = entity.clinicId;
    if (entity.doctorId !== undefined) columns.doctor_id = entity.doctorId;
    if (entity.status !== undefined) columns.status = entity.status;
    
    return columns;
  }

  /**
   * Find or create doctor status
   */
  async findOrCreate(clinicId: string, doctorId: string): Promise<DoctorStatus> {
    let status = await this.findOne({ clinic_id: clinicId, doctor_id: doctorId });
    if (!status) {
      status = await this.create({
        id: crypto.randomUUID(),
        clinicId,
        doctorId,
        status: 'IN',
      } as any);
    }
    return status;
  }

  /**
   * Update doctor status
   */
  async updateStatus(clinicId: string, doctorId: string, status: DoctorStatus['status']): Promise<DoctorStatus | null> {
    const existing = await this.findOne({ clinic_id: clinicId, doctor_id: doctorId });
    if (existing) {
      return this.update(existing.id, { status });
    } else {
      return this.create({
        id: crypto.randomUUID(),
        clinicId,
        doctorId,
        status,
      } as any);
    }
  }

  /**
   * Get all doctor statuses for a clinic
   */
  async findByClinicId(clinicId: string): Promise<DoctorStatus[]> {
    return this.findAll({ 
      where: { clinic_id: clinicId },
      orderBy: 'doctor_id',
      orderDirection: 'ASC'
    });
  }
}

export const doctorStatusRepository = new DoctorStatusRepository();