import { describe, expect, test } from 'bun:test';
import { checkToolsBatFiles } from '../src/testing/tools_bat_check.js';

describe('batch file checks', () => {
  test('checks this repository tools batch files', () => {
    const reports = checkToolsBatFiles(new URL('../tools/', import.meta.url));

    expect(reports.length).toBeGreaterThan(0);
    expect(reports.filter((report) => report.issues.length > 0)).toEqual([]);
  });
});
