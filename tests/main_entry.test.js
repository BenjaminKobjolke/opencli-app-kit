import { afterEach, expect, test } from 'bun:test';
import {
  __resetMainEntryExitForTest,
  __setMainEntryExitForTest,
  runMain
} from '../src/core/main_entry.js';

afterEach(__resetMainEntryExitForTest);

test('runMain passes command arguments to the app CLI and exits with its code', async () => {
  const originalArgv = process.argv;
  let capturedArgs;
  let capturedExitCode;
  process.argv = ['bun', 'sample.js', 'status', '--json'];
  __setMainEntryExitForTest((exitCode) => { capturedExitCode = exitCode; });
  try {
    await runMain(async (args) => {
      capturedArgs = args;
      return 7;
    });
    expect(capturedArgs).toEqual(['status', '--json']);
    expect(capturedExitCode).toBe(7);
  } finally {
    process.argv = originalArgv;
  }
});
