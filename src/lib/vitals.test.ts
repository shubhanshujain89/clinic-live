import test from 'node:test';
import assert from 'node:assert/strict';
import { formatOxygenSaturation } from './vitals';
import { formatDoctorName } from './doctorName';

test('oxygen saturation is normalized and displayed as a percentage', () => {
  assert.equal(formatOxygenSaturation('98'), '98%');
  assert.equal(formatOxygenSaturation('98 %'), '98%');
  assert.equal(formatOxygenSaturation('96.5%'), '96.5%');
  assert.equal(formatOxygenSaturation(''), undefined);
});

test('doctor names are normalized with a Dr. prefix without duplication', () => {
  assert.equal(formatDoctorName('Ananya Verma'), 'Dr. Ananya Verma');
  assert.equal(formatDoctorName('Dr. Ananya Verma'), 'Dr. Ananya Verma');
  assert.equal(formatDoctorName('Doctor Ananya Verma'), 'Dr. Ananya Verma');
  assert.equal(formatDoctorName(''), 'Doctor');
});
