/**
 * Patient Repository
 * Handles all patient-related database operations
 */

import { BaseRepository } from './base.js';
import { executeQuery, executeQueryOne, executeTransaction } from '../connection.js';
import crypto from 'crypto';

export interface Patient {
  id: string;
  clinicId: string;
  trackingId: string;
  name: string;
  phone?: string;
  age?: number;
  gender?: 'Male' | 'Female' | 'Other';
  createdAt: Date;
  updatedAt: Date;
}

export class PatientRepository extends BaseRepository<Patient> {
  protected tableName = 'patients';
  protected primaryKey = 'id';

  protected mapRowToEntity(row: any): Patient {
    return {
      id: row.id,
      clinicId: row.clinic_id,
      trackingId: row.tracking_id,
      name: row.name,
      phone: row.phone,
      age: row.age,
      gender: row.gender,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
    };
  }

  protected mapEntityToColumns(entity: Partial<Patient>): Record<string, any> {
    const columns: Record<string, any> = {};
    
    if (entity.id !== undefined) columns.id = entity.id;
    if (entity.clinicId !== undefined) columns.clinic_id = entity.clinicId;
    if (entity.trackingId !== undefined) columns.tracking_id = entity.trackingId;
    if (entity.name !== undefined) columns.name = entity.name;
    if (entity.phone !== undefined) columns.phone = entity.phone;
    if (entity.age !== undefined) columns.age = entity.age;
    if (entity.gender !== undefined) columns.gender = entity.gender;
    
    return columns;
  }

  /**
   * Find patient by tracking ID
   */
  async findByTrackingId(trackingId: string): Promise<Patient | null> {
    return this.findOne({ tracking_id: trackingId });
  }

  /**
   * Find patients by clinic ID
   */
  async findByClinicId(clinicId: string): Promise<Patient[]> {
    return this.findAll({ 
      where: { clinic_id: clinicId },
      orderBy: 'created_at',
      orderDirection: 'DESC'
    });
  }

  /**
   * Create a new patient with a cryptographically random tracking ID
   */
  async createWithTrackingId(data: Omit<Patient, 'id' | 'trackingId' | 'createdAt' | 'updatedAt'>): Promise<Patient> {
    const trackingId = crypto.randomBytes(9).toString('base64url');
    const id = crypto.randomUUID();
    const now = new Date();
    
    return this.create({
      ...data,
      id,
      trackingId,
      createdAt: now,
      updatedAt: now,
    });
  }

  /**
   * Generate a cryptographically secure tracking ID
   */
  static generateTrackingId(): string {
    return crypto.randomBytes(9).toString('base64url');
  }
}

export const patientRepository = new PatientRepository();