import test from 'node:test';
import assert from 'node:assert/strict';

import { getDoctorQueueAction } from './doctorQueueLogic.js';

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
