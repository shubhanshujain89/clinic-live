import { executeTransaction } from '../connection.js';
import { repositories } from '../repositories/index.js';
import { getClinicBusinessDate, getClinicDayStartUtc } from './clinicTime.js';

export class RetentionService {
  async removeExpiredQueueData(): Promise<void> {
    const clinics = await repositories.clinics.findAll();
    await executeTransaction(async (connection) => {
      for (const clinic of clinics) {
        const businessDate = getClinicBusinessDate(new Date(), clinic.timezone);
        await connection.execute(
          `DELETE wl
           FROM \`whatsapp_logs\` wl
           JOIN \`tokens\` t ON t.id = wl.token_id
           JOIN \`sessions\` s ON s.id = t.session_id
           WHERE s.clinic_id = ? AND s.date < ?`,
          [clinic.id, businessDate]
        );

        await connection.execute(
          `DELETE qe
           FROM \`queue_events\` qe
           JOIN \`tokens\` t ON t.id = qe.token_id
           JOIN \`sessions\` s ON s.id = t.session_id
           WHERE s.clinic_id = ? AND s.date < ?`,
          [clinic.id, businessDate]
        );

        await connection.execute(
          `DELETE FROM \`sessions\` WHERE clinic_id = ? AND date < ?`,
          [clinic.id, businessDate]
        );

        await connection.execute(
          `DELETE p
           FROM \`patients\` p
           LEFT JOIN \`tokens\` t ON t.patient_id = p.id
           LEFT JOIN \`appointments\` a ON a.tracking_id = p.tracking_id
           WHERE p.clinic_id = ? AND p.created_at < ?
             AND t.id IS NULL AND a.id IS NULL`,
          [clinic.id, getClinicDayStartUtc(businessDate, clinic.timezone)]
        );
      }
    });
  }
}

export const retentionService = new RetentionService();
