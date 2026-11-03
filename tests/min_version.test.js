import { afterEach, describe, expect, test } from 'bun:test';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { checkMinVersion, compareSemver } from '../src/core/min_version.js';

const ENV_FILE = 'TEST_APP_MIN_VERSION_FILE';

afterEach(() => {
  delete process.env[ENV_FILE];
});

describe('minimum version check', () => {
  test('compares semantic versions numerically', () => {
    expect(compareSemver('1.10.0', '1.9.9')).toBe(1);
    expect(compareSemver('1.2.0', '1.2.0')).toBe(0);
    expect(compareSemver('1.2.0', '1.2.1')).toBe(-1);
  });

  test('returns an update notice only when current version is too old', () => {
    const directory = mkdtempSync(join(tmpdir(), 'opencli-min-version-'));
    const file = join(directory, 'minimum.txt');
    writeFileSync(file, '2.0.0\n');
    process.env[ENV_FILE] = file;

    expect(checkMinVersion('1.9.0', 'test-app')).toContain('1.9.0 is older than required 2.0.0');
    expect(checkMinVersion('2.0.0', 'test-app')).toBeNull();
    rmSync(directory, { recursive: true, force: true });
  });
});
