import { describe, expect, test } from 'bun:test';
import { createCliShell, requireValue } from '../src/core/cli_shell.js';
import { AppError, ERROR_CODE, EXIT_CODE } from '../src/core/errors.js';

function captureStream() {
  let value = '';
  return { write: (part) => { value += part; }, read: () => value };
}

describe('CLI shell', () => {
  test('requires a non-option argument value', () => {
    expect(requireValue(['--profile', 'work'], 0, '--profile')).toBe('work');
    expect(() => requireValue(['--profile'], 0, '--profile')).toThrow(
      expect.objectContaining({ code: ERROR_CODE.INPUT_INVALID })
    );
  });

  test('prints help and version with a newline', () => {
    const stdout = captureStream();
    const shell = createCliShell({ appName: 'sample', version: '1.2.3', usage: ['sample run'], stdout });

    shell.printHelp();
    shell.printVersion();

    expect(stdout.read()).toBe('sample v1.2.3\n\nUsage:\n  sample run\n1.2.3\n');
  });

  test('maps command errors and formats message and hint on stderr', async () => {
    const stderr = captureStream();
    const shell = createCliShell({ appName: 'sample', version: '1.0.0', stderr });

    await expect(shell.runWithErrorHandling(() => {
      throw new AppError(ERROR_CODE.CONFIG_INVALID, 'Bad settings', { hint: 'Fix the file.' });
    })).resolves.toBe(EXIT_CODE.CONFIG);
    expect(stderr.read()).toBe('CONFIG_INVALID: Bad settings\nHint: Fix the file.\n');
  });
});
