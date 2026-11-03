import { expect, test } from 'bun:test';
import { pollUntil } from '../src/core/poll.js';

test('pollUntil returns the first successful step', async () => {
  const waits = [];
  const page = { wait: async (seconds) => waits.push(seconds) };
  const result = await pollUntil(page, async (attempt) => ({
    done: attempt === 1,
    value: attempt
  }), { attempts: 3, delaySeconds: 0.25 });

  expect(result).toEqual({ done: true, value: 1 });
  expect(waits).toEqual([0.25]);
});

test('pollUntil returns the final result when attempts are exhausted', async () => {
  const waits = [];
  const page = { wait: async (seconds) => waits.push(seconds) };
  const result = await pollUntil(page, async (attempt) => ({ done: false, value: attempt }), {
    attempts: 2,
    delaySeconds: 0
  });

  expect(result).toEqual({ done: false, value: 1 });
  expect(waits).toEqual([0, 0]);
});
