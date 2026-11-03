import { spawn as nodeSpawn } from 'node:child_process';
import { existsSync as nodeExistsSync, mkdirSync as nodeMkdirSync } from 'node:fs';
import { createInterface } from 'node:readline/promises';
import { AppError, ERROR_CODE, EXIT_CODE } from '../core/errors.js';
import { IS_COMPILED, loadBrowserBridge, resolveOpenCliPaths } from '../core/opencli.js';
import { createSettings } from '../core/settings.js';

let existsSync = nodeExistsSync;
let mkdirSync = nodeMkdirSync;
let spawn = nodeSpawn;
let loadBridge = loadBrowserBridge;
let resolvePaths = resolveOpenCliPaths;
let stdout = process.stdout;

export function __setChromeDepsForTest(deps) {
  existsSync = deps.existsSync ?? existsSync;
  mkdirSync = deps.mkdirSync ?? mkdirSync;
  spawn = deps.spawn ?? spawn;
  loadBridge = deps.loadBrowserBridge ?? loadBridge;
  resolvePaths = deps.resolveOpenCliPaths ?? resolvePaths;
  stdout = deps.stdout ?? stdout;
}

export function __resetChromeDepsForTest() {
  existsSync = nodeExistsSync;
  mkdirSync = nodeMkdirSync;
  spawn = nodeSpawn;
  loadBridge = loadBrowserBridge;
  resolvePaths = resolveOpenCliPaths;
  stdout = process.stdout;
}

function writeStdout(message) {
  stdout.write(`${message}\n`);
}

export function runSetChrome({ appName, executable, profileDir }) {
  const settings = createSettings(appName);
  if (executable && !existsSync(executable)) {
    throw new AppError(ERROR_CODE.INPUT_INVALID, `Chrome executable not found: ${executable}`);
  }

  const chrome = { ...(settings.loadSettings().chrome ?? {}) };
  if (executable) chrome.executable = executable;
  if (profileDir) chrome.profileDir = profileDir;
  settings.saveSettings({ chrome });

  const resolved = settings.resolveChrome();
  writeStdout([
    `Saved ${settings.settingsPath()}`,
    `Chrome executable: ${resolved.executable}`,
    `Profile dir: ${resolved.profileDir}`
  ].join('\n'));
  return EXIT_CODE.SUCCESS;
}

export function runLaunch({ appName, startUrl }) {
  const settings = createSettings(appName);
  const { executable, profileDir } = settings.resolveChrome();

  if (!existsSync(executable)) {
    throw new AppError(ERROR_CODE.CONFIG_INVALID, `Chrome executable not found: ${executable}`, {
      hint: `Set it with: ${appName} set-chrome <path-to-chrome.exe>`
    });
  }

  mkdirSync(profileDir, { recursive: true });
  const args = [`--user-data-dir=${profileDir}`];
  const { extensionPath } = resolvePaths(appName);
  if (existsSync(extensionPath)) {
    args.push(`--load-extension=${extensionPath}`);
  } else if (!IS_COMPILED) {
    writeStdout('Note: opencli extension dir not found on disk; install the OpenCLI extension in Chrome manually.');
  }
  // Apps whose commands open their own bridge tab omit startUrl, so the site is not opened twice.
  if (startUrl) args.push(startUrl);

  spawn(executable, args, { detached: true, stdio: 'ignore' }).unref();
  const loginStep = startUrl ? `log into ${new URL(startUrl).origin} in that window if asked, then ` : '';
  writeStdout(
    `Launched ${executable} with profile ${profileDir}\n` +
    `Next: ${loginStep}run \`${appName} setup\` to check the Browser Bridge connection and extension.`
  );
  return EXIT_CODE.SUCCESS;
}

function saveBridgeProfile(settings, contextId) {
  const chrome = { ...(settings.loadSettings().chrome ?? {}) };
  if (contextId) chrome.bridgeProfile = contextId;
  else delete chrome.bridgeProfile;
  settings.saveSettings({ chrome });
}

export async function runSwitchSession({ appName, pick } = {}) {
  const settings = createSettings(appName);
  if (pick === 'none') {
    saveBridgeProfile(settings, undefined);
    writeStdout('Bridge profile cleared; daemon will auto-pick when only one is connected.');
    return EXIT_CODE.SUCCESS;
  }

  const { getDaemonHealth } = await loadBridge(appName);
  if (typeof getDaemonHealth !== 'function') {
    throw new AppError(ERROR_CODE.CONFIG_INVALID, 'This opencli build does not export getDaemonHealth.', {
      hint: 'Update the opencli checkout and rebuild.'
    });
  }

  const health = await getDaemonHealth();
  if (health.state === 'stopped' || !health.status) {
    throw new AppError(ERROR_CODE.CONFIG_INVALID, 'Bridge daemon is not running.', {
      hint: `Start Chrome with: ${appName} launch (then retry).`
    });
  }

  const profiles = Array.isArray(health.status.profiles) ? health.status.profiles : [];
  if (!profiles.length) {
    throw new AppError(ERROR_CODE.CONFIG_INVALID, 'No Browser Bridge profiles connected.', {
      hint: `Open a Chrome profile with the OpenCLI extension enabled, e.g. via ${appName} launch.`
    });
  }

  const current = settings.resolveBridgeProfile();
  const lines = profiles.map((profile, index) => {
    const version = profile.extensionVersion ? ` v${profile.extensionVersion}` : '';
    const mark = profile.contextId === current ? ' (current)' : '';
    return `  [${index + 1}] ${profile.contextId}${version}${mark}`;
  });
  writeStdout(`Connected Browser Bridge profiles:\n${lines.join('\n')}`);

  let chosen;
  if (pick) {
    const byNumber = Number(pick);
    if (Number.isInteger(byNumber) && byNumber >= 1 && byNumber <= profiles.length) {
      chosen = profiles[byNumber - 1].contextId;
    } else if (profiles.some((profile) => profile.contextId === pick)) {
      chosen = pick;
    } else {
      throw new AppError(ERROR_CODE.INPUT_INVALID, `No such profile: ${pick}`, {
        hint: `Use a number 1-${profiles.length}, a listed contextId, or "none".`
      });
    }
  } else if (profiles.length === 1) {
    chosen = profiles[0].contextId;
    writeStdout('Only one profile connected; selecting it.');
  } else {
    const readline = createInterface({ input: process.stdin, output: process.stdout });
    try {
      const answer = (await readline.question(`Select profile [1-${profiles.length}]: `)).trim();
      const index = Number(answer);
      if (!Number.isInteger(index) || index < 1 || index > profiles.length) {
        throw new AppError(ERROR_CODE.INPUT_INVALID, `Invalid selection: ${answer}`);
      }
      chosen = profiles[index - 1].contextId;
    } finally {
      readline.close();
    }
  }

  saveBridgeProfile(settings, chosen);
  writeStdout(`Saved bridge profile "${chosen}" to ${settings.settingsPath()}`);
  return EXIT_CODE.SUCCESS;
}
