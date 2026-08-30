/**
 * Doctor Repository
 * Handles all doctor-related database operations
 */

import { BaseRepository } from './base.js';
import { executeQuery, executeQueryOne } from '../connection.js';

export interface Doctor {
  id: string;
  clinicId: string;
  name: string;
  specialization?: string;
  qualification?: string;
  experience?: string;
  phone?: string;
  email?: string;
  bio?: string;
  consultationFee: number;
  availableDays: string[];
  availableHours?: string;
  rating: number;
  status: 'active' | 'inactive' | 'on_leave';
  createdAt: Date;
  updatedAt: Date;
}

export class DoctorRepository extends BaseRepository<Doctor> {
  protected tableName = 'doctors';
  protected primaryKey = 'id';

  protected mapRowToEntity(row: any): Doctor {
    return {
      id: row.id,
      clinicId: row.clinic_id,
      name: row.name,
      specialization: row.specialization,
      qualification: row.qualification,
      experience: row.experience,
      phone: row.phone,
      email: row.email,
      bio: row.bio,
      consultationFee: parseFloat(row.consultation_fee),
      availableDays: Array.isArray(row.available_days)
        ? row.available_days
        : row.available_days
          ? JSON.parse(row.available_days)
          : [],
      availableHours: row.available_hours,
      rating: parseFloat(row.rating),
      status: row.status,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
    };
  }

  protected mapEntityToColumns(entity: Partial<Doctor>): Record<string, any> {
    const columns: Record<string, any> = {};
    
    if (entity.id !== undefined) columns.id = entity.id;
    if (entity.clinicId !== undefined) columns.clinic_id = entity.clinicId;
    if (entity.name !== undefined) columns.name = entity.name;
    if (entity.specialization !== undefined) columns.specialization = entity.specialization;
    if (entity.qualification !== undefined) columns.qualification = entity.qualification;
    if (entity.experience !== undefined) columns.experience = entity.experience;
    if (entity.phone !== undefined) columns.phone = entity.phone;
    if (entity.email !== undefined) columns.email = entity.email;
    if (entity.bio !== undefined) columns.bio = entity.bio;
    if (entity.consultationFee !== undefined) columns.consultation_fee = entity.consultationFee;
    if (entity.availableDays !== undefined) columns.available_days = JSON.stringify(entity.availableDays);
    if (entity.availableHours !== undefined) columns.available_hours = entity.availableHours;
    if (entity.rating !== undefined) columns.rating = entity.rating;
    if (entity.status !== undefined) columns.status = entity.status;
    
    return columns;
  }

  /**
   * Find doctors by clinic ID
   */
  async findByClinicId(clinicId: string): Promise<Doctor[]> {
    return this.findAll({ 
      where: { clinic_id: clinicId },
      orderBy: 'name',
      orderDirection: 'ASC'
    });
  }

  /**
   * Find active doctors by clinic ID
   */
  async findActiveByClinicId(clinicId: string): Promise<Doctor[]> {
    return this.findAll({ 
      where: { clinic_id: clinicId, status: 'active' },
      orderBy: 'name',
      orderDirection: 'ASC'
    });
  }

  /**
   * Find doctor by email
   */
  async findByEmail(email: string): Promise<Doctor | null> {
    return this.findOne({ email });
  }

  /**
   * Update doctor status
   */
  async updateStatus(id: string, status: Doctor['status']): Promise<Doctor | null> {
    return this.update(id, { status });
  }
}

export const doctorRepository = new DoctorRepository();