export const ERROR_CODE = Object.freeze({
  INPUT_INVALID: 'INPUT_INVALID',
  AUTH_MISSING: 'AUTH_MISSING',
  AUTH_INVALID: 'AUTH_INVALID',
  NETWORK_ERROR: 'NETWORK_ERROR',
  API_ERROR: 'API_ERROR',
  CONFIG_INVALID: 'CONFIG_INVALID',
  UPDATE_REQUIRED: 'UPDATE_REQUIRED',
  UNKNOWN: 'UNKNOWN'
});

export const EXIT_CODE = Object.freeze({
  SUCCESS: 0,
  GENERIC: 1,
  INPUT_INVALID: 2,
  AUTH: 3,
  NETWORK: 4,
  API: 5,
  CONFIG: 6,
  UPDATE_REQUIRED: 7
});

export class AppError extends Error {
  constructor(code, message, extra = {}) {
    super(message);
    this.name = 'AppError';
    this.code = code;
    this.hint = extra.hint;
    this.details = extra.details;
    this.cause = extra.cause;
  }
}

export function toAppError(error) {
  if (error instanceof AppError) return error;

  if (error instanceof Error && error.name === 'AbortError') {
    return new AppError(ERROR_CODE.NETWORK_ERROR, 'Request timed out', {
      hint: 'Increase --timeout or retry.'
    });
  }

  if (error instanceof TypeError) {
    return new AppError(ERROR_CODE.NETWORK_ERROR, error.message || 'Network error', {
      hint: 'Check local browser bridge connectivity and your network.'
    });
  }

  const message = error instanceof Error ? error.message : String(error);
  return new AppError(ERROR_CODE.UNKNOWN, message || 'Unknown error');
}

export function exitCodeForError(error) {
  switch (error.code) {
    case ERROR_CODE.INPUT_INVALID:
      return EXIT_CODE.INPUT_INVALID;
    case ERROR_CODE.AUTH_MISSING:
    case ERROR_CODE.AUTH_INVALID:
      return EXIT_CODE.AUTH;
    case ERROR_CODE.NETWORK_ERROR:
      return EXIT_CODE.NETWORK;
    case ERROR_CODE.API_ERROR:
      return EXIT_CODE.API;
    case ERROR_CODE.CONFIG_INVALID:
      return EXIT_CODE.CONFIG;
    case ERROR_CODE.UPDATE_REQUIRED:
      return EXIT_CODE.UPDATE_REQUIRED;
    default:
      return EXIT_CODE.GENERIC;
  }
}
