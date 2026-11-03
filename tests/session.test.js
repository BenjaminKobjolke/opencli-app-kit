import { afterEach, describe, expect, test } from 'bun:test';
import {
  __resetSessionDepsForTest,
  __setSessionDepsForTest,
  withSitePage
} from '../src/core/session.js';

afterEach(__resetSessionDepsForTest);

describe('withSitePage', () => {
  test('connects with session options, calls the callback, and closes the bridge', async () => {
    const calls = [];
    const bridge = { close: async () => calls.push('close') };
    const page = { url: 'https://example.invalid' };
    __setSessionDepsForTest({
      loadBrowserBridge: async () => ({ BrowserBridge: class {} }),
      connectBridge: async (_bridge, options) => {
        calls.push(options);
        return page;
      },
      createBridge: () => bridge
    });

    await expect(withSitePage({
      appName: 'sample-app',
      session: 'site:sample',
      timeout: 25,
      preferredContextId: 'profile-a'
    }, async (connectedPage) => {
      calls.push(connectedPage);
      return 'done';
    })).resolves.toBe('done');

    expect(calls).toEqual([
      { appName: 'sample-app', timeout: 25, session: 'site:sample', preferredContextId: 'profile-a' },
      page,
      'close'
    ]);
  });

  test('closes the bridge when the callback rejects', async () => {
    let closed = false;
    __setSessionDepsForTest({
      loadBrowserBridge: async () => ({ BrowserBridge: class {} }),
      connectBridge: async () => ({ evaluate: async () => null }),
      createBridge: () => ({ close: async () => { closed = true; } })
    });

    await expect(withSitePage({ appName: 'sample-app', session: 'site:sample' }, async () => {
      throw new Error('page operation failed');
    })).rejects.toThrow('page operation failed');
    expect(closed).toBe(true);
  });
});
