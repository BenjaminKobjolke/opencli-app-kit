import { afterEach, describe, expect, test } from 'bun:test';
import {
  bindOriginalStdio,
  captureStderr,
  captureStdout,
  fakeReadPage,
  restoreStdio
} from '../src/testing/test_helpers.js';

describe('test helpers', () => {
  test('creates a fake read page with a closable bridge', async () => {
    const { bridge, page } = fakeReadPage({ title: 'example' }, { id: 'page-1' });

    expect(await page.evaluate('script')).toEqual({ title: 'example' });
    expect(page.id).toBe('page-1');
    await expect(bridge.close()).resolves.toBeUndefined();
  });

  test('captures and restores stdout and stderr', () => {
    const originals = bindOriginalStdio();
    const stdout = captureStdout();
    const stderr = captureStderr();
    try {
      process.stdout.write('out');
      process.stderr.write('err');
      expect(stdout).toEqual(['out']);
      expect(stderr).toEqual(['err']);
    } finally {
      restoreStdio(originals);
    }
  });
});
