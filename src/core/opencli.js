import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { AppError, ERROR_CODE } from './errors.js';

const MODULE_DIRECTORY = dirname(fileURLToPath(import.meta.url));
const DEFAULT_OPENCLI_SEGMENTS = ['.omx', 'reference', 'opencli'];

export const IS_COMPILED = typeof Bun !== 'undefined'
  && (Bun.main.includes('~BUN') || Bun.main.includes('$bunfs'));

let execRunner = (command, args, options) => spawnSync(command, args, options);

function appEnvPrefix(appName) {
  return appName.toUpperCase().replace(/[^A-Z0-9]+/g, '_');
}

export function openCliEnvNames(appName) {
  const prefix = appEnvPrefix(appName);
  return Object.freeze({ root: `${prefix}_OPENCLI_ROOT`, main: `${prefix}_OPENCLI_MAIN` });
}

export function resolveOpenCliPaths(appName) {
  const envNames = openCliEnvNames(appName);
  const root = process.env[envNames.root]
    || resolve(MODULE_DIRECTORY, '..', '..', ...DEFAULT_OPENCLI_SEGMENTS);
  const mainPath = process.env[envNames.main] || resolve(root, 'dist', 'src', 'main.js');
  return {
    root,
    mainPath,
    extensionPath: resolve(root, 'extension'),
    browserIndexPath: resolve(root, 'dist', 'src', 'browser', 'index.js')
  };
}

function ensureOpenCliReady(appName) {
  const paths = resolveOpenCliPaths(appName);
  const { root, mainPath, browserIndexPath } = paths;

  if (existsSync(mainPath) && existsSync(browserIndexPath)) return paths;

  const envNames = openCliEnvNames(appName);
  if (!existsSync(root)) {
    throw new AppError(ERROR_CODE.CONFIG_INVALID, `opencli reference repo not found: ${root}`, {
      hint: `Set ${envNames.root} or place opencli under .omx/reference/opencli.`
    });
  }

  const install = execRunner(process.execPath, ['install'], {
    cwd: root,
    stdio: 'inherit',
    env: { ...process.env }
  });

  if (install.error) {
    throw new AppError(ERROR_CODE.CONFIG_INVALID, 'Failed to bootstrap opencli.', {
      hint: 'Run bun install inside your opencli checkout.',
      details: install.error.message
    });
  }

  if (install.status !== 0 || !existsSync(mainPath) || !existsSync(browserIndexPath)) {
    throw new AppError(
      ERROR_CODE.CONFIG_INVALID,
      'opencli bootstrap did not produce a runnable browser bridge.',
      { hint: 'Check opencli/dist/src/main.js and opencli/dist/src/browser/index.js.' }
    );
  }

  return paths;
}

export function __setExecRunnerForTest(runner) {
  execRunner = runner;
}

export function __resetExecRunnerForTest() {
  execRunner = (command, args, options) => spawnSync(command, args, options);
}

export function runOpenCli(appName, args) {
  const { mainPath } = ensureOpenCliReady(appName);
  const result = execRunner(process.execPath, [mainPath, ...args], {
    stdio: 'inherit',
    env: { ...process.env }
  });

  if (result.error) {
    throw new AppError(ERROR_CODE.UNKNOWN, `Failed to execute opencli: ${result.error.message}`);
  }
  return result.status ?? 1;
}

export function captureOpenCli(appName, args) {
  const { mainPath } = ensureOpenCliReady(appName);
  const result = execRunner(process.execPath, [mainPath, ...args], {
    stdio: 'pipe',
    encoding: 'utf8',
    env: { ...process.env }
  });

  if (result.error) {
    throw new AppError(ERROR_CODE.UNKNOWN, `Failed to execute opencli: ${result.error.message}`);
  }
  return {
    status: result.status ?? 1,
    stdout: typeof result.stdout === 'string' ? result.stdout : '',
    stderr: typeof result.stderr === 'string' ? result.stderr : ''
  };
}

export async function loadBrowserBridge(appName) {
  let bridgeModule;
  if (IS_COMPILED) {
    bridgeModule = await import('../../.omx/reference/opencli/dist/src/browser/index.js');
  } else {
    const { browserIndexPath } = ensureOpenCliReady(appName);
    bridgeModule = await import(pathToFileURL(browserIndexPath).href);
  }

  if (typeof bridgeModule.BrowserBridge !== 'function') {
    throw new AppError(ERROR_CODE.CONFIG_INVALID, 'opencli BrowserBridge export is missing.', {
      hint: 'Check opencli/dist/src/browser/index.js.'
    });
  }
  return {
    BrowserBridge: bridgeModule.BrowserBridge,
    getDaemonHealth: bridgeModule.getDaemonHealth
  };
}

export async function connectBridge(bridge, { appName, ...options }) {
  try {
    return await bridge.connect(options);
  } catch (error) {
    if (String(error?.message).includes('Multiple Browser Bridge profiles')) {
      throw new AppError(ERROR_CODE.CONFIG_INVALID, error.message, {
        hint: `Run: ${appName} switch-session`
      });
    }
    throw error;
  }
}

export const __test__ = { ensureOpenCliReady };
