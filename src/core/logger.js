const LEVELS = Object.freeze({ off: 0, error: 1, warn: 2, info: 3, debug: 4 });

function configuredLevel(appName, loadSettings) {
  const envPrefix = appName.toUpperCase().replace(/[^A-Z0-9]+/g, '_');
  const envName = `${envPrefix}_LOG_LEVEL`;
  const rawLevel = process.env[envName] || loadSettings().logLevel || 'warn';
  return LEVELS[rawLevel] ?? LEVELS.warn;
}

function createEmitter(level, appName, loadSettings, stderr) {
  return (message, context) => {
    if (LEVELS[level] > configuredLevel(appName, loadSettings)) return;
    const suffix = context ? ` ${JSON.stringify(context)}` : '';
    stderr.write(`[${level}] ${message}${suffix}\n`);
  };
}

export function createLogger(appName, { loadSettings = () => ({}), stderr = process.stderr } = {}) {
  return Object.freeze({
    error: createEmitter('error', appName, loadSettings, stderr),
    warn: createEmitter('warn', appName, loadSettings, stderr),
    info: createEmitter('info', appName, loadSettings, stderr),
    debug: createEmitter('debug', appName, loadSettings, stderr)
  });
}

export const logger = createLogger('opencli-app-kit');
