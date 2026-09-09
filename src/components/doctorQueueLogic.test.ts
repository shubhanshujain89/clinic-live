import test from 'node:test';
import assert from 'node:assert/strict';

import { getDoctorQueueAction } from './doctorQueueLogic.js';
import { makeDoctorBookingQrCodeUrl, extractBookingTokenNumber } from '../lib/doctorQr.js';

test('doctor queue action is CALL_NEXT when no consultation is active but a patient is waiting', () => {
  const action = getDoctorQueueAction({
    activeToken: null,
    nextToken: { id: 'tok_2', tokenNumber: 'T-2', patientName: 'Rahul' },
  } as any);

  assert.equal(action, 'CALL_NEXT');
});

test('doctor queue action is COMPLETE_AND_CALL_NEXT when a consultation is active and a next patient exists', () => {
  const action = getDoctorQueueAction({
    activeToken: { id: 'tok_1', tokenNumber: 'T-1', patientName: 'Asha' },
    nextToken: { id: 'tok_2', tokenNumber: 'T-2', patientName: 'Rahul' },
  } as any);

  assert.equal(action, 'COMPLETE_AND_CALL_NEXT');
});

test('doctor queue action is COMPLETE_ONLY when no next patient is waiting', () => {
  const action = getDoctorQueueAction({
    activeToken: { id: 'tok_1', tokenNumber: 'T-1', patientName: 'Asha' },
    nextToken: null,
  } as any);

  assert.equal(action, 'COMPLETE_ONLY');
});

test('doctor QR booking URLs stay clinic-specific and doctor-specific', () => {
  const qr = makeDoctorBookingQrCodeUrl('clinic-001', 'doctor-42', 'https://example.com');
  assert.equal(qr.startsWith('https://chart.googleapis.com/chart?'), true);
  assert.match(qr, /clinic-001/);
  assert.match(qr, /doctor-42/);
  assert.match(qr, /booking%3FclinicId%3Dclinic-001%26doctorId%3Ddoctor-42/);
});

test('patient booking payloads surface the generated token number for the confirmation screen', () => {
  assert.equal(extractBookingTokenNumber({ tokenNumber: 'A-001' }), 'A-001');
  assert.equal(extractBookingTokenNumber({}), '');
});
