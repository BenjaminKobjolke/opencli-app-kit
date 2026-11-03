export function jsonResult(payload) {
  return JSON.stringify({ ok: true, ...payload }, null, 2);
}
