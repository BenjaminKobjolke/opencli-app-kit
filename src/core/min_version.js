// Reads an optional app-specific minimum version and reports when an executable needs updating.

import { readdirSync, readFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { appEnvPrefix } from './app_env.js';

const MIN_VERSION_FILE_NAME = 'min_exe_version.txt';
const PLUGIN_ROOT_ENV_VAR = 'CLAUDE_PLUGIN_ROOT';
const CONFIG_DIR_ENV_VAR = 'CLAUDE_CONFIG_DIR';
const SEMVER_PATTERN = /^\d+\.\d+\.\d+$/;

export function compareSemver(leftVersion, rightVersion) {
  const left = leftVersion.split('.').map(Number);
  const right = rightVersion.split('.').map(Number);
  for (let index = 0; index < 3; index += 1) {
    if (left[index] !== right[index]) return left[index] < right[index] ? -1 : 1;
  }
  return 0;
}

function readVersionFile(filePath) {
  try {
    const content = readFileSync(filePath, 'utf8').trim();
    return SEMVER_PATTERN.test(content) ? content : null;
  } catch {
    return null;
  }
}

function readSkillMinVersion(baseDir, appName) {
  return readVersionFile(join(baseDir, 'skills', appName, MIN_VERSION_FILE_NAME));
}

function scanPluginCache(appName) {
  const configDir = process.env[CONFIG_DIR_ENV_VAR] || join(homedir(), '.claude');
  const cacheDir = join(configDir, 'plugins', 'cache', appName, appName);

  let entries;
  try {
    entries = readdirSync(cacheDir);
  } catch {
    return null;
  }

  let highest = null;
  for (const entry of entries) {
    const version = readSkillMinVersion(join(cacheDir, entry), appName);
    if (version && (!highest || compareSemver(version, highest) > 0)) highest = version;
  }
  return highest;
}

function findRequiredMinVersion(appName) {
  const overrideFile = process.env[`${appEnvPrefix(appName)}_MIN_VERSION_FILE`];
  if (overrideFile) return readVersionFile(overrideFile);

  const pluginRoot = process.env[PLUGIN_ROOT_ENV_VAR];
  if (pluginRoot) {
    const version = readSkillMinVersion(pluginRoot, appName);
    if (version) return version;
  }

  return scanPluginCache(appName);
}

export function checkMinVersion(currentVersion, appName, { downloadUrl = '' } = {}) {
  if (!SEMVER_PATTERN.test(currentVersion)) return null;
  const minVersion = findRequiredMinVersion(appName);
  if (!minVersion || compareSemver(currentVersion, minVersion) >= 0) return null;

  const update = downloadUrl ? `Update it from ${downloadUrl}.` : 'Update the executable before retrying.';
  return `UPDATE_REQUIRED: ${appName}.exe ${currentVersion} is older than required ${minVersion}\n${update}`;
}

export const __test__ = { findRequiredMinVersion };
