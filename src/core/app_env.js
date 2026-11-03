// Builds the environment variable prefix shared by every app-specific override (e.g. sample-app -> SAMPLE_APP).

export function appEnvPrefix(appName) {
  return appName.toUpperCase().replace(/[^A-Z0-9]+/g, '_');
}
