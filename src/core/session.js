import { connectBridge, loadBrowserBridge } from './opencli.js';

let loadBridge = loadBrowserBridge;
let connect = connectBridge;
let createBridge = (BrowserBridge) => new BrowserBridge();

export function __setSessionDepsForTest(deps) {
  if (deps.loadBrowserBridge) loadBridge = deps.loadBrowserBridge;
  if (deps.connectBridge) connect = deps.connectBridge;
  if (deps.createBridge) createBridge = deps.createBridge;
}

export function __resetSessionDepsForTest() {
  loadBridge = loadBrowserBridge;
  connect = connectBridge;
  createBridge = (BrowserBridge) => new BrowserBridge();
}

export async function withSitePage({ appName, session, timeout, preferredContextId }, callback) {
  const { BrowserBridge } = await loadBridge(appName);
  const bridge = createBridge(BrowserBridge);

  try {
    const page = await connect(bridge, { appName, session, timeout, preferredContextId });
    return await callback(page);
  } finally {
    try {
      await bridge.close();
    } catch {
      // Session cleanup must not replace the browser operation's result or error.
    }
  }
}
