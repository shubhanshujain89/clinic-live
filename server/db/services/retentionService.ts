import { executeTransaction } from '../connection.js';

export class RetentionService {
  async removeExpiredQueueData(): Promise<void> {
    await executeTransaction(async (connection) => {
      await connection.execute(
        `DELETE qe
         FROM \`queue_events\` qe
         JOIN \`tokens\` t ON t.id = qe.token_id
         JOIN \`sessions\` s ON s.id = t.session_id
         WHERE s.date < CURRENT_DATE()`
      );

      await connection.execute(
        `DELETE FROM \`sessions\`
         WHERE date < CURRENT_DATE()`
      );

      await connection.execute(
        `DELETE p
         FROM \`patients\` p
         LEFT JOIN \`tokens\` t ON t.patient_id = p.id
         LEFT JOIN \`appointments\` a ON a.tracking_id = p.tracking_id
         WHERE p.created_at < CURRENT_DATE()
           AND t.id IS NULL
           AND a.id IS NULL`
      );
    });
  }
}

export const retentionService = new RetentionService();
