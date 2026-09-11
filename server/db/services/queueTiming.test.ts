import test from 'node:test';
import assert from 'node:assert/strict';

import {
  calculateConsultationDurationSeconds,
  calculateAverageConsultationMinutes,
  estimateQueueWaitMinutes,
  adjustWaitForClinicSchedule,
  shouldAutoMarkDoctorOut,
} from './queueService.js';

test('queue consultation lifecycle yields a sensible duration and ETA update', () => {
  const calledAt = new Date(Date.now() - 8 * 60 * 1000);
  const completedAt = new Date(Date.now() - 2 * 60 * 1000);

  const durationSeconds = calculateConsultationDurationSeconds(calledAt, completedAt);
  assert.ok(durationSeconds > 0, 'duration should be positive');
  assert.ok(durationSeconds < 60 * 60, 'duration should remain sensible for a single consultation');

  const averageMinutes = calculateAverageConsultationMinutes([
    7 * 60,
    9 * 60,
    8 * 60,
    10 * 60,
  ]);
  assert.equal(averageMinutes, 8.5);

  const eta = estimateQueueWaitMinutes({
    patientsAhead: 3,
    activeTokenElapsedMinutes: 4,
    averageConsultationMinutes: averageMinutes,
    delayMinutes: 2,
    status: 'CALLED',
  });
  assert.ok(eta > 0, 'ETA should update as the queue advances');
  assert.ok(eta > 20, 'ETA should stay above the current consultation window when patients are ahead');

  const shorterEta = estimateQueueWaitMinutes({
    patientsAhead: 1,
    activeTokenElapsedMinutes: 4,
    averageConsultationMinutes: averageMinutes,
    delayMinutes: 2,
    status: 'CALLED',
  });
  assert.ok(shorterEta < eta, 'ETA should reduce when fewer patients remain ahead');

  const completedEta = estimateQueueWaitMinutes({
    patientsAhead: 0,
    activeTokenElapsedMinutes: 0,
    averageConsultationMinutes: averageMinutes,
    delayMinutes: 0,
    status: 'COMPLETED',
  });

  assert.equal(completedEta, 0);
});

test('queue wait includes time until clinic opens when the clinic is not yet open', () => {
  const beforeOpening = adjustWaitForClinicSchedule({
    queueWaitMinutes: 12,
    operatingHours: '9:00 AM - 6:00 PM',
    now: new Date('2025-01-01T08:30:00+05:30'),
  });

  assert.equal(beforeOpening, 42);

  const duringOpeningHours = adjustWaitForClinicSchedule({
    queueWaitMinutes: 12,
    operatingHours: '9:00 AM - 6:00 PM',
    now: new Date('2025-01-01T10:30:00+05:30'),
  });

  assert.equal(duringOpeningHours, 12);
});

test('doctor auto-outs when the clinic is past closing time and the queue is empty', () => {
  assert.equal(
    shouldAutoMarkDoctorOut({
      operatingHours: '9:00 AM - 6:00 PM',
      hasQueuePatients: false,
      now: new Date('2025-01-01T18:05:00+05:30'),
    }),
    true
  );

  assert.equal(
    shouldAutoMarkDoctorOut({
      operatingHours: '9:00 AM - 6:00 PM',
      hasQueuePatients: true,
      now: new Date('2025-01-01T18:05:00+05:30'),
    }),
    false
  );
});
