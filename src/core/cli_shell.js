import { AppError, ERROR_CODE, EXIT_CODE, exitCodeForError, toAppError } from './errors.js';

export function requireValue(args, index, flag) {
  const value = args[index + 1];
  if (!value || value.startsWith('-')) {
    throw new AppError(ERROR_CODE.INPUT_INVALID, `Missing value for ${flag}`, {
      hint: `Provide a value after ${flag}.`
    });
  }
  return value;
}

export function writeStdout(message, stdout = process.stdout) {
  stdout.write(`${message}\n`);
}

export function writeStderr(message, stderr = process.stderr) {
  stderr.write(`${message}\n`);
}

export function createCliShell({
  appName,
  version,
  description = '',
  usage = [],
  notes = [],
  stdout = process.stdout,
  stderr = process.stderr
}) {
  function printHelp() {
    const lines = [`${appName} v${version}`];
    if (description) lines.push('', description);
    lines.push('', 'Usage:', ...usage.map((line) => `  ${line}`));
    if (notes.length) lines.push('', 'Notes:', ...notes.map((line) => `  ${line}`));
    writeStdout(lines.join('\n'), stdout);
  }

  function printVersion() {
    writeStdout(version, stdout);
  }

  async function runWithErrorHandling(run) {
    try {
      return await run();
    } catch (error) {
      const appError = toAppError(error);
      writeStderr(`${appError.code}: ${appError.message}`, stderr);
      if (appError.hint) writeStderr(`Hint: ${appError.hint}`, stderr);
      return exitCodeForError(appError);
    }
  }

  return Object.freeze({ printHelp, printVersion, runWithErrorHandling });
}

export { EXIT_CODE };
