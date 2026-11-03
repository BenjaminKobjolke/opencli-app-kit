const DAEMON_ARGUMENT_MARKER = '~BUN';
const DAEMON_MODULE_SUFFIX = 'daemon.js';
let exitProcess = (exitCode) => process.exit(exitCode);

export function __setMainEntryExitForTest(exitFunction) {
  exitProcess = exitFunction;
}

export function __resetMainEntryExitForTest() {
  exitProcess = (exitCode) => process.exit(exitCode);
}

export async function runMain(runCli) {
  const firstArgument = process.argv[2];
  if (firstArgument?.includes(DAEMON_ARGUMENT_MARKER)
    && firstArgument.endsWith(DAEMON_MODULE_SUFFIX)) {
    await import('../../.omx/reference/opencli/dist/src/daemon.js');
    return undefined;
  }

  exitProcess(await runCli(process.argv.slice(2)));
}
