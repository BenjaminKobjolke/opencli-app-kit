import { afterAll, afterEach, describe, expect, test } from 'bun:test';
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { createSettings } from '../src/core/settings.js';
import { ERROR_CODE } from '../src/core/errors.js';

const originalHome = process.env.USERPROFILE;
const fixtureHome = mkdtempSync(join(homedir(), 'opencli-settings-'));
process.env.USERPROFILE = fixtureHome;

afterAll(() => {
  if (originalHome === undefined) delete process.env.USERPROFILE;
  else process.env.USERPROFILE = originalHome;
  rmSync(fixtureHome, { recursive: true, force: true });
});

afterEach(() => {
  rmSync(fixtureHome, { recursive: true, force: true });
  mkdirSync(fixtureHome, { recursive: true });
});

describe('app settings', () => {
  test('merge-writes settings under the app-specific directory', () => {
    const settings = createSettings('sample-app');
    mkdirSync(join(fixtureHome, '.sample-app'), { recursive: true });
    writeFileSync(settings.settingsPath(), JSON.stringify({ existing: true, chrome: { profileDir: 'profile' } }));

    expect(settings.saveSettings({ logLevel: 'debug' })).toEqual({
      existing: true,
      chrome: { profileDir: 'profile' },
      logLevel: 'debug'
    });
    expect(settings.loadSettings()).toEqual(settings.saveSettings({}));
  });

  test('reports malformed settings as CONFIG_INVALID', () => {
    const settings = createSettings('sample-app');
    mkdirSync(join(fixtureHome, '.sample-app'), { recursive: true });
    writeFileSync(settings.settingsPath(), '{');

    expect(() => settings.loadSettings()).toThrow(expect.objectContaining({ code: ERROR_CODE.CONFIG_INVALID }));
  });

  test('reads and writes the file named by <APP>_SETTINGS when it is set', () => {
    const overridePath = join(fixtureHome, 'custom', 'settings.json');
    process.env.SAMPLE_APP_SETTINGS = overridePath;
    try {
      const settings = createSettings('sample-app');
      expect(settings.settingsPath()).toBe(overridePath);
      settings.saveSettings({ logLevel: 'info' });
      expect(createSettings('sample-app').loadSettings()).toEqual({ logLevel: 'info' });
      expect(settings.resolveChrome().profileDir).toBe(join(fixtureHome, '.sample-app', 'chrome-profile'));
    } finally {
      delete process.env.SAMPLE_APP_SETTINGS;
    }
    expect(createSettings('sample-app').settingsPath()).toBe(join(fixtureHome, '.sample-app', 'settings.json'));
  });

  test('resolves Chrome and profile values from app settings', () => {
    const settings = createSettings('sample-app');
    settings.saveSettings({ chrome: { executable: 'chrome', profileDir: 'profile', bridgeProfile: 'context-1' } });

    expect(settings.resolveChrome()).toEqual({ executable: 'chrome', profileDir: 'profile' });
    expect(settings.resolveBridgeProfile()).toBe('context-1');
  });
});

