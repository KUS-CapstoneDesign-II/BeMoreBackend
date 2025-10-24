class AppError extends Error {
  constructor(message, status = 400, code = 'BAD_REQUEST', metadata = {}) {
    super(message);
    this.name = 'AppError';
    this.status = status;
    this.code = code;
    this.metadata = metadata;
    Error.captureStackTrace?.(this, AppError);
  }
}

module.exports = { AppError };


