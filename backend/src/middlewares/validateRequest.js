import { ZodError } from 'zod';
import { AppError } from '../shared/errors/AppError.js';

function formatValidationIssues(error) {
  return error.issues.map((issue) => ({
    path: issue.path.join('.'),
    message: issue.message,
  }));
}

function parseSection(schema, value) {
  if (!schema) return { success: true, data: value };
  return schema.safeParse(value);
}

export function validateRequest(schema = {}) {
  return (req, res, next) => {
    const sections = ['body', 'params', 'query'];

    for (const section of sections) {
      const result = parseSection(schema[section], req[section]);

      if (!result.success) {
        const error = result.error instanceof ZodError ? result.error : null;
        return next(new AppError('Solicitud invalida', 400, {
          details: error ? formatValidationIssues(error) : [],
          exposeDetails: true,
        }));
      }

      req[section] = result.data;
    }

    return next();
  };
}
