/**
 * Standardized Operational API Error
 */
export class ApiError extends Error {
  /**
   * @param {number} statusCode - HTTP status code
   * @param {string} code - Machine-readable error code (e.g. 'INVALID_INPUT')
   * @param {string} message - Human-readable explanation
   * @param {any} [details] - Optional contextual details (safe for client)
   */
  constructor(statusCode, code, message, details = null) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    this.name = 'ApiError';
    Error.captureStackTrace(this, this.constructor);
  }

  static badRequest(message, code = 'BAD_REQUEST', details = null) {
    return new ApiError(400, code, message, details);
  }

  static unsupportedMediaType(message, code = 'UNSUPPORTED_INPUT_TYPE', details = null) {
    return new ApiError(415, code, message, details);
  }

  static timeout(message = 'Request processing timed out', code = 'REQUEST_TIMEOUT') {
    return new ApiError(504, code, message);
  }

  static upstreamError(message, code = 'UPSTREAM_ERROR', details = null) {
    return new ApiError(502, code, message, details);
  }

  static serviceUnavailable(message, code = 'SERVICE_UNAVAILABLE', details = null) {
    return new ApiError(503, code, message, details);
  }
}
