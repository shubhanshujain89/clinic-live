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
  supported: boolean;
}

export const LAUNCH_PLANS: Clinic['featurePlan'][] = ['TRIAL', 'BASIC'];

const PLAN_LIMITS: Partial<Record<Clinic['featurePlan'], { maxDoctors: number; maxStaffUsers: number }>> = {
  TRIAL: { maxDoctors: 1, maxStaffUsers: 2 },
  BASIC: { maxDoctors: 3, maxStaffUsers: 10 },
};
const DEFAULT_PLAN_LIMITS = { maxDoctors: 1, maxStaffUsers: 2 };

const calculateExpiryDate = (startDate: Date, durationDays: number) => new Date(startDate.getTime() + Math.max(0, durationDays - 1) * 24 * 60 * 60 * 1000);

export const getClinicPlanSnapshot = (clinic: Clinic, now = new Date()): ClinicPlanSnapshot => {
  const startedAt = clinic.subscriptionStartedAt || clinic.createdAt;
  const expiresAt = clinic.subscriptionExpiresAt || calculateExpiryDate(startedAt, 30);
  const status = clinic.subscriptionStatus === 'PAUSED'
    ? 'PAUSED'
    : !LAUNCH_PLANS.includes(clinic.featurePlan)
      ? 'PAUSED'
      : expiresAt.getTime() <= now.getTime()
      ? 'EXPIRED'
      : 'ACTIVE';
  const limits = PLAN_LIMITS[clinic.featurePlan] || DEFAULT_PLAN_LIMITS;

  return {
    plan: clinic.featurePlan,
    status,
    startedAt,
    expiresAt,
    ...limits,
    paymentsEnabled: false,
    whatsappEnabled: false,
    patientNotesEnabled: false,
    supported: LAUNCH_PLANS.includes(clinic.featurePlan),
  };
};

export const assertActiveClinicPlan = (clinic: Clinic): ClinicPlanSnapshot => {
  const snapshot = getClinicPlanSnapshot(clinic);
  if (snapshot.status !== 'ACTIVE') {
    throw new Error(`Clinic subscription is ${snapshot.status.toLowerCase()}. Please renew the ${snapshot.plan} plan.`);
  }
  return snapshot;
};

export const getPlanLimits = (plan: Clinic['featurePlan']): { maxDoctors: number; maxStaffUsers: number } =>
  PLAN_LIMITS[plan] || DEFAULT_PLAN_LIMITS;