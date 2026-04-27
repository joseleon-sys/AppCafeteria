export class AppError extends Error {
  constructor(message, statusCode = 500, options = {}) {
    super(message, { cause: options.cause });

    this.name = options.name || 'AppError';
    this.statusCode = Number.isInteger(statusCode) ? statusCode : 500;
    this.code = options.code;
    this.details = options.details;
    this.extra = options.extra;
    this.exposeDetails = Boolean(options.exposeDetails);
    this.publicMessage = options.publicMessage;
    this.isOperational = options.isOperational ?? this.statusCode < 500;
  }

  get clientMessage() {
    if (this.statusCode < 500) return this.message;
    return this.publicMessage || 'Error interno del servidor';
  }

  static from(error, options = {}) {
    if (error instanceof AppError) {
      if (options.publicMessage && !error.publicMessage) {
        error.publicMessage = options.publicMessage;
      }

      return error;
    }

    const statusCode = Number.isInteger(error?.statusCode) ? error.statusCode : 500;
    const message = statusCode < 500 && error?.message
      ? error.message
      : options.publicMessage || 'Error interno del servidor';

    return new AppError(message, statusCode, {
      cause: error,
      code: error?.code,
      details: error?.details,
      extra: error?.extra,
      exposeDetails: error?.exposeDetails,
      isOperational: statusCode < 500,
      name: error?.name,
      publicMessage: options.publicMessage,
    });
  }
}
