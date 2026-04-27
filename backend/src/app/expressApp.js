import express from 'express';
import helmet from 'helmet';
import { createCorsMiddleware } from '../config/cors.js';
import { createGeneralRateLimiter } from '../middlewares/rateLimiter.js';
import { sanitizeRequestInputs } from '../middlewares/sanitizeRequest.js';
import { captureServerResponse } from '../observability/sentry.js';
import { createHttpLogger } from '../observability/httpLogger.js';

export function createExpressApp({ supabase, isHosted = false, isProduction = false }) {
  const app = express();

  app.disable('x-powered-by');
  if (isHosted || isProduction) {
    app.set('trust proxy', 1);
  }

  app.use(helmet());
  app.use(createCorsMiddleware({ isProduction }));
  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ extended: false, limit: '100kb' }));
  app.use(sanitizeRequestInputs);
  app.use(createHttpLogger());
  app.use(createGeneralRateLimiter());
  app.use((req, res, next) => {
    res.on('finish', () => captureServerResponse(req, res));
    next();
  });
  app.use((req, res, next) => {
    req.supabase = supabase;
    next();
  });

  return app;
}
