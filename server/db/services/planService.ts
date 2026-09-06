import type { Clinic } from '../repositories/clinics.js';

export type PlanStatus = 'ACTIVE' | 'EXPIRED' | 'PAUSED';

export interface ClinicPlanSnapshot {
  plan: Clinic['featurePlan'];
  status: PlanStatus;
  startedAt: Date;
  expiresAt: Date;
  maxDoctors: number;
  maxStaffUsers: number;
  paymentsEnabled: false;
  whatsappEnabled: false;
  patientNotesEnabled: false;
}

const PLAN_LIMITS: Record<Clinic['featurePlan'], { maxDoctors: number; maxStaffUsers: number }> = {
  TRIAL: { maxDoctors: 1, maxStaffUsers: 2 },
  BASIC: { maxDoctors: 3, maxStaffUsers: 10 },
  STANDARD: { maxDoctors: 10, maxStaffUsers: 25 },
  PREMIUM: { maxDoctors: 25, maxStaffUsers: 100 },
  ENTERPRISE: { maxDoctors: 1000, maxStaffUsers: 1000 },
};

export const getClinicPlanSnapshot = (clinic: Clinic, now = new Date()): ClinicPlanSnapshot => {
  const startedAt = clinic.subscriptionStartedAt || clinic.createdAt;
  const expiresAt = clinic.subscriptionExpiresAt || new Date(startedAt.getTime() + 30 * 24 * 60 * 60 * 1000);
  const status = clinic.subscriptionStatus === 'PAUSED'
    ? 'PAUSED'
    : expiresAt.getTime() <= now.getTime()
      ? 'EXPIRED'
      : 'ACTIVE';
  const limits = PLAN_LIMITS[clinic.featurePlan] || PLAN_LIMITS.TRIAL;

  return {
    plan: clinic.featurePlan,
    status,
    startedAt,
    expiresAt,
    ...limits,
    paymentsEnabled: false,
    whatsappEnabled: false,
    patientNotesEnabled: false,
  };
};

export const assertActiveClinicPlan = (clinic: Clinic): ClinicPlanSnapshot => {
  const snapshot = getClinicPlanSnapshot(clinic);
  if (snapshot.status !== 'ACTIVE') {
    throw new Error(`Clinic subscription is ${snapshot.status.toLowerCase()}. Please renew the ${snapshot.plan} plan.`);
  }
  return snapshot;
};

export const getPlanLimits = (plan: Clinic['featurePlan']) => PLAN_LIMITS[plan] || PLAN_LIMITS.TRIAL;