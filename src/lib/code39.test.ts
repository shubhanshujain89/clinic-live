import test from 'node:test';
import assert from 'node:assert/strict';

import { getCode39Bars, normalizeCode39Value } from './code39.js';

test('barcode values are normalized to scanner-safe Code 39 characters', () => {
  assert.equal(normalizeCode39Value(' nq 001 '), 'NQ-001');
  assert.equal(normalizeCode39Value(''), 'NQ-0001');
});

test('Code 39 output contains bars and start/stop quiet separators', () => {
  const bars = getCode39Bars('NQ-0001');
  assert.ok(bars.length > 40);
  assert.equal(bars[0], true);
  assert.equal(bars[bars.length - 1], true);
});
