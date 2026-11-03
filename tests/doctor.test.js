import { describe, expect, test } from 'bun:test';
import { createDoctorChecks } from '../src/commands/doctor_checks.js';
import { __resetDoctorDepsForTest, __setDoctorDepsForTest, runDoctor } from '../src/commands/doctor.js';
import { EXIT_CODE } from '../src/core/errors.js';

describe('doctor diagnostics', () => {
  test('checks Bun and the resolved OpenCLI paths', () => {
    const checks = createDoctorChecks({
      appName: 'sample-app',
      runProcess: () => ({ status: 0, stdout: '1.2.3\n' }),
      pathExists: (path) => path !== 'extension',
      getPaths: () => ({ root: 'root', mainPath: 'main', browserIndexPath: 'browser', extensionPath: 'extension' })
    });

    expect(checks.sourceChecks()).toEqual([
      { ok: true, message: 'Bun available (1.2.3)', steps: [] },
      { ok: true, message: 'opencli root resolved: root', steps: [] },
      { ok: true, message: 'opencli built entry: main', steps: [] },
      { ok: true, message: 'opencli browser bridge module: browser', steps: [] },
      { ok: false, message: 'Browser Bridge extension dir: extension', steps: ['- Ensure Browser Bridge extension exists at "extension".'] }
    ]);
  });

  test('treats a confirmed stopped daemon as a non-failing bridge check', async () => {
    const checks = createDoctorChecks({
      appName: 'sample-app',
      bridgeStatus: async () => ({ health: { state: 'stopped' } })
    });
    await expect(checks.bridgeCheck()).resolves.toEqual({
      ok: true,
      message: 'Browser Bridge daemon not running yet (it starts with the first ask or read)',
      steps: []
    });
  });

  test('reports failed bridge health lookups with a recovery step', async () => {
    const checks = createDoctorChecks({
      appName: 'sample-app',
      bridgeStatus: async () => { throw new Error('health endpoint unavailable'); }
    });
    await expect(checks.bridgeCheck()).resolves.toEqual({
      ok: false,
      message: 'Browser Bridge health check failed: health endpoint unavailable',
      steps: ['- Check the Browser Bridge daemon and rerun `sample-app doctor`.']
    });
  });

  test('reports a missing bridge health response as a lookup failure', async () => {
    const checks = createDoctorChecks({ appName: 'sample-app', bridgeStatus: async () => null });
    await expect(checks.bridgeCheck()).resolves.toMatchObject({
      ok: false,
      message: 'Browser Bridge health check failed: no health response',
      steps: ['- Check the Browser Bridge daemon and rerun `sample-app doctor`.']
    });
  });

  test('builds doctor invocation flags and reports compiled limitation', () => {
    let call;
    __setDoctorDepsForTest({ isCompiled: false, runOpenCli: (...args) => { call = args; return 12; } });
    expect(runDoctor({ appName: 'sample-app', sessions: true, noLive: true })).toBe(12);
    expect(call).toEqual(['sample-app', ['doctor', '--sessions', '--no-live']]);

    let stderr = '';
    __setDoctorDepsForTest({ isCompiled: true, stderr: { write: (value) => { stderr += value; } } });
    expect(runDoctor({ appName: 'sample-app' })).toBe(EXIT_CODE.CONFIG);
    expect(stderr).toContain('doctor needs an opencli checkout');
    __resetDoctorDepsForTest();
  });
});
