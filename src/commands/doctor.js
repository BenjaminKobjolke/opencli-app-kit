import { IS_COMPILED, runOpenCli as runOpenCliCommand } from '../core/opencli.js';
import { EXIT_CODE } from '../core/errors.js';

let isCompiled = IS_COMPILED;
let runOpenCli = runOpenCliCommand;
let stderr = process.stderr;

export function __setDoctorDepsForTest(deps) {
  if ('isCompiled' in deps) isCompiled = deps.isCompiled;
  runOpenCli = deps.runOpenCli ?? runOpenCli;
  stderr = deps.stderr ?? stderr;
}

export function __resetDoctorDepsForTest() {
  isCompiled = IS_COMPILED;
  runOpenCli = runOpenCliCommand;
  stderr = process.stderr;
}

export function runDoctor({ appName, sessions = false, noLive = false }) {
  if (isCompiled) {
    stderr.write(
      `doctor needs an opencli checkout and is unavailable in the compiled exe; run \`${appName} setup\` for the bridge status.\n`
    );
    return EXIT_CODE.CONFIG;
  }

  const args = ['doctor'];
  if (sessions) args.push('--sessions');
  if (noLive) args.push('--no-live');
  return runOpenCli(appName, args);
}
