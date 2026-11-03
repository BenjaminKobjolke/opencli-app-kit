import { expect, test } from 'bun:test';
import { jsonResult } from '../src/core/output.js';

test('jsonResult returns a formatted success envelope', () => {
  expect(jsonResult({ value: 3 })).toBe(`{
  "ok": true,
  "value": 3
}`);
});

