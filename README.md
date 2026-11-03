# opencli-app-kit

`opencli-app-kit` is a shared JavaScript library for command-line apps that use OpenCLI and the Browser Bridge. It provides reusable setup, settings, error handling, logging, Chrome and doctor commands, page utilities, and test helpers. The consuming apps choose their own `appName`, command names, and user-facing text.

## Requirements

- Bun 1.0 or newer
- An OpenCLI checkout for browser and daemon imports
- Windows when using the junction commands and batch-file test scripts

The package has no runtime dependencies. ESLint is a development dependency.

## Setup

The OpenCLI checkout is referenced from this library through a junction. From the library root, create it once (adjust the target to your OpenCLI checkout):

```bat
mkdir .omx\reference
mklink /J .omx\reference\opencli D:\GIT\GitHub\OpenCLI
```

Each consuming app also links this library at the path used by the app's imports and compiled executable. From that app's root:

```bat
mkdir .omx\reference
mklink /J .omx\reference\opencli-app-kit D:\GIT\BenjaminKobjolke\opencli-app-kit
```

In the app's `code_analysis_rules.json`, exclude `.omx` with `global_exclude_paths` and add `.omx/**` to `pmd_duplicates.exclude_patterns.javascript`; otherwise analysis follows the junction into this library and its upstream OpenCLI reference.

The OpenCLI junction belongs inside this library; the `opencli-app-kit` junction belongs inside each app. Bun resolves the app-kit junction to this checkout, so the literal OpenCLI and daemon imports in the library bundle from `.omx\reference\opencli` here.

Set up the package and run its checks with:

```bat
bun install
bun test
tools\run_integration_tests.bat
```

The integration command compiles `sample/main.js` to confirm the OpenCLI and daemon imports can be included in an executable.

## API

All paths below are relative to `src/`.

| Module | Main exports |
| --- | --- |
| `core/opencli.js` | `resolveOpenCliPaths`, `openCliEnvNames`, `runOpenCli`, `captureOpenCli`, `loadBrowserBridge`, `connectBridge`, `IS_COMPILED` |
| `core/main_entry.js` | `runMain` |
| `core/session.js` | `withSitePage` |
| `core/settings.js` | `createSettings` |
| `core/errors.js` | `ERROR_CODE`, `EXIT_CODE`, `AppError`, `toAppError`, `exitCodeForError` |
| `core/logger.js` | `createLogger`, `logger` |
| `core/poll.js` | `pollUntil` |
| `core/output.js` | `jsonResult` |
| `core/cli_shell.js` | `requireValue`, `writeStdout`, `writeStderr`, `createCliShell` |
| `core/min_version.js` | `compareSemver`, optional `checkMinVersion` |
| `core/page_fetch.js` | `imageDataUrlScript`, `decodeDataUrl`, `safeJsonParse` |
| `commands/chrome.js` | `runSetChrome`, `runLaunch`, `runSwitchSession` |
| `commands/doctor.js` | `runDoctor` |
| `commands/doctor_checks.js` | `createDoctorChecks` |
| `testing/test_helpers.js` | `fakeReadPage`, stdout/stderr capture and restore helpers |
| `testing/tools_bat_check.js` | `checkToolsBatFiles` |

`<APP>_OPENCLI_ROOT` and `<APP>_OPENCLI_MAIN` can override the OpenCLI checkout and main script; `<APP>` is the upper-case app name with non-alphanumeric characters replaced by underscores. `checkMinVersion` is opt-in and reads `<APP>_MIN_VERSION_FILE`, then the app's version file under the active Claude plugin or cache when available.

## Usage

A consuming CLI can wrap its command runner with the shared main entry and session helper:

```js
import { runMain } from './.omx/reference/opencli-app-kit/src/core/main_entry.js';
import { withSitePage } from './.omx/reference/opencli-app-kit/src/core/session.js';

const appName = 'sample-app';

async function runCli() {
  return withSitePage({ appName, session: 'site:example' }, async (page) => (
    page.evaluate('document.title')
  ));
}

await runMain(runCli);
```

`createSettings(appName)` reads `~/.<appName>/settings.json`. Set `<APP>_SETTINGS` (the app name upper-cased, non-alphanumerics as `_`, e.g. `POSTBANKCLI_SETTINGS`) to an absolute file path to use another settings file; the Chrome profile default stays in `~/.<appName>/chrome-profile`.

Use `createSettings(appName)` and the command modules where they fit the consuming app. The library supplies shared behavior; apps remain responsible for their own routing, command text, and application-specific defaults.
