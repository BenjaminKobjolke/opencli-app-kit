import { describe, expect, test } from 'bun:test';
import { decodeDataUrl, imageDataUrlScript, safeJsonParse } from '../src/core/page_fetch.js';

describe('page fetch helpers', () => {
  test('builds a cookie-enabled data URL fetch script', () => {
    const script = imageDataUrlScript('https://example.invalid/file', 'token');

    expect(script).toContain("credentials: 'include'");
    expect(script).toContain('readAsDataURL');
    expect(script).toContain('authorization: "token"');
  });

  test('decodes data URLs and rejects invalid or empty payloads', () => {
    expect(decodeDataUrl('data:text/plain;base64,aGVsbG8=')).toEqual({
      mime: 'text/plain',
      buffer: Buffer.from('hello')
    });
    expect(decodeDataUrl('data:text/plain;base64,')).toBeNull();
    expect(decodeDataUrl('not a data URL')).toBeNull();
  });

  test('parses valid JSON and returns null for invalid JSON', () => {
    expect(safeJsonParse('{"ok":true}')).toEqual({ ok: true });
    expect(safeJsonParse('{')).toBeNull();
  });
});
