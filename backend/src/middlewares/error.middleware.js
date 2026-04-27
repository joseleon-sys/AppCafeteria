import { AppError } from '../shared/errors/AppError.js';

export function notFoundHandler(req, _res, next) {
  next(new AppError('Endpoint no encontrado', 404));
}

function logRequestError(req, error) {
  const statusCode = error.statusCode || 500;
  const logPayload = {
    err: error.cause || error,
    statusCode,
    method: req.method,
    path: req.originalUrl || req.url,
    idSolicitud: req.id,
  };

  if (statusCode >= 500) {
    req.log?.error(logPayload, 'Request error');
    if (!req.log) console.error('Request error', logPayload);
    return;
  }

  req.log?.warn(logPayload, 'Handled request error');
}

export function errorMiddleware(err, req, res, next) {
  if (res.headersSent) {
    return next(err);
  }

  const error = AppError.from(err);
  logRequestError(req, error);

  const payload = {
    error: error.clientMessage,
    idSolicitud: req.id,
  };

  if (error.statusCode < 500 && error.extra && typeof error.extra === 'object') {
    Object.assign(payload, error.extra);
  }

  if (error.exposeDetails && error.details) {
    payload.details = error.details;
  }

  return res.status(error.statusCode).json(payload);
}
