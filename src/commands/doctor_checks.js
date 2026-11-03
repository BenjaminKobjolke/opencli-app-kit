import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { IS_COMPILED, loadBrowserBridge, openCliEnvNames, resolveOpenCliPaths } from '../core/opencli.js';
import { createSettings } from '../core/settings.js';

const BRIDGE_STATE = Object.freeze({ STOPPED: 'stopped', PROFILE_REQUIRED: 'profile-required' });

async function fetchBridgeStatus(appName) {
  const stored = createSettings(appName).resolveBridgeProfile();
  const { getDaemonHealth } = await loadBrowserBridge(appName);
  return { stored, health: await getDaemonHealth({ preferredContextId: stored }) };
}

function normalizeBridgeStatus(value) {
  const object = value && typeof value === 'object' ? value : {};
  const profiles = Array.isArray(object.health?.status?.profiles) ? object.health.status.profiles : [];
  return {
    stored: typeof object.stored === 'string' ? object.stored : '',
    state: typeof object.health?.state === 'string' ? object.health.state : BRIDGE_STATE.STOPPED,
    connected: profiles.filter((profile) => profile?.extensionConnected).map((profile) => String(profile.contextId))
  };
}

export function createDoctorChecks({
  appName,
  isCompiled = IS_COMPILED,
  runProcess = (command, args, options) => spawnSync(command, args, options),
  pathExists = (path) => existsSync(path),
  getPaths = resolveOpenCliPaths,
  bridgeStatus = () => fetchBridgeStatus(appName)
}) {
  function checkBun() {
    const result = runProcess('bun', ['--version'], { stdio: 'pipe', encoding: 'utf8' });
    if (result.error || result.status !== 0) return { ok: false, version: '' };
    return { ok: true, version: typeof result.stdout === 'string' ? result.stdout.trim() : '' };
  }

  function sourceChecks() {
    const bun = checkBun();
    const envNames = openCliEnvNames(appName);
    const { root, mainPath, extensionPath, browserIndexPath } = getPaths(appName);
    const rootExists = pathExists(root);
    const built = pathExists(mainPath) && pathExists(browserIndexPath);
    return [
      {
        ok: bun.ok,
        message: `Bun available${bun.version ? ` (${bun.version})` : ''}`,
        steps: bun.ok ? [] : ['- Install Bun and ensure `bun` is on PATH: https://bun.sh']
      },
      {
        ok: rootExists,
        message: `opencli root resolved: ${root}`,
        steps: rootExists ? [] : [`- Set ${envNames.root} to your local opencli checkout path.`]
      },
      {
        ok: pathExists(mainPath),
        message: `opencli built entry: ${mainPath}`,
        steps: rootExists && !built ? [`- Build opencli once: cd "${root}" && bun install`] : []
      },
      { ok: pathExists(browserIndexPath), message: `opencli browser bridge module: ${browserIndexPath}`, steps: [] },
      {
        ok: pathExists(extensionPath),
        message: `Browser Bridge extension dir: ${extensionPath}`,
        steps: pathExists(extensionPath) ? [] : [`- Ensure Browser Bridge extension exists at "${extensionPath}".`]
      }
    ];
  }

  async function bridgeCheck() {
    let status;
    try {
      status = await bridgeStatus();
    } catch (error) {
      return bridgeHealthFailure(error instanceof Error ? error.message : String(error));
    }
    if (!status || typeof status !== 'object' || !status.health || typeof status.health.state !== 'string') {
      return bridgeHealthFailure('no health response');
    }

    const { stored, state, connected } = normalizeBridgeStatus(status);
    if (state === BRIDGE_STATE.STOPPED) {
      return { ok: true, message: 'Browser Bridge daemon not running yet (it starts with the first ask or read)', steps: [] };
    }
    if (!connected.length) {
      return {
        ok: false,
        message: 'Browser Bridge: no browser profile connected',
        steps: [`- Start the browser (\`${appName} launch\`) and make sure the OpenCLI extension is enabled.`]
      };
    }
    if (state === BRIDGE_STATE.PROFILE_REQUIRED) {
      return {
        ok: false,
        message: `Browser Bridge: several profiles connected (${connected.join(', ')}), none selected`,
        steps: [`- Pick the browser profile to use: \`${appName} switch-session\`.`]
      };
    }
    if (stored && !connected.includes(stored)) {
      return {
        ok: true,
        message: `Browser Bridge connected: ${connected[0]} (stored default ${stored} is not connected)`,
        steps: [`- Pick the browser profile to use: \`${appName} switch-session\`.`]
      };
    }
    return { ok: true, message: `Browser Bridge connected: ${stored || connected[0]}`, steps: [] };
  }

  function bridgeHealthFailure(reason) {
    return {
      ok: false,
      message: `Browser Bridge health check failed: ${reason || 'unknown error'}`,
      steps: ['- Check the Browser Bridge daemon and rerun `' + appName + ' doctor`.']
    };
  }

  return Object.freeze({ checkBun, sourceChecks, bridgeCheck, isCompiled });
}
