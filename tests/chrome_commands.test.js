import { afterAll, afterEach, describe, expect, test } from 'bun:test';
import { mkdtempSync, rmSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { __resetChromeDepsForTest, __setChromeDepsForTest, runLaunch, runSetChrome } from '../src/commands/chrome.js';

const originalHome = process.env.USERPROFILE;
const fixtureHome = mkdtempSync(join(homedir(), 'opencli-chrome-'));
process.env.USERPROFILE = fixtureHome;

afterAll(() => {
  if (originalHome === undefined) delete process.env.USERPROFILE;
  else process.env.USERPROFILE = originalHome;
  rmSync(fixtureHome, { recursive: true, force: true });
});

afterEach(() => {
  __resetChromeDepsForTest();
  rmSync(join(fixtureHome, '.sample-app'), { recursive: true, force: true });
});

describe('Chrome commands', () => {
  test('saves app-specific Chrome settings and reports resolved values', () => {
    let output = '';
    __setChromeDepsForTest({ existsSync: () => true, stdout: { write: (value) => { output += value; } } });

    expect(runSetChrome({ appName: 'sample-app', executable: 'chrome.exe', profileDir: 'profile' })).toBe(0);
    expect(output).toContain('Chrome executable: chrome.exe');
    expect(output).toContain('Profile dir: profile');
  });

  test('launches Chrome with the app profile, extension, and start URL', () => {
    const spawned = [];
    __setChromeDepsForTest({
      existsSync: () => true,
      mkdirSync: () => {},
      spawn: (...args) => { spawned.push(args); return { unref() {} }; },
      resolveOpenCliPaths: () => ({ extensionPath: 'extension' }),
      stdout: { write() {} }
    });

    expect(runLaunch({ appName: 'sample-app', startUrl: 'https://example.test/' })).toBe(0);
    expect(spawned[0][0]).toBe('C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe');
    expect(spawned[0][1]).toContain('--load-extension=extension');
    expect(spawned[0][1]).toContain('https://example.test/');
  });

  test('launches Chrome without a page when no start URL is given', () => {
    const spawned = [];
    __setChromeDepsForTest({
      existsSync: () => true,
      mkdirSync: () => {},
      spawn: (...args) => { spawned.push(args); return { unref() {} }; },
      resolveOpenCliPaths: () => ({ extensionPath: 'extension' }),
      stdout: { write() {} }
    });

    expect(runLaunch({ appName: 'sample-app' })).toBe(0);
    expect(spawned[0][1]).toEqual([expect.stringMatching(/^--user-data-dir=/), '--load-extension=extension']);
  });
});
