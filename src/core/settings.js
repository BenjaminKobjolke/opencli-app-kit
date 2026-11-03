import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { dirname, join } from 'node:path';
import { AppError, ERROR_CODE } from './errors.js';
import { appEnvPrefix } from './app_env.js';

function defaultChromeExecutable() {
  if (process.platform === 'darwin') {
    return '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
  }
  if (process.platform === 'win32') {
    return 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
  }
  return '/usr/bin/google-chrome';
}

export function createSettings(appName) {
  const appDirectory = join(homedir(), `.${appName}`);
  const path = process.env[`${appEnvPrefix(appName)}_SETTINGS`] || join(appDirectory, 'settings.json');

  function loadSettings() {
    if (!existsSync(path)) return {};

    let contents;
    try {
      contents = readFileSync(path, 'utf8');
    } catch (error) {
      throw new AppError(ERROR_CODE.CONFIG_INVALID, `Cannot read settings: ${path}`, {
        details: error.message
      });
    }

    try {
      const parsed = JSON.parse(contents);
      return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
    } catch {
      throw new AppError(ERROR_CODE.CONFIG_INVALID, `Invalid JSON in settings: ${path}`, {
        hint: 'Fix or delete the file, then rerun the command.'
      });
    }
  }

  function saveSettings(partial) {
    const merged = { ...loadSettings(), ...partial };
    mkdirSync(dirname(path), { recursive: true });
    writeFileSync(path, `${JSON.stringify(merged, null, 2)}\n`, 'utf8');
    return merged;
  }

  function resolveBridgeProfile() {
    return loadSettings().chrome?.bridgeProfile || undefined;
  }

  function resolveChrome() {
    const chrome = loadSettings().chrome ?? {};
    return {
      executable: chrome.executable || defaultChromeExecutable(),
      profileDir: chrome.profileDir || join(appDirectory, 'chrome-profile')
    };
  }

  return Object.freeze({
    settingsPath: () => path,
    loadSettings,
    saveSettings,
    resolveBridgeProfile,
    resolveChrome,
    defaultChromeExecutable
  });
}
