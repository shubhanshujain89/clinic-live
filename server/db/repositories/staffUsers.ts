/**
 * Staff/User Repository
 * Handles all staff/user-related database operations
 */

import { BaseRepository } from './base.js';
import { executeQuery, executeQueryOne } from '../connection.js';
import crypto from 'crypto';

export interface StaffUser {
  id: string;
  clinicId?: string;
  doctorId?: string;
  email: string;
  passwordHash: string;
  role: 'SUPER_ADMIN' | 'CLINIC_ADMIN' | 'DOCTOR' | 'STAFF';
  displayName?: string;
  name?: string;
  phone?: string;
  status: 'Active' | 'Inactive' | 'Pending';
  clinicName?: string;
  accessStatus: 'Granted' | 'Pending' | 'Revoked';
  photoUrl?: string;
  passwordReset?: string;
  createdAt: Date;
  updatedAt: Date;
}

export class StaffUserRepository extends BaseRepository<StaffUser> {
  protected tableName = 'staff_users';
  protected primaryKey = 'id';

  protected mapRowToEntity(row: any): StaffUser {
    return {
      id: row.id,
      clinicId: row.clinic_id,
      doctorId: row.doctor_id,
      email: row.email,
      passwordHash: row.password_hash,
      role: row.role,
      displayName: row.display_name,
      name: row.name,
      phone: row.phone,
      status: row.status,
      clinicName: row.clinic_name,
      accessStatus: row.access_status,
      photoUrl: row.photo_url,
      passwordReset: row.password_reset,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
    };
  }

  protected mapEntityToColumns(entity: Partial<StaffUser>): Record<string, any> {
    const columns: Record<string, any> = {};
    
    if (entity.id !== undefined) columns.id = entity.id;
    if (entity.clinicId !== undefined) columns.clinic_id = entity.clinicId;
    if (entity.doctorId !== undefined) columns.doctor_id = entity.doctorId;
    if (entity.email !== undefined) columns.email = entity.email;
    if (entity.passwordHash !== undefined) columns.password_hash = entity.passwordHash;
    if (entity.role !== undefined) columns.role = entity.role;
    if (entity.displayName !== undefined) columns.display_name = entity.displayName;
    if (entity.name !== undefined) columns.name = entity.name;
    if (entity.phone !== undefined) columns.phone = entity.phone;
    if (entity.status !== undefined) columns.status = entity.status;
    if (entity.clinicName !== undefined) columns.clinic_name = entity.clinicName;
    if (entity.accessStatus !== undefined) columns.access_status = entity.accessStatus;
    if (entity.photoUrl !== undefined) columns.photo_url = entity.photoUrl;
    if (entity.passwordReset !== undefined) columns.password_reset = entity.passwordReset;
    
    return columns;
  }

  /**
   * Find user by email
   */
  async findByEmail(email: string): Promise<StaffUser | null> {
    return this.findOne({ email: email.toLowerCase() });
  }

  /**
   * Find users by clinic ID
   */
  async findByClinicId(clinicId: string): Promise<StaffUser[]> {
    return this.findAll({ 
      where: { clinic_id: clinicId },
      orderBy: 'role',
      orderDirection: 'ASC'
    });
  }

  /**
   * Find users by role
   */
  async findByRole(role: StaffUser['role']): Promise<StaffUser[]> {
    return this.findAll({ 
      where: { role },
      orderBy: 'email',
      orderDirection: 'ASC'
    });
  }

  /**
   * Find users by doctor ID
   */
  async findByDoctorId(doctorId: string): Promise<StaffUser[]> {
    return this.findAll({ 
      where: { doctor_id: doctorId },
      orderBy: 'email',
      orderDirection: 'ASC'
    });
  }

  /**
   * Update password hash
   */
  async updatePassword(id: string, passwordHash: string, passwordReset?: string): Promise<StaffUser | null> {
    return this.update(id, { passwordHash, passwordReset });
  }

  /**
   * Hash password using scrypt (compatible with existing implementation)
   */
  static hashPassword(password: string, salt?: string): string {
    const actualSalt = salt || crypto.randomBytes(16).toString('hex');
    const hash = crypto.scryptSync(password, actualSalt, 64).toString('hex');
    return `${actualSalt}:${hash}`;
  }

  /**
   * Verify password
   */
  static verifyPassword(password: string, storedHash: string): boolean {
    const [salt, expected] = String(storedHash || '').split(':');
    if (!salt || !expected) return false;
    const actual = crypto.scryptSync(password, salt, 64).toString('hex');
    return crypto.timingSafeEqual(Buffer.from(actual, 'hex'), Buffer.from(expected, 'hex'));
  }
}

export const staffUserRepository = new StaffUserRepository();