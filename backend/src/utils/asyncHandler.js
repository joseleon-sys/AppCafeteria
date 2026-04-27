import { AppError } from '../shared/errors/AppError.js';

export function asyncHandler(handler, options = {}) {
  return async (req, res, next) => {
    try {
      await handler(req, res, next);
    } catch (error) {
      try {
        await options.onError?.(error, req, res);
      } catch {
        // Los hooks de auditoria no deben ocultar el error original.
      }

      next(AppError.from(error, { publicMessage: options.publicMessage }));
    }
  };
}
