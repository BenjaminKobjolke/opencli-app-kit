import { afterEach, describe, expect, test } from 'bun:test';
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  __resetExecRunnerForTest,
  __setExecRunnerForTest,
  captureOpenCli,
  resolveOpenCliPaths
} from '../src/core/opencli.js';
import { ERROR_CODE } from '../src/core/errors.js';

const APP_NAME = 'test-client';
const ENV_ROOT = 'TEST_CLIENT_OPENCLI_ROOT';
const ENV_MAIN = 'TEST_CLIENT_OPENCLI_MAIN';

function withOpenCliFixture(callback) {
  const root = mkdtempSync(join(tmpdir(), 'opencli-app-kit-'));
  const mainPath = join(root, 'custom-main.js');
  const browserPath = join(root, 'dist', 'src', 'browser', 'index.js');
  mkdirSync(join(root, 'dist', 'src', 'browser'), { recursive: true });
  writeFileSync(mainPath, '');
  writeFileSync(browserPath, '');
  return callback({ root, mainPath, browserPath });
}

afterEach(() => {
  delete process.env[ENV_ROOT];
  delete process.env[ENV_MAIN];
  __resetExecRunnerForTest();
});

describe('OpenCLI runtime', () => {
  test('resolves app-specific root and main path overrides', () => {
    withOpenCliFixture(({ root, mainPath }) => {
      process.env[ENV_ROOT] = root;
      process.env[ENV_MAIN] = mainPath;

      expect(resolveOpenCliPaths(APP_NAME)).toEqual({
        root,
        mainPath,
        extensionPath: join(root, 'extension'),
        browserIndexPath: join(root, 'dist', 'src', 'browser', 'index.js')
      });
      rmSync(root, { recursive: true, force: true });
    });
  });

  test('captures OpenCLI output through the injectable process runner', () => {
    withOpenCliFixture(({ root, mainPath, browserPath }) => {
      process.env[ENV_ROOT] = root;
      process.env[ENV_MAIN] = mainPath;
      mkdirSync(join(root, 'dist', 'src', 'browser'), { recursive: true });
      const calls = [];
      __setExecRunnerForTest((command, args, options) => {
        calls.push({ command, args, options });
        return { status: 0, stdout: 'ready', stderr: '' };
      });

      expect(captureOpenCli(APP_NAME, ['status'])).toEqual({ status: 0, stdout: 'ready', stderr: '' });
      expect(calls).toHaveLength(1);
      expect(calls[0].args).toEqual([mainPath, 'status']);
      expect(calls[0].options.stdio).toBe('pipe');
      expect(browserPath).toContain(join('dist', 'src', 'browser', 'index.js'));
      rmSync(root, { recursive: true, force: true });
    });
  });

  test('turns a multi-profile connection error into an app-specific hint', async () => {
    const { connectBridge } = await import('../src/core/opencli.js');
    const bridge = {
      connect: async () => { throw new Error('Multiple Browser Bridge profiles are available.'); }
    };

    await expect(connectBridge(bridge, { appName: APP_NAME, session: 'site:sample' }))
      .rejects.toMatchObject({
        code: ERROR_CODE.CONFIG_INVALID,
        hint: `Run: ${APP_NAME} switch-session`
      });
  });
});
