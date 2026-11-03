// Shared lightweight fakes and stream capture helpers for unit tests.

export function fakeReadPage(evaluateResult, pageExtras = {}) {
  return {
    bridge: { close: async () => {} },
    page: { evaluate: async () => evaluateResult, ...pageExtras }
  };
}

function capture(stream) {
  const chunks = [];
  stream.write = (data) => {
    chunks.push(String(data));
    return true;
  };
  return chunks;
}

export function captureStdout() {
  return capture(process.stdout);
}

export function captureStderr() {
  return capture(process.stderr);
}

export function bindOriginalStdio() {
  return {
    stdout: process.stdout.write.bind(process.stdout),
    stderr: process.stderr.write.bind(process.stderr)
  };
}

export function restoreStdio(originals) {
  process.stdout.write = originals.stdout;
  process.stderr.write = originals.stderr;
}
