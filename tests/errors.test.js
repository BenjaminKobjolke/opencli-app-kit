import { describe, expect, test } from 'bun:test';
import {
  AppError,
  ERROR_CODE,
  EXIT_CODE,
  exitCodeForError,
  toAppError
} from '../src/core/errors.js';

describe('application errors', () => {
  test('keeps AppError instances and maps known error codes', () => {
    const inputError = new AppError(ERROR_CODE.INPUT_INVALID, 'bad input');

    expect(toAppError(inputError)).toBe(inputError);
    expect(exitCodeForError(inputError)).toBe(EXIT_CODE.INPUT_INVALID);
    expect(exitCodeForError(new AppError(ERROR_CODE.CONFIG_INVALID, 'bad config')))
      .toBe(EXIT_CODE.CONFIG);
    expect(exitCodeForError(new AppError(ERROR_CODE.UPDATE_REQUIRED, 'update')))
      .toBe(EXIT_CODE.UPDATE_REQUIRED);
  });

  test('normalizes unknown values into AppError', () => {
    const error = toAppError('unexpected');

    expect(error).toBeInstanceOf(AppError);
    expect(error.code).toBe(ERROR_CODE.UNKNOWN);
    expect(error.message).toBe('unexpected');
    expect(exitCodeForError(error)).toBe(EXIT_CODE.GENERIC);
  });
});
